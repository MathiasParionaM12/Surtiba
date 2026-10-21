"use client";

// El estado de un pedido u orden como sello. Se estampa solo cuando el estado acaba de cambiar
// (ej. justo después de "Marcar entregado"), no cada vez que se abre la página.
// recien: true si se llega justo después de la acción (ej. ?nuevo=1 al pagar): se estampa al abrir.
import { useEffect, useRef, useState } from "react";
import { Sello } from "@/components/Sello";

const SELLOS: Record<string, { texto: string; tono: "tinta" | "verde" | "gris" | "rojo" }> = {
  por_confirmar: { texto: "Por confirmar", tono: "gris" },
  por_pagar: { texto: "Por pagar", tono: "tinta" },
  pagado: { texto: "Pagado", tono: "verde" },
  recibido: { texto: "Recibido", tono: "gris" },
  pendiente: { texto: "Pendiente", tono: "gris" },
  en_preparacion: { texto: "En preparación", tono: "verde" },
  listo_recojo: { texto: "Listo", tono: "verde" },
  recogido: { texto: "Recogido", tono: "verde" },
  en_camino: { texto: "En camino", tono: "verde" },
  entregado: { texto: "Entregado", tono: "tinta" },
  rechazado: { texto: "Rechazado", tono: "rojo" },
  cancelado: { texto: "Cancelado", tono: "rojo" },
};

export function SelloEstado({ estado, detalle, recien = false, giro = -6 }: { estado: string; detalle?: string; recien?: boolean; giro?: number }) {
  const anterior = useRef(estado);
  const [vez, setVez] = useState(recien ? 1 : 0);
  useEffect(() => {
    if (anterior.current !== estado) {
      anterior.current = estado;
      setVez((v) => v + 1);
    }
  }, [estado]);

  const s = SELLOS[estado] ?? { texto: estado, tono: "gris" as const };
  return (
    <Sello key={`${estado}-${vez}`} tono={s.tono} giro={giro} grande animar={vez > 0}>
      {s.texto}
      {detalle && <span className="font-normal">· {detalle}</span>}
    </Sello>
  );
}
