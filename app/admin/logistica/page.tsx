import type { Metadata } from "next";
import Link from "next/link";
import { Carga } from "@/components/Carga";
import { EsqueletoTabla } from "@/components/Esqueleto";
import { EtiquetaEstado } from "@/components/EtiquetaEstado";
import { FormAccion } from "@/components/FormAccion";
import { guardarEntregas, guardarEnvio, marcarEntregado, recogerMarca } from "@/lib/acciones-admin";
import { fechaLarga, NOMBRE_DIA, sumarDias, textoDias } from "@/lib/entregas";
import { configEntregas } from "@/lib/entregas-config";
import { tarifasEnvio } from "@/lib/envio";
import { campo, sello } from "@/lib/estilos";
import { hoyEnLima, soles } from "@/lib/formato";
import { exigirRol } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Logística · Panel Surtiba" };

// Hoja de ruta por día de entrega (martes y jueves, 6-nov-2026): la víspera se recoge en cada marca con un clic
// ("Recogí todo de esta marca") y el pedido pasa solo a "en camino"; el día de entrega se marca "Entregado".
export default function PaginaLogistica() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Logística</h1>
      <p className="mt-2 text-gris">Por día de entrega: la víspera recoges en cada marca y ese día entregas.</p>
      <Carga fallback={<EsqueletoTabla filas={5} />}>
        <Logistica />
      </Carga>
    </>
  );
}

type Privado = { direccion_recojo: string | null; contacto_nombre: string | null; contacto_whatsapp: string | null };

async function Logistica() {
  await exigirRol("admin");
  const supabase = await createClient();
  const hoy = hoyEnLima();

  const [{ data: porRecoger }, { data: abiertos }, tarifas, entregas] = await Promise.all([
    // Órdenes por recoger de pedidos ya pagados (los encargos sin pagar no se recogen)
    supabase
      .from("subpedidos")
      .select(
        "id, codigo, estado, total_cajas, fecha_recojo, pedido_id, marca_id, pedidos!inner(estado, fecha_entrega_deseada), marcas(nombre_comercial, marcas_privado(direccion_recojo, contacto_nombre, contacto_whatsapp))",
      )
      .in("estado", ["pendiente", "listo_recojo"])
      .in("pedidos.estado", ["recibido", "en_preparacion"])
      .order("codigo"),
    supabase
      .from("pedidos")
      .select("id, codigo, estado, fecha_entrega_deseada, distrito, direccion_entrega, direccion_detalle, referencia, recibe_nombre, recibe_telefono, total_centimos, pagado_centimos, perfiles(empresa), subpedidos(estado)")
      .in("estado", ["recibido", "en_preparacion", "en_camino"])
      .order("codigo"),
    tarifasEnvio(),
    configEntregas(),
  ]);

  // Lo atrasado se junta en un solo grupo arriba; lo demás, por fecha de entrega
  const grupoDe = (fecha: string) => (fecha < hoy ? "atrasado" : fecha);
  const recojos = (porRecoger ?? []).map((s) => ({ ...s, grupo: grupoDe(s.pedidos.fecha_entrega_deseada) }));
  const entregasAbiertas = (abiertos ?? []).map((p) => {
    const vigentes = p.subpedidos.filter((s) => s.estado !== "rechazado" && s.estado !== "cancelado");
    return {
      ...p,
      grupo: grupoDe(p.fecha_entrega_deseada),
      recogidos: vigentes.filter((s) => s.estado === "recogido").length,
      total: vigentes.length,
      // Candado: sin pago completo no se entrega
      falta: Math.max(0, p.total_centimos - p.pagado_centimos),
    };
  });
  const grupos = [...new Set([...recojos.map((r) => r.grupo), ...entregasAbiertas.map((e) => e.grupo)])].sort((a, b) =>
    a === "atrasado" ? -1 : b === "atrasado" ? 1 : a.localeCompare(b),
  );
  const proxima = grupos.find((g) => g !== "atrasado");

  const resumen = [
    { valor: proxima ? fechaLarga(proxima) : "—", texto: "próxima entrega", fecha: true },
    { valor: proxima ? recojos.filter((r) => r.grupo === proxima).length : 0, texto: "órdenes por recoger para esa entrega" },
    { valor: proxima ? entregasAbiertas.filter((e) => e.grupo === proxima).length : 0, texto: "pedidos para esa entrega" },
    { valor: recojos.filter((r) => r.grupo === "atrasado").length + entregasAbiertas.filter((e) => e.grupo === "atrasado").length, texto: "atrasados", alerta: true },
  ];

  return (
    <div className="mt-6 flex flex-col gap-10">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {resumen.map((r) => (
          <div
            key={r.texto}
            className={`rounded-md border bg-blanco px-4 py-3 ${r.alerta && Number(r.valor) > 0 ? "border-rojo" : "border-linea"}`}
          >
            <dt className="text-xs text-gris">{r.texto}</dt>
            <dd className={`mt-1 font-semibold first-letter:uppercase ${r.fecha ? "text-base" : "font-mono text-2xl"}`}>{r.valor}</dd>
          </div>
        ))}
      </dl>

      {grupos.length === 0 && <p className="rounded-md border border-linea bg-blanco p-5 text-gris">No hay pedidos por recoger ni entregar.</p>}

      {grupos.map((g) => {
        const deRecojo = recojos.filter((r) => r.grupo === g);
        const deEntrega = entregasAbiertas.filter((e) => e.grupo === g);
        // Recojos agrupados por marca y día de recojo: un botón "Recogí todo" por marca
        const marcas = new Map<string, { marcaId: string; dia: string; nombre: string; privado: Privado | null; ordenes: typeof deRecojo }>();
        for (const s of deRecojo) {
          const dia = s.fecha_recojo ?? sumarDias(s.pedidos.fecha_entrega_deseada, -1);
          const clave = `${s.marca_id}|${dia}`;
          const grupo = marcas.get(clave) ?? { marcaId: s.marca_id, dia, nombre: s.marcas?.nombre_comercial ?? "", privado: s.marcas?.marcas_privado ?? null, ordenes: [] };
          grupo.ordenes.push(s);
          marcas.set(clave, grupo);
        }

        return (
          <section key={g}>
            <div className="flex flex-wrap items-baseline gap-x-3 border-b border-linea pb-2">
              <h2 className={`text-xl font-semibold tracking-tight first-letter:uppercase ${g === "atrasado" ? "text-rojo" : ""}`}>
                {g === "atrasado" ? "Atrasados" : fechaLarga(g)}
              </h2>
              {g !== "atrasado" && <span className="text-sm text-gris">Recojo el {fechaLarga(sumarDias(g, -1))}</span>}
            </div>

            <div className="mt-4 grid gap-6 lg:grid-cols-2">
              {/* Recoger */}
              <div>
                <h3 className={sello}>Recoger · {deRecojo.length}</h3>
                {marcas.size === 0 ? (
                  <p className="mt-3 rounded-md border border-linea bg-blanco p-4 text-sm text-gris">Nada por recoger.</p>
                ) : (
                  <div className="mt-3 flex flex-col gap-3">
                    {[...marcas.entries()].map(([clave, m]) => {
                      const sinListo = m.ordenes.filter((o) => o.estado === "pendiente").length;
                      const listas = m.ordenes.length - sinListo;
                      return (
                        <article key={clave} className="overflow-hidden rounded-md border border-linea bg-blanco">
                          <header className="border-b border-linea px-4 py-3">
                            <h4 className="font-semibold">{m.nombre}</h4>
                            <p className="text-sm text-gris">
                              {m.privado?.direccion_recojo ?? "Sin dirección de recojo"}
                              {m.privado?.contacto_nombre && ` · ${m.privado.contacto_nombre}`}
                              {m.privado?.contacto_whatsapp && <span className="font-mono"> · {m.privado.contacto_whatsapp}</span>}
                            </p>
                          </header>
                          <ul>
                            {m.ordenes.map((o) => (
                              <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-linea px-4 py-2.5 text-sm">
                                <span>
                                  <Link href={`/admin/pedidos/${o.pedido_id}`} className="font-mono font-medium enlace text-verde hover:text-tinta">
                                    {o.codigo}
                                  </Link>
                                  <span className="ml-2 font-mono text-xs text-gris">{o.total_cajas} cajas</span>
                                </span>
                                <EtiquetaEstado estado={o.estado} />
                              </li>
                            ))}
                          </ul>
                          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                            <span className={`text-xs ${sinListo > 0 ? "text-rojo" : "text-gris"}`}>
                              {sinListo > 0
                                ? `${sinListo === 1 ? "1 orden no está marcada" : `${sinListo} órdenes no están marcadas`} como lista: pídele a la marca que la marque, o recógela desde el pedido confirmando que la recibiste.`
                                : `Recojo el ${fechaLarga(m.dia)}.`}
                            </span>
                            {/* Candado: solo se recoge lo que la marca marcó "listo" */}
                            {listas > 0 && (
                              <FormAccion
                                accion={recogerMarca}
                                ocultos={{ marca_id: m.marcaId, fecha_recojo: m.dia }}
                                texto={sinListo > 0 ? `Recogí las ${listas} listas` : "Recogí todo de esta marca"}
                              />
                            )}
                          </div>
                        </article>
                      );
                    })}
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
                            {g === "atrasado" && `${fechaLarga(p.fecha_entrega_deseada)} · `}
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
                            {p.estado !== "en_camino" && (
                              <span className="font-mono text-xs text-gris">
                                Recogido {p.recogidos} de {p.total}
                              </span>
                            )}
                          </div>
                        </div>
                        {p.falta > 0 ? (
                          <span className="rounded-md border-2 border-rojo px-2 py-1 text-xs font-medium text-rojo">Falta pago {soles(p.falta)}</span>
                        ) : (
                          p.estado === "en_camino" && <FormAccion accion={marcarEntregado} ocultos={{ pedido_id: p.id }} texto="Entregado" />
                        )}
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

      {/* Días de entrega y anticipación: cambian la fecha que se asigna a los pedidos nuevos */}
      <section className="rounded-md border border-linea bg-blanco p-4 sm:p-5">
        <h2 className={sello}>Días de entrega</h2>
        <p className="mt-1 text-sm text-gris">
          Hoy entregamos los {textoDias(entregas)} y se pide con {entregas.corteDias} días de anticipación. El recojo es la víspera. Los
          pedidos ya hechos no cambian.
        </p>
        <FormAccion accion={guardarEntregas} ocultos={{}} texto="Guardar" variante="secundario" className="mt-4">
          <fieldset className="flex flex-wrap gap-2">
            <legend className="sr-only">Días de entrega</legend>
            {[1, 2, 3, 4, 5, 6, 7].map((d) => (
              <label key={d} className="flex cursor-pointer items-center gap-1.5 rounded-md border border-linea px-2.5 py-2 text-sm has-[:checked]:border-tinta">
                <input type="checkbox" name="dias" value={d} defaultChecked={entregas.dias.includes(d)} className="accent-verde" />
                <span className="first-letter:uppercase">{NOMBRE_DIA[d]}</span>
              </label>
            ))}
          </fieldset>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gris">Días de anticipación</span>
            <span className="w-24">
              <input name="corte" type="number" min={1} max={7} required defaultValue={entregas.corteDias} className={`${campo} h-10 font-mono`} />
            </span>
          </label>
        </FormAccion>
      </section>

      {/* Envío al comprador: fijo por pedido según la zona del distrito (lo cobra crear_pedido) */}
      <section className="rounded-md border border-linea bg-blanco p-4 sm:p-5">
        <h2 className={sello}>Envío al comprador</h2>
        <p className="mt-1 text-sm text-gris">
          Fijo por pedido, sin importar las cajas. Uno solo aunque el pedido llegue en dos partes. Los pedidos ya hechos no cambian.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {tarifas.zonas.map((z) => {
            const distritos = Object.keys(tarifas.zonaDe).filter((d) => tarifas.zonaDe[d] === z.zona).sort();
            return (
              <div key={z.zona} className="flex flex-col gap-2">
                <FormAccion accion={guardarEnvio} ocultos={{ zona: String(z.zona) }} texto="Guardar" variante="secundario">
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-gris">
                      Zona {z.zona} · {z.nombre}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="font-mono text-sm text-gris">S/</span>
                      <span className="w-28">
                        <input name="monto" inputMode="decimal" required defaultValue={(z.monto_centimos / 100).toFixed(2)} className={`${campo} h-10 font-mono`} />
                      </span>
                    </span>
                  </label>
                </FormAccion>
                <details className="text-xs text-gris">
                  <summary className="cursor-pointer">{distritos.length} distritos</summary>
                  <p className="mt-1 leading-relaxed">{distritos.join(", ")}</p>
                </details>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
