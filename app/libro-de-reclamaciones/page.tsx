import { BookOpenText } from "lucide-react";
import type { Metadata } from "next";
import { Carga } from "@/components/Carga";
import { EsqueletoTabla } from "@/components/Esqueleto";
import { DIAS_HABILES_RESPUESTA, EMPRESA, SIN_DATO } from "@/lib/empresa";
import { sello } from "@/lib/estilos";
import { fecha } from "@/lib/formato";
import { obtenerUsuario } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";
import { FormReclamo } from "./FormReclamo";
import { HojaReclamo } from "./HojaReclamo";

export const metadata: Metadata = {
  title: "Libro de Reclamaciones · Surtiba",
  description: "Registra un reclamo o una queja. Te respondemos en un máximo de 15 días hábiles.",
};

export default function PaginaLibro() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-8 sm:py-14">
      <div className="print:hidden">
        <p className={sello}>Atención al cliente</p>
        <h1 className="mt-3 flex items-center gap-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          <BookOpenText className="size-8 shrink-0 text-verde" strokeWidth={1.25} aria-hidden="true" />
          Libro de Reclamaciones
        </h1>
        <p className="mt-4 text-gris">
          Cuéntanos qué pasó. Te respondemos en un máximo de {DIAS_HABILES_RESPUESTA} días hábiles. No necesitas una cuenta.
        </p>
        <dl className="mt-6 grid gap-x-6 gap-y-1 rounded-md border border-linea bg-blanco p-4 text-sm sm:grid-cols-[auto_1fr]">
          <dt className="text-gris">Proveedor</dt>
          <dd>
            {EMPRESA.nombre} · {EMPRESA.estado}
          </dd>
          <dt className="text-gris">Razón social y RUC</dt>
          <dd>{EMPRESA.razonSocial && EMPRESA.ruc ? `${EMPRESA.razonSocial} · RUC ${EMPRESA.ruc}` : SIN_DATO}</dd>
          <dt className="text-gris">Dirección</dt>
          <dd>{EMPRESA.direccion ?? SIN_DATO}</dd>
        </dl>
      </div>

      <div className="mt-8">
        <Carga fallback={<EsqueletoTabla filas={6} />}>
          <Libro />
        </Carga>
      </div>
    </main>
  );
}

// Con sesión: sus hojas anteriores (con la respuesta) y el formulario con sus datos ya puestos
async function Libro() {
  const usuario = await obtenerUsuario();
  let iniciales: Record<string, string> = {};
  let hojas: Awaited<ReturnType<typeof misHojas>> = [];
  if (usuario) {
    const supabase = await createClient();
    const [{ data: p }, lista] = await Promise.all([
      supabase.from("perfiles").select("nombre, empresa, whatsapp, ruc, direccion, distrito").eq("id", usuario.id).single(),
      misHojas(usuario.id),
    ]);
    hojas = lista;
    iniciales = {
      nombre: p?.nombre ?? "",
      correo: usuario.email,
      telefono: p?.whatsapp ?? "",
      domicilio: p?.direccion ? `${p.direccion}${p.distrito ? `, ${p.distrito}` : ""}` : "",
    };
  }

  return (
    <div className="flex flex-col gap-10">
      {hojas.length > 0 && (
        <section className="print:hidden">
          <h2 className={sello}>Tus hojas</h2>
          <div className="mt-3 flex flex-col gap-4">
            {hojas.map((h) => (
              <details key={h.codigo} className="group rounded-md border border-linea bg-blanco">
                <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                  <span>
                    <span className="font-mono font-medium">{h.codigo}</span>
                    <span className="ml-2 text-gris">
                      {h.tipo === "queja" ? "Queja" : "Reclamo"} · {fecha(h.creado_en)}
                    </span>
                  </span>
                  <span className={`font-mono text-xs uppercase ${h.respuesta ? "text-verde" : "text-gris"}`}>
                    {h.respuesta ? "Respondida" : `Respuesta hasta el ${fecha(h.fecha_limite)}`}
                  </span>
                </summary>
                <div className="border-t border-linea p-2 sm:p-4">
                  <HojaReclamo h={h} />
                </div>
              </details>
            ))}
          </div>
        </section>
      )}
      <section>
        <h2 className={`${sello} mb-3 print:hidden`}>Nueva hoja</h2>
        <FormReclamo iniciales={iniciales} />
      </section>
    </div>
  );
}

// Las hojas que registró con su cuenta (el filtro por perfil hace falta: al admin, RLS le deja ver todas)
async function misHojas(perfilId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("reclamos")
    .select(
      "codigo, creado_en, fecha_limite, tipo, nombre, tipo_documento, numero_documento, domicilio, telefono, correo, bien, pedido_codigo, monto_centimos, descripcion_bien, detalle, pedido, respuesta, respondido_en",
    )
    .eq("perfil_id", perfilId)
    .order("creado_en", { ascending: false })
    .limit(20);
  return (data ?? []).map((h) => ({ ...h, monto: h.monto_centimos !== null ? String(h.monto_centimos / 100) : null }));
}
