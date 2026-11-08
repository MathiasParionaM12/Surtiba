"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState } from "react";
import { AvisoForm } from "@/components/AvisoForm";
import type { EstadoForm } from "@/lib/acciones-auth";
import { guardarStock } from "@/lib/acciones-marca";
import { botonPrimario, campo, sello } from "@/lib/estilos";

export type FilaProducto = {
  id: string;
  nombre: string;
  detalle: string; // "Pisco · 750 ml · 3 precios por volumen"
  precio: string; // precio de 1 caja, ya con formato
  foto: string | null;
  stock: number;
  activo: boolean;
  revision: string; // pendiente · aprobado · rechazado
};

// Productos de la marca con su stock editable en la misma lista (antes eran 2 pestañas: KISS, 5-nov-2026).
// Cambias las cajas de varios productos y guardas una sola vez; los datos y precios se editan en "Editar".
export function TablaProductos({ productos }: { productos: FilaProducto[] }) {
  const [estado, accion, enviando] = useActionState<EstadoForm, FormData>(guardarStock, {});

  return (
    // key: cuando llegan números nuevos del servidor, la tabla se vuelve a dibujar con ellos
    <form key={productos.map((p) => p.stock).join(",")} action={accion} className="mt-6">
      <ul className="escalonado overflow-hidden rounded-md border border-linea bg-blanco">
        {productos.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-linea px-4 py-3 last:border-b-0">
            <div className="relative size-12 shrink-0 overflow-hidden rounded-md border border-linea bg-papel">
              {p.foto && <Image src={p.foto} alt="" fill sizes="48px" className="object-contain p-1" />}
            </div>
            <div className="min-w-0 flex-1 basis-48">
              <p className="truncate font-medium">{p.nombre}</p>
              <p className="font-mono text-xs text-gris">
                {p.detalle} · {p.precio}
              </p>
            </div>
            <label className="flex items-center gap-2">
              <span className="text-xs text-gris">Cajas</span>
              {/* Lo que había en pantalla: el servidor lo compara para no pisar cambios de otros */}
              <input type="hidden" name={`antes:${p.id}`} value={p.stock} />
              <span className="w-24">
                <input
                  name={`stock:${p.id}`}
                  type="number"
                  min={0}
                  max={99999}
                  required
                  aria-label={`Cajas disponibles de ${p.nombre}`}
                  defaultValue={p.stock}
                  className={`${campo} h-10 text-right font-mono ${p.stock === 0 ? "border-gris" : ""}`}
                />
              </span>
            </label>
            <span className={`${sello} w-24 text-right ${p.revision === "rechazado" ? "text-rojo" : ""}`}>
              {p.revision === "pendiente" ? "En revisión" : p.revision === "rechazado" ? "Rechazado" : p.activo ? "Activo" : "Inactivo"}
            </span>
            <Link href={`/marca/productos/${p.id}`} className="text-sm font-medium enlace text-verde hover:text-tinta">
              Editar
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <button type="submit" disabled={enviando} className={botonPrimario}>
          {enviando ? "Guardando…" : "Guardar stock"}
        </button>
        <p className="text-sm text-gris">Cuando llega un pedido, sus cajas se descuentan solas.</p>
        <AvisoForm estado={estado} />
      </div>
    </form>
  );
}
