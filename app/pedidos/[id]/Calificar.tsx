"use client";

// Calificar a una marca de un pedido entregado: de 1 a 5 estrellas y un comentario opcional (8-nov-2026).
// Se puede cambiar hasta 30 días después de la entrega. La calificación es anónima: se publica como
// "Comprador verificado" y nadie (ni la marca) ve quién la hizo. El servidor revisa todo en calificar().
import { Star } from "lucide-react";
import { useActionState, useState } from "react";
import { AvisoForm } from "@/components/AvisoForm";
import { Sello } from "@/components/Sello";
import type { EstadoForm } from "@/lib/acciones-auth";
import { calificarMarca } from "@/lib/acciones-pedidos";
import { botonPrimario, botonSecundario, campo } from "@/lib/estilos";

const TEXTOS = ["", "Malo", "Regular", "Bueno", "Muy bueno", "Excelente"];

export function Calificar({
  subpedidoId,
  marca,
  inicial,
}: {
  subpedidoId: string;
  marca: string;
  inicial?: { estrellas: number; comentario: string | null };
}) {
  // "vez" cuenta los envíos que salieron bien: así el sello se vuelve a estampar
  const [estado, accion, enviando] = useActionState<EstadoForm & { vez?: number }, FormData>(async (antes, form) => {
    const r = await calificarMarca(antes, form);
    return { ...r, vez: r.mensaje ? (antes.vez ?? 0) + 1 : antes.vez };
  }, {});
  const [estrellas, setEstrellas] = useState(inicial?.estrellas ?? 0);
  const [encima, setEncima] = useState(0); // estrella bajo el mouse: adelanta cómo quedaría
  const [abierto, setAbierto] = useState(!inicial);
  const mostrar = encima || estrellas;

  if (!abierto) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-linea bg-papel px-4 py-3 sm:px-5">
        <p className="flex items-center gap-2 text-sm">
          Tu calificación:
          <span className="inline-flex" aria-label={`${estrellas} de 5 estrellas`} role="img">
            {[1, 2, 3, 4, 5].map((n) => (
              <Star key={n} className={`size-4 ${n <= estrellas ? "text-tinta" : "text-linea"}`} fill="currentColor" strokeWidth={0} />
            ))}
          </span>
        </p>
        <button type="button" onClick={() => setAbierto(true)} className="text-sm font-medium enlace text-verde hover:text-tinta">
          Cambiar
        </button>
      </div>
    );
  }

  return (
    <form action={accion} className="flex flex-col gap-3 border-t border-linea bg-papel px-4 py-4 sm:px-5">
      <input type="hidden" name="subpedido_id" value={subpedidoId} />
      <input type="hidden" name="estrellas" value={estrellas} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">¿Cómo te fue con {marca}?</p>
        {estado.mensaje && estado.vez ? (
          <Sello key={estado.vez} tono="verde" giro={-5}>
            ¡Gracias!
          </Sello>
        ) : null}
      </div>
      <div className="flex items-center gap-3">
        <div role="radiogroup" aria-label={`Estrellas para ${marca}`} className="flex" onMouseLeave={() => setEncima(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={estrellas === n}
              aria-label={`${n} ${n === 1 ? "estrella" : "estrellas"}: ${TEXTOS[n]}`}
              onClick={() => setEstrellas(n)}
              onMouseEnter={() => setEncima(n)}
              className="flex size-11 items-center justify-center rounded-md focus-visible:outline-2 focus-visible:outline-verde sm:size-9"
            >
              <Star
                className={`size-6 transition-[color,scale] duration-150 ${n <= mostrar ? "scale-110 text-tinta" : "text-linea"}`}
                fill="currentColor"
                strokeWidth={0}
              />
            </button>
          ))}
        </div>
        <span className="text-sm text-gris" aria-live="polite">
          {TEXTOS[mostrar]}
        </span>
      </div>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs text-gris">Comentario (opcional, se publica como «Comprador verificado»)</span>
        <textarea
          name="comentario"
          maxLength={300}
          rows={2}
          defaultValue={inicial?.comentario ?? ""}
          placeholder="Ej.: llegó bien empacado y el pisco gustó mucho."
          className={`${campo} h-auto py-2`}
        />
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" disabled={enviando || estrellas === 0} className={`${botonPrimario} h-10 px-4`}>
          {enviando ? "Guardando…" : inicial ? "Guardar cambios" : "Enviar calificación"}
        </button>
        {inicial && (
          <button type="button" onClick={() => setAbierto(false)} className={`${botonSecundario} h-10 px-4`}>
            Cancelar
          </button>
        )}
      </div>
      <div className="empty:hidden text-sm">
        <AvisoForm estado={estado} />
      </div>
    </form>
  );
}
