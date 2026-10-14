// Datos del cotizador leídos en el servidor. RLS decide qué llega:
// visitante (y marca) = catálogo público con el precio del primer tramo y sin stock;
// comprador y admin = productos activos con su escala completa y stock.

import { esUuid, ordenarTramos } from "@/lib/catalogo";
import { calcular, LIMITES, type EntradaCotizador, type ProductoCotizable, type Receta, type TipoEvento } from "@/lib/cotizador";
import { obtenerUsuario } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";

export async function datosCotizador() {
  const usuario = await obtenerUsuario();
  const conSesion = usuario?.rol === "comprador" || usuario?.rol === "admin";
  const supabase = await createClient();

  const [{ data: tiposData }, { data: recetasData }, catalogo] = await Promise.all([
    supabase
      .from("tipos_evento")
      .select("id, nombre, tragos_primera_hora, tragos_hora_siguiente, tipo_evento_recetas(receta_id, porcentaje)")
      .eq("activo", true)
      .order("orden"),
    supabase.from("recetas").select("id, nombre, categoria, ml_por_trago").eq("activo", true).order("orden"),
    conSesion ? catalogoConSesion() : catalogoPublico(),
  ]);

  const recetas: Receta[] = recetasData ?? [];
  const idsRecetas = new Set(recetas.map((r) => r.id));
  const tipos: TipoEvento[] = (tiposData ?? []).map((t) => ({
    id: t.id,
    nombre: t.nombre,
    tragos_primera_hora: Number(t.tragos_primera_hora),
    tragos_hora_siguiente: Number(t.tragos_hora_siguiente),
    mezcla: t.tipo_evento_recetas
      .filter((m) => idsRecetas.has(m.receta_id))
      .sort((a, b) => b.porcentaje - a.porcentaje),
  }));

  return { usuario, conSesion, tipos, recetas, catalogo };
}

async function catalogoConSesion(): Promise<ProductoCotizable[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("productos")
    .select(
      "id, nombre, categoria, ml, unidades_por_caja, stock_cajas, marca_id, marcas(nombre_comercial, activa, pedido_minimo_cajas), escalas_precio(desde_cajas, hasta_cajas, precio_caja_centimos)",
    )
    .eq("activo", true);
  return (data ?? [])
    .filter((p) => p.marcas?.activa && p.escalas_precio.some((e) => e.desde_cajas === 1))
    .map((p) => ({
      id: p.id,
      nombre: p.nombre,
      marca: p.marcas!.nombre_comercial,
      marcaId: p.marca_id,
      categoria: p.categoria,
      ml: p.ml,
      unidades: p.unidades_por_caja,
      tramos: ordenarTramos(p.escalas_precio),
      stock: p.stock_cajas,
      pedidoMinimo: p.marcas!.pedido_minimo_cajas,
    }));
}

async function catalogoPublico(): Promise<ProductoCotizable[]> {
  const supabase = await createClient();
  const [{ data }, { data: marcas }] = await Promise.all([
    supabase.from("catalogo_publico").select("*"),
    supabase.from("marcas").select("id, pedido_minimo_cajas"),
  ]);
  const minimo = new Map((marcas ?? []).map((m) => [m.id, m.pedido_minimo_cajas]));
  return (data ?? []).map((p) => ({
    id: p.id!,
    nombre: p.nombre!,
    marca: p.marca!,
    marcaId: p.marca_id!,
    categoria: p.categoria!,
    ml: p.ml!,
    unidades: p.unidades_por_caja!,
    tramos: [{ desde_cajas: 1, hasta_cajas: null, precio_caja_centimos: p.precio_caja_centimos! }],
    stock: null,
    pedidoMinimo: minimo.get(p.marca_id!) ?? 1,
  }));
}

// Lo que llega del navegador no es confiable: se limpia antes de calcular
export function limpiarEntrada(e: EntradaCotizador, tipos: TipoEvento[], recetas: Receta[]): EntradaCotizador | string {
  const tipo = tipos.find((t) => t.id === e?.tipoEventoId);
  if (!tipo) return "Elige el tipo de evento.";
  const invitados = Math.trunc(Number(e.invitados));
  if (!(invitados >= 1 && invitados <= LIMITES.invitadosMax)) return `Los invitados van de 1 a ${LIMITES.invitadosMax}.`;
  const horas = Math.trunc(Number(e.horas));
  if (!(horas >= 1 && horas <= LIMITES.horasMax)) return `Las horas van de 1 a ${LIMITES.horasMax}.`;

  const idsRecetas = new Set(recetas.map((r) => r.id));
  const vistos = new Set<string>();
  const tragos = (Array.isArray(e.tragos) ? e.tragos : [])
    .filter((t) => idsRecetas.has(t?.recetaId) && !vistos.has(t.recetaId) && vistos.add(t.recetaId))
    .slice(0, LIMITES.tragosMax)
    .map((t) => ({
      recetaId: t.recetaId,
      porcentaje: Math.min(100, Math.max(0, Math.trunc(Number(t.porcentaje)) || 0)),
      productoId: esUuid(t.productoId) ? t.productoId : undefined,
    }));

  const cajasManual: Record<string, number> = {};
  for (const [id, cajas] of Object.entries(e.cajasManual ?? {})) {
    const n = Math.trunc(Number(cajas));
    if (esUuid(id) && n >= 1 && n <= LIMITES.cajasMax) cajasManual[id] = n;
  }

  return { tipoEventoId: tipo.id, invitados, horas, tragos, cajasManual };
}

export async function cotizarEvento(entrada: EntradaCotizador) {
  const { tipos, recetas, catalogo, conSesion } = await datosCotizador();
  const limpia = limpiarEntrada(entrada, tipos, recetas);
  if (typeof limpia === "string") return { error: limpia };
  const tipo = tipos.find((t) => t.id === limpia.tipoEventoId)!;
  return { resultado: calcular(limpia, tipo, recetas, catalogo, conSesion) };
}
