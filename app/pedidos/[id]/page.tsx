import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { EsqueletoPagina } from "@/components/Esqueleto";
import { EtiquetaEstado } from "@/components/EtiquetaEstado";
import { repetirPedido } from "@/lib/acciones-pedidos";
import { esUuid } from "@/lib/catalogo";
import { botonSecundario, sello } from "@/lib/estilos";
import { fecha, soles } from "@/lib/formato";
import { rutaInicio } from "@/lib/roles";
import { obtenerUsuario } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Detalle del pedido · Surtiba" };

const PASOS = [
  { estado: "recibido", texto: "Recibido" },
  { estado: "en_preparacion", texto: "En preparación" },
  { estado: "en_camino", texto: "En camino" },
  { estado: "entregado", texto: "Entregado" },
];

export default function PaginaPedido({ params, searchParams }: PageProps<"/pedidos/[id]">) {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-8 sm:py-14">
      <Link href="/pedidos" className="text-sm font-medium text-verde hover:text-tinta">
        ← Mis pedidos
      </Link>
      <div className="mt-6">
        <Suspense fallback={<EsqueletoPagina />}>
          <DetallePedido params={params} searchParams={searchParams as Promise<{ nuevo?: string }>} />
        </Suspense>
      </div>
    </main>
  );
}

async function DetallePedido({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ nuevo?: string }>;
}) {
  const [{ id }, { nuevo }, usuario] = await Promise.all([params, searchParams, obtenerUsuario()]);
  if (!usuario) redirect("/ingresar");
  if (usuario.rol !== "comprador") redirect(rutaInicio(usuario.rol));
  if (!esUuid(id)) notFound();

  // RLS: si el pedido no es suyo, no llega nada
  const supabase = await createClient();
  const { data: p } = await supabase
    .from("pedidos")
    .select(
      "codigo, estado, creado_en, fecha_entrega_deseada, direccion_entrega, direccion_detalle, distrito, codigo_postal, referencia, recibe_nombre, recibe_telefono, nota, evento_nombre, evento_tipo, evento_fecha, invitados, subtotal_centimos, envio_centimos, total_centimos, pago_estado, subpedidos(id, estado, total_cajas, total_centimos, marcas(nombre_comercial), items(cajas, precio_caja_centimos, subtotal_centimos, productos(nombre)))",
    )
    .eq("id", id)
    .maybeSingle();
  if (!p) notFound();

  const pasoActual = PASOS.findIndex((s) => s.estado === p.estado);
  const cancelado = p.estado === "cancelado";

  return (
    <>
      {nuevo && (
        <div role="status" className="mb-8 rounded-md border border-verde bg-blanco p-5">
          <p className="font-medium">Recibimos tu pedido {p.codigo}.</p>
          <p className="mt-1 text-sm text-gris">
            Ya reservamos el stock. Surtiba lo revisará con cada marca y coordinará la entrega contigo.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className={sello}>Pedido</p>
          <h1 className="mt-2 font-mono text-3xl font-semibold tracking-tight">{p.codigo}</h1>
          <p className="mt-1 text-sm text-gris">Hecho el {fecha(p.creado_en)}</p>
        </div>
        <form action={repetirPedido}>
          <input type="hidden" name="pedido_id" value={id} />
          <button type="submit" className={botonSecundario}>
            Repetir pedido
          </button>
        </form>
      </div>

      {/* Línea de tiempo */}
      {cancelado ? (
        <p className="mt-8 border-l-2 border-rojo pl-3">Este pedido fue cancelado. Si tienes dudas, escríbenos.</p>
      ) : (
        <ol className="mt-8 grid grid-cols-4 gap-2" aria-label="Estado del pedido">
          {PASOS.map((s, i) => {
            const hecho = i <= pasoActual;
            return (
              <li key={s.estado} className="flex flex-col gap-2">
                <span className={`h-1.5 rounded-full ${hecho ? "bg-verde" : "bg-linea"}`} />
                <span className={`text-xs sm:text-sm ${hecho ? "font-medium" : "text-gris"}`}>
                  {s.texto}
                  {i === pasoActual && <span className="sr-only"> (estado actual)</span>}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        {/* Productos por marca */}
        <div className="flex flex-col gap-4">
          {p.subpedidos.map((s) => {
            const fuera = s.estado === "rechazado" || s.estado === "cancelado";
            return (
              <section key={s.id} className="overflow-hidden rounded-md border border-linea bg-blanco">
                <header className="flex flex-wrap items-center justify-between gap-2 border-b border-linea px-4 py-3 sm:px-5">
                  <h2 className="font-semibold">{s.marcas?.nombre_comercial ?? "Marca"}</h2>
                  <EtiquetaEstado estado={s.estado} />
                </header>
                {fuera && (
                  <p className="border-b border-linea bg-papel px-4 py-2.5 text-sm sm:px-5">
                    Esta parte no se entregará y no suma al total. Surtiba te contactará.
                  </p>
                )}
                <ul className={fuera ? "opacity-60" : ""}>
                  {s.items.map((i) => (
                    <li
                      key={i.productos?.nombre ?? i.precio_caja_centimos}
                      className="flex justify-between gap-4 border-b border-linea px-4 py-3 text-sm last:border-b-0 sm:px-5"
                    >
                      <span>
                        <span className="font-mono">{i.cajas} ×</span> {i.productos?.nombre ?? "Producto ya no disponible"}
                        <span className="block font-mono text-xs text-gris">{soles(i.precio_caja_centimos)} por caja</span>
                      </span>
                      <span className="font-mono">{soles(i.subtotal_centimos)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>

        {/* Entrega y totales */}
        <aside className="flex h-fit flex-col gap-4">
          <div className="rounded-md border border-linea bg-blanco p-5 text-sm">
            <h2 className={sello}>Entrega</h2>
            <p className="mt-3 font-mono">{fecha(p.fecha_entrega_deseada)}</p>
            <p className="mt-3">
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
              <p className="mt-3">
                Recibe: {p.recibe_nombre} · <span className="font-mono">{p.recibe_telefono}</span>
              </p>
            )}
            {p.nota && <p className="mt-2 text-gris">Nota: {p.nota}</p>}
            {(p.evento_nombre || p.evento_tipo || p.evento_fecha || p.invitados) && (
              <div className="mt-4 border-t border-linea pt-3 text-gris">
                {p.evento_nombre && <p className="text-tinta">{p.evento_nombre}</p>}
                {p.evento_tipo && <p>{p.evento_tipo}</p>}
                {p.evento_fecha && <p>Evento: {fecha(p.evento_fecha)}</p>}
                {p.invitados && <p>{p.invitados} invitados</p>}
              </div>
            )}
          </div>

          <div className="rounded-md border border-linea bg-blanco p-5 text-sm">
            <dl className="flex flex-col gap-2">
              <div className="flex justify-between">
                <dt className="text-gris">Subtotal</dt>
                <dd className="font-mono">{soles(p.subtotal_centimos)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gris">Envío</dt>
                <dd className="font-mono">{soles(p.envio_centimos)}</dd>
              </div>
              <div className="flex justify-between border-t border-linea pt-3 text-base">
                <dt className="font-medium">Total</dt>
                <dd className="font-mono font-semibold">{soles(p.total_centimos)}</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-gris">
              Pago: {p.pago_estado === "pagado" ? "recibido" : "pendiente (Surtiba lo coordina contigo)"}
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
