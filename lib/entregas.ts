// Entregas solo martes y jueves (6-nov-2026, supabase/sql/41_entregas_martes_jueves.sql).
// El comprador no elige la fecha: Surtiba le asigna la ÚLTIMA entrega antes de su evento; sin evento (o si
// marca "lo antes posible"), la MÁS CERCANA. Hay que pedir con anticipación (2 días). El recojo es la víspera.
// Esto es solo para MOSTRARLO antes de pagar: la fecha que vale la pone crear_pedido en la base, con la misma regla.
// Sirve en el navegador y en el servidor; la configuración se carga en lib/entregas-config.ts (solo servidor).

export type ConfigEntregas = { dias: number[]; corteDias: number }; // dias: 1 = lunes … 7 = domingo

export const NOMBRE_DIA = ["", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];

// Fechas AAAA-MM-DD a mediodía UTC: así sumar días no cambia de fecha por la zona horaria
const aFecha = (f: string) => new Date(`${f}T12:00:00Z`);
const aTexto = (d: Date) => d.toISOString().slice(0, 10);
export function sumarDias(f: string, n: number) {
  const d = aFecha(f);
  d.setUTCDate(d.getUTCDate() + n);
  return aTexto(d);
}
export const diaSemana = (f: string) => aFecha(f).getUTCDay() || 7; // 1 = lunes … 7 = domingo
// Días de "desde" a "hasta" (AAAA-MM-DD)
export const diasEntre = (desde: string, hasta: string) => Math.round((aFecha(hasta).getTime() - aFecha(desde).getTime()) / 86400000);

// La misma regla que privado.entrega_asignada. Devuelve null si no se llega antes del evento.
export function entregaAsignada(minimo: string, evento: string | null, loAntes: boolean, cfg: ConfigEntregas) {
  let primera: string | null = null;
  for (let i = 0; i < 14; i++) {
    const d = sumarDias(minimo, i);
    if (cfg.dias.includes(diaSemana(d))) {
      primera = d;
      break;
    }
  }
  if (!primera) return null;
  if (!evento || loAntes) return primera;
  if (primera >= evento) return null;
  for (let d = sumarDias(evento, -1); d > primera; d = sumarDias(d, -1)) {
    if (cfg.dias.includes(diaSemana(d))) return d;
  }
  return primera;
}

// "martes y jueves"
export function textoDias(cfg: ConfigEntregas) {
  const nombres = [...cfg.dias].sort().map((d) => NOMBRE_DIA[d]);
  return nombres.length > 1 ? `${nombres.slice(0, -1).join(", ")} y ${nombres.at(-1)}` : (nombres[0] ?? "");
}

// "jueves 13 de noviembre"
export function fechaLarga(f: string) {
  return new Intl.DateTimeFormat("es-PE", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(aFecha(f));
}
