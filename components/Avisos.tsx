"use client";

// Avisos flotantes ("toasts") de toda la app, con los colores de docs/marca.md.
// Se usan con toast.success("…") desde cualquier componente del navegador.
import { CircleAlert, CircleCheck } from "lucide-react";
import { Toaster } from "sonner";

export function Avisos() {
  return (
    <Toaster
      position="bottom-right"
      // En celular, sobre la barra fija del cotizador
      mobileOffset={{ bottom: 88 }}
      duration={4000}
      icons={{
        success: <CircleCheck className="size-5 text-verde" aria-hidden="true" />,
        error: <CircleAlert className="size-5 text-rojo" aria-hidden="true" />,
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "flex w-full items-start gap-3 rounded-md border border-linea bg-blanco px-4 py-3 font-sans text-sm text-tinta shadow-lg shadow-tinta/10 sm:w-[356px]",
          success: "border-l-4 border-l-verde",
          error: "border-l-4 border-l-rojo",
          title: "font-medium leading-snug",
          description: "mt-0.5 text-xs text-gris",
          icon: "mt-px shrink-0",
        },
      }}
    />
  );
}
