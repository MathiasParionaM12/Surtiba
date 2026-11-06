import { CircleCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Carga } from "@/components/Carga";
import { EsqueletoPagina } from "@/components/Esqueleto";
import { EstadoVacio } from "@/components/EstadoVacio";
import { sello } from "@/lib/estilos";
import { exigirRol } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Inicio · Panel Surtiba" };

// Inicio del admin: solo lo que necesita atención hoy (KISS, 5-nov-2026). Los números están en Métricas.
export default function PaginaInicioAdmin() {
  return (
    <Carga fallback={<EsqueletoPagina />}>
      <Inicio />
    </Carga>
  );
}

async function Inicio() {
  const usuario = await exigirRol("admin");
  const supabase = await createClient();

  // RLS: el admin ve todo. Solo conteos.
  const [solicitudes, reclamos, listas, { data: abiertos }, pagos, encargosMarca, encargosPago] = await Promise.all([
    supabase.from("solicitudes_marca").select("*", { count: "exact", head: true }).eq("estado", "pendiente"),
    supabase.from("reclamos").select("*", { count: "exact", head: true }).is("respuesta", null),
    supabase.from("subpedidos").select("*", { count: "exact", head: true }).eq("estado", "listo_recojo"),
    supabase.from("pedidos").select("id, estado, subpedidos(estado)").in("estado", ["recibido", "en_preparacion", "en_camino"]),
    supabase
      .from("pedidos")
      .select("*", { count: "exact", head: true })
      .eq("pago_estado", "pendiente")
      .in("estado", ["recibido", "en_preparacion", "en_camino", "entregado"]),
    supabase.from("subpedidos").select("*", { count: "exact", head: true }).eq("estado", "por_confirmar"),
    supabase.from("pedidos").select("*", { count: "exact", head: true }).eq("estado", "por_pagar"),
  ]);

  // Pedidos listos para salir: todas sus partes vigentes recogidas
  const paraSalir = (abiertos ?? []).filter((p) => {
    const vigentes = p.subpedidos.filter((s) => s.estado !== "rechazado" && s.estado !== "cancelado");
    return p.estado !== "en_camino" && vigentes.length > 0 && vigentes.every((s) => s.estado === "recogido");
  }).length;
  const enCamino = (abiertos ?? []).filter((p) => p.estado === "en_camino").length;

  const tareas = [
    { cantidad: solicitudes.count ?? 0, texto: "solicitudes de marca por revisar", href: "/admin/marcas" },
    { cantidad: reclamos.count ?? 0, texto: "hojas de reclamación por responder", href: "/admin/reclamos" },
    { cantidad: listas.count ?? 0, texto: "órdenes listas para recoger", href: "/admin/logistica" },
    { cantidad: paraSalir, texto: "pedidos completos para enviar", href: "/admin/logistica" },
    { cantidad: enCamino, texto: "pedidos en camino por entregar", href: "/admin/logistica" },
    { cantidad: encargosMarca.count ?? 0, texto: "encargos esperando respuesta de la marca", href: "/admin/pedidos?estado=por_confirmar" },
    { cantidad: encargosPago.count ?? 0, texto: "encargos confirmados esperando pago del cliente", href: "/admin/pedidos?estado=por_pagar" },
    { cantidad: pagos.count ?? 0, texto: "pedidos con pago pendiente", href: "/admin/pedidos?pago=pendiente" },
  ].filter((t) => t.cantidad > 0);

  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Hola, {usuario.nombre ?? "equipo Surtiba"}</h1>
      <p className="mt-2 text-gris">
        Esto necesita tu atención. Ventas, comisión y marcas están en{" "}
        <Link href="/admin/metricas" className="font-medium enlace text-verde hover:text-tinta">
          Métricas
        </Link>
        .
      </p>

      <section className="mt-8">
        <h2 className={sello}>Para hacer</h2>
        {tareas.length === 0 ? (
          <EstadoVacio icono={CircleCheck} texto="Todo al día: no hay nada pendiente." />
        ) : (
          <ul className="mt-3 overflow-hidden rounded-md border border-linea bg-blanco">
            {tareas.map((t) => (
              <li key={t.texto} className="border-b border-linea last:border-b-0">
                <Link href={t.href} className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-papel">
                  <span>
                    <span className="font-mono font-medium">{t.cantidad}</span> {t.texto}
                  </span>
                  <span className="text-sm font-medium text-verde">Ver →</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
