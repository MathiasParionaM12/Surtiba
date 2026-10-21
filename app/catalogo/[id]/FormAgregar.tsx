"use client";

import { ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
import { AvisoForm } from "@/components/AvisoForm";
import { Sello } from "@/components/Sello";
import type { EstadoForm } from "@/lib/acciones-auth";
import { agregarAlCarrito } from "@/lib/acciones-pedidos";
import { botonPrimario, campo } from "@/lib/estilos";

export function FormAgregar({ productoId, stock, enCarrito }: { productoId: string; stock: number; enCarrito: number }) {
  const [estado, accion, enviando] = useActionState<EstadoForm & { vez?: number }, FormData>(async (antes, form) => {
    // "vez" cuenta los agregados que salieron bien: así el sello se vuelve a estampar cada vez
    const r = await agregarAlCarrito(antes, form);
    return { ...r, vez: r.mensaje ? (antes.vez ?? 0) + 1 : antes.vez };
  }, {});

  return (
    <form action={accion} className="rounded-md border border-linea bg-blanco p-4 sm:p-5">
      <input type="hidden" name="producto_id" value={productoId} />
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-gris">Cajas</span>
          <div className="w-24">
            <input name="cajas" type="number" min={1} max={999} defaultValue={1} required className={`${campo} font-mono`} />
          </div>
        </label>
        <button type="submit" disabled={enviando} className={`${botonPrimario} flex-1 sm:flex-none`}>
          <ShoppingCart className="size-4" aria-hidden="true" />
          {enviando ? "Agregando…" : "Agregar al carrito"}
        </button>
        {estado.mensaje && estado.vez ? (
          <Sello key={estado.vez} tono="verde" giro={-5} className="self-center">
            En el carrito
          </Sello>
        ) : null}
      </div>
      {!estado.mensaje && (
        <p className="mt-3 text-xs text-gris">
          {stock === 0
            ? "Agotado por ahora: puedes pedirlo por encargo. La marca te confirmará cuándo lo tiene y recién ahí lo pagas."
            : `Hay ${stock} cajas para entrega directa. Si pides más, lo que falte va por encargo.`}
        </p>
      )}
      {enCarrito > 0 && !estado.mensaje && (
        <p className="mt-3 text-xs text-gris">Ya tienes {enCarrito} en tu carrito. Lo que agregues se suma.</p>
      )}
      <div className="mt-3 empty:hidden">
        <AvisoForm estado={estado} />
      </div>
      {estado.mensaje && (
        <Link href="/carrito" className="mt-2 inline-block text-sm font-medium text-verde underline underline-offset-4 hover:text-tinta">
          Ver carrito
        </Link>
      )}
    </form>
  );
}
