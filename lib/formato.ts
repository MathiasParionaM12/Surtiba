// Formatos de la interfaz (docs/marca.md y CLAUDE.md).

const numeroSoles = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// El dinero se guarda en céntimos: 123450 -> "S/ 1,234.50"
export function soles(centimos: number) {
  return `S/ ${numeroSoles.format(centimos / 100)}`;
}

// Fechas en español de Perú, hora de Lima: "13 oct. 2026"
const formatoFecha = new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Lima" });

export function fecha(valor: string) {
  // Las fechas sin hora (2026-10-20) se leen al mediodía para que no cambien de día por la zona horaria
  const d = valor.length === 10 ? new Date(`${valor}T12:00:00Z`) : new Date(valor);
  return formatoFecha.format(d);
}

// Mañana en Lima, en formato AAAA-MM-DD (para el mínimo del calendario de entrega)
export function mananaEnLima() {
  const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" }).format(new Date());
  const d = new Date(`${hoy}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}
