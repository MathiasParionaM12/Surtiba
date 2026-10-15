import type { Metadata } from "next";
import { Carga } from "@/components/Carga";
import { EsqueletoPagina } from "@/components/Esqueleto";
import { sello } from "@/lib/estilos";
import { fecha } from "@/lib/formato";
import { exigirRol } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Mi solicitud · Surtiba" };

export default function PaginaSolicitud() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-8 sm:py-14">
      <p className={sello}>Vender en Surtiba</p>
      <Carga fallback={<EsqueletoPagina />}>
        <Solicitud />
      </Carga>
    </main>
  );
}

async function Solicitud() {
  // Si el admin ya la aprobó, el rol es "marca" y exigirRol lleva al panel de marca
  await exigirRol("solicitante");
  const supabase = await createClient();
  const { data: s } = await supabase
    .from("solicitudes_marca")
    .select("nombre_comercial, razon_social, ruc, direccion_recojo, contacto_whatsapp, estado, motivo_rechazo, creado_en")
    .order("creado_en", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!s) {
    return <p className="mt-4 text-gris">No encontramos tu solicitud. Escríbenos para revisarlo.</p>;
  }

  return (
    <>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{s.nombre_comercial}</h1>

      {s.estado === "rechazada" ? (
        <div className="mt-6 border-l-2 border-rojo pl-4">
          <p className="font-medium">Tu solicitud no fue aprobada.</p>
          <p className="mt-1 text-sm text-gris">Motivo: {s.motivo_rechazo}</p>
          <p className="mt-1 text-sm text-gris">Si quieres volver a intentarlo, escríbenos y lo revisamos contigo.</p>
        </div>
      ) : (
        <div className="mt-6 rounded-md border border-linea bg-blanco p-5">
          <p className="font-medium">Tu solicitud está en revisión.</p>
          <p className="mt-1 text-sm text-gris">
            El equipo Surtiba la revisará y te escribirá al WhatsApp <span className="font-mono">{s.contacto_whatsapp}</span> para
            acordar la comisión y el pedido mínimo. Cuando la aprueben, al ingresar verás tu panel de marca.
          </p>
        </div>
      )}

      <dl className="mt-8 grid grid-cols-1 border-t border-linea text-sm sm:grid-cols-2">
        {[
          ["Razón social", s.razon_social],
          ["RUC", s.ruc],
          ["Dirección de recojo", s.direccion_recojo],
          ["Enviada el", fecha(s.creado_en)],
        ].map(([k, valor]) => (
          <div key={k} className="border-b border-linea py-3 sm:odd:pr-4">
            <dt className="text-xs text-gris">{k}</dt>
            <dd className="mt-0.5">{valor}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}
