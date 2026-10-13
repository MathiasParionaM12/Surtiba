import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { sello } from "@/lib/estilos";
import { rutaInicio } from "@/lib/roles";
import { obtenerUsuario } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Panel Surtiba · Surtiba" };

export default function PaginaAdmin() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-8 sm:py-14">
      <Suspense fallback={<p className="text-gris">Cargando el panel…</p>}>
        <PanelAdmin />
      </Suspense>
    </main>
  );
}

async function PanelAdmin() {
  const usuario = await obtenerUsuario();
  if (!usuario) redirect("/ingresar");
  if (usuario.rol !== "admin") redirect(rutaInicio(usuario.rol));

  const supabase = await createClient();
  const [pedidos, marcas, compradores] = await Promise.all([
    supabase.from("pedidos").select("*", { count: "exact", head: true }),
    supabase.from("marcas").select("*", { count: "exact", head: true }).eq("activa", true),
    supabase.from("perfiles").select("*", { count: "exact", head: true }).eq("rol", "comprador"),
  ]);

  return (
    <>
      <p className={sello}>Panel Surtiba</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Hola, {usuario.nombre ?? "equipo Surtiba"}</h1>

      <div className="mt-8 grid grid-cols-3 overflow-hidden rounded-md border border-linea bg-blanco">
        {[
          [pedidos.count ?? 0, "Pedidos"],
          [marcas.count ?? 0, "Marcas activas"],
          [compradores.count ?? 0, "Compradores"],
        ].map(([valor, texto]) => (
          <div key={texto} className="border-r border-linea p-4 last:border-r-0 sm:p-5">
            <p className="font-mono text-2xl font-medium sm:text-3xl">{valor}</p>
            <p className="mt-1 text-xs text-gris sm:text-sm">{texto}</p>
          </div>
        ))}
      </div>

      <p className="mt-10 border-l-2 border-linea pl-3 text-sm text-gris">
        Próximamente en este panel: crear marcas, gestionar pedidos, recojos y entregas, marcar pagos y ver las métricas.
      </p>
    </>
  );
}
