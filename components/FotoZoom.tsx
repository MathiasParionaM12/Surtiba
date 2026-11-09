"use client";

// Foto del producto con zoom (9-nov-2026), para ver los detalles de la etiqueta:
// · Con mouse: al pasar por encima se agranda 2.5× y sigue al cursor (lupa), sin salir de la página.
// · Al tocar o hacer clic: se abre en grande. Ahí un toque acerca en ese punto y mover el dedo o el mouse
//   recorre la foto; otro toque aleja. Se cierra con ✕, con Esc o tocando fuera de la foto.
import { Maximize2, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { CATEGORIAS } from "@/lib/catalogo";

const AUMENTO = 2.5;

// Punto (en %) donde está el puntero dentro de un elemento: desde ahí se agranda la foto
function punto(e: React.PointerEvent<HTMLElement>) {
  const r = e.currentTarget.getBoundingClientRect();
  const x = Math.min(100, Math.max(0, ((e.clientX - r.left) / r.width) * 100));
  const y = Math.min(100, Math.max(0, ((e.clientY - r.top) / r.height) * 100));
  return `${x}% ${y}%`;
}

export function FotoZoom({ foto, nombre, categoria, ml }: { foto: string; nombre: string; categoria: string; ml: number }) {
  const [lupa, setLupa] = useState<string | null>(null); // origen del zoom con mouse (null = sin zoom)
  const [abierta, setAbierta] = useState(false);
  const [acercada, setAcercada] = useState(false);
  const [origen, setOrigen] = useState("50% 50%");
  const dialogo = useRef<HTMLDialogElement>(null);

  // El diálogo nativo se abre como modal: atrapa el foco y se cierra con Esc
  useEffect(() => {
    const d = dialogo.current;
    if (!d) return;
    if (abierta && !d.open) d.showModal();
    if (!abierta && d.open) d.close();
  }, [abierta]);

  const cerrar = () => {
    setAbierta(false);
    setAcercada(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setLupa(null);
          setAbierta(true);
        }}
        onPointerMove={(e) => e.pointerType === "mouse" && setLupa(punto(e))}
        onPointerLeave={() => setLupa(null)}
        aria-label={`Ampliar la foto de ${nombre}`}
        className="group relative block aspect-square w-full cursor-zoom-in overflow-hidden rounded-md border border-linea bg-papel focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-verde"
      >
        <Image
          src={foto}
          alt={nombre}
          fill
          priority
          // En computadora se pide la foto en grande: la lupa la agranda 2.5× y tiene que verse nítida
          sizes="(min-width: 768px) 1280px, 100vw"
          style={{ transformOrigin: lupa ?? "50% 50%", transform: lupa ? `scale(${AUMENTO})` : "scale(1)" }}
          className="object-contain p-3 transition-transform duration-150 ease-out sm:p-4"
        />
        <span className={`absolute bottom-3 left-3 font-mono text-[11px] tracking-[0.12em] text-gris uppercase transition-opacity ${lupa ? "opacity-0" : ""}`}>
          {CATEGORIAS[categoria] ?? categoria}
        </span>
        <span className={`absolute right-3 bottom-3 font-mono text-[11px] text-gris transition-opacity ${lupa ? "opacity-0" : ""}`}>{ml} ml</span>
        <span
          className={`absolute top-3 right-3 inline-flex items-center gap-1 rounded-full border border-linea bg-blanco/90 px-2.5 py-1 text-xs text-tinta transition-opacity ${lupa ? "opacity-0" : ""}`}
          aria-hidden="true"
        >
          <Maximize2 className="size-3.5 text-verde" />
          Ampliar
        </span>
      </button>

      <dialog
        ref={dialogo}
        onClose={cerrar}
        onClick={(e) => e.target === e.currentTarget && cerrar()} // tocar fuera de la foto cierra
        aria-label={`Foto de ${nombre}`}
        className="m-0 h-dvh max-h-none w-screen max-w-none bg-papel p-0 backdrop:bg-tinta/40"
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-linea bg-blanco px-4 py-2 sm:px-6">
            <p className="truncate text-sm font-medium">{nombre}</p>
            <button
              type="button"
              onClick={cerrar}
              aria-label="Cerrar la foto"
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-md hover:bg-papel focus-visible:outline-2 focus-visible:outline-verde"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>
          {abierta && (
            <div
              role="button"
              tabIndex={0}
              aria-label={acercada ? "Alejar" : "Acercar"}
              onClick={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                setOrigen(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`);
                setAcercada((a) => !a);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setOrigen("50% 50%");
                  setAcercada((a) => !a);
                }
              }}
              onPointerMove={(e) => acercada && setOrigen(punto(e))}
              className={`relative flex-1 touch-none overflow-hidden ${acercada ? "cursor-zoom-out" : "cursor-zoom-in"}`}
            >
              <Image
                src={foto}
                alt={nombre}
                fill
                sizes="100vw"
                style={{ transformOrigin: origen, transform: acercada ? `scale(${AUMENTO})` : "scale(1)" }}
                className="object-contain p-4 transition-transform duration-200 ease-out sm:p-8"
              />
            </div>
          )}
          <p className="bg-blanco px-4 py-2 text-center text-xs text-gris">
            {acercada ? "Mueve el dedo o el mouse para recorrer la foto. Toca otra vez para alejar." : "Toca la foto para acercar."}
          </p>
        </div>
      </dialog>
    </>
  );
}
