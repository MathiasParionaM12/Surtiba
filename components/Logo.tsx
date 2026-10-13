// Logo de texto: "surtiba" en minúsculas, con el punto de la "i" como un cuadrado amarillo.
// Usa la "ı" sin punto y le pone encima un cuadrado de color resaltador.
export function Logo({ className = "" }: { className?: string }) {
  return (
    <span
      role="img"
      aria-label="surtiba"
      className={`inline-flex font-sans font-semibold leading-none tracking-tight text-tinta ${className}`}
    >
      surt
      <span className="relative">
        ı
        <span
          aria-hidden="true"
          className="absolute top-[0.07em] left-1/2 size-[0.19em] -translate-x-1/2 bg-resaltador"
        />
      </span>
      ba
    </span>
  );
}
