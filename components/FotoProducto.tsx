import Image from "next/image";
import { Sello } from "@/components/Sello";
import { CATEGORIAS } from "@/lib/catalogo";
import { IconoCategoria } from "@/components/IconoCategoria";

// Foto del producto. Si todavía no tiene, una etiqueta: el ícono de su categoría y un sello
// "PISCO · 750 ML" (quieto: se ven muchas tarjetas a la vez).
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
          className="object-contain p-3 transition-transform sm:p-4 duration-300 group-hover:scale-[1.03]"
        />
      ) : (
        <div className="flex flex-col items-center gap-2 transition-transform duration-300 group-hover:scale-[1.04] sm:gap-3">
          <IconoCategoria categoria={categoria} className={`text-verde/70 ${grande ? "size-16" : "size-8 sm:size-10"}`} strokeWidth={1} />
          <Sello tono="verde" giro={-6} animar={false} grande={grande} className={grande ? "" : "text-[9px] sm:text-[11px]"}>
            {CATEGORIAS[categoria] ?? categoria} · {ml} ml
          </Sello>
        </div>
      )}
      {foto && (
        <span
          className={`absolute font-mono tracking-[0.12em] text-gris uppercase ${grande ? "bottom-3 left-3 text-[11px]" : "bottom-2 left-2 text-[10px] sm:bottom-3 sm:left-3 sm:text-[11px]"}`}
        >
          {CATEGORIAS[categoria] ?? categoria}
        </span>
      )}
      {foto && (
        <span className={`absolute right-3 bottom-3 font-mono text-[11px] text-gris ${grande ? "" : "hidden sm:block"}`}>{ml} ml</span>
      )}
    </div>
  );
}
