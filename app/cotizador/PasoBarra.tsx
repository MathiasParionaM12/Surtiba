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
import { Sello } from "@/components/Sello";
import { areaToque, campo } from "@/lib/estilos";
import { CrearTrago } from "./CrearTrago";
import { Segmentado } from "./ui";

// "De cada 9 tragos: 3 chilcano…": cada trago cuenta según su peso (principal 3, secundario 2, ocasional 1).
// Así los números siempre son exactos y dos tragos del mismo nivel salen iguales.
function deCada(barra: EntradaCotizador["barra"]) {
  const partes = barra.map((b) => ({ recetaId: b.recetaId, n: PESO[b.nivel] })).sort((a, b) => b.n - a.n);
  return { total: partes.reduce((s, p) => s + p.n, 0), partes };
}

// Colores de la barra del reparto, solo de la marca (tinta, verde, gris y sus tonos), en orden
const COLORES = ["bg-tinta", "bg-verde", "bg-verde/55", "bg-gris", "bg-verde/30", "bg-tinta/40", "bg-gris/50", "bg-linea"];

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
  const [agregado, setAgregado] = useState<{ id: string; vez: number }>(); // para estampar "Agregado" en esa fila
  const propios = entrada.propios ?? [];
  const todos: (Receta | TragoPropio)[] = [...recetas, ...propios];
  const trago = (id: string) => todos.find((r) => r.id === id);
  const nombre = (id: string) => trago(id)?.nombre ?? "";
  const esPropio = (id: string) => propios.some((t) => t.id === id);
  const queLleva = (id: string) => trago(id)?.ingredientes.map((i) => i.nombre.toLowerCase()).join(" · ") ?? "";
  const sinUsar = recetas.filter((r) => !entrada.barra.some((b) => b.recetaId === r.id));
  const reparto = deCada(entrada.barra);
  const llena = entrada.barra.length >= LIMITES.barraMax;
  // Cada trago tiene su color fijo (según su lugar en la barra), aunque cambie de nivel
  // Orden fijo (el de la barra): al cambiar un nivel, cada parte solo cambia de tamaño
  const partes = entrada.barra.map((b) => ({ recetaId: b.recetaId, n: PESO[b.nivel] }));
  const color = (id: string) => COLORES[Math.max(0, entrada.barra.findIndex((b) => b.recetaId === id)) % COLORES.length];

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
    setAgregado((a) => ({ id: recetaId, vez: (a?.vez ?? 0) + 1 }));
    setBusqueda("");
  };
  const agregarPropio = (t: TragoPropio) => {
    actualizar({ propios: [...propios, t], barra: [...entrada.barra, { recetaId: t.id, nivel: "secundario" }] });
    setAgregado((a) => ({ id: t.id, vez: (a?.vez ?? 0) + 1 }));
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
              <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                <span className="min-w-0">
                  <span className="font-medium">{nombre(b.recetaId)}</span>
                  {esPropio(b.recetaId) && (
                    <Sello tono="gris" giro={-3} className="ml-2 align-[2px]">
                      Tuyo
                    </Sello>
                  )}
                  {agregado?.id === b.recetaId && (
                    <Sello key={agregado.vez} tono="verde" giro={-6} className="estampa-pasajera ml-2 align-[2px]">
                      Agregado
                    </Sello>
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
              <div className="flex shrink-0 items-center gap-3">
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
                className="flex min-h-11 items-center gap-1.5 self-start text-sm font-medium enlace text-verde hover:text-tinta"
              >
                <Plus className="size-4" aria-hidden="true" />
                {q && encontrados.length === 0 ? `Crear «${busqueda.trim()}»` : "Crear mi trago"}
              </button>
            )}
          </div>
        )}
        {reparto.partes.length > 1 && (
          <div className="rounded-md bg-papel px-3 py-3">
            <p className="text-sm">
              De cada <span className="font-mono font-medium">{reparto.total}</span> tragos de la barra:
            </p>
            {/* Cada trago ocupa su parte; al cambiar un nivel, la barra se acomoda suave */}
            <div className="mt-2 flex h-3 gap-0.5 overflow-hidden rounded-full" aria-hidden="true">
              {partes.map((r) => (
                <span
                  key={r.recetaId}
                  className={`${color(r.recetaId)} h-full transition-[flex-grow] duration-300 ease-out`}
                  style={{ flexGrow: r.n, flexBasis: 0 }}
                />
              ))}
            </div>
            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
              {partes.map((r) => (
                <li key={r.recetaId} className="flex items-center gap-1.5">
                  <span className={`size-2.5 shrink-0 rounded-sm ${color(r.recetaId)}`} aria-hidden="true" />
                  <span className="font-mono font-medium">{r.n}</span> {nombre(r.recetaId).toLowerCase()}
                </li>
              ))}
            </ul>
          </div>
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
