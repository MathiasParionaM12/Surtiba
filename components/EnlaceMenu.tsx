"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

// Enlace del menú del encabezado: una línea verde crece debajo al pasar el mouse
// y se queda debajo del enlace de la página en la que estás.
export function EnlaceMenu({ href, children, className = "" }: { href: string; children: ReactNode; className?: string }) {
  const ruta = usePathname();
  const actual = ruta === href || ruta.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-current={actual ? "page" : undefined}
      className={`relative text-sm font-medium hover:text-verde after:absolute after:inset-x-0 after:-bottom-1 after:h-0.5 after:origin-left after:scale-x-0 after:rounded-full after:bg-verde after:transition-transform after:duration-200 after:ease-out hover:after:scale-x-100 aria-[current=page]:after:scale-x-100 ${className}`}
    >
      {children}
    </Link>
  );
}
