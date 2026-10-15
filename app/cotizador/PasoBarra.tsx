"use client";

import { LIMITES, NIVELES, PERFILES, PESO, type EntradaCotizador, type Nivel, type Receta } from "@/lib/cotizador";
import { campo } from "@/lib/estilos";
import { Segmentado } from "./ui";

// "De cada 9 tragos: 3 chilcano…": cada trago cuenta según su peso (principal 3, secundario 2, ocasional 1).
// Así los números siempre son exactos y dos tragos del mismo nivel salen iguales.
function deCada(barra: EntradaCotizador["barra"]) {
  const partes = barra.map((b) => ({ recetaId: b.recetaId, n: PESO[b.nivel] })).sort((a, b) => b.n - a.n);
  return { total: partes.reduce((s, p) => s + p.n, 0), partes };
}

export function PasoBarra({
  entrada,
  actualizar,
  recetas,
}: {
  entrada: EntradaCotizador;
  actualizar: (cambio: Partial<EntradaCotizador>) => void;
  recetas: Receta[];
}) {
  const nombre = (id: string) => recetas.find((r) => r.id === id)?.nombre ?? "";
  const sinUsar = recetas.filter((r) => !entrada.barra.some((b) => b.recetaId === r.id));
  const reparto = deCada(entrada.barra);

  const cambiarNivel = (recetaId: string, nivel: Nivel) =>
    actualizar({ barra: entrada.barra.map((b) => (b.recetaId === recetaId ? { ...b, nivel } : b)) });
  const quitar = (recetaId: string) => actualizar({ barra: entrada.barra.filter((b) => b.recetaId !== recetaId) });
  const agregar = (recetaId: string) => recetaId && actualizar({ barra: [...entrada.barra, { recetaId, nivel: "secundario" }] });

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
                <span className="font-medium">{nombre(b.recetaId)}</span>
                <button
                  type="button"
                  onClick={() => quitar(b.recetaId)}
                  className="text-sm text-gris hover:text-tinta sm:hidden"
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
        {sinUsar.length > 0 && entrada.barra.length < LIMITES.barraMax && (
          <select value="" onChange={(e) => agregar(e.target.value)} className={`${campo} h-10 text-sm sm:w-72`} aria-label="Agregar un trago">
            <option value="">+ Agregar un trago</option>
            {sinUsar.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nombre}
              </option>
            ))}
          </select>
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
          <h3 className="font-medium">¿Cuánto toma tu público?</h3>
          <p className="mt-0.5 text-sm text-gris">{PERFILES.find((p) => p.valor === entrada.perfil)?.ayuda}</p>
        </div>
        <Segmentado etiqueta="Cuánto toma el público" opciones={PERFILES} valor={entrada.perfil} onCambio={(v) => actualizar({ perfil: v })} ancho />
      </section>

      <section className="flex flex-col gap-3 border-t border-linea pt-6">
        <div>
          <h3 className="font-medium">Margen de seguridad</h3>
          <p className="mt-0.5 text-sm text-gris">Un poco más para que no falte. Lo que sobra cerrado se puede guardar.</p>
        </div>
        <Segmentado
          etiqueta="Margen de seguridad"
          opciones={[...new Set([0, 5, 10, 15, 20, entrada.margen])]
            .sort((a, b) => a - b)
            .map((m) => ({ valor: m, texto: m === 0 ? "Sin margen" : `+${m} %` }))}
          valor={entrada.margen}
          onCambio={(v) => actualizar({ margen: v })}
        />
      </section>
    </div>
  );
}
