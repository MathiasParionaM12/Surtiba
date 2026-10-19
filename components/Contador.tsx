"use client";

import { useLayoutEffect, useRef } from "react";
import { soles } from "@/lib/formato";

const entero = new Intl.NumberFormat("en-US");
const DURACION = 600; // ms: más que los 300 ms de la regla, solo para el contador (aprobado por Mathias)

// Un número grande que sube de 0 a su valor la primera vez que aparece en pantalla.
// El servidor ya manda el valor final (se lee aunque falle JavaScript) y los lectores de
// pantalla leen siempre ese valor, nunca los números intermedios.
export function Contador({ valor, tipo = "entero" }: { valor: number; tipo?: "entero" | "soles" }) {
  const visible = useRef<HTMLSpanElement>(null);
  const formato = (n: number) => (tipo === "soles" ? soles(Math.round(n)) : entero.format(Math.round(n)));
  const final = formato(valor);

  useLayoutEffect(() => {
    const el = visible.current;
    if (!el || valor <= 0) return;
    // Se cambia el mismo nodo de texto que maneja React, para que React lo pueda seguir actualizando
    const poner = (n: number) => {
      if (el.firstChild) el.firstChild.nodeValue = formato(n);
    };
    let cuadro = 0;
    let respaldo = 0;
    // Si en 6 s nunca apareció en pantalla (o el navegador no avisa), se deja el valor final
    const seguro = window.setTimeout(() => {
      observador.disconnect();
      poner(valor);
    }, 6000);

    const contar = () => {
      const inicio = performance.now();
      const paso = (ahora: number) => {
        const t = Math.min(1, (ahora - inicio) / DURACION);
        poner(valor * (1 - Math.pow(1 - t, 3))); // empieza rápido y frena al final
        if (t < 1) cuadro = requestAnimationFrame(paso);
      };
      cuadro = requestAnimationFrame(paso);
      // Por si el navegador no dibuja cuadros (pestaña en segundo plano): igual termina en el valor final
      respaldo = window.setTimeout(() => poner(valor), DURACION + 400);
    };

    poner(0);
    const observador = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((e) => e.isIntersecting)) {
          observador.disconnect();
          clearTimeout(seguro);
          contar();
        }
      },
      { threshold: 0.05 },
    );
    observador.observe(el);

    return () => {
      observador.disconnect();
      cancelAnimationFrame(cuadro);
      clearTimeout(respaldo);
      clearTimeout(seguro);
      poner(valor);
    };
    // formato depende solo de tipo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor, tipo]);

  return (
    <>
      <span className="sr-only">{final}</span>
      <span ref={visible} aria-hidden="true" className="tabular-nums">
        {final}
      </span>
    </>
  );
}
