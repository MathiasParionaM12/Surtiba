"use client";

import { useActionState, useState } from "react";
import { AvisoForm } from "@/components/AvisoForm";
import { Etiqueta } from "@/components/Etiqueta";
import type { EstadoForm } from "@/lib/acciones-auth";
import { responderEncargo } from "@/lib/acciones-marca";
import { botonPrimario, botonSecundario, campo } from "@/lib/estilos";

// Encargo por confirmar: la marca dice cuándo lo tendrá listo, o que no puede hacerlo.
// En "todo junto" una parte (o todo) ya salió de su stock: solo produce lo que falta.
export function AccionesEncargo({
  subpedidoId,
  hoy,
  apartadas,
  porProducir,
}: {
  subpedidoId: string;
  hoy: string;
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

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setRespuesta("acepto")}
          className={`${respuesta === "acepto" ? botonPrimario : botonSecundario} h-10`}
        >
          Puedo hacerlo
        </button>
        <button
          type="button"
          onClick={() => setRespuesta("no")}
          className={`${respuesta === "no" ? botonPrimario : botonSecundario} h-10`}
        >
          No puedo
        </button>
      </div>

      {respuesta === "acepto" ? (
        <label className="flex flex-col gap-2">
          <Etiqueta texto="¿Para cuándo lo tendrás listo para recoger?" obligatorio />
          <div className="w-48">
            <input name="fecha" type="date" min={hoy} required defaultValue={estado.valores?.fecha} className={`${campo} font-mono`} />
          </div>
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

      <AvisoForm error={estado.error} mensaje={estado.mensaje} />
      <button type="submit" disabled={enviando} className={`${botonPrimario} self-start`}>
        {enviando ? "Enviando…" : respuesta === "acepto" ? "Confirmar encargo" : "Enviar respuesta"}
      </button>
    </form>
  );
}
