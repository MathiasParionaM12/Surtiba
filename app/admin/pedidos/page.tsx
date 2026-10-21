import type { Metadata } from "next";
import Link from "next/link";
import { Carga } from "@/components/Carga";
import { EsqueletoTabla } from "@/components/Esqueleto";
import { EtiquetaEstado } from "@/components/EtiquetaEstado";
import { esUuid } from "@/lib/catalogo";
import { botonSecundario, campo, sello } from "@/lib/estilos";
import { fecha, soles } from "@/lib/formato";
import { exigirRol } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Pedidos · Panel Surtiba" };

type Filtros = { estado?: string; marca?: string; pago?: string };
const ESTADOS = [
  ["por_confirmar", "Encargo por confirmar"],
  ["por_pagar", "Encargo por pagar"],
  ["recibido", "Recibido"],
  ["en_preparacion", "En preparación"],
  ["en_camino", "En camino"],
  ["entregado", "Entregado"],
  ["cancelado", "Cancelado"],
];

export default function PaginaPedidosAdmin({ searchParams }: PageProps<"/admin/pedidos">) {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Pedidos</h1>
      <Carga fallback={<EsqueletoTabla filas={5} />}>
        <Lista searchParams={searchParams as Promise<Filtros>} />
      </Carga>
    </>
  );
}

async function Lista({ searchParams }: { searchParams: Promise<Filtros> }) {
  const [filtros] = await Promise.all([searchParams, exigirRol("admin")]);
  const supabase = await createClient();

  // Filtro por marca: primero los pedidos donde esa marca tiene una parte
  let idsDeMarca: string[] | null = null;
  if (esUuid(filtros.marca)) {
    const { data } = await supabase.from("subpedidos").select("pedido_id").eq("marca_id", filtros.marca);
    idsDeMarca = [...new Set((data ?? []).map((s) => s.pedido_id))];
  }

  let consulta = supabase
    .from("pedidos")
    .select(
      "id, codigo, estado, tipo, total_centimos, pagado_centimos, pago_estado, creado_en, fecha_entrega_deseada, perfiles(empresa, nombre), subpedidos(estado, marcas(nombre_comercial))",
    )
    .order("creado_en", { ascending: false });
  if (filtros.estado && ESTADOS.some(([v]) => v === filtros.estado)) consulta = consulta.eq("estado", filtros.estado);
  if (filtros.pago === "pendiente" || filtros.pago === "pagado") consulta = consulta.eq("pago_estado", filtros.pago);
  if (idsDeMarca) consulta = consulta.in("id", idsDeMarca.length ? idsDeMarca : ["00000000-0000-0000-0000-000000000000"]);

  const [{ data: pedidos }, { data: marcas }] = await Promise.all([
    consulta,
    supabase.from("marcas").select("id, nombre_comercial").order("nombre_comercial"),
  ]);
  const hayFiltros = !!(filtros.estado || filtros.marca || filtros.pago);

  return (
    <>
      <form className="mt-6 flex flex-wrap items-end gap-3 rounded-md border border-linea bg-blanco p-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-gris">Estado</span>
          <select name="estado" defaultValue={filtros.estado ?? ""} className={`${campo} h-10 w-44`}>
            <option value="">Todos</option>
            {ESTADOS.map(([v, t]) => (
              <option key={v} value={v}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-gris">Marca</span>
          <select name="marca" defaultValue={filtros.marca ?? ""} className={`${campo} h-10 w-52`}>
            <option value="">Todas</option>
            {(marcas ?? []).map((m) => (
              <option key={m.id} value={m.id}>
                {m.nombre_comercial}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-gris">Pago</span>
          <select name="pago" defaultValue={filtros.pago ?? ""} className={`${campo} h-10 w-36`}>
            <option value="">Todos</option>
            <option value="pendiente">Pendiente</option>
            <option value="pagado">Pagado</option>
          </select>
        </label>
        <button type="submit" className={`${botonSecundario} h-10`}>
          Filtrar
        </button>
        {hayFiltros && (
          <Link href="/admin/pedidos" className="h-10 content-center text-sm font-medium enlace text-verde hover:text-tinta">
            Quitar filtros
          </Link>
        )}
      </form>

      {!pedidos || pedidos.length === 0 ? (
        <p className="mt-6 rounded-md border border-linea bg-blanco p-5 text-gris">No hay pedidos con esos filtros.</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-md border border-linea bg-blanco">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-linea text-left">
                <th className={`${sello} px-4 py-3 font-medium`}>Código</th>
                <th className={`${sello} px-4 py-3 font-medium`}>Comprador</th>
                <th className={`${sello} px-4 py-3 font-medium`}>Marcas</th>
                <th className={`${sello} px-4 py-3 font-medium`}>Entrega</th>
                <th className={`${sello} px-4 py-3 text-right font-medium`}>Total</th>
                <th className={`${sello} px-4 py-3 font-medium`}>Estado</th>
                <th className={`${sello} px-4 py-3 font-medium`}>Pago</th>
              </tr>
            </thead>
            <tbody className="escalonado">
              {pedidos.map((p) => (
                <tr key={p.id} className="border-b border-linea last:border-b-0 hover:bg-papel">
                  <td className="px-4 py-3">
                    <Link href={`/admin/pedidos/${p.id}`} className="font-mono font-medium enlace text-verde hover:text-tinta">
                      {p.codigo}
                    </Link>
                    {p.tipo === "encargo" && <span className="ml-1.5 text-[11px] text-gris">Encargo</span>}
                    <span className="block text-xs text-gris">{fecha(p.creado_en)}</span>
                  </td>
                  <td className="px-4 py-3">{p.perfiles?.empresa ?? p.perfiles?.nombre ?? "—"}</td>
                  <td className="px-4 py-3">
                    {p.subpedidos.map((s, i) => (
                      <span
                        key={i}
                        className={`mr-1 mb-1 inline-block rounded-sm border px-1.5 py-0.5 text-xs ${
                          s.estado === "rechazado" || s.estado === "cancelado" ? "border-linea text-gris line-through" : "border-linea"
                        }`}
                      >
                        {s.marcas?.nombre_comercial}
                      </span>
                    ))}
                  </td>
                  <td className="px-4 py-3 font-mono whitespace-nowrap">{fecha(p.fecha_entrega_deseada)}</td>
                  <td className="px-4 py-3 text-right font-mono whitespace-nowrap">{soles(p.total_centimos)}</td>
                  <td className="px-4 py-3">
                    <EtiquetaEstado estado={p.estado} />
                  </td>
                  <td className="px-4 py-3 text-xs whitespace-nowrap">
                    {p.estado === "por_confirmar" ? (
                      <span className="text-gris">Al confirmar</span>
                    ) : p.pagado_centimos >= p.total_centimos && p.pagado_centimos > 0 ? (
                      "Pagado"
                    ) : p.estado === "cancelado" ? (
                      <span className="text-gris">—</span>
                    ) : (
                      <span>Falta {soles(p.total_centimos - p.pagado_centimos)}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
