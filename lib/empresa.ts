// Datos de Surtiba como proveedor (condiciones, privacidad y Libro de Reclamaciones).
// Es un prototipo del curso: todavía no hay razón social, RUC, dirección ni correo de contacto.
// El WhatsApp de atención lo dio Mathias el 8-nov-2026.
// Nunca inventarlos: cuando existan, se llenan aquí y aparecen en todas las páginas.
export const EMPRESA = {
  nombre: "Surtiba",
  estado: "Prototipo del curso (UTEC)",
  razonSocial: null as string | null,
  ruc: null as string | null,
  direccion: null as string | null,
  correo: null as string | null,
  whatsapp: "51981139761", // con el código de Perú, para el enlace de WhatsApp
  whatsappVisible: "981 139 761",
  ciudad: "Lima, Perú",
  // Dirección pública del sitio (mapa del sitio y robots.txt). Cuando compren surtiba.com, se cambia solo aquí
  // y luego se verifica en Google Search Console.
  sitio: "https://surtiba.vercel.app",
};

export const SIN_DATO = "Por definir (prototipo)";

// Enlace para abrir el chat de WhatsApp de Surtiba, con un saludo genérico (sin datos personales)
export function enlaceWhatsapp() {
  return `https://wa.me/${EMPRESA.whatsapp}?text=${encodeURIComponent("Hola, Surtiba. Tengo una consulta.")}`;
}

// Plazo para responder un reclamo o queja (D.S. 011-2011-PCM, modificado por el D.S. 101-2022-PCM)
export const DIAS_HABILES_RESPUESTA = 15;

// Fecha de la última versión de las condiciones y la política de privacidad
export const ACTUALIZADO = "22 de octubre de 2026";
