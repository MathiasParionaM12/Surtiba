"use client";

// "Descargar cotización (PDF)" del carrito (10-nov-2026): mide el tiempo para armar la cotización (lib/medicion.ts)
// y, una vez guardada, pide la opinión del comprador. Es por donde terminan la mayoría: cotizador → carrito → PDF.
import { useState } from "react";
import { BotonPdf } from "@/components/BotonPdf";
import { Retroalimentacion } from "@/components/Retroalimentacion";
import { cotizacionDelCarrito } from "@/lib/acciones-cotizador";
import { segundosDesdeInicio } from "@/lib/medicion";

export function PdfCarrito() {
  const [guardada, setGuardada] = useState<string>();
  return (
    <>
      <BotonPdf preparar={() => cotizacionDelCarrito(segundosDesdeInicio())} alGuardar={(_codigo, id) => setGuardada(id)} className="mt-3" />
      {guardada && (
        <div className="mt-4">
          <Retroalimentacion cotizacionId={guardada} />
        </div>
      )}
    </>
  );
}
