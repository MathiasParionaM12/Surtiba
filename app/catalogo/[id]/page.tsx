import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Carga } from "@/components/Carga";
import { EsqueletoDetalle } from "@/components/Esqueleto";
import { BotonFavorito } from "@/components/BotonFavorito";
import { FotoProducto } from "@/components/FotoProducto";
import { CATEGORIAS, esUuid, ordenarTramos, PEDIDO_MINIMO_ACTIVO, textoTramo, urlFoto } from "@/lib/catalogo";
import { botonPrimario, botonSecundario, sello } from "@/lib/estilos";
import { soles } from "@/lib/formato";
import { catalogoPublico } from "@/lib/catalogo-publico";
import { obtenerUsuario } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";
import { FormAgregar } from "./FormAgregar";

export const metadata: Metadata = { title: "Producto · Surtiba" };

export default function PaginaProducto({ params }: PageProps<"/catalogo/[id]">) {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-8 sm:py-12">
      <Link href="/catalogo" className="text-sm font-medium text-verde hover:text-tinta">
        ← Volver al catálogo
      </Link>
      <Carga fallback={<EsqueletoDetalle />}>
        <Detalle params={params} />
      </Carga>
    </main>
  );
}

async function Detalle({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, usuario] = await Promise.all([params, obtenerUsuario()]);
  if (usuario?.rol === "solicitante") redirect("/solicitud");
  if (!esUuid(id)) notFound();
  const supabase = await createClient();

  // Visitante: datos públicos y precio del primer tramo
  if (!usuario) {
    const p = (await catalogoPublico()).find((c) => c.id === id);
    if (!p) notFound();
    return (
      <Ficha
        categoria={p.categoria!}
        ml={p.ml!}
        foto={urlFoto(p.foto_url)}
        marca={p.marca!}
        nombre={p.nombre!}
        datos={[
          ["Contenido", `${p.ml} ml`],
          ["Grado", `${p.grado}%`],
          ["Unidades por caja", `${p.unidades_por_caja}`],
        ]}
      >
        <p className="font-mono text-2xl font-medium">
          {soles(p.precio_caja_centimos!)} <span className="font-sans text-base font-normal text-gris">por caja</span>
        </p>
        <div className="mt-6 rounded-md border border-linea bg-blanco p-5">
          <p className="text-sm">Ingresa para ver los precios por volumen, el stock disponible y para pedir.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/ingresar" className={`${botonSecundario} h-10`}>
              Ingresar
            </Link>
            <Link href="/registro" className={`${botonPrimario} h-10`}>
              Crear cuenta
            </Link>
          </div>
        </div>
      </Ficha>
    );
  }

  // Con sesión: escala completa, stock, pedido mínimo y registro sanitario.
  // RLS decide si puede verlo (comprador: activos; marca: los suyos; admin: todos).
  const { data: p } = await supabase
    .from("productos")
    .select(
      "nombre, categoria, ml, grado, unidades_por_caja, registro_sanitario, stock_cajas, foto_url, activo, marcas(nombre_comercial, pedido_minimo_cajas, activa), escalas_precio(desde_cajas, hasta_cajas, precio_caja_centimos)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!p || !p.marcas) notFound();

  const tramos = ordenarTramos(p.escalas_precio);
  const esComprador = usuario.rol === "comprador";

  // Solo para compradores: ¿está en favoritos? ¿cuántas cajas tiene ya en el carrito?
  const [{ data: favorito }, { data: enCarrito }] = esComprador
    ? await Promise.all([
        supabase.from("favoritos").select("producto_id").eq("producto_id", id).maybeSingle(),
        supabase.from("carrito").select("cajas").eq("producto_id", id).maybeSingle(),
      ])
    : [{ data: null }, { data: null }];

  return (
    <Ficha
      categoria={p.categoria}
      ml={p.ml}
      foto={urlFoto(p.foto_url)}
      marca={p.marcas.nombre_comercial}
      nombre={p.nombre}
      datos={[
        ["Contenido", `${p.ml} ml`],
        ["Grado", `${p.grado}%`],
        ["Unidades por caja", `${p.unidades_por_caja}`],
        ["Registro sanitario", p.registro_sanitario ?? "—"],
        ["Stock disponible", p.stock_cajas === 0 ? "Agotado (por encargo)" : `${p.stock_cajas} cajas`],
      ]}
    >
      {(!p.activo || !p.marcas.activa) && (
        <p className="mb-6 border-l-2 border-linea pl-3 text-sm text-gris">
          {p.marcas.activa ? "Producto inactivo" : "Marca inactiva"}: los compradores no lo ven en el catálogo.
        </p>
      )}
      {esComprador && (
        <div className="mb-8 flex items-start gap-2">
          <div className="flex-1">
            <FormAgregar productoId={id} stock={p.stock_cajas} enCarrito={enCarrito?.cajas ?? 0} />
          </div>
          <BotonFavorito productoId={id} activo={!!favorito} className="pt-1" />
        </div>
      )}
      <h2 className={sello}>Precio por caja según cantidad</h2>
      <table className="mt-3 w-full overflow-hidden rounded-md border border-linea bg-blanco text-sm">
        <tbody>
          {tramos.map((t) => (
            <tr key={t.desde_cajas} className="border-b border-linea last:border-b-0">
              <td className="px-4 py-3 font-mono text-gris">{textoTramo(t)}</td>
              <td className="px-4 py-3 text-right font-mono font-medium tabular-nums">{soles(t.precio_caja_centimos)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 text-xs text-gris">El precio se elige según las cajas de este producto en tu pedido.</p>

      {PEDIDO_MINIMO_ACTIVO && (
        <p className="mt-6 border-l-2 border-verde pl-3 text-sm">
          Pedido mínimo de {p.marcas.nombre_comercial}: <strong className="font-mono">{p.marcas.pedido_minimo_cajas} cajas</strong>,
          sumando cualquiera de sus productos.
        </p>
      )}
    </Ficha>
  );
}

// Diseño común del detalle: foto a la izquierda, datos a la derecha
function Ficha({
  categoria,
  ml,
  foto,
  marca,
  nombre,
  datos,
  children,
}: {
  categoria: string;
  ml: number;
  foto: string | null;
  marca: string;
  nombre: string;
  datos: [string, string][];
  children: React.ReactNode;
}) {
  return (
    <div className="mt-6 grid gap-8 md:grid-cols-2 md:gap-12">
      <FotoProducto categoria={categoria} ml={ml} foto={foto} grande />
      <div>
        <p className={sello}>
          {marca} · {CATEGORIAS[categoria] ?? categoria}
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">{nombre}</h1>
        <dl className="mt-6 grid grid-cols-2 border-t border-linea text-sm">
          {datos.map(([k, v]) => (
            <div key={k} className="border-b border-linea py-3 odd:pr-4">
              <dt className="text-xs text-gris">{k}</dt>
              <dd className="mt-0.5 font-mono">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
}
