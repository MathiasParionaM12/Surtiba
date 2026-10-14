"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { EstadoForm } from "@/lib/acciones-auth";
import { agregarAlCarrito, agregarReemplazo } from "@/lib/acciones-pedidos";
import { botonPrimario, botonSecundario } from "@/lib/estilos";

// Botón para una opción parecida.
// Con pedidoId: la agrega AL MISMO pedido. Sin pedidoId (pedido ya cerrado): la agrega al carrito.
export function AgregarRapido({ productoId, cajas, pedidoId }: { productoId: string; cajas: number; pedidoId?: string }) {
  const [estado, accion, enviando] = useActionState<EstadoForm, FormData>(
    pedidoId ? agregarReemplazo : agregarAlCarrito,
    {},
  );
  const textoCajas = `${cajas} ${cajas === 1 ? "caja" : "cajas"}`;

  if (estado.mensaje) {
    return pedidoId ? (
      <p className="text-sm font-medium text-verde">{estado.mensaje}</p>
    ) : (
      <Link href="/carrito" className="text-sm font-medium whitespace-nowrap text-verde hover:text-tinta">
        Agregado · Ver carrito
      </Link>
    );
  }

  return (
    <form action={accion} className="flex flex-col items-end gap-1">
      {pedidoId && <input type="hidden" name="pedido_id" value={pedidoId} />}
      <input type="hidden" name="producto_id" value={productoId} />
      <input type="hidden" name="cajas" value={cajas} />
      <button
        type="submit"
        disabled={enviando}
        className={`${pedidoId ? botonPrimario : botonSecundario} h-9 px-3 text-xs`}
      >
        {enviando ? "Agregando…" : pedidoId ? `Agregar ${textoCajas} a este pedido` : `Agregar ${textoCajas} al carrito`}
      </button>
      {estado.error && <p className="max-w-64 text-right text-xs text-gris">{estado.error}</p>}
    </form>
  );
}
