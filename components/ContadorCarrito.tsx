"use client";

// Número de productos del carrito en el encabezado. Cuando sube, da un pequeño salto
// (también con "reducir movimiento": es corto y avisa que se agregó algo).
import { useEffect, useRef } from "react";

export function ContadorCarrito({ cantidad }: { cantidad: number }) {
  const numero = useRef<HTMLSpanElement>(null);
  const anterior = useRef(cantidad);

  useEffect(() => {
    if (cantidad > anterior.current) {
      numero.current?.animate(
        [{ transform: "scale(1)" }, { transform: "scale(1.5)", backgroundColor: "rgb(255 255 255 / 0.35)" }, { transform: "scale(1)" }],
        { duration: 550, easing: "cubic-bezier(.2,.8,.2,1)" },
      );
    }
    anterior.current = cantidad;
  }, [cantidad]);

  return (
    <span ref={numero} className="inline-block rounded-sm bg-blanco/15 px-1.5 font-mono text-xs tabular-nums" aria-label={`${cantidad} en el carrito`}>
      {cantidad}
    </span>
  );
}
