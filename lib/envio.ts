// Envío fijo por zona (22-oct-2026, supabase/sql/36_envio_por_zona.sql): un monto por pedido según el distrito,
// igual para cualquier cantidad de cajas. Es igual para todos, así que se guarda en caché; se renueva al
// instante cuando el admin cambia un monto (updateTag("envio")) y, por si acaso, cada hora.
// Solo sirve para MOSTRARLO: el monto que se cobra lo pone crear_pedido en la base de datos.
import { cacheLife, cacheTag } from "next/cache";
import { clientePublico } from "@/lib/supabase/publico";

export type Zona = { zona: number; nombre: string; monto_centimos: number };
// porDistrito: distrito → monto en céntimos · zonaDe: distrito → zona
export type Tarifas = { zonas: Zona[]; porDistrito: Record<string, number>; zonaDe: Record<string, number> };

export async function tarifasEnvio(): Promise<Tarifas> {
  "use cache";
  cacheLife("hours");
  cacheTag("envio");
  const cliente = clientePublico();
  const [{ data: zonas }, { data: distritos }] = await Promise.all([
    cliente.from("zonas_envio").select("zona, nombre, monto_centimos").order("zona"),
    cliente.from("distritos_envio").select("distrito, zona"),
  ]);
  const monto = new Map((zonas ?? []).map((z) => [z.zona, z.monto_centimos]));
  const porDistrito: Record<string, number> = {};
  const zonaDe: Record<string, number> = {};
  for (const d of distritos ?? []) {
    const m = monto.get(d.zona);
    if (m === undefined) continue;
    porDistrito[d.distrito] = m;
    zonaDe[d.distrito] = d.zona;
  }
  return { zonas: zonas ?? [], porDistrito, zonaDe };
}

// "S/ 20.00 o S/ 35.00": para cuando todavía no se sabe el distrito
export function rangoEnvio(t: Tarifas, soles: (c: number) => string) {
  const montos = [...new Set(t.zonas.map((z) => z.monto_centimos))].sort((a, b) => a - b);
  return montos.map(soles).join(" o ");
}
