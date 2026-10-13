"use client";

import Link from "next/link";
import { useActionState } from "react";
import { AvisoForm } from "@/components/AvisoForm";
import type { EstadoForm } from "@/lib/acciones-auth";
import { agregarAlCarrito } from "@/lib/acciones-pedidos";
import { botonPrimario, campo } from "@/lib/estilos";

export function FormAgregar({ productoId, agotado, enCarrito }: { productoId: string; agotado: boolean; enCarrito: number }) {
  const [estado, accion, enviando] = useActionState<EstadoForm, FormData>(agregarAlCarrito, {});

  if (agotado) {
    return <p className="rounded-md border border-linea bg-blanco p-4 text-sm text-gris">Este producto está agotado por ahora.</p>;
  }

  return (
    <form action={accion} className="rounded-md border border-linea bg-blanco p-4 sm:p-5">
      <input type="hidden" name="producto_id" value={productoId} />
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-gris">Cajas</span>
          <input
            name="cajas"
            type="number"
            min={1}
            max={999}
            defaultValue={1}
            required
            className={`${campo} w-24 font-mono`}
          />
        </label>
        <button type="submit" disabled={enviando} className={`${botonPrimario} flex-1 sm:flex-none`}>
          {enviando ? "Agregando…" : "Agregar al carrito"}
        </button>
      </div>
      {enCarrito > 0 && !estado.mensaje && (
        <p className="mt-3 text-xs text-gris">Ya tienes {enCarrito} en tu carrito. Lo que agregues se suma.</p>
      )}
      <div className="mt-3 empty:hidden">
        <AvisoForm error={estado.error} mensaje={estado.mensaje} />
      </div>
      {estado.mensaje && (
        <Link href="/carrito" className="mt-2 inline-block text-sm font-medium text-verde underline underline-offset-4 hover:text-tinta">
          Ver carrito
        </Link>
      )}
    </form>
  );
}
