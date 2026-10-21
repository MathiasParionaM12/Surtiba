// Una línea pequeña con las últimas semanas (de la más antigua a la actual), bajo un número del panel.
// Solo trazo verde y puntos: sin ejes ni colores nuevos (docs/marca.md). La lectura exacta va en texto
// para lectores de pantalla.
export function MiniGrafico({ valores, descripcion }: { valores: number[]; descripcion: string }) {
  const ancho = 88;
  const alto = 24;
  const max = Math.max(1, ...valores);
  const paso = valores.length > 1 ? ancho / (valores.length - 1) : 0;
  const puntos = valores.map((v, i) => [i * paso, alto - 3 - (v / max) * (alto - 6)] as const);

  return (
    <span className="mt-2 flex items-center gap-2">
      <svg viewBox={`-3 0 ${ancho + 6} ${alto}`} width={ancho + 6} height={alto} aria-hidden="true" className="overflow-visible">
        <polyline
          points={puntos.map(([x, y]) => `${x},${y}`).join(" ")}
          fill="none"
          stroke="var(--color-verde)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
          className="trazo-grafico"
        />
        {puntos.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={i === puntos.length - 1 ? 2.5 : 1.5} fill="var(--color-verde)" />
        ))}
      </svg>
      <span className="font-mono text-[10px] tracking-[0.08em] text-gris uppercase">4 semanas</span>
      <span className="sr-only">{descripcion}</span>
    </span>
  );
}

// Suma por semana (las últimas n, terminando hoy) de lo entregado
export function porSemana<T>(filas: T[], fecha: (f: T) => string | null, valor: (f: T) => number, semanas = 4) {
  const ahora = Date.now();
  const dia = 24 * 60 * 60 * 1000;
  const totales = Array.from({ length: semanas }, () => 0);
  for (const f of filas) {
    const cuando = fecha(f);
    if (!cuando) continue;
    const hace = Math.floor((ahora - new Date(cuando).getTime()) / (7 * dia));
    if (hace >= 0 && hace < semanas) totales[semanas - 1 - hace] += valor(f);
  }
  return totales;
}
