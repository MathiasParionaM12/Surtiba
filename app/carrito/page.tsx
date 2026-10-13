import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { EsqueletoTabla } from "@/components/Esqueleto";
import { cambiarCajas, quitarDelCarrito } from "@/lib/acciones-pedidos";
import { botonPrimario, botonSecundario, campo, sello } from "@/lib/estilos";
import { soles } from "@/lib/formato";
import { rutaInicio } from "@/lib/roles";
import { obtenerUsuario } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Carrito · Surtiba" };

type Avisos = { repetido?: string; omitidos?: string };

export default function PaginaCarrito({ searchParams }: PageProps<"/carrito">) {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-8 sm:py-14">
      <p className={sello}>Tu pedido</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Carrito</h1>
      <Suspense fallback={<EsqueletoTabla filas={5} />}>
        <Carrito searchParams={searchParams as Promise<Avisos>} />
      </Suspense>
    </main>
  );
}

async function Carrito({ searchParams }: { searchParams: Promise<Avisos> }) {
  const [usuario, avisos] = await Promise.all([obtenerUsuario(), searchParams]);
  if (!usuario) redirect("/ingresar");
  if (usuario.rol !== "comprador") redirect(rutaInicio(usuario.rol));

  // Precios calculados en la base de datos (vista carrito_detalle), según las cajas de cada producto
  const supabase = await createClient();
  const { data } = await supabase.from("carrito_detalle").select("*").order("marca").order("nombre");
  const lineas = data ?? [];

  if (lineas.length === 0) {
    return (
      <div className="mt-8 rounded-md border border-linea bg-blanco p-6">
        <p>Tu carrito está vacío. Explora el catálogo para armar tu pedido.</p>
        <Link href="/catalogo" className={`${botonPrimario} mt-5`}>
          Ir al catálogo
        </Link>
      </div>
    );
  }

  // Escalas de los productos del carrito: para avisar "con N cajas pagas menos"
  const { data: escalas } = await supabase
    .from("escalas_precio")
    .select("producto_id, desde_cajas, precio_caja_centimos")
    .in("producto_id", lineas.map((l) => l.producto_id!));

  // Agrupar por marca
  const marcas = new Map<string, { nombre: string; minimo: number; lineas: typeof lineas }>();
  for (const l of lineas) {
    const grupo = marcas.get(l.marca_id!) ?? { nombre: l.marca!, minimo: l.pedido_minimo_cajas!, lineas: [] };
    grupo.lineas.push(l);
    marcas.set(l.marca_id!, grupo);
  }

  // Problemas que impiden enviar el pedido
  const problemaDe = (l: (typeof lineas)[number]) => {
    if (!l.activo || !l.marca_activa) return "Ya no está disponible. Quítalo del carrito.";
    if (l.stock_cajas === 0) return "Se agotó. Quítalo del carrito.";
    if (l.cajas! > l.stock_cajas!) return `Solo quedan ${l.stock_cajas} cajas. Baja la cantidad.`;
    if (l.precio_caja_centimos === null) return "No tiene precio para esa cantidad.";
    return null;
  };
  // Todo se calcula antes de dibujar: totales por marca, faltante del mínimo, problemas y siguiente tramo
  const grupos = [...marcas.entries()].map(([marcaId, grupo]) => {
    const cajasMarca = grupo.lineas.reduce((s, l) => s + l.cajas!, 0);
    return {
      marcaId,
      ...grupo,
      cajasMarca,
      subtotalMarca: grupo.lineas.reduce((s, l) => s + (l.subtotal_centimos ?? 0), 0),
      faltan: grupo.minimo - cajasMarca,
      items: grupo.lineas.map((l) => ({
        l,
        problema: problemaDe(l),
        siguiente: (escalas ?? [])
          .filter((e) => e.producto_id === l.producto_id && e.desde_cajas > l.cajas!)
          .sort((a, b) => a.desde_cajas - b.desde_cajas)[0],
      })),
    };
  });
  const hayProblemas = grupos.some((g) => g.faltan > 0 || g.items.some((i) => i.problema));
  const total = lineas.reduce((suma, l) => suma + (l.subtotal_centimos ?? 0), 0);
  const totalCajas = lineas.reduce((suma, l) => suma + l.cajas!, 0);

  const repetido = Number(avisos.repetido ?? NaN);
  const omitidos = Number(avisos.omitidos ?? 0);

  return (
    <>
      {!Number.isNaN(repetido) && (
        <p role="status" className="mt-6 border-l-2 border-verde pl-3 text-sm">
          Agregamos {repetido} {repetido === 1 ? "producto" : "productos"} de tu pedido anterior.
          {omitidos > 0 && ` ${omitidos} ya no ${omitidos === 1 ? "está disponible" : "están disponibles"}.`}
        </p>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
          {grupos.map(({ marcaId, cajasMarca, subtotalMarca, faltan, items, ...grupo }) => (
            <section key={marcaId} className="overflow-hidden rounded-md border border-linea bg-blanco">
              <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-linea px-4 py-3 sm:px-5">
                <h2 className="font-semibold">{grupo.nombre}</h2>
                <p className="font-mono text-xs text-gris">
                  {cajasMarca} cajas · mínimo {grupo.minimo}
                </p>
              </header>

              {faltan > 0 && (
                <p className="border-b border-linea bg-papel px-4 py-2.5 text-sm sm:px-5">
                  Pedido mínimo: {grupo.minimo} cajas. Te faltan <strong className="font-mono">{faltan}</strong>.
                </p>
              )}

              <ul>
                {items.map(({ l, problema, siguiente }) => (
                  <li key={l.producto_id} className="border-b border-linea px-4 py-4 last:border-b-0 sm:px-5">
                    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
                      <div className="min-w-0 flex-1">
                        <Link href={`/catalogo/${l.producto_id}`} className="font-medium hover:text-verde">
                          {l.nombre}
                        </Link>
                        <p className="mt-0.5 font-mono text-xs text-gris">
                          {l.precio_caja_centimos !== null ? `${soles(l.precio_caja_centimos)} por caja` : "Sin precio"} ·{" "}
                          {l.unidades_por_caja} u/caja
                        </p>
                        {siguiente && !problema && (
                          <p className="mt-1 text-xs text-verde">
                            Con {siguiente.desde_cajas} cajas pagas {soles(siguiente.precio_caja_centimos)} por caja.
                          </p>
                        )}
                        {problema && <p className="mt-1 border-l-2 border-rojo pl-2 text-xs">{problema}</p>}
                      </div>

                      <div className="flex items-center gap-2">
                        <form action={cambiarCajas} className="flex items-center gap-2">
                          <input type="hidden" name="producto_id" value={l.producto_id!} />
                          <input
                            name="cajas"
                            type="number"
                            min={0}
                            max={999}
                            defaultValue={l.cajas!}
                            aria-label={`Cajas de ${l.nombre}`}
                            className={`${campo} h-9 w-20 px-2 text-center font-mono`}
                          />
                          <button type="submit" className={`${botonSecundario} h-9 px-3 text-xs`}>
                            Actualizar
                          </button>
                        </form>
                        <form action={quitarDelCarrito}>
                          <input type="hidden" name="producto_id" value={l.producto_id!} />
                          <button type="submit" className="h-9 px-2 text-xs font-medium text-gris hover:text-tinta">
                            Quitar
                          </button>
                        </form>
                      </div>

                      <p className="w-28 text-right font-mono font-medium whitespace-nowrap tabular-nums">
                        {l.subtotal_centimos !== null ? soles(l.subtotal_centimos) : "—"}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>

              <footer className="flex justify-between border-t border-linea bg-papel px-4 py-3 text-sm sm:px-5">
                <span className="text-gris">Subtotal {grupo.nombre}</span>
                <span className="font-mono font-medium">{soles(subtotalMarca)}</span>
              </footer>
            </section>
          ))}
        </div>

        {/* Resumen */}
        <aside className="h-fit rounded-md border border-linea bg-blanco p-5 lg:sticky lg:top-24">
          <h2 className={sello}>Resumen</h2>
          <dl className="mt-4 flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gris">
                {marcas.size} {marcas.size === 1 ? "marca" : "marcas"} · {totalCajas} cajas
              </dt>
              <dd className="font-mono">{soles(total)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gris">Envío</dt>
              <dd className="font-mono">{soles(0)}</dd>
            </div>
            <div className="mt-2 flex justify-between border-t border-linea pt-3 text-base">
              <dt className="font-medium">Total</dt>
              <dd className="font-mono font-semibold">{soles(total)}</dd>
            </div>
          </dl>
          <p className="mt-2 text-xs text-gris">Tarifa de envío por definir. Precios sujetos a stock al momento de pedir.</p>

          {hayProblemas ? (
            <>
              <p className="mt-5 border-l-2 border-rojo pl-3 text-sm">Corrige lo marcado en tu carrito para continuar.</p>
              <button type="button" disabled className={`${botonPrimario} mt-4 w-full`}>
                Continuar con el pedido
              </button>
            </>
          ) : (
            <Link href="/carrito/confirmar" className={`${botonPrimario} mt-5 w-full`}>
              Continuar con el pedido
            </Link>
          )}
          <Link href="/catalogo" className="mt-3 block text-center text-sm font-medium text-verde hover:text-tinta">
            Seguir comprando
          </Link>
        </aside>
      </div>
    </>
  );
}
