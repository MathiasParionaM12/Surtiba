import type { Metadata } from "next";
import { Carga } from "@/components/Carga";
import { EsqueletoPagina } from "@/components/Esqueleto";
import { FormAccion } from "@/components/FormAccion";
import { guardarDescripcion, guardarMinimo } from "@/lib/acciones-marca";
import { campo, sello } from "@/lib/estilos";
import { exigirRol } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";
import { COMISION_PCT, PEDIDO_MINIMO_ACTIVO, urlFoto } from "@/lib/catalogo";
import Link from "next/link";
import { SubirLogo } from "./SubirLogo";

export const metadata: Metadata = { title: "Mi marca · Panel de marca · Surtiba" };

export default function PaginaMiMarca() {
  return (
    <Carga fallback={<EsqueletoPagina />}>
      <MiMarca />
    </Carga>
  );
}

async function MiMarca() {
  const usuario = await exigirRol("marca");
  const supabase = await createClient();
  const [{ data: marca }, { data: pv }] = await Promise.all([
    supabase.from("marcas").select("nombre_comercial, pedido_minimo_cajas, descripcion, logo_url").eq("id", usuario.marcaId!).single(),
    supabase
      .from("marcas_privado")
      .select("razon_social, ruc, direccion_recojo, contacto_nombre, contacto_whatsapp, contacto_correo, comision_pct")
      .eq("marca_id", usuario.marcaId!)
      .maybeSingle(),
  ]);

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{marca?.nombre_comercial}</h1>

      {/* Lo que ven los compradores en el directorio de marcas (/marcas) */}
      <section className="mt-6 rounded-md border border-linea bg-blanco p-5 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className={sello}>Tu perfil en el directorio</h2>
          <Link href={`/marcas/${usuario.marcaId}`} className="enlace text-sm font-medium text-verde hover:text-tinta">
            Ver cómo te ven →
          </Link>
        </div>
        <p className="mt-2 text-sm text-gris">Los compradores te encuentran en «Marcas». No mostramos tu contacto ni tu dirección.</p>
        <div className="mt-5 grid gap-6 lg:grid-cols-[auto_minmax(0,1fr)]">
          <SubirLogo marcaId={usuario.marcaId!} nombre={marca?.nombre_comercial ?? ""} logoActual={urlFoto(marca?.logo_url)} />
          <FormAccion accion={guardarDescripcion} ocultos={{}} texto="Guardar descripción" variante="secundario">
            <label className="flex w-full flex-col gap-1.5">
              <span className="text-xs font-medium text-gris">Descripción corta (10 a 280 letras)</span>
              <textarea
                name="descripcion"
                rows={3}
                maxLength={280}
                defaultValue={marca?.descripcion ?? ""}
                placeholder="Ej.: Pisco de uva quebranta de Ica, destilado en alambique de cobre."
                className={`${campo} h-auto py-2`}
              />
            </label>
          </FormAccion>
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {PEDIDO_MINIMO_ACTIVO && (
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
        )}

        <section className="rounded-md border border-linea bg-blanco p-5 sm:p-6">
          <h2 className={sello}>Datos registrados</h2>
          <dl className="mt-3 text-sm">
            {[
              ["Razón social", pv?.razon_social],
              ["RUC", pv?.ruc],
              ["Dirección de recojo", pv?.direccion_recojo],
              ["Contacto", [pv?.contacto_nombre, pv?.contacto_whatsapp].filter(Boolean).join(" · ")],
              ["Correo", pv?.contacto_correo],
              ["Comisión de Surtiba", `${pv?.comision_pct ?? COMISION_PCT}% sobre lo entregado (tus primeras 3 entregas no pagan)`],
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
