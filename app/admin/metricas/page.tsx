import type { Metadata } from "next";
import Link from "next/link";
import { BarrasSemana } from "@/components/BarrasSemana";
import { Carga } from "@/components/Carga";
import { Contador } from "@/components/Contador";
import { EsqueletoPagina } from "@/components/Esqueleto";
import { sello } from "@/lib/estilos";
import { mesActual, mesAnterior, soles } from "@/lib/formato";
import { exigirRol } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Métricas · Panel Surtiba" };

const TIPO: Record<string, string> = {
  catering: "Catering",
  organizador_eventos: "Organizador de eventos",
  wedding_planner: "Wedding planner",
  bar_restaurante: "Bar o restaurante",
  otro: "Otro",
};
const entero = new Intl.NumberFormat("en-US");

type Insights = {
  semanas: { desde: string; ventas: number; cajas: number }[];
  mes: { ventas: number; ventas_antes: number; cajas: number; comision: number; exonerada: number };
  pedidos_mes: { creados: number; cancelados: number; ticket: number };
  embudo: {
    vio_producto: number;
    agrego_carrito: number;
    inicio_pedido: number;
    pedidos: number;
    pagados: number;
    entregados: number;
    cotizaciones: number;
    cotizaciones_con_pedido: number;
  };
  operacion: {
    horas_hasta_listo: number | null;
    horas_listo_a_recogido: number | null;
    horas_recogido_a_entregado: number | null;
    entregas_atrasadas: number;
    encargos_sin_respuesta_2d: number;
    listas_sin_recoger_1d: number;
  };
  marcas: { nombre: string; ventas: number; cajas: number; ordenes: number; no_atendidas: number; agotados: number }[];
  compradores: {
    activos_mes: number;
    nuevos_mes: number;
    recurrentes: number;
    por_tipo: { tipo: string; pedidos: number; ventas: number }[];
    por_distrito: { distrito: string; pedidos: number }[];
  };
  productos: { vendidos: { nombre: string; marca: string; cajas: number }[]; cotizados: { nombre: string; veces: number }[]; nunca_vendidos: number };
};

// Métricas de toda la plataforma (solo el admin). Lo "vendido" cuenta solo lo entregado.
export default function PaginaMetricas() {
  return (
    <Carga fallback={<EsqueletoPagina />}>
      <Metricas />
    </Carga>
  );
}

async function Metricas() {
  await exigirRol("admin");
  const supabase = await createClient();
  const { data } = await supabase.rpc("admin_insights");
  const m = data as unknown as Insights | null;
  if (!m) return <p className="mt-8 text-gris">No pudimos cargar las métricas. Recarga la página.</p>;

  const e = m.embudo;
  const embudo = [
    { texto: "Vieron un producto", valor: e.vio_producto },
    { texto: "Agregaron al carrito", valor: e.agrego_carrito },
    { texto: "Empezaron a pedir", valor: e.inicio_pedido },
    { texto: "Hicieron un pedido", valor: e.pedidos },
    { texto: "Pagaron", valor: e.pagados },
    { texto: "Recibieron su pedido", valor: e.entregados },
  ];
  const maxEmbudo = Math.max(1, ...embudo.map((x) => x.valor));
  const o = m.operacion;
  const alertas = [
    { cantidad: o.entregas_atrasadas, texto: "pedidos pasaron su fecha de entrega sin entregarse", href: "/admin/logistica" },
    { cantidad: o.encargos_sin_respuesta_2d, texto: "encargos llevan más de 2 días sin respuesta de la marca", href: "/admin/pedidos?estado=por_confirmar" },
    { cantidad: o.listas_sin_recoger_1d, texto: "órdenes listas llevan más de 1 día sin recogerse", href: "/admin/logistica" },
  ];
  const horas = (h: number | null) => (h === null ? "—" : h < 48 ? `${h} h` : `${Math.round(h / 24)} días`);

  return (
    <div className="mt-8 flex flex-col gap-12">
      {/* Ventas */}
      <section>
        <h2 className={sello}>Ventas · {mesActual()}</h2>
        <div className="mt-3 grid grid-cols-2 overflow-hidden rounded-md border border-linea bg-blanco lg:grid-cols-4">
          <Cuadro titulo="Vendido (entregado)" nota={<Cambio ahora={m.mes.ventas} antes={m.mes.ventas_antes} />} principal>
            <Contador valor={m.mes.ventas} tipo="soles" />
          </Cuadro>
          <Cuadro titulo="Cajas entregadas">
            <Contador valor={m.mes.cajas} />
          </Cuadro>
          <Cuadro titulo="Pedidos del mes" nota={`Ticket promedio ${soles(m.pedidos_mes.ticket)} · ${m.pedidos_mes.cancelados} cancelados`}>
            <Contador valor={m.pedidos_mes.creados} />
          </Cuadro>
          <Cuadro titulo="Comisión generada" nota={`${soles(m.mes.exonerada)} exonerada (primeras 3 entregas)`}>
            <Contador valor={m.mes.comision} tipo="soles" />
          </Cuadro>
        </div>
        <div className="mt-4 rounded-md border border-linea bg-blanco p-5">
          <p className="text-sm font-medium">Vendido por semana</p>
          <p className="text-xs text-gris">Últimas 8 semanas, por fecha de entrega</p>
          <BarrasSemana
            datos={m.semanas.map((s) => ({ etiqueta: s.desde, valor: s.ventas }))}
            formato={soles}
            descripcion="Vendido por semana en las últimas 8 semanas"
          />
        </div>
      </section>

      {/* Embudo */}
      <section>
        <h2 className={sello}>Embudo · últimos 30 días</h2>
        <div className="mt-3 grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <ol className="flex flex-col gap-2.5 rounded-md border border-linea bg-blanco p-5">
            {embudo.map((paso, i) => {
              const antes = i > 0 ? embudo[i - 1].valor : 0;
              return (
                <li key={paso.texto} className="grid grid-cols-[10rem_minmax(0,1fr)_4.5rem] items-center gap-3 text-sm max-sm:grid-cols-[minmax(0,1fr)_4.5rem]">
                  <span className="max-sm:col-span-2">{paso.texto}</span>
                  <span className="h-3 overflow-hidden rounded-full bg-papel" aria-hidden="true">
                    <span
                      className="llenar block h-full rounded-full bg-verde"
                      style={{ width: `${(paso.valor / maxEmbudo) * 100}%`, animationDelay: `${i * 60}ms` }}
                    />
                  </span>
                  <span className="text-right font-mono">
                    {entero.format(paso.valor)}
                    {i > 0 && antes > 0 && <span className="block text-[11px] text-gris">{Math.round((paso.valor / antes) * 100)} %</span>}
                  </span>
                </li>
              );
            })}
            <li className="mt-1 text-xs text-gris">
              Las 3 primeras etapas se miden desde el 21-oct-2026 (eventos propios, sin cookies). El % es sobre la etapa anterior.
            </li>
          </ol>
          <div className="rounded-md border border-linea bg-blanco p-5">
            <p className="text-sm font-medium">Del cotizador al pedido</p>
            <p className="mt-3 font-mono text-3xl font-semibold">
              {e.cotizaciones ? `${Math.round((e.cotizaciones_con_pedido / e.cotizaciones) * 100)} %` : "—"}
            </p>
            <p className="mt-1 text-sm text-gris">
              {e.cotizaciones_con_pedido} de {e.cotizaciones} cotizaciones terminaron en pedido.
            </p>
          </div>
        </div>
      </section>

      {/* Operación */}
      <section>
        <h2 className={sello}>Operación</h2>
        <div className="mt-3 grid gap-4 lg:grid-cols-2">
          <dl className="grid grid-cols-3 gap-3 rounded-md border border-linea bg-blanco p-5">
            {[
              ["Hasta «Listo»", o.horas_hasta_listo, "desde que llega la orden"],
              ["Hasta recogerla", o.horas_listo_a_recogido, "desde que está lista"],
              ["Hasta entregarla", o.horas_recogido_a_entregado, "desde que se recoge"],
            ].map(([titulo, valor, nota]) => (
              <div key={titulo as string}>
                <dt className="text-xs text-gris">{titulo}</dt>
                <dd className="mt-1 font-mono text-2xl font-semibold">{horas(valor as number | null)}</dd>
                <dd className="text-[11px] text-gris">{nota}</dd>
              </div>
            ))}
            <p className="col-span-3 text-xs text-gris">Promedio de los últimos 90 días.</p>
          </dl>
          <ul className="escalonado flex flex-col gap-2">
            {alertas.map((a) => (
              <li key={a.texto}>
                <Link
                  href={a.href}
                  className={`flex items-baseline gap-3 rounded-md border bg-blanco px-4 py-3 transition-colors hover:border-gris ${a.cantidad > 0 ? "border-tinta" : "border-linea text-gris"}`}
                >
                  <span className="font-mono text-xl font-semibold">{a.cantidad}</span>
                  <span className="text-sm">{a.texto}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Marcas */}
      <section>
        <h2 className={sello}>Marcas · últimos 90 días</h2>
        <div className="mt-3 overflow-x-auto rounded-md border border-linea bg-blanco">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-linea text-left">
                <th className={`${sello} px-4 py-3 font-medium`}>Marca</th>
                <th className={`${sello} px-4 py-3 text-right font-medium`}>Vendido</th>
                <th className={`${sello} px-4 py-3 text-right font-medium`}>Cajas</th>
                <th className={`${sello} px-4 py-3 text-right font-medium`}>Órdenes</th>
                <th className={`${sello} px-4 py-3 text-right font-medium`}>No atendidas</th>
                <th className={`${sello} px-4 py-3 text-right font-medium`}>Agotados</th>
              </tr>
            </thead>
            <tbody className="escalonado">
              {m.marcas.map((x) => (
                <tr key={x.nombre} className="border-b border-linea last:border-b-0">
                  <td className="px-4 py-3 font-medium">{x.nombre}</td>
                  <td className="px-4 py-3 text-right font-mono">{soles(x.ventas)}</td>
                  <td className="px-4 py-3 text-right font-mono">{x.cajas}</td>
                  <td className="px-4 py-3 text-right font-mono">{x.ordenes}</td>
                  <td className="px-4 py-3 text-right font-mono">
                    {x.ordenes ? `${x.no_atendidas} (${Math.round((x.no_atendidas / x.ordenes) * 100)} %)` : "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{x.agotados}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Compradores */}
      <section>
        <h2 className={sello}>Compradores</h2>
        <div className="mt-3 grid gap-4 lg:grid-cols-3">
          <dl className="grid grid-cols-3 gap-3 rounded-md border border-linea bg-blanco p-5 lg:col-span-1 lg:grid-cols-1">
            {[
              ["Activos este mes", m.compradores.activos_mes],
              ["Nuevos este mes", m.compradores.nuevos_mes],
              ["Volvieron a comprar", m.compradores.recurrentes],
            ].map(([t, v]) => (
              <div key={t as string}>
                <dt className="text-xs text-gris">{t}</dt>
                <dd className="font-mono text-2xl font-semibold">{v as number}</dd>
              </div>
            ))}
          </dl>
          <Lista
            titulo="Por tipo de negocio"
            nota="Pedidos y lo entregado, 90 días"
            filas={m.compradores.por_tipo.map((t) => [TIPO[t.tipo] ?? t.tipo, `${t.pedidos} pedidos · ${soles(t.ventas)}`])}
          />
          <Lista
            titulo="Por distrito de entrega"
            nota="Pedidos, 90 días"
            filas={m.compradores.por_distrito.map((d) => [d.distrito, `${d.pedidos} pedidos`])}
          />
        </div>
      </section>

      {/* Productos */}
      <section>
        <h2 className={sello}>Productos</h2>
        <div className="mt-3 grid gap-4 lg:grid-cols-3">
          <Lista
            titulo="Más vendidos"
            nota="Cajas entregadas, 90 días"
            filas={m.productos.vendidos.map((p) => [`${p.nombre} · ${p.marca}`, `${p.cajas} cajas`])}
          />
          <Lista titulo="Más cotizados" nota="Veces en cotizaciones, 30 días" filas={m.productos.cotizados.map((p) => [p.nombre, `${p.veces} veces`])} />
          <div className="rounded-md border border-linea bg-blanco p-5">
            <p className="text-sm font-medium">Nunca vendidos</p>
            <p className="text-xs text-gris">Productos activos sin ninguna entrega</p>
            <p className="mt-3 font-mono text-3xl font-semibold">{m.productos.nunca_vendidos}</p>
          </div>
        </div>
      </section>
    </div>
  );
}

// Un número grande del bloque de ventas
function Cuadro({ titulo, nota, principal = false, children }: { titulo: string; nota?: React.ReactNode; principal?: boolean; children: React.ReactNode }) {
  return (
    <div className="border-r border-b border-linea p-5 last:border-r-0 max-lg:[&:nth-child(2n)]:border-r-0 lg:border-b-0">
      <p className={`font-mono font-medium ${principal ? "text-3xl" : "text-2xl"}`}>
        {principal ? (
          // Resaltador: un solo uso por pantalla, en la métrica principal
          <span className="bg-[linear-gradient(var(--color-resaltador),var(--color-resaltador))] bg-[length:100%_0.3em] bg-[position:0_92%] bg-no-repeat">
            {children}
          </span>
        ) : (
          children
        )}
      </p>
      <p className="mt-1 text-sm text-gris">{titulo}</p>
      {nota && <div className="mt-1 text-xs text-gris">{nota}</div>}
    </div>
  );
}

// "↑ 20 % vs septiembre"
function Cambio({ ahora, antes }: { ahora: number; antes: number }) {
  if (antes === 0) return <span>{ahora > 0 ? `Sin entregas en ${mesAnterior()}` : "Aún sin entregas"}</span>;
  const cambio = Math.round(((ahora - antes) / antes) * 100);
  return (
    <span className={`font-mono ${cambio >= 0 ? "text-verde" : ""}`}>
      {cambio >= 0 ? "↑" : "↓"} {Math.abs(cambio)} % vs {mesAnterior()}
    </span>
  );
}

// Una lista corta de nombre → valor
function Lista({ titulo, nota, filas }: { titulo: string; nota: string; filas: [string, string][] }) {
  return (
    <div className="rounded-md border border-linea bg-blanco p-5">
      <p className="text-sm font-medium">{titulo}</p>
      <p className="mb-3 text-xs text-gris">{nota}</p>
      {filas.length === 0 ? (
        <p className="text-sm text-gris">Aún sin datos.</p>
      ) : (
        <ol className="flex flex-col gap-1.5 text-sm">
          {filas.map(([nombre, valor]) => (
            <li key={nombre} className="flex justify-between gap-3">
              <span className="min-w-0 truncate">{nombre}</span>
              <span className="shrink-0 font-mono text-gris">{valor}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
