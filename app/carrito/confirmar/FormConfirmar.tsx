"use client";

import { useActionState } from "react";
import { AvisoForm } from "@/components/AvisoForm";
import { Etiqueta } from "@/components/Etiqueta";
import type { EstadoForm } from "@/lib/acciones-auth";
import { confirmarPedido } from "@/lib/acciones-pedidos";
import { botonPrimario, campo, sello } from "@/lib/estilos";

export function FormConfirmar({ fechaMinima, totalTexto }: { fechaMinima: string; totalTexto: string }) {
  const [estado, accion, enviando] = useActionState<EstadoForm, FormData>(confirmarPedido, {});
  const v = estado.valores ?? {};

  return (
    <form key={JSON.stringify(v)} action={accion} className="flex flex-col gap-8">
      <fieldset className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <legend className={`${sello} mb-4`}>Entrega</legend>
        <label className="flex flex-col gap-2">
          <Etiqueta texto="Fecha deseada de entrega" obligatorio />
          <input
            name="fecha_entrega"
            type="date"
            min={fechaMinima}
            required
            defaultValue={v.fecha_entrega}
            className={`${campo} font-mono`}
          />
          <span className="text-xs text-gris">Desde mañana.</span>
        </label>
        <label className="flex flex-col gap-2 sm:col-span-2">
          <Etiqueta texto="Dirección de entrega" obligatorio />
          <input
            name="direccion"
            autoComplete="street-address"
            placeholder="Calle, número, distrito"
            required
            defaultValue={v.direccion}
            className={campo}
          />
        </label>
        <label className="flex flex-col gap-2 sm:col-span-2">
          <Etiqueta texto="Nota para Surtiba" nota="opcional" />
          <textarea
            name="nota"
            rows={3}
            placeholder="Ej.: entregar por la puerta de servicio, preguntar por Ana."
            defaultValue={v.nota}
            className={`${campo} h-auto py-2`}
          />
        </label>
      </fieldset>

      <fieldset className="grid grid-cols-1 gap-5 border-t border-linea pt-6 sm:grid-cols-2">
        <legend className={`${sello} mb-4 pt-6`}>Datos del evento (opcional)</legend>
        <label className="flex flex-col gap-2">
          <Etiqueta texto="Nombre del evento" />
          <input name="evento_nombre" placeholder="Ej.: Boda Pérez" defaultValue={v.evento_nombre} className={campo} />
        </label>
        <label className="flex flex-col gap-2">
          <Etiqueta texto="Tipo de evento" />
          <input
            name="evento_tipo"
            placeholder="Boda, corporativo, cumpleaños…"
            defaultValue={v.evento_tipo}
            className={campo}
          />
        </label>
        <label className="flex flex-col gap-2">
          <Etiqueta texto="Fecha del evento" />
          <input name="evento_fecha" type="date" defaultValue={v.evento_fecha} className={`${campo} font-mono`} />
        </label>
        <label className="flex flex-col gap-2">
          <Etiqueta texto="Invitados" />
          <input
            name="invitados"
            type="number"
            min={1}
            inputMode="numeric"
            defaultValue={v.invitados}
            className={`${campo} font-mono`}
          />
        </label>
      </fieldset>

      <AvisoForm error={estado.error} mensaje={estado.mensaje} />

      <div className="flex flex-col gap-2 border-t border-linea pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gris">
          Al enviar, Surtiba reserva el stock de cada marca. No hay pago en línea: Surtiba coordina el pago contigo.
        </p>
        <button type="submit" disabled={enviando} className={`${botonPrimario} shrink-0`}>
          {enviando ? "Enviando pedido…" : `Enviar pedido · ${totalTexto}`}
        </button>
      </div>
    </form>
  );
}
