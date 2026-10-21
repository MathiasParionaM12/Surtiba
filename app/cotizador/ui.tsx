"use client";

// Controles pequeños del cotizador (botones de opción, interruptor y línea de tiempo)

import { useLayoutEffect, useRef, useState } from "react";
import type { Momento } from "@/lib/cotizador";

// Varias opciones en una fila: se elige una. Un fondo blanco se desliza hasta la opción elegida
// (mide la posición del botón, así sirve aunque las opciones tengan anchos distintos).
export function Segmentado<T extends string | number>({
  opciones,
  valor,
  onCambio,
  etiqueta,
  ancho = false,
}: {
  opciones: { valor: T; texto: string }[];
  valor: T;
  onCambio: (v: T) => void;
  etiqueta: string;
  ancho?: boolean; // en celular ocupa todo el ancho (botones iguales)
}) {
  const caja = useRef<HTMLDivElement>(null);
  const [fondo, setFondo] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const indice = opciones.findIndex((o) => o.valor === valor);

  useLayoutEffect(() => {
    const el = caja.current;
    if (!el) return;
    const medir = () => {
      const b = el.querySelectorAll<HTMLButtonElement>("button")[indice];
      setFondo(b ? { x: b.offsetLeft, y: b.offsetTop, w: b.offsetWidth, h: b.offsetHeight } : null);
    };
    medir();
    const observador = new ResizeObserver(medir); // si cambia el ancho (celular, ventana)
    observador.observe(el);
    return () => observador.disconnect();
  }, [indice, opciones.length]);

  return (
    <div
      ref={caja}
      role="radiogroup"
      aria-label={etiqueta}
      className={`relative rounded-md border border-linea bg-papel p-0.5 ${ancho ? "flex w-full sm:inline-flex sm:w-auto" : "inline-flex flex-wrap"}`}
    >
      {fondo && (
        <span
          aria-hidden="true"
          className="absolute rounded-[5px] bg-blanco shadow-sm transition-[left,top,width,height] duration-200 ease-out"
          style={{ left: fondo.x, top: fondo.y, width: fondo.w, height: fondo.h }}
        />
      )}
      {opciones.map((o) => {
        const activo = o.valor === valor;
        return (
          <button
            key={String(o.valor)}
            type="button"
            role="radio"
            aria-checked={activo}
            onClick={() => onCambio(o.valor)}
            className={`relative h-11 rounded-[5px] px-3 text-sm whitespace-nowrap transition-colors duration-200 sm:h-8 ${ancho ? "flex-1 sm:flex-none" : ""} ${
              activo ? `font-medium text-tinta ${fondo ? "" : "bg-blanco shadow-sm"}` : "text-gris hover:text-tinta"
            }`}
          >
            {o.texto}
          </button>
        );
      })}
    </div>
  );
}

// Sí / no (para activar un momento del evento)
export function Interruptor({ activo, onCambio, etiqueta }: { activo: boolean; onCambio: (v: boolean) => void; etiqueta: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      aria-label={etiqueta}
      onClick={() => onCambio(!activo)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors before:absolute before:-inset-2.5 ${activo ? "bg-verde" : "bg-linea"}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-blanco shadow-sm transition-transform ${activo ? "translate-x-5" : ""}`}
      />
    </button>
  );
}

const COLOR: Record<Momento["clave"], string> = {
  bienvenida: "bg-verde/45",
  cena: "bg-verde/75",
  brindis: "bg-gris",
  fiesta: "bg-tinta",
};

// Barra horizontal con los momentos del evento, del ancho de sus horas
export function LineaTiempo({ momentos, compacta = false }: { momentos: Momento[]; compacta?: boolean }) {
  const conHoras = momentos.filter((m) => m.horas > 0);
  const total = conHoras.reduce((s, m) => s + m.horas, 0);
  if (total === 0) return null;
  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full bg-linea" aria-hidden="true">
        {momentos.map((m) =>
          m.horas > 0 ? (
            <div key={m.clave} className={`${COLOR[m.clave]} h-full`} style={{ width: `${(m.horas / total) * 100}%` }} />
          ) : (
            <div key={m.clave} className={`${COLOR[m.clave]} h-full w-1.5 shrink-0`} />
          ),
        )}
      </div>
      {!compacta && (
        <ol className="mt-3 grid gap-x-4 gap-y-2 text-xs sm:grid-cols-2">
          {momentos.map((m) => (
            <li key={m.clave} className="flex items-center gap-2">
              <span className={`size-2.5 shrink-0 rounded-sm ${COLOR[m.clave]}`} aria-hidden="true" />
              <span className="font-mono text-gris">
                {m.desde}
                {m.hasta && `–${m.hasta}`}
              </span>
              <span>{m.nombre}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
