import { Package } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Carga } from "@/components/Carga";
import { EsqueletoTabla } from "@/components/Esqueleto";
import { EtiquetaEstado } from "@/components/EtiquetaEstado";
import { sello } from "@/lib/estilos";
import { fecha, soles } from "@/lib/formato";
import { rutaInicio } from "@/lib/roles";
import { obtenerUsuario } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";
import { EstadoVacio } from "@/components/EstadoVacio";

export const metadata: Metadata = { title: "Mis pedidos · Surtiba" };

export default function PaginaPedidos() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-8 sm:py-14">
      <p className={sello}>Seguimiento</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Mis pedidos</h1>
      <Carga fallback={<EsqueletoTabla filas={3} />}>
        <ListaPedidos />
      </Carga>
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
    .select("id, codigo, estado, tipo, total_centimos, pagado_centimos, creado_en, fecha_entrega_deseada, evento_nombre, subpedidos(total_cajas, estado)")
    .order("creado_en", { ascending: false });

  if (!pedidos || pedidos.length === 0) {
    return (
      <EstadoVacio icono={Package} texto="Aún no tienes pedidos. Explora el catálogo para armar el primero." accion={{ href: "/catalogo", texto: "Ir al catálogo" }} />
    );
  }

  return (
    <ul className="escalonado mt-8 flex flex-col gap-3">
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
                <p className="font-mono font-medium">
                  {p.codigo}
                  {p.tipo === "encargo" && (
                    <span className="ml-2 rounded-sm border border-linea px-1.5 py-0.5 font-sans text-[11px] font-normal text-gris">Encargo</span>
                  )}
                </p>
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
              <div className="col-span-2 flex flex-col items-start gap-1 sm:col-span-1">
                <EtiquetaEstado estado={p.estado} />
                {p.estado !== "cancelado" && p.estado !== "por_confirmar" && p.total_centimos > p.pagado_centimos && (
                  <span className="text-xs font-medium">Por pagar: {soles(p.total_centimos - p.pagado_centimos)}</span>
                )}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
