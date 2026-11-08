// Directorio de marcas: nombre, descripción y logo de las marcas activas (datos públicos, sin contacto
// ni dirección). Igual para todos: se guarda en caché y se actualiza al instante cuando una marca cambia
// su perfil o sus productos (updateTag("catalogo")).
// Desde el 8-nov-2026 trae también su reputación: sellos de confianza y estrellas (solo totales, nada del comprador).
import { cacheLife, cacheTag } from "next/cache";
import { urlFoto } from "@/lib/catalogo";
import { clientePublico } from "@/lib/supabase/publico";

// Sellos y estrellas de una marca (función reputacion_marcas() en la base de datos)
export type Reputacion = {
  verificada: boolean; // el admin revisó RUC y registro sanitario
  rapida: boolean; // deja lista su orden en menos de 24 h (mediana, 3 o más órdenes en 90 días)
  nueva: boolean; // sus primeros 30 días en Surtiba
  promedio: number | null; // estrellas de 1 a 5
  calificaciones: number;
};
export const SIN_REPUTACION: Reputacion = { verificada: false, rapida: false, nueva: false, promedio: null, calificaciones: 0 };
// El promedio se muestra desde 3 calificaciones (decisión de Mathias, 8-nov-2026)
export const MINIMO_CALIFICACIONES = 3;

export type MarcaPublica = { id: string; nombre: string; descripcion: string | null; logo: string | null; reputacion: Reputacion };

export async function marcasPublicas(): Promise<MarcaPublica[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("catalogo");
  const supabase = clientePublico();
  // RLS de visitante: solo marcas activas
  const [{ data }, { data: rep }] = await Promise.all([
    supabase.from("marcas").select("id, nombre_comercial, descripcion, logo_url").order("nombre_comercial"),
    supabase.rpc("reputacion_marcas"),
  ]);
  const porMarca = new Map((rep ?? []).map((r) => [r.marca_id, r]));
  return (data ?? []).map((m) => {
    const r = porMarca.get(m.id);
    return {
      id: m.id,
      nombre: m.nombre_comercial,
      descripcion: m.descripcion,
      logo: urlFoto(m.logo_url),
      reputacion: r
        ? { verificada: r.verificada, rapida: r.responde_rapido, nueva: r.nueva, promedio: r.promedio === null ? null : Number(r.promedio), calificaciones: r.calificaciones }
        : SIN_REPUTACION,
    };
  });
}

// Reputación por nombre de marca (las tarjetas del catálogo solo traen el nombre)
export async function reputacionPorNombre(): Promise<Map<string, Reputacion>> {
  return new Map((await marcasPublicas()).map((m) => [m.nombre, m.reputacion]));
}

// Últimos comentarios visibles de una marca, firmados solo como "Comprador verificado"
export type Comentario = { id: string; estrellas: number; comentario: string; creado_en: string };
export async function comentariosMarca(marcaId: string): Promise<Comentario[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("catalogo");
  const { data } = await clientePublico()
    .from("calificaciones")
    .select("id, estrellas, comentario, creado_en")
    .eq("marca_id", marcaId)
    .not("comentario", "is", null)
    .order("creado_en", { ascending: false })
    .limit(10);
  return (data ?? []).map((c) => ({ id: c.id, estrellas: c.estrellas, comentario: c.comentario ?? "", creado_en: c.creado_en }));
}
