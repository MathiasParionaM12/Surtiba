import Image from "next/image";
import { CATEGORIAS } from "@/lib/catalogo";

// Foto del producto. Si todavía no tiene, un recuadro sobrio con una botella dibujada.
export function FotoProducto({
  categoria,
  ml,
  foto,
  grande = false,
}: {
  categoria: string;
  ml: number;
  foto?: string | null;
  grande?: boolean;
}) {
  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden border-linea bg-papel ${grande ? "aspect-square rounded-md border" : "aspect-square border-b sm:aspect-[4/3]"}`}
    >
      {foto ? (
        <Image
          src={foto}
          alt=""
          fill
          sizes={grande ? "(min-width: 768px) 50vw, 100vw" : "(min-width: 1280px) 25vw, (min-width: 640px) 50vw, 100vw"}
          className="object-contain p-3 transition-transform sm:p-4 duration-300 motion-safe:group-hover:scale-[1.03]"
        />
      ) : (
        <svg
          viewBox="0 0 40 100"
          className={`transition-transform duration-300 motion-safe:group-hover:scale-[1.04] ${grande ? "h-48" : "h-16 sm:h-24"}`}
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M16 4h8v18c0 4 8 8 8 18v52a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4V40c0-10 8-14 8-18V4Z"
            stroke="var(--color-linea)"
            strokeWidth="2"
          />
          <path d="M8 56h24v20H8z" fill="var(--color-linea)" opacity="0.5" />
        </svg>
      )}
      <span className={`absolute font-mono tracking-[0.12em] text-gris uppercase ${grande ? "bottom-3 left-3 text-[11px]" : "bottom-2 left-2 text-[10px] sm:bottom-3 sm:left-3 sm:text-[11px]"}`}>
        {CATEGORIAS[categoria] ?? categoria}
      </span>
      <span className={`absolute right-3 bottom-3 font-mono text-[11px] text-gris ${grande ? "" : "hidden sm:block"}`}>{ml} ml</span>
    </div>
  );
}
