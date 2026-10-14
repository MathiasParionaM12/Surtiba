import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { EsqueletoTarjetas } from "@/components/Esqueleto";
import { TarjetaProducto } from "@/components/TarjetaProducto";
import { aTarjeta, type ProductoTarjeta } from "@/lib/catalogo";
import { botonPrimario, sello } from "@/lib/estilos";
import { rutaInicio } from "@/lib/roles";
import { obtenerUsuario } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Favoritos · Surtiba" };

export default function PaginaFavoritos() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-8 sm:py-14">
      <p className={sello}>Para volver a pedir rápido</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Favoritos</h1>
      <Suspense fallback={<EsqueletoTarjetas cantidad={4} />}>
        <ListaFavoritos />
      </Suspense>
    </main>
  );
}

async function ListaFavoritos() {
  const usuario = await obtenerUsuario();
  if (!usuario) redirect("/ingresar");
  if (usuario.rol !== "comprador") redirect(rutaInicio(usuario.rol));

  // RLS: solo los favoritos del comprador, y solo productos que puede ver
  const supabase = await createClient();
  const { data } = await supabase
    .from("favoritos")
    .select(
      "creado_en, productos(id, nombre, categoria, ml, grado, unidades_por_caja, stock_cajas, foto_url, activo, marcas(nombre_comercial, activa), escalas_precio(desde_cajas, precio_caja_centimos))",
    )
    .order("creado_en", { ascending: false });

  const productos = (data ?? [])
    .map((f) => (f.productos ? aTarjeta(f.productos, true) : null))
    .filter((p): p is ProductoTarjeta => p !== null);

  if (productos.length === 0) {
    return (
      <div className="mt-8 rounded-md border border-linea bg-blanco p-6">
        <p>Aún no tienes favoritos. Toca el corazón de un producto para guardarlo aquí.</p>
        <Link href="/catalogo" className={`${botonPrimario} mt-5`}>
          Ir al catálogo
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {productos.map((p) => (
        <TarjetaProducto key={p.id} p={p} />
      ))}
    </div>
  );
}
