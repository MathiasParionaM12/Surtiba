"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Enlace = { href: string; texto: string };

// Pestañas sin lógica: marca como activa la que coincide con "ruta" (o ninguna si ruta es null)
export function PestanasBase({ enlaces, ruta }: { enlaces: Enlace[]; ruta: string | null }) {
  // La pestaña "raíz" (ej. /marca) solo está activa en su página exacta; las demás, también en sus subpáginas
  const activa = (href: string, i: number) =>
    ruta !== null && (i === 0 ? ruta === href : ruta === href || ruta.startsWith(`${href}/`));

  return (
    // Se puede deslizar en celular, pero sin barra ni flechas de desplazamiento
    <nav
      className="mt-4 flex gap-6 overflow-x-auto border-b border-linea [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      aria-label="Secciones del panel"
    >
      {enlaces.map((e, i) => (
        <Link
          key={e.href}
          href={e.href}
          aria-current={activa(e.href, i) ? "page" : undefined}
          className={`-mb-px border-b-2 pb-3 text-sm font-medium whitespace-nowrap transition-colors ${
            activa(e.href, i) ? "border-verde text-tinta" : "border-transparent text-gris hover:text-tinta"
          }`}
        >
          {e.texto}
        </Link>
      ))}
    </nav>
  );
}

// Pestañas de un panel: la activa se marca con una línea verde. Lee la dirección de la página,
// por eso debe ir dentro de <Suspense> (con PestanasBase ruta={null} como respaldo).
export function PestanasPanel({ enlaces }: { enlaces: Enlace[] }) {
  return <PestanasBase enlaces={enlaces} ruta={usePathname()} />;
}
