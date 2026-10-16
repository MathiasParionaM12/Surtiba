"use client";

// "Para quién es" en pestañas. Cada una trae un escenario de ejemplo con números del cotizador.
// Accesible con teclado: flechas izquierda/derecha, Inicio y Fin cambian de pestaña.
import { useId, useRef, useState } from "react";
import { sello } from "@/lib/estilos";

export type Perfil = {
  titulo: string;
  texto: string;
  escenario: string;
  datos: [string, string][];
};

export function ParaQuien({ perfiles }: { perfiles: Perfil[] }) {
  const [activo, setActivo] = useState(0);
  const botones = useRef<(HTMLButtonElement | null)[]>([]);
  const base = useId();

  const ir = (i: number) => {
    const n = (i + perfiles.length) % perfiles.length;
    setActivo(n);
    botones.current[n]?.focus();
  };
  const alPresionar = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") ir(activo + 1);
    else if (e.key === "ArrowLeft") ir(activo - 1);
    else if (e.key === "Home") ir(0);
    else if (e.key === "End") ir(perfiles.length - 1);
    else return;
    e.preventDefault();
  };
  const p = perfiles[activo];

  return (
    <div className="mt-8">
      <div
        role="tablist"
        aria-label="Para quién es Surtiba"
        onKeyDown={alPresionar}
        className="flex gap-1 overflow-x-auto border-b border-linea [scrollbar-width:none]"
      >
        {perfiles.map((q, i) => (
          <button
            key={q.titulo}
            ref={(el) => {
              botones.current[i] = el;
            }}
            id={`${base}-pestana-${i}`}
            role="tab"
            type="button"
            aria-selected={i === activo}
            aria-controls={`${base}-panel`}
            tabIndex={i === activo ? 0 : -1}
            onClick={() => setActivo(i)}
            className={`-mb-px h-11 shrink-0 border-b-2 px-4 text-sm whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-verde ${
              i === activo ? "border-tinta font-medium text-tinta" : "border-transparent text-gris hover:text-tinta"
            }`}
          >
            {q.titulo}
          </button>
        ))}
      </div>

      <div
        id={`${base}-panel`}
        role="tabpanel"
        aria-labelledby={`${base}-pestana-${activo}`}
        key={activo}
        className="cifra grid gap-6 pt-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-10"
      >
        <div>
          <h3 className="text-xl font-semibold tracking-tight">{p.titulo}</h3>
          <p className="mt-2 text-gris">{p.texto}</p>
        </div>
        <div className="rounded-md border border-linea bg-blanco p-5">
          <p className={sello}>Ejemplo</p>
          <p className="mt-2 font-medium">{p.escenario}</p>
          <dl className="mt-4 flex flex-col divide-y divide-linea">
            {p.datos.map(([etiqueta, valor]) => (
              <div key={etiqueta} className="flex items-baseline justify-between gap-4 py-2.5 text-sm">
                <dt className="text-gris">{etiqueta}</dt>
                <dd className="text-right font-mono font-medium tabular-nums">{valor}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}
