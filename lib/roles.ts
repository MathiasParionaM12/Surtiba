// Roles y a qué pantalla va cada uno al ingresar.
// "solicitante": se registró con "Quiero vender" y espera que el admin apruebe su marca.
export type Rol = "comprador" | "marca" | "admin" | "solicitante";

export const NOMBRE_ROL: Record<Rol, string> = {
  comprador: "Comprador",
  marca: "Marca",
  admin: "Admin Surtiba",
  solicitante: "Marca en revisión",
};

export function rutaInicio(rol: Rol) {
  if (rol === "marca") return "/marca";
  if (rol === "admin") return "/admin";
  if (rol === "solicitante") return "/solicitud";
  return "/catalogo";
}
