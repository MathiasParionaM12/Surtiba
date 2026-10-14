import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EsqueletoTabla } from "@/components/Esqueleto";
import { EtiquetaEstado } from "@/components/EtiquetaEstado";
import { FormAccion } from "@/components/FormAccion";
import { fijarRecojo, marcarEnCamino, marcarEntregado, marcarRecogido } from "@/lib/acciones-admin";
import { campo, sello } from "@/lib/estilos";
import { fecha, hoyEnLima } from "@/lib/formato";
import { exigirRol } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Logística · Panel Surtiba" };

export default function PaginaLogistica() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Logística</h1>
      <p className="mt-2 text-gris">Recoger en cada marca, y entregar el pedido completo al comprador.</p>
      <Suspense fallback={<EsqueletoTabla filas={5} />}>
        <Logistica />
      </Suspense>
    </>
  );
}

async function Logistica() {
  await exigirRol("admin");
  const supabase = await createClient();
  const hoy = hoyEnLima();

  const [{ data: porRecoger }, { data: abiertos }] = await Promise.all([
    supabase
      .from("subpedidos")
      .select(
        "id, codigo, estado, total_cajas, fecha_recojo, pedido_id, marca_id, marcas(nombre_comercial, marcas_privado(direccion_recojo, contacto_nombre, contacto_whatsapp))",
      )
      .in("estado", ["pendiente", "listo_recojo"])
      .order("codigo"),
    supabase
      .from("pedidos")
      .select("id, codigo, estado, fecha_entrega_deseada, distrito, direccion_entrega, recibe_nombre, recibe_telefono, perfiles(empresa), subpedidos(estado)")
      .in("estado", ["recibido", "en_preparacion", "en_camino"])
      .order("fecha_entrega_deseada"),
  ]);

  // Recojos agrupados por marca: así se visita cada local una sola vez
  const marcas = new Map<string, { nombre: string; privado: { direccion_recojo: string | null; contacto_nombre: string | null; contacto_whatsapp: string | null } | null; ordenes: NonNullable<typeof porRecoger> }>();
  for (const s of porRecoger ?? []) {
    const grupo = marcas.get(s.marca_id) ?? { nombre: s.marcas?.nombre_comercial ?? "", privado: s.marcas?.marcas_privado ?? null, ordenes: [] };
    grupo.ordenes.push(s);
    marcas.set(s.marca_id, grupo);
  }

  const vigentes = (p: NonNullable<typeof abiertos>[number]) =>
    p.subpedidos.filter((s) => s.estado !== "rechazado" && s.estado !== "cancelado");
  const paraEnviar = (abiertos ?? []).filter(
    (p) => p.estado !== "en_camino" && vigentes(p).length > 0 && vigentes(p).every((s) => s.estado === "recogido"),
  );
  const enCamino = (abiertos ?? []).filter((p) => p.estado === "en_camino");

  return (
    <div className="mt-8 flex flex-col gap-12">
      {/* ── Recojos ── */}
      <section>
        <h2 className="text-xl font-semibold tracking-tight">Recojos</h2>
        <p className="mt-1 text-sm text-gris">Solo se recoge lo que la marca marcó como «Listo para recojo».</p>
        {marcas.size === 0 ? (
          <p className="mt-4 rounded-md border border-linea bg-blanco p-5 text-gris">No hay órdenes por recoger.</p>
        ) : (
          <div className="mt-4 flex flex-col gap-4">
            {[...marcas.entries()].map(([marcaId, g]) => (
              <article key={marcaId} className="overflow-hidden rounded-md border border-linea bg-blanco">
                <header className="border-b border-linea px-4 py-3 sm:px-5">
                  <h3 className="font-semibold">{g.nombre}</h3>
                  <p className="text-sm text-gris">
                    {g.privado?.direccion_recojo ?? "Sin dirección de recojo"}
                    {g.privado?.contacto_nombre && ` · ${g.privado.contacto_nombre}`}
                    {g.privado?.contacto_whatsapp && <span className="font-mono"> · {g.privado.contacto_whatsapp}</span>}
                  </p>
                </header>
                <ul>
                  {g.ordenes.map((o) => (
                    <li key={o.id} className="flex flex-wrap items-end justify-between gap-3 border-b border-linea px-4 py-3 last:border-b-0 sm:px-5">
                      <div className="min-w-40">
                        <Link href={`/admin/pedidos/${o.pedido_id}`} className="font-mono font-medium text-verde hover:text-tinta">
                          {o.codigo}
                        </Link>
                        <span className="ml-2 font-mono text-xs text-gris">{o.total_cajas} cajas</span>
                        <div className="mt-1">
                          <EtiquetaEstado estado={o.estado} />
                        </div>
                      </div>
                      <div className="flex flex-wrap items-end gap-3">
                        <FormAccion accion={fijarRecojo} ocultos={{ subpedido_id: o.id }} texto="Guardar" variante="secundario">
                          <label className="flex flex-col gap-1">
                            <span className="text-xs text-gris">Recojo</span>
                            <input
                              name="fecha"
                              type="date"
                              min={hoy}
                              required
                              defaultValue={o.fecha_recojo ?? ""}
                              className={`${campo} h-10 w-40 font-mono`}
                            />
                          </label>
                        </FormAccion>
                        {o.estado === "listo_recojo" && (
                          <FormAccion accion={marcarRecogido} ocultos={{ subpedido_id: o.id }} texto="Recogido" />
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* ── Entregas ── */}
      <section>
        <h2 className="text-xl font-semibold tracking-tight">Entregas</h2>
        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          <div>
            <h3 className={sello}>Listos para enviar</h3>
            <p className="mt-1 text-xs text-gris">Todas sus marcas ya fueron recogidas.</p>
            <ListaEntregas pedidos={paraEnviar} vacio="Ningún pedido está completo todavía." accion="enviar" />
          </div>
          <div>
            <h3 className={sello}>En camino</h3>
            <p className="mt-1 text-xs text-gris">Al entregarlos se calcula la comisión.</p>
            <ListaEntregas pedidos={enCamino} vacio="No hay pedidos en camino." accion="entregar" />
          </div>
        </div>
      </section>
    </div>
  );
}

type PedidoEntrega = {
  id: string;
  codigo: string;
  fecha_entrega_deseada: string;
  distrito: string | null;
  direccion_entrega: string;
  recibe_nombre: string | null;
  recibe_telefono: string | null;
  perfiles: { empresa: string | null } | null;
};

function ListaEntregas({ pedidos, vacio, accion }: { pedidos: PedidoEntrega[]; vacio: string; accion: "enviar" | "entregar" }) {
  if (pedidos.length === 0) return <p className="mt-3 rounded-md border border-linea bg-blanco p-4 text-sm text-gris">{vacio}</p>;
  return (
    <ul className="mt-3 overflow-hidden rounded-md border border-linea bg-blanco">
      {pedidos.map((p) => (
        <li key={p.id} className="flex flex-wrap items-end justify-between gap-3 border-b border-linea px-4 py-3 last:border-b-0">
          <div className="text-sm">
            <Link href={`/admin/pedidos/${p.id}`} className="font-mono font-medium text-verde hover:text-tinta">
              {p.codigo}
            </Link>
            <span className="ml-2">{p.perfiles?.empresa}</span>
            <p className="text-gris">
              {fecha(p.fecha_entrega_deseada)} · {p.distrito ?? p.direccion_entrega}
            </p>
            {p.recibe_nombre && (
              <p className="text-xs text-gris">
                Recibe {p.recibe_nombre} · <span className="font-mono">{p.recibe_telefono}</span>
              </p>
            )}
          </div>
          {accion === "enviar" ? (
            <FormAccion accion={marcarEnCamino} ocultos={{ pedido_id: p.id }} texto="En camino" />
          ) : (
            <FormAccion accion={marcarEntregado} ocultos={{ pedido_id: p.id }} texto="Entregado" />
          )}
        </li>
      ))}
    </ul>
  );
}
