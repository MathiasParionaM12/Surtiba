"use client";

// Un trago del recetario con sus ingredientes por trago (sin "receta" = formulario para agregar uno nuevo).
// Se manda todo junto a admin_guardar_trago, que lo guarda en una transacción y calcula el licor principal.
import { Plus, X } from "lucide-react";
import { useActionState, useState } from "react";
import { AvisoForm } from "@/components/AvisoForm";
import type { EstadoForm } from "@/lib/acciones-auth";
import { guardarTrago } from "@/lib/acciones-admin";
import type { Ingrediente } from "@/lib/cotizador";
import { botonPrimario, campo } from "@/lib/estilos";

const MAX = 12;
const UNIDAD: Record<string, string> = { ml: "ml", unidad: "unid.", g: "g" };

export type TragoAdmin = { id: string; nombre: string; activo: boolean; ingredientes: { ingrediente_id: string; cantidad: number }[] };
type Linea = { clave: number; id: string; cantidad: string };

export function EditorTrago({ receta, ingredientes }: { receta?: TragoAdmin; ingredientes: (Ingrediente & { activo: boolean })[] }) {
  const [estado, enviar, enviando] = useActionState<EstadoForm, FormData>(guardarTrago, {});
  const [lineas, setLineas] = useState<Linea[]>(
    receta?.ingredientes.length
      ? receta.ingredientes.map((l, i) => ({ clave: i + 1, id: l.ingrediente_id, cantidad: String(l.cantidad) }))
      : [{ clave: 1, id: "", cantidad: "" }],
  );
  const porId = new Map(ingredientes.map((i) => [i.id, i]));
  // Los inactivos solo aparecen si este trago ya los usa
  const visibles = ingredientes.filter((i) => i.activo || lineas.some((l) => l.id === i.id));
  const resumen = (receta?.ingredientes ?? [])
    .map((l) => `${porId.get(l.ingrediente_id)?.nombre.toLowerCase() ?? "?"} ${l.cantidad} ${UNIDAD[porId.get(l.ingrediente_id)?.unidad ?? "ml"]}`)
    .join(" · ");

  const cambiar = (clave: number, cambio: Partial<Linea>) => setLineas((ls) => ls.map((l) => (l.clave === clave ? { ...l, ...cambio } : l)));
  const json = JSON.stringify(lineas.filter((l) => l.id).map((l) => ({ ingrediente_id: l.id, cantidad: Number(l.cantidad) })));

  const formulario = (
    <form action={enviar} className="flex flex-col gap-3 pt-3">
      {receta && <input type="hidden" name="receta_id" value={receta.id} />}
      <input type="hidden" name="ingredientes" value={json} />
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-48 flex-1 flex-col gap-1">
          <span className="text-xs text-gris">Nombre del trago</span>
          <input name="nombre" required minLength={2} maxLength={60} defaultValue={receta?.nombre} placeholder="Ej.: Chilcano de maracuyá" className={`${campo} h-10`} />
        </label>
        <label className="flex h-10 items-center gap-2 text-sm">
          <input name="activo" type="checkbox" defaultChecked={receta?.activo ?? true} className="accent-verde" />
          Activo (lo ven los compradores)
        </label>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-xs text-gris">Ingredientes por trago</span>
        {lineas.map((l, n) => (
          <div key={l.clave} className="flex flex-wrap items-center gap-2">
            <div className="min-w-48 flex-1">
              <select
                value={l.id}
                onChange={(e) => cambiar(l.clave, { id: e.target.value })}
                aria-label={`Ingrediente ${n + 1}`}
                className={`${campo} h-10 text-sm`}
              >
                <option value="">Elige un ingrediente</option>
                <optgroup label="Los vende Surtiba">
                  {visibles
                    .filter((i) => i.categoria)
                    .map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.nombre}
                        {!i.activo && " (inactivo)"}
                      </option>
                    ))}
                </optgroup>
                <optgroup label="No los vende Surtiba">
                  {visibles
                    .filter((i) => !i.categoria)
                    .map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.nombre}
                        {!i.activo && " (inactivo)"}
                      </option>
                    ))}
                </optgroup>
              </select>
            </div>
            <div className="w-24">
              <input
                type="number"
                inputMode="decimal"
                min={0}
                max={1000}
                step="any"
                value={l.cantidad}
                onChange={(e) => cambiar(l.clave, { cantidad: e.target.value })}
                aria-label={`Cantidad del ingrediente ${n + 1}`}
                className={`${campo} h-10 text-right font-mono text-sm`}
              />
            </div>
            <span className="w-10 text-xs text-gris">{UNIDAD[porId.get(l.id)?.unidad ?? "ml"]}</span>
            <button
              type="button"
              onClick={() => setLineas((ls) => (ls.length > 1 ? ls.filter((x) => x.clave !== l.clave) : ls))}
              disabled={lineas.length === 1}
              aria-label={`Quitar el ingrediente ${n + 1}`}
              className="flex size-10 items-center justify-center rounded-md text-gris hover:bg-papel hover:text-tinta disabled:opacity-30"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        ))}
        {lineas.length < MAX && (
          <button
            type="button"
            onClick={() => setLineas((ls) => [...ls, { clave: Math.max(0, ...ls.map((x) => x.clave)) + 1, id: "", cantidad: "" }])}
            className="flex min-h-10 items-center gap-1.5 self-start text-sm font-medium text-verde hover:text-tinta"
          >
            <Plus className="size-4" aria-hidden="true" />
            Otro ingrediente
          </button>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={enviando} className={`${botonPrimario} h-10 px-4`}>
          {enviando ? "Guardando…" : receta ? "Guardar trago" : "Agregar trago"}
        </button>
        <div className="empty:hidden">
          <AvisoForm estado={estado} />
        </div>
      </div>
    </form>
  );

  if (!receta) return formulario;
  return (
    <details className="group">
      <summary className="flex cursor-pointer list-none flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-1">
        <span className="min-w-0">
          <span className="font-medium">{receta.nombre}</span>
          {!receta.activo && <span className="ml-2 text-xs text-gris">(inactivo)</span>}
          <span className="block text-xs text-gris">{resumen || "Sin ingredientes: no se ofrece en el cotizador"}</span>
        </span>
        <span className="text-sm font-medium text-verde group-open:hidden">Editar</span>
        <span className="hidden text-sm font-medium text-gris group-open:inline">Cerrar</span>
      </summary>
      {formulario}
    </details>
  );
}
