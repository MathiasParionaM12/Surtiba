// Celulares: solo Perú (+51). Se guardan en formato internacional: +51987654321.
// Antes había un selector de 11 países; se quitó el 5-nov-2026 porque Surtiba atiende solo en Lima.

export const PREFIJO_PERU = "+51";
export const ERROR_CELULAR = "Escribe un celular peruano de 9 dígitos que empiece con 9. Ejemplo: 987654321.";

// Lo que escribe la persona, sin espacios ni guiones (y sin el +51 si lo pegó)
export function limpiarCelular(texto: string) {
  const solo = texto.replace(/[\s-]/g, "");
  return solo.startsWith(PREFIJO_PERU) ? solo.slice(PREFIJO_PERU.length) : solo;
}

// 9 dígitos que empiezan con 9
export function celularValido(numero: string) {
  return /^9\d{8}$/.test(numero);
}

// "+51987654321" -> "987654321" (para llenar el campo). Si era de otro país, queda vacío para que lo corrija.
export function numeroLocal(telefono: string | null | undefined) {
  if (!telefono?.startsWith(PREFIJO_PERU)) return "";
  return telefono.slice(PREFIJO_PERU.length);
}
