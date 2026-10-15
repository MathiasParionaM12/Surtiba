// Fundido corto al cambiar de pestaña del panel (clase "entrada" en globals.css)
export default function Plantilla({ children }: { children: React.ReactNode }) {
  return <div className="entrada">{children}</div>;
}
