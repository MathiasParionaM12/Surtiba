import Link from "next/link";
import { AgregarTarjeta } from "@/components/AgregarTarjeta";
import { BotonFavorito } from "@/components/BotonFavorito";
import { FotoProducto } from "@/components/FotoProducto";
import type { ProductoTarjeta } from "@/lib/catalogo";
import { soles } from "@/lib/formato";

export type { ProductoTarjeta };

// Tarjeta del catálogo. En celular es compacta (2 por fila). puedeAgregar: solo compradores,
// muestra − cajas + y "Agregar" debajo (fuera del enlace: un botón no puede ir dentro de un enlace).
export function TarjetaProducto({ p, puedeAgregar = false }: { p: ProductoTarjeta; puedeAgregar?: boolean }) {
  const conSesion = p.stock !== undefined;
  const agotado = conSesion && p.stock === 0;

  return (
    <div className="group/tarjeta relative flex flex-col overflow-hidden rounded-md border border-linea bg-blanco transition-[border-color,box-shadow,translate] duration-200 hover:border-gris hover:shadow-md hover:shadow-tinta/5 motion-safe:hover:-translate-y-0.5">
      {p.favorito !== undefined && (
        <BotonFavorito productoId={p.id} activo={p.favorito} className="absolute top-2 right-2 z-[1] sm:top-3 sm:right-3" />
      )}
      <Link href={`/catalogo/${p.id}`} className="group flex flex-1 flex-col focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-verde">
        <FotoProducto categoria={p.categoria} ml={p.ml} foto={p.foto} />
        <div className="flex flex-1 flex-col p-3 sm:p-4">
          {p.inactivo && (
            <p className="mb-2 self-start rounded-sm border border-linea px-2 py-0.5 font-mono text-[11px] tracking-[0.08em] text-gris uppercase">
              Inactivo · no lo ven los compradores
            </p>
          )}
          <p className="truncate text-xs text-gris">{p.marca}</p>
          <h3 className="mt-1 line-clamp-2 text-sm font-medium group-hover:text-verde sm:text-base">{p.nombre}</h3>
          <p className="mt-1 font-mono text-[11px] text-gris sm:text-xs">
            {p.ml} ml · {p.unidades} u/caja<span className="hidden sm:inline"> · {p.grado}%</span>
          </p>

          <div className="mt-auto pt-4">
            <p className="font-mono text-base font-medium tabular-nums sm:text-lg">
              {soles(p.precioCaja)} <span className="block font-sans text-xs font-normal text-gris sm:inline sm:text-sm">por caja</span>
            </p>
            {conSesion && (
              <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                <p className={`text-xs ${p.siguienteTramo ? "text-verde" : "text-gris"}`}>
                  {p.siguienteTramo ? (
                    <>
                      Desde {p.siguienteTramo.desde} cajas: <span className="font-mono whitespace-nowrap">{soles(p.siguienteTramo.precio)}</span>
                    </>
                  ) : (
                    "Precio único"
                  )}
                </p>
                {agotado ? (
                  <span className="rounded-sm border border-linea px-1.5 py-0.5 font-mono text-[10px] tracking-[0.08em] text-gris uppercase">
                    Por encargo
                  </span>
                ) : (
                  <span className="font-mono text-xs whitespace-nowrap text-gris">
                    {p.stock} {p.stock === 1 ? "caja" : "cajas"}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </Link>
      {puedeAgregar && (
        <div className="border-t border-linea p-3 sm:p-4">
          <AgregarTarjeta productoId={p.id} nombre={p.nombre} />
        </div>
      )}
    </div>
  );
}
