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
export type RespuestaPdf = { id?: string; codigo?: string; error?: string };

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
    .upsert(resultado.productos.map((p) => ({ comprador_id: usuario.id, producto_id: p.productoId, cajas: p.cajas, encargo: false })));
  if (errorCarrito) return { error: "No pudimos pasarlo al carrito. Intenta de nuevo." };

  revalidatePath("/", "layout");
  redirect(`/carrito?cotizador=${resultado.productos.length}`);
}

// Guarda la cotización del evento (COT-0001) y devuelve su id para descargar el PDF.
// Se guarda la entrada completa para poder volver a abrirla en el cotizador.
export async function guardarCotizacion(entrada: EntradaCotizador, segundos?: number): Promise<RespuestaPdf> {
  if (!(await comprador())) return { error: "Solo los compradores pueden guardar cotizaciones." };
  const [{ resultado, entrada: limpia, error }, { tipos }] = await Promise.all([cotizarEvento(entrada), datosCotizador({ conProductos: false })]);
  if (!resultado || !limpia) return { error };
  if (resultado.productos.length === 0) return { error: "No hay productos para cotizar." };

  const evento = {
    version: 2,
    // Tiempo para armar la cotización (métrica del experimento): lo mide el navegador; se acepta de 0 a 24 horas
    segundos: Number.isInteger(segundos) && segundos! >= 0 && segundos! <= 86400 ? segundos : null,
    entrada: limpia,
    resumen: {
      nombre: limpia.nombre,
      tipo: tipos.find((t) => t.id === limpia.tipoEventoId)?.nombre ?? "",
      fecha: limpia.fecha,
      invitados: limpia.invitados,
      no_toman: limpia.noToman,
      menores: limpia.menores ?? 0,
      hora_inicio: limpia.horaInicio,
      horas: limpia.horas,
      perfil: limpia.perfil,
      margen: limpia.margen,
      aire_libre: limpia.aireLibre,
      tragos_totales: resultado.tragosTotales,
      tragos: resultado.tragos.map((t) => ({ receta: t.receta, tragos: t.tragos, lleva: t.lleva, propio: t.propio })),
      momentos: resultado.momentos,
      insumos: resultado.insumos,
      cliente_pone: resultado.clientePone.map((l) => ({ nombre: l.nombre, botellas: l.botellas, ml: l.ml })),
      reventa: resultado.reventa,
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
  return { id: data[0].cotizacion_id, codigo: data[0].codigo };
}

// Retroalimentación del comprador al terminar su cotización (10-nov-2026). RLS: solo a su nombre y sobre su cotización.
export async function enviarRetroalimentacion(datos: {
  cotizacionId: string;
  puntaje: number | null;
  mejorar: string;
  fallos: string;
}): Promise<{ error?: string; mensaje?: string }> {
  if (!(await comprador())) return { error: "Solo los compradores pueden dejar su opinión aquí." };
  const puntaje = Number.isInteger(datos.puntaje) && datos.puntaje! >= 1 && datos.puntaje! <= 5 ? datos.puntaje : null;
  const mejorar = String(datos.mejorar ?? "").trim().slice(0, 1000) || null;
  const fallos = String(datos.fallos ?? "").trim().slice(0, 1000) || null;
  if (!puntaje && !mejorar && !fallos) return { error: "Elige una nota o escribe un comentario." };
  const supabase = await createClient();
  const { error } = await supabase.from("retroalimentacion").insert({
    contexto: "cotizacion",
    cotizacion_id: /^[0-9a-f-]{36}$/.test(datos.cotizacionId) ? datos.cotizacionId : null,
    puntaje,
    mejorar,
    fallos,
  });
  if (error) return { error: "No pudimos guardar tu comentario. Intenta de nuevo." };
  return { mensaje: "¡Gracias! Tu opinión ya cuenta para postular a tus primeros 2 pedidos con envío gratis." };
}
