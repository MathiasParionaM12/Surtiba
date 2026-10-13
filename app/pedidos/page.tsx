import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { EsqueletoTabla } from "@/components/Esqueleto";
import { EtiquetaEstado } from "@/components/EtiquetaEstado";
import { botonPrimario, sello } from "@/lib/estilos";
import { fecha, soles } from "@/lib/formato";
import { rutaInicio } from "@/lib/roles";
import { obtenerUsuario } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Mis pedidos · Surtiba" };

export default function PaginaPedidos() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-8 sm:py-14">
      <p className={sello}>Seguimiento</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Mis pedidos</h1>
      <Suspense fallback={<EsqueletoTabla filas={3} />}>
        <ListaPedidos />
      </Suspense>
    </main>
  );
}

async function ListaPedidos() {
  const usuario = await obtenerUsuario();
  if (!usuario) redirect("/ingresar");
  if (usuario.rol !== "comprador") redirect(rutaInicio(usuario.rol));

  // RLS: el comprador recibe solo sus pedidos
  const supabase = await createClient();
  const { data: pedidos } = await supabase
    .from("pedidos")
    .select("id, codigo, estado, total_centimos, creado_en, fecha_entrega_deseada, evento_nombre, subpedidos(total_cajas, estado)")
    .order("creado_en", { ascending: false });

  if (!pedidos || pedidos.length === 0) {
    return (
      <div className="mt-8 rounded-md border border-linea bg-blanco p-6">
        <p>Aún no tienes pedidos. Explora el catálogo para armar el primero.</p>
        <Link href="/catalogo" className={`${botonPrimario} mt-5`}>
          Ir al catálogo
        </Link>
      </div>
    );
  }

  return (
    <ul className="mt-8 flex flex-col gap-3">
      {pedidos.map((p) => {
        const vigentes = p.subpedidos.filter((s) => s.estado !== "rechazado" && s.estado !== "cancelado");
        const cajas = vigentes.reduce((s, x) => s + x.total_cajas, 0);
        return (
          <li key={p.id}>
            <Link
              href={`/pedidos/${p.id}`}
              className="grid grid-cols-2 gap-3 rounded-md border border-linea bg-blanco p-4 transition-colors hover:border-gris sm:grid-cols-[1fr_auto_auto_auto] sm:items-center sm:gap-6 sm:p-5"
            >
              <div className="col-span-2 sm:col-span-1">
                <p className="font-mono font-medium">{p.codigo}</p>
                <p className="mt-0.5 text-sm text-gris">
                  {p.evento_nombre ? `${p.evento_nombre} · ` : ""}Pedido el {fecha(p.creado_en)}
                </p>
              </div>
              <div className="text-sm">
                <p className="text-xs text-gris">Entrega</p>
                <p className="font-mono">{fecha(p.fecha_entrega_deseada)}</p>
              </div>
              <div className="text-sm sm:text-right">
                <p className="text-xs text-gris">
                  {vigentes.length} {vigentes.length === 1 ? "marca" : "marcas"} · {cajas} cajas
                </p>
                <p className="font-mono font-medium">{soles(p.total_centimos)}</p>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <EtiquetaEstado estado={p.estado} />
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
