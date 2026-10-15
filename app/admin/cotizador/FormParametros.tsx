"use client";

import { startTransition, useActionState } from "react";
import { AvisoForm } from "@/components/AvisoForm";
import type { EstadoForm } from "@/lib/acciones-auth";
import { guardarParametros } from "@/lib/acciones-admin";
import type { Parametros } from "@/lib/cotizador";
import { botonPrimario, campo, sello } from "@/lib/estilos";

type Campo = { nombre: keyof Parametros; texto: string; ayuda?: string };

const GRUPOS: { titulo: string; campos: Campo[] }[] = [
  {
    titulo: "Público",
    campos: [
      { nombre: "no_toman_pct", texto: "% que no toma alcohol (sugerido)" },
      { nombre: "factor_tranquilo", texto: "Público tranquilo ×", ayuda: "Multiplica lo que se toma" },
      { nombre: "factor_normal", texto: "Público normal ×" },
      { nombre: "factor_fuerte", texto: "Público fuerte ×" },
      { nombre: "factor_dia", texto: "Si empieza de día ×", ayuda: "Antes de las 17:00" },
    ],
  },
  {
    titulo: "Momentos (por persona que toma)",
    campos: [
      { nombre: "bienvenida_tragos_hora", texto: "Bienvenida: tragos por hora" },
      { nombre: "cena_copas_hora", texto: "Cena: copas por hora" },
      { nombre: "brindis_copas", texto: "Brindis: copas" },
      { nombre: "fiesta_primera_hora", texto: "Fiesta: tragos en la 1.ª hora", ayuda: "Solo si la fiesta es lo primero" },
      { nombre: "fiesta_tragos_hora", texto: "Fiesta: tragos por hora" },
    ],
  },
  {
    titulo: "Lo que Surtiba no vende",
    campos: [
      { nombre: "hielo_kg_persona_hora", texto: "Hielo: kg por invitado por hora" },
      { nombre: "factor_calor", texto: "Hielo con calor ×", ayuda: "Aire libre o verano" },
      { nombre: "sin_alcohol_l_hora_toma", texto: "Agua y gaseosas: litros por hora", ayuda: "Por persona que toma" },
      { nombre: "sin_alcohol_l_hora_no_toma", texto: "Agua y gaseosas: litros por hora", ayuda: "Por persona que no toma" },
      { nombre: "margen_pct", texto: "Margen de seguridad sugerido (%)" },
    ],
  },
];

export function FormParametros({ parametros, recetas }: { parametros: Parametros; recetas: { id: string; nombre: string }[] }) {
  const [estado, accion, enviando] = useActionState<EstadoForm, FormData>(guardarParametros, {});

  return (
    <form
      // Sin limpiar el formulario: si hay un error, lo escrito se queda
      onSubmit={(e) => {
        e.preventDefault();
        const datos = new FormData(e.currentTarget);
        startTransition(() => accion(datos));
      }}
      className="flex flex-col gap-6 rounded-md border border-linea bg-blanco p-4 sm:p-5"
    >
      {GRUPOS.map((g) => (
        <fieldset key={g.titulo} className="flex flex-col gap-3">
          <legend className={`${sello} mb-3`}>{g.titulo}</legend>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {g.campos.map((c) => (
              <label key={c.nombre} className="flex flex-col gap-1">
                <span className="text-sm">{c.texto}</span>
                <input
                  name={c.nombre}
                  inputMode="decimal"
                  required
                  defaultValue={String(parametros[c.nombre] ?? "")}
                  className={`${campo} h-10 font-mono`}
                />
                {c.ayuda && <span className="text-xs text-gris">{c.ayuda}</span>}
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className={`${sello} mb-3`}>Qué trago se usa</legend>
        <label className="flex flex-col gap-1">
          <span className="text-sm">En la cena</span>
          <select name="cena_receta_id" defaultValue={parametros.cena_receta_id ?? ""} className={`${campo} h-10`}>
            <option value="">Ninguno</option>
            {recetas.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm">En el brindis</span>
          <select name="brindis_receta_id" defaultValue={parametros.brindis_receta_id ?? ""} className={`${campo} h-10`}>
            <option value="">Ninguno</option>
            {recetas.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nombre}
              </option>
            ))}
          </select>
        </label>
      </fieldset>
      <AvisoForm error={estado.error} mensaje={estado.mensaje} />
      <button type="submit" disabled={enviando} className={`${botonPrimario} self-start`}>
        {enviando ? "Guardando…" : "Guardar supuestos"}
      </button>
    </form>
  );
}
