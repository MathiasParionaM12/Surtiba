import { cache } from "react";
import { EnlaceMenu } from "@/components/EnlaceMenu";
import type { Rol } from "@/lib/roles";
import { obtenerUsuario } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";

type Enlace = { href: string; texto: string; aviso?: number };

// Enlaces del menú según quién ingresó. "aviso" = número a resaltar (ej. pedidos por pagar)
function enlacesPara(rol: Rol | null, porPagar = 0): Enlace[] {
  const catalogo = { href: "/catalogo", texto: "Catálogo" };
  const cotizador = { href: "/cotizador", texto: "Cotizar evento" };
  if (rol === "comprador") {
    return [
      catalogo,
      cotizador,
      { href: "/favoritos", texto: "Favoritos" },
      { href: "/pedidos", texto: "Mis pedidos", aviso: porPagar },
    ];
  }
  if (rol === "marca") return [catalogo, { href: "/marca", texto: "Mi panel" }];
  if (rol === "admin") return [catalogo, { href: "/admin", texto: "Panel Surtiba" }];
  if (rol === "solicitante") return [{ href: "/solicitud", texto: "Mi solicitud" }];
  return [catalogo, cotizador];
}

// Pedidos del comprador con algo por pagar (encargo confirmado o diferencia pendiente).
// cache(): el menú de computadora y el de celular lo piden; se consulta una sola vez por visita.
const contarPorPagar = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("pedidos")
    .select("estado, total_centimos, pagado_centimos")
    .not("estado", "in", "(cancelado,por_confirmar)");
  return (data ?? []).filter((p) => p.total_centimos > p.pagado_centimos).length;
});

async function enlacesDelUsuario() {
  const usuario = await obtenerUsuario();
  const porPagar = usuario?.rol === "comprador" ? await contarPorPagar() : 0;
  return enlacesPara(usuario?.rol ?? null, porPagar);
}

function TextoEnlace({ e }: { e: Enlace }) {
  return (
    <>
      {e.texto}
      {!!e.aviso && (
        <span
          className="ml-1.5 inline-flex min-w-5 items-center justify-center rounded-sm bg-tinta px-1 font-mono text-[11px] text-blanco"
          aria-label={`${e.aviso} por pagar`}
        >
          {e.aviso}
        </span>
      )}
    </>
  );
}

// Computadora: enlaces al lado del logo
export async function NavPrincipal() {
  const enlaces = await enlacesDelUsuario();
  return (
    <nav className="hidden items-center gap-5 sm:flex">
      {enlaces.map((e) => (
        <EnlaceMenu key={e.href} href={e.href}>
          <TextoEnlace e={e} />
        </EnlaceMenu>
      ))}
    </nav>
  );
}

// Celular: una segunda fila con los mismos enlaces (también para visitantes)
export async function NavMovil() {
  const enlaces = await enlacesDelUsuario();
  return (
    <nav className="flex gap-5 overflow-x-auto border-t border-linea px-4 py-2.5 sm:hidden">
      {enlaces.map((e) => (
        <EnlaceMenu key={e.href} href={e.href} className="whitespace-nowrap">
          <TextoEnlace e={e} />
        </EnlaceMenu>
      ))}
    </nav>
  );
}

// Mientras carga la sesión, se muestra al menos el catálogo
export function NavPrincipalCargando() {
  return (
    <nav className="hidden items-center gap-5 sm:flex">
      <EnlaceMenu href="/catalogo">Catálogo</EnlaceMenu>
    </nav>
  );
}
