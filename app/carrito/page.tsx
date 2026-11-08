import type { Metadata } from "next";
import { ArrowRight, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Carga } from "@/components/Carga";
import { BotonPdf } from "@/components/BotonPdf";
import { EsqueletoTabla } from "@/components/Esqueleto";
import { cotizacionDelCarrito } from "@/lib/acciones-cotizador";
import { cambiarCajas, quitarDelCarrito } from "@/lib/acciones-pedidos";
import { rangoEnvio, tarifasEnvio } from "@/lib/envio";
import { PEDIDO_MINIMO_CAJAS } from "@/lib/catalogo";
import { Advertencia } from "@/components/Advertencia";
import { EnEncargo, SinStock, type OpcionCambio } from "./SinStock";
import { botonPrimario, botonSecundario, campo, sello } from "@/lib/estilos";
import { soles } from "@/lib/formato";
import { rutaInicio } from "@/lib/roles";
import { obtenerUsuario } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";
import { EstadoVacio } from "@/components/EstadoVacio";

export const metadata: Metadata = { title: "Carrito · Surtiba" };

type Avisos = { repetido?: string; omitidos?: string; cotizador?: string };

export default function PaginaCarrito({ searchParams }: PageProps<"/carrito">) {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-8 sm:py-14">
      <p className={sello}>Tu pedido</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Carrito</h1>
      <Carga fallback={<EsqueletoTabla filas={5} />}>
        <Carrito searchParams={searchParams as Promise<Avisos>} />
      </Carga>
    </main>
  );
}

async function Carrito({ searchParams }: { searchParams: Promise<Avisos> }) {
  const [usuario, avisos] = await Promise.all([obtenerUsuario(), searchParams]);
  if (!usuario) redirect("/ingresar");
  if (usuario.rol !== "comprador") redirect(rutaInicio(usuario.rol));

  // Precios calculados en la base de datos (vista carrito_detalle), según las cajas de cada producto
  const supabase = await createClient();
  const [{ data }, tarifas, { data: perfil }] = await Promise.all([
    supabase.from("carrito_detalle").select("*").order("marca").order("nombre"),
    tarifasEnvio(),
    supabase.from("perfiles").select("distrito").eq("id", usuario.id).single(),
  ]);
  const lineas = data ?? [];
  // Envío fijo por zona: exacto si guardó su distrito en "Mi perfil"; si no, el rango
  const envioPerfil = perfil?.distrito ? tarifas.porDistrito[perfil.distrito] : undefined;

  if (lineas.length === 0) {
    return (
      <EstadoVacio icono={ShoppingCart} texto="Tu carrito está vacío. Explora el catálogo para armar tu pedido." accion={{ href: "/catalogo", texto: "Ir al catálogo" }} />
    );
  }

  // Escalas de los productos del carrito: para avisar "con N cajas pagas menos"
  const { data: escalas } = await supabase
    .from("escalas_precio")
    .select("producto_id, desde_cajas, precio_caja_centimos")
    .in("producto_id", lineas.map((l) => l.producto_id!));

  // Agrupar por marca
  const marcas = new Map<string, { nombre: string; lineas: typeof lineas }>();
  for (const l of lineas) {
    const grupo = marcas.get(l.marca_id!) ?? { nombre: l.marca!, lineas: [] };
    grupo.lineas.push(l);
    marcas.set(l.marca_id!, grupo);
  }

  // Problemas que impiden enviar el pedido (la falta de stock ya no es problema: va por encargo)
  const problemaDe = (l: (typeof lineas)[number]) => {
    if (!l.activo || !l.marca_activa) return "Ya no está disponible. Quítalo del carrito.";
    if (l.precio_caja_centimos === null) return "No tiene precio para esa cantidad.";
    return null;
  };
  // Cuántas cajas salen ahora (con stock) y cuántas faltan. Lo que falta hay que decidirlo en el carrito
  // (encargo, cambio o solo lo que hay); el encargo cuenta solo si el comprador lo aceptó.
  const partes = (l: (typeof lineas)[number]) => {
    const ahora = Math.min(l.cajas!, Math.max(0, l.stock_cajas!));
    const faltan = l.cajas! - ahora;
    return { ahora, faltan, encargo: l.encargo ? faltan : 0, sinDecidir: faltan > 0 && !l.encargo };
  };
  const sinDecidir = lineas.filter((l) => partes(l).sinDecidir);

  // Para cambiar lo que falta: productos de la misma categoría, con stock para cubrirlo y que no estén en el carrito
  // (RLS: el comprador solo recibe productos aprobados y activos de marcas activas)
  const categorias = [...new Set(sinDecidir.map((l) => l.categoria!))];
  const { data: candidatos } = categorias.length
    ? await supabase
        .from("productos")
        .select("id, nombre, categoria, stock_cajas, marcas(nombre_comercial), escalas_precio(desde_cajas, hasta_cajas, precio_caja_centimos)")
        .in("categoria", categorias)
        .gt("stock_cajas", 0)
        .order("nombre")
    : { data: [] };
  const enCarrito = new Set(lineas.map((l) => l.producto_id));
  const opcionesPara = (l: (typeof lineas)[number]): OpcionCambio[] => {
    const faltan = partes(l).faltan;
    return (candidatos ?? [])
      .filter((c) => c.categoria === l.categoria && !enCarrito.has(c.id) && c.stock_cajas >= faltan)
      .slice(0, 3)
      .map((c) => ({
        id: c.id,
        nombre: c.nombre,
        marca: c.marcas?.nombre_comercial ?? "",
        precio: c.escalas_precio.find((e) => faltan >= e.desde_cajas && (e.hasta_cajas === null || faltan <= e.hasta_cajas))?.precio_caja_centimos ?? null,
      }));
  };
  // Todo se calcula antes de dibujar: totales por marca, problemas y siguiente tramo
  const grupos = [...marcas.entries()].map(([marcaId, grupo]) => {
    const cajasMarca = grupo.lineas.reduce((s, l) => s + l.cajas!, 0);
    return {
      marcaId,
      ...grupo,
      cajasMarca,
      subtotalMarca: grupo.lineas.reduce((s, l) => s + (l.subtotal_centimos ?? 0), 0),
      items: grupo.lineas.map((l) => ({
        l,
        problema: problemaDe(l),
        siguiente: (escalas ?? [])
          .filter((e) => e.producto_id === l.producto_id && e.desde_cajas > l.cajas!)
          .sort((a, b) => a.desde_cajas - b.desde_cajas)[0],
        // Desde cuántas cajas empieza el precio que paga ahora (para la barra hacia el siguiente)
        desdeActual: Math.max(1, ...(escalas ?? []).filter((e) => e.producto_id === l.producto_id && e.desde_cajas <= l.cajas!).map((e) => e.desde_cajas)),
      })),
    };
  });
  const total = lineas.reduce((suma, l) => suma + (l.subtotal_centimos ?? 0), 0);
  const totalCajas = lineas.reduce((suma, l) => suma + l.cajas!, 0);
  // Pedido mínimo: 3 cajas en total, sumando todas las marcas
  const faltanMinimo = Math.max(0, PEDIDO_MINIMO_CAJAS - totalCajas);
  const hayProblemas = faltanMinimo > 0 || sinDecidir.length > 0 || grupos.some((g) => g.items.some((i) => i.problema));
  // Se paga ahora solo la compra directa; el encargo se paga cuando la marca lo confirme
  const pagasAhora = lineas.reduce((s, l) => s + partes(l).ahora * (l.precio_caja_centimos ?? 0), 0);
  const porEncargo = lineas.reduce((s, l) => s + partes(l).encargo * (l.precio_caja_centimos ?? 0), 0);

  const repetido = Number(avisos.repetido ?? NaN);
  const omitidos = Number(avisos.omitidos ?? 0);
  const delCotizador = Number(avisos.cotizador ?? NaN);

  return (
    <>
      {delCotizador > 0 && (
        <p role="status" className="mt-6 border-l-2 border-verde pl-3 text-sm">
          Pasamos {delCotizador} {delCotizador === 1 ? "producto" : "productos"} del cotizador a tu carrito. Revisa las
          cantidades antes de continuar.{" "}
          <Link href="/cotizador" className="font-medium enlace text-verde hover:text-tinta">
            Volver a tu cotización
          </Link>
        </p>
      )}
      {!Number.isNaN(repetido) && (
        <p role="status" className="mt-6 border-l-2 border-verde pl-3 text-sm">
          Agregamos {repetido} {repetido === 1 ? "producto" : "productos"} de tu pedido anterior.
          {omitidos > 0 && ` ${omitidos} ya no ${omitidos === 1 ? "está disponible" : "están disponibles"}.`}
        </p>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
          {faltanMinimo > 0 && (
            <Advertencia titulo={`El pedido mínimo es de ${PEDIDO_MINIMO_CAJAS} cajas en total`}>
              Puedes juntar productos de distintas marcas. Te {faltanMinimo === 1 ? "falta 1 caja" : `faltan ${faltanMinimo} cajas`}.
            </Advertencia>
          )}
          {grupos.map(({ marcaId, cajasMarca, subtotalMarca, items, ...grupo }) => (
            <section key={marcaId} className="overflow-hidden rounded-md border border-linea bg-blanco">
              <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-linea px-4 py-3 sm:px-5">
                <h2 className="font-semibold">{grupo.nombre}</h2>
                <p className="font-mono text-xs text-gris">
                  {cajasMarca} {cajasMarca === 1 ? "caja" : "cajas"}
                </p>
              </header>


              <ul>
                {items.map(({ l, problema, siguiente, desdeActual }) => (
                  <li key={l.producto_id} className="border-b border-linea px-4 py-4 last:border-b-0 sm:px-5">
                    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
                      <div className="min-w-0 flex-1">
                        <Link href={`/catalogo/${l.producto_id}`} className="font-medium hover:text-verde">
                          {l.nombre}
                        </Link>
                        <p className="mt-0.5 font-mono text-xs text-gris">
                          {l.precio_caja_centimos !== null ? `${soles(l.precio_caja_centimos)} por caja` : "Sin precio"} ·{" "}
                          {l.unidades_por_caja} u/caja
                        </p>
                        {siguiente && !problema && (
                          // Barra que se llena hacia el siguiente precio por volumen
                          <div className="mt-2 max-w-xs">
                            <p className="text-xs text-verde">
                              {siguiente.desde_cajas - l.cajas! === 1 ? "1 caja más" : `${siguiente.desde_cajas - l.cajas!} cajas más`} y pagas{" "}
                              <span className="font-mono">{soles(siguiente.precio_caja_centimos)}</span> por caja.
                            </p>
                            <span className="mt-1 block h-1 overflow-hidden rounded-full bg-linea" aria-hidden="true">
                              <span
                                className="llenar block h-full bg-verde"
                                style={{ width: `${Math.round(((l.cajas! - desdeActual + 1) / (siguiente.desde_cajas - desdeActual + 1)) * 100)}%` }}
                              />
                            </span>
                          </div>
                        )}
                        {problema && <p className="mt-1 border-l-2 border-rojo pl-2 text-xs">{problema}</p>}
                        {!problema && partes(l).sinDecidir && (
                          <SinStock productoId={l.producto_id!} stock={partes(l).ahora} faltan={partes(l).faltan} opciones={opcionesPara(l)} />
                        )}
                        {!problema && partes(l).encargo > 0 && <EnEncargo productoId={l.producto_id!} ahora={partes(l).ahora} faltan={partes(l).encargo} />}
                      </div>

                      <div className="flex items-center gap-2">
                        <form action={cambiarCajas} className="flex items-center gap-2">
                          <input type="hidden" name="producto_id" value={l.producto_id!} />
                          <input
                            name="cajas"
                            type="number"
                            min={0}
                            max={999}
                            defaultValue={l.cajas!}
                            aria-label={`Cajas de ${l.nombre}`}
                            className={`${campo} h-9 w-20 px-2 text-center font-mono`}
                          />
                          <button type="submit" className={`${botonSecundario} h-9 px-3 text-xs`}>
                            Actualizar
                          </button>
                        </form>
                        <form action={quitarDelCarrito}>
                          <input type="hidden" name="producto_id" value={l.producto_id!} />
                          <button type="submit" className="h-9 px-2 text-xs font-medium text-gris hover:text-tinta">
                            Quitar
                          </button>
                        </form>
                      </div>

                      <p className="w-28 text-right font-mono font-medium whitespace-nowrap tabular-nums">
                        {l.subtotal_centimos !== null ? soles(l.subtotal_centimos) : "—"}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>

              <footer className="flex justify-between border-t border-linea bg-papel px-4 py-3 text-sm sm:px-5">
                <span className="text-gris">Subtotal {grupo.nombre}</span>
                <span className="font-mono font-medium">{soles(subtotalMarca)}</span>
              </footer>
            </section>
          ))}
        </div>

        {/* Resumen */}
        <aside className="h-fit rounded-md border border-linea bg-blanco p-5 lg:sticky lg:top-24">
          <h2 className={sello}>Resumen</h2>
          <dl className="mt-4 flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gris">
                {marcas.size} {marcas.size === 1 ? "marca" : "marcas"} · {totalCajas} cajas
              </dt>
              <dd className="font-mono">{soles(total)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-gris">
                Envío{envioPerfil !== undefined ? ` a ${perfil?.distrito}` : ""}
                {envioPerfil === undefined && <span className="block text-xs">Fijo por pedido, según tu distrito</span>}
              </dt>
              <dd className="text-right font-mono">{envioPerfil !== undefined ? soles(envioPerfil) : rangoEnvio(tarifas, soles)}</dd>
            </div>
            <div className="mt-2 flex justify-between border-t border-linea pt-3 text-base">
              <dt className="font-medium">
                Total <span className="font-sans text-xs font-normal text-gris">· incluye IGV{envioPerfil === undefined ? ", sin envío" : ""}</span>
              </dt>
              <dd className="font-mono font-semibold">{soles(total + (envioPerfil ?? 0))}</dd>
            </div>
            {porEncargo > 0 && (
              <>
                <div className="mt-2 flex justify-between border-t border-linea pt-3">
                  <dt>Hay en stock</dt>
                  <dd className="font-mono font-medium">{soles(pagasAhora)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gris">Falta (por encargo)</dt>
                  <dd className="font-mono text-gris">{soles(porEncargo)}</dd>
                </div>
              </>
            )}
          </dl>
          <p className="mt-2 text-xs text-gris">
            {porEncargo > 0 ? "Lo que va por encargo llega aparte y lo pagas cuando la marca lo confirme, sin otro envío." : null}
          </p>

          {hayProblemas ? (
            <>
              <p className="mt-5 border-l-2 border-rojo pl-3 text-sm">
                {faltanMinimo > 0
                  ? `Agrega ${faltanMinimo === 1 ? "1 caja más" : `${faltanMinimo} cajas más`} para continuar.`
                  : sinDecidir.length > 0
                    ? "Decide qué hacer con lo que no hay en stock para continuar."
                    : "Corrige lo marcado en tu carrito para continuar."}
              </p>
              <button type="button" disabled className={`${botonPrimario} mt-4 w-full`}>
                Continuar con el pedido
                <ArrowRight className="size-4" aria-hidden="true" />
              </button>
            </>
          ) : (
            <Link href="/carrito/confirmar" className={`${botonPrimario} mt-5 w-full`}>
              Continuar con el pedido
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          )}
          <BotonPdf preparar={cotizacionDelCarrito} className="mt-3" />
          <Link href="/catalogo" className="mt-3 block text-center text-sm font-medium enlace text-verde hover:text-tinta">
            Seguir comprando
          </Link>
        </aside>
      </div>
    </>
  );
}
