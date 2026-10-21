"use client";

// Campana de avisos del encabezado: el número de avisos nuevos y, al tocarla, la lista.
// Al abrirla se marcan como leídos (los nuevos se siguen viendo resaltados mientras está abierta).
import { Bell } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { marcarAvisosLeidos } from "@/lib/acciones-avisos";
import { botonSecundario, sello } from "@/lib/estilos";

export type Aviso = { id: string; texto: string; enlace: string | null; leido: boolean; creado_en: string };

const relativo = new Intl.RelativeTimeFormat("es-PE", { numeric: "auto" });
// "hace 5 minutos", "ayer"… (se calcula al abrir, en el navegador)
function haceCuanto(iso: string) {
  const min = Math.round((new Date(iso).getTime() - Date.now()) / 60000);
  if (Math.abs(min) < 60) return relativo.format(min, "minute");
  const horas = Math.round(min / 60);
  if (Math.abs(horas) < 24) return relativo.format(horas, "hour");
  return relativo.format(Math.round(horas / 24), "day");
}

export function Campana({ avisos, sinLeer }: { avisos: Aviso[]; sinLeer: number }) {
  const [abierta, setAbierta] = useState(false);
  const [nuevos, setNuevos] = useState<Set<string>>(new Set()); // los que eran nuevos al abrir
  const caja = useRef<HTMLDivElement>(null);

  // Se cierra al tocar fuera o con Escape
  useEffect(() => {
    if (!abierta) return;
    const fuera = (e: MouseEvent) => !caja.current?.contains(e.target as Node) && setAbierta(false);
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && setAbierta(false);
    document.addEventListener("mousedown", fuera);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("keydown", tecla);
    };
  }, [abierta]);

  const abrir = () => {
    if (!abierta) {
      setNuevos(new Set(avisos.filter((a) => !a.leido).map((a) => a.id)));
      if (sinLeer > 0) void marcarAvisosLeidos();
    }
    setAbierta(!abierta);
  };

  return (
    <div ref={caja} className="relative">
      <button
        type="button"
        onClick={abrir}
        aria-expanded={abierta}
        aria-label={sinLeer > 0 ? `Avisos: ${sinLeer} nuevos` : "Avisos"}
        className={`${botonSecundario} relative h-10 px-3`}
      >
        <Bell className="size-4" aria-hidden="true" />
        {sinLeer > 0 && (
          // Se estampa cada vez que cambia el número
          <span
            key={sinLeer}
            style={{ "--giro": "0deg" } as React.CSSProperties}
            className="estampa absolute -top-1.5 -right-1.5 flex min-w-5 items-center justify-center rounded-full bg-tinta px-1 font-mono text-[11px] leading-5 text-blanco"
          >
            {sinLeer > 9 ? "9+" : sinLeer}
          </span>
        )}
      </button>

      {/* En celular va fija bajo el encabezado y a todo el ancho; en computadora, debajo de la campana */}
      {abierta && (
        <div className="entrada fixed inset-x-4 top-[calc(var(--alto-encabezado)+0.5rem)] z-30 overflow-hidden sm:absolute sm:inset-x-auto sm:top-auto sm:right-0 sm:mt-2 sm:w-80 rounded-md border border-linea bg-blanco shadow-lg shadow-tinta/10">
          <p className={`${sello} border-b border-linea px-4 py-3`}>Avisos</p>
          {avisos.length === 0 ? (
            <p className="px-4 py-6 text-sm text-gris">Aún no tienes avisos. Aquí te contamos cuando cambie un pedido.</p>
          ) : (
            <ul className="max-h-96 divide-y divide-linea overflow-y-auto">
              {avisos.map((a) => {
                const contenido = (
                  <>
                    <span className="flex items-start gap-2">
                      {nuevos.has(a.id) && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-verde" aria-label="Nuevo" />}
                      <span className={nuevos.has(a.id) ? "font-medium" : ""}>{a.texto}</span>
                    </span>
                    <span className="mt-1 block text-xs text-gris">{haceCuanto(a.creado_en)}</span>
                  </>
                );
                return (
                  <li key={a.id}>
                    {a.enlace ? (
                      <Link href={a.enlace} onClick={() => setAbierta(false)} className="block px-4 py-3 text-sm hover:bg-papel">
                        {contenido}
                      </Link>
                    ) : (
                      <div className="px-4 py-3 text-sm">{contenido}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
