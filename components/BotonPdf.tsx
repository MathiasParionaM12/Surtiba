"use client";

import { useState, useTransition } from "react";
import { AvisoForm } from "@/components/AvisoForm";
import type { RespuestaPdf } from "@/lib/acciones-cotizador";
import { botonSecundario } from "@/lib/estilos";

// Guarda la cotización en el servidor (COT-0001) y luego descarga su PDF
export function BotonPdf({ preparar, className = "" }: { preparar: () => Promise<RespuestaPdf>; className?: string }) {
  const [error, setError] = useState<string>();
  const [preparando, iniciar] = useTransition();

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <button
        type="button"
        disabled={preparando}
        onClick={() =>
          iniciar(async () => {
            const r = await preparar();
            setError(r.error);
            // Un enlace de descarga: el navegador baja el archivo y te quedas en esta página
            if (r.id) {
              const enlace = document.createElement("a");
              enlace.href = `/cotizaciones/${r.id}/pdf`;
              enlace.download = "";
              enlace.click();
            }
          })
        }
        className={`${botonSecundario} w-full`}
      >
        {preparando ? "Preparando PDF…" : "Descargar cotización (PDF)"}
      </button>
      <AvisoForm error={error} />
    </div>
  );
}
