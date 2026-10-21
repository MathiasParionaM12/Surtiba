"use client";

import { useActionState, useState } from "react";
import { AvisoForm } from "@/components/AvisoForm";
import { Etiqueta } from "@/components/Etiqueta";
import type { EstadoForm } from "@/lib/acciones-auth";
import { responderEncargo } from "@/lib/acciones-marca";
import { botonPrimario, campo } from "@/lib/estilos";

// Encargo por confirmar: la marca elige si puede hacerlo (y para cuándo, desde mañana) o no (y por qué),
// y lo envía con un solo botón. La base de datos vuelve a revisar la fecha.
// En "todo junto" una parte (o todo) ya salió de su stock: solo produce lo que falta.
export function AccionesEncargo({
  subpedidoId,
  manana,
  apartadas,
  porProducir,
}: {
  subpedidoId: string;
  manana: string; // AAAA-MM-DD: la primera fecha que se puede prometer
  apartadas: number;
  porProducir: number;
}) {
  const [estado, accion, enviando] = useActionState<EstadoForm, FormData>(responderEncargo, {});
  const [respuesta, setRespuesta] = useState<"acepto" | "no">("acepto");

  const explicacion =
    apartadas === 0
      ? "El cliente pidió más de lo que tienes en stock. Dinos si puedes hacerlo y para cuándo. El cliente paga recién cuando confirmes."
      : porProducir === 0
        ? `El cliente quiere recibir todo su pedido junto. Ya apartamos estas ${apartadas} cajas de tu stock: dinos para cuándo las tienes listas. El cliente paga cuando todas las marcas confirmen.`
        : `El cliente quiere recibir todo junto. Ya apartamos ${apartadas} cajas de tu stock; faltan ${porProducir} por producir. Dinos si puedes hacerlo y para cuándo. El cliente paga cuando todas las marcas confirmen.`;

  return (
    <form action={accion} className="flex flex-col gap-4 rounded-md border border-tinta bg-blanco p-5">
      <input type="hidden" name="subpedido_id" value={subpedidoId} />
      <input type="hidden" name="respuesta" value={respuesta} />
      <div>
        <p className="font-medium">Este es un pedido por encargo.</p>
        <p className="mt-1 text-sm text-gris">{explicacion}</p>
      </div>

      {/* Es una elección (no un botón que envía): por eso se ve como dos opciones para marcar */}
      <fieldset>
        <legend className="mb-2 text-sm font-medium">¿Puedes hacer este encargo?</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {(
            [
              { valor: "acepto", titulo: "Sí, puedo hacerlo", ayuda: "Dinos para cuándo lo tendrás listo." },
              { valor: "no", titulo: "No puedo hacerlo", ayuda: "Cuéntanos por qué; el cliente no lo paga." },
            ] as const
          ).map((o) => (
            <label
              key={o.valor}
              className="flex min-h-11 cursor-pointer items-start gap-3 rounded-md border border-linea bg-blanco px-4 py-3 transition-colors hover:border-gris has-[:checked]:border-tinta"
            >
              <input
                type="radio"
                name="opcion"
                checked={respuesta === o.valor}
                onChange={() => setRespuesta(o.valor)}
                className="mt-1 accent-verde"
              />
              <span>
                <span className="block font-medium">{o.titulo}</span>
                <span className="block text-xs text-gris">{o.ayuda}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {respuesta === "acepto" ? (
        <label className="flex flex-col gap-2">
          <Etiqueta texto="¿Para cuándo lo tendrás listo para recoger?" obligatorio />
          <div className="w-48">
            <input name="fecha" type="date" min={manana} required defaultValue={estado.valores?.fecha} className={`${campo} font-mono`} />
          </div>
          <span className="text-xs text-gris">Desde mañana. Podrás marcarlo listo para recojo desde ese día.</span>
        </label>
      ) : (
        <label className="flex flex-col gap-2">
          <Etiqueta texto="¿Por qué no puedes hacerlo?" obligatorio />
          <textarea
            name="motivo"
            rows={3}
            required
            minLength={5}
            defaultValue={estado.valores?.motivo}
            className={`${campo} h-auto py-2`}
          />
          {apartadas > 0 && <span className="text-xs text-gris">Las {apartadas} cajas apartadas vuelven a tu stock.</span>}
        </label>
      )}

      <AvisoForm estado={estado} />
      <button type="submit" disabled={enviando} className={`${botonPrimario} self-start`}>
        {enviando ? "Enviando…" : respuesta === "acepto" ? "Confirmar encargo" : "Enviar respuesta"}
      </button>
    </form>
  );
}
