import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { EsqueletoPagina } from "@/components/Esqueleto";
import { EtiquetaEstado } from "@/components/EtiquetaEstado";
import { esUuid } from "@/lib/catalogo";
import { sello } from "@/lib/estilos";
import { fecha, hoyEnLima, soles } from "@/lib/formato";
import { exigirRol } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";
import { AccionesEncargo } from "./AccionesEncargo";
import { AccionesOrden } from "./AccionesOrden";

export const metadata: Metadata = { title: "Orden · Panel de marca · Surtiba" };

export default function PaginaOrden({ params }: PageProps<"/marca/ordenes/[id]">) {
  return (
    <>
      <Link href="/marca/ordenes" className="text-sm font-medium text-verde hover:text-tinta">
        ← Órdenes
      </Link>
      <div className="mt-6">
        <Suspense fallback={<EsqueletoPagina />}>
          <DetalleOrden params={params} />
        </Suspense>
      </div>
    </>
  );
}

async function DetalleOrden({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, usuario] = await Promise.all([params, exigirRol("marca")]);
  if (!esUuid(id)) notFound();

  // RLS: si la orden no es de esta marca, no llega nada
  const supabase = await createClient();
  const [{ data: o }, { data: privado }] = await Promise.all([
    supabase
      .from("subpedidos")
      .select(
        "codigo, estado, total_cajas, total_centimos, comision_pct_aplicada, exento_comision, comision_centimos, fecha_recojo, fecha_disponible, motivo_rechazo, creado_en, listo_en, recogido_en, entregado_en, items(cajas, precio_caja_centimos, subtotal_centimos, productos(nombre))",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase.from("marcas_privado").select("direccion_recojo").eq("marca_id", usuario.marcaId!).maybeSingle(),
  ]);
  if (!o) notFound();

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className={sello}>Orden</p>
          <h1 className="mt-2 font-mono text-3xl font-semibold tracking-tight">{o.codigo}</h1>
          <p className="mt-1 text-sm text-gris">Recibida el {fecha(o.creado_en)}</p>
        </div>
        <EtiquetaEstado estado={o.estado} />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
          {o.estado === "por_confirmar" && <AccionesEncargo subpedidoId={id} hoy={hoyEnLima()} />}
          {o.estado === "pendiente" && o.fecha_disponible && (
            <p className="border-l-2 border-verde pl-3 text-sm">
              Encargo aceptado: tenlo listo para el <span className="font-mono">{fecha(o.fecha_disponible)}</span>. Podrás
              marcarlo listo cuando el cliente haya pagado (si aún no paga, te lo diremos al intentarlo).
            </p>
          )}
          {o.estado === "pendiente" && <AccionesOrden subpedidoId={id} />}
          {o.estado === "listo_recojo" && o.listo_en && (
            <p className="border-l-2 border-verde pl-3 text-sm">
              Marcaste esta orden como lista el {fecha(o.listo_en)}. Surtiba pasará a recogerla.
            </p>
          )}
          {o.estado === "rechazado" && (
            <p className="border-l-2 border-rojo pl-3 text-sm">
              No pudiste atender esta orden. Motivo: {o.motivo_rechazo}
            </p>
          )}

          <section className="overflow-hidden rounded-md border border-linea bg-blanco">
            <h2 className={`${sello} border-b border-linea px-5 py-3`}>Productos a preparar</h2>
            <ul>
              {o.items.map((i, n) => (
                <li key={n} className="flex justify-between gap-4 border-b border-linea px-5 py-3 text-sm last:border-b-0">
                  <span>
                    <span className="font-mono font-medium">{i.cajas} cajas</span> · {i.productos?.nombre}
                    <span className="block font-mono text-xs text-gris">{soles(i.precio_caja_centimos)} por caja</span>
                  </span>
                  <span className="font-mono">{soles(i.subtotal_centimos)}</span>
                </li>
              ))}
            </ul>
            <div className="flex justify-between border-t border-linea bg-papel px-5 py-3 text-sm">
              <span className="font-medium">{o.total_cajas} cajas</span>
              <span className="font-mono font-semibold">{soles(o.total_centimos)}</span>
            </div>
          </section>
        </div>

        <aside className="flex h-fit flex-col gap-4 text-sm">
          <div className="rounded-md border border-linea bg-blanco p-5">
            <h2 className={sello}>Recojo</h2>
            <p className="mt-3 font-mono">{o.fecha_recojo ? fecha(o.fecha_recojo) : "Fecha por definir"}</p>
            <p className="mt-1 text-gris">{privado?.direccion_recojo ?? "Dirección de recojo por definir con Surtiba"}</p>
            <p className="mt-3 text-xs text-gris">Surtiba fija la fecha de recojo y recoge en tu local.</p>
          </div>
          <div className="rounded-md border border-linea bg-blanco p-5">
            <h2 className={sello}>Comisión</h2>
            <p className="mt-3">
              {o.exento_comision
                ? "Sin comisión (uno de tus primeros 3 pedidos)."
                : o.estado === "entregado"
                  ? `${soles(o.comision_centimos)} (${o.comision_pct_aplicada}%)`
                  : `${o.comision_pct_aplicada}% al entregarse.`}
            </p>
            <p className="mt-2 text-xs text-gris">Se calcula solo cuando el pedido se entrega.</p>
          </div>
        </aside>
      </div>
    </>
  );
}
