import Link from "next/link";
import { salir } from "@/lib/acciones-auth";
import { botonPrimario, botonSecundario } from "@/lib/estilos";
import { NOMBRE_ROL, obtenerUsuario } from "@/lib/sesion";

// Lado derecho del encabezado: botones para entrar, o quién ingresó y "Salir".
export async function MenuSesion() {
  const usuario = await obtenerUsuario();

  if (!usuario) {
    return (
      <nav className="flex items-center gap-2">
        <Link href="/ingresar" className={`${botonSecundario} h-10 px-3 sm:px-4`}>
          Ingresar
        </Link>
        <Link href="/registro" className={`${botonPrimario} h-10 px-3 sm:px-4`}>
          Crear cuenta
        </Link>
      </nav>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="min-w-0 text-right leading-tight">
        <p className="truncate text-sm font-medium">{usuario.empresa ?? usuario.nombre ?? usuario.email}</p>
        <p className="font-mono text-[11px] tracking-[0.1em] text-gris uppercase">{NOMBRE_ROL[usuario.rol]}</p>
      </div>
      <form action={salir}>
        <button type="submit" className={`${botonSecundario} h-10 px-3 sm:px-4`}>
          Salir
        </button>
      </form>
    </div>
  );
}
