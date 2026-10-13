import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { EtiquetaEstado } from "@/components/EtiquetaEstado";
import { sello } from "@/lib/estilos";
import { soles } from "@/lib/formato";
import { rutaInicio } from "@/lib/roles";
import { obtenerUsuario } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Panel de marca · Surtiba" };

export default function PaginaMarca() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-8 sm:py-14">
      <Suspense fallback={<p className="text-gris">Cargando tu panel…</p>}>
        <PanelMarca />
      </Suspense>
    </main>
  );
}

async function PanelMarca() {
  const usuario = await obtenerUsuario();
  if (!usuario) redirect("/ingresar");
  if (usuario.rol !== "marca" || !usuario.marcaId) redirect(rutaInicio(usuario.rol));

  // RLS: la marca solo recibe SUS subpedidos y SUS productos. La tabla pedidos ni la puede leer.
  const supabase = await createClient();
  const [{ data: marca }, { data: ordenes }, { data: productos }] = await Promise.all([
    supabase.from("marcas").select("nombre_comercial, pedido_minimo_cajas").eq("id", usuario.marcaId).single(),
    supabase
      .from("subpedidos")
      .select("id, codigo, estado, total_cajas, total_centimos, fecha_recojo, items(cajas, productos(nombre))")
      .order("creado_en", { ascending: false }),
    supabase
      .from("productos")
      .select("id, nombre, activo, stock_cajas, escalas_precio(desde_cajas, precio_caja_centimos)")
      .order("nombre"),
  ]);

  const pendientes = (ordenes ?? []).filter((o) => o.estado === "pendiente").length;
  const activos = (productos ?? []).filter((p) => p.activo).length;
  const agotados = (productos ?? []).filter((p) => p.activo && p.stock_cajas === 0).length;

  return (
    <>
      <p className={sello}>Panel de marca</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{marca?.nombre_comercial}</h1>
      <p className="mt-2 max-w-2xl text-gris">
        Aquí ves las órdenes que Surtiba te hace. Surtiba recoge en tu local y entrega al cliente: por eso no ves datos del
        comprador.
      </p>

      <div className="mt-8 grid grid-cols-3 overflow-hidden rounded-md border border-linea bg-blanco">
        <Cifra valor={pendientes} texto="Órdenes pendientes" />
        <Cifra valor={activos} texto="Productos activos" />
        <Cifra valor={agotados} texto="Productos agotados" />
      </div>

      <section className="mt-12">
        <h2 className="text-xl font-semibold tracking-tight">Órdenes de Surtiba</h2>
        {ordenes && ordenes.length > 0 ? (
          <div className="mt-4 overflow-x-auto rounded-md border border-linea bg-blanco">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-linea text-left">
                  <th className={`${sello} px-4 py-3 font-medium`}>Código</th>
                  <th className={`${sello} px-4 py-3 font-medium`}>Productos</th>
                  <th className={`${sello} px-4 py-3 text-right font-medium`}>Cajas</th>
                  <th className={`${sello} px-4 py-3 text-right font-medium`}>Total</th>
                  <th className={`${sello} px-4 py-3 font-medium`}>Recojo</th>
                  <th className={`${sello} px-4 py-3 font-medium`}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {ordenes.map((o) => (
                  <tr key={o.id} className="border-b border-linea last:border-b-0">
                    <td className="px-4 py-3 font-mono">{o.codigo}</td>
                    <td className="px-4 py-3">
                      {o.items.map((i) => (
                        <p key={i.productos?.nombre}>
                          <span className="font-mono">{i.cajas} ×</span> {i.productos?.nombre}
                        </p>
                      ))}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{o.total_cajas}</td>
                    <td className="px-4 py-3 text-right font-mono whitespace-nowrap">{soles(o.total_centimos)}</td>
                    <td className="px-4 py-3 font-mono text-gris">{o.fecha_recojo ?? "Por definir"}</td>
                    <td className="px-4 py-3">
                      <EtiquetaEstado estado={o.estado} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-4 text-gris">Aún no tienes órdenes. Cuando un cliente pida tus productos, aparecerán aquí.</p>
        )}
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold tracking-tight">Tus productos y stock</h2>
        <div className="mt-4 overflow-x-auto rounded-md border border-linea bg-blanco">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-linea text-left">
                <th className={`${sello} px-4 py-3 font-medium`}>Producto</th>
                <th className={`${sello} px-4 py-3 text-right font-medium`}>Stock (cajas)</th>
                <th className={`${sello} px-4 py-3 text-right font-medium`}>Precio por caja</th>
                <th className={`${sello} px-4 py-3 font-medium`}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {(productos ?? []).map((p) => (
                <tr key={p.id} className="border-b border-linea last:border-b-0">
                  <td className="px-4 py-3">{p.nombre}</td>
                  <td className={`px-4 py-3 text-right font-mono ${p.stock_cajas === 0 ? "text-gris" : ""}`}>
                    {p.stock_cajas === 0 ? "Agotado" : p.stock_cajas}
                  </td>
                  <td className="px-4 py-3 text-right font-mono whitespace-nowrap">
                    {(() => {
                      const primero = p.escalas_precio.find((e) => e.desde_cajas === 1);
                      return primero ? soles(primero.precio_caja_centimos) : "—";
                    })()}
                  </td>
                  <td className="px-4 py-3 text-gris">{p.activo ? "Activo" : "Inactivo"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="mt-10 border-l-2 border-linea pl-3 text-sm text-gris">
        Próximamente en este panel: marcar órdenes como «Listo para recojo», editar stock, precios y productos, y ver tus
        números del mes.
      </p>
    </>
  );
}

function Cifra({ valor, texto }: { valor: number; texto: string }) {
  return (
    <div className="border-r border-linea p-4 last:border-r-0 sm:p-5">
      <p className="font-mono text-2xl font-medium sm:text-3xl">{valor}</p>
      <p className="mt-1 text-xs text-gris sm:text-sm">{texto}</p>
    </div>
  );
}
