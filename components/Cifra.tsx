// Un número que hace un fundido corto (200 ms, clase "cifra" en globals.css) cuando cambia,
// para que se note qué se movió. Con "reducir movimiento" no se anima.
export function Cifra({ children, className = "" }: { children: string; className?: string }) {
  return (
    <span key={children} className={`cifra inline-block ${className}`}>
      {children}
    </span>
  );
}
