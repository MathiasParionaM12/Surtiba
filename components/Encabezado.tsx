import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/Logo";
import { MenuSesion } from "@/components/MenuSesion";

// Barra superior de todas las páginas. La parte de la sesión lee cookies,
// por eso va dentro de <Suspense>: el resto del encabezado carga al instante.
export function Encabezado() {
  return (
    <header className="sticky top-0 z-10 border-b border-linea bg-papel">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:h-18 sm:px-8">
        <Link href="/" aria-label="Surtiba, inicio" className="shrink-0">
          <Logo className="text-2xl sm:text-[28px]" />
        </Link>
        <Suspense fallback={<div className="h-10 w-44" aria-hidden="true" />}>
          <MenuSesion />
        </Suspense>
      </div>
    </header>
  );
}
