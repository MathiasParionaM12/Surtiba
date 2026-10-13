// Roles y a qué pantalla va cada uno al ingresar.
export type Rol = "comprador" | "marca" | "admin";

export const NOMBRE_ROL: Record<Rol, string> = {
  comprador: "Comprador",
  marca: "Marca",
  admin: "Admin Surtiba",
};

export function rutaInicio(rol: Rol) {
  if (rol === "marca") return "/marca";
  if (rol === "admin") return "/admin";
  return "/catalogo";
}
