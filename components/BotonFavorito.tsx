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
        className="flex size-9 items-center justify-center rounded-md border border-linea bg-blanco/90 transition-colors hover:border-gris focus-visible:outline-2 focus-visible:outline-verde"
      >
        <svg viewBox="0 0 24 24" className="size-[18px]" aria-hidden="true">
          <path
            d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"
            fill={activo ? "var(--color-verde)" : "none"}
            stroke={activo ? "var(--color-verde)" : "var(--color-gris)"}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </form>
  );
}
