import Image from "next/image";

// Logo de una marca en el directorio. Si todavía no tiene, su inicial en un cuadrado sobrio.
export function LogoMarca({ nombre, logo, grande = false }: { nombre: string; logo: string | null; grande?: boolean }) {
  const tamano = grande ? "size-20 sm:size-24" : "size-14";
  return (
    <span className={`relative flex ${tamano} shrink-0 items-center justify-center overflow-hidden rounded-md border border-linea bg-papel`}>
      {logo ? (
        <Image src={logo} alt={`Logo de ${nombre}`} fill sizes={grande ? "96px" : "56px"} className="object-contain p-1.5" />
      ) : (
        <span className={`font-semibold text-verde ${grande ? "text-3xl" : "text-xl"}`} aria-hidden="true">
          {nombre.trim().charAt(0).toUpperCase()}
        </span>
      )}
    </span>
  );
}
