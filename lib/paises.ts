// Prefijos para el WhatsApp. Perú va primero y es el valor por defecto.
export const PAISES = [
  { codigo: "PE", prefijo: "+51", nombre: "Perú" },
  { codigo: "AR", prefijo: "+54", nombre: "Argentina" },
  { codigo: "BO", prefijo: "+591", nombre: "Bolivia" },
  { codigo: "BR", prefijo: "+55", nombre: "Brasil" },
  { codigo: "CL", prefijo: "+56", nombre: "Chile" },
  { codigo: "CO", prefijo: "+57", nombre: "Colombia" },
  { codigo: "EC", prefijo: "+593", nombre: "Ecuador" },
  { codigo: "ES", prefijo: "+34", nombre: "España" },
  { codigo: "US", prefijo: "+1", nombre: "Estados Unidos" },
  { codigo: "MX", prefijo: "+52", nombre: "México" },
  { codigo: "VE", prefijo: "+58", nombre: "Venezuela" },
] as const;

export const PREFIJO_PERU = "+51";

// "+51987654321" -> { prefijo: "+51", numero: "987654321" } (usa el prefijo más largo que coincida)
export function separarTelefono(telefono: string | null | undefined) {
  if (!telefono) return { prefijo: PREFIJO_PERU, numero: "" };
  const pais = [...PAISES].sort((a, b) => b.prefijo.length - a.prefijo.length).find((p) => telefono.startsWith(p.prefijo));
  if (!pais) return { prefijo: PREFIJO_PERU, numero: telefono.replace(/\D/g, "") };
  return { prefijo: pais.prefijo, numero: telefono.slice(pais.prefijo.length) };
}

// Valida un número sin prefijo. Perú: 9 dígitos que empiezan con 9. Otros países: 6 a 14 dígitos.
export function telefonoValido(prefijo: string, numero: string) {
  if (!PAISES.some((p) => p.prefijo === prefijo)) return false;
  return prefijo === PREFIJO_PERU ? /^9\d{8}$/.test(numero) : /^\d{6,14}$/.test(numero);
}
