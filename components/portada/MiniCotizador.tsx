"use client";

// Mini-cotizador de la portada: mueves invitados y horas y ves al instante los tragos, cuántos toman
// y el hielo. Usa la misma fórmula del cotizador (lib/cotizador.ts) con los supuestos guardados.
// Solo calcula cantidades, nunca precios ni stock, por eso puede correr en el navegador.
import { ArrowRight, Minus, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { LineaTiempo } from "@/app/cotizador/ui";
import { calcular, entradaDesdeTipo, type Parametros, type Receta, type TipoEvento } from "@/lib/cotizador";
import { botonPrimario, sello } from "@/lib/estilos";

const entero = new Intl.NumberFormat("en-US");
const MIN = 20;
const MAX = 300;
const PASO = 10;
const HORAS = [4, 5, 6];

// Un número que hace un fundido corto cuando cambia, para que se note qué se movió
function Cifra({ valor, unidad }: { valor: number; unidad?: string }) {
  return (
    <span key={valor} className="cifra inline-block">
      {entero.format(valor)}
      {unidad && <span className="ml-1 text-sm font-normal text-gris">{unidad}</span>}
    </span>
  );
}

export function MiniCotizador({ tipo, parametros, recetas }: { tipo: TipoEvento; parametros: Parametros; recetas: Receta[] }) {
  const [invitados, setInvitados] = useState(100);
  const [horas, setHoras] = useState(HORAS.includes(tipo.horas) ? tipo.horas : 6);

  const entrada = { ...entradaDesdeTipo(tipo, parametros, invitados), horas };
  const r = calcular(entrada, parametros, recetas, []);
  const hielo = r.insumos.find((i) => i.nombre === "Hielo")?.cantidad ?? 0;
  const limitar = (n: number) => Math.min(MAX, Math.max(MIN, n));
  // Parte del valor actual: dos clics rápidos suman dos veces
  const sumar = (delta: number) => setInvitados((n) => limitar(n + delta));

  return (
    <div className="rounded-md border border-linea bg-blanco p-5 sm:p-6">
      <div className="flex items-baseline justify-between gap-3">
        <p className={sello}>Prueba el cotizador</p>
        <p className="text-xs text-gris">{tipo.nombre}</p>
      </div>

      {/* Invitados */}
      <div className="mt-5">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="mini-invitados" className="text-sm font-medium">
            Invitados
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => sumar(-PASO)}
              disabled={invitados <= MIN}
              aria-label="Menos invitados"
              className="flex size-11 items-center justify-center rounded-md border border-linea transition-colors hover:border-gris disabled:opacity-40"
            >
              <Minus className="size-4" aria-hidden="true" />
            </button>
            <output htmlFor="mini-invitados" className="w-14 text-center font-mono text-lg font-semibold tabular-nums">
              {invitados}
            </output>
            <button
              type="button"
              onClick={() => sumar(PASO)}
              disabled={invitados >= MAX}
              aria-label="Más invitados"
              className="flex size-11 items-center justify-center rounded-md border border-linea transition-colors hover:border-gris disabled:opacity-40"
            >
              <Plus className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>
        <input
          id="mini-invitados"
          type="range"
          min={MIN}
          max={MAX}
          step={PASO}
          value={invitados}
          onChange={(e) => setInvitados(limitar(Number(e.target.value)))}
          className="mt-3 h-11 w-full cursor-pointer accent-verde"
        />
      </div>

      {/* Duración */}
      <fieldset className="mt-2">
        <legend className="text-sm font-medium">Duración</legend>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {HORAS.map((h) => (
            <label
              key={h}
              className="flex h-11 cursor-pointer items-center justify-center rounded-md border border-linea font-mono text-sm transition-colors hover:border-gris has-[:checked]:border-tinta has-[:checked]:font-semibold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-verde"
            >
              <input type="radio" name="mini-horas" value={h} checked={horas === h} onChange={() => setHoras(h)} className="sr-only" />
              {h} h
            </label>
          ))}
        </div>
      </fieldset>

      {/* Resultado */}
      <div className="mt-6" aria-live="polite">
        <LineaTiempo momentos={r.momentos} compacta />
        <dl className="mt-4 grid grid-cols-3 gap-3">
          <div>
            <dt className="text-xs text-gris">Tragos</dt>
            <dd className="mt-1 font-mono text-2xl font-semibold tabular-nums">
              <Cifra valor={r.tragosTotales} />
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gris">Toman alcohol</dt>
            <dd className="mt-1 font-mono text-2xl font-semibold tabular-nums">
              <Cifra valor={r.toman} />
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gris">Hielo</dt>
            <dd className="mt-1 font-mono text-2xl font-semibold tabular-nums">
              <Cifra valor={hielo} unidad="kg" />
            </dd>
          </div>
        </dl>
      </div>

      <Link href={`/cotizador?invitados=${invitados}&horas=${horas}`} className={`${botonPrimario} mt-6 w-full`}>
        Ver cotización completa
        <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
      <p className="mt-3 text-xs text-gris">Estimación con supuestos por validar con caterings.</p>
    </div>
  );
}
