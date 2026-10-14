import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { EsqueletoDetalle } from "@/components/Esqueleto";
import { esUuid, ordenarTramos, urlFoto } from "@/lib/catalogo";
import { exigirRol } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";
import { FormProducto } from "@/app/marca/productos/FormProducto";
import { SubirFoto } from "@/app/marca/productos/SubirFoto";

export const metadata: Metadata = { title: "Editar producto · Panel Surtiba" };

export default function PaginaProductoAdmin({ params, searchParams }: PageProps<"/admin/productos/[id]">) {
  return (
    <Suspense fallback={<EsqueletoDetalle />}>
      <Editar params={params} searchParams={searchParams as Promise<{ creado?: string; guardado?: string }>} />
    </Suspense>
  );
}

async function Editar({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ creado?: string; guardado?: string }>;
}) {
  const [{ id }, avisos] = await Promise.all([params, searchParams, exigirRol("admin")]);
  if (!esUuid(id)) notFound();

  const supabase = await createClient();
  const { data: p } = await supabase
    .from("productos")
    .select(
      "id, marca_id, nombre, categoria, ml, grado, unidades_por_caja, registro_sanitario, stock_cajas, activo, foto_url, marcas(nombre_comercial), escalas_precio(desde_cajas, precio_caja_centimos)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!p) notFound();

  return (
    <>
      <Link href={`/admin/marcas/${p.marca_id}`} className="text-sm font-medium text-verde hover:text-tinta">
        ← {p.marcas?.nombre_comercial}
      </Link>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight sm:text-3xl">{p.nombre}</h1>
      {(avisos.creado || avisos.guardado) && (
        <p role="status" className="mt-4 border-l-2 border-verde pl-3 text-sm">
          {avisos.creado ? "Producto creado. Ahora puedes subir su foto." : "Cambios guardados."}
        </p>
      )}
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-md border border-linea bg-blanco p-5 sm:p-8">
          <FormProducto
            marcaId={p.marca_id}
            inicial={{
              id: p.id,
              nombre: p.nombre,
              categoria: p.categoria,
              ml: String(p.ml),
              grado: String(p.grado),
              unidades: String(p.unidades_por_caja),
              registro: p.registro_sanitario ?? "",
              stock: String(p.stock_cajas),
              activo: p.activo,
              tramos: ordenarTramos(p.escalas_precio).map((t) => ({
                desde: String(t.desde_cajas),
                precio: (t.precio_caja_centimos / 100).toFixed(2),
              })),
            }}
          />
        </div>
        <SubirFoto productoId={p.id} marcaId={p.marca_id} fotoActual={urlFoto(p.foto_url)} />
      </div>
    </>
  );
}
