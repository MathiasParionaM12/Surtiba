"use client";

import { Plus, Search } from "lucide-react";
import { useState } from "react";
import {
  LIMITES,
  NIVELES,
  normalizar,
  PESO,
  type EntradaCotizador,
  type Ingrediente,
  type Nivel,
  type Parametros,
  type Receta,
  type ResultadoCotizacion,
  type TragoPropio,
} from "@/lib/cotizador";
import { areaToque, campo } from "@/lib/estilos";
import { CrearTrago } from "./CrearTrago";
import { Segmentado } from "./ui";

// "De cada 9 tragos: 3 chilcano…": cada trago cuenta según su peso (principal 3, secundario 2, ocasional 1).
// Así los números siempre son exactos y dos tragos del mismo nivel salen iguales.
function deCada(barra: EntradaCotizador["barra"]) {
  const partes = barra.map((b) => ({ recetaId: b.recetaId, n: PESO[b.nivel] })).sort((a, b) => b.n - a.n);
  return { total: partes.reduce((s, p) => s + p.n, 0), partes };
}

// Cuántos tragos de más trae el margen: el total ya lo incluye
const entero = new Intl.NumberFormat("en-US");
function extra(tragosConMargen: number, margen: number) {
  return entero.format(Math.round(tragosConMargen - tragosConMargen / (1 + margen / 100)));
}

export function PasoBarra({
  entrada,
  actualizar,
  recetas,
  parametros,
  resultado,
  ingredientes,
}: {
  entrada: EntradaCotizador;
  actualizar: (cambio: Partial<EntradaCotizador>) => void;
  recetas: Receta[];
  parametros: Parametros;
  resultado: ResultadoCotizacion;
  ingredientes: Ingrediente[];
}) {
  const [busqueda, setBusqueda] = useState("");
  const [creando, setCreando] = useState<string | null>(null); // nombre inicial del trago que se está creando
  const propios = entrada.propios ?? [];
  const todos: (Receta | TragoPropio)[] = [...recetas, ...propios];
  const trago = (id: string) => todos.find((r) => r.id === id);
  const nombre = (id: string) => trago(id)?.nombre ?? "";
  const esPropio = (id: string) => propios.some((t) => t.id === id);
  const queLleva = (id: string) => trago(id)?.ingredientes.map((i) => i.nombre.toLowerCase()).join(" · ") ?? "";
  const sinUsar = recetas.filter((r) => !entrada.barra.some((b) => b.recetaId === r.id));
  const reparto = deCada(entrada.barra);
  const llena = entrada.barra.length >= LIMITES.barraMax;

  // Busca por nombre del trago o por ingrediente ("pisco" encuentra pisco sour, chilcano, capitán…)
  const q = normalizar(busqueda);
  const encontrados = q
    ? sinUsar.filter((r) => normalizar(r.nombre).includes(q) || r.ingredientes.some((i) => normalizar(i.nombre).includes(q)))
    : [];

  const cambiarNivel = (recetaId: string, nivel: Nivel) =>
    actualizar({ barra: entrada.barra.map((b) => (b.recetaId === recetaId ? { ...b, nivel } : b)) });
  // Si es un trago propio, al quitarlo de la barra también se borra
  const quitar = (recetaId: string) =>
    actualizar({ barra: entrada.barra.filter((b) => b.recetaId !== recetaId), propios: propios.filter((t) => t.id !== recetaId) });
  const agregar = (recetaId: string) => {
    if (!recetaId || llena) return;
    actualizar({ barra: [...entrada.barra, { recetaId, nivel: "secundario" }] });
    setBusqueda("");
  };
  const agregarPropio = (t: TragoPropio) => {
    actualizar({ propios: [...propios, t], barra: [...entrada.barra, { recetaId: t.id, nivel: "secundario" }] });
    setCreando(null);
    setBusqueda("");
  };

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <div>
          <h3 className="font-medium">¿Qué tragos tendrá la barra?</h3>
          <p className="mt-0.5 text-sm text-gris">
            Marca cuáles se piden más. <strong className="font-medium text-tinta">Principal</strong> se sirve el triple que{" "}
            <strong className="font-medium text-tinta">ocasional</strong>.
          </p>
        </div>
        {entrada.barra.length === 0 && <p className="text-sm text-gris">Agrega al menos un trago.</p>}
        <ul className="flex flex-col divide-y divide-linea rounded-md border border-linea bg-blanco">
          {entrada.barra.map((b) => (
            <li key={b.recetaId} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
              <div className="flex items-center justify-between gap-3">
                <span className="min-w-0">
                  <span className="font-medium">{nombre(b.recetaId)}</span>
                  {esPropio(b.recetaId) && (
                    <span className="ml-2 rounded-sm border border-linea px-1.5 py-0.5 font-mono text-[11px] tracking-[0.08em] text-gris uppercase">Tuyo</span>
                  )}
                  <span className="block truncate text-xs text-gris">{queLleva(b.recetaId)}</span>
                </span>
                <button
                  type="button"
                  onClick={() => quitar(b.recetaId)}
                  className={`${areaToque} text-sm text-gris hover:text-tinta sm:hidden`}
                  aria-label={`Quitar ${nombre(b.recetaId)}`}
                >
                  Quitar
                </button>
              </div>
              <div className="flex items-center gap-3">
                <Segmentado
                  etiqueta={`Cuánto se pide ${nombre(b.recetaId)}`}
                  opciones={NIVELES}
                  valor={b.nivel}
                  onCambio={(v) => cambiarNivel(b.recetaId, v)}
                  ancho
                />
                <button
                  type="button"
                  onClick={() => quitar(b.recetaId)}
                  className="hidden text-sm text-gris hover:text-tinta sm:inline"
                  aria-label={`Quitar ${nombre(b.recetaId)}`}
                >
                  Quitar
                </button>
              </div>
            </li>
          ))}
        </ul>
        {/* Agregar: buscar en el recetario o crear uno propio */}
        {llena ? (
          <p className="text-sm text-gris">Tu barra ya tiene {LIMITES.barraMax} tragos, el máximo. Quita uno para agregar otro.</p>
        ) : creando !== null ? (
          <CrearTrago ingredientes={ingredientes} nombreInicial={creando} onCrear={agregarPropio} onCancelar={() => setCreando(null)} />
        ) : (
          <div className="flex flex-col gap-2">
            <label className="relative">
              <span className="sr-only">Buscar un trago</span>
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gris" aria-hidden="true" />
              <input
                type="search"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Busca un trago o un ingrediente: mojito, pisco…"
                className={`${campo} pl-9 text-sm sm:h-10`}
              />
            </label>
            {q && (
              <ul className="flex flex-col divide-y divide-linea rounded-md border border-linea bg-blanco" aria-label="Tragos encontrados">
                {encontrados.slice(0, 6).map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => agregar(r.id)}
                      className="flex min-h-11 w-full items-center justify-between gap-3 px-4 py-2 text-left hover:bg-papel"
                    >
                      <span className="min-w-0">
                        <span className="text-sm font-medium">{r.nombre}</span>
                        <span className="block truncate text-xs text-gris">{queLleva(r.id)}</span>
                      </span>
                      <Plus className="size-4 shrink-0 text-verde" aria-hidden="true" />
                    </button>
                  </li>
                ))}
                {encontrados.length === 0 && (
                  <li className="px-4 py-3 text-sm text-gris">No tenemos «{busqueda.trim()}» en el recetario. Créalo con sus ingredientes.</li>
                )}
              </ul>
            )}
            {!q && sinUsar.length > 0 && (
              <div className="flex flex-wrap gap-2" aria-label="Sugeridos">
                {sinUsar.slice(0, 6).map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => agregar(r.id)}
                    className="inline-flex min-h-11 items-center gap-1 rounded-md border border-linea bg-blanco px-3 text-sm hover:border-gris sm:min-h-9"
                  >
                    <Plus className="size-3.5 text-verde" aria-hidden="true" />
                    {r.nombre}
                  </button>
                ))}
              </div>
            )}
            {propios.length < LIMITES.propiosMax && (
              <button
                type="button"
                onClick={() => setCreando(q && encontrados.length === 0 ? busqueda.trim() : "")}
                className="flex min-h-11 items-center gap-1.5 self-start text-sm font-medium text-verde hover:text-tinta"
              >
                <Plus className="size-4" aria-hidden="true" />
                {q && encontrados.length === 0 ? `Crear «${busqueda.trim()}»` : "Crear mi trago"}
              </button>
            )}
          </div>
        )}
        {reparto.partes.length > 1 && (
          <p className="rounded-md bg-papel px-3 py-2.5 text-sm">
            De cada {reparto.total} tragos de la barra:{" "}
            {reparto.partes.map((r, i) => (
              <span key={r.recetaId}>
                {i > 0 && " · "}
                <span className="font-mono font-medium">{r.n}</span> {nombre(r.recetaId).toLowerCase()}
              </span>
            ))}
          </p>
        )}
      </section>

      <section className="flex flex-col gap-3 border-t border-linea pt-6">
        <div>
          <h3 className="font-medium">¿Pedimos un poco extra por si acaso?</h3>
          <p className="mt-0.5 text-sm text-gris">Por si llegan más invitados o se toma más de lo previsto.</p>
        </div>
        <Segmentado
          etiqueta="Extra por si acaso"
          opciones={[...new Set([0, 10, 20, entrada.margen])]
            .sort((a, b) => a - b)
            .map((m) => ({ valor: m, texto: m === 0 ? "Lo justo" : `+${m} %${m === parametros.margen_pct ? " · sugerido" : ""}` }))}
          valor={entrada.margen}
          onCambio={(v) => actualizar({ margen: v })}
          ancho
        />
        <p className="text-sm">
          {entrada.margen === 0 ? (
            "Pides justo lo calculado. Si llega más gente o se toma más, puede faltar."
          ) : (
            <>
              Pides unos <strong className="font-mono font-medium">{extra(resultado.tragosTotales, entrada.margen)}</strong> tragos más
              de lo calculado. Lo que sobra cerrado se puede guardar para otro evento.
            </>
          )}
        </p>
      </section>
    </div>
  );
}
