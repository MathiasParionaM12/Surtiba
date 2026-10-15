"use client";

// Mensaje de un formulario.
// - Error: se queda junto al formulario, con borde rojo apagado (el rojo nunca va de fondo).
// - Éxito: aparece como aviso flotante y se va solo. Con "fijo", se queda junto al formulario
//   (para instrucciones que hay que leer con calma, como "revisa tu correo").
import { useEffect } from "react";
import { toast } from "sonner";
import type { EstadoForm } from "@/lib/acciones-auth";

export function AvisoForm({
  estado,
  error = estado?.error,
  mensaje = estado?.mensaje,
  fijo = false,
}: {
  estado?: EstadoForm; // si se pasa, cada envío con éxito muestra su aviso (aunque el texto se repita)
  error?: string;
  mensaje?: string;
  fijo?: boolean;
}) {
  useEffect(() => {
    if (mensaje && !error && !fijo) toast.success(mensaje);
  }, [estado, mensaje, error, fijo]);

  if (error) {
    return (
      <p role="alert" className="border-l-2 border-rojo pl-3 text-sm">
        {error}
      </p>
    );
  }
  if (mensaje && fijo) {
    return (
      <p role="status" className="border-l-2 border-verde pl-3 text-sm">
        {mensaje}
      </p>
    );
  }
  return null;
}
