"use client";

// Catálogo con filtros para todos (con o sin sesión): chips de categoría, buscador por nombre o marca
// y "Más filtros" (precio máximo, marca, presentación, grado, disponibilidad y orden).
// Filtra en el navegador (son pocos productos) y deja los filtros en la dirección
// (?categoria=pisco&q=quebranta&precio=300…) para poder compartirla. La barra queda pegada bajo el encabezado.
import { SlidersHorizontal, Search, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { IconoCategoria } from "@/components/IconoCategoria";
import { TarjetaProducto, type ProductoTarjeta } from "@/components/TarjetaProducto";
import { CATEGORIAS } from "@/lib/catalogo";
import { normalizar } from "@/lib/cotizador";
import { botonSecundario, campo } from "@/lib/estilos";
import { soles } from "@/lib/formato";

export type FiltrosCatalogo = {
  categoria?: string;
  q?: string;
  precio?: string; // soles por caja (máximo)
  marca?: string;
  ml?: string;
  grado?: string;
  stock?: string;
  orden?: string;
};

const GRADOS: Record<string, { texto: string; cumple: (g: number) => boolean }> = {
  suave: { texto: "Hasta 15 %", cumple: (g) => g <= 15 },
  medio: { texto: "De 15 % a 35 %", cumple: (g) => g > 15 && g <= 35 },
  fuerte: { texto: "Más de 35 %", cumple: (g) => g > 35 },
};
const ORDENES: Record<string, string> = {
  nombre: "Nombre (A–Z)",
  precio_menor: "Precio: menor a mayor",
  precio_mayor: "Precio: mayor a menor",
  stock: "Más stock primero",
};

export function Explorador({
  productos,
  filtrosIniciales,
  visitante,
  puedeAgregar,
}: {
  productos: ProductoTarjeta[];
  filtrosIniciales: FiltrosCatalogo;
  visitante: boolean;
  puedeAgregar: boolean;
}) {
  const conSesion = productos.some((p) => p.stock !== undefined);
  const f = filtrosIniciales;
  const [categoria, setCategoria] = useState(f.categoria && CATEGORIAS[f.categoria] ? f.categoria : "");
  const [busqueda, setBusqueda] = useState(f.q ?? "");
  const [marca, setMarca] = useState(f.marca ?? "");
  const [ml, setMl] = useState(f.ml ?? "");
  const [grado, setGrado] = useState(f.grado && GRADOS[f.grado] ? f.grado : "");
  const [stock, setStock] = useState(conSesion && (f.stock === "hay" || f.stock === "encargo") ? f.stock : "");
  const [orden, setOrden] = useState(f.orden && ORDENES[f.orden] ? f.orden : "nombre");

  // Precio máximo: de la caja más barata a la más cara, de S/ 10 en S/ 10. Al máximo = sin límite.
  const precios = productos.map((p) => p.precioCaja);
  const piso = precios.length ? Math.floor(Math.min(...precios) / 1000) * 1000 : 0;
  const techo = Math.ceil(Math.max(...precios, 1000) / 1000) * 1000;
  const precioInicial = Number(f.precio) * 100;
  const [precioMax, setPrecioMax] = useState(precioInicial >= piso && precioInicial < techo ? precioInicial : techo);
  const conLimite = precioMax < techo;

  const extrasActivos = [marca, ml, grado, stock, conLimite ? "precio" : "", orden !== "nombre" ? orden : ""].filter(Boolean).length;
  const [abierto, setAbierto] = useState(extrasActivos > 0);

  // Solo las categorías que tienen productos, con cuántos hay de cada una
  const categorias = useMemo(() => {
    const cuenta = new Map<string, number>();
    for (const p of productos) cuenta.set(p.categoria, (cuenta.get(p.categoria) ?? 0) + 1);
    return Object.keys(CATEGORIAS)
      .filter((c) => cuenta.has(c))
      .map((c) => ({ valor: c, texto: CATEGORIAS[c], cantidad: cuenta.get(c)! }));
  }, [productos]);
  const marcas = useMemo(() => [...new Set(productos.map((p) => p.marca))].sort((a, b) => a.localeCompare(b)), [productos]);
  const presentaciones = useMemo(() => [...new Set(productos.map((p) => p.ml))].sort((a, b) => a - b), [productos]);

  const visibles = useMemo(() => {
    const q = normalizar(busqueda);
    const lista = productos.filter(
      (p) =>
        (!categoria || p.categoria === categoria) &&
        (!q || normalizar(`${p.nombre} ${p.marca}`).includes(q)) &&
        (!marca || p.marca === marca) &&
        (!ml || String(p.ml) === ml) &&
        (!grado || GRADOS[grado].cumple(Number(p.grado))) &&
        (!stock || (stock === "hay" ? (p.stock ?? 0) > 0 : p.stock === 0)) &&
        p.precioCaja <= precioMax,
    );
    const porOrden: Record<string, (a: ProductoTarjeta, b: ProductoTarjeta) => number> = {
      nombre: (a, b) => a.nombre.localeCompare(b.nombre),
      precio_menor: (a, b) => a.precioCaja - b.precioCaja,
      precio_mayor: (a, b) => b.precioCaja - a.precioCaja,
      stock: (a, b) => (b.stock ?? 0) - (a.stock ?? 0),
    };
    return [...lista].sort(porOrden[orden] ?? porOrden.nombre);
  }, [productos, categoria, busqueda, marca, ml, grado, stock, precioMax, orden]);

  // Los filtros quedan en la dirección, sin recargar la página
  useEffect(() => {
    const url = new URL(window.location.href);
    const poner = (clave: string, valor: string) => (valor ? url.searchParams.set(clave, valor) : url.searchParams.delete(clave));
    poner("categoria", categoria);
    poner("q", busqueda.trim());
    poner("marca", marca);
    poner("ml", ml);
    poner("grado", grado);
    poner("stock", stock);
    poner("precio", conLimite ? String(precioMax / 100) : "");
    poner("orden", orden !== "nombre" ? orden : "");
    window.history.replaceState(null, "", url);
  }, [categoria, busqueda, marca, ml, grado, stock, precioMax, conLimite, orden]);

  const hayFiltros = !!(categoria || busqueda.trim()) || extrasActivos > 0;
  const quitarFiltros = () => {
    setCategoria("");
    setBusqueda("");
    setMarca("");
    setMl("");
    setGrado("");
    setStock("");
    setPrecioMax(techo);
    setOrden("nombre");
  };
  const chip = (activo: boolean) =>
    `flex h-11 shrink-0 items-center gap-1.5 rounded-md border px-3.5 text-sm whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-verde ${
      activo ? "border-tinta bg-tinta text-blanco" : "border-linea bg-blanco hover:border-gris"
    }`;
  const etiqueta = "font-mono text-[11px] tracking-[0.12em] text-gris uppercase";

  return (
    <>
      {/* Barra pegada bajo el encabezado: aviso para visitantes, buscador, "Más filtros" y chips */}
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
          <div className="flex gap-2 md:w-[26rem] md:shrink-0">
            <label className="relative min-w-0 flex-1">
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
            <button
              type="button"
              onClick={() => setAbierto((a) => !a)}
              aria-expanded={abierto}
              aria-controls="mas-filtros"
              className={`${chip(abierto)} relative`}
            >
              <SlidersHorizontal className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">Más filtros</span>
              <span className="sr-only sm:hidden">Más filtros</span>
              {extrasActivos > 0 && (
                <span
                  key={extrasActivos}
                  style={{ "--giro": "0deg" } as React.CSSProperties}
                  className={`estampa min-w-5 rounded-full px-1 font-mono text-[11px] leading-5 ${abierto ? "bg-blanco text-tinta" : "bg-tinta text-blanco"}`}
                >
                  {extrasActivos}
                </span>
              )}
            </button>
          </div>
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
                <IconoCategoria categoria={c.valor} className="size-4 shrink-0" />
                {c.texto} <span className="font-mono text-xs opacity-70">{c.cantidad}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Más filtros: se abre debajo de la barra */}
      {abierto && (
        <div id="mas-filtros" className="entrada mt-4 grid gap-4 rounded-md border border-linea bg-blanco p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3">
          <label className="flex flex-col gap-2 sm:col-span-2 lg:col-span-1">
            <span className="flex items-baseline justify-between gap-2">
              <span className={etiqueta}>Precio máximo por caja</span>
              <span className="font-mono text-sm font-medium text-verde">{conLimite ? soles(precioMax) : "Sin límite"}</span>
            </span>
            <input
              type="range"
              min={piso}
              max={techo}
              step={1000}
              value={precioMax}
              onChange={(e) => setPrecioMax(Number(e.target.value))}
              className="h-11 w-full accent-verde"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className={etiqueta}>Marca</span>
            <select value={marca} onChange={(e) => setMarca(e.target.value)} className={campo}>
              <option value="">Todas</option>
              {marcas.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2">
            <span className={etiqueta}>Presentación</span>
            <select value={ml} onChange={(e) => setMl(e.target.value)} className={campo}>
              <option value="">Todas</option>
              {presentaciones.map((v) => (
                <option key={v} value={String(v)}>
                  {v} ml
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2">
            <span className={etiqueta}>Grado de alcohol</span>
            <select value={grado} onChange={(e) => setGrado(e.target.value)} className={campo}>
              <option value="">Todos</option>
              {Object.entries(GRADOS).map(([v, g]) => (
                <option key={v} value={v}>
                  {g.texto}
                </option>
              ))}
            </select>
          </label>
          {conSesion && (
            <label className="flex flex-col gap-2">
              <span className={etiqueta}>Disponibilidad</span>
              <select value={stock} onChange={(e) => setStock(e.target.value)} className={campo}>
                <option value="">Todas</option>
                <option value="hay">Con stock (entrega directa)</option>
                <option value="encargo">Agotados (por encargo)</option>
              </select>
            </label>
          )}
          <label className="flex flex-col gap-2">
            <span className={etiqueta}>Ordenar</span>
            <select value={orden} onChange={(e) => setOrden(e.target.value)} className={campo}>
              {Object.entries(ORDENES)
                .filter(([v]) => conSesion || v !== "stock")
                .map(([v, t]) => (
                  <option key={v} value={v}>
                    {t}
                  </option>
                ))}
            </select>
          </label>
        </div>
      )}

      {/* Resultados */}
      <div className="mt-5 flex items-center justify-between gap-3">
        <p className="font-mono text-xs text-gris" aria-live="polite">
          {visibles.length} {visibles.length === 1 ? "producto" : "productos"}
        </p>
        {hayFiltros && (
          <button type="button" onClick={quitarFiltros} className="enlace flex h-11 items-center gap-1 text-sm font-medium text-verde hover:text-tinta">
            <X className="size-4" aria-hidden="true" />
            Quitar filtros
          </button>
        )}
      </div>

      {visibles.length === 0 ? (
        <div className="mt-4 rounded-md border border-linea bg-blanco p-6">
          <p>No hay productos con esos filtros. Prueba subir el precio máximo, otra categoría u otro nombre.</p>
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
