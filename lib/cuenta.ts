// Reglas de la cuenta que comparten el registro y "Mi perfil".

export const TIPOS_NEGOCIO = [
  { valor: "catering", texto: "Catering" },
  { valor: "organizador_eventos", texto: "Organizador de eventos" },
  { valor: "wedding_planner", texto: "Wedding planner" },
  { valor: "bar_restaurante", texto: "Bar o restaurante" },
  { valor: "otro", texto: "Otro" },
];

// La misma regla que Supabase Auth (Authentication → Sign In / Providers → Email): mínimo 8 caracteres,
// con letras y números. Supabase la vuelve a revisar aunque alguien llame a su API directo.
export function revisarClave(password: string) {
  if (password.length < 8) return "La contraseña debe tener al menos 8 caracteres.";
  if (password.length > 72) return "La contraseña puede tener como máximo 72 caracteres.";
  if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) return "La contraseña debe tener letras y números.";
  return null;
}
