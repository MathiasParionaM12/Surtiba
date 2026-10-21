import type { Metadata } from "next";
import Link from "next/link";
import { Carga } from "@/components/Carga";
import { EsqueletoPagina } from "@/components/Esqueleto";
import { sello } from "@/lib/estilos";
import { inicioMesLima, mesActual } from "@/lib/formato";
import { exigirRol } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";
import { Contador } from "@/components/Contador";

export const metadata: Metadata = { title: "Resumen · Panel de marca · Surtiba" };

export default function PaginaResumenMarca() {
  return (
    <Carga fallback={<EsqueletoPagina />}>
      <Resumen />
    </Carga>
  );
}

async function Resumen() {
  const usuario = await exigirRol("marca");

  // RLS: la marca recibe solo sus subpedidos y sus productos
  const supabase = await createClient();
  const [{ data: marca }, { data: ordenes }, { data: productos }] = await Promise.all([
    supabase.from("marcas").select("nombre_comercial").eq("id", usuario.marcaId!).single(),
    supabase
      .from("subpedidos")
      .select("id, codigo, estado, total_cajas, total_centimos, comision_centimos, entregado_en, creado_en")
      .order("creado_en", { ascending: false }),
    supabase.from("productos").select("id, nombre, stock_cajas, activo").order("nombre"),
  ]);

  // Mis números del mes: solo cuenta lo ENTREGADO este mes (docs/modelo-datos.md, "Métrica principal")
  const inicioMes = new Date(inicioMesLima()).getTime();
  const entregadasMes = (ordenes ?? []).filter(
    (o) => o.estado === "entregado" && o.entregado_en && new Date(o.entregado_en).getTime() >= inicioMes,
  );
  const cajasMes = entregadasMes.reduce((s, o) => s + o.total_cajas, 0);
  const ventasMes = entregadasMes.reduce((s, o) => s + o.total_centimos, 0);
  const comisionMes = entregadasMes.reduce((s, o) => s + o.comision_centimos, 0);
  // Encargos por confirmar primero, luego órdenes pendientes
  const pendientes = (ordenes ?? [])
    .filter((o) => o.estado === "pendiente" || o.estado === "por_confirmar")
    .sort((a, b) => Number(b.estado === "por_confirmar") - Number(a.estado === "por_confirmar"));
  const agotados = (productos ?? []).filter((p) => p.activo && p.stock_cajas === 0);

  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{marca?.nombre_comercial}</h1>
      <p className="mt-2 text-gris">Tus números de {mesActual()}. Solo cuentan los pedidos ya entregados.</p>

      <div className="mt-6 grid grid-cols-2 overflow-hidden rounded-md border border-linea bg-blanco lg:grid-cols-4">
        <div className="border-r border-b border-linea p-5 lg:border-b-0">
          {/* Resaltador: un solo uso por pantalla, en la métrica principal */}
          <p className="font-mono text-3xl font-medium">
            <span className="bg-[linear-gradient(var(--color-resaltador),var(--color-resaltador))] bg-[length:100%_0.3em] bg-[position:0_92%] bg-no-repeat">
              <Contador valor={cajasMes} />
            </span>
          </p>
          <p className="mt-1 text-sm text-gris">Cajas vendidas del mes</p>
        </div>
        <div className="border-b border-linea p-5 lg:border-r lg:border-b-0">
          <p className="font-mono text-2xl font-medium sm:text-3xl"><Contador valor={ventasMes} tipo="soles" /></p>
          <p className="mt-1 text-sm text-gris">Ventas del mes</p>
        </div>
        <div className="border-r border-linea p-5">
          <p className="font-mono text-2xl font-medium sm:text-3xl"><Contador valor={comisionMes} tipo="soles" /></p>
          <p className="mt-1 text-sm text-gris">Comisión por pagar</p>
        </div>
        <div className="p-5">
          <p className="font-mono text-2xl font-medium sm:text-3xl"><Contador valor={pendientes.length} /></p>
          <p className="mt-1 text-sm text-gris">Órdenes pendientes</p>
        </div>
      </div>
      <p className="mt-2 text-xs text-gris">Tus primeros 3 pedidos entregados no pagan comisión.</p>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className={sello}>Necesitan tu atención</h2>
          {pendientes.length === 0 ? (
            <p className="mt-3 rounded-md border border-linea bg-blanco p-4 text-sm text-gris">
              No tienes órdenes pendientes. Cuando un cliente pida tus productos, aparecerán aquí.
            </p>
          ) : (
            <ul className="mt-3 overflow-hidden rounded-md border border-linea bg-blanco">
              {pendientes.map((o) => (
                <li key={o.id} className="border-b border-linea last:border-b-0">
                  <Link href={`/marca/ordenes/${o.id}`} className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-papel">
                    <span>
                      <span className="font-mono font-medium">{o.codigo}</span>
                      <span className="ml-2 font-mono text-xs text-gris">{o.total_cajas} cajas</span>
                      {o.estado === "por_confirmar" && <span className="ml-2 text-xs font-medium">· Encargo por confirmar</span>}
                    </span>
                    <span className="text-sm font-medium text-verde">{o.estado === "por_confirmar" ? "Responder →" : "Revisar →"}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className={sello}>Agotados</h2>
          {agotados.length === 0 ? (
            <p className="mt-3 rounded-md border border-linea bg-blanco p-4 text-sm text-gris">
              Todos tus productos activos tienen stock.
            </p>
          ) : (
            <ul className="mt-3 overflow-hidden rounded-md border border-linea bg-blanco">
              {agotados.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-4 border-b border-linea px-4 py-3 last:border-b-0">
                  <span>{p.nombre}</span>
                  <Link href="/marca/stock" className="text-sm font-medium enlace text-verde hover:text-tinta">
                    Actualizar stock
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
