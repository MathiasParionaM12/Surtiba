import type { Metadata } from "next";
import Link from "next/link";
import { Carga } from "@/components/Carga";
import { EsqueletoTabla } from "@/components/Esqueleto";
import { FormAccion } from "@/components/FormAccion";
import { aprobarSolicitud, rechazarSolicitud } from "@/lib/acciones-admin";
import { campo, sello } from "@/lib/estilos";
import { fecha } from "@/lib/formato";
import { exigirRol } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";
import { PEDIDO_MINIMO_ACTIVO } from "@/lib/catalogo";

export const metadata: Metadata = { title: "Marcas · Panel Surtiba" };

export default function PaginaMarcasAdmin() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Marcas</h1>
      <Carga fallback={<EsqueletoTabla filas={5} />}>
        <Marcas />
      </Carga>
    </>
  );
}

async function Marcas() {
  await exigirRol("admin");
  const supabase = await createClient();
  const [{ data: solicitudes }, { data: marcas }] = await Promise.all([
    supabase
      .from("solicitudes_marca")
      .select("id, nombre_comercial, razon_social, ruc, direccion_recojo, contacto_nombre, contacto_whatsapp, pedido_minimo_cajas, creado_en")
      .eq("estado", "pendiente")
      .order("creado_en"),
    supabase
      .from("marcas")
      .select("id, nombre_comercial, pedido_minimo_cajas, activa, marcas_privado(comision_pct), productos(id), subpedidos(estado)")
      .order("nombre_comercial"),
  ]);

  return (
    <div className="mt-6 flex flex-col gap-10">
      {/* Solicitudes "Quiero vender" */}
      <section>
        <h2 className={sello}>Solicitudes por revisar</h2>
        {!solicitudes || solicitudes.length === 0 ? (
          <p className="mt-3 rounded-md border border-linea bg-blanco p-4 text-sm text-gris">
            No hay solicitudes nuevas. Aparecen aquí cuando alguien se registra con «Quiero vender».
          </p>
        ) : (
          <div className="mt-3 flex flex-col gap-4">
            {solicitudes.map((s) => (
              <article key={s.id} className="rounded-md border border-linea bg-blanco p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="text-lg font-semibold">{s.nombre_comercial}</h3>
                    <p className="text-sm text-gris">
                      {s.razon_social} · <span className="font-mono">RUC {s.ruc}</span>
                    </p>
                  </div>
                  <p className="text-xs text-gris">Enviada el {fecha(s.creado_en)}</p>
                </div>
                <p className="mt-3 text-sm">Recojo: {s.direccion_recojo}</p>
                <p className="text-sm">
                  Contacto: {s.contacto_nombre} · <span className="font-mono">{s.contacto_whatsapp}</span>
                </p>

                <div className="mt-5 grid gap-5 border-t border-linea pt-5 md:grid-cols-2">
                  <div>
                    <p className="mb-3 text-sm">
                      {PEDIDO_MINIMO_ACTIVO && (
                        <>
                          Pedido mínimo que eligió: <strong className="font-mono">{s.pedido_minimo_cajas} cajas</strong> ·{" "}
                        </>
                      )}
                      Comisión:{" "}
                      <strong className="font-mono">5%</strong> <span className="text-gris">(fija por ahora)</span>
                    </p>
                    <FormAccion accion={aprobarSolicitud} ocultos={{ solicitud_id: s.id }} texto="Aprobar marca" />
                  </div>
                  <FormAccion accion={rechazarSolicitud} ocultos={{ solicitud_id: s.id }} texto="Rechazar" variante="secundario">
                    <label className="flex flex-1 flex-col gap-1.5">
                      <span className="text-xs font-medium text-gris">Motivo (lo verá la marca)</span>
                      <input name="motivo" required minLength={5} className={`${campo} h-10`} />
                    </label>
                  </FormAccion>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Marcas activas e inactivas */}
      <section>
        <h2 className={sello}>Todas las marcas</h2>
        <div className="mt-3 overflow-x-auto rounded-md border border-linea bg-blanco">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-linea text-left">
                <th className={`${sello} px-4 py-3 font-medium`}>Marca</th>
                <th className={`${sello} px-4 py-3 text-right font-medium`}>Comisión</th>
                {PEDIDO_MINIMO_ACTIVO && <th className={`${sello} px-4 py-3 text-right font-medium`}>Mínimo</th>}
                <th className={`${sello} px-4 py-3 text-right font-medium`}>Productos</th>
                <th className={`${sello} px-4 py-3 text-right font-medium`}>Entregas</th>
                <th className={`${sello} px-4 py-3 font-medium`}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {(marcas ?? []).map((m) => (
                <tr key={m.id} className="border-b border-linea last:border-b-0 hover:bg-papel">
                  <td className="px-4 py-3">
                    <Link href={`/admin/marcas/${m.id}`} className="font-medium text-verde hover:text-tinta">
                      {m.nombre_comercial}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{m.marcas_privado?.comision_pct ?? "—"}%</td>
                  {PEDIDO_MINIMO_ACTIVO && <td className="px-4 py-3 text-right font-mono">{m.pedido_minimo_cajas}</td>}
                  <td className="px-4 py-3 text-right font-mono">{m.productos.length}</td>
                  <td className="px-4 py-3 text-right font-mono">{m.subpedidos.filter((s) => s.estado === "entregado").length}</td>
                  <td className="px-4 py-3 text-gris">{m.activa ? "Activa" : "Inactiva"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-gris">Entregas: las 3 primeras de cada marca no pagan comisión.</p>
      </section>
    </div>
  );
}
