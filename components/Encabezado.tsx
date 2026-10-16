import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/Logo";
import { MedirEncabezado } from "@/components/MedirEncabezado";
import { MenuSesion } from "@/components/MenuSesion";
import { NavMovil, NavPrincipal, NavPrincipalCargando } from "@/components/Navegacion";

// Barra superior de todas las páginas. Lo que depende de la sesión lee cookies,
// por eso va dentro de <Suspense>: el logo carga al instante.
export function Encabezado() {
  return (
    <header className="sticky top-0 z-10 border-b border-linea bg-papel/95 backdrop-blur">
      <MedirEncabezado />
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:h-18 sm:px-8">
        <div className="flex items-center gap-6">
          <Link href="/" aria-label="Surtiba, inicio" className="shrink-0">
            <Logo className="h-6 sm:h-7" prioridad />
          </Link>
          <Suspense fallback={<NavPrincipalCargando />}>
            <NavPrincipal />
          </Suspense>
        </div>
        <Suspense fallback={<div className="h-10 w-44" aria-hidden="true" />}>
          <MenuSesion />
        </Suspense>
      </div>
      <Suspense fallback={null}>
        <NavMovil />
      </Suspense>
    </header>
  );
}
