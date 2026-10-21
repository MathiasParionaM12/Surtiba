// Productos del catálogo como tarjetas: para visitantes (de la caché, solo el primer precio) o con sesión
// (precios por volumen y stock, según RLS). Los usan el catálogo y la página de cada marca.
import type { ProductoTarjeta } from "@/components/TarjetaProducto";
import { aTarjeta, urlFoto } from "@/lib/catalogo";
import { catalogoPublico } from "@/lib/catalogo-publico";
import { createClient } from "@/lib/supabase/server";

// ── Visitante: solo el precio del primer tramo, sin stock. Igual para todos: viene de la caché ──
export async function productosPublicos(): Promise<ProductoTarjeta[]> {
  const data = await catalogoPublico();
  return data.map((p) => ({
    id: p.id!,
    nombre: p.nombre!,
    marca: p.marca!,
    categoria: p.categoria!,
    ml: p.ml!,
    grado: p.grado!,
    unidades: p.unidades_por_caja!,
    precioCaja: p.precio_caja_centimos!,
    foto: urlFoto(p.foto_url),
  }));
}

// ── Con sesión: stock y precios por volumen ──
// RLS decide qué productos llegan: comprador = activos de marcas activas;
// marca = los suyos; admin = todos (también los inactivos, que se marcan).
export async function productosConSesion(esComprador: boolean): Promise<ProductoTarjeta[]> {
  const supabase = await createClient();
  const [{ data }, { data: favoritos }] = await Promise.all([
    supabase
      .from("productos")
      .select(
        "id, nombre, categoria, ml, grado, unidades_por_caja, stock_cajas, foto_url, activo, marcas(nombre_comercial, activa), escalas_precio(desde_cajas, precio_caja_centimos)",
      )
      .order("nombre"),
    // RLS: cada comprador recibe solo sus favoritos (la marca y el admin, ninguno)
    supabase.from("favoritos").select("producto_id"),
  ]);
  const misFavoritos = new Set((favoritos ?? []).map((f) => f.producto_id));
  return (data ?? [])
    .map((p) => aTarjeta(p, esComprador ? misFavoritos.has(p.id) : undefined))
    .filter((p): p is ProductoTarjeta => p !== null);
}
