import { Calculator } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Carga } from "@/components/Carga";
import { EsqueletoTabla } from "@/components/Esqueleto";
import { botonPrimario, sello } from "@/lib/estilos";
import { fecha, soles } from "@/lib/formato";
import { rutaInicio } from "@/lib/roles";
import { obtenerUsuario } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Mis cotizaciones · Surtiba" };

type Evento = { version?: number; tipo?: string; invitados?: number; resumen?: { nombre?: string; tipo?: string; invitados?: number; fecha?: string } } | null;

export default function PaginaCotizaciones() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-8 sm:py-14">
      <p className={sello}>Cotizador de evento</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Mis cotizaciones</h1>
      <Carga fallback={<EsqueletoTabla filas={4} />}>
        <Lista />
      </Carga>
    </main>
  );
}

async function Lista() {
  const usuario = await obtenerUsuario();
  if (!usuario) redirect("/ingresar");
  if (usuario.rol !== "comprador") redirect(rutaInicio(usuario.rol));

  // RLS: cada comprador recibe solo las suyas
  const supabase = await createClient();
  const { data } = await supabase
    .from("cotizaciones")
    .select("id, codigo, creado_en, total_centimos, evento, pedido_id, pedidos(codigo)")
    .order("creado_en", { ascending: false });
  const cotizaciones = data ?? [];

  if (cotizaciones.length === 0) {
    return (
      <div className="mt-8 rounded-md border border-linea bg-blanco p-6">
        <Calculator className="mb-3 size-8 text-gris" strokeWidth={1.5} aria-hidden="true" />
        <p>Aún no tienes cotizaciones. Arma tu evento en el cotizador y guárdala en PDF.</p>
        <Link href="/cotizador" className={`${botonPrimario} mt-5`}>
          Ir al cotizador
        </Link>
      </div>
    );
  }

  return (
    <ul className="mt-8 flex flex-col gap-3">
      {cotizaciones.map((c) => {
        const e = c.evento as Evento;
        const r = e?.version === 2 ? e.resumen : undefined;
        const titulo = r?.nombre || r?.tipo || e?.tipo || "Desde el carrito";
        const invitados = r?.invitados ?? e?.invitados;
        return (
          <li key={c.id} className="flex flex-col gap-3 rounded-md border border-linea bg-blanco p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="min-w-0">
              <p className="font-medium">{titulo}</p>
              <p className="mt-0.5 text-sm text-gris">
                <span className="font-mono">{c.codigo}</span> · {fecha(c.creado_en)}
                {invitados ? ` · ${invitados} invitados` : ""}
                {r?.fecha ? ` · evento el ${fecha(r.fecha)}` : ""}
              </p>
              {c.pedido_id && (
                <p className="mt-1 text-xs text-verde">
                  Terminó en el pedido{" "}
                  <Link href={`/pedidos/${c.pedido_id}`} className="font-mono underline underline-offset-4">
                    {c.pedidos?.codigo}
                  </Link>
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <span className="font-mono font-medium">{soles(c.total_centimos)}</span>
              {e?.version === 2 && (
                <Link href={`/cotizador?desde=${c.id}`} className="text-sm font-medium text-verde hover:text-tinta">
                  Abrir en el cotizador
                </Link>
              )}
              <a href={`/cotizaciones/${c.id}/pdf`} download className="text-sm font-medium text-verde hover:text-tinta">
                PDF
              </a>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
