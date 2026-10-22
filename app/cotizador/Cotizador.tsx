"use client";

import { ArrowRight, Check, ChevronUp, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { AvisoForm } from "@/components/AvisoForm";
import { BotonPdf } from "@/components/BotonPdf";
import { Cifra } from "@/components/Cifra";
import { cotizar, guardarCotizacion, pasarAlCarrito } from "@/lib/acciones-cotizador";
import {
  entradaDesdeTipo,
  horasDeFiesta,
  LIMITES,
  type EntradaCotizador,
  type Ingrediente,
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
  ingredientes,
  parametros,
  entradaInicial,
  resultadoInicial,
  rol,
  abierta,
}: {
  tipos: TipoEvento[];
  recetas: Receta[];
  ingredientes: Ingrediente[];
  parametros: Parametros;
  entradaInicial: EntradaCotizador;
  resultadoInicial: ResultadoCotizacion;
  rol: Rol;
  abierta?: string; // código de la cotización que se volvió a abrir
}) {
  const [paso, setPaso] = useState(abierta ? 3 : 0);
  // El paso más lejano al que llegó la persona: a los pasos de arriba solo se puede ir hasta ahí
  const [alcanzado, setAlcanzado] = useState(abierta ? 3 : 0);
  const [avisar, setAvisar] = useState(false); // mostrar qué le falta al paso actual
  const [entrada, setEntrada] = useState(entradaInicial);
  const [resultado, setResultado] = useState(resultadoInicial);
  const [error, setError] = useState<string>();
  const [resumenAbierto, setResumenAbierto] = useState(false);
  const [guardada, setGuardada] = useState<string>(); // código de la cotización recién guardada (COT-0012)
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
    setGuardada(undefined); // si cambia algo, la cotización guardada ya no es esta
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
  // Qué le falta a cada paso para poder seguir (null = está completo)
  const pendiente = (n: number): string | null => {
    if (n === 0 && entrada.invitados < 1) return "Escribe cuántos invitados tendrá tu evento.";
    if (n === 1 && horasDeFiesta(entrada) < 0) return "La bienvenida y la cena duran más que todo el evento. Ajusta las horas.";
    if (n === 2 && entrada.barra.length === 0) return "Elige al menos un trago para la barra.";
    return null;
  };
  const irA = (n: number) => {
    // No se puede saltar pasos: si uno anterior está incompleto, te lleva a ese y te dice qué falta
    const incompleto = Array.from({ length: n }, (_, i) => i).find((i) => pendiente(i) !== null);
    setAvisar(incompleto !== undefined);
    if (incompleto !== undefined) n = incompleto;
    setPaso(n);
    setAlcanzado((a) => Math.max(a, n));
    const suave = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    arriba.current?.scrollIntoView({ behavior: suave ? "smooth" : "auto", block: "start" });
  };

  const avanzar = () => (pendiente(paso) ? setAvisar(true) : irA(paso + 1));
  // El aviso se va solo apenas se completa lo que faltaba
  const avisoPaso = avisar ? pendiente(paso) : null;

  const tipo = tipos.find((t) => t.id === entrada.tipoEventoId)?.nombre ?? "";
  const cajas = resultado.productos.reduce((s, p) => s + p.cajas, 0);
  const esComprador = rol === "comprador";

  return (
    <div ref={arriba} className="scroll-mt-24">
      {abierta && (
        <p role="status" className="mb-6 border-l-2 border-verde pl-3 text-sm">
          Abriste la cotización <span className="font-mono">{abierta}</span>. Si cambias algo y la guardas, se crea una nueva.
        </p>
      )}

      {/* Pasos */}
      <ol className="grid grid-cols-4 gap-2" aria-label="Pasos del cotizador">
        {PASOS.map((p, i) => {
          // Paso actual en tinta, los ya hechos en verde, los que faltan en gris
          const estado = i === paso ? "actual" : i < paso ? "hecho" : "falta";
          // Solo se puede ir a los pasos ya visitados; los demás se abren con "Siguiente"
          const bloqueado = i > alcanzado;
          return (
            <li key={p}>
              <button
                type="button"
                onClick={() => irA(i)}
                disabled={bloqueado}
                aria-current={estado === "actual" ? "step" : undefined}
                title={bloqueado ? "Termina los pasos anteriores para llegar aquí" : undefined}
                className="flex min-h-11 w-full flex-col gap-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-verde disabled:cursor-not-allowed"
              >
                <span
                  className={`h-1.5 rounded-full transition-colors duration-300 ${
                    estado === "actual" ? "bg-tinta" : estado === "hecho" ? "bg-verde" : "bg-linea"
                  }`}
                />
                <span
                  className={`flex items-center gap-1 text-xs sm:text-sm ${
                    estado === "actual" ? "font-medium text-tinta" : estado === "hecho" ? "text-verde" : "text-gris"
                  }`}
                >
                  {estado === "hecho" ? (
                    <>
                      {/* El ✓ se estampa cuando el paso queda hecho */}
                      <span className="estampa inline-flex" style={{ "--giro": "0deg" } as React.CSSProperties}>
                        <Check className="size-3.5 shrink-0" strokeWidth={2.5} aria-hidden="true" />
                      </span>
                      <span className="sr-only">Hecho:</span>
                    </>
                  ) : (
                    <span className="font-mono">{i + 1}.</span>
                  )}
                  <span className="truncate">{p}</span>
                </span>
              </button>
            </li>
          );
        })}
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
              parametros={parametros}
            />
          )}
          {paso === 1 && (
            <PasoMomentos entrada={entrada} actualizar={actualizar} recetas={recetas} momentos={resultado.momentos} parametros={parametros} />
          )}
          {paso === 2 && <PasoBarra entrada={entrada} actualizar={actualizar} recetas={recetas} parametros={parametros} resultado={resultado} ingredientes={ingredientes} />}
          {paso === 3 && <Resultado entrada={entrada} actualizar={actualizar} resultado={resultado} tipo={tipo} puedeAgregar={rol === "comprador"} guardada={guardada} />}

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
                  <ShoppingCart className="size-4" aria-hidden="true" />
                  {pasando ? "Agregando al carrito…" : "Agregar todo al carrito"}
                </button>
                <BotonPdf preparar={() => guardarCotizacion(entrada)} texto="Descargar PDF" alGuardar={setGuardada} />
              </div>
            )}
            {paso === 3 && esComprador && (
              <p className="text-xs text-gris">
                Al agregarlo al carrito, las cajas de estos productos reemplazan las que ya tenías. Al descargar el PDF, la cotización se guarda en{" "}
                <Link href="/cotizaciones" className="font-medium enlace text-verde hover:text-tinta">
                  Mis cotizaciones
                </Link>
                .
              </p>
            )}
            {paso === 3 && rol === "admin" && (
              <p className="text-xs text-gris">Solo los compradores pueden agregarlo al carrito y guardar la cotización.</p>
            )}
            {avisoPaso && (
              <p role="alert" className="border-l-2 border-tinta pl-3 text-sm">
                {avisoPaso}
              </p>
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
                <button type="button" onClick={avanzar} className={botonPrimario}>
                  {paso === 2 ? "Ver resultado" : "Siguiente"}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </button>
              )}
            </div>
            <p className="text-xs text-gris">
              Estimación referencial: ajusta las cantidades antes de pedir.
            </p>
          </div>
        </div>

        {/* Resumen en vivo (computadora) */}
        <aside className="hidden h-fit flex-col gap-4 rounded-md border border-linea bg-blanco p-5 lg:sticky lg:top-24 lg:flex" aria-live="polite">
          <div className="flex items-baseline justify-between">
            <h2 className={sello}>Resumen</h2>
            <span className="text-xs text-gris">{calculando ? "Calculando…" : ""}</span>
          </div>
          <ResumenDatos resultado={resultado} invitados={entrada.invitados} calculando={calculando} />
          {paso < 3 && alcanzado === 3 && (
            <button type="button" onClick={() => irA(3)} className={`${botonSecundario} w-full`}>
              Volver al resultado
            </button>
          )}
        </aside>
      </div>

      {/* Resumen en vivo (celular): pegado abajo mientras estás en el cotizador (no tapa el pie).
          Al tocarlo se abre hacia arriba con el resumen completo. */}
      <div className="sticky bottom-0 z-20 -mx-4 mt-8 border-t border-linea bg-blanco/95 px-4 py-2 backdrop-blur sm:-mx-8 sm:px-8 lg:hidden">
        <div
          id="resumen-celular"
          inert={!resumenAbierto}
          aria-hidden={!resumenAbierto}
          className={`grid transition-[grid-template-rows] duration-200 ease-out ${resumenAbierto ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
        >
          <div className="overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-linea pt-2 pb-4">
              <ResumenDatos resultado={resultado} invitados={entrada.invitados} calculando={calculando} />
            </div>
          </div>
        </div>
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 pt-1">
          <button
            type="button"
            onClick={() => setResumenAbierto((a) => !a)}
            aria-expanded={resumenAbierto}
            aria-controls="resumen-celular"
            className={`flex min-h-11 min-w-0 flex-1 items-center gap-2 text-left text-sm transition-opacity ${calculando ? "opacity-60" : ""}`}
          >
            <span className="min-w-0">
              <span className="block font-mono font-semibold">
                <Cifra>{soles(resultado.total)}</Cifra>
              </span>
              <span className="block truncate text-xs text-gris">
                {entero.format(resultado.tragosTotales)} tragos · {cajas} cajas · {resumenAbierto ? "ocultar" : "ver resumen"}
              </span>
            </span>
            <ChevronUp
              className={`size-4 shrink-0 text-gris transition-transform duration-200 ${resumenAbierto ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
          </button>
          {paso < 3 ? (
            <button type="button" onClick={avanzar} className={`${botonPrimario} shrink-0`}>
              {paso === 2 ? "Ver resultado" : "Siguiente"}
              <ArrowRight className="size-4" aria-hidden="true" />
            </button>
          ) : (
            <span className="shrink-0 text-xs text-gris">{soles(resultado.porInvitado)} por invitado</span>
          )}
        </div>
      </div>
    </div>
  );
}

// Las cifras del resumen (las mismas en computadora y en celular). Cada número hace un fundido corto al cambiar.
function ResumenDatos({
  resultado,
  invitados,
  calculando,
}: {
  resultado: ResultadoCotizacion;
  invitados: number;
  calculando: boolean;
}) {
  const cajas = resultado.productos.reduce((s, p) => s + p.cajas, 0);
  return (
    <>
      <dl className={`flex flex-col gap-3 text-sm transition-opacity ${calculando ? "opacity-60" : ""}`}>
        <div className="flex justify-between gap-3">
          <dt className="text-gris">Toman alcohol</dt>
          <dd className="font-mono">
            <Cifra>{entero.format(resultado.toman)}</Cifra> de {entero.format(invitados)}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-gris">Tragos con alcohol</dt>
          <dd className="font-mono">
            <Cifra>{entero.format(resultado.tragosTotales)}</Cifra>
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-gris">Cajas</dt>
          <dd className="font-mono">
            <Cifra>{entero.format(cajas)}</Cifra>
          </dd>
        </div>
        <div className="flex justify-between gap-3 border-t border-linea pt-3 text-base">
          <dt className="font-medium">Total estimado</dt>
          <dd className="font-mono font-semibold">
            <Cifra>{soles(resultado.total)}</Cifra>
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-gris">Por invitado</dt>
          <dd className="font-mono">
            <Cifra>{soles(resultado.porInvitado)}</Cifra>
          </dd>
        </div>
      </dl>
      {resultado.minimos.length > 0 && (
        <p className="border-l-2 border-tinta pl-3 text-xs">
          {resultado.minimos.length === 1 ? "Una marca no llega" : `${resultado.minimos.length} marcas no llegan`} a su pedido mínimo.
          Lo ves en el resultado.
        </p>
      )}
    </>
  );
}
