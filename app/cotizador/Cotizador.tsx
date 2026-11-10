"use client";

import { avisarExperimento } from "@/components/AvisoExperimento";

import { ArrowRight, Check, ChevronDown, ChevronUp, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { AvisoForm } from "@/components/AvisoForm";
import { BotonPdf } from "@/components/BotonPdf";
import { createClient } from "@/lib/supabase/client";
import { Retroalimentacion } from "@/components/Retroalimentacion";
import { marcarInicio, segundosDesdeInicio } from "@/lib/medicion";
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
import { areaToque, botonPrimario, botonSecundario, sello } from "@/lib/estilos";
import { soles } from "@/lib/formato";
import type { Rol } from "@/lib/roles";
import { PasoBarra } from "./PasoBarra";
import { PasoEvento } from "./PasoEvento";
import { PasoMomentos } from "./PasoMomentos";
import { Resultado } from "./Resultado";

// 3 pasos (KISS, 6-nov-2026): los momentos del evento van dentro de "Tu evento", ya sugeridos según el tipo
const PASOS = ["Tu evento", "Barra", "Resultado"];
const RESULTADO = PASOS.length - 1;
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
  claveBorrador,
  retomar = false,
}: {
  tipos: TipoEvento[];
  recetas: Receta[];
  ingredientes: Ingrediente[];
  parametros: Parametros;
  entradaInicial: EntradaCotizador;
  resultadoInicial: ResultadoCotizacion;
  rol: Rol;
  abierta?: string; // código de la cotización que se volvió a abrir
  claveBorrador?: string; // id del usuario: el borrador se guarda en este navegador, uno por cuenta
  retomar?: boolean; // abrir el último borrador (no si vienes de una cotización guardada o de la portada)
}) {
  const [paso, setPaso] = useState(abierta ? RESULTADO : 0);
  // El paso más lejano al que llegó la persona: a los pasos de arriba solo se puede ir hasta ahí
  const [alcanzado, setAlcanzado] = useState(abierta ? RESULTADO : 0);
  const [avisar, setAvisar] = useState(false); // mostrar qué le falta al paso actual
  const [entrada, setEntrada] = useState(entradaInicial);
  const [resultado, setResultado] = useState(resultadoInicial);
  const [error, setError] = useState<string>();
  const [resumenAbierto, setResumenAbierto] = useState(false);
  const [guardada, setGuardada] = useState<{ codigo: string; id: string }>(); // la cotización recién guardada (COT-0012)
  // Los dos PDF usan la misma cotización: si ya se guardó y no cambió nada, no se crea otra
  // Medición del experimento (10-nov-2026): cuánto tarda en armar su cotización (lib/medicion.ts: desde que abre el
  // cotizador o agrega lo primero al carrito, hasta que baja el PDF aquí o en el carrito) y si la empezó
  // (evento "inicio_cotizacion", para contar las abandonadas)
  const inicioRegistrado = useRef(false);
  useEffect(() => {
    if (rol === "comprador") marcarInicio();
  }, [rol]);
  useEffect(() => {
    if (rol !== "comprador" || abierta || alcanzado < 1 || inicioRegistrado.current) return;
    inicioRegistrado.current = true;
    createClient()
      .rpc("registrar_evento", { p_tipo: "inicio_cotizacion" })
      .then(
        () => undefined,
        () => undefined,
      );
  }, [alcanzado, rol, abierta]);
  const prepararPdf = async () =>
    guardada ? guardada : guardarCotizacion(entrada, segundosDesdeInicio());
  const alGuardar = (codigo: string, id: string) => setGuardada({ codigo, id });
  const [calculando, iniciar] = useTransition();
  const [pasando, pasar] = useTransition();
  // Agrega todos los productos de la cotización; si sale bien, el servidor te lleva al carrito
  const agregarTodo = () => {
    avisarExperimento();
    pasar(async () => {
      const r = await pasarAlCarrito(entrada);
      if (r?.error) setError(r.error);
    });
  };
  // Borrador en este navegador (8-nov-2026): si vas al carrito, recargas o vuelves otro día, sigues donde estabas.
  // Es solo una comodidad: si el navegador no deja guardar, el cotizador funciona igual.
  const clave = claveBorrador ? `surtiba:cotizador:${claveBorrador}` : null;
  const [retomada, setRetomada] = useState(false);
  useEffect(() => {
    if (!clave || !retomar) return;
    try {
      const b = JSON.parse(localStorage.getItem(clave) ?? "null");
      // Solo si sigue siendo válido: el tipo de evento existe todavía (p. ej. Quinceañero ya no) y tiene barra
      const valido = b?.entrada && tipos.some((t) => t.id === b.entrada.tipoEventoId) && Array.isArray(b.entrada.barra);
      if (valido && Date.now() - Number(b.t) < 7 * 86400000) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- el borrador solo existe en el navegador: se lee después de montar
        setEntrada(b.entrada);
        setPaso(Math.min(Number(b.paso) || 0, RESULTADO));
        setAlcanzado(Math.min(Number(b.alcanzado) || 0, RESULTADO));
        setRetomada(true);
      }
    } catch {}
    // Solo al abrir el cotizador
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!clave) return;
    try {
      localStorage.setItem(clave, JSON.stringify({ entrada, paso, alcanzado, t: Date.now() }));
    } catch {}
  }, [clave, entrada, paso, alcanzado]);
  const empezarDeNuevo = () => {
    noTomanTocado.current = false;
    setEntrada(entradaInicial);
    setPaso(0);
    setAlcanzado(0);
    setRetomada(false);
  };

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
  // El 20 % sugerido es sobre los adultos: los menores se cuentan aparte (no toman ni brindan)
  const adultosDe = (e: EntradaCotizador) => Math.max(0, e.invitados - (e.menores ?? 0));
  const sugeridoNoToman = Math.round((adultosDe(entrada) * parametros.no_toman_pct) / 100);
  const cambiarInvitados = (valor: string) => {
    const invitados = Math.min(LIMITES.invitadosMax, Math.max(0, Math.trunc(Number(valor)) || 0));
    setEntrada((e) => ({
      ...e,
      invitados,
      // Si la persona no tocó "no toman", se mantiene el sugerido
      menores: Math.min(e.menores ?? 0, invitados),
      noToman: noTomanTocado.current
        ? Math.min(e.noToman, adultosDe({ ...e, invitados }))
        : Math.round((adultosDe({ ...e, invitados }) * parametros.no_toman_pct) / 100),
    }));
  };
  const cambiarMenores = (valor: string) => {
    setEntrada((e) => {
      const menores = Math.min(e.invitados, Math.max(0, Math.trunc(Number(valor)) || 0));
      const adultos = e.invitados - menores;
      return {
        ...e,
        menores,
        noToman: noTomanTocado.current ? Math.min(e.noToman, adultos) : Math.round((adultos * parametros.no_toman_pct) / 100),
      };
    });
  };
  const cambiarTipo = (id: string) => {
    const tipo = tipos.find((t) => t.id === id);
    if (tipo) setEntrada((e) => ({ ...entradaDesdeTipo(tipo, parametros, e.invitados, e), noToman: e.noToman }));
  };
  // Qué le falta a cada paso para poder seguir (null = está completo)
  const pendiente = (n: number): string | null => {
    if (n === 0 && entrada.invitados < 1) return "Escribe cuántos invitados tendrá tu evento.";
    if (n === 0 && horasDeFiesta(entrada) < 0) return "La bienvenida y la cena duran más que todo el evento. Ajusta las horas en «Momentos del evento».";
    if (n === 1 && entrada.barra.length === 0) return "Elige al menos un trago para la barra.";
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
      {retomada && (
        <p role="status" className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-1 border-l-2 border-verde pl-3 text-sm">
          Seguimos con tu última cotización.
          <button type="button" onClick={empezarDeNuevo} className={`${areaToque} font-medium enlace text-verde hover:text-tinta`}>
            Empezar de nuevo
          </button>
        </p>
      )}
      {abierta && (
        <p role="status" className="mb-6 border-l-2 border-verde pl-3 text-sm">
          Abriste la cotización <span className="font-mono">{abierta}</span>. Si cambias algo y la guardas, se crea una nueva.
        </p>
      )}

      {/* Pasos */}
      <ol className="grid grid-cols-3 gap-2" aria-label="Pasos del cotizador">
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
            <>
              <PasoEvento
              entrada={entrada}
              actualizar={actualizar}
              tipos={tipos}
              cambiarTipo={cambiarTipo}
              cambiarInvitados={cambiarInvitados}
              cambiarMenores={cambiarMenores}
              sugeridoNoToman={sugeridoNoToman}
              parametros={parametros}
              />
              {/* Momentos: ya vienen sugeridos según el tipo de evento; se abren solo si quieres ajustarlos */}
              <details open={horasDeFiesta(entrada) < 0} className="group mt-8 rounded-md border border-linea bg-blanco">
                <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-3 px-4 py-3">
                  <span>
                    <span className="font-medium">Momentos del evento</span>
                    <span className="block text-xs text-gris">
                      {resultado.momentos.map((m) => m.nombre).join(" · ")}. Los sugerimos según el tipo: ábrelo si quieres cambiarlos.
                    </span>
                  </span>
                  <ChevronDown className="size-4 shrink-0 text-gris transition-transform group-open:rotate-180" aria-hidden="true" />
                </summary>
                <div className="border-t border-linea p-4">
                  <PasoMomentos entrada={entrada} actualizar={actualizar} recetas={recetas} momentos={resultado.momentos} parametros={parametros} />
                </div>
              </details>
            </>
          )}
          {paso === 1 && <PasoBarra entrada={entrada} actualizar={actualizar} recetas={recetas} parametros={parametros} resultado={resultado} ingredientes={ingredientes} />}
          {paso === RESULTADO && (
            <Resultado
              entrada={entrada}
              actualizar={actualizar}
              resultado={resultado}
              tipo={tipo}
              puedeAgregar={rol === "comprador"}
              guardada={guardada?.codigo}
              alAgregarTodo={agregarTodo}
              agregando={pasando || calculando}
            />
          )}

          <div className="mt-6">
            <AvisoForm error={error} />
          </div>

          {/* Anterior / siguiente y, al final, las acciones */}
          <div className="mt-8 flex flex-col gap-3 border-t border-linea pt-6">
            {paso === RESULTADO && esComprador && resultado.productos.length > 0 && (
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  disabled={pasando || calculando}
                  onClick={agregarTodo}
                  className={`${botonPrimario} w-full sm:col-span-2`}
                >
                  <ShoppingCart className="size-4" aria-hidden="true" />
                  {pasando ? "Agregando al carrito…" : "Agregar todo al carrito"}
                </button>
                <BotonPdf preparar={prepararPdf} texto="PDF con tu pedido" alGuardar={alGuardar} />
                <BotonPdf preparar={prepararPdf} texto="PDF para tu cliente" alGuardar={alGuardar} sufijo="?para=cliente" />
              </div>
            )}
            {/* Al terminar (ya guardó su cotización): qué mejorar y qué falló */}
            {paso === RESULTADO && esComprador && guardada && <Retroalimentacion cotizacionId={guardada.id} />}
            {paso === RESULTADO && esComprador && (
              <p className="text-xs text-gris">
                Al agregarlo al carrito, las cajas de estos productos reemplazan las que ya tenías. El «PDF para tu cliente» sale con el nombre de tu empresa y tu precio por invitado, sin tus costos. Al descargar un PDF, la cotización se guarda en{" "}
                <Link href="/cotizaciones" className="font-medium enlace text-verde hover:text-tinta">
                  Mis cotizaciones
                </Link>
                .
              </p>
            )}
            {paso === RESULTADO && rol === "admin" && (
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
              {paso < RESULTADO && (
                <button type="button" onClick={avanzar} className={botonPrimario}>
                  {paso === RESULTADO - 1 ? "Ver resultado" : "Siguiente"}
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
          {paso < RESULTADO && alcanzado === RESULTADO && (
            <button type="button" onClick={() => irA(RESULTADO)} className={`${botonSecundario} w-full`}>
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
          {paso < RESULTADO ? (
            <button type="button" onClick={avanzar} className={`${botonPrimario} shrink-0`}>
              {paso === RESULTADO - 1 ? "Ver resultado" : "Siguiente"}
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
      {resultado.faltaMinimo > 0 && (
        <p className="border-l-2 border-rojo pl-3 text-xs">El pedido mínimo es de 3 cajas en total. Lo ves en el resultado.</p>
      )}
    </>
  );
}
