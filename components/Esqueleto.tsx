// "Esqueletos" de carga: la forma gris de lo que va a aparecer mientras llegan los datos.
// Tienen un brillo que las recorre; si la persona pidió menos movimiento, se quedan quietas (globals.css).

function Bloque({ className = "" }: { className?: string }) {
  return <div className={`brillo rounded-md ${className}`} />;
}

export function EsqueletoTarjetas({ cantidad = 8 }: { cantidad?: number }) {
  return (
    <div className="mt-8" aria-busy="true" aria-label="Cargando productos">
      <Bloque className="h-3 w-24" />
      <div className="mt-3 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: cantidad }, (_, i) => (
          <div key={i} className="overflow-hidden rounded-md border border-linea bg-blanco">
            <div className="aspect-square border-b border-linea bg-papel sm:aspect-[4/3]" />
            <div className="flex flex-col gap-2 p-3 sm:p-4">
              <Bloque className="h-3 w-20" />
              <Bloque className="h-4 w-40" />
              <Bloque className="h-3 w-28" />
              <Bloque className="mt-4 h-5 w-32" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function EsqueletoTabla({ filas = 4 }: { filas?: number }) {
  return (
    <div className="mt-6 rounded-md border border-linea bg-blanco" aria-busy="true" aria-label="Cargando">
      {Array.from({ length: filas }, (_, i) => (
        <div key={i} className="flex items-center gap-4 border-b border-linea p-4 last:border-b-0">
          <Bloque className="h-4 w-24" />
          <Bloque className="h-4 flex-1" />
          <Bloque className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}

export function EsqueletoPagina() {
  return (
    <div aria-busy="true" aria-label="Cargando">
      <Bloque className="h-3 w-28" />
      <Bloque className="mt-4 h-8 w-72 max-w-full" />
      <Bloque className="mt-3 h-4 w-96 max-w-full" />
      <div className="mt-8 grid grid-cols-3 gap-px overflow-hidden rounded-md border border-linea bg-linea">
        {[0, 1, 2].map((i) => (
          <div key={i} className="bg-blanco p-5">
            <Bloque className="h-7 w-10" />
            <Bloque className="mt-2 h-3 w-24" />
          </div>
        ))}
      </div>
      <EsqueletoTabla />
    </div>
  );
}

export function EsqueletoDetalle() {
  return (
    <div className="mt-6 grid gap-8 md:grid-cols-2 md:gap-12" aria-busy="true" aria-label="Cargando producto">
      <div className="aspect-square rounded-md border border-linea bg-papel" />
      <div>
        <Bloque className="h-3 w-40" />
        <Bloque className="mt-4 h-8 w-64" />
        <Bloque className="mt-8 h-32 w-full" />
        <Bloque className="mt-6 h-40 w-full" />
      </div>
    </div>
  );
}
