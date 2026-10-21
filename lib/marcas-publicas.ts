// Directorio de marcas: nombre, descripción y logo de las marcas activas (datos públicos, sin contacto
// ni dirección). Igual para todos: se guarda en caché y se actualiza al instante cuando una marca cambia
// su perfil o sus productos (updateTag("catalogo")).
import { cacheLife, cacheTag } from "next/cache";
import { urlFoto } from "@/lib/catalogo";
import { clientePublico } from "@/lib/supabase/publico";

export type MarcaPublica = { id: string; nombre: string; descripcion: string | null; logo: string | null };

export async function marcasPublicas(): Promise<MarcaPublica[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("catalogo");
  // RLS de visitante: solo marcas activas
  const { data } = await clientePublico().from("marcas").select("id, nombre_comercial, descripcion, logo_url").order("nombre_comercial");
  return (data ?? []).map((m) => ({ id: m.id, nombre: m.nombre_comercial, descripcion: m.descripcion, logo: urlFoto(m.logo_url) }));
}
