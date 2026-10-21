// Barras de una sola serie (ej. ventas por semana). Verde de la marca, barras finas con la punta
// redondeada, cuadrícula suave y el detalle al pasar el mouse (title). La misma información va en
// una tabla para lectores de pantalla.
export function BarrasSemana({
  datos,
  formato,
  descripcion,
}: {
  datos: { etiqueta: string; valor: number }[];
  formato: (n: number) => string;
  descripcion: string;
}) {
  const alto = 140;
  const max = Math.max(1, ...datos.map((d) => d.valor));
  return (
    <figure>
      <div className="relative flex h-[164px] items-end gap-2 border-b border-linea pt-6" aria-hidden="true">
        {/* Cuadrícula suave a la mitad */}
        <span className="absolute inset-x-0 border-t border-dashed border-linea/70" style={{ bottom: alto / 2 }} />
        {datos.map((d, i) => {
          const h = d.valor > 0 ? Math.max(4, (d.valor / max) * alto) : 0;
          const ultimo = i === datos.length - 1;
          return (
            <div key={d.etiqueta} className="group relative flex h-full flex-1 flex-col items-center justify-end" title={`Semana del ${d.etiqueta}: ${formato(d.valor)}`}>
              {/* El valor se ve sobre la última barra y al pasar el mouse por cualquiera */}
              <span
                className={`absolute font-mono text-[11px] whitespace-nowrap text-tinta ${ultimo ? "" : "opacity-0 transition-opacity group-hover:opacity-100"}`}
                style={{ bottom: h + 4 }}
              >
                {d.valor > 0 ? formato(d.valor) : ""}
              </span>
              <span
                className={`crecer block w-full max-w-10 rounded-t-[4px] ${ultimo ? "bg-verde" : "bg-verde/60 group-hover:bg-verde"}`}
                style={{ height: h, animationDelay: `${i * 40}ms` }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex gap-2" aria-hidden="true">
        {datos.map((d) => (
          <span key={d.etiqueta} className="flex-1 text-center font-mono text-[10px] text-gris">
            {d.etiqueta}
          </span>
        ))}
      </div>
      <table className="sr-only">
        <caption>{descripcion}</caption>
        <tbody>
          {datos.map((d) => (
            <tr key={d.etiqueta}>
              <th scope="row">Semana del {d.etiqueta}</th>
              <td>{formato(d.valor)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
