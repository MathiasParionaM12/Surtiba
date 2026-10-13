import type { NextRequest } from "next/server";
import { actualizarSesion } from "@/lib/supabase/proxy";

// Next.js corre esto antes de cada página: mantiene viva la sesión de Supabase.
export async function proxy(request: NextRequest) {
  return actualizarSesion(request);
}

export const config = {
  // Todas las rutas menos archivos estáticos (imágenes, íconos, etc.)
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
