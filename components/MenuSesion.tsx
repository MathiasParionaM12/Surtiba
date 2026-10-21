import { LogOut, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { Campana, type Aviso } from "@/components/Campana";
import { ContadorCarrito } from "@/components/ContadorCarrito";
import { salir } from "@/lib/acciones-auth";
import { botonPrimario, botonSecundario } from "@/lib/estilos";
import { NOMBRE_ROL } from "@/lib/roles";
import { obtenerUsuario } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";

// Lado derecho del encabezado: botones para entrar, o el carrito, quién ingresó y "Salir".
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

  // Productos en el carrito (solo comprador) y avisos de la campana (todos). RLS: solo los propios.
  const supabase = await createClient();
  const [carrito, { data: avisosData }, { count: sinLeer }] = await Promise.all([
    usuario.rol === "comprador" ? supabase.from("carrito").select("*", { count: "exact", head: true }) : Promise.resolve({ count: 0 }),
    supabase.from("avisos").select("id, texto, enlace, leido_en, creado_en").order("creado_en", { ascending: false }).limit(10),
    supabase.from("avisos").select("id", { count: "exact", head: true }).is("leido_en", null),
  ]);
  const enCarrito = carrito.count ?? 0;
  const avisos: Aviso[] = (avisosData ?? []).map((a) => ({ id: a.id, texto: a.texto, enlace: a.enlace, leido: !!a.leido_en, creado_en: a.creado_en }));

  return (
    <div className="flex min-w-0 items-center gap-2 sm:gap-3">
      <div className="hidden min-w-0 text-right leading-tight md:block">
        <p className="max-w-48 truncate text-sm font-medium">{usuario.empresa ?? usuario.nombre ?? usuario.email}</p>
        <p className="font-mono text-[11px] tracking-[0.1em] text-gris uppercase">{NOMBRE_ROL[usuario.rol]}</p>
      </div>
      <Campana perfilId={usuario.id} avisos={avisos} sinLeer={sinLeer ?? 0} />
      {usuario.rol === "comprador" && (
        <Link href="/carrito" className={`${botonPrimario} h-10 px-3 sm:px-4`}>
          <ShoppingCart className="size-4" aria-hidden="true" />
          <span className="sr-only sm:not-sr-only">Carrito</span>
          <ContadorCarrito cantidad={enCarrito} />
        </Link>
      )}
      <form action={salir}>
        <button type="submit" aria-label="Salir" className={`${botonSecundario} h-10 px-3 sm:px-4`}>
          <LogOut className="size-4" aria-hidden="true" />
          <span className="hidden sm:inline">Salir</span>
        </button>
      </form>
    </div>
  );
}
