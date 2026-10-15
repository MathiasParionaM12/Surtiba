"use server";

// Acciones del cotizador: la pantalla manda los datos del evento (nunca precios).
// El servidor recalcula todo antes de usarlo; los precios los pone la base de datos.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { EntradaCotizador, ResultadoCotizacion } from "@/lib/cotizador";
import { cotizarEvento, datosCotizador } from "@/lib/cotizador-datos";
import { obtenerUsuario } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/tipos";

type Respuesta = { resultado?: ResultadoCotizacion; error?: string };
export type RespuestaPdf = { id?: string; error?: string };

export async function cotizar(entrada: EntradaCotizador): Promise<Respuesta> {
  const { resultado, error } = await cotizarEvento(entrada);
  return { resultado, error };
}

async function comprador() {
  const usuario = await obtenerUsuario();
  if (!usuario) redirect("/ingresar");
  return usuario.rol === "comprador" ? usuario : null;
}

// Pasa al carrito las cajas calculadas (reemplaza las que ya había de esos productos)
export async function pasarAlCarrito(entrada: EntradaCotizador): Promise<Respuesta> {
  const usuario = await comprador();
  if (!usuario) return { error: "Solo los compradores tienen carrito." };
  const { resultado, error } = await cotizarEvento(entrada);
  if (!resultado) return { error };
  if (resultado.productos.length === 0) return { error: "No hay productos para pasar al carrito." };

  const supabase = await createClient();
  const { error: errorCarrito } = await supabase
    .from("carrito")
    .upsert(resultado.productos.map((p) => ({ comprador_id: usuario.id, producto_id: p.productoId, cajas: p.cajas })));
  if (errorCarrito) return { error: "No pudimos pasarlo al carrito. Intenta de nuevo." };

  revalidatePath("/", "layout");
  redirect(`/carrito?cotizador=${resultado.productos.length}`);
}

// Guarda la cotización del evento (COT-0001) y devuelve su id para descargar el PDF.
// Se guarda la entrada completa para poder volver a abrirla en el cotizador.
export async function guardarCotizacion(entrada: EntradaCotizador): Promise<RespuestaPdf> {
  if (!(await comprador())) return { error: "Solo los compradores pueden guardar cotizaciones." };
  const [{ resultado, entrada: limpia, error }, { tipos }] = await Promise.all([cotizarEvento(entrada), datosCotizador({ conProductos: false })]);
  if (!resultado || !limpia) return { error };
  if (resultado.productos.length === 0) return { error: "No hay productos para cotizar." };

  const evento = {
    version: 2,
    entrada: limpia,
    resumen: {
      nombre: limpia.nombre,
      tipo: tipos.find((t) => t.id === limpia.tipoEventoId)?.nombre ?? "",
      fecha: limpia.fecha,
      invitados: limpia.invitados,
      no_toman: limpia.noToman,
      hora_inicio: limpia.horaInicio,
      horas: limpia.horas,
      perfil: limpia.perfil,
      margen: limpia.margen,
      aire_libre: limpia.aireLibre,
      tragos_totales: resultado.tragosTotales,
      momentos: resultado.momentos,
      insumos: resultado.insumos,
    },
  };
  return guardar(
    resultado.productos.map((p) => ({ producto_id: p.productoId, cajas: p.cajas })),
    evento as unknown as Json,
  );
}

// Guarda la cotización de lo que hay en el carrito
export async function cotizacionDelCarrito(): Promise<RespuestaPdf> {
  if (!(await comprador())) return { error: "Solo los compradores pueden descargar la cotización." };
  return guardar();
}

async function guardar(items?: Json, evento?: Json): Promise<RespuestaPdf> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("crear_cotizacion", { p_items: items, p_evento: evento });
  if (error || !data?.[0]) {
    return { error: error?.code === "P0001" ? error.message : "No pudimos guardar la cotización. Intenta de nuevo." };
  }
  revalidatePath("/cotizaciones");
  return { id: data[0].cotizacion_id };
}
