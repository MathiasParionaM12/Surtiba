import type { Metadata } from "next";
import { Carga } from "@/components/Carga";
import { EsqueletoPagina } from "@/components/Esqueleto";
import { CATEGORIAS } from "@/lib/catalogo";
import { candidatosDe, type IngredienteReceta, type ProductoCotizable } from "@/lib/cotizador";
import { supuestosCotizador } from "@/lib/cotizador-datos";
import { TIPOS_NEGOCIO } from "@/lib/cuenta";
import { sello } from "@/lib/estilos";
import { soles } from "@/lib/formato";
import { exigirRol } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Experimento · Panel Surtiba" };

// Evidencia del experimento del curso (10-nov-2026), en un solo lugar:
// 1. Marcas reales y sus productos publicados (precio, foto, presentación, condiciones) y si sirven en el cotizador.
// 2. Cotizaciones: cuántas, de cuántos compradores, multimarca, tiempo para armarlas, abandonadas y conversión a pedido.
// 3. Retroalimentación de los compradores.
// El tiempo y las cotizaciones empezadas se miden desde el 10-nov-2026; lo anterior sale como "sin medir".

const TIPO = Object.fromEntries(TIPOS_NEGOCIO.map((t) => [t.valor, t.texto]));
const dia = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/Lima" });
const cuando = new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Lima" });
const duracion = (s: number) => (s < 60 ? `${s} s` : `${Math.floor(s / 60)} min${s % 60 ? ` ${s % 60} s` : ""}`);
const mediana = (xs: number[]) => {
  if (xs.length === 0) return null;
  const o = [...xs].sort((a, b) => a - b);
  const m = Math.floor(o.length / 2);
  return o.length % 2 ? o[m] : Math.round((o[m - 1] + o[m]) / 2);
};
const pct = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 100)} %` : "—");

export default function PaginaExperimento() {
  return (
    <Carga fallback={<EsqueletoPagina />}>
      <Contenido />
    </Carga>
  );
}

type Item = { marca_id: string; marca: string; producto: string; cajas: number };

async function Contenido() {
  await exigirRol("admin");
  const supabase = await createClient();
  const [{ recetas }, { data: marcas }, { data: cotizaciones }, { data: perfiles }, { data: inicios }, { data: opiniones }] = await Promise.all([
    supuestosCotizador(),
    supabase
      .from("marcas")
      .select(
        "id, nombre_comercial, activa, pedido_minimo_cajas, marcas_privado(comision_pct), productos(id, nombre, categoria, ml, unidades_por_caja, foto_url, descripcion, stock_cajas, activo, revision, escalas_precio(desde_cajas))",
      )
      .eq("activa", true)
      .order("nombre_comercial"),
    supabase.from("cotizaciones").select("id, codigo, creado_en, comprador_id, pedido_id, items, evento, total_centimos, segundos").order("creado_en", { ascending: false }),
    supabase.from("perfiles").select("id, nombre, empresa, rol, tipo_negocio"),
    supabase.from("eventos").select("perfil_id, creado_en").eq("tipo", "inicio_cotizacion"),
    supabase.from("retroalimentacion").select("id, perfil_id, contexto, puntaje, mejorar, fallos, creado_en").order("creado_en", { ascending: false }),
  ]);

  const perfil = new Map((perfiles ?? []).map((p) => [p.id, p]));
  const quien = (id: string | null) => {
    const p = id ? perfil.get(id) : undefined;
    return p ? [p.empresa || p.nombre, p.tipo_negocio ? TIPO[p.tipo_negocio] : null].filter(Boolean).join(" · ") : "Cuenta borrada";
  };

  // ── 1. Productos publicados y si el cotizador los usa ──
  const ingredientes = [...new Map(recetas.flatMap((r) => r.ingredientes).map((i) => [i.id, i])).values()] as IngredienteReceta[];
  const usable = (p: { id: string; nombre: string; categoria: string; ml: number; unidades_por_caja: number }) => {
    const cot: ProductoCotizable = { id: p.id, nombre: p.nombre, marca: "", marcaId: "", categoria: p.categoria, ml: p.ml, unidades: p.unidades_por_caja, tramos: [], stock: null };
    return ingredientes.filter((i) => i.categoria && i.unidad === "ml" && candidatosDe(i, [cot]).length > 0).map((i) => i.nombre);
  };
  const filasMarcas = (marcas ?? []).map((m) => {
    const publicados = m.productos.filter((p) => p.activo && p.revision === "aprobado");
    const conCotizador = publicados.map((p) => ({ ...p, cubre: usable(p) }));
    return {
      nombre: m.nombre_comercial,
      minimo: m.pedido_minimo_cajas,
      comision: m.marcas_privado?.comision_pct ?? null,
      total: m.productos.length,
      publicados: conCotizador,
      conFoto: publicados.filter((p) => p.foto_url).length,
      conDescripcion: publicados.filter((p) => p.descripcion).length,
      conEscala: publicados.filter((p) => p.escalas_precio.length > 1).length,
      conStock: publicados.filter((p) => p.stock_cajas > 0).length,
      enCotizador: conCotizador.filter((p) => p.cubre.length > 0).length,
    };
  });
  const sinUso = filasMarcas.flatMap((m) => m.publicados.filter((p) => p.cubre.length === 0).map((p) => `${p.nombre} (${m.nombre})`));

  // ── 2. Cotizaciones ──
  const cots = (cotizaciones ?? []).map((c) => {
    const items = (Array.isArray(c.items) ? c.items : []) as Item[];
    const ev = (c.evento ?? {}) as { resumen?: { invitados?: number; tipo?: string } };
    return {
      ...c,
      marcas: [...new Set(items.map((i) => i.marca))],
      segundos: c.segundos,
      evento: ev.resumen ? `${ev.resumen.tipo ?? "Evento"} · ${ev.resumen.invitados ?? "?"} invitados` : "Desde el carrito",
    };
  });
  const compradores = new Set(cots.map((c) => c.comprador_id));
  const multimarca = cots.filter((c) => c.marcas.length > 1).length;
  const conPedido = cots.filter((c) => c.pedido_id).length;
  const tiempos = cots.flatMap((c) => (c.segundos !== null ? [c.segundos] : []));
  // Empezadas: una por comprador y día (abrió el cotizador y pasó el primer paso). Abandonada: ese día no guardó ninguna.
  const guardadasPorDia = new Set(cots.map((c) => `${c.comprador_id}|${dia(c.creado_en)}`));
  const empezadas = [...new Set((inicios ?? []).filter((e) => e.perfil_id).map((e) => `${e.perfil_id}|${dia(e.creado_en)}`))];
  const abandonadas = empezadas.filter((k) => !guardadasPorDia.has(k)).length;

  // ── 3. Retroalimentación ──
  const notas = (opiniones ?? []).flatMap((o) => (o.puntaje ? [o.puntaje] : []));
  const promedioNota = notas.length ? (notas.reduce((a, b) => a + b, 0) / notas.length).toFixed(1) : null;

  const tarjetas: [string, string, string?][] = [
    ["Marcas reales publicadas", String(filasMarcas.length), "Con productos aprobados en el catálogo"],
    ["Productos publicados", String(filasMarcas.reduce((s, m) => s + m.publicados.length, 0)), `${filasMarcas.reduce((s, m) => s + m.enCotizador, 0)} se usan en el cotizador`],
    ["Cotizaciones guardadas", String(cots.length), `${compradores.size} ${compradores.size === 1 ? "comprador" : "compradores"} · ${multimarca} multimarca`],
    ["Tiempo para cotizar", mediana(tiempos) !== null ? duracion(mediana(tiempos)!) : "Sin medir", tiempos.length ? `Mediana de ${tiempos.length} · desde que abre el cotizador o agrega lo primero al carrito, hasta el PDF` : "Se mide desde el 10-nov-2026"],
    ["Cotizaciones abandonadas", String(abandonadas), `${empezadas.length} empezadas · ${pct(abandonadas, empezadas.length)} sin terminar`],
    ["Guardadas en pedidos", String(conPedido), `Conversión a pedido: ${pct(conPedido, cots.length)}`],
    ["Opiniones recibidas", String((opiniones ?? []).length), promedioNota ? `Facilidad promedio: ${promedioNota} de 5` : "Al bajar una cotización o hacer un pedido"],
  ];

  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Experimento</h1>
      <p className="mt-2 max-w-2xl text-gris">
        La evidencia del experimento: marcas reales que publicaron, si sus productos sirven en el cotizador, las cotizaciones de los compradores
        (tiempo, abandonadas y conversión) y lo que opinan. Los datos son los reales de la base, sin filtrar.
      </p>

      <dl className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tarjetas.map(([t, v, nota]) => (
          <div key={t} className="rounded-md border border-linea bg-blanco p-4">
            <dt className="text-xs text-gris">{t}</dt>
            <dd className="mt-1 font-mono text-2xl font-semibold">{v}</dd>
            {nota && <dd className="mt-1 text-xs text-gris">{nota}</dd>}
          </div>
        ))}
      </dl>

      {/* 1. Marcas y productos */}
      <section className="mt-10">
        <h2 className={sello}>1 · Marcas y productos publicados</h2>
        <div className="mt-3 overflow-x-auto rounded-md border border-linea bg-blanco">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-linea text-left text-xs text-gris">
                <th className="px-4 py-3 font-medium">Marca</th>
                <th className="px-4 py-3 text-right font-medium">Publicados</th>
                <th className="px-4 py-3 text-right font-medium">Con foto</th>
                <th className="px-4 py-3 text-right font-medium">Con descripción</th>
                <th className="px-4 py-3 text-right font-medium">Precio por volumen</th>
                <th className="px-4 py-3 text-right font-medium">Con stock</th>
                <th className="px-4 py-3 text-right font-medium">En el cotizador</th>
                <th className="px-4 py-3 font-medium">Condiciones</th>
              </tr>
            </thead>
            <tbody>
              {filasMarcas.map((m) => (
                <tr key={m.nombre} className="border-b border-linea last:border-b-0">
                  <td className="px-4 py-3 font-medium">{m.nombre}</td>
                  <td className="px-4 py-3 text-right font-mono">
                    {m.publicados.length}
                    {m.total > m.publicados.length && <span className="text-gris"> / {m.total}</span>}
                  </td>
                  {[m.conFoto, m.conDescripcion, m.conEscala, m.conStock, m.enCotizador].map((n, i) => (
                    <td key={i} className={`px-4 py-3 text-right font-mono ${n < m.publicados.length ? "text-rojo" : ""}`}>
                      {n}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-xs text-gris">
                    Pedido mínimo {m.minimo} cajas{m.comision !== null ? ` · comisión ${m.comision} %` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-gris">En rojo: productos publicados a los que les falta eso. «Precio por volumen» = tiene más de un tramo de precio.</p>
        {sinUso.length > 0 && (
          <p className="mt-3 border-l-2 border-rojo pl-3 text-sm">
            <strong>No entran en ningún trago del cotizador:</strong> {sinUso.join(", ")}. Hay que crear un trago que los use o revisar su nombre.
          </p>
        )}
        <details className="mt-3">
          <summary className="cursor-pointer text-sm font-medium text-verde">Ver cada producto y para qué ingrediente sirve</summary>
          <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
            {filasMarcas.flatMap((m) =>
              m.publicados.map((p) => (
                <li key={p.id} className="flex justify-between gap-3 border-b border-linea py-1.5">
                  <span className="min-w-0">
                    {p.nombre} <span className="text-xs text-gris">· {CATEGORIAS[p.categoria] ?? p.categoria}</span>
                  </span>
                  <span className={`shrink-0 text-xs ${p.cubre.length ? "text-gris" : "text-rojo"}`}>{p.cubre.length ? p.cubre.join(", ") : "ninguno"}</span>
                </li>
              )),
            )}
          </ul>
        </details>
      </section>

      {/* 2. Cotizaciones */}
      <section className="mt-10">
        <h2 className={sello}>2 · Cotizaciones de los compradores</h2>
        {cots.length === 0 ? (
          <p className="mt-3 rounded-md border border-linea bg-blanco p-4 text-sm text-gris">Aún no hay cotizaciones guardadas.</p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-md border border-linea bg-blanco">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-linea text-left text-xs text-gris">
                  <th className="px-4 py-3 font-medium">Código</th>
                  <th className="px-4 py-3 font-medium">Comprador</th>
                  <th className="px-4 py-3 font-medium">Evento</th>
                  <th className="px-4 py-3 font-medium">Marcas</th>
                  <th className="px-4 py-3 text-right font-medium">Tiempo</th>
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">Pedido</th>
                </tr>
              </thead>
              <tbody>
                {cots.map((c) => (
                  <tr key={c.id} className="border-b border-linea last:border-b-0">
                    <td className="px-4 py-3 font-mono">
                      {c.codigo}
                      <span className="block font-sans text-xs text-gris">{cuando.format(new Date(c.creado_en))}</span>
                    </td>
                    <td className="px-4 py-3">{quien(c.comprador_id)}</td>
                    <td className="px-4 py-3 text-gris">{c.evento}</td>
                    <td className="px-4 py-3">{c.marcas.join(", ") || "—"}</td>
                    <td className="px-4 py-3 text-right font-mono">{c.segundos !== null ? duracion(c.segundos) : <span className="text-gris">sin medir</span>}</td>
                    <td className="px-4 py-3 text-right font-mono">{soles(c.total_centimos)}</td>
                    <td className="px-4 py-3">{c.pedido_id ? "Sí" : <span className="text-gris">No</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-2 text-xs text-gris">
          Empezada = el comprador abrió el cotizador y pasó el primer paso (una por comprador y día). Abandonada = ese día no guardó ninguna
          cotización. Guardada en pedido = después hizo un pedido (la última cotización de los 30 días anteriores queda vinculada).
        </p>
      </section>

      {/* 3. Retroalimentación */}
      <section className="mt-10">
        <h2 className={sello}>3 · Lo que opinan los compradores</h2>
        {(opiniones ?? []).length === 0 ? (
          <p className="mt-3 rounded-md border border-linea bg-blanco p-4 text-sm text-gris">
            Todavía no hay opiniones. Se piden al bajar una cotización (en el cotizador o el carrito) y al hacer un pedido, con el incentivo de los 2 primeros pedidos con envío gratis.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-3">
            {(opiniones ?? []).map((o) => (
              <li key={o.id} className="rounded-md border border-linea bg-blanco p-4 text-sm">
                <p className="flex flex-wrap justify-between gap-2 text-xs text-gris">
                  <span>
                    {quien(o.perfil_id)} · {o.contexto === "marca" ? "Marca" : o.contexto === "pedido" ? "Al hacer su pedido" : "Al cotizar"}
                    {o.puntaje ? ` · facilidad ${o.puntaje} de 5` : ""}
                  </span>
                  <span>{cuando.format(new Date(o.creado_en))}</span>
                </p>
                {o.mejorar && (
                  <p className="mt-2">
                    <span className="font-medium">Mejorar:</span> {o.mejorar}
                  </p>
                )}
                {o.fallos && (
                  <p className="mt-1">
                    <span className="font-medium">Fallos:</span> {o.fallos}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
