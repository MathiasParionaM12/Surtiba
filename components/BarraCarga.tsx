"use client";

// Barra fina arriba mientras se abre otra pantalla. Empieza al hacer clic en un enlace
// interno y termina cuando cambia la dirección. Los estilos están en globals.css (.barra-carga).
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

export function BarraCarga() {
  const barra = useRef<HTMLDivElement>(null);
  const ruta = usePathname();
  const parametros = useSearchParams();

  // Empieza: clic normal en un enlace de Surtiba que lleva a otra dirección
  useEffect(() => {
    let seguro: ReturnType<typeof setTimeout>;
    const alHacerClic = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const enlace = (e.target as HTMLElement).closest("a");
      if (!enlace || enlace.target === "_blank" || enlace.hasAttribute("download")) return;
      const destino = new URL(enlace.href, location.href);
      if (destino.origin !== location.origin) return;
      if (destino.pathname === location.pathname && destino.search === location.search) return;
      if (barra.current) barra.current.dataset.estado = "cargando";
      // Por si la página no cambia (por ejemplo, un error): se apaga sola
      clearTimeout(seguro);
      seguro = setTimeout(() => {
        if (barra.current?.dataset.estado === "cargando") barra.current.dataset.estado = "listo";
      }, 10000);
    };
    document.addEventListener("click", alHacerClic, true);
    return () => {
      document.removeEventListener("click", alHacerClic, true);
      clearTimeout(seguro);
    };
  }, []);

  // Termina: cambió la dirección
  useEffect(() => {
    const el = barra.current;
    if (el?.dataset.estado !== "cargando") return;
    el.dataset.estado = "listo";
    const fin = setTimeout(() => {
      if (el.dataset.estado === "listo") el.dataset.estado = "";
    }, 500);
    return () => clearTimeout(fin);
  }, [ruta, parametros]);

  return <div ref={barra} aria-hidden="true" className="barra-carga fixed inset-x-0 top-0 z-50 h-0.5 bg-verde" />;
}
