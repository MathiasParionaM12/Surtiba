import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { botonPrimario } from "@/lib/estilos";

// Cuando una lista está vacía: un ícono grande de trazo fino en verde, qué pasa y qué hacer.
// (docs/marca.md: estados vacíos útiles, íconos de trazo fino en verde)
export function EstadoVacio({
  icono: Icono,
  texto,
  accion,
}: {
  icono: LucideIcon;
  texto: string;
  accion?: { href: string; texto: string };
}) {
  return (
    <div className="mt-8 flex flex-col items-center rounded-md border border-dashed border-linea bg-blanco px-6 py-10 text-center">
      <span className="estampa flex size-16 items-center justify-center rounded-full border border-linea bg-papel" style={{ "--giro": "0deg" } as React.CSSProperties}>
        <Icono className="size-7 text-verde" strokeWidth={1.25} aria-hidden="true" />
      </span>
      <p className="mt-4 max-w-sm text-gris">{texto}</p>
      {accion && (
        <Link href={accion.href} className={`${botonPrimario} mt-5`}>
          {accion.texto}
        </Link>
      )}
    </div>
  );
}
