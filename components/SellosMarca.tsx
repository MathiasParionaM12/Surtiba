// Sellos de confianza y estrellas de una marca (8-nov-2026). Solo totales: nunca datos del comprador.
// compacto: para tarjetas y listas (solo lo que tiene); completo: para la página de la marca (explica cada sello).
import { BadgeCheck, Sparkles, Star, Zap } from "lucide-react";
import { MINIMO_CALIFICACIONES, type Reputacion } from "@/lib/marcas-publicas";

const decimal = new Intl.NumberFormat("es-PE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

// Estrellas de solo lectura: llenas, media y vacías según el promedio
export function Estrellas({ valor, className = "size-4" }: { valor: number; className?: string }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((n) => {
        const lleno = Math.max(0, Math.min(1, valor - (n - 1))); // 0, parcial o 1
        return (
          <span key={n} className="relative inline-flex">
            <Star className={`${className} text-linea`} fill="currentColor" strokeWidth={0} />
            {lleno > 0 && (
              <span className="absolute inset-0 overflow-hidden" style={{ width: `${lleno * 100}%` }}>
                <Star className={`${className} text-tinta`} fill="currentColor" strokeWidth={0} />
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}

export function Calificacion({ r, compacto = false }: { r: Reputacion; compacto?: boolean }) {
  if (r.promedio === null || r.calificaciones < MINIMO_CALIFICACIONES) {
    return compacto ? null : <span className="text-sm text-gris">Sin calificaciones aún</span>;
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <Estrellas valor={r.promedio} className={compacto ? "size-3.5" : "size-4"} />
      <span className="font-mono font-medium">{decimal.format(r.promedio)}</span>
      <span className="text-gris">
        ({r.calificaciones} {r.calificaciones === 1 ? "calificación" : "calificaciones"})
      </span>
      <span className="sr-only">{`${decimal.format(r.promedio)} de 5 estrellas`}</span>
    </span>
  );
}

const SELLOS = [
  { clave: "verificada", icono: BadgeCheck, texto: "Marca verificada", ayuda: "Surtiba revisó su RUC y su registro sanitario." },
  { clave: "rapida", icono: Zap, texto: "Responde rápido", ayuda: "Deja lista su orden en menos de 24 horas." },
  { clave: "nueva", icono: Sparkles, texto: "Nueva en Surtiba", ayuda: "Llegó a Surtiba hace menos de 30 días." },
] as const;

export function SellosMarca({ r, compacto = false }: { r: Reputacion; compacto?: boolean }) {
  const activos = SELLOS.filter((s) => r[s.clave]);
  if (activos.length === 0 && compacto) return null;
  return (
    <ul className={`flex flex-wrap gap-1.5 ${compacto ? "" : "gap-2"}`} aria-label="Sellos de confianza">
      {activos.map((s) => (
        <li
          key={s.clave}
          title={s.ayuda}
          className={`inline-flex items-center gap-1 rounded-full border border-linea bg-blanco text-tinta ${compacto ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs"}`}
        >
          <s.icono className={`${compacto ? "size-3" : "size-3.5"} text-verde`} aria-hidden="true" />
          {s.texto}
        </li>
      ))}
    </ul>
  );
}
