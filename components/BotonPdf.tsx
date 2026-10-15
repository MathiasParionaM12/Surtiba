"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { AvisoForm } from "@/components/AvisoForm";
import type { RespuestaPdf } from "@/lib/acciones-cotizador";
import { botonSecundario } from "@/lib/estilos";

// Guarda la cotización en el servidor (COT-0001) y luego descarga su PDF
export function BotonPdf({
  preparar,
  className = "",
  texto = "Descargar cotización (PDF)",
}: {
  preparar: () => Promise<RespuestaPdf>;
  className?: string;
  texto?: string;
}) {
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
              toast.success("Cotización guardada. Se está descargando el PDF.");
              const enlace = document.createElement("a");
              enlace.href = `/cotizaciones/${r.id}/pdf`;
              enlace.download = "";
              enlace.click();
            }
          })
        }
        className={`${botonSecundario} w-full`}
      >
        {preparando ? "Preparando PDF…" : texto}
      </button>
      <AvisoForm error={error} />
    </div>
  );
}
