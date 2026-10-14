import type { Metadata } from "next";
import { Suspense } from "react";
import { EsqueletoTabla } from "@/components/Esqueleto";
import { exigirRol } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";
import { FormStock } from "./FormStock";

export const metadata: Metadata = { title: "Stock · Panel de marca · Surtiba" };

export default function PaginaStock() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Stock</h1>
      <p className="mt-2 max-w-2xl text-gris">
        Cajas que tienes disponibles para vender. Cuando llega un pedido, sus cajas se descuentan solas.
      </p>
      <div className="mt-6">
        <Suspense fallback={<EsqueletoTabla filas={4} />}>
          <Stock />
        </Suspense>
      </div>
    </>
  );
}

async function Stock() {
  await exigirRol("marca");
  const supabase = await createClient();
  const { data } = await supabase.from("productos").select("id, nombre, stock_cajas, activo, unidades_por_caja").order("nombre");

  if (!data || data.length === 0) {
    return <p className="rounded-md border border-linea bg-blanco p-5 text-gris">Aún no tienes productos. Créalos en la pestaña Productos.</p>;
  }

  return (
    <FormStock
      productos={data.map((p) => ({ id: p.id, nombre: p.nombre, stock: p.stock_cajas, activo: p.activo, unidades: p.unidades_por_caja }))}
    />
  );
}
