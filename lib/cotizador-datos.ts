// Datos del cotizador leídos en el servidor. El cotizador es solo para quien tiene cuenta:
// comprador y admin reciben los productos activos con su escala completa y stock (RLS decide).

import { esUuid, ordenarTramos } from "@/lib/catalogo";
import {
  calcular,
  LIMITES,
  type EntradaCotizador,
  type IngredienteReceta,
  type Nivel,
  type Parametros,
  type Perfil,
  type ProductoCotizable,
  type Receta,
  type TipoEvento,
} from "@/lib/cotizador";
import { cacheLife, cacheTag } from "next/cache";
import { obtenerUsuario } from "@/lib/sesion";
import { clientePublico } from "@/lib/supabase/publico";
import { createClient } from "@/lib/supabase/server";

export async function datosCotizador({ conProductos = true } = {}) {
  const [usuario, supuestos] = await Promise.all([obtenerUsuario(), supuestosCotizador()]);
  const puedeUsar = usuario?.rol === "comprador" || usuario?.rol === "admin";
  const catalogo = puedeUsar && conProductos ? await catalogoConSesion() : [];
  return { usuario, puedeUsar, ...supuestos, catalogo };
}

// Supuestos, tipos de evento y tragos activos: son públicos e iguales para todos, así que se
// guardan en caché (sin sesión). Se actualizan al instante cuando el admin guarda un cambio
// (updateTag("cotizador") en acciones-admin.ts) y, por si acaso, cada hora.
export async function supuestosCotizador() {
  "use cache";
  cacheLife("hours");
  cacheTag("cotizador");
  const supabase = clientePublico();

  const [{ data: par }, { data: tiposData }, { data: recetasData }] = await Promise.all([
    supabase.from("parametros_cotizador").select("*").maybeSingle(),
    supabase
      .from("tipos_evento")
      .select(
        "id, nombre, horas, perfil, bienvenida, bienvenida_horas, bienvenida_receta_id, brindis, cena, cena_horas, tipo_evento_recetas(receta_id, nivel)",
      )
      .eq("activo", true)
      .order("orden"),
    supabase
      .from("recetas")
      .select("id, nombre, categoria, receta_ingredientes(cantidad, ingredientes(id, nombre, unidad, categoria, orden, activo))")
      .eq("activo", true)
      .order("orden"),
  ]);

  // Cada trago con sus ingredientes activos. Un trago sin ingredientes no se puede calcular: no se ofrece.
  const recetas: Receta[] = (recetasData ?? [])
    .map((r) => ({
      id: r.id,
      nombre: r.nombre,
      categoria: r.categoria,
      ingredientes: r.receta_ingredientes
        .filter((x) => x.ingredientes?.activo)
        .map((x) => ({
          id: x.ingredientes!.id,
          nombre: x.ingredientes!.nombre,
          unidad: x.ingredientes!.unidad as IngredienteReceta["unidad"],
          categoria: x.ingredientes!.categoria,
          orden: x.ingredientes!.orden,
          cantidad: Number(x.cantidad),
        })),
    }))
    .filter((r) => r.ingredientes.length > 0);
  const idsRecetas = new Set(recetas.map((r) => r.id));
  const tipos: TipoEvento[] = (tiposData ?? []).map((t) => ({
    id: t.id,
    nombre: t.nombre,
    horas: t.horas,
    perfil: t.perfil as Perfil,
    bienvenida: t.bienvenida,
    bienvenida_horas: Number(t.bienvenida_horas),
    bienvenida_receta_id: t.bienvenida_receta_id && idsRecetas.has(t.bienvenida_receta_id) ? t.bienvenida_receta_id : null,
    brindis: t.brindis,
    cena: t.cena,
    cena_horas: Number(t.cena_horas),
    barra: t.tipo_evento_recetas
      .filter((m) => idsRecetas.has(m.receta_id))
      .map((m) => ({ receta_id: m.receta_id, nivel: m.nivel as Nivel })),
  }));
  const parametros = par ? aParametros(par) : null;

  return { parametros, tipos, recetas };
}

function aParametros(p: Record<string, unknown>): Parametros {
  const n = (k: string) => Number(p[k]);
  return {
    no_toman_pct: n("no_toman_pct"),
    factor_tranquilo: n("factor_tranquilo"),
    factor_normal: n("factor_normal"),
    factor_fuerte: n("factor_fuerte"),
    factor_dia: n("factor_dia"),
    bienvenida_tragos_hora: n("bienvenida_tragos_hora"),
    fiesta_primera_hora: n("fiesta_primera_hora"),
    fiesta_tragos_hora: n("fiesta_tragos_hora"),
    cena_copas_hora: n("cena_copas_hora"),
    brindis_copas: n("brindis_copas"),
    cena_receta_id: (p.cena_receta_id as string | null) ?? null,
    brindis_receta_id: (p.brindis_receta_id as string | null) ?? null,
    hielo_kg_persona_hora: n("hielo_kg_persona_hora"),
    factor_calor: n("factor_calor"),
    sin_alcohol_l_hora_toma: n("sin_alcohol_l_hora_toma"),
    sin_alcohol_l_hora_no_toma: n("sin_alcohol_l_hora_no_toma"),
    margen_pct: n("margen_pct"),
  };
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

const PERFILES_VALIDOS = new Set(["tranquilo", "normal", "fuerte"]);
const NIVELES_VALIDOS = new Set(["principal", "secundario", "ocasional"]);
const entero = (v: unknown) => Math.trunc(Number(v));
const mediaHora = (v: unknown) => Math.round(Number(v) * 2) / 2; // 0.5, 1, 1.5…

// Lo que llega del navegador no es confiable: se limpia antes de calcular
export function limpiarEntrada(e: EntradaCotizador, tipos: TipoEvento[], recetas: Receta[]): EntradaCotizador | string {
  const tipo = tipos.find((t) => t.id === e?.tipoEventoId);
  if (!tipo) return "Elige el tipo de evento.";
  const invitados = entero(e.invitados);
  if (!(invitados >= 1 && invitados <= LIMITES.invitadosMax)) return `Los invitados van de 1 a ${LIMITES.invitadosMax}.`;
  const noToman = entero(e.noToman);
  if (!(noToman >= 0 && noToman <= invitados)) return "Los que no toman alcohol van de 0 al total de invitados.";
  const horas = entero(e.horas);
  if (!(horas >= 1 && horas <= LIMITES.horasMax)) return `La duración va de 1 a ${LIMITES.horasMax} horas.`;
  const horaInicio = /^([01]\d|2[0-3]):[0-5]\d$/.test(String(e.horaInicio)) ? String(e.horaInicio) : "19:00";
  const margen = Math.min(50, Math.max(0, entero(e.margen) || 0));

  const idsRecetas = new Set(recetas.map((r) => r.id));
  const vistos = new Set<string>();
  const barra = (Array.isArray(e.barra) ? e.barra : [])
    .filter((b) => idsRecetas.has(b?.recetaId) && NIVELES_VALIDOS.has(b.nivel) && !vistos.has(b.recetaId) && vistos.add(b.recetaId))
    .slice(0, LIMITES.barraMax)
    .map((b) => ({ recetaId: b.recetaId, nivel: b.nivel }));

  const bienvenidaHoras = Math.min(4, Math.max(0.5, mediaHora(e.bienvenida?.horas) || 1));
  const cenaHoras = Math.min(4, Math.max(0.5, mediaHora(e.cena?.horas) || 1.5));

  // Producto elegido para cada ingrediente (solo ingredientes que existen en algún trago)
  const idsIngredientes = new Set(recetas.flatMap((r) => r.ingredientes.map((i) => i.id)));
  const productos: Record<string, string> = {};
  for (const [ingrediente, producto] of Object.entries(e.productos ?? {})) {
    if (idsIngredientes.has(ingrediente) && esUuid(producto)) productos[ingrediente] = producto;
  }
  const cajasManual: Record<string, number> = {};
  for (const [id, cajas] of Object.entries(e.cajasManual ?? {})) {
    const n = entero(cajas);
    if (esUuid(id) && n >= 1 && n <= LIMITES.cajasMax) cajasManual[id] = n;
  }

  return {
    nombre: String(e.nombre ?? "").trim().slice(0, 80),
    fecha: /^\d{4}-\d{2}-\d{2}$/.test(String(e.fecha ?? "")) ? String(e.fecha) : "",
    tipoEventoId: tipo.id,
    invitados,
    noToman,
    horaInicio,
    horas,
    aireLibre: e.aireLibre === true,
    perfil: PERFILES_VALIDOS.has(e.perfil) ? e.perfil : "normal",
    margen,
    bienvenida: {
      activo: e.bienvenida?.activo === true,
      horas: bienvenidaHoras,
      recetaId: e.bienvenida?.recetaId && idsRecetas.has(e.bienvenida.recetaId) ? e.bienvenida.recetaId : null,
    },
    cena: { activo: e.cena?.activo === true, horas: cenaHoras },
    brindis: { activo: e.brindis?.activo === true },
    barra,
    productos,
    cajasManual,
  };
}

export async function cotizarEvento(entrada: EntradaCotizador) {
  const { puedeUsar, parametros, tipos, recetas, catalogo } = await datosCotizador();
  if (!puedeUsar) return { error: "Ingresa con tu cuenta de comprador para usar el cotizador." };
  if (!parametros) return { error: "El cotizador no está disponible por ahora." };
  const limpia = limpiarEntrada(entrada, tipos, recetas);
  if (typeof limpia === "string") return { error: limpia };
  return { entrada: limpia, resultado: calcular(limpia, parametros, recetas, catalogo) };
}
