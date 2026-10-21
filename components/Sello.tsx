// Un sello que se estampa, como en un documento o una factura: entra un poco más grande e inclinado
// y se asienta en 0.26 s (clase "estampa" en globals.css). Con "reducir movimiento" solo aparece.
// Para que se vuelva a estampar, cambia su "key" (React lo monta de nuevo).
export function Sello({
  children,
  tono = "tinta",
  giro = -4,
  className = "",
}: {
  children: React.ReactNode;
  tono?: "tinta" | "verde" | "gris";
  giro?: number; // grados de inclinación final
  className?: string;
}) {
  const color = { tinta: "text-tinta", verde: "text-verde", gris: "text-gris" }[tono];
  return (
    <span
      style={{ "--giro": `${giro}deg` } as React.CSSProperties}
      className={`estampa inline-flex items-center gap-1 rounded-[3px] border-2 border-current px-1.5 py-0.5 font-mono text-[11px] leading-none font-semibold tracking-[0.12em] whitespace-nowrap uppercase ${color} ${className}`}
    >
      {children}
    </span>
  );
}
