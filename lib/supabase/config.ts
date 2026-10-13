// Lee la URL y la clave pública de Supabase desde .env.local (o desde Vercel).
// Si faltan, muestra un error claro en vez de fallar a medias.
export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
        "Revisa el archivo .env.local (usa .env.example como modelo) y reinicia npm run dev.",
    );
  }

  return { url, anonKey };
}
