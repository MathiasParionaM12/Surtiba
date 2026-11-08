import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Carga } from "@/components/Carga";
import { EsqueletoPagina } from "@/components/Esqueleto";
import { FormAccion } from "@/components/FormAccion";
import { Estrellas } from "@/components/SellosMarca";
import { guardarMarca, ocultarCalificacion, verificarMarca } from "@/lib/acciones-admin";
import { COMISION_PCT, esUuid, ordenarTramos } from "@/lib/catalogo";
import { botonPrimario, campo, sello } from "@/lib/estilos";
import { fecha, soles } from "@/lib/formato";
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
      "id, nombre_comercial, pedido_minimo_cajas, activa, verificada, marcas_privado(razon_social, ruc, contacto_nombre, contacto_whatsapp, contacto_correo, direccion_recojo, comision_pct), productos(id, nombre, stock_cajas, activo, escalas_precio(desde_cajas, precio_caja_centimos))",
    )
    .eq("id", id)
    .maybeSingle();
  if (!m) notFound();
  const pv = m.marcas_privado;
  // El admin ve todas, también las ocultas (RLS)
  const { data: calificaciones } = await supabase
    .from("calificaciones")
    .select("id, estrellas, comentario, oculta, creado_en")
    .eq("marca_id", m.id)
    .order("creado_en", { ascending: false });
  const visibles = (calificaciones ?? []).filter((c) => !c.oculta);
  const promedio = visibles.length ? visibles.reduce((t, c) => t + c.estrellas, 0) / visibles.length : null;

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

      {/* Confianza: sello de verificada y calificaciones de los compradores */}
      <section className="mt-10">
        <h2 className={sello}>Confianza</h2>
        <div className="mt-3 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <div className="flex flex-col gap-3 rounded-md border border-linea bg-blanco p-5">
            <p className="font-medium">{m.verificada ? "Marca verificada" : "Sin verificar"}</p>
            <p className="text-sm text-gris">
              Márcala como verificada cuando hayas revisado su RUC y el registro sanitario de sus productos. Los compradores ven el sello.
            </p>
            <FormAccion
              accion={verificarMarca}
              ocultos={{ marca_id: m.id, verificada: m.verificada ? "false" : "true" }}
              texto={m.verificada ? "Quitar verificación" : "Marcar como verificada"}
              variante={m.verificada ? "secundario" : "primario"}
            />
          </div>
          <div className="rounded-md border border-linea bg-blanco">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-linea px-5 py-3">
              <p className="font-medium">Calificaciones de compradores</p>
              {promedio !== null && (
                <span className="flex items-center gap-2 text-sm">
                  <Estrellas valor={promedio} />
                  <span className="font-mono">{promedio.toFixed(1)}</span>
                  <span className="text-gris">({visibles.length} visibles)</span>
                </span>
              )}
            </div>
            {(calificaciones ?? []).length === 0 ? (
              <p className="px-5 py-4 text-sm text-gris">Aún no la califica nadie.</p>
            ) : (
              <ul>
                {(calificaciones ?? []).map((c) => (
                  <li key={c.id} className={`flex flex-wrap items-start justify-between gap-3 border-b border-linea px-5 py-3 last:border-b-0 ${c.oculta ? "bg-papel" : ""}`}>
                    <div className={`min-w-0 flex-1 ${c.oculta ? "opacity-60" : ""}`}>
                      <div className="flex items-center gap-2">
                        <Estrellas valor={c.estrellas} className="size-3.5" />
                        <span className="font-mono text-xs text-gris">{fecha(c.creado_en)}</span>
                        {c.oculta && <span className="text-xs font-medium text-rojo">Oculta</span>}
                      </div>
                      {c.comentario && <p className="mt-1 text-sm">{c.comentario}</p>}
                    </div>
                    <FormAccion
                      accion={ocultarCalificacion}
                      ocultos={{ calificacion_id: c.id, oculta: c.oculta ? "false" : "true" }}
                      texto={c.oculta ? "Mostrar" : "Ocultar"}
                      variante="secundario"
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
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
