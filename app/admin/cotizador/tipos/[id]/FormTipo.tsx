"use client";

import { startTransition, useActionState, useState } from "react";
import { AvisoForm } from "@/components/AvisoForm";
import { Etiqueta } from "@/components/Etiqueta";
import type { EstadoForm } from "@/lib/acciones-auth";
import { guardarTipoEvento } from "@/lib/acciones-admin";
import { CATEGORIAS } from "@/lib/catalogo";
import { botonPrimario, campo, sello } from "@/lib/estilos";

type Tipo = { id: string; nombre: string; primera: number; siguiente: number; activo: boolean; mezcla: Record<string, number> };
type Receta = { id: string; nombre: string; categoria: string; ml_por_trago: number; activo: boolean };

export function FormTipo({ tipo, recetas }: { tipo: Tipo | null; recetas: Receta[] }) {
  const [estado, accion, enviando] = useActionState<EstadoForm, FormData>(guardarTipoEvento, {});
  // Porcentajes en vivo para mostrar la suma mientras se escribe
  const [pct, setPct] = useState<Record<string, number>>(tipo?.mezcla ?? {});
  const suma = Object.values(pct).reduce((s, n) => s + (n > 0 ? n : 0), 0);

  return (
    <form
      // Se envía sin limpiar el formulario: si hay un error (ej. suma 90 %), lo escrito se queda
      onSubmit={(e) => {
        e.preventDefault();
        const datos = new FormData(e.currentTarget);
        startTransition(() => accion(datos));
      }}
      className="mt-6 flex max-w-2xl flex-col gap-6 rounded-md border border-linea bg-blanco p-5 sm:p-6"
    >
      {tipo && <input type="hidden" name="tipo_id" value={tipo.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2 sm:col-span-2">
          <Etiqueta texto="Nombre" obligatorio />
          <input name="nombre" required defaultValue={tipo?.nombre} placeholder="Ej.: Aniversario de empresa" className={campo} />
        </label>
        <label className="flex flex-col gap-2">
          <Etiqueta texto="Tragos por persona en la 1.ª hora" obligatorio />
          <input
            name="primera"
            inputMode="decimal"
            required
            defaultValue={tipo?.primera ?? 2}
            className={`${campo} font-mono`}
          />
        </label>
        <label className="flex flex-col gap-2">
          <Etiqueta texto="Tragos por persona cada hora siguiente" obligatorio />
          <input
            name="siguiente"
            inputMode="decimal"
            required
            defaultValue={tipo?.siguiente ?? 1}
            className={`${campo} font-mono`}
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input name="activo" type="checkbox" defaultChecked={tipo?.activo ?? true} className="accent-verde" />
          Activo (aparece en el cotizador)
        </label>
      </div>

      <fieldset className="flex flex-col gap-3 border-t border-linea pt-6">
        <div className="flex items-baseline justify-between">
          <legend className={sello}>Qué se sirve (%)</legend>
          <span className={`font-mono text-sm ${suma === 100 ? "text-verde" : "font-medium text-rojo"}`}>Suma {suma} %</span>
        </div>
        <p className="text-sm text-gris">Pon 0 en los tragos que no se sirven. Deben sumar 100 %.</p>
        {recetas.map((r) => (
          <label key={r.id} className="flex items-center justify-between gap-3 border-b border-linea pb-3 last:border-b-0">
            <span className="min-w-0">
              <span className="font-medium">{r.nombre}</span>
              {!r.activo && <span className="ml-2 text-xs text-gris">Inactivo</span>}
              <span className="block text-xs text-gris">
                {CATEGORIAS[r.categoria] ?? r.categoria} · {r.ml_por_trago} ml por trago
              </span>
            </span>
            <span className="relative w-24 shrink-0">
              <input
                name={`pct_${r.id}`}
                type="number"
                min={0}
                max={100}
                inputMode="numeric"
                defaultValue={tipo?.mezcla[r.id] ?? 0}
                onChange={(e) => setPct((p) => ({ ...p, [r.id]: Math.trunc(Number(e.target.value)) || 0 }))}
                className={`${campo} h-10 pr-7 text-right font-mono`}
              />
              <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 font-mono text-sm text-gris">%</span>
            </span>
          </label>
        ))}
      </fieldset>

      <AvisoForm error={estado.error} mensaje={estado.mensaje} />
      <button type="submit" disabled={enviando} className={`${botonPrimario} self-start`}>
        {enviando ? "Guardando…" : tipo ? "Guardar cambios" : "Crear tipo de evento"}
      </button>
    </form>
  );
}
