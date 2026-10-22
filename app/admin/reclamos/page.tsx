import { BookOpenText } from "lucide-react";
import type { Metadata } from "next";
import { Carga } from "@/components/Carga";
import { EsqueletoTabla } from "@/components/Esqueleto";
import { EstadoVacio } from "@/components/EstadoVacio";
import { FormAccion } from "@/components/FormAccion";
import { responderReclamo } from "@/lib/acciones-reclamos";
import { DIAS_HABILES_RESPUESTA } from "@/lib/empresa";
import { campo, sello } from "@/lib/estilos";
import { fecha, hoyEnLima } from "@/lib/formato";
import { exigirRol } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";
import { HojaReclamo } from "../../libro-de-reclamaciones/HojaReclamo";

export const metadata: Metadata = { title: "Reclamos · Panel Surtiba" };

export default function PaginaReclamos() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Libro de Reclamaciones</h1>
      <p className="mt-2 text-gris">
        Cada hoja se responde una sola vez, en un máximo de {DIAS_HABILES_RESPUESTA} días hábiles. La respuesta no se puede cambiar
        después.
      </p>
      <Carga fallback={<EsqueletoTabla filas={4} />}>
        <Lista />
      </Carga>
    </>
  );
}

async function Lista() {
  await exigirRol("admin");
  const supabase = await createClient();
  const hoy = hoyEnLima();
  const { data } = await supabase
    .from("reclamos")
    .select(
      "id, codigo, creado_en, fecha_limite, tipo, nombre, tipo_documento, numero_documento, domicilio, telefono, correo, bien, pedido_codigo, monto_centimos, descripcion_bien, detalle, pedido, respuesta, respondido_en",
    )
    .order("creado_en", { ascending: false });

  const hojas = (data ?? []).map((h) => ({ ...h, monto: h.monto_centimos !== null ? String(h.monto_centimos / 100) : null }));
  // Primero las que faltan responder, de la que vence antes a la que vence después
  const pendientes = hojas.filter((h) => !h.respuesta).sort((a, b) => a.fecha_limite.localeCompare(b.fecha_limite));
  const respondidas = hojas.filter((h) => h.respuesta);

  if (hojas.length === 0) return <EstadoVacio icono={BookOpenText} texto="Todavía no hay hojas de reclamación." />;

  return (
    <div className="mt-8 flex flex-col gap-10">
      <section>
        <h2 className={sello}>Por responder · {pendientes.length}</h2>
        {pendientes.length === 0 ? (
          <p className="mt-3 rounded-md border border-linea bg-blanco p-4 text-sm text-gris">Todas las hojas están respondidas.</p>
        ) : (
          <div className="mt-3 flex flex-col gap-6">
            {pendientes.map((h) => {
              const vencida = h.fecha_limite < hoy;
              return (
                <div key={h.id} className="flex flex-col gap-3">
                  <p className={`text-sm ${vencida ? "text-rojo" : "text-gris"}`}>
                    {vencida ? `Venció el ${fecha(h.fecha_limite)}: respóndela hoy.` : `Responder hasta el ${fecha(h.fecha_limite)}.`}
                  </p>
                  <HojaReclamo h={h} />
                  <FormAccion accion={responderReclamo} ocultos={{ reclamo_id: h.id }} texto="Guardar respuesta">
                    <label className="flex min-w-0 flex-1 basis-72 flex-col gap-1.5">
                      <span className="text-xs font-medium text-gris">Respuesta de Surtiba</span>
                      <textarea name="respuesta" required minLength={10} maxLength={2000} rows={3} className={`${campo} h-auto py-2`} />
                    </label>
                  </FormAccion>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {respondidas.length > 0 && (
        <section>
          <h2 className={sello}>Respondidas · {respondidas.length}</h2>
          <div className="mt-3 flex flex-col gap-3">
            {respondidas.map((h) => (
              <details key={h.id} className="rounded-md border border-linea bg-blanco">
                <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                  <span>
                    <span className="font-mono font-medium">{h.codigo}</span>
                    <span className="ml-2">{h.nombre}</span>
                  </span>
                  <span className="font-mono text-xs text-gris">Respondida el {fecha(h.respondido_en ?? h.creado_en)}</span>
                </summary>
                <div className="border-t border-linea p-2 sm:p-4">
                  <HojaReclamo h={h} />
                </div>
              </details>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
