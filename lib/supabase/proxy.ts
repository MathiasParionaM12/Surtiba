import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfig } from "./config";
import type { Database } from "./tipos";

// Se ejecuta antes de cada página (desde proxy.ts).
// Si la sesión del usuario está por vencer, Supabase la renueva y guarda las cookies nuevas.
export async function actualizarSesion(request: NextRequest) {
  const { url, anonKey } = getSupabaseConfig();
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        // Evita que un CDN guarde en caché una respuesta con la sesión de otra persona
        Object.entries(headers ?? {}).forEach(([clave, valor]) => response.headers.set(clave, valor));
      },
    },
  });

  // Revisa (y si hace falta renueva) la sesión. No quitar.
  await supabase.auth.getClaims();

  return response;
}
