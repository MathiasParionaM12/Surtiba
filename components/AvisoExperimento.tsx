"use client";

// Aviso de fase experimental (10-nov-2026): sale al agregar algo al carrito, una vez por visita (sesión del navegador).
// Explica que todavía no hay ventas ni pagos reales y que las marcas y productos sí son reales.
// Cualquier botón de "agregar" llama a avisarExperimento(); este componente vive en el layout y abre el aviso.
import { FlaskConical } from "lucide-react";
import { useEffect, useRef } from "react";
import { botonPrimario } from "@/lib/estilos";
import { marcarInicio } from "@/lib/medicion";

const EVENTO = "surtiba:aviso-experimento";
const CLAVE = "surtiba:aviso-experimento-visto";

export function avisarExperimento() {
  marcarInicio(); // lo primero que agrega al carrito también empieza a medir su cotización
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENTO));
}

export function AvisoExperimento({ marcas }: { marcas: string[] }) {
  const dialogo = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const abrir = () => {
      try {
        if (sessionStorage.getItem(CLAVE)) return;
        sessionStorage.setItem(CLAVE, "1");
      } catch {}
      if (!dialogo.current?.open) dialogo.current?.showModal();
    };
    window.addEventListener(EVENTO, abrir);
    return () => window.removeEventListener(EVENTO, abrir);
  }, []);

  const lista = marcas.length > 1 ? `${marcas.slice(0, -1).join(", ")} y ${marcas.at(-1)}` : marcas[0];

  return (
    <dialog
      ref={dialogo}
      aria-labelledby="aviso-experimento-titulo"
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-md border border-linea bg-blanco p-0 text-tinta shadow-xl backdrop:bg-tinta/40"
      onClick={(e) => {
        if (e.target === dialogo.current) dialogo.current?.close(); // tocar fuera cierra
      }}
    >
      <div className="flex flex-col gap-4 p-6">
        <span className="inline-flex size-10 items-center justify-center rounded-md bg-papel">
          <FlaskConical className="size-5 text-verde" aria-hidden="true" />
        </span>
        <h2 id="aviso-experimento-titulo" className="text-xl font-semibold tracking-tight">
          Surtiba está en fase de prueba
        </h2>
        <p className="text-sm leading-relaxed">
          Estamos validando la plataforma con caterings y organizadores de eventos. <strong>Todavía no procesamos ventas ni pagos reales</strong>: puedes
          armar tu carrito, tu pedido y tus cotizaciones para ver cómo funcionaría, sin ningún cobro.
        </p>
        {lista && (
          <p className="border-l-2 border-verde pl-3 text-sm leading-relaxed">
            Las marcas y los productos que ves <strong>sí son reales</strong>: {lista} {marcas.length > 1 ? "son nuestros primeros aliados" : "es nuestro primer aliado"} y publicaron
            sus precios y presentaciones.
          </p>
        )}
        <form method="dialog">
          <button type="submit" autoFocus className={`${botonPrimario} w-full`}>
            Entendido, seguir explorando
          </button>
        </form>
      </div>
    </dialog>
  );
}
