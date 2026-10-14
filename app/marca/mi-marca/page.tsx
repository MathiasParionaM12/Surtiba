import type { Metadata } from "next";
import { Suspense } from "react";
import { EsqueletoPagina } from "@/components/Esqueleto";
import { FormAccion } from "@/components/FormAccion";
import { guardarMinimo } from "@/lib/acciones-marca";
import { campo, sello } from "@/lib/estilos";
import { exigirRol } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Mi marca · Panel de marca · Surtiba" };

export default function PaginaMiMarca() {
  return (
    <Suspense fallback={<EsqueletoPagina />}>
      <MiMarca />
    </Suspense>
  );
}

async function MiMarca() {
  const usuario = await exigirRol("marca");
  const supabase = await createClient();
  const [{ data: marca }, { data: pv }] = await Promise.all([
    supabase.from("marcas").select("nombre_comercial, pedido_minimo_cajas").eq("id", usuario.marcaId!).single(),
    supabase
      .from("marcas_privado")
      .select("razon_social, ruc, direccion_recojo, contacto_nombre, contacto_whatsapp, contacto_correo, comision_pct")
      .eq("marca_id", usuario.marcaId!)
      .maybeSingle(),
  ]);

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{marca?.nombre_comercial}</h1>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-md border border-linea bg-blanco p-5 sm:p-6">
          <h2 className={sello}>Pedido mínimo</h2>
          <p className="mt-2 text-sm text-gris">
            Lo mínimo que un cliente debe pedirte en un pedido, sumando cualquiera de tus productos. Lo decides tú.
          </p>
          <FormAccion accion={guardarMinimo} ocultos={{}} texto="Guardar" className="mt-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-gris">Cajas</span>
              <div className="w-28">
                <input
                  name="pedido_minimo"
                  type="number"
                  min={1}
                  max={9999}
                  required
                  defaultValue={marca?.pedido_minimo_cajas}
                  className={`${campo} h-10 font-mono`}
                />
              </div>
            </label>
          </FormAccion>
          <p className="mt-3 text-xs text-gris">El cambio vale para los pedidos nuevos; los ya hechos no cambian.</p>
        </section>

        <section className="rounded-md border border-linea bg-blanco p-5 sm:p-6">
          <h2 className={sello}>Datos registrados</h2>
          <dl className="mt-3 text-sm">
            {[
              ["Razón social", pv?.razon_social],
              ["RUC", pv?.ruc],
              ["Dirección de recojo", pv?.direccion_recojo],
              ["Contacto", [pv?.contacto_nombre, pv?.contacto_whatsapp].filter(Boolean).join(" · ")],
              ["Correo", pv?.contacto_correo],
              ["Comisión de Surtiba", `${pv?.comision_pct ?? 5}% sobre lo entregado (tus primeras 3 entregas no pagan)`],
            ].map(([k, valor]) => (
              <div key={k} className="border-b border-linea py-2.5 last:border-b-0">
                <dt className="text-xs text-gris">{k}</dt>
                <dd className="mt-0.5">{valor || "—"}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs text-gris">Para cambiar estos datos, escríbele al equipo Surtiba.</p>
        </section>
      </div>
    </>
  );
}
