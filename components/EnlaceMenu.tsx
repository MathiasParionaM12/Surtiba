"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { enlaceMenu } from "@/lib/estilos";

// Enlace del menú del encabezado: una línea verde crece debajo al pasar el mouse
// y se queda debajo del enlace de la página en la que estás.
export function EnlaceMenu({ href, children, className = "" }: { href: string; children: ReactNode; className?: string }) {
  const ruta = usePathname();
  const actual = ruta === href || ruta.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-current={actual ? "page" : undefined}
      className={`${enlaceMenu} ${className}`}
    >
      {children}
    </Link>
  );
}
