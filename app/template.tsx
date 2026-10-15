// Plantilla: a diferencia del layout, se vuelve a montar en cada cambio de pantalla.
// Así cada página aparece con un fundido corto (clase "entrada" en globals.css).
export default function Plantilla({ children }: { children: React.ReactNode }) {
  return <div className="entrada flex flex-1 flex-col">{children}</div>;
}
