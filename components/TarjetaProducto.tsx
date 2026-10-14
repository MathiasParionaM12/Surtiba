import Link from "next/link";
import { BotonFavorito } from "@/components/BotonFavorito";
import { FotoProducto } from "@/components/FotoProducto";
import type { ProductoTarjeta } from "@/lib/catalogo";
import { soles } from "@/lib/formato";

export type { ProductoTarjeta };

export function TarjetaProducto({ p }: { p: ProductoTarjeta }) {
  const conSesion = p.stock !== undefined;
  const agotado = conSesion && p.stock === 0;

  return (
    // El corazón va fuera del enlace (un botón no puede ir dentro de un enlace)
    <div className="relative flex">
      {p.favorito !== undefined && (
        <BotonFavorito productoId={p.id} activo={p.favorito} className="absolute top-3 right-3 z-[1]" />
      )}
      <Link
        href={`/catalogo/${p.id}`}
        className="group flex flex-1 flex-col overflow-hidden rounded-md border border-linea bg-blanco transition-colors hover:border-gris"
      >
        <FotoProducto categoria={p.categoria} ml={p.ml} foto={p.foto} />
        <div className="flex flex-1 flex-col p-4">
          {p.inactivo && (
            <p className="mb-2 self-start rounded-sm border border-linea px-2 py-0.5 font-mono text-[11px] tracking-[0.08em] text-gris uppercase">
              Inactivo · no lo ven los compradores
            </p>
          )}
          <p className="text-xs text-gris">{p.marca}</p>
          <h3 className="mt-1 font-medium group-hover:text-verde">{p.nombre}</h3>
          <p className="mt-1 font-mono text-xs text-gris">
            {p.ml} ml · {p.grado}% · {p.unidades} u/caja
          </p>

          <div className="mt-auto pt-5">
            <p className="font-mono text-lg font-medium tabular-nums">
              {soles(p.precioCaja)} <span className="font-sans text-sm font-normal text-gris">por caja</span>
            </p>
            {conSesion ? (
              <div className="mt-2 flex items-center justify-between gap-2">
                <p className="text-xs text-gris">
                  {p.precioMinimo !== undefined && p.precioMinimo < p.precioCaja
                    ? `Por volumen: hasta ${soles(p.precioMinimo)}`
                    : "Precio único"}
                </p>
                {agotado ? (
                  <span className="rounded-sm border border-linea px-2 py-0.5 font-mono text-[11px] tracking-[0.08em] text-gris uppercase">
                    Por encargo
                  </span>
                ) : (
                  <span className="font-mono text-xs whitespace-nowrap text-verde">
                    {p.stock} {p.stock === 1 ? "caja" : "cajas"}
                  </span>
                )}
              </div>
            ) : (
              <p className="mt-2 text-xs text-gris">Precios por volumen al ingresar</p>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}
