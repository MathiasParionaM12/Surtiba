"use client";

// Catálogo con filtros para todos (con o sin sesión): chips de categoría y buscador por nombre
// o marca. Filtra en el navegador (son pocos productos) y deja los filtros en la dirección
// (?categoria=pisco&q=quebranta) para poder compartirla. La barra queda pegada bajo el encabezado.
import { Search, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { TarjetaProducto, type ProductoTarjeta } from "@/components/TarjetaProducto";
import { CATEGORIAS } from "@/lib/catalogo";
import { botonSecundario, campo } from "@/lib/estilos";

// Sin tildes ni mayúsculas: "Cócteles" encuentra "cocteles"
const normalizar = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

export function Explorador({
  productos,
  categoriaInicial,
  busquedaInicial,
  visitante,
  puedeAgregar,
}: {
  productos: ProductoTarjeta[];
  categoriaInicial?: string;
  busquedaInicial?: string;
  visitante: boolean;
  puedeAgregar: boolean;
}) {
  const [categoria, setCategoria] = useState(categoriaInicial && CATEGORIAS[categoriaInicial] ? categoriaInicial : "");
  const [busqueda, setBusqueda] = useState(busquedaInicial ?? "");

  // Solo las categorías que tienen productos, con cuántos hay de cada una
  const categorias = useMemo(() => {
    const cuenta = new Map<string, number>();
    for (const p of productos) cuenta.set(p.categoria, (cuenta.get(p.categoria) ?? 0) + 1);
    return Object.keys(CATEGORIAS)
      .filter((c) => cuenta.has(c))
      .map((c) => ({ valor: c, texto: CATEGORIAS[c], cantidad: cuenta.get(c)! }));
  }, [productos]);

  const visibles = useMemo(() => {
    const q = normalizar(busqueda.trim());
    return productos.filter(
      (p) => (!categoria || p.categoria === categoria) && (!q || normalizar(`${p.nombre} ${p.marca}`).includes(q)),
    );
  }, [productos, categoria, busqueda]);

  // Los filtros quedan en la dirección, sin recargar la página
  useEffect(() => {
    const url = new URL(window.location.href);
    if (categoria) url.searchParams.set("categoria", categoria);
    else url.searchParams.delete("categoria");
    if (busqueda.trim()) url.searchParams.set("q", busqueda.trim());
    else url.searchParams.delete("q");
    window.history.replaceState(null, "", url);
  }, [categoria, busqueda]);

  const hayFiltros = !!(categoria || busqueda.trim());
  const quitarFiltros = () => {
    setCategoria("");
    setBusqueda("");
  };
  const chip = (activo: boolean) =>
    `flex h-11 shrink-0 items-center gap-1.5 rounded-md border px-3.5 text-sm whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-verde ${
      activo ? "border-tinta bg-tinta text-blanco" : "border-linea bg-blanco hover:border-gris"
    }`;

  return (
    <>
      {/* Barra pegada bajo el encabezado: aviso para visitantes, chips y buscador */}
      <div className="sticky top-[var(--alto-encabezado)] z-[5] -mx-4 mt-6 border-b border-linea bg-papel/95 px-4 py-3 backdrop-blur sm:-mx-8 sm:px-8">
        {visitante && (
          <p className="mb-3 text-sm">
            Ingresa para ver precios por volumen y stock ·{" "}
            <Link href="/ingresar" className="font-medium text-verde underline underline-offset-4 hover:text-tinta">
              Ingresar
            </Link>
          </p>
        )}
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <label className="relative md:w-72 md:shrink-0">
            <span className="sr-only">Buscar por nombre o marca</span>
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gris" aria-hidden="true" />
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Busca por nombre o marca"
              className={`${campo} pl-9`}
            />
          </label>
          <div role="group" aria-label="Categoría" className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:px-0">
            <button type="button" aria-pressed={!categoria} onClick={() => setCategoria("")} className={chip(!categoria)}>
              Todas <span className="font-mono text-xs opacity-70">{productos.length}</span>
            </button>
            {categorias.map((c) => (
              <button
                key={c.valor}
                type="button"
                aria-pressed={categoria === c.valor}
                onClick={() => setCategoria(categoria === c.valor ? "" : c.valor)}
                className={chip(categoria === c.valor)}
              >
                {c.texto} <span className="font-mono text-xs opacity-70">{c.cantidad}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Resultados */}
      <div className="mt-5 flex items-center justify-between gap-3">
        <p className="font-mono text-xs text-gris" aria-live="polite">
          {visibles.length} {visibles.length === 1 ? "producto" : "productos"}
        </p>
        {hayFiltros && (
          <button type="button" onClick={quitarFiltros} className="flex h-11 items-center gap-1 text-sm font-medium text-verde hover:text-tinta">
            <X className="size-4" aria-hidden="true" />
            Quitar filtros
          </button>
        )}
      </div>

      {visibles.length === 0 ? (
        <div className="mt-4 rounded-md border border-linea bg-blanco p-6">
          <p>No hay productos con esos filtros. Prueba con otra categoría o busca otro nombre.</p>
          <button type="button" onClick={quitarFiltros} className={`${botonSecundario} mt-4`}>
            Ver todos los productos
          </button>
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {visibles.map((p) => (
            <TarjetaProducto key={p.id} p={p} puedeAgregar={puedeAgregar} />
          ))}
        </div>
      )}
    </>
  );
}
