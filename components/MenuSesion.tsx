import Link from "next/link";
import { salir } from "@/lib/acciones-auth";
import { botonPrimario, botonSecundario } from "@/lib/estilos";
import { NOMBRE_ROL } from "@/lib/roles";
import { obtenerUsuario } from "@/lib/sesion";

// Lado derecho del encabezado: botones para entrar, o quién ingresó, su panel y "Salir".
export async function MenuSesion() {
  const usuario = await obtenerUsuario();

  if (!usuario) {
    return (
      <div className="flex items-center gap-2">
        <Link href="/ingresar" className={`${botonSecundario} h-10 px-3 sm:px-4`}>
          Ingresar
        </Link>
        <Link href="/registro" className={`${botonPrimario} h-10 px-3 sm:px-4`}>
          Crear cuenta
        </Link>
      </div>
    );
  }

  const panel = usuario.rol === "marca" ? "/marca" : usuario.rol === "admin" ? "/admin" : null;

  return (
    <div className="flex min-w-0 items-center gap-3">
      {panel && (
        <Link href={panel} className="hidden text-sm font-medium text-verde hover:text-tinta sm:inline">
          Mi panel
        </Link>
      )}
      <div className="min-w-0 text-right leading-tight">
        <p className="max-w-36 truncate text-sm font-medium sm:max-w-56">
          {usuario.empresa ?? usuario.nombre ?? usuario.email}
        </p>
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
