"use client";

import Link from "next/link";
import { useState } from "react";
import { LIMITES, type AvisoMinimo, type EntradaCotizador, type ResultadoCotizacion } from "@/lib/cotizador";
import { areaToque, campo, sello } from "@/lib/estilos";
import { soles } from "@/lib/formato";
import { LineaTiempo } from "./ui";

const entero = new Intl.NumberFormat("en-US");
const decimal = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 1 });

// Mientras escribes, muestra lo que escribes; al salir del campo, lo que calculó el servidor
function CampoCajas({ valor, onCambio, etiqueta }: { valor: number; onCambio: (v: string) => void; etiqueta: string }) {
  const [texto, setTexto] = useState(String(valor));
  const [editando, setEditando] = useState(false);
  return (
    <input
      type="number"
      inputMode="numeric"
      min={1}
      max={LIMITES.cajasMax}
      aria-label={etiqueta}
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
      className={`${campo} w-20 text-right font-mono text-sm sm:h-9`}
    />
  );
}

export function Resultado({
  entrada,
  actualizar,
  resultado: r,
  tipo,
}: {
  entrada: EntradaCotizador;
  actualizar: (cambio: Partial<EntradaCotizador>) => void;
  resultado: ResultadoCotizacion;
  tipo: string;
}) {
  const marcas = new Set(r.productos.map((p) => p.marcaId)).size;
  const cajas = r.productos.reduce((s, p) => s + p.cajas, 0);
  const fin = r.momentos.at(-1)?.hasta ?? r.momentos.at(-1)?.desde;

  const cambiarProducto = (recetaId: string, productoId: string) => {
    const productos = { ...entrada.productos };
    if (productoId) productos[recetaId] = productoId;
    else delete productos[recetaId];
    actualizar({ productos });
  };
  const cambiarCajas = (productoId: string, valor: string) => {
    const n = Math.trunc(Number(valor));
    const cajasManual = { ...entrada.cajasManual };
    if (n >= 1) cajasManual[productoId] = Math.min(n, LIMITES.cajasMax);
    else delete cajasManual[productoId];
    actualizar({ cajasManual });
  };
  const subirAlMinimo = (a: AvisoMinimo) => {
    const actual = r.productos.find((p) => p.productoId === a.productoId)?.cajas ?? 0;
    actualizar({ cajasManual: { ...entrada.cajasManual, [a.productoId]: actual + a.falta } });
  };
  const cambiarProductoDe = (a: AvisoMinimo) => {
    const trago = r.tragos.find((t) => t.productoId === a.productoId);
    if (trago) document.getElementById(`producto-${trago.recetaId}`)?.focus();
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Encabezado del evento */}
      <div>
        <h2 className="text-xl font-semibold tracking-tight">{entrada.nombre || tipo}</h2>
        <p className="mt-1 text-sm text-gris">
          {entrada.nombre && `${tipo} · `}
          {entero.format(entrada.invitados)} invitados ({entero.format(r.toman)} toman alcohol) ·{" "}
          <span className="font-mono">
            {entrada.horaInicio}–{fin}
          </span>{" "}
          · {entrada.aireLibre ? "aire libre o verano" : "interior"}
        </p>
      </div>

      {r.avisos.map((a) => (
        <p key={a} role="alert" className="border-l-2 border-rojo pl-3 text-sm">
          {a}
        </p>
      ))}

      {/* Números principales */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-md border border-linea bg-blanco p-4">
          <p className={sello}>Tragos con alcohol</p>
          <p className="mt-2 font-mono text-2xl font-semibold">{entero.format(r.tragosTotales)}</p>
          <p className="mt-1 text-xs text-gris">{decimal.format(r.tragosPorPersona)} por persona que toma</p>
        </div>
        <div className="rounded-md border border-linea bg-blanco p-4">
          <p className={sello}>Total estimado</p>
          <p className="mt-2 font-mono text-2xl font-semibold">{soles(r.total)}</p>
          <p className="mt-1 text-xs text-gris">{soles(r.porInvitado)} por invitado</p>
        </div>
        <div className="rounded-md border border-linea bg-blanco p-4">
          <p className={sello}>Cajas</p>
          <p className="mt-2 font-mono text-2xl font-semibold">{cajas}</p>
          <p className="mt-1 text-xs text-gris">
            de {marcas} {marcas === 1 ? "marca" : "marcas"} · incluye +{entrada.margen} % de margen
          </p>
        </div>
      </div>

      {/* Momentos */}
      <section>
        <h3 className={sello}>Cómo se reparte el evento</h3>
        <div className="mt-3 rounded-md border border-linea bg-blanco p-4">
          <LineaTiempo momentos={r.momentos} compacta />
          <ul className="mt-4 flex flex-col divide-y divide-linea">
            {r.momentos.map((m) => (
              <li key={m.clave} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2.5 text-sm">
                <span>
                  <span className="mr-2 font-mono text-xs text-gris">
                    {m.desde}
                    {m.hasta && `–${m.hasta}`}
                  </span>
                  <span className="font-medium">{m.nombre}</span>
                  {m.detalle.length > 0 && (
                    <span className="block text-xs text-gris sm:ml-[5.5rem]">
                      {m.detalle.map((d) => `${d.receta} ${entero.format(d.tragos)}`).join(" · ")}
                    </span>
                  )}
                </span>
                <span className="font-mono">{entero.format(m.tragos)} tragos</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Pedido mínimo: se avisa ya, sin esperar al carrito */}
      {r.minimos.map((a) => (
        <div key={a.marcaId} className="flex flex-col gap-3 rounded-md border border-tinta bg-blanco p-4 text-sm">
          <p>
            <strong className="font-medium">{a.marca}</strong> pide mínimo <span className="font-mono">{a.minimo} cajas</span>. Tu
            evento necesita <span className="font-mono">{a.cajas}</span>.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => subirAlMinimo(a)}
              className="h-11 rounded-md border border-linea bg-blanco px-4 text-sm font-medium hover:border-gris sm:h-9"
            >
              Subir a {a.minimo} cajas
            </button>
            <button
              type="button"
              onClick={() => cambiarProductoDe(a)}
              className="h-11 rounded-md border border-linea bg-blanco px-4 text-sm font-medium hover:border-gris sm:h-9"
            >
              Cambiar de producto
            </button>
          </div>
        </div>
      ))}

      {/* Qué producto cubre cada trago */}
      <section>
        <h3 className={sello}>Tragos y productos de Surtiba</h3>
        <ul className="mt-3 flex flex-col divide-y divide-linea rounded-md border border-linea bg-blanco">
          {r.tragos.map((t) => {
            const recomendado = t.recomendado ? t.opciones.find((o) => o.id === t.productoId) : undefined;
            return (
              <li key={t.recetaId} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="min-w-0">
                  <span className="font-medium">{t.receta}</span>{" "}
                  <span className="font-mono text-sm text-gris">{entero.format(t.tragos)} tragos</span>
                  {recomendado && <span className="block text-xs text-gris">Recomendado: {recomendado.nombre}</span>}
                </span>
                {t.opciones.length > 0 ? (
                  <select
                    id={`producto-${t.recetaId}`}
                    aria-label={`Producto para ${t.receta}`}
                    value={entrada.productos[t.recetaId] ?? ""}
                    onChange={(e) => cambiarProducto(t.recetaId, e.target.value)}
                    className={`${campo} text-sm sm:h-9 sm:w-72`}
                  >
                    <option value="">Que Surtiba recomiende</option>
                    {t.opciones.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.nombre} · {o.marca}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-xs text-gris">Surtiba aún no tiene este licor</span>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {/* Lo que se pide a Surtiba */}
      <section>
        <h3 className={sello}>Lo que pedirías a Surtiba</h3>
        <div className="mt-3 overflow-hidden rounded-md border border-linea bg-blanco">
          {r.productos.length === 0 ? (
            <p className="p-4 text-sm text-gris">Aún no hay productos para este evento.</p>
          ) : (
            <ul className="divide-y divide-linea">
              {r.productos.map((p) => (
                <li key={p.productoId} className="flex flex-col gap-2 px-4 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <Link href={`/catalogo/${p.productoId}`} className="font-medium hover:text-verde">
                        {p.nombre}
                      </Link>
                      <p className="text-xs text-gris">
                        {p.marca} · para {p.para.join(" y ").toLowerCase()}
                      </p>
                      <p className="mt-1 font-mono text-xs text-gris">
                        {entero.format(p.botellas)} botellas · {soles(p.precioCaja)} por caja
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <label className="flex items-center gap-2 text-xs text-gris">
                        Cajas
                        <CampoCajas valor={p.cajas} etiqueta={`Cajas de ${p.nombre}`} onCambio={(v) => cambiarCajas(p.productoId, v)} />
                      </label>
                      <span className="font-mono text-sm font-medium">{soles(p.subtotal)}</span>
                    </div>
                  </div>
                  {p.cajas !== p.cajasSugeridas && (
                    <p className="text-xs text-gris">
                      Sugeridas: <span className="font-mono">{p.cajasSugeridas}</span> ·{" "}
                      <button type="button" onClick={() => cambiarCajas(p.productoId, "")} className={`${areaToque} font-medium text-verde hover:text-tinta`}>
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
          {r.productos.length > 0 && (
            <div className="flex items-baseline justify-between border-t border-linea bg-papel px-4 py-3">
              <span className="font-medium">Total estimado</span>
              <span className="font-mono text-lg font-semibold">{soles(r.total)}</span>
            </div>
          )}
        </div>
      </section>

      {/* Lo que Surtiba no vende */}
      {r.insumos.length > 0 && (
        <section>
          <h3 className={sello}>También vas a necesitar</h3>
          <p className="mt-1 text-sm text-gris">Surtiba no lo vende, pero te dejamos la lista para que no te falte.</p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {r.insumos.map((i) => (
              <li key={i.nombre} className="flex items-baseline justify-between gap-3 rounded-md border border-linea bg-blanco px-4 py-3 text-sm">
                <span>
                  {i.nombre}
                  {i.nota && <span className="block text-xs text-gris">{i.nota}</span>}
                </span>
                <span className="font-mono whitespace-nowrap">
                  {decimal.format(i.cantidad)} {i.unidad}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
