import { CATEGORIAS } from "@/lib/catalogo";

// Mientras no haya fotos (llegan en la fase 4), un recuadro sobrio con una botella dibujada.
export function FotoProducto({ categoria, ml, grande = false }: { categoria: string; ml: number; grande?: boolean }) {
  return (
    <div
      className={`relative flex items-center justify-center border-linea bg-papel ${grande ? "aspect-square rounded-md border" : "aspect-[4/3] border-b"}`}
    >
      <svg viewBox="0 0 40 100" className={grande ? "h-48" : "h-24"} fill="none" aria-hidden="true">
        <path
          d="M16 4h8v18c0 4 8 8 8 18v52a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4V40c0-10 8-14 8-18V4Z"
          stroke="var(--color-linea)"
          strokeWidth="2"
        />
        <path d="M8 56h24v20H8z" fill="var(--color-linea)" opacity="0.5" />
      </svg>
      <span className="absolute bottom-3 left-3 font-mono text-[11px] tracking-[0.12em] text-gris uppercase">
        {CATEGORIAS[categoria] ?? categoria}
      </span>
      <span className="absolute right-3 bottom-3 font-mono text-[11px] text-gris">{ml} ml</span>
    </div>
  );
}
