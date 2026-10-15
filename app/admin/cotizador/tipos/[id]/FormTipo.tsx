"use client";

import { startTransition, useActionState, useState } from "react";
import { AvisoForm } from "@/components/AvisoForm";
import { Etiqueta } from "@/components/Etiqueta";
import type { EstadoForm } from "@/lib/acciones-auth";
import { guardarTipoEvento } from "@/lib/acciones-admin";
import { CATEGORIAS } from "@/lib/catalogo";
import { NIVELES, PERFILES } from "@/lib/cotizador";
import { botonPrimario, campo, sello } from "@/lib/estilos";

export type TipoForm = {
  id: string;
  nombre: string;
  activo: boolean;
  horas: number;
  perfil: string;
  bienvenida: boolean;
  bienvenida_horas: number;
  bienvenida_receta_id: string | null;
  brindis: boolean;
  cena: boolean;
  cena_horas: number;
  barra: Record<string, string>; // receta_id -> nivel
};
type Receta = { id: string; nombre: string; categoria: string; activo: boolean };

const HORAS = [0.5, 1, 1.5, 2, 2.5, 3, 4];

export function FormTipo({ tipo, recetas }: { tipo: TipoForm | null; recetas: Receta[] }) {
  const [estado, accion, enviando] = useActionState<EstadoForm, FormData>(guardarTipoEvento, {});
  const [bienvenida, setBienvenida] = useState(tipo?.bienvenida ?? false);
  const [cena, setCena] = useState(tipo?.cena ?? false);

  return (
    <form
      // Sin limpiar el formulario: si hay un error, lo escrito se queda
      onSubmit={(e) => {
        e.preventDefault();
        const datos = new FormData(e.currentTarget);
        startTransition(() => accion(datos));
      }}
      className="mt-6 flex max-w-3xl flex-col gap-6 rounded-md border border-linea bg-blanco p-5 sm:p-6"
    >
      {tipo && <input type="hidden" name="tipo_id" value={tipo.id} />}

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="flex flex-col gap-2 sm:col-span-3">
          <Etiqueta texto="Nombre" obligatorio />
          <input name="nombre" required defaultValue={tipo?.nombre} placeholder="Ej.: Aniversario de empresa" className={campo} />
        </label>
        <label className="flex flex-col gap-2">
          <Etiqueta texto="Duración típica" />
          <select name="horas" defaultValue={tipo?.horas ?? 5} className={campo}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
              <option key={h} value={h}>
                {h} {h === 1 ? "hora" : "horas"}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <Etiqueta texto="Público" />
          <select name="perfil" defaultValue={tipo?.perfil ?? "normal"} className={campo}>
            {PERFILES.map((p) => (
              <option key={p.valor} value={p.valor}>
                {p.texto}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 self-end pb-3 text-sm">
          <input name="activo" type="checkbox" defaultChecked={tipo?.activo ?? true} className="accent-verde" />
          Activo (aparece en el cotizador)
        </label>
      </div>

      <fieldset className="flex flex-col gap-4 border-t border-linea pt-6">
        <legend className={`${sello} mb-2`}>Momentos por defecto</legend>
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex h-10 items-center gap-2 text-sm">
            <input name="bienvenida" type="checkbox" checked={bienvenida} onChange={(e) => setBienvenida(e.target.checked)} className="accent-verde" />
            Bienvenida
          </label>
          {bienvenida && (
            <>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-gris">Horas</span>
                <select name="bienvenida_horas" defaultValue={tipo?.bienvenida_horas ?? 1} className={`${campo} h-10 w-28`}>
                  {HORAS.filter((h) => h <= 3).map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex min-w-48 flex-col gap-1">
                <span className="text-xs text-gris">Qué se sirve</span>
                <select name="bienvenida_receta" defaultValue={tipo?.bienvenida_receta_id ?? ""} className={`${campo} h-10`}>
                  <option value="">Los tragos de la barra</option>
                  {recetas.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nombre}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex h-10 items-center gap-2 text-sm">
            <input name="cena" type="checkbox" checked={cena} onChange={(e) => setCena(e.target.checked)} className="accent-verde" />
            Cena con vino
          </label>
          {cena && (
            <label className="flex flex-col gap-1">
              <span className="text-xs text-gris">Horas</span>
              <select name="cena_horas" defaultValue={tipo?.cena_horas ?? 1.5} className={`${campo} h-10 w-28`}>
                {HORAS.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        <label className="flex h-10 items-center gap-2 text-sm">
          <input name="brindis" type="checkbox" defaultChecked={tipo?.brindis ?? false} className="accent-verde" />
          Brindis
        </label>
        <p className="text-xs text-gris">La fiesta (barra libre) ocupa las horas que quedan.</p>
      </fieldset>

      <fieldset className="flex flex-col gap-3 border-t border-linea pt-6">
        <legend className={`${sello} mb-2`}>Barra de la fiesta</legend>
        <p className="text-sm text-gris">Principal se sirve el triple que ocasional. Deja &quot;No se sirve&quot; en los demás.</p>
        {recetas.map((r) => (
          <label key={r.id} className="flex items-center justify-between gap-3 border-b border-linea pb-3 last:border-b-0">
            <span className="min-w-0">
              <span className="font-medium">{r.nombre}</span>
              {!r.activo && <span className="ml-2 text-xs text-gris">Inactivo</span>}
              <span className="block text-xs text-gris">{CATEGORIAS[r.categoria] ?? r.categoria}</span>
            </span>
            <select name={`nivel_${r.id}`} defaultValue={tipo?.barra[r.id] ?? ""} className={`${campo} h-10 w-40`}>
              <option value="">No se sirve</option>
              {NIVELES.map((n) => (
                <option key={n.valor} value={n.valor}>
                  {n.texto}
                </option>
              ))}
            </select>
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
