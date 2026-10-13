import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseConfig } from "./config";

// Cliente de Supabase para el navegador (componentes con "use client").
// Solo usa la clave pública: lo que puede ver lo decide RLS en la base de datos.
export function createClient() {
  const { url, anonKey } = getSupabaseConfig();
  return createBrowserClient(url, anonKey);
}
