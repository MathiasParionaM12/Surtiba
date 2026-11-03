import { TriangleAlert } from "lucide-react";

// Advertencia que no se puede pasar por alto (pedido de Adriano, 3-nov-2026): más grande que el texto normal,
// con ícono, en rojo apagado de borde y texto. El rojo nunca va de fondo (docs/marca.md).
export function Advertencia({ children, titulo }: { children: React.ReactNode; titulo?: string }) {
  return (
    <div role="alert" className="flex gap-3 rounded-md border-2 border-rojo bg-blanco px-4 py-3 text-rojo">
      <TriangleAlert className="mt-0.5 size-5 shrink-0" strokeWidth={2} aria-hidden="true" />
      <div className="text-base leading-snug">
        {titulo && <p className="font-semibold">{titulo}</p>}
        <div className={titulo ? "mt-0.5 font-medium" : "font-medium"}>{children}</div>
      </div>
    </div>
  );
}
