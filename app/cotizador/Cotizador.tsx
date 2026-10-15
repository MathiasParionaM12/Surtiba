"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { AvisoForm } from "@/components/AvisoForm";
import { BotonPdf } from "@/components/BotonPdf";
import { cotizar, guardarCotizacion, pasarAlCarrito } from "@/lib/acciones-cotizador";
import {
  entradaDesdeTipo,
  LIMITES,
  type EntradaCotizador,
  type Parametros,
  type Receta,
  type ResultadoCotizacion,
  type TipoEvento,
} from "@/lib/cotizador";
import { botonPrimario, botonSecundario, sello } from "@/lib/estilos";
import { soles } from "@/lib/formato";
import type { Rol } from "@/lib/roles";
import { PasoBarra } from "./PasoBarra";
import { PasoEvento } from "./PasoEvento";
import { PasoMomentos } from "./PasoMomentos";
import { Resultado } from "./Resultado";

const PASOS = ["Tu evento", "Momentos", "Barra", "Resultado"];
const entero = new Intl.NumberFormat("en-US");

export function Cotizador({
  tipos,
  recetas,
  parametros,
  entradaInicial,
  resultadoInicial,
  rol,
  abierta,
}: {
  tipos: TipoEvento[];
  recetas: Receta[];
  parametros: Parametros;
  entradaInicial: EntradaCotizador;
  resultadoInicial: ResultadoCotizacion;
  rol: Rol;
  abierta?: string; // código de la cotización que se volvió a abrir
}) {
  const [paso, setPaso] = useState(abierta ? 3 : 0);
  const [entrada, setEntrada] = useState(entradaInicial);
  const [resultado, setResultado] = useState(resultadoInicial);
  const [error, setError] = useState<string>();
  const [calculando, iniciar] = useTransition();
  const [pasando, pasar] = useTransition();
  const ultimo = useRef(0);
  const primeraVez = useRef(true);
  const noTomanTocado = useRef(false);
  const arriba = useRef<HTMLDivElement>(null);

  // Cada cambio se recalcula en el servidor (con una pausa corta para no llamar en cada tecla)
  useEffect(() => {
    if (primeraVez.current) {
      primeraVez.current = false;
      return;
    }
    const numero = ++ultimo.current;
    const espera = setTimeout(() => {
      iniciar(async () => {
        const r = await cotizar(entrada);
        if (numero !== ultimo.current) return; // llegó tarde: ya hay un cálculo más nuevo
        setError(r.error);
        if (r.resultado) setResultado(r.resultado);
      });
    }, 350);
    return () => clearTimeout(espera);
  }, [entrada]);

  const actualizar = (cambio: Partial<EntradaCotizador>) => {
    if ("noToman" in cambio) noTomanTocado.current = true;
    setEntrada((e) => ({ ...e, ...cambio }));
  };
  const sugeridoNoToman = Math.round((entrada.invitados * parametros.no_toman_pct) / 100);
  const cambiarInvitados = (valor: string) => {
    const invitados = Math.min(LIMITES.invitadosMax, Math.max(0, Math.trunc(Number(valor)) || 0));
    setEntrada((e) => ({
      ...e,
      invitados,
      // Si la persona no tocó "no toman", se mantiene el sugerido
      noToman: noTomanTocado.current ? Math.min(e.noToman, invitados) : Math.round((invitados * parametros.no_toman_pct) / 100),
    }));
  };
  const cambiarTipo = (id: string) => {
    const tipo = tipos.find((t) => t.id === id);
    if (tipo) setEntrada((e) => ({ ...entradaDesdeTipo(tipo, parametros, e.invitados, e), noToman: e.noToman }));
  };
  const irA = (n: number) => {
    setPaso(n);
    arriba.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const tipo = tipos.find((t) => t.id === entrada.tipoEventoId)?.nombre ?? "";
  const cajas = resultado.productos.reduce((s, p) => s + p.cajas, 0);
  const esComprador = rol === "comprador";

  return (
    <div ref={arriba} className="scroll-mt-24 pb-24 lg:pb-0">
      {abierta && (
        <p role="status" className="mb-6 border-l-2 border-verde pl-3 text-sm">
          Abriste la cotización <span className="font-mono">{abierta}</span>. Si cambias algo y la guardas, se crea una nueva.
        </p>
      )}

      {/* Pasos */}
      <ol className="grid grid-cols-4 gap-2" aria-label="Pasos del cotizador">
        {PASOS.map((p, i) => (
          <li key={p}>
            <button
              type="button"
              onClick={() => irA(i)}
              aria-current={i === paso ? "step" : undefined}
              className="flex w-full flex-col gap-2 text-left"
            >
              <span className={`h-1.5 rounded-full transition-colors ${i <= paso ? "bg-verde" : "bg-linea"}`} />
              <span className={`text-xs sm:text-sm ${i === paso ? "font-medium" : "text-gris"}`}>
                <span className="font-mono">{i + 1}.</span> {p}
              </span>
            </button>
          </li>
        ))}
      </ol>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          {paso === 0 && (
            <PasoEvento
              entrada={entrada}
              actualizar={actualizar}
              tipos={tipos}
              cambiarTipo={cambiarTipo}
              cambiarInvitados={cambiarInvitados}
              sugeridoNoToman={sugeridoNoToman}
            />
          )}
          {paso === 1 && (
            <PasoMomentos entrada={entrada} actualizar={actualizar} recetas={recetas} momentos={resultado.momentos} parametros={parametros} />
          )}
          {paso === 2 && <PasoBarra entrada={entrada} actualizar={actualizar} recetas={recetas} />}
          {paso === 3 && <Resultado entrada={entrada} actualizar={actualizar} resultado={resultado} tipo={tipo} />}

          <div className="mt-6">
            <AvisoForm error={error} />
          </div>

          {/* Anterior / siguiente y, al final, las acciones */}
          <div className="mt-8 flex flex-col gap-3 border-t border-linea pt-6">
            {paso === 3 && esComprador && resultado.productos.length > 0 && (
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  disabled={pasando || calculando}
                  onClick={() =>
                    pasar(async () => {
                      const r = await pasarAlCarrito(entrada);
                      if (r?.error) setError(r.error); // si sale bien, el servidor te lleva al carrito
                    })
                  }
                  className={`${botonPrimario} w-full`}
                >
                  {pasando ? "Pasando al carrito…" : "Pasar todo al carrito"}
                </button>
                <BotonPdf preparar={() => guardarCotizacion(entrada)} texto="Guardar y descargar PDF" />
              </div>
            )}
            {paso === 3 && esComprador && (
              <p className="text-xs text-gris">
                Al pasarlo al carrito, las cajas de estos productos reemplazan las que ya tenías. Tus cotizaciones guardadas están en{" "}
                <Link href="/cotizaciones" className="font-medium text-verde hover:text-tinta">
                  Mis cotizaciones
                </Link>
                .
              </p>
            )}
            {paso === 3 && rol === "admin" && (
              <p className="text-xs text-gris">Solo los compradores pueden pasarlo al carrito y guardar la cotización.</p>
            )}
            <div className="flex justify-between gap-3">
              {paso > 0 ? (
                <button type="button" onClick={() => irA(paso - 1)} className={botonSecundario}>
                  Anterior
                </button>
              ) : (
                <span />
              )}
              {paso < 3 && (
                <button type="button" onClick={() => irA(paso + 1)} className={botonPrimario}>
                  {paso === 2 ? "Ver resultado" : "Siguiente"}
                </button>
              )}
            </div>
            <p className="text-xs text-gris">
              Estimación referencial con supuestos por validar con caterings. Ajusta las cantidades antes de pedir.
            </p>
          </div>
        </div>

        {/* Resumen en vivo (computadora) */}
        <aside className="hidden h-fit flex-col gap-4 rounded-md border border-linea bg-blanco p-5 lg:sticky lg:top-24 lg:flex" aria-live="polite">
          <div className="flex items-baseline justify-between">
            <h2 className={sello}>Resumen</h2>
            <span className="text-xs text-gris">{calculando ? "Calculando…" : ""}</span>
          </div>
          <dl className={`flex flex-col gap-3 text-sm transition-opacity ${calculando ? "opacity-60" : ""}`}>
            <div className="flex justify-between">
              <dt className="text-gris">Toman alcohol</dt>
              <dd className="font-mono">
                {entero.format(resultado.toman)} de {entero.format(entrada.invitados)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gris">Tragos con alcohol</dt>
              <dd className="font-mono">{entero.format(resultado.tragosTotales)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gris">Cajas</dt>
              <dd className="font-mono">{cajas}</dd>
            </div>
            <div className="flex justify-between border-t border-linea pt-3 text-base">
              <dt className="font-medium">Total estimado</dt>
              <dd className="font-mono font-semibold">{soles(resultado.total)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gris">Por invitado</dt>
              <dd className="font-mono">{soles(resultado.porInvitado)}</dd>
            </div>
          </dl>
          {resultado.minimos.length > 0 && (
            <p className="border-l-2 border-tinta pl-3 text-xs">
              {resultado.minimos.length === 1 ? "Una marca no llega" : `${resultado.minimos.length} marcas no llegan`} a su pedido mínimo.
              Lo ves en el resultado.
            </p>
          )}
          {paso < 3 && (
            <button type="button" onClick={() => irA(3)} className={`${botonSecundario} w-full`}>
              Ver resultado
            </button>
          )}
        </aside>
      </div>

      {/* Resumen en vivo (celular): barra fija abajo */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-linea bg-blanco/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div className={`text-sm transition-opacity ${calculando ? "opacity-60" : ""}`}>
            <p className="font-mono font-semibold">{soles(resultado.total)}</p>
            <p className="text-xs text-gris">
              {entero.format(resultado.tragosTotales)} tragos · {cajas} cajas
            </p>
          </div>
          {paso < 3 ? (
            <button type="button" onClick={() => irA(paso + 1)} className={`${botonPrimario} h-10`}>
              {paso === 2 ? "Ver resultado" : "Siguiente"}
            </button>
          ) : (
            <span className="text-xs text-gris">{soles(resultado.porInvitado)} por invitado</span>
          )}
        </div>
      </div>
    </div>
  );
}
