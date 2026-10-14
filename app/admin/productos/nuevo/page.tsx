import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { EsqueletoTabla } from "@/components/Esqueleto";
import { esUuid } from "@/lib/catalogo";
import { exigirRol } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";
import { FormProducto } from "@/app/marca/productos/FormProducto";

export const metadata: Metadata = { title: "Nuevo producto · Panel Surtiba" };

export default function PaginaNuevoProductoAdmin({ searchParams }: PageProps<"/admin/productos/nuevo">) {
  return (
    <Suspense fallback={<EsqueletoTabla filas={3} />}>
      <Nuevo searchParams={searchParams as Promise<{ marca?: string }>} />
    </Suspense>
  );
}

async function Nuevo({ searchParams }: { searchParams: Promise<{ marca?: string }> }) {
  const [{ marca }] = await Promise.all([searchParams, exigirRol("admin")]);
  if (!esUuid(marca)) notFound();
  const supabase = await createClient();
  const { data: m } = await supabase.from("marcas").select("id, nombre_comercial").eq("id", marca).maybeSingle();
  if (!m) notFound();

  return (
    <>
      <Link href={`/admin/marcas/${m.id}`} className="text-sm font-medium text-verde hover:text-tinta">
        ← {m.nombre_comercial}
      </Link>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight sm:text-3xl">Nuevo producto de {m.nombre_comercial}</h1>
      <p className="mt-2 text-gris">Después de crearlo podrás subir su foto.</p>
      <div className="mt-6 max-w-3xl rounded-md border border-linea bg-blanco p-5 sm:p-8">
        <FormProducto
          marcaId={m.id}
          inicial={{
            nombre: "",
            categoria: "",
            ml: "750",
            grado: "",
            unidades: "12",
            registro: "",
            stock: "0",
            activo: true,
            tramos: [{ desde: "1", precio: "" }],
          }}
        />
      </div>
    </>
  );
}
