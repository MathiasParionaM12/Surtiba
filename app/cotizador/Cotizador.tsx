"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { AvisoForm } from "@/components/AvisoForm";
import { cotizar } from "@/lib/acciones-cotizador";
import { LIMITES, type AvisoMinimo, type EntradaCotizador, type Receta, type ResultadoCotizacion, type TipoEvento } from "@/lib/cotizador";
import { botonPrimario, botonSecundario, campo, sello } from "@/lib/estilos";
import { soles } from "@/lib/formato";
import type { Rol } from "@/lib/roles";

const decimal = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 2 });
const entero = new Intl.NumberFormat("en-US");

type Trago = EntradaCotizador["tragos"][number];

// Mientras escribes, muestra lo que escribes; al salir del campo, muestra lo que calculó el servidor
function CampoCajas({ valor, onCambio }: { valor: number; onCambio: (v: string) => void }) {
  const [texto, setTexto] = useState(String(valor));
  const [editando, setEditando] = useState(false);
  return (
    <input
      type="number"
      inputMode="numeric"
      min={1}
      max={LIMITES.cajasMax}
      value={editando ? texto : String(valor)}
      onFocus={() => {
        setTexto(String(valor));
        setEditando(true);
      }}
      onBlur={() => setEditando(false)}
      onChange={(e) => {
        setTexto(e.target.value);
        onCambio(e.target.value);
      }}
      className={`${campo} h-9 w-20 text-right font-mono text-sm`}
    />
  );
}

export function Cotizador({
  tipos,
  recetas,
  entradaInicial,
  resultadoInicial,
  rol,
}: {
  tipos: TipoEvento[];
  recetas: Receta[];
  entradaInicial: EntradaCotizador;
  resultadoInicial: ResultadoCotizacion;
  rol: Rol | null;
}) {
  const [tipoId, setTipoId] = useState(entradaInicial.tipoEventoId);
  const [invitados, setInvitados] = useState(String(entradaInicial.invitados));
  const [horas, setHoras] = useState(String(entradaInicial.horas));
  const [tragos, setTragos] = useState<Trago[]>(entradaInicial.tragos);
  const [cajasManual, setCajasManual] = useState<Record<string, number>>({});
  const [resultado, setResultado] = useState(resultadoInicial);
  const [error, setError] = useState<string>();
  const [calculando, iniciar] = useTransition();
  const ultimo = useRef(0);
  const primeraVez = useRef(true);

  // Cada cambio se recalcula en el servidor (con una pausa corta para no llamar en cada tecla)
  useEffect(() => {
    if (primeraVez.current) {
      primeraVez.current = false;
      return;
    }
    const numero = ++ultimo.current;
    const espera = setTimeout(() => {
      iniciar(async () => {
        const r = await cotizar({ tipoEventoId: tipoId, invitados: Number(invitados), horas: Number(horas), tragos, cajasManual });
        if (numero !== ultimo.current) return; // llegó tarde: ya hay un cálculo más nuevo
        setError(r.error);
        if (r.resultado) setResultado(r.resultado);
      });
    }, 350);
    return () => clearTimeout(espera);
  }, [tipoId, invitados, horas, tragos, cajasManual]);

  const cambiarTipo = (id: string) => {
    const tipo = tipos.find((t) => t.id === id);
    if (!tipo) return;
    setTipoId(id);
    setTragos(tipo.mezcla.map((m) => ({ recetaId: m.receta_id, porcentaje: m.porcentaje })));
    setCajasManual({});
  };
  const cambiarTrago = (i: number, cambio: Partial<Trago>) => setTragos((ts) => ts.map((t, n) => (n === i ? { ...t, ...cambio } : t)));
  const quitarTrago = (i: number) => setTragos((ts) => ts.filter((_, n) => n !== i));
  const agregarTrago = (recetaId: string) => {
    if (!recetaId) return;
    const suma = tragos.reduce((s, t) => s + t.porcentaje, 0);
    setTragos((ts) => [...ts, { recetaId, porcentaje: Math.max(0, 100 - suma) }]);
  };
  const cambiarCajas = (productoId: string, valor: string) => {
    const n = Math.trunc(Number(valor));
    setCajasManual((m) => {
      const copia = { ...m };
      if (n >= 1) copia[productoId] = Math.min(n, LIMITES.cajasMax);
      else delete copia[productoId];
      return copia;
    });
  };
  const subirAlMinimo = (a: AvisoMinimo) => {
    const actual = resultado.productos.find((p) => p.productoId === a.productoId)?.cajas ?? 0;
    setCajasManual((m) => ({ ...m, [a.productoId]: actual + a.falta }));
  };
  const cambiarProductoDe = (a: AvisoMinimo) => {
    const trago = resultado.tragos.find((t) => t.productoId === a.productoId);
    if (trago) document.getElementById(`producto-${trago.recetaId}`)?.focus();
  };

  const sinUsar = recetas.filter((r) => !tragos.some((t) => t.recetaId === r.id));
  const nombreReceta = (id: string) => recetas.find((r) => r.id === id)?.nombre ?? "";

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      {/* ── Datos del evento ── */}
      <section className="flex h-fit flex-col gap-6 rounded-md border border-linea bg-blanco p-5 sm:p-6">
        <h2 className={sello}>Tu evento</h2>
        <div className="grid grid-cols-2 gap-4">
          <label className="col-span-2 flex flex-col gap-2">
            <span className="text-sm font-medium">Tipo de evento</span>
            <select value={tipoId} onChange={(e) => cambiarTipo(e.target.value)} className={campo}>
              {tipos.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">Invitados</span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={LIMITES.invitadosMax}
              value={invitados}
              onChange={(e) => setInvitados(e.target.value)}
              className={`${campo} font-mono`}
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">Horas</span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={LIMITES.horasMax}
              value={horas}
              onChange={(e) => setHoras(e.target.value)}
              className={`${campo} font-mono`}
            />
          </label>
        </div>
        <p className="rounded-md bg-papel px-3 py-2.5 font-mono text-sm">
          {decimal.format(resultado.tragosPorPersona)} tragos por persona · {entero.format(resultado.tragosTotales)} tragos en total
        </p>

        <div className="flex flex-col gap-4 border-t border-linea pt-6">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className={sello}>Qué vas a servir</h2>
            <span className={`font-mono text-xs ${resultado.sumaPorcentajes === 100 ? "text-gris" : "font-medium text-rojo"}`}>
              Suma {resultado.sumaPorcentajes} %
            </span>
          </div>

          {tragos.length === 0 && <p className="text-sm text-gris">Agrega al menos un trago.</p>}
          {tragos.map((t, i) => {
            const linea = resultado.tragos.find((x) => x.recetaId === t.recetaId);
            const recomendado = linea?.recomendado ? linea.opciones.find((o) => o.id === linea.productoId) : undefined;
            return (
              <div key={t.recetaId} className="flex flex-col gap-2 border-b border-linea pb-4 last:border-b-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <span className="min-w-0 flex-1 font-medium">{nombreReceta(t.recetaId)}</span>
                  <div className="relative w-24 shrink-0">
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={100}
                      aria-label={`Porcentaje de ${nombreReceta(t.recetaId)}`}
                      value={t.porcentaje}
                      onChange={(e) => cambiarTrago(i, { porcentaje: Math.min(100, Math.max(0, Math.trunc(Number(e.target.value)) || 0)) })}
                      className={`${campo} h-10 pr-7 text-right font-mono`}
                    />
                    <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 font-mono text-sm text-gris">%</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => quitarTrago(i)}
                    className="text-sm text-gris hover:text-tinta"
                    aria-label={`Quitar ${nombreReceta(t.recetaId)}`}
                  >
                    Quitar
                  </button>
                </div>
                {linea && linea.opciones.length > 0 ? (
                  <>
                    <select
                      id={`producto-${t.recetaId}`}
                      aria-label={`Producto para ${nombreReceta(t.recetaId)}`}
                      value={t.productoId ?? ""}
                      onChange={(e) => cambiarTrago(i, { productoId: e.target.value || undefined })}
                      className={`${campo} h-10 text-sm`}
                    >
                      <option value="">Que Surtiba recomiende</option>
                      {linea.opciones.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.nombre} · {o.marca}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gris">
                      <span className="font-mono">{entero.format(linea.tragos)} tragos</span>
                      {recomendado && ` · Recomendado: ${recomendado.nombre} (${recomendado.marca})`}
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-gris">Por ahora no hay productos de este licor en Surtiba.</p>
                )}
              </div>
            );
          })}

          {sinUsar.length > 0 && tragos.length < LIMITES.tragosMax && (
            <select value="" onChange={(e) => agregarTrago(e.target.value)} className={`${campo} h-10 text-sm`} aria-label="Agregar un trago">
              <option value="">+ Agregar un trago</option>
              {sinUsar.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nombre}
                </option>
              ))}
            </select>
          )}
          {resultado.sumaPorcentajes !== 100 && tragos.length > 0 && (
            <p className="border-l-2 border-rojo pl-3 text-sm">
              Los porcentajes suman {resultado.sumaPorcentajes} %. Ajústalos para que sumen 100 %.
            </p>
          )}
        </div>
      </section>

      {/* ── Resultado ── */}
      <section className="flex h-fit flex-col gap-4 lg:sticky lg:top-24" aria-live="polite" aria-busy={calculando}>
        <div className="flex items-baseline justify-between gap-3">
          <h2 className={sello}>Lo que necesitas</h2>
          <span className="text-xs text-gris">{calculando ? "Calculando…" : ""}</span>
        </div>
        <AvisoForm error={error} />

        {/* Pedido mínimo: se avisa ya, sin esperar al carrito */}
        {resultado.minimos.map((a) => (
          <div key={a.marcaId} className="flex flex-col gap-3 rounded-md border border-tinta bg-blanco p-4 text-sm">
            <p>
              <strong className="font-medium">{a.marca}</strong> pide mínimo{" "}
              <span className="font-mono">{a.minimo} cajas</span>. Tu evento necesita{" "}
              <span className="font-mono">{a.cajas}</span>.
            </p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => subirAlMinimo(a)} className={`${botonSecundario} h-9 px-4`}>
                Subir a {a.minimo} cajas
              </button>
              <button type="button" onClick={() => cambiarProductoDe(a)} className={`${botonSecundario} h-9 px-4`}>
                Cambiar de producto
              </button>
            </div>
          </div>
        ))}

        <div className={`overflow-hidden rounded-md border border-linea bg-blanco transition-opacity ${calculando ? "opacity-60" : ""}`}>
          {resultado.productos.length === 0 ? (
            <p className="p-5 text-sm text-gris">Agrega tragos con su porcentaje para ver cuántas cajas necesitas.</p>
          ) : (
            <ul>
              {resultado.productos.map((p) => (
                <li key={p.productoId} className="flex flex-col gap-2 border-b border-linea px-4 py-4 last:border-b-0 sm:px-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <Link href={`/catalogo/${p.productoId}`} className="font-medium hover:text-verde">
                        {p.nombre}
                      </Link>
                      <p className="text-xs text-gris">
                        {p.marca} · para {p.para.join(" y ")}
                      </p>
                      <p className="mt-1 font-mono text-xs text-gris">
                        {entero.format(p.botellas)} botellas · {soles(p.precioCaja)} por caja
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <label className="flex items-center gap-2 text-xs text-gris">
                        Cajas
                        <CampoCajas valor={p.cajas} onCambio={(v) => cambiarCajas(p.productoId, v)} />
                      </label>
                      {p.subtotal !== null && <span className="font-mono text-sm font-medium">{soles(p.subtotal)}</span>}
                    </div>
                  </div>
                  {p.cajas !== p.cajasSugeridas && (
                    <p className="text-xs text-gris">
                      Sugeridas: <span className="font-mono">{p.cajasSugeridas}</span> ·{" "}
                      <button
                        type="button"
                        onClick={() => cambiarCajas(p.productoId, "")}
                        className="font-medium text-verde hover:text-tinta"
                      >
                        Volver a lo sugerido
                      </button>
                    </p>
                  )}
                  {p.stock !== null && p.cajas > p.stock && (
                    <p className="text-xs">
                      {p.stock === 0
                        ? "Sin stock ahora: iría por encargo (la marca lo confirma)."
                        : `Hay ${p.stock} en stock: ${p.cajas - p.stock} irían por encargo (la marca lo confirma).`}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
          {resultado.total !== null && resultado.productos.length > 0 && (
            <div className="flex items-baseline justify-between border-t border-linea bg-papel px-4 py-3 sm:px-5">
              <span className="font-medium">Total estimado</span>
              <span className="font-mono text-lg font-semibold">{soles(resultado.total)}</span>
            </div>
          )}
        </div>

        {!resultado.conSesion && rol === null && (
          <div className="flex flex-col gap-3 rounded-md border border-linea bg-blanco p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
            <p>
              Precios por volumen al ingresar. También podrás pasarlo al carrito y descargar la cotización.
            </p>
            <div className="flex shrink-0 gap-2">
              <Link href="/ingresar" className={`${botonSecundario} h-10`}>
                Ingresar
              </Link>
              <Link href="/registro" className={`${botonPrimario} h-10`}>
                Crear cuenta
              </Link>
            </div>
          </div>
        )}

        <p className="text-xs text-gris">
          Estimación referencial. Ajusta las cantidades antes de pedir. Solo calcula el licor: no incluye hielo, gaseosas ni
          insumos.
        </p>
      </section>
    </div>
  );
}
