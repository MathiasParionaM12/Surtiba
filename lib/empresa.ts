// Datos de Surtiba como proveedor (condiciones, privacidad y Libro de Reclamaciones).
// Es un prototipo del curso: todavía no hay razón social, RUC, dirección ni correo de contacto.
// Nunca inventarlos: cuando existan, se llenan aquí y aparecen en todas las páginas.
export const EMPRESA = {
  nombre: "Surtiba",
  estado: "Prototipo del curso (UTEC)",
  razonSocial: null as string | null,
  ruc: null as string | null,
  direccion: null as string | null,
  correo: null as string | null,
  ciudad: "Lima, Perú",
};

export const SIN_DATO = "Por definir (prototipo)";

// Plazo para responder un reclamo o queja (D.S. 011-2011-PCM, modificado por el D.S. 101-2022-PCM)
export const DIAS_HABILES_RESPUESTA = 15;

// Fecha de la última versión de las condiciones y la política de privacidad
export const ACTUALIZADO = "22 de octubre de 2026";
