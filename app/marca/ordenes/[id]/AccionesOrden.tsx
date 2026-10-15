"use client";

import { useActionState, useState } from "react";
import { AvisoForm } from "@/components/AvisoForm";
import { Etiqueta } from "@/components/Etiqueta";
import type { EstadoForm } from "@/lib/acciones-auth";
import { marcarListo, rechazarOrden } from "@/lib/acciones-marca";
import { botonPrimario, botonSecundario, campo } from "@/lib/estilos";

// Botones de una orden pendiente: "Listo para recojo" o "No puedo atenderla" (con motivo)
export function AccionesOrden({ subpedidoId }: { subpedidoId: string }) {
  const [listo, accionListo, enviandoListo] = useActionState<EstadoForm, FormData>(marcarListo, {});
  const [rechazo, accionRechazo, enviandoRechazo] = useActionState<EstadoForm, FormData>(rechazarOrden, {});
  const [mostrarRechazo, setMostrarRechazo] = useState(false);

  return (
    <div className="rounded-md border border-linea bg-blanco p-5">
      <p className="text-sm">¿Tienes esta orden preparada? Márcala para que Surtiba pase a recogerla.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <form action={accionListo}>
          <input type="hidden" name="subpedido_id" value={subpedidoId} />
          <button type="submit" disabled={enviandoListo} className={botonPrimario}>
            {enviandoListo ? "Guardando…" : "Listo para recojo"}
          </button>
        </form>
        {!mostrarRechazo && (
          <button type="button" onClick={() => setMostrarRechazo(true)} className={botonSecundario}>
            No puedo atenderla
          </button>
        )}
      </div>
      <div className="mt-3 empty:hidden">
        <AvisoForm estado={listo} />
      </div>

      {mostrarRechazo && (
        <form action={accionRechazo} className="mt-6 flex flex-col gap-3 border-t border-linea pt-5">
          <input type="hidden" name="subpedido_id" value={subpedidoId} />
          <label className="flex flex-col gap-2">
            <Etiqueta texto="¿Por qué no puedes atenderla?" obligatorio />
            <textarea
              name="motivo"
              rows={3}
              required
              minLength={5}
              defaultValue={rechazo.valores?.motivo}
              placeholder="Ej.: no tengo stock suficiente hasta la próxima semana."
              className={`${campo} h-auto py-2`}
            />
          </label>
          <p className="text-xs text-gris">Surtiba usará este motivo para avisarle al cliente. El stock vuelve a tu inventario.</p>
          <AvisoForm estado={rechazo} />
          <div className="flex gap-2">
            <button type="submit" disabled={enviandoRechazo} className={botonSecundario}>
              {enviandoRechazo ? "Guardando…" : "Confirmar: no puedo atenderla"}
            </button>
            <button type="button" onClick={() => setMostrarRechazo(false)} className="px-3 text-sm font-medium text-gris hover:text-tinta">
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
