"use client";

// Calculadora de margen para el comprador: pone a cuánto vendería el producto (por trago o por botella)
// y ve su costo, su ganancia y su margen. Es solo una estimación para decidir: no cambia ningún precio
// ni pedido (el precio real de compra lo calcula siempre el servidor al pedir).
import { useState } from "react";
import { Cifra } from "@/components/Cifra";
import { soles } from "@/lib/formato";
import { campo, sello } from "@/lib/estilos";

type Tramo = { desde_cajas: number; hasta_cajas: number | null; precio_caja_centimos: number };

// ml de un trago típico por categoría (supuesto editable por el comprador)
const ML_TRAGO: Record<string, number> = { pisco: 60, ron: 50, gin: 50, vodka: 50, licor: 30, vino: 150, espumante: 125, coctel_listo: 0 };

export function CalculadoraMargen({
  tramos,
  ml,
  unidades,
  categoria,
  porTragoPrimero,
}: {
  tramos: Tramo[];
  ml: number;
  unidades: number;
  categoria: string;
  porTragoPrimero: boolean; // bares, caterings y eventos: por trago; el resto (ej. licorerías): por botella
}) {
  const sePuedeServir = (ML_TRAGO[categoria] ?? 0) > 0; // un cóctel listo se vende por unidad
  const [modo, setModo] = useState<"trago" | "botella">(porTragoPrimero && sePuedeServir ? "trago" : "botella");
  const [cajas, setCajas] = useState(tramos[0]?.desde_cajas ?? 1);
  const [mlTrago, setMlTrago] = useState(String(ML_TRAGO[categoria] || 60));
  const [precioVenta, setPrecioVenta] = useState("");

  // Precio por caja según las cajas que compraría (la misma escala del catálogo)
  const tramo = tramos.find((t) => cajas >= t.desde_cajas && (t.hasta_cajas === null || cajas <= t.hasta_cajas)) ?? tramos.at(-1);
  const precioCaja = tramo?.precio_caja_centimos ?? 0;
  const mlPorTrago = Math.max(1, Number(mlTrago) || 0);
  const porCaja = modo === "botella" ? unidades : Math.floor((ml * unidades) / mlPorTrago); // botellas o tragos que salen de una caja
  const costo = porCaja > 0 ? precioCaja / porCaja : 0; // céntimos por trago o por botella
  const venta = Math.round((Number(precioVenta.replace(",", ".")) || 0) * 100);
  const ganancia = venta - costo;
  const margen = venta > 0 ? (ganancia / venta) * 100 : null;
  const unidad = modo === "botella" ? "botella" : "trago";
  const etiqueta = "font-mono text-[11px] tracking-[0.12em] text-gris uppercase";

  return (
    <section className="mt-8 rounded-md border border-linea bg-blanco p-5">
      <h2 className={sello}>Calcula tu margen</h2>
      <p className="mt-1 text-sm text-gris">Pon a cuánto lo venderías y te decimos cuánto ganas. Es una estimación: no cambia tu pedido.</p>

      {sePuedeServir && (
        <div role="radiogroup" aria-label="Cómo lo vendes" className="mt-4 inline-flex rounded-md border border-linea bg-papel p-0.5">
          {(
            [
              { valor: "trago", texto: "Por trago" },
              { valor: "botella", texto: "Por botella" },
            ] as const
          ).map((o) => (
            <button
              key={o.valor}
              type="button"
              role="radio"
              aria-checked={modo === o.valor}
              onClick={() => setModo(o.valor)}
              className={`h-11 rounded-[5px] px-4 text-sm transition-colors sm:h-9 ${modo === o.valor ? "bg-blanco font-medium shadow-sm" : "text-gris hover:text-tinta"}`}
            >
              {o.texto}
            </button>
          ))}
        </div>
      )}

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <label className="flex flex-col gap-1.5">
          <span className={etiqueta}>Comprarías</span>
          <div className="flex items-center gap-2">
            <div className="w-24">
              <input
                type="number"
                min={1}
                max={999}
                value={cajas}
                onChange={(e) => setCajas(Math.max(1, Math.trunc(Number(e.target.value)) || 1))}
                className={`${campo} text-right font-mono`}
              />
            </div>
            <span className="text-sm text-gris">cajas</span>
          </div>
          <span className="text-xs text-gris">{soles(precioCaja)} por caja</span>
        </label>
        {modo === "trago" && (
          <label className="flex flex-col gap-1.5">
            <span className={etiqueta}>ml por trago</span>
            <div className="w-24">
              <input
                type="number"
                min={10}
                max={500}
                value={mlTrago}
                onChange={(e) => setMlTrago(e.target.value)}
                className={`${campo} text-right font-mono`}
              />
            </div>
            <span className="text-xs text-gris">Salen {porCaja} tragos por caja</span>
          </label>
        )}
        <label className="flex flex-col gap-1.5">
          <span className={etiqueta}>Lo vendes a (por {unidad})</span>
          <div className="relative w-32">
            <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 font-mono text-sm text-gris">S/</span>
            <input
              inputMode="decimal"
              value={precioVenta}
              onChange={(e) => setPrecioVenta(e.target.value)}
              placeholder={modo === "trago" ? "25.00" : "60.00"}
              className={`${campo} pl-9 text-right font-mono`}
            />
          </div>
        </label>
      </div>

      <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-linea pt-4">
        <div>
          <dt className={etiqueta}>Tu costo</dt>
          <dd className="mt-1 font-mono text-lg">
            <Cifra>{soles(Math.round(costo))}</Cifra>
          </dd>
          <dd className="text-xs text-gris">por {unidad}</dd>
        </div>
        <div>
          <dt className={etiqueta}>Ganas</dt>
          <dd className={`mt-1 font-mono text-lg ${venta > 0 && ganancia < 0 ? "text-rojo" : ""}`}>
            <Cifra>{venta > 0 ? soles(Math.round(ganancia)) : "—"}</Cifra>
          </dd>
          <dd className="text-xs text-gris">{venta > 0 ? `por ${unidad} · ${soles(Math.round(ganancia * porCaja))} por caja` : `por ${unidad}`}</dd>
        </div>
        <div>
          <dt className={etiqueta}>Margen</dt>
          <dd className={`mt-1 font-mono text-2xl font-semibold ${margen !== null && margen >= 0 ? "text-verde" : margen !== null ? "text-rojo" : ""}`}>
            <Cifra>{margen === null ? "—" : `${Math.round(margen)} %`}</Cifra>
          </dd>
        </div>
      </dl>
      {modo === "trago" && (
        <p className="mt-3 text-xs text-gris">Solo cuenta el licor. Hielo, mezcladores y vasos van aparte.</p>
      )}
    </section>
  );
}
