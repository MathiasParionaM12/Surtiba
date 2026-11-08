// "Lo que pides siempre" (8-nov-2026, idea del pedido sugerido de BEES): los productos que el comprador
// pidió en 2 o más pedidos de los últimos 90 días, con las cajas que pide casi siempre (la moda).
// Se calcula en el servidor con RLS (el comprador solo recibe sus pedidos). Nunca lleva precios: al
// agregarlos al carrito, el precio lo pone la base de datos como en cualquier otro pedido.
import { createClient } from "@/lib/supabase/server";

export type Sugerido = { productoId: string; cajas: number; veces: number };
export const SUGERIDOS_MAX = 8;

export async function pedidoSugerido(): Promise<{ items: Sugerido[]; pedidos: number }> {
  const supabase = await createClient();
  const desde = new Date(Date.now() - 90 * 86400000).toISOString();
  const { data } = await supabase
    .from("pedidos")
    .select("id, subpedidos(estado, items(producto_id, cajas))")
    .neq("estado", "cancelado")
    .gte("creado_en", desde);
  const pedidos = data ?? [];
  if (pedidos.length < 2) return { items: [], pedidos: pedidos.length };

  // Por producto: en cuántos pedidos salió y cuántas cajas pidió cada vez
  const porProducto = new Map<string, { pedidos: Set<string>; cajas: number[] }>();
  for (const p of pedidos) {
    for (const s of p.subpedidos) {
      if (s.estado === "rechazado" || s.estado === "cancelado") continue;
      for (const i of s.items) {
        const d = porProducto.get(i.producto_id) ?? { pedidos: new Set<string>(), cajas: [] };
        d.pedidos.add(p.id);
        d.cajas.push(i.cajas);
        porProducto.set(i.producto_id, d);
      }
    }
  }

  const items = [...porProducto.entries()]
    .filter(([, d]) => d.pedidos.size >= 2)
    .map(([productoId, d]) => ({ productoId, cajas: moda(d.cajas), veces: d.pedidos.size }))
    .sort((a, b) => b.veces - a.veces || b.cajas - a.cajas)
    .slice(0, SUGERIDOS_MAX);
  return { items, pedidos: pedidos.length };
}

// Las cajas que más se repiten; si empatan, la cantidad mayor (mejor que sobre a que falte en un evento).
// Si ninguna se repite (ej. 2, 7, 1, 23), la mediana: así un pedido fuera de lo normal no manda.
function moda(valores: number[]) {
  const cuenta = new Map<number, number>();
  for (const v of valores) cuenta.set(v, (cuenta.get(v) ?? 0) + 1);
  const [masRepetida, veces] = [...cuenta.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0];
  if (veces > 1) return masRepetida;
  const orden = [...valores].sort((a, b) => a - b);
  const medio = orden.length / 2;
  return Math.ceil(orden.length % 2 ? orden[Math.floor(medio)] : (orden[medio - 1] + orden[medio]) / 2);
}
