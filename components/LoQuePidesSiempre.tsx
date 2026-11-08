// "Lo que pides siempre": atajo para volver a pedir lo de siempre (catálogo y Mis pedidos, solo compradores
// con 2 o más pedidos). Muestra cada producto con sus cajas de siempre y su precio por caja de hoy; el botón
// manda todo al carrito y el servidor vuelve a calcular la lista (no confía en lo que ve el navegador).
import { RotateCcw } from "lucide-react";
import Link from "next/link";
import { agregarSugeridos } from "@/lib/acciones-pedidos";
import { botonPrimario, sello } from "@/lib/estilos";
import { soles } from "@/lib/formato";
import type { ProductoTarjeta } from "@/lib/catalogo";
import { pedidoSugerido } from "@/lib/sugeridos";

export async function LoQuePidesSiempre({ productos }: { productos: ProductoTarjeta[] }) {
  const { items, pedidos } = await pedidoSugerido();
  const porId = new Map(productos.map((p) => [p.id, p]));
  // Solo lo que hoy se puede pedir (RLS ya deja fuera lo inactivo)
  const lista = items.map((s) => ({ ...s, p: porId.get(s.productoId) })).filter((s) => s.p);
  if (lista.length === 0) return null;

  // Precio por caja según las cajas de siempre (la escala de hoy)
  const precio = (p: ProductoTarjeta, cajas: number) =>
    p.tramos?.find((t) => cajas >= t.desde && (t.hasta === null || cajas <= t.hasta))?.precio ?? p.precioCaja;
  const total = lista.reduce((t, s) => t + precio(s.p!, s.cajas) * s.cajas, 0);

  return (
    <section className="aparecer mt-8 rounded-md border border-linea bg-blanco">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-linea px-4 py-4 sm:px-5">
        <div>
          <h2 className={sello}>Lo que pides siempre</h2>
          <p className="mt-1 text-sm text-gris">Lo que más repites en tus últimos {pedidos} pedidos (90 días), con tus cajas de siempre.</p>
        </div>
        <form action={agregarSugeridos}>
          <button type="submit" className={`${botonPrimario} h-10 px-4`}>
            <RotateCcw className="size-4" aria-hidden="true" />
            Agregar todo al carrito · {soles(total)}
          </button>
        </form>
      </div>
      <ul className="escalonado divide-y divide-linea">
        {lista.map(({ p, cajas, veces }) => (
          <li key={p!.id}>
            <Link href={`/catalogo/${p!.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-papel sm:px-5">
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{p!.nombre}</span>
                <span className="block truncate text-xs text-gris">
                  {p!.marca} · en {veces} de {pedidos} pedidos
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block font-mono text-sm">{cajas} {cajas === 1 ? "caja" : "cajas"}</span>
                <span className="block font-mono text-xs text-gris">{soles(precio(p!, cajas))} c/u</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
