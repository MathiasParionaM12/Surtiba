import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { EsqueletoTabla } from "@/components/Esqueleto";
import { botonSecundario, sello } from "@/lib/estilos";
import { mananaEnLima, soles } from "@/lib/formato";
import { rutaInicio } from "@/lib/roles";
import { obtenerUsuario } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";
import { FormConfirmar } from "./FormConfirmar";

export const metadata: Metadata = { title: "Confirmar pedido · Surtiba" };

export default function PaginaConfirmar() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-8 sm:py-14">
      <Link href="/carrito" className="text-sm font-medium text-verde hover:text-tinta">
        ← Volver al carrito
      </Link>
      <p className={`${sello} mt-6`}>Último paso</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Confirmar pedido</h1>
      <Suspense fallback={<EsqueletoTabla filas={6} />}>
        <Confirmar />
      </Suspense>
    </main>
  );
}

async function Confirmar() {
  const usuario = await obtenerUsuario();
  if (!usuario) redirect("/ingresar");
  if (usuario.rol !== "comprador") redirect(rutaInicio(usuario.rol));

  const supabase = await createClient();
  const { data } = await supabase.from("carrito_detalle").select("marca, cajas, subtotal_centimos").order("marca");
  const lineas = data ?? [];
  if (lineas.length === 0) redirect("/carrito");

  // Resumen por marca (los precios ya vienen calculados por la base de datos)
  const porMarca = new Map<string, { cajas: number; total: number }>();
  for (const l of lineas) {
    const m = porMarca.get(l.marca!) ?? { cajas: 0, total: 0 };
    m.cajas += l.cajas!;
    m.total += l.subtotal_centimos ?? 0;
    porMarca.set(l.marca!, m);
  }
  const total = [...porMarca.values()].reduce((s, m) => s + m.total, 0);

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div className="rounded-md border border-linea bg-blanco p-5 sm:p-8">
        <FormConfirmar fechaMinima={mananaEnLima()} totalTexto={soles(total)} />
      </div>

      <aside className="h-fit rounded-md border border-linea bg-blanco p-5 lg:sticky lg:top-24">
        <h2 className={sello}>Tu pedido</h2>
        <ul className="mt-4 flex flex-col gap-3 text-sm">
          {[...porMarca.entries()].map(([marca, m]) => (
            <li key={marca} className="flex justify-between gap-3">
              <span>
                {marca}
                <span className="block font-mono text-xs text-gris">{m.cajas} cajas</span>
              </span>
              <span className="font-mono">{soles(m.total)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex justify-between border-t border-linea pt-3">
          <span className="font-medium">Total</span>
          <span className="font-mono font-semibold">{soles(total)}</span>
        </div>
        <p className="mt-2 text-xs text-gris">Envío: tarifa por definir.</p>
        <Link href="/carrito" className={`${botonSecundario} mt-5 w-full`}>
          Editar carrito
        </Link>
      </aside>
    </div>
  );
}
