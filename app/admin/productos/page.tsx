import { PackageCheck } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Carga } from "@/components/Carga";
import { EsqueletoTabla } from "@/components/Esqueleto";
import { EstadoVacio } from "@/components/EstadoVacio";
import { FormAccion } from "@/components/FormAccion";
import { revisarProducto } from "@/lib/acciones-admin";
import { CATEGORIAS, ordenarTramos, textoTramo, urlFoto } from "@/lib/catalogo";
import { campo, sello } from "@/lib/estilos";
import { fecha, soles } from "@/lib/formato";
import { exigirRol } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Productos por aprobar · Panel Surtiba" };

// Productos nuevos de las marcas (5-nov-2026): aparecen en el catálogo recién cuando el admin los aprueba
export default function PaginaProductosPorAprobar() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Productos por aprobar</h1>
      <p className="mt-2 max-w-2xl text-gris">
        Lo nuevo que suben las marcas. Revisa los datos, el registro sanitario y los precios. Si lo rechazas, la marca recibe el motivo y
        puede corregirlo.
      </p>
      <Carga fallback={<EsqueletoTabla filas={3} />}>
        <Lista />
      </Carga>
    </>
  );
}

async function Lista() {
  await exigirRol("admin");
  const supabase = await createClient();
  const { data } = await supabase
    .from("productos")
    .select(
      "id, nombre, categoria, ml, grado, unidades_por_caja, registro_sanitario, stock_cajas, foto_url, creado_en, marcas(nombre_comercial), escalas_precio(desde_cajas, hasta_cajas, precio_caja_centimos)",
    )
    .eq("revision", "pendiente")
    .order("creado_en");

  if (!data || data.length === 0) {
    return <EstadoVacio icono={PackageCheck} texto="No hay productos por aprobar." />;
  }

  return (
    <div className="mt-6 flex flex-col gap-4">
      {data.map((p) => {
        const foto = urlFoto(p.foto_url);
        return (
          <article key={p.id} className="rounded-md border border-linea bg-blanco p-4 sm:p-5">
            <div className="flex flex-wrap gap-4">
              <div className="relative size-20 shrink-0 overflow-hidden rounded-md border border-linea bg-papel">
                {foto ? <Image src={foto} alt="" fill sizes="80px" className="object-contain p-1" /> : null}
              </div>
              <div className="min-w-0 flex-1 basis-60">
                <p className={sello}>{p.marcas?.nombre_comercial}</p>
                <h2 className="mt-1 text-lg font-semibold">{p.nombre}</h2>
                <p className="mt-1 font-mono text-xs text-gris">
                  {CATEGORIAS[p.categoria]} · {p.ml} ml · {p.grado} % · {p.unidades_por_caja} u/caja · {p.stock_cajas} cajas en stock
                </p>
                <p className="mt-1 text-sm">
                  Registro sanitario: {p.registro_sanitario ? <span className="font-mono">{p.registro_sanitario}</span> : <span className="text-rojo">no puso</span>}
                </p>
                <p className="mt-1 text-xs text-gris">
                  Subido el {fecha(p.creado_en)} ·{" "}
                  <Link href={`/admin/productos/${p.id}`} className="font-medium enlace text-verde hover:text-tinta">
                    Ver o corregir
                  </Link>
                </p>
              </div>
              <ul className="w-full text-sm sm:w-56">
                {ordenarTramos(p.escalas_precio).map((t) => (
                  <li key={t.desde_cajas} className="flex justify-between gap-3 border-b border-linea py-1 last:border-b-0">
                    <span className="font-mono text-gris">{textoTramo(t)}</span>
                    <span className="font-mono">{soles(t.precio_caja_centimos)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-linea pt-4">
              <FormAccion accion={revisarProducto} ocultos={{ producto_id: p.id, decision: "aprobar" }} texto="Aprobar" />
              <FormAccion
                accion={revisarProducto}
                ocultos={{ producto_id: p.id, decision: "rechazar" }}
                texto="Rechazar"
                variante="secundario"
                className="min-w-0 flex-1 basis-72"
              >
                <label className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-xs text-gris">Motivo si lo rechazas</span>
                  <input name="motivo" maxLength={300} placeholder="Ej.: falta el registro sanitario" className={`${campo} h-10`} />
                </label>
              </FormAccion>
            </div>
          </article>
        );
      })}
    </div>
  );
}
