import type { Metadata } from "next";
import Link from "next/link";
import { Carga } from "@/components/Carga";
import { EsqueletoTabla } from "@/components/Esqueleto";
import { EtiquetaEstado } from "@/components/EtiquetaEstado";
import { FormAccion } from "@/components/FormAccion";
import { fijarRecojo, guardarEnvio, marcarEnCamino, marcarEntregado, marcarRecogido } from "@/lib/acciones-admin";
import { tarifasEnvio } from "@/lib/envio";
import { campo, sello } from "@/lib/estilos";
import { fecha, hoyEnLima, mananaEnLima } from "@/lib/formato";
import { exigirRol } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Logística · Panel Surtiba" };

// Hoja de ruta: qué recoger en cada marca y qué entregar, ordenado por día (hoy, mañana, más adelante).
export default function PaginaLogistica() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Logística</h1>
      <p className="mt-2 text-gris">La hoja de ruta: recoger en cada marca y entregar el pedido completo al comprador.</p>
      <Carga fallback={<EsqueletoTabla filas={5} />}>
        <Logistica />
      </Carga>
    </>
  );
}

type Privado = { direccion_recojo: string | null; contacto_nombre: string | null; contacto_whatsapp: string | null };
type Dia = "hoy" | "manana" | "despues";
const DIAS: { clave: Dia; titulo: string; ayuda: string }[] = [
  { clave: "hoy", titulo: "Hoy", ayuda: "Incluye lo atrasado." },
  { clave: "manana", titulo: "Mañana", ayuda: "" },
  { clave: "despues", titulo: "Más adelante", ayuda: "Incluye los recojos sin fecha: ponles una." },
];

async function Logistica() {
  await exigirRol("admin");
  const supabase = await createClient();
  const hoy = hoyEnLima();
  const manana = mananaEnLima();
  // Lo atrasado va con hoy; sin fecha, con "más adelante"
  const diaDe = (f: string | null): Dia => (!f ? "despues" : f <= hoy ? "hoy" : f === manana ? "manana" : "despues");

  const [{ data: porRecoger }, { data: abiertos }, tarifas] = await Promise.all([
    supabase
      .from("subpedidos")
      .select(
        "id, codigo, estado, total_cajas, fecha_recojo, pedido_id, marca_id, marcas(nombre_comercial, marcas_privado(direccion_recojo, contacto_nombre, contacto_whatsapp))",
      )
      .in("estado", ["pendiente", "listo_recojo"])
      .order("codigo"),
    supabase
      .from("pedidos")
      .select("id, codigo, estado, fecha_entrega_deseada, distrito, direccion_entrega, direccion_detalle, referencia, recibe_nombre, recibe_telefono, perfiles(empresa), subpedidos(estado)")
      .in("estado", ["recibido", "en_preparacion", "en_camino"])
      .order("fecha_entrega_deseada"),
    tarifasEnvio(),
  ]);
  const distritosDe = (zona: number) => Object.keys(tarifas.zonaDe).filter((d) => tarifas.zonaDe[d] === zona).sort();

  const recojos = (porRecoger ?? []).map((s) => ({ ...s, dia: diaDe(s.fecha_recojo), atrasado: !!s.fecha_recojo && s.fecha_recojo < hoy }));
  const entregas = (abiertos ?? []).map((p) => {
    const vigentes = p.subpedidos.filter((s) => s.estado !== "rechazado" && s.estado !== "cancelado");
    const recogidos = vigentes.filter((s) => s.estado === "recogido").length;
    return {
      ...p,
      dia: diaDe(p.fecha_entrega_deseada),
      atrasado: p.fecha_entrega_deseada < hoy,
      recogidos,
      total: vigentes.length,
      completo: vigentes.length > 0 && recogidos === vigentes.length,
    };
  });

  const resumen = [
    { valor: recojos.filter((r) => r.dia === "hoy").length, texto: "recojos hoy" },
    { valor: entregas.filter((e) => e.dia === "hoy").length, texto: "entregas hoy" },
    { valor: recojos.filter((r) => r.atrasado).length + entregas.filter((e) => e.atrasado).length, texto: "atrasados", alerta: true },
    { valor: recojos.filter((r) => !r.fecha_recojo).length, texto: "recojos sin fecha", alerta: true },
  ];

  return (
    <div className="mt-6 flex flex-col gap-10">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {resumen.map((r) => (
          <div
            key={r.texto}
            className={`rounded-md border bg-blanco px-4 py-3 ${r.alerta && r.valor > 0 ? "border-rojo" : "border-linea"}`}
          >
            <dt className="text-xs text-gris">{r.texto}</dt>
            <dd className="mt-1 font-mono text-2xl font-semibold">{r.valor}</dd>
          </div>
        ))}
      </dl>

      {/* Envío al comprador: fijo por pedido según la zona del distrito (lo cobra crear_pedido) */}
      <section className="rounded-md border border-linea bg-blanco p-4 sm:p-5">
        <h2 className={sello}>Envío al comprador</h2>
        <p className="mt-1 text-sm text-gris">
          Fijo por pedido, sin importar las cajas. Uno solo aunque el pedido llegue en dos partes. Los pedidos ya hechos no cambian.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {tarifas.zonas.map((z) => (
            <div key={z.zona} className="flex flex-col gap-2">
              <FormAccion accion={guardarEnvio} ocultos={{ zona: String(z.zona) }} texto="Guardar" variante="secundario">
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-gris">
                    Zona {z.zona} · {z.nombre}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-sm text-gris">S/</span>
                    <span className="w-28">
                      <input
                        name="monto"
                        inputMode="decimal"
                        required
                        defaultValue={(z.monto_centimos / 100).toFixed(2)}
                        className={`${campo} h-10 font-mono`}
                      />
                    </span>
                  </span>
                </label>
              </FormAccion>
              <details className="text-xs text-gris">
                <summary className="cursor-pointer">{distritosDe(z.zona).length} distritos</summary>
                <p className="mt-1 leading-relaxed">{distritosDe(z.zona).join(", ")}</p>
              </details>
            </div>
          ))}
        </div>
      </section>

      {DIAS.map((d) => {
        const deRecojo = recojos.filter((r) => r.dia === d.clave);
        const deEntrega = entregas.filter((e) => e.dia === d.clave);
        // Recojos del día agrupados por marca: así se visita cada local una sola vez
        const marcas = new Map<string, { nombre: string; privado: Privado | null; ordenes: typeof deRecojo }>();
        for (const s of deRecojo) {
          const grupo = marcas.get(s.marca_id) ?? { nombre: s.marcas?.nombre_comercial ?? "", privado: s.marcas?.marcas_privado ?? null, ordenes: [] };
          grupo.ordenes.push(s);
          marcas.set(s.marca_id, grupo);
        }

        return (
          <section key={d.clave}>
            <div className="flex flex-wrap items-baseline gap-x-3 border-b border-linea pb-2">
              <h2 className="text-xl font-semibold tracking-tight">{d.titulo}</h2>
              <span className="font-mono text-sm text-gris">
                {d.clave === "hoy" ? fecha(hoy) : d.clave === "manana" ? fecha(manana) : ""}
              </span>
              {d.ayuda && <span className="text-sm text-gris">{d.ayuda}</span>}
            </div>

            <div className="mt-4 grid gap-6 lg:grid-cols-2">
              {/* Recoger */}
              <div>
                <h3 className={sello}>Recoger · {deRecojo.length}</h3>
                {marcas.size === 0 ? (
                  <p className="mt-3 rounded-md border border-linea bg-blanco p-4 text-sm text-gris">Nada por recoger.</p>
                ) : (
                  <div className="mt-3 flex flex-col gap-3">
                    {[...marcas.entries()].map(([marcaId, g]) => (
                      <article key={marcaId} className="overflow-hidden rounded-md border border-linea bg-blanco">
                        <header className="border-b border-linea px-4 py-3">
                          <h4 className="font-semibold">{g.nombre}</h4>
                          <p className="text-sm text-gris">
                            {g.privado?.direccion_recojo ?? "Sin dirección de recojo"}
                            {g.privado?.contacto_nombre && ` · ${g.privado.contacto_nombre}`}
                            {g.privado?.contacto_whatsapp && <span className="font-mono"> · {g.privado.contacto_whatsapp}</span>}
                          </p>
                        </header>
                        <ul>
                          {g.ordenes.map((o) => (
                            <li key={o.id} className="flex flex-wrap items-end justify-between gap-3 border-b border-linea px-4 py-3 last:border-b-0">
                              <div className="min-w-36">
                                <Link href={`/admin/pedidos/${o.pedido_id}`} className="font-mono font-medium enlace text-verde hover:text-tinta">
                                  {o.codigo}
                                </Link>
                                <span className="ml-2 font-mono text-xs text-gris">{o.total_cajas} cajas</span>
                                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                  <EtiquetaEstado estado={o.estado} />
                                  {o.atrasado && <Atrasado />}
                                </div>
                              </div>
                              <div className="flex flex-wrap items-end gap-3">
                                <FormAccion accion={fijarRecojo} ocultos={{ subpedido_id: o.id }} texto="Guardar" variante="secundario">
                                  <label className="flex flex-col gap-1">
                                    <span className="text-xs text-gris">Recojo</span>
                                    <div className="w-40">
                                      <input
                                        name="fecha"
                                        type="date"
                                        min={hoy}
                                        required
                                        defaultValue={o.fecha_recojo ?? ""}
                                        className={`${campo} h-10 font-mono`}
                                      />
                                    </div>
                                  </label>
                                </FormAccion>
                                {o.estado === "listo_recojo" && (
                                  <FormAccion accion={marcarRecogido} ocultos={{ subpedido_id: o.id }} texto="Recogido" />
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </article>
                    ))}
                  </div>
                )}
              </div>

              {/* Entregar */}
              <div>
                <h3 className={sello}>Entregar · {deEntrega.length}</h3>
                {deEntrega.length === 0 ? (
                  <p className="mt-3 rounded-md border border-linea bg-blanco p-4 text-sm text-gris">Nada por entregar.</p>
                ) : (
                  <ul className="mt-3 overflow-hidden rounded-md border border-linea bg-blanco">
                    {deEntrega.map((p) => (
                      <li key={p.id} className="flex flex-wrap items-end justify-between gap-3 border-b border-linea px-4 py-3 last:border-b-0">
                        <div className="min-w-0 text-sm">
                          <Link href={`/admin/pedidos/${p.id}`} className="font-mono font-medium enlace text-verde hover:text-tinta">
                            {p.codigo}
                          </Link>
                          <span className="ml-2">{p.perfiles?.empresa}</span>
                          <p className="text-gris">
                            {d.clave === "despues" || p.atrasado ? `${fecha(p.fecha_entrega_deseada)} · ` : ""}
                            {p.distrito} · {p.direccion_entrega}
                            {p.direccion_detalle && `, ${p.direccion_detalle}`}
                          </p>
                          {p.referencia && <p className="text-xs text-gris">{p.referencia}</p>}
                          {p.recibe_nombre && (
                            <p className="text-xs text-gris">
                              Recibe {p.recibe_nombre} · <span className="font-mono">{p.recibe_telefono}</span>
                            </p>
                          )}
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            <EtiquetaEstado estado={p.estado} />
                            {p.atrasado && <Atrasado />}
                            {!p.completo && (
                              <span className="font-mono text-xs text-gris">
                                Recogido {p.recogidos} de {p.total}
                              </span>
                            )}
                          </div>
                        </div>
                        {p.estado === "en_camino" ? (
                          <FormAccion accion={marcarEntregado} ocultos={{ pedido_id: p.id }} texto="Entregado" />
                        ) : p.completo ? (
                          <FormAccion accion={marcarEnCamino} ocultos={{ pedido_id: p.id }} texto="En camino" />
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>
        );
      })}
      <p className="text-xs text-gris">Al marcar «Entregado» se calcula la comisión de cada marca.</p>
    </div>
  );
}

// Rojo apagado solo en el borde y el texto (docs/marca.md: el rojo nunca va de fondo)
function Atrasado() {
  return (
    <span className="rounded-sm border border-rojo px-1.5 py-0.5 font-mono text-[11px] tracking-[0.08em] text-rojo uppercase">Atrasado</span>
  );
}
