"use client";

// Agregar al carrito desde la tarjeta del catálogo: − cajas + y "Agregar".
// Solo manda producto_id y cajas; el precio lo pone la base de datos (regla de seguridad).
// Al agregar sale el aviso flotante y el contador del carrito se actualiza.
import { Minus, Plus, ShoppingCart } from "lucide-react";
import { useActionState, useState } from "react";
import { AvisoForm } from "@/components/AvisoForm";
import { Sello } from "@/components/Sello";
import type { EstadoForm } from "@/lib/acciones-auth";
import { agregarAlCarrito } from "@/lib/acciones-pedidos";
import { botonPrimario } from "@/lib/estilos";

const MAX = 999;

export function AgregarTarjeta({ productoId, nombre }: { productoId: string; nombre: string }) {
  const [estado, accion, enviando] = useActionState<EstadoForm & { vez?: number }, FormData>(async (antes, form) => {
    // "vez" cuenta los agregados que salieron bien: así el sello se vuelve a estampar cada vez
    const r = await agregarAlCarrito(antes, form);
    return { ...r, vez: r.mensaje ? (antes.vez ?? 0) + 1 : antes.vez };
  }, {});
  const [cajas, setCajas] = useState(1);
  const sumar = (delta: number) => setCajas((n) => Math.min(MAX, Math.max(1, n + delta)));

  return (
    <form action={accion} className="flex flex-col gap-2">
      <input type="hidden" name="producto_id" value={productoId} />
      <input type="hidden" name="cajas" value={cajas} />
      <div className="flex items-center justify-between gap-1 rounded-md border border-linea">
        <button
          type="button"
          onClick={() => sumar(-1)}
          disabled={cajas <= 1}
          aria-label={`Una caja menos de ${nombre}`}
          className="flex size-11 shrink-0 items-center justify-center rounded-l-md transition-colors hover:bg-papel disabled:opacity-40"
        >
          <Minus className="size-4" aria-hidden="true" />
        </button>
        <span className="min-w-0 text-center font-mono text-sm font-medium tabular-nums" aria-live="polite">
          {cajas} <span className="sr-only font-sans text-xs font-normal text-gris sm:not-sr-only">{cajas === 1 ? "caja" : "cajas"}</span>
        </span>
        <button
          type="button"
          onClick={() => sumar(1)}
          disabled={cajas >= MAX}
          aria-label={`Una caja más de ${nombre}`}
          className="flex size-11 shrink-0 items-center justify-center rounded-r-md transition-colors hover:bg-papel disabled:opacity-40"
        >
          <Plus className="size-4" aria-hidden="true" />
        </button>
      </div>
      <button type="submit" disabled={enviando} className={`${botonPrimario} w-full px-3`}>
        <ShoppingCart className="size-4" aria-hidden="true" />
        {enviando ? "Agregando…" : "Agregar"}
      </button>
      {estado.mensaje && estado.vez ? (
        <Sello key={estado.vez} tono="verde" giro={-4} className="estampa-pasajera self-center">
          En el carrito
        </Sello>
      ) : null}
      <div className="empty:hidden text-xs">
        <AvisoForm estado={estado} />
      </div>
    </form>
  );
}
