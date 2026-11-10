// Documentos de la marca (registros sanitarios y otros, 10-nov-2026). Bucket privado "documentos":
// cada cuenta sube y ve solo su carpeta (<su id>/...); el admin ve todas. Se leen con enlaces que vencen en 1 hora.
import type { SupabaseClient } from "@supabase/supabase-js";

export type Documento = { ruta: string; nombre: string; subido: string | null; bytes: number | null; url: string | null };

export const DOCUMENTOS = {
  tipos: ["application/pdf", "image/jpeg", "image/png", "image/webp"],
  maxBytes: 10 * 1024 * 1024,
  max: 15,
};

// "1731234567890-registro-sanitario.pdf" -> "registro-sanitario.pdf"
const nombreVisible = (archivo: string) => archivo.replace(/^\d+-/, "");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function documentosDe(supabase: SupabaseClient<any>, perfilIds: string[]): Promise<Documento[]> {
  const listas = await Promise.all(
    perfilIds.map(async (id) => {
      const { data } = await supabase.storage.from("documentos").list(id, { limit: 100, sortBy: { column: "created_at", order: "desc" } });
      return (data ?? []).filter((a) => a.id).map((a) => ({ ruta: `${id}/${a.name}`, archivo: a.name, subido: a.created_at ?? null, bytes: a.metadata?.size ?? null }));
    }),
  );
  const archivos = listas.flat();
  if (archivos.length === 0) return [];
  const { data: firmadas } = await supabase.storage.from("documentos").createSignedUrls(archivos.map((a) => a.ruta), 3600);
  const url = new Map((firmadas ?? []).map((f) => [f.path, f.signedUrl]));
  return archivos.map((a) => ({ ruta: a.ruta, nombre: nombreVisible(a.archivo), subido: a.subido, bytes: a.bytes, url: url.get(a.ruta) ?? null }));
}
