import type { Metadata } from "next";
import Link from "next/link";
import { Carga } from "@/components/Carga";
import { EsqueletoPagina } from "@/components/Esqueleto";
import { sello } from "@/lib/estilos";
import { inicioMesLima, mesActual, mesAnterior } from "@/lib/formato";
import { exigirRol } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";
import { Contador } from "@/components/Contador";
import { MiniGrafico, porSemana } from "@/components/MiniGrafico";

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
  const [{ data: marca }, { data: ordenes }, { data: productos }, { data: insightsData }] = await Promise.all([
    supabase.from("marcas").select("nombre_comercial").eq("id", usuario.marcaId!).single(),
    supabase
      .from("subpedidos")
      .select("id, codigo, estado, total_cajas, total_centimos, comision_centimos, entregado_en, creado_en")
      .order("creado_en", { ascending: false }),
    supabase.from("productos").select("id, nombre, stock_cajas, activo").order("nombre"),
    // KPIs calculados en la base (solo totales de esta marca, nunca datos de compradores)
    supabase.rpc("marca_insights"),
  ]);
  const insights = insightsData as unknown as Insights | null;

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
  // Últimas 4 semanas de lo entregado (mini gráfico bajo los números)
  const entregadas = (ordenes ?? []).filter((o) => o.estado === "entregado");
  const cajasSemanas = porSemana(
    entregadas,
    (o) => o.entregado_en,
    (o) => o.total_cajas,
  );
  const ventasSemanas = porSemana(
    entregadas,
    (o) => o.entregado_en,
    (o) => o.total_centimos,
  );

  const hoy = insights?.hoy;
  const tareas = [
    { cantidad: hoy?.por_confirmar ?? 0, texto: "encargos por responder", href: "/marca/ordenes" },
    { cantidad: hoy?.por_preparar ?? 0, texto: "órdenes por preparar", href: "/marca/ordenes" },
    { cantidad: hoy?.esperando_recojo ?? 0, texto: "listas esperando recojo", href: "/marca/ordenes" },
  ];

  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{marca?.nombre_comercial}</h1>

      {/* Hoy: lo que hay que hacer */}
      <section className="mt-6" aria-label="Qué hacer hoy">
        <h2 className={sello}>Hoy</h2>
        <ul className="escalonado mt-3 grid gap-2 sm:grid-cols-3">
          {tareas.map((t) => (
            <li key={t.texto}>
              <Link
                href={t.href}
                className={`flex items-baseline gap-2 rounded-md border bg-blanco px-4 py-3 transition-colors hover:border-gris ${t.cantidad > 0 ? "border-tinta" : "border-linea text-gris"}`}
              >
                <span className="font-mono text-2xl font-semibold">
                  <Contador valor={t.cantidad} />
                </span>
                <span className="text-sm">{t.texto}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-8 text-gris">Tus números de {mesActual()}. Solo cuentan los pedidos ya entregados.</p>

      <div className="mt-6 grid grid-cols-2 overflow-hidden rounded-md border border-linea bg-blanco lg:grid-cols-4">
        <div className="border-r border-b border-linea p-5 lg:border-b-0">
          {/* Resaltador: un solo uso por pantalla, en la métrica principal */}
          <p className="font-mono text-3xl font-medium">
            <span className="bg-[linear-gradient(var(--color-resaltador),var(--color-resaltador))] bg-[length:100%_0.3em] bg-[position:0_92%] bg-no-repeat">
              <Contador valor={cajasMes} />
            </span>
          </p>
          <p className="mt-1 text-sm text-gris">Cajas vendidas del mes</p>
          <Comparacion ahora={cajasMes} antes={insights?.mes_anterior.cajas ?? 0} />
          <MiniGrafico valores={cajasSemanas} descripcion={`Cajas entregadas en las últimas 4 semanas: ${cajasSemanas.join(", ")}`} />
        </div>
        <div className="border-b border-linea p-5 lg:border-r lg:border-b-0">
          <p className="font-mono text-2xl font-medium sm:text-3xl">
            <Contador valor={ventasMes} tipo="soles" />
          </p>
          <p className="mt-1 text-sm text-gris">Ventas del mes</p>
          <Comparacion ahora={ventasMes} antes={insights?.mes_anterior.ventas ?? 0} />
          <MiniGrafico valores={ventasSemanas} descripcion="Ventas entregadas en las últimas 4 semanas" />
        </div>
        <div className="border-r border-linea p-5">
          <p className="font-mono text-2xl font-medium sm:text-3xl">
            <Contador valor={comisionMes} tipo="soles" />
          </p>
          <p className="mt-1 text-sm text-gris">Comisión por pagar</p>
        </div>
        <div className="p-5">
          <p className="font-mono text-2xl font-medium sm:text-3xl">
            <Contador valor={pendientes.length} />
          </p>
          <p className="mt-1 text-sm text-gris">Órdenes pendientes</p>
        </div>
      </div>
      <p className="mt-2 text-xs text-gris">Tus primeros 3 pedidos entregados no pagan comisión.</p>

      {/* Para vender más: lo que dicen tus datos (calculado en la base, solo tus totales) */}
      {insights && (
        <section className="mt-10">
          <h2 className={sello}>Para vender más</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <Tarjeta titulo="Tus productos estrella" nota="Cajas entregadas en 90 días">
              {insights.estrella.length === 0 ? (
                <p className="text-sm text-gris">Aún no hay entregas en los últimos 90 días.</p>
              ) : (
                <ol className="flex flex-col gap-1.5 text-sm">
                  {insights.estrella.map((p, i) => (
                    <li key={p.nombre} className="flex justify-between gap-3">
                      <span>
                        <span className="mr-2 font-mono text-xs text-gris">0{i + 1}</span>
                        {p.nombre}
                      </span>
                      <span className="font-mono">{p.cajas} cajas</span>
                    </li>
                  ))}
                </ol>
              )}
            </Tarjeta>
            <Tarjeta titulo="Te pidieron por encargo" nota="Más de lo que tenías en stock, en 30 días">
              {insights.demanda_encargo.length === 0 ? (
                <p className="text-sm text-gris">Nadie pidió más de tu stock este mes. Bien.</p>
              ) : (
                <>
                  <p className="text-sm">
                    <strong className="font-mono font-medium">{insights.demanda_encargo[0].cajas} cajas</strong> de{" "}
                    {insights.demanda_encargo[0].nombre}
                    {insights.demanda_encargo.length > 1 &&
                      `, y ${insights.demanda_encargo
                        .slice(1)
                        .map((p) => `${p.cajas} de ${p.nombre}`)
                        .join(" y ")}`}
                    . Con más stock, eso se vende como compra directa y sale antes.
                  </p>
                  <Link href="/marca/stock" className="enlace mt-2 inline-block text-sm font-medium text-verde hover:text-tinta">
                    Actualizar stock →
                  </Link>
                </>
              )}
            </Tarjeta>
            <Tarjeta titulo="En cotizaciones de eventos" nota="Últimos 30 días">
              <p className="text-sm">
                {insights.cotizaciones === 0 ? (
                  <span className="text-gris">
                    Tus productos aún no salen en cotizaciones. Precios por volumen claros ayudan a que el cotizador los recomiende.
                  </span>
                ) : (
                  <>
                    Tus productos salieron en <strong className="font-mono font-medium">{insights.cotizaciones}</strong>{" "}
                    {insights.cotizaciones === 1 ? "cotización" : "cotizaciones"} de eventos.
                  </>
                )}
              </p>
            </Tarjeta>
            <Tarjeta titulo="Tu cumplimiento" nota="Últimos 90 días">
              <dl className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <dt className="text-xs text-gris">Encargos aceptados</dt>
                  <dd className="font-mono text-lg">{insights.cumplimiento.encargos_aceptados}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gris">No atendidas</dt>
                  <dd className="font-mono text-lg">{insights.cumplimiento.no_atendidas}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gris">Días hasta «Listo»</dt>
                  <dd className="font-mono text-lg">{insights.cumplimiento.dias_hasta_listo ?? "—"}</dd>
                </div>
              </dl>
            </Tarjeta>
          </div>
        </section>
      )}

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
            <p className="mt-3 rounded-md border border-linea bg-blanco p-4 text-sm text-gris">Todos tus productos activos tienen stock.</p>
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

type Insights = {
  hoy: { por_confirmar: number; por_preparar: number; esperando_recojo: number };
  mes_anterior: { ventas: number; cajas: number; entregas: number };
  cumplimiento: { encargos_aceptados: number; no_atendidas: number; dias_hasta_listo: number | null };
  estrella: { nombre: string; cajas: number }[];
  demanda_encargo: { nombre: string; cajas: number }[];
  cotizaciones: number;
};

// Una tarjeta de "Para vender más"
function Tarjeta({ titulo, nota, children }: { titulo: string; nota: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-linea bg-blanco p-5">
      <p className="font-medium">{titulo}</p>
      <p className="mb-3 text-xs text-gris">{nota}</p>
      {children}
    </div>
  );
}

// "↑ 20 % vs septiembre": cómo va este mes frente al anterior
function Comparacion({ ahora, antes }: { ahora: number; antes: number }) {
  if (antes === 0) {
    return <p className="mt-1 text-xs text-gris">{ahora > 0 ? `Sin entregas en ${mesAnterior()}` : "Aún sin entregas"}</p>;
  }
  const cambio = Math.round(((ahora - antes) / antes) * 100);
  const sube = cambio >= 0;
  return (
    <p className={`mt-1 font-mono text-xs ${sube ? "text-verde" : "text-gris"}`}>
      {sube ? "↑" : "↓"} {Math.abs(cambio)} % vs {mesAnterior()}
    </p>
  );
}
