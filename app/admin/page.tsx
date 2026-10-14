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

      <Suspense fallback={<EsqueletoPagina />}>
        <MetricasCompletas />
      </Suspense>
    </>
  );
}

// ── Panel completo: totales desde el inicio, cobros, estados y detalle por marca ──
async function MetricasCompletas() {
  const supabase = await createClient();
  const [{ data: partes }, { data: pedidos }] = await Promise.all([
    supabase
      .from("subpedidos")
      .select("marca_id, estado, total_cajas, total_centimos, comision_centimos, comision_pct_aplicada, exento_comision, marcas(nombre_comercial)"),
    supabase.from("pedidos").select("estado, pago_estado, total_centimos"),
  ]);

  const entregadas = (partes ?? []).filter((s) => s.estado === "entregado");
  // Comisión que no se cobró por ser una de las 3 primeras entregas de la marca
  const exonerada = (s: (typeof entregadas)[number]) =>
    s.exento_comision ? Math.round((s.total_centimos * s.comision_pct_aplicada) / 100) : 0;

  const totales = {
    cajas: entregadas.reduce((a, s) => a + s.total_cajas, 0),
    ventas: entregadas.reduce((a, s) => a + s.total_centimos, 0),
    comision: entregadas.reduce((a, s) => a + s.comision_centimos, 0),
    exonerada: entregadas.reduce((a, s) => a + exonerada(s), 0),
  };
  const vigentes = (pedidos ?? []).filter((p) => p.estado !== "cancelado");
  const cobrado = vigentes.filter((p) => p.pago_estado === "pagado").reduce((a, p) => a + p.total_centimos, 0);
  const porCobrar = vigentes.filter((p) => p.pago_estado !== "pagado").reduce((a, p) => a + p.total_centimos, 0);

  const ESTADOS: [string, string][] = [
    ["recibido", "Recibidos"],
    ["en_preparacion", "En preparación"],
    ["en_camino", "En camino"],
    ["entregado", "Entregados"],
    ["cancelado", "Cancelados"],
  ];

  // Detalle por marca
  const porMarca = new Map<
    string,
    { nombre: string; entregas: number; cajas: number; ventas: number; comision: number; exonerada: number; enCurso: number; rechazos: number }
  >();
  for (const s of partes ?? []) {
    const m = porMarca.get(s.marca_id) ?? {
      nombre: s.marcas?.nombre_comercial ?? "",
      entregas: 0,
      cajas: 0,
      ventas: 0,
      comision: 0,
      exonerada: 0,
      enCurso: 0,
      rechazos: 0,
    };
    if (s.estado === "entregado") {
      m.entregas++;
      m.cajas += s.total_cajas;
      m.ventas += s.total_centimos;
      m.comision += s.comision_centimos;
      m.exonerada += exonerada(s);
    } else if (s.estado === "rechazado" || s.estado === "cancelado") {
      m.rechazos++;
    } else {
      m.enCurso++;
    }
    porMarca.set(s.marca_id, m);
  }
  const marcas = [...porMarca.values()].sort((a, b) => b.ventas - a.ventas || a.nombre.localeCompare(b.nombre));

  return (
    <>
      <section className="mt-10">
        <h2 className={sello}>Desde el inicio</h2>
        <div className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-linea bg-linea lg:grid-cols-3">
          {[
            [String(totales.cajas), "Cajas entregadas"],
            [soles(totales.ventas), "Ventas entregadas"],
            [soles(totales.comision), "Comisión generada"],
            [soles(totales.exonerada), "Comisión exonerada (3 primeras entregas)"],
            [soles(cobrado), "Cobrado a compradores"],
            [soles(porCobrar), "Por cobrar"],
          ].map(([valor, texto]) => (
            <div key={texto} className="bg-blanco p-4 sm:p-5">
              <p className="font-mono text-xl font-medium sm:text-2xl">{valor}</p>
              <p className="mt-1 text-xs text-gris sm:text-sm">{texto}</p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-gris">
          «Cobrado» es lo que pagaron los compradores (pedidos marcados como pagados). La comisión es lo que cada marca le debe a
          Surtiba por lo entregado.
        </p>
      </section>

      <section className="mt-10">
        <h2 className={sello}>Pedidos por estado</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {ESTADOS.map(([estado, texto]) => {
            const n = (pedidos ?? []).filter((p) => p.estado === estado).length;
            return (
              <Link
                key={estado}
                href={`/admin/pedidos?estado=${estado}`}
                className="rounded-md border border-linea bg-blanco px-4 py-2 text-sm hover:border-gris"
              >
                <span className="font-mono font-medium">{n}</span> <span className="text-gris">{texto}</span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mt-10">
        <h2 className={sello}>Por marca</h2>
        <div className="mt-3 overflow-x-auto rounded-md border border-linea bg-blanco">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-linea text-left">
                <th className={`${sello} px-4 py-3 font-medium`}>Marca</th>
                <th className={`${sello} px-4 py-3 text-right font-medium`}>Entregas</th>
                <th className={`${sello} px-4 py-3 text-right font-medium`}>Cajas</th>
                <th className={`${sello} px-4 py-3 text-right font-medium`}>Ventas</th>
                <th className={`${sello} px-4 py-3 text-right font-medium`}>Comisión</th>
                <th className={`${sello} px-4 py-3 text-right font-medium`}>Exonerada</th>
                <th className={`${sello} px-4 py-3 text-right font-medium`}>En curso</th>
                <th className={`${sello} px-4 py-3 text-right font-medium`}>No atendidas</th>
              </tr>
            </thead>
            <tbody>
              {marcas.map((m) => (
                <tr key={m.nombre} className="border-b border-linea last:border-b-0">
                  <td className="px-4 py-3">
                    {m.nombre}
                    {m.entregas < 3 && (
                      <span className="block text-xs text-gris">
                        {3 - m.entregas} {3 - m.entregas === 1 ? "entrega más" : "entregas más"} sin comisión
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{m.entregas}</td>
                  <td className="px-4 py-3 text-right font-mono">{m.cajas}</td>
                  <td className="px-4 py-3 text-right font-mono whitespace-nowrap">{soles(m.ventas)}</td>
                  <td className="px-4 py-3 text-right font-mono whitespace-nowrap">{soles(m.comision)}</td>
                  <td className="px-4 py-3 text-right font-mono whitespace-nowrap text-gris">{soles(m.exonerada)}</td>
                  <td className="px-4 py-3 text-right font-mono">{m.enCurso}</td>
                  <td className="px-4 py-3 text-right font-mono">{m.rechazos}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-gris">Solo aparecen las marcas que ya recibieron al menos un pedido.</p>
      </section>
    </>
  );
}
