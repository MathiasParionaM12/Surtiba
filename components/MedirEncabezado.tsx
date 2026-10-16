"use client";

// Guarda la altura del encabezado en la variable CSS --alto-encabezado, para que las barras
// fijas (como los filtros del catálogo) queden justo debajo, en celular y en computadora.
import { useEffect, useRef } from "react";

export function MedirEncabezado() {
  const marca = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const encabezado = marca.current?.closest("header");
    if (!encabezado) return;
    const medir = () => document.documentElement.style.setProperty("--alto-encabezado", `${encabezado.offsetHeight}px`);
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(encabezado);
    return () => observador.disconnect();
  }, []);

  return <span ref={marca} hidden />;
}
