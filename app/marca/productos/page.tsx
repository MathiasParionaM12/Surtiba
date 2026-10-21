import { Wine } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Carga } from "@/components/Carga";
import { EsqueletoTabla } from "@/components/Esqueleto";
import { CATEGORIAS, ordenarTramos, urlFoto } from "@/lib/catalogo";
import { botonPrimario, sello } from "@/lib/estilos";
import { soles } from "@/lib/formato";
import { exigirRol } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";
import { EstadoVacio } from "@/components/EstadoVacio";

export const metadata: Metadata = { title: "Productos · Panel de marca · Surtiba" };

export default function PaginaProductos() {
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Productos</h1>
          <p className="mt-2 text-gris">Tu catálogo: datos, fotos y precios por volumen.</p>
        </div>
        <Link href="/marca/productos/nuevo" className={botonPrimario}>
          Nuevo producto
        </Link>
      </div>
      <Carga fallback={<EsqueletoTabla filas={4} />}>
        <ListaProductos />
      </Carga>
    </>
  );
}

async function ListaProductos() {
  await exigirRol("marca");
  const supabase = await createClient();
  const { data } = await supabase
    .from("productos")
    .select("id, nombre, categoria, ml, stock_cajas, activo, foto_url, escalas_precio(desde_cajas, precio_caja_centimos)")
    .order("nombre");

  if (!data || data.length === 0) {
    return (
      <EstadoVacio
        icono={Wine}
        texto="Aún no tienes productos. Crea el primero para que aparezca en el catálogo."
        accion={{ href: "/marca/productos/nuevo", texto: "Nuevo producto" }}
      />
    );
  }

  return (
    <ul className="mt-6 overflow-hidden rounded-md border border-linea bg-blanco">
      {data.map((p) => {
        const tramos = ordenarTramos(p.escalas_precio);
        const foto = urlFoto(p.foto_url);
        return (
          <li key={p.id} className="border-b border-linea last:border-b-0">
            <Link href={`/marca/productos/${p.id}`} className="flex items-center gap-4 px-4 py-3 hover:bg-papel">
              <div className="relative size-12 shrink-0 overflow-hidden rounded-md border border-linea bg-papel">
                {foto && <Image src={foto} alt="" fill sizes="48px" className="object-contain p-1" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{p.nombre}</p>
                <p className="font-mono text-xs text-gris">
                  {CATEGORIAS[p.categoria]} · {p.ml} ml · {tramos.length} {tramos.length === 1 ? "precio" : "precios"} por volumen
                </p>
              </div>
              <div className="hidden text-right sm:block">
                <p className="font-mono text-sm">{tramos[0] ? soles(tramos[0].precio_caja_centimos) : "Sin precio"}</p>
                <p className="font-mono text-xs text-gris">{p.stock_cajas} cajas</p>
              </div>
              <span className={`${sello} w-16 text-right`}>{p.activo ? "Activo" : "Inactivo"}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
