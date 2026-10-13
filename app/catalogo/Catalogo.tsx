import Link from "next/link";
import { TarjetaProducto, type ProductoTarjeta } from "@/components/TarjetaProducto";
import { CATEGORIAS, esUuid } from "@/lib/catalogo";
import { botonPrimario, botonSecundario, campo } from "@/lib/estilos";
import { obtenerUsuario } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";

export type Filtros = { categoria?: string; marca?: string };

export async function Catalogo({ searchParams }: { searchParams: Promise<Filtros> }) {
  const [usuario, filtros] = await Promise.all([obtenerUsuario(), searchParams]);
  if (usuario) return <CatalogoConSesion filtros={filtros} />;
  return <CatalogoPublico />;
}

// ── Visitante: solo el precio del primer tramo, sin stock ──
async function CatalogoPublico() {
  const supabase = await createClient();
  const { data } = await supabase.from("catalogo_publico").select("*").order("nombre");

  const productos: ProductoTarjeta[] = (data ?? []).map((p) => ({
    id: p.id!,
    nombre: p.nombre!,
    marca: p.marca!,
    categoria: p.categoria!,
    ml: p.ml!,
    grado: p.grado!,
    unidades: p.unidades_por_caja!,
    precioCaja: p.precio_caja_centimos!,
  }));

  return (
    <>
      <div className="mt-6 flex flex-col gap-4 rounded-md border border-linea bg-blanco p-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm">
          Ingresa para ver <strong className="font-medium">precios por volumen y stock</strong>, y para pedir.
        </p>
        <div className="flex gap-2">
          <Link href="/ingresar" className={`${botonSecundario} h-10`}>
            Ingresar
          </Link>
          <Link href="/registro" className={`${botonPrimario} h-10`}>
            Crear cuenta
          </Link>
        </div>
      </div>
      <Rejilla productos={productos} />
    </>
  );
}

// ── Con sesión: filtros, stock y precios por volumen ──
// RLS decide qué productos llegan: comprador = activos de marcas activas;
// marca = los suyos; admin = todos (también los inactivos, que se marcan).
async function CatalogoConSesion({ filtros }: { filtros: Filtros }) {
  const supabase = await createClient();

  let consulta = supabase
    .from("productos")
    .select(
      "id, nombre, categoria, ml, grado, unidades_por_caja, stock_cajas, activo, marcas(nombre_comercial, activa), escalas_precio(desde_cajas, precio_caja_centimos)",
    )
    .order("nombre");
  if (filtros.categoria && CATEGORIAS[filtros.categoria]) consulta = consulta.eq("categoria", filtros.categoria);
  if (esUuid(filtros.marca)) consulta = consulta.eq("marca_id", filtros.marca);

  const [{ data }, { data: marcas }] = await Promise.all([
    consulta,
    supabase.from("marcas").select("id, nombre_comercial").order("nombre_comercial"),
  ]);

  const productos: ProductoTarjeta[] = (data ?? [])
    .filter((p) => p.escalas_precio.some((e) => e.desde_cajas === 1))
    .map((p) => {
      const precios = p.escalas_precio.map((e) => e.precio_caja_centimos);
      return {
        id: p.id,
        nombre: p.nombre,
        marca: p.marcas?.nombre_comercial ?? "",
        categoria: p.categoria,
        ml: p.ml,
        grado: p.grado,
        unidades: p.unidades_por_caja,
        precioCaja: p.escalas_precio.find((e) => e.desde_cajas === 1)!.precio_caja_centimos,
        precioMinimo: Math.min(...precios),
        stock: p.stock_cajas,
        inactivo: !p.activo || !p.marcas?.activa,
      };
    });

  const hayFiltros = !!(filtros.categoria || filtros.marca);

  return (
    <>
      {/* Formulario GET: los filtros quedan en la URL (?categoria=pisco&marca=...) */}
      <form className="mt-6 flex flex-wrap items-end gap-3 rounded-md border border-linea bg-blanco p-4">
        <label className="flex min-w-40 flex-1 flex-col gap-1.5 sm:flex-none">
          <span className="text-xs font-medium text-gris">Categoría</span>
          <select name="categoria" defaultValue={filtros.categoria ?? ""} className={`${campo} h-10`}>
            <option value="">Todas</option>
            {Object.entries(CATEGORIAS).map(([valor, texto]) => (
              <option key={valor} value={valor}>
                {texto}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-40 flex-1 flex-col gap-1.5 sm:flex-none">
          <span className="text-xs font-medium text-gris">Marca</span>
          <select name="marca" defaultValue={filtros.marca ?? ""} className={`${campo} h-10`}>
            <option value="">Todas</option>
            {(marcas ?? []).map((m) => (
              <option key={m.id} value={m.id}>
                {m.nombre_comercial}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className={`${botonSecundario} h-10`}>
          Filtrar
        </button>
        {hayFiltros && (
          <Link href="/catalogo" className="h-10 content-center text-sm font-medium text-verde hover:text-tinta">
            Quitar filtros
          </Link>
        )}
      </form>

      <Rejilla productos={productos} />
    </>
  );
}

function Rejilla({ productos }: { productos: ProductoTarjeta[] }) {
  if (productos.length === 0) {
    return <p className="mt-10 text-gris">No hay productos con esos filtros. Prueba con otra categoría o marca.</p>;
  }
  return (
    <>
      <p className="mt-8 font-mono text-xs text-gris">
        {productos.length} {productos.length === 1 ? "producto" : "productos"}
      </p>
      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {productos.map((p) => (
          <TarjetaProducto key={p.id} p={p} />
        ))}
      </div>
    </>
  );
}
