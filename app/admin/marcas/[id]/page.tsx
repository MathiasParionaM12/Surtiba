import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Carga } from "@/components/Carga";
import { EsqueletoPagina } from "@/components/Esqueleto";
import { FormAccion } from "@/components/FormAccion";
import { guardarMarca } from "@/lib/acciones-admin";
import { COMISION_PCT, esUuid, ordenarTramos, PEDIDO_MINIMO_ACTIVO } from "@/lib/catalogo";
import { botonPrimario, campo, sello } from "@/lib/estilos";
import { soles } from "@/lib/formato";
import { exigirRol } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Marca · Panel Surtiba" };

export default function PaginaMarcaAdmin({ params }: PageProps<"/admin/marcas/[id]">) {
  return (
    <>
      <Link href="/admin/marcas" className="text-sm font-medium enlace text-verde hover:text-tinta">
        ← Marcas
      </Link>
      <div className="mt-6">
        <Carga fallback={<EsqueletoPagina />}>
          <Marca params={params} />
        </Carga>
      </div>
    </>
  );
}

async function Marca({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }] = await Promise.all([params, exigirRol("admin")]);
  if (!esUuid(id)) notFound();

  const supabase = await createClient();
  const { data: m } = await supabase
    .from("marcas")
    .select(
      "id, nombre_comercial, pedido_minimo_cajas, activa, marcas_privado(razon_social, ruc, contacto_nombre, contacto_whatsapp, contacto_correo, direccion_recojo, comision_pct), productos(id, nombre, stock_cajas, activo, escalas_precio(desde_cajas, precio_caja_centimos))",
    )
    .eq("id", id)
    .maybeSingle();
  if (!m) notFound();
  const pv = m.marcas_privado;

  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">{m.nombre_comercial}</h1>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* Datos de la marca */}
        <section className="rounded-md border border-linea bg-blanco p-5 sm:p-6">
          <h2 className={sello}>Datos de la marca</h2>
          <FormAccion accion={guardarMarca} ocultos={{ marca_id: m.id }} texto="Guardar cambios" className="mt-4">
            <div className="grid w-full grid-cols-2 gap-4">
              <Campo nombre="nombre" etiqueta="Nombre comercial" valor={m.nombre_comercial} ancho />
              {/* Comisión fija (COMISION_PCT) y pedido mínimo que decide la marca: aquí solo se muestran */}
              <input type="hidden" name="comision" value={String(pv?.comision_pct ?? COMISION_PCT)} />
              <input type="hidden" name="pedido_minimo" value={String(m.pedido_minimo_cajas)} />
              <Dato etiqueta="Comisión" valor={`${pv?.comision_pct ?? COMISION_PCT}% (fija por ahora)`} />
              {PEDIDO_MINIMO_ACTIVO && <Dato etiqueta="Pedido mínimo" valor={`${m.pedido_minimo_cajas} cajas (lo decide la marca)`} />}
              <Campo nombre="razon_social" etiqueta="Razón social" valor={pv?.razon_social ?? ""} ancho />
              <Campo nombre="ruc" etiqueta="RUC" valor={pv?.ruc ?? ""} mono />
              <Campo nombre="contacto_whatsapp" etiqueta="WhatsApp de contacto" valor={pv?.contacto_whatsapp ?? ""} mono />
              <Campo nombre="contacto_nombre" etiqueta="Persona de contacto" valor={pv?.contacto_nombre ?? ""} />
              <Campo nombre="contacto_correo" etiqueta="Correo de contacto" valor={pv?.contacto_correo ?? ""} />
              <Campo nombre="direccion_recojo" etiqueta="Dirección de recojo" valor={pv?.direccion_recojo ?? ""} ancho />
              <label className="col-span-2 flex items-center gap-3">
                <input name="activa" type="checkbox" defaultChecked={m.activa} className="size-5 accent-verde" />
                <span className="text-sm">Activa (sus productos se ven en el catálogo)</span>
              </label>
            </div>
          </FormAccion>
          <p className="mt-3 text-xs text-gris">Cada pedido guarda el % de comisión del momento en que se hizo.</p>
        </section>

        {/* Productos */}
        <section>
          <div className="flex items-center justify-between gap-3">
            <h2 className={sello}>Productos</h2>
            <Link href={`/admin/productos/nuevo?marca=${m.id}`} className={`${botonPrimario} h-10`}>
              Nuevo producto
            </Link>
          </div>
          {m.productos.length === 0 ? (
            <p className="mt-3 rounded-md border border-linea bg-blanco p-4 text-sm text-gris">Esta marca aún no tiene productos.</p>
          ) : (
            <ul className="mt-3 overflow-hidden rounded-md border border-linea bg-blanco">
              {m.productos.map((p) => {
                const primero = ordenarTramos(p.escalas_precio)[0];
                return (
                  <li key={p.id} className="border-b border-linea last:border-b-0">
                    <Link href={`/admin/productos/${p.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-papel">
                      <span>
                        {p.nombre}
                        {!p.activo && <span className="ml-2 text-xs text-gris">(inactivo)</span>}
                      </span>
                      <span className="text-right font-mono text-xs text-gris">
                        {primero ? soles(primero.precio_caja_centimos) : "Sin precio"} · {p.stock_cajas} cajas
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

function Campo({
  nombre,
  etiqueta,
  valor,
  tipo = "text",
  mono = false,
  ancho = false,
}: {
  nombre: string;
  etiqueta: string;
  valor: string;
  tipo?: string;
  mono?: boolean;
  ancho?: boolean;
}) {
  return (
    <label className={`flex flex-col gap-1.5 ${ancho ? "col-span-2" : ""}`}>
      <span className="text-xs font-medium text-gris">{etiqueta}</span>
      <input
        name={nombre}
        type={tipo}
        step={tipo === "number" ? "any" : undefined}
        defaultValue={valor}
        className={`${campo} h-10 ${mono ? "font-mono" : ""}`}
      />
    </label>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-gris">{etiqueta}</span>
      <p className="flex h-10 items-center font-mono text-sm">{valor}</p>
    </div>
  );
}
