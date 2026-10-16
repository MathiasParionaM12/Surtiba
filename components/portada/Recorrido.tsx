// Esquema de cómo funciona: varias marcas → Surtiba recoge → una sola entrega.
// La línea verde se dibuja al bajar (clase "trazo" en globals.css, solo CSS). Sin soporte o con
// "reducir movimiento", se ve dibujada desde el inicio. Los 3 nodos caen sobre las 3 columnas de abajo.
export function Recorrido() {
  const lineas = ["M185 29 C 300 29, 330 60, 432 60", "M185 60 L 432 60", "M185 91 C 300 91, 330 60, 432 60", "M468 60 L 715 60"];
  return (
    <svg viewBox="0 0 900 120" className="w-full" role="img" aria-label="Varias marcas, Surtiba recoge, una sola entrega">
      {/* Líneas de fondo y, encima, las verdes que se dibujan */}
      {lineas.map((d) => (
        <path key={`base-${d}`} d={d} fill="none" stroke="var(--color-linea)" strokeWidth="2" />
      ))}
      {lineas.map((d) => (
        <path key={`trazo-${d}`} d={d} pathLength={1} className="trazo" fill="none" stroke="var(--color-verde)" strokeWidth="2" strokeLinecap="round" />
      ))}

      {/* Marcas */}
      {[18, 49, 80].map((y) => (
        <g key={y}>
          <rect x="115" y={y} width="70" height="22" rx="4" fill="var(--color-blanco)" stroke="var(--color-gris)" strokeWidth="1.5" />
          <rect x="125" y={y + 9} width="30" height="4" rx="2" fill="var(--color-linea)" />
        </g>
      ))}

      {/* Surtiba recoge */}
      <circle cx="450" cy="60" r="18" fill="var(--color-verde)" />
      <rect x="443" y="55" width="14" height="10" rx="2" fill="var(--color-blanco)" />

      {/* Tu entrega */}
      <rect x="715" y="38" width="70" height="44" rx="6" fill="var(--color-blanco)" stroke="var(--color-verde)" strokeWidth="2" />
      <path d="M737 61 l8 8 l16 -18" fill="none" stroke="var(--color-verde)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
