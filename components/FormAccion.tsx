"use client";

import { useActionState } from "react";
import { AvisoForm } from "@/components/AvisoForm";
import type { EstadoForm } from "@/lib/acciones-auth";
import { botonPrimario, botonSecundario } from "@/lib/estilos";

// Formulario pequeño para una acción del panel: datos ocultos (ej. el id), campos extra
// opcionales (children: fecha, motivo, método) y un botón. Muestra el error o el éxito debajo.
export function FormAccion({
  accion,
  ocultos,
  texto,
  textoEnviando = "Guardando…",
  variante = "primario",
  children,
  className = "",
}: {
  accion: (estado: EstadoForm, form: FormData) => Promise<EstadoForm>;
  ocultos: Record<string, string>;
  texto: string;
  textoEnviando?: string;
  variante?: "primario" | "secundario";
  children?: React.ReactNode;
  className?: string;
}) {
  const [estado, enviar, enviando] = useActionState<EstadoForm, FormData>(accion, {});

  return (
    <form action={enviar} className={`flex flex-col gap-2 ${className}`}>
      {Object.entries(ocultos).map(([nombre, valor]) => (
        <input key={nombre} type="hidden" name={nombre} value={valor} />
      ))}
      <div className="flex flex-wrap items-end gap-2">
        {children}
        <button
          type="submit"
          disabled={enviando}
          className={`${variante === "primario" ? botonPrimario : botonSecundario} h-10 px-4`}
        >
          {enviando ? textoEnviando : texto}
        </button>
      </div>
      <div className="empty:hidden">
        <AvisoForm error={estado.error} mensaje={estado.mensaje} />
      </div>
    </form>
  );
}
