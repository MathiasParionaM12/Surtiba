import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { EsqueletoPagina } from "@/components/Esqueleto";
import { esUuid } from "@/lib/catalogo";
import { exigirRol } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";
import { FormTipo } from "./FormTipo";

export const metadata: Metadata = { title: "Tipo de evento · Panel Surtiba" };

export default function PaginaTipoEvento({ params, searchParams }: PageProps<"/admin/cotizador/tipos/[id]">) {
  return (
    <>
      <Link href="/admin/cotizador" className="text-sm font-medium text-verde hover:text-tinta">
        ← Cotizador
      </Link>
      <div className="mt-6">
        <Suspense fallback={<EsqueletoPagina />}>
          <Contenido params={params} searchParams={searchParams as Promise<{ creado?: string }>} />
        </Suspense>
      </div>
    </>
  );
}

async function Contenido({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ creado?: string }> }) {
  const [{ id }, { creado }] = await Promise.all([params, searchParams, exigirRol("admin")]);
  const nuevo = id === "nuevo";
  if (!nuevo && !esUuid(id)) notFound();

  const supabase = await createClient();
  const [{ data: recetas }, { data: tipo }] = await Promise.all([
    supabase.from("recetas").select("id, nombre, categoria, activo").order("orden"),
    nuevo
      ? Promise.resolve({ data: null })
      : supabase
          .from("tipos_evento")
          .select(
            "id, nombre, activo, horas, perfil, bienvenida, bienvenida_horas, bienvenida_receta_id, brindis, cena, cena_horas, tipo_evento_recetas(receta_id, nivel)",
          )
          .eq("id", id)
          .maybeSingle(),
  ]);
  if (!nuevo && !tipo) notFound();

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{tipo ? tipo.nombre : "Nuevo tipo de evento"}</h1>
      {creado && <p className="mt-4 border-l-2 border-verde pl-3 text-sm">Tipo de evento creado. Ya aparece en el cotizador.</p>}
      <FormTipo
        tipo={
          tipo
            ? {
                id: tipo.id,
                nombre: tipo.nombre,
                activo: tipo.activo,
                horas: tipo.horas,
                perfil: tipo.perfil,
                bienvenida: tipo.bienvenida,
                bienvenida_horas: Number(tipo.bienvenida_horas),
                bienvenida_receta_id: tipo.bienvenida_receta_id,
                brindis: tipo.brindis,
                cena: tipo.cena,
                cena_horas: Number(tipo.cena_horas),
                barra: Object.fromEntries(tipo.tipo_evento_recetas.map((m) => [m.receta_id, m.nivel])),
              }
            : null
        }
        recetas={recetas ?? []}
      />
    </>
  );
}
