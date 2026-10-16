import { Heart } from "lucide-react";
import { alternarFavorito } from "@/lib/acciones-pedidos";

// Corazón para guardar o quitar un producto de favoritos (solo compradores).
export function BotonFavorito({ productoId, activo, className = "" }: { productoId: string; activo: boolean; className?: string }) {
  return (
    <form action={alternarFavorito} className={className}>
      <input type="hidden" name="producto_id" value={productoId} />
      <button
        type="submit"
        aria-pressed={activo}
        aria-label={activo ? "Quitar de favoritos" : "Guardar en favoritos"}
        title={activo ? "Quitar de favoritos" : "Guardar en favoritos"}
        className="group flex size-11 items-center justify-center rounded-md border border-linea bg-blanco/90 sm:size-9 transition-colors hover:border-gris focus-visible:outline-2 focus-visible:outline-verde"
      >
        <Heart
          className={`size-[18px] transition-transform motion-safe:group-hover:scale-110 motion-safe:group-active:scale-90 ${activo ? "text-verde" : "text-gris"}`}
          fill={activo ? "currentColor" : "none"}
          strokeWidth={1.8}
          aria-hidden="true"
        />
      </button>
    </form>
  );
}
