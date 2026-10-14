import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { EsqueletoPagina } from "@/components/Esqueleto";
import { EtiquetaEstado } from "@/components/EtiquetaEstado";
import { FormAccion } from "@/components/FormAccion";
import {
  cancelarPedido,
  cancelarSubpedido,
  fijarRecojo,
  marcarEnCamino,
  marcarEntregado,
  marcarPagado,
  marcarRecogido,
} from "@/lib/acciones-admin";
import { esUuid } from "@/lib/catalogo";
import { METODOS_PAGO_ADMIN, nombreMetodo, saldos } from "@/lib/pagos";
import { campo, sello } from "@/lib/estilos";
import { fecha, hoyEnLima, soles } from "@/lib/formato";
import { exigirRol } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Pedido · Panel Surtiba" };

const TIPO_NEGOCIO: Record<string, string> = {
  catering: "Catering",
  organizador_eventos: "Organizador de eventos",
  wedding_planner: "Wedding planner",
  bar_restaurante: "Bar o restaurante",
  otro: "Otro",
};

export default function PaginaPedidoAdmin({ params }: PageProps<"/admin/pedidos/[id]">) {
  return (
    <>
      <Link href="/admin/pedidos" className="text-sm font-medium text-verde hover:text-tinta">
        ← Pedidos
      </Link>
      <div className="mt-6">
        <Suspense fallback={<EsqueletoPagina />}>
          <Detalle params={params} />
        </Suspense>
      </div>
    </>
  );
}

async function Detalle({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }] = await Promise.all([params, exigirRol("admin")]);
  if (!esUuid(id)) notFound();

  const supabase = await createClient();
  const { data: p } = await supabase
    .from("pedidos")
    .select(
      "codigo, estado, creado_en, fecha_entrega_deseada, direccion_entrega, direccion_detalle, distrito, codigo_postal, referencia, recibe_nombre, recibe_telefono, nota, evento_nombre, evento_tipo, evento_fecha, invitados, subtotal_centimos, envio_centimos, total_centimos, pago_estado, pago_metodo, pagado_en, tipo, pagado_centimos, perfiles(nombre, empresa, whatsapp, ruc, tipo_negocio), subpedidos(id, estado, fecha_recojo, fecha_disponible, total_cajas, total_centimos, comision_pct_aplicada, exento_comision, comision_centimos, motivo_rechazo, marcas(nombre_comercial), items(cajas, cajas_reservadas, precio_caja_centimos, subtotal_centimos, productos(nombre)))",
    )
    .eq("id", id)
    .maybeSingle();
  if (!p) notFound();

  const abierto = p.estado === "recibido" || p.estado === "en_preparacion";
  const cancelable = abierto || p.estado === "por_confirmar" || p.estado === "por_pagar";
  const { falta, aFavor } = saldos(p);
  const vigentes = p.subpedidos.filter((s) => s.estado !== "rechazado" && s.estado !== "cancelado");
  const todoRecogido = vigentes.length > 0 && vigentes.every((s) => s.estado === "recogido");
  const algoRecogido = vigentes.some((s) => s.estado === "recogido");
  const hoy = hoyEnLima();

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className={sello}>Pedido</p>
          <h1 className="mt-2 font-mono text-3xl font-semibold tracking-tight">{p.codigo}</h1>
          {p.tipo === "encargo" && <p className="mt-1 text-sm font-medium">Pedido por encargo</p>}
          <p className="mt-1 text-sm text-gris">Hecho el {fecha(p.creado_en)}</p>
        </div>
        <EtiquetaEstado estado={p.estado} />
      </div>

      {/* Siguiente paso del pedido */}
      {abierto && todoRecogido && (
        <div className="mt-6 rounded-md border border-verde bg-blanco p-4">
          <p className="mb-3 text-sm">Todas las marcas ya fueron recogidas. Puedes enviar el pedido.</p>
          <FormAccion accion={marcarEnCamino} ocultos={{ pedido_id: id }} texto="Marcar en camino" />
        </div>
      )}
      {p.estado === "en_camino" && (
        <div className="mt-6 rounded-md border border-verde bg-blanco p-4">
          <p className="mb-3 text-sm">Al marcarlo entregado se calcula la comisión de cada marca.</p>
          <FormAccion accion={marcarEntregado} ocultos={{ pedido_id: id }} texto="Marcar entregado" />
        </div>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        {/* Partes por marca */}
        <div className="flex flex-col gap-4">
          {p.subpedidos.map((s) => (
            <section key={s.id} className="overflow-hidden rounded-md border border-linea bg-blanco">
              <header className="flex flex-wrap items-center justify-between gap-2 border-b border-linea px-4 py-3 sm:px-5">
                <h2 className="font-semibold">{s.marcas?.nombre_comercial}</h2>
                <EtiquetaEstado estado={s.estado} />
              </header>
              <ul>
                {s.items.map((i, n) => (
                  <li key={n} className="flex justify-between gap-4 border-b border-linea px-4 py-2.5 text-sm sm:px-5">
                    <span>
                      <span className="font-mono">{i.cajas} ×</span> {i.productos?.nombre}
                      <span className="ml-2 font-mono text-xs text-gris">{soles(i.precio_caja_centimos)}/caja</span>
                      {p.tipo === "encargo" && i.cajas_reservadas > 0 && (s.estado === "por_confirmar" || s.estado === "pendiente") && (
                        <span className="block text-xs text-gris">
                          {i.cajas_reservadas === i.cajas
                            ? "Apartadas del stock"
                            : `${i.cajas_reservadas} apartadas del stock · ${i.cajas - i.cajas_reservadas} por producir`}
                        </span>
                      )}
                    </span>
                    <span className="font-mono">{soles(i.subtotal_centimos)}</span>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap justify-between gap-2 bg-papel px-4 py-2.5 text-xs text-gris sm:px-5">
                <span>
                  {s.total_cajas} cajas · <span className="font-mono">{soles(s.total_centimos)}</span>
                </span>
                <span>
                  {s.estado === "entregado"
                    ? s.exento_comision
                      ? "Comisión: S/ 0.00 (primeras 3 entregas)"
                      : `Comisión: ${soles(s.comision_centimos)} (${s.comision_pct_aplicada}%)`
                    : `Comisión ${s.comision_pct_aplicada}% al entregar`}
                </span>
              </div>
              {s.motivo_rechazo && (
                <p className="border-t border-linea px-4 py-2.5 text-sm sm:px-5">
                  <span className="text-gris">Motivo:</span> {s.motivo_rechazo}
                </p>
              )}

              {/* Acciones de esta parte */}
              {s.estado === "por_confirmar" && (
                <div className="border-t border-linea px-4 py-3 text-sm text-gris sm:px-5">
                  Encargo: esperando que la marca confirme si puede hacerlo y para cuándo.
                  <details className="mt-2">
                    <summary className="cursor-pointer hover:text-tinta">Cancelar esta parte</summary>
                    <FormAccion accion={cancelarSubpedido} ocultos={{ subpedido_id: s.id }} texto="Cancelar parte" variante="secundario" className="mt-3">
                      <input name="motivo" required minLength={5} placeholder="Motivo" className={`${campo} h-10 w-64`} />
                    </FormAccion>
                  </details>
                </div>
              )}
              {s.fecha_disponible && (s.estado === "pendiente" || s.estado === "listo_recojo") && (
                <p className="border-t border-linea px-4 py-2.5 text-sm sm:px-5">
                  Encargo: la marca lo tendrá listo el <span className="font-mono">{fecha(s.fecha_disponible)}</span>.
                </p>
              )}
              {(s.estado === "pendiente" || s.estado === "listo_recojo") && (
                <div className="flex flex-col gap-4 border-t border-linea px-4 py-4 sm:px-5">
                  <div className="flex flex-wrap items-end gap-4">
                    <FormAccion accion={fijarRecojo} ocultos={{ subpedido_id: s.id }} texto="Guardar fecha" variante="secundario">
                      <label className="flex flex-col gap-1.5">
                        <span className="text-xs font-medium text-gris">Fecha de recojo</span>
                        <input
                          name="fecha"
                          type="date"
                          min={hoy}
                          defaultValue={s.fecha_recojo ?? ""}
                          required
                          className={`${campo} h-10 w-44 font-mono`}
                        />
                      </label>
                    </FormAccion>
                    {s.estado === "listo_recojo" && (
                      <FormAccion accion={marcarRecogido} ocultos={{ subpedido_id: s.id }} texto="Marcar recogido" />
                    )}
                  </div>
                  {s.estado === "pendiente" && <p className="text-xs text-gris">La marca aún no la marcó como lista.</p>}
                  <details className="text-sm">
                    <summary className="cursor-pointer text-gris hover:text-tinta">Cancelar esta parte</summary>
                    <FormAccion
                      accion={cancelarSubpedido}
                      ocultos={{ subpedido_id: s.id }}
                      texto="Cancelar parte"
                      variante="secundario"
                      className="mt-3"
                    >
                      <input name="motivo" required minLength={5} placeholder="Motivo" className={`${campo} h-10 w-64`} />
                    </FormAccion>
                  </details>
                </div>
              )}
            </section>
          ))}
        </div>

        {/* Comprador, entrega, totales y pago */}
        <aside className="flex h-fit flex-col gap-4 text-sm">
          <div className="rounded-md border border-linea bg-blanco p-5">
            <h2 className={sello}>Comprador</h2>
            <p className="mt-3 font-medium">{p.perfiles?.empresa}</p>
            <p>{p.perfiles?.nombre}</p>
            <p className="font-mono text-gris">{p.perfiles?.whatsapp}</p>
            {p.perfiles?.tipo_negocio && <p className="text-gris">{TIPO_NEGOCIO[p.perfiles.tipo_negocio]}</p>}
            {p.perfiles?.ruc && <p className="font-mono text-gris">RUC {p.perfiles.ruc}</p>}
          </div>

          <div className="rounded-md border border-linea bg-blanco p-5">
            <h2 className={sello}>Entrega</h2>
            <p className="mt-3 font-mono">{fecha(p.fecha_entrega_deseada)}</p>
            <p className="mt-2">
              {p.direccion_entrega}
              {p.direccion_detalle && `, ${p.direccion_detalle}`}
            </p>
            {p.distrito && (
              <p>
                {p.distrito}
                {p.codigo_postal && <span className="font-mono"> · {p.codigo_postal}</span>}
              </p>
            )}
            {p.referencia && <p className="text-gris">Ref.: {p.referencia}</p>}
            {p.recibe_nombre && (
              <p className="mt-2">
                Recibe: {p.recibe_nombre} · <span className="font-mono">{p.recibe_telefono}</span>
              </p>
            )}
            {p.nota && <p className="mt-2 text-gris">Nota: {p.nota}</p>}
            {(p.evento_nombre || p.invitados) && (
              <p className="mt-2 text-gris">
                {p.evento_nombre}
                {p.evento_tipo && ` · ${p.evento_tipo}`}
                {p.evento_fecha && ` · ${fecha(p.evento_fecha)}`}
                {p.invitados && ` · ${p.invitados} invitados`}
              </p>
            )}
          </div>

          <div className="rounded-md border border-linea bg-blanco p-5">
            <div className="flex justify-between">
              <span className="text-gris">Total</span>
              <span className="font-mono font-semibold">{soles(p.total_centimos)}</span>
            </div>
            <div className="mt-4 flex flex-col gap-2 border-t border-linea pt-4">
              {p.pagado_centimos > 0 && (
                <p>
                  Pagado {soles(p.pagado_centimos)}
                  {p.pago_metodo && <span> con {nombreMetodo(p.pago_metodo)}</span>}
                  {p.pagado_en && <span className="text-gris"> el {fecha(p.pagado_en)}</span>}
                </p>
              )}
              {aFavor > 0 && (
                <p className="border-l-2 border-verde pl-2">
                  A devolver al comprador: <span className="font-mono">{soles(aFavor)}</span> (por fuera de la app)
                </p>
              )}
              {p.estado === "por_confirmar" ? (
                <p className="text-gris">Se paga cuando las marcas confirmen el encargo.</p>
              ) : p.estado === "cancelado" ? (
                <p className="text-gris">Pedido cancelado.</p>
              ) : falta > 0 ? (
                <>
                  <p className="font-medium">Falta pagar {soles(falta)}</p>
                  <FormAccion accion={marcarPagado} ocultos={{ pedido_id: id }} texto="Marcar pagado">
                    <label className="flex flex-col gap-1.5">
                      <span className="text-xs font-medium text-gris">Método</span>
                      <select name="metodo" required defaultValue="" className={`${campo} h-10 w-40`}>
                        <option value="" disabled>
                          Elige
                        </option>
                        {METODOS_PAGO_ADMIN.map((m) => (
                          <option key={m.valor} value={m.valor}>
                            {m.texto}
                          </option>
                        ))}
                      </select>
                    </label>
                  </FormAccion>
                </>
              ) : null}
            </div>
          </div>

          {cancelable && !algoRecogido && (
            <details className="rounded-md border border-linea bg-blanco p-5">
              <summary className="cursor-pointer text-gris hover:text-tinta">Cancelar todo el pedido</summary>
              <p className="mt-3 text-xs text-gris">El stock de todas las marcas vuelve. Avísale al comprador por fuera de la app.</p>
              <FormAccion accion={cancelarPedido} ocultos={{ pedido_id: id }} texto="Cancelar pedido" variante="secundario" className="mt-3">
                <input name="motivo" required minLength={5} placeholder="Motivo" className={`${campo} h-10 w-full`} />
              </FormAccion>
            </details>
          )}
        </aside>
      </div>
    </>
  );
}
