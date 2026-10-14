import Link from "next/link";
import type { Rol } from "@/lib/roles";
import { obtenerUsuario } from "@/lib/sesion";

// Enlaces del menú según quién ingresó
function enlacesPara(rol: Rol | null) {
  const catalogo = { href: "/catalogo", texto: "Catálogo" };
  if (rol === "comprador") {
    return [catalogo, { href: "/favoritos", texto: "Favoritos" }, { href: "/pedidos", texto: "Mis pedidos" }];
  }
  if (rol === "marca") return [catalogo, { href: "/marca", texto: "Mi panel" }];
  if (rol === "admin") return [catalogo, { href: "/admin", texto: "Panel Surtiba" }];
  if (rol === "solicitante") return [{ href: "/solicitud", texto: "Mi solicitud" }];
  return [catalogo];
}

// Computadora: enlaces al lado del logo
export async function NavPrincipal() {
  const usuario = await obtenerUsuario();
  return (
    <nav className="hidden items-center gap-5 sm:flex">
      {enlacesPara(usuario?.rol ?? null).map((e) => (
        <Link key={e.href} href={e.href} className="text-sm font-medium hover:text-verde">
          {e.texto}
        </Link>
      ))}
    </nav>
  );
}

// Celular: una segunda fila con los mismos enlaces (solo con sesión)
export async function NavMovil() {
  const usuario = await obtenerUsuario();
  if (!usuario) return null;
  return (
    <nav className="flex gap-5 overflow-x-auto border-t border-linea px-4 py-2.5 sm:hidden">
      {enlacesPara(usuario.rol).map((e) => (
        <Link key={e.href} href={e.href} className="text-sm font-medium whitespace-nowrap hover:text-verde">
          {e.texto}
        </Link>
      ))}
    </nav>
  );
}

// Mientras carga la sesión, se muestra al menos el catálogo
export function NavPrincipalCargando() {
  return (
    <nav className="hidden items-center gap-5 sm:flex">
      <Link href="/catalogo" className="text-sm font-medium hover:text-verde">
        Catálogo
      </Link>
    </nav>
  );
}
