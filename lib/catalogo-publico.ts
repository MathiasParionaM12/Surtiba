// Catálogo que ve un visitante (sin sesión): productos activos con el precio del primer tramo.
// Es igual para todos los visitantes, así que se guarda en caché. Se actualiza al instante
// cuando una marca o el admin cambian productos, fotos o marcas (updateTag("catalogo")) y,
// por si acaso, cada hora. Nunca incluye stock ni la escala completa (RLS de anon).
import { cacheLife, cacheTag } from "next/cache";
import { clientePublico } from "@/lib/supabase/publico";

export async function catalogoPublico() {
  "use cache";
  cacheLife("hours");
  cacheTag("catalogo");
  const { data } = await clientePublico().from("catalogo_publico").select("*").order("nombre");
  return data ?? [];
}
