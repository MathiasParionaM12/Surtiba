import { createClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "./config";
import type { Database } from "./tipos";

// Cliente de Supabase SIN sesión: pide los datos como un visitante (rol anon), así RLS
// solo entrega lo público. Es el único que se puede usar dentro de "use cache",
// porque no lee cookies. Nunca usarlo para datos de un usuario.
export function clientePublico() {
  const { url, anonKey } = getSupabaseConfig();
  return createClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
