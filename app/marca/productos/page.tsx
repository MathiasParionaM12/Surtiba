import { Wine } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Carga } from "@/components/Carga";
import { EsqueletoTabla } from "@/components/Esqueleto";
import { CATEGORIAS, ordenarTramos, urlFoto } from "@/lib/catalogo";
import { botonPrimario } from "@/lib/estilos";
import { soles } from "@/lib/formato";
import { exigirRol } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";
import { EstadoVacio } from "@/components/EstadoVacio";
import { TablaProductos } from "./TablaProductos";

export const metadata: Metadata = { title: "Productos · Panel de marca · Surtiba" };

export default function PaginaProductos() {
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Productos</h1>
          <p className="mt-2 text-gris">Tu catálogo y las cajas que tienes disponibles. Los datos, fotos y precios se cambian en «Editar».</p>
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
    <TablaProductos
      productos={data.map((p) => {
        const tramos = ordenarTramos(p.escalas_precio);
        return {
          id: p.id,
          nombre: p.nombre,
          detalle: `${CATEGORIAS[p.categoria]} · ${p.ml} ml · ${tramos.length} ${tramos.length === 1 ? "precio" : "precios"} por volumen`,
          precio: tramos[0] ? soles(tramos[0].precio_caja_centimos) : "Sin precio",
          foto: urlFoto(p.foto_url),
          stock: p.stock_cajas,
          activo: p.activo,
        };
      })}
    />
  );
}
