import type { Metadata } from "next";
import Link from "next/link";
import { Carga } from "@/components/Carga";
import { EsqueletoTarjetas } from "@/components/Esqueleto";
import { IconoCategoria } from "@/components/IconoCategoria";
import { LogoMarca } from "@/components/LogoMarca";
import { CATEGORIAS } from "@/lib/catalogo";
import { catalogoPublico } from "@/lib/catalogo-publico";
import { sello } from "@/lib/estilos";
import { marcasPublicas } from "@/lib/marcas-publicas";

export const metadata: Metadata = { title: "Marcas · Surtiba" };

// Directorio de marcas: cada una con su logo, su descripción, sus categorías y cuántos productos tiene.
// Todo es público (sin contacto ni dirección) y viene de la caché.
export default function PaginaMarcas() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-8 sm:py-14">
      <p className={sello}>Directorio</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Marcas peruanas en Surtiba</h1>
      <p className="mt-3 max-w-2xl text-gris">
        Conoce a cada marca y mira sus productos. Tú le compras a Surtiba: nosotros recogemos en cada marca y te entregamos todo junto.
      </p>
      <Carga fallback={<EsqueletoTarjetas />}>
        <Lista />
      </Carga>
    </main>
  );
}

async function Lista() {
  const [marcas, productos] = await Promise.all([marcasPublicas(), catalogoPublico()]);
  // Productos y categorías de cada marca (del catálogo público)
  const porMarca = new Map<string, { productos: number; categorias: Set<string> }>();
  for (const p of productos) {
    const m = porMarca.get(p.marca_id!) ?? { productos: 0, categorias: new Set<string>() };
    m.productos++;
    m.categorias.add(p.categoria!);
    porMarca.set(p.marca_id!, m);
  }
  const conProductos = marcas.filter((m) => porMarca.has(m.id));
  if (conProductos.length === 0) return <p className="mt-8 text-gris">Pronto verás aquí a las marcas de Surtiba.</p>;

  return (
    <ul className="escalonado mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {conProductos.map((m) => {
        const datos = porMarca.get(m.id)!;
        return (
          <li key={m.id}>
            <Link
              href={`/marcas/${m.id}`}
              className="group flex h-full flex-col rounded-md border border-linea bg-blanco p-5 transition-[border-color,box-shadow,translate] duration-200 hover:-translate-y-0.5 hover:border-gris hover:shadow-md hover:shadow-tinta/5"
            >
              <div className="flex items-center gap-4">
                <LogoMarca nombre={m.nombre} logo={m.logo} />
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-semibold tracking-tight group-hover:text-verde">{m.nombre}</h2>
                  <p className="font-mono text-xs text-gris">
                    {datos.productos} {datos.productos === 1 ? "producto" : "productos"}
                  </p>
                </div>
              </div>
              <p className="mt-4 line-clamp-3 flex-1 text-sm text-gris">{m.descripcion ?? "Marca peruana de licores y cócteles."}</p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {[...datos.categorias].map((c) => (
                  <span key={c} className="inline-flex items-center gap-1 rounded-sm border border-linea px-2 py-0.5 text-xs">
                    <IconoCategoria categoria={c} className="size-3.5 text-verde" />
                    {CATEGORIAS[c] ?? c}
                  </span>
                ))}
              </div>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-verde">
                Ver sus productos
                <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">
                  →
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
