import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FotoProducto } from "@/components/FotoProducto";
import { CATEGORIAS, esUuid, ordenarTramos, textoTramo } from "@/lib/catalogo";
import { botonPrimario, botonSecundario, sello } from "@/lib/estilos";
import { soles } from "@/lib/formato";
import { obtenerUsuario } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Producto · Surtiba" };

export default function PaginaProducto({ params }: PageProps<"/catalogo/[id]">) {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-8 sm:py-12">
      <Link href="/catalogo" className="text-sm font-medium text-verde hover:text-tinta">
        ← Volver al catálogo
      </Link>
      <Suspense fallback={<p className="mt-10 text-gris">Cargando producto…</p>}>
        <Detalle params={params} />
      </Suspense>
    </main>
  );
}

async function Detalle({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, usuario] = await Promise.all([params, obtenerUsuario()]);
  if (!esUuid(id)) notFound();
  const supabase = await createClient();

  // Visitante, marca o admin: datos públicos y precio del primer tramo
  if (usuario?.rol !== "comprador") {
    const { data: p } = await supabase.from("catalogo_publico").select("*").eq("id", id).maybeSingle();
    if (!p) notFound();
    return (
      <Ficha
        categoria={p.categoria!}
        ml={p.ml!}
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
        {!usuario && (
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
        )}
      </Ficha>
    );
  }

  // Comprador: escala completa, stock, pedido mínimo y registro sanitario
  const { data: p } = await supabase
    .from("productos")
    .select(
      "nombre, categoria, ml, grado, unidades_por_caja, registro_sanitario, stock_cajas, marcas(nombre_comercial, pedido_minimo_cajas), escalas_precio(desde_cajas, hasta_cajas, precio_caja_centimos)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!p || !p.marcas) notFound();

  const tramos = ordenarTramos(p.escalas_precio);

  return (
    <Ficha
      categoria={p.categoria}
      ml={p.ml}
      marca={p.marcas.nombre_comercial}
      nombre={p.nombre}
      datos={[
        ["Contenido", `${p.ml} ml`],
        ["Grado", `${p.grado}%`],
        ["Unidades por caja", `${p.unidades_por_caja}`],
        ["Registro sanitario", p.registro_sanitario ?? "—"],
        ["Stock disponible", p.stock_cajas === 0 ? "Agotado" : `${p.stock_cajas} cajas`],
      ]}
    >
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

      <p className="mt-6 border-l-2 border-verde pl-3 text-sm">
        Pedido mínimo de {p.marcas.nombre_comercial}: <strong className="font-mono">{p.marcas.pedido_minimo_cajas} cajas</strong>,
        sumando cualquiera de sus productos.
      </p>
      <p className="mt-6 text-sm text-gris">El carrito para pedir llega en la siguiente etapa del prototipo.</p>
    </Ficha>
  );
}

// Diseño común del detalle: foto a la izquierda, datos a la derecha
function Ficha({
  categoria,
  ml,
  marca,
  nombre,
  datos,
  children,
}: {
  categoria: string;
  ml: number;
  marca: string;
  nombre: string;
  datos: [string, string][];
  children: React.ReactNode;
}) {
  return (
    <div className="mt-6 grid gap-8 md:grid-cols-2 md:gap-12">
      <FotoProducto categoria={categoria} ml={ml} grande />
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
