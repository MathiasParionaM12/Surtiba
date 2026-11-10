// Medición del experimento (10-nov-2026), en el navegador: cuándo empezó a armar su cotización.
// Empieza al abrir el cotizador o al agregar lo primero al carrito (lo que pase antes) y vale 6 horas.
// Al bajar un PDF (en el cotizador o en el carrito) se calcula cuántos segundos pasaron.
// Si el navegador no deja guardar, no se mide y todo funciona igual.
const CLAVE = "surtiba:inicio-cotizacion";
const VIGENCIA_MS = 6 * 3600 * 1000;

function leer() {
  try {
    const t = Number(localStorage.getItem(CLAVE));
    return t > 0 && Date.now() - t < VIGENCIA_MS ? t : null;
  } catch {
    return null;
  }
}

export function marcarInicio() {
  if (typeof window === "undefined" || leer()) return;
  try {
    localStorage.setItem(CLAVE, String(Date.now()));
  } catch {}
}

export function segundosDesdeInicio() {
  const t = typeof window === "undefined" ? null : leer();
  return t ? Math.min(86400, Math.round((Date.now() - t) / 1000)) : undefined;
}
