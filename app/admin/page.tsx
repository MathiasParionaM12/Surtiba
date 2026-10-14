import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EsqueletoPagina } from "@/components/Esqueleto";
import { sello } from "@/lib/estilos";
import { inicioMesLima, mesActual, soles } from "@/lib/formato";
import { exigirRol } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Inicio · Panel Surtiba" };

export default function PaginaInicioAdmin() {
  return (
    <Suspense fallback={<EsqueletoPagina />}>
      <Inicio />
    </Suspense>
  );
}

async function Inicio() {
  const usuario = await exigirRol("admin");
  const supabase = await createClient();
  const inicioMes = inicioMesLima();

  // RLS: el admin ve todo
  const [{ data: entregadas }, { data: pedidosMes }, solicitudes, listas, { data: abiertos }, pagos] = await Promise.all([
    supabase.from("subpedidos").select("total_cajas, comision_centimos").eq("estado", "entregado").gte("entregado_en", inicioMes),
    supabase.from("pedidos").select("comprador_id, estado").gte("creado_en", inicioMes),
    supabase.from("solicitudes_marca").select("*", { count: "exact", head: true }).eq("estado", "pendiente"),
    supabase.from("subpedidos").select("*", { count: "exact", head: true }).eq("estado", "listo_recojo"),
    supabase.from("pedidos").select("id, estado, subpedidos(estado)").in("estado", ["recibido", "en_preparacion", "en_camino"]),
    supabase.from("pedidos").select("*", { count: "exact", head: true }).eq("pago_estado", "pendiente").neq("estado", "cancelado"),
  ]);

  // Métrica principal: cajas vendidas del mes = cajas de subpedidos ENTREGADOS este mes
  const cajasMes = (entregadas ?? []).reduce((s, x) => s + x.total_cajas, 0);
  const comisionMes = (entregadas ?? []).reduce((s, x) => s + x.comision_centimos, 0);
  const pedidosVigentes = (pedidosMes ?? []).filter((p) => p.estado !== "cancelado");
  const compradoresActivos = new Set(pedidosVigentes.map((p) => p.comprador_id)).size;

  // Pedidos listos para salir: todas sus partes vigentes recogidas
  const paraSalir = (abiertos ?? []).filter((p) => {
    const vigentes = p.subpedidos.filter((s) => s.estado !== "rechazado" && s.estado !== "cancelado");
    return p.estado !== "en_camino" && vigentes.length > 0 && vigentes.every((s) => s.estado === "recogido");
  }).length;
  const enCamino = (abiertos ?? []).filter((p) => p.estado === "en_camino").length;

  const tareas = [
    { cantidad: solicitudes.count ?? 0, texto: "solicitudes de marca por revisar", href: "/admin/marcas" },
    { cantidad: listas.count ?? 0, texto: "órdenes listas para recoger", href: "/admin/logistica" },
    { cantidad: paraSalir, texto: "pedidos completos para enviar", href: "/admin/logistica" },
    { cantidad: enCamino, texto: "pedidos en camino por entregar", href: "/admin/logistica" },
    { cantidad: pagos.count ?? 0, texto: "pedidos con pago pendiente", href: "/admin/pedidos?pago=pendiente" },
  ];

  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Hola, {usuario.nombre ?? "equipo Surtiba"}</h1>
      <p className="mt-2 text-gris">Así va {mesActual()}.</p>

      <div className="mt-6 grid grid-cols-2 overflow-hidden rounded-md border border-linea bg-blanco lg:grid-cols-4">
        <div className="border-r border-b border-linea p-5 lg:border-b-0">
          {/* Resaltador: un solo uso por pantalla, en la métrica principal */}
          <p className="font-mono text-3xl font-medium">
            <span className="bg-[linear-gradient(var(--color-resaltador),var(--color-resaltador))] bg-[length:100%_0.3em] bg-[position:0_92%] bg-no-repeat">
              {cajasMes}
            </span>
          </p>
          <p className="mt-1 text-sm text-gris">Cajas vendidas del mes</p>
        </div>
        <div className="border-b border-linea p-5 lg:border-r lg:border-b-0">
          <p className="font-mono text-2xl font-medium sm:text-3xl">{pedidosVigentes.length}</p>
          <p className="mt-1 text-sm text-gris">Pedidos del mes</p>
        </div>
        <div className="border-r border-linea p-5">
          <p className="font-mono text-2xl font-medium sm:text-3xl">{compradoresActivos}</p>
          <p className="mt-1 text-sm text-gris">Compradores activos</p>
        </div>
        <div className="p-5">
          <p className="font-mono text-2xl font-medium sm:text-3xl">{soles(comisionMes)}</p>
          <p className="mt-1 text-sm text-gris">Comisión del mes</p>
        </div>
      </div>
      <p className="mt-2 text-xs text-gris">Cajas y comisión cuentan solo lo entregado este mes.</p>

      <section className="mt-10">
        <h2 className={sello}>Para hacer</h2>
        <ul className="mt-3 overflow-hidden rounded-md border border-linea bg-blanco">
          {tareas.map((t) => (
            <li key={t.texto} className="border-b border-linea last:border-b-0">
              <Link href={t.href} className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-papel">
                <span className={t.cantidad === 0 ? "text-gris" : ""}>
                  <span className="font-mono font-medium">{t.cantidad}</span> {t.texto}
                </span>
                {t.cantidad > 0 && <span className="text-sm font-medium text-verde">Ver →</span>}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
