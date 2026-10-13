import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseConfig } from "./config";
import type { Database } from "./tipos";

// Cliente de Supabase para el servidor (páginas, Server Actions y rutas del servidor).
// Lee la sesión del usuario desde las cookies, así RLS sabe quién pide los datos.
export async function createClient() {
  const { url, anonKey } = getSupabaseConfig();
  const cookieStore = await cookies();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Las páginas (Server Components) no pueden escribir cookies.
          // No pasa nada: proxy.ts renueva la sesión en cada visita.
        }
      },
    },
  });
}
