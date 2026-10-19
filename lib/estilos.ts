// Clases de Tailwind reutilizables, según docs/marca.md.
// Botones: radio 6px. Primario = fondo tinta. Secundario = borde línea. Nunca el resaltador.

const botonBase =
  "inline-flex h-11 items-center justify-center gap-2 rounded-md px-5 text-sm font-medium whitespace-nowrap transition-[color,background-color,border-color,scale] duration-150 active:scale-[0.98] " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-verde disabled:cursor-not-allowed disabled:opacity-50";

export const botonPrimario = `${botonBase} bg-tinta text-blanco hover:bg-tinta/85`;
export const botonSecundario = `${botonBase} border border-linea bg-blanco text-tinta hover:border-gris`;

export const campo =
  "h-11 w-full rounded-md border border-linea bg-blanco px-3 text-base text-tinta " +
  "hover:border-gris focus:outline-2 focus:outline-offset-1 focus:outline-verde";

export const etiqueta = "text-sm font-medium";

// Texto pequeño en mayúsculas con Geist Mono (sellos, encabezados de tabla)
export const sello = "font-mono text-xs font-medium tracking-[0.12em] text-gris uppercase";

// Agranda la zona que se puede tocar de un botón de texto (unos 44 px de alto) sin mover el diseño
export const areaToque = "relative before:absolute before:-inset-x-2 before:-inset-y-3.5";

// Enlace del menú del encabezado: línea verde debajo al pasar el mouse y en la página actual (components/EnlaceMenu.tsx)
export const enlaceMenu =
  "relative text-sm font-medium hover:text-verde after:absolute after:inset-x-0 after:-bottom-1 after:h-0.5 after:origin-left after:scale-x-0 after:rounded-full after:bg-verde after:transition-transform after:duration-200 after:ease-out hover:after:scale-x-100 aria-[current=page]:after:scale-x-100";
