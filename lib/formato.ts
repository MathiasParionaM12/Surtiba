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

// Primer instante del mes actual en Lima (Perú no cambia de hora: siempre UTC-5)
export function inicioMesLima() {
  const [anio, mes] = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit" })
    .format(new Date())
    .split("-");
  return `${anio}-${mes}-01T00:00:00-05:00`;
}

// Nombre del mes actual: "octubre"
export function mesActual() {
  // En español los meses van en minúscula a mitad de frase
  return new Intl.DateTimeFormat("es-PE", { timeZone: "America/Lima", month: "long" }).format(new Date()).toLowerCase();
}

// Hoy en Lima, en formato AAAA-MM-DD
export function hoyEnLima() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" }).format(new Date());
}

// Fecha y hora de hace n días, en formato ISO (para consultas como "lo entregado en las últimas 4 semanas")
export function haceDias(n: number) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
}
