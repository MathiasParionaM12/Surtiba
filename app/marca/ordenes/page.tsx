import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EsqueletoTabla } from "@/components/Esqueleto";
import { EtiquetaEstado } from "@/components/EtiquetaEstado";
import { sello } from "@/lib/estilos";
import { fecha, soles } from "@/lib/formato";
import { exigirRol } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Órdenes · Panel de marca · Surtiba" };

export default function PaginaOrdenes() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Órdenes de Surtiba</h1>
      <p className="mt-2 max-w-2xl text-gris">
        Surtiba recoge en tu local y entrega al cliente. Por eso aquí no ves datos del comprador.
      </p>
      <Suspense fallback={<EsqueletoTabla filas={4} />}>
        <ListaOrdenes />
      </Suspense>
    </>
  );
}

async function ListaOrdenes() {
  await exigirRol("marca");
  const supabase = await createClient();
  const { data } = await supabase
    .from("subpedidos")
    .select("id, codigo, estado, total_cajas, total_centimos, fecha_recojo, creado_en, items(cajas, productos(nombre))")
    .order("creado_en", { ascending: false });

  // Las pendientes van primero
  const ordenes = [...(data ?? [])].sort((a, b) => Number(b.estado === "pendiente") - Number(a.estado === "pendiente"));

  if (ordenes.length === 0) {
    return (
      <p className="mt-6 rounded-md border border-linea bg-blanco p-5 text-gris">
        Aún no tienes órdenes. Cuando un cliente pida tus productos, aparecerán aquí.
      </p>
    );
  }

  return (
    <div className="mt-6 overflow-x-auto rounded-md border border-linea bg-blanco">
      <table className="w-full min-w-[680px] text-sm">
        <thead>
          <tr className="border-b border-linea text-left">
            <th className={`${sello} px-4 py-3 font-medium`}>Código</th>
            <th className={`${sello} px-4 py-3 font-medium`}>Productos</th>
            <th className={`${sello} px-4 py-3 text-right font-medium`}>Cajas</th>
            <th className={`${sello} px-4 py-3 text-right font-medium`}>Total</th>
            <th className={`${sello} px-4 py-3 font-medium`}>Recojo</th>
            <th className={`${sello} px-4 py-3 font-medium`}>Estado</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {ordenes.map((o) => (
            <tr key={o.id} className="border-b border-linea last:border-b-0">
              <td className="px-4 py-3 font-mono">{o.codigo}</td>
              <td className="px-4 py-3">
                {o.items.map((i, n) => (
                  <p key={n}>
                    <span className="font-mono">{i.cajas} ×</span> {i.productos?.nombre}
                  </p>
                ))}
              </td>
              <td className="px-4 py-3 text-right font-mono">{o.total_cajas}</td>
              <td className="px-4 py-3 text-right font-mono whitespace-nowrap">{soles(o.total_centimos)}</td>
              <td className="px-4 py-3 font-mono whitespace-nowrap text-gris">
                {o.fecha_recojo ? fecha(o.fecha_recojo) : "Por definir"}
              </td>
              <td className="px-4 py-3">
                <EtiquetaEstado estado={o.estado} />
              </td>
              <td className="px-4 py-3 text-right">
                <Link href={`/marca/ordenes/${o.id}`} className="font-medium whitespace-nowrap text-verde hover:text-tinta">
                  {o.estado === "pendiente" ? "Revisar" : "Ver"}
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
