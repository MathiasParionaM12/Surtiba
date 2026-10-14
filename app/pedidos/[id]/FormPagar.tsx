"use client";

import { useActionState } from "react";
import { AvisoForm } from "@/components/AvisoForm";
import type { EstadoForm } from "@/lib/acciones-auth";
import { pagarPedido } from "@/lib/acciones-pedidos";
import { botonPrimario } from "@/lib/estilos";
import { soles } from "@/lib/formato";
import { METODOS_PAGO } from "@/lib/pagos";

// Pagar un encargo confirmado o lo que falte de un pedido (pago simulado)
export function FormPagar({ pedidoId, monto }: { pedidoId: string; monto: number }) {
  const [estado, accion, enviando] = useActionState<EstadoForm, FormData>(pagarPedido, {});

  return (
    <form action={accion} className="mt-4 flex flex-col gap-3">
      <input type="hidden" name="pedido_id" value={pedidoId} />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {METODOS_PAGO.map((m) => (
          <label
            key={m.valor}
            className="flex cursor-pointer items-center gap-2 rounded-md border border-linea bg-blanco px-3 py-2.5 text-sm has-[:checked]:border-tinta"
          >
            <input type="radio" name="metodo_pago" value={m.valor} required className="accent-verde" />
            {m.texto}
          </label>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={enviando} className={botonPrimario}>
          {enviando ? "Pagando…" : `Pagar ${soles(monto)}`}
        </button>
        <span className="text-xs text-gris">Pago simulado: no se cobra dinero real.</span>
      </div>
      <AvisoForm error={estado.error} mensaje={estado.mensaje} />
    </form>
  );
}
