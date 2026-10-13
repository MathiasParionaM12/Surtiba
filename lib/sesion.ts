import { cache } from "react";
import type { Rol } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

export type Usuario = {
  id: string;
  email: string;
  rol: Rol;
  nombre: string | null;
  empresa: string | null;
  marcaId: string | null;
};

// Usuario con sesión y su perfil, o null si nadie ingresó.
// cache(): si varios componentes lo piden en la misma visita, se consulta una sola vez.
// Lee cookies: úsalo dentro de un <Suspense>.
export const obtenerUsuario = cache(async (): Promise<Usuario | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) return null;

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("rol, nombre, empresa, marca_id")
    .eq("id", claims.sub)
    .single();
  if (!perfil) return null;

  return {
    id: claims.sub,
    email: typeof claims.email === "string" ? claims.email : "",
    rol: perfil.rol as Rol,
    nombre: perfil.nombre,
    empresa: perfil.empresa,
    marcaId: perfil.marca_id,
  };
});
