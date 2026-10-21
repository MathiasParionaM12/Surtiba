// Un sello que se estampa, como en un documento o una factura: entra un poco más grande e inclinado
// y se asienta en 0.26 s (clase "estampa" en globals.css). Con "reducir movimiento" solo aparece.
// Para que se vuelva a estampar, cambia su "key" (React lo monta de nuevo).
// animar={false}: se ve inclinado pero quieto (ej. al abrir una página que ya tenía ese estado).
export function Sello({
  children,
  tono = "tinta",
  giro = -4,
  grande = false,
  animar = true,
  className = "",
}: {
  children: React.ReactNode;
  tono?: "tinta" | "verde" | "gris" | "rojo"; // rojo apagado: solo para rechazado / cancelado (docs/marca.md)
  giro?: number; // grados de inclinación final
  grande?: boolean;
  animar?: boolean;
  className?: string;
}) {
  const color = { tinta: "text-tinta", verde: "text-verde", gris: "text-gris", rojo: "text-rojo" }[tono];
  const tamano = grande ? "border-[3px] px-2.5 py-1 text-sm" : "border-2 px-1.5 py-0.5 text-[11px]";
  return (
    <span
      style={{ "--giro": `${giro}deg` } as React.CSSProperties}
      className={`${animar ? "estampa" : "sello-quieto"} inline-flex items-center gap-1 rounded-[3px] border-current font-mono leading-none font-semibold tracking-[0.12em] whitespace-nowrap uppercase ${tamano} ${color} ${className}`}
    >
      {children}
    </span>
  );
}
