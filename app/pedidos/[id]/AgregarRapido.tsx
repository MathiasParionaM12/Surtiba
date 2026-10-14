"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { EstadoForm } from "@/lib/acciones-auth";
import { agregarAlCarrito } from "@/lib/acciones-pedidos";
import { botonSecundario } from "@/lib/estilos";

// Botón para agregar una opción parecida al carrito con las mismas cajas que se pidieron
export function AgregarRapido({ productoId, cajas }: { productoId: string; cajas: number }) {
  const [estado, accion, enviando] = useActionState<EstadoForm, FormData>(agregarAlCarrito, {});

  if (estado.mensaje) {
    return (
      <Link href="/carrito" className="text-sm font-medium whitespace-nowrap text-verde hover:text-tinta">
        Agregado · Ver carrito
      </Link>
    );
  }

  return (
    <form action={accion} className="flex flex-col items-end gap-1">
      <input type="hidden" name="producto_id" value={productoId} />
      <input type="hidden" name="cajas" value={cajas} />
      <button type="submit" disabled={enviando} className={`${botonSecundario} h-9 px-3 text-xs`}>
        {enviando ? "Agregando…" : `Agregar ${cajas} ${cajas === 1 ? "caja" : "cajas"}`}
      </button>
      {estado.error && <p className="max-w-56 text-right text-xs text-gris">{estado.error}</p>}
    </form>
  );
}
