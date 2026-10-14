"use server";

// Acciones del cotizador: la pantalla manda el evento y los tragos (nunca precios).
// El servidor recalcula todo antes de usarlo; los precios los pone la base de datos.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { EntradaCotizador, ResultadoCotizacion } from "@/lib/cotizador";
import { cotizarEvento, datosCotizador } from "@/lib/cotizador-datos";
import type { Json } from "@/lib/supabase/tipos";
import { obtenerUsuario } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";

type Respuesta = { resultado?: ResultadoCotizacion; error?: string };
export type RespuestaPdf = { id?: string; error?: string };

export async function cotizar(entrada: EntradaCotizador): Promise<Respuesta> {
  return cotizarEvento(entrada);
}

async function soloComprador() {
  const usuario = await obtenerUsuario();
  if (!usuario) redirect("/ingresar");
  return usuario.rol === "comprador";
}

// Pasa al carrito las cajas calculadas (reemplaza las que ya había de esos productos)
export async function pasarAlCarrito(entrada: EntradaCotizador): Promise<Respuesta> {
  if (!(await soloComprador())) return { error: "Solo los compradores tienen carrito." };
  const { resultado, error } = await cotizarEvento(entrada);
  if (!resultado) return { error };
  if (resultado.productos.length === 0) return { error: "No hay productos para pasar al carrito." };

  const usuario = (await obtenerUsuario())!;
  const supabase = await createClient();
  const { error: errorCarrito } = await supabase
    .from("carrito")
    .upsert(resultado.productos.map((p) => ({ comprador_id: usuario.id, producto_id: p.productoId, cajas: p.cajas })));
  if (errorCarrito) return { error: "No pudimos pasarlo al carrito. Intenta de nuevo." };

  revalidatePath("/", "layout");
  redirect(`/carrito?cotizador=${resultado.productos.length}`);
}

// Guarda la cotización del evento (COT-0001) y devuelve su id para descargar el PDF
export async function cotizacionDelEvento(entrada: EntradaCotizador): Promise<RespuestaPdf> {
  if (!(await soloComprador())) return { error: "Solo los compradores pueden descargar la cotización." };
  const [{ resultado, error }, { tipos, recetas }] = await Promise.all([cotizarEvento(entrada), datosCotizador()]);
  if (!resultado) return { error };
  if (resultado.productos.length === 0) return { error: "Agrega tragos para cotizar." };

  const evento = {
    tipo: tipos.find((t) => t.id === entrada.tipoEventoId)?.nombre ?? "",
    invitados: Math.trunc(Number(entrada.invitados)),
    horas: Math.trunc(Number(entrada.horas)),
    tragos_por_persona: resultado.tragosPorPersona,
    tragos_totales: resultado.tragosTotales,
    tragos: resultado.tragos.map((t) => ({
      receta: recetas.find((r) => r.id === t.recetaId)?.nombre ?? t.receta,
      porcentaje: t.porcentaje,
      tragos: t.tragos,
    })),
  };
  return guardar(
    resultado.productos.map((p) => ({ producto_id: p.productoId, cajas: p.cajas })),
    evento,
  );
}

// Guarda la cotización de lo que hay en el carrito
export async function cotizacionDelCarrito(): Promise<RespuestaPdf> {
  if (!(await soloComprador())) return { error: "Solo los compradores pueden descargar la cotización." };
  return guardar();
}

async function guardar(items?: Json, evento?: Json): Promise<RespuestaPdf> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("crear_cotizacion", { p_items: items, p_evento: evento });
  if (error || !data?.[0]) {
    return { error: error?.code === "P0001" ? error.message : "No pudimos preparar la cotización. Intenta de nuevo." };
  }
  return { id: data[0].cotizacion_id };
}
