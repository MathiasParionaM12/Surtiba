"use server";

// Libro de Reclamaciones: registrar una hoja (cualquiera, con o sin cuenta) y responderla (solo el admin).
// Se revisa aquí y otra vez en la base (registrar_reclamo y los CHECK de la tabla reclamos).

import { revalidatePath } from "next/cache";
import type { EstadoForm } from "@/lib/acciones-auth";
import { exigirRol } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";

export type Hoja = {
  codigo: string;
  creado_en: string;
  fecha_limite: string;
  tipo: string;
  nombre: string;
  tipo_documento: string;
  numero_documento: string;
  domicilio: string;
  telefono: string;
  correo: string;
  bien: string;
  pedido_codigo: string;
  monto: string;
  descripcion_bien: string;
  detalle: string;
  pedido: string;
};

export type EstadoReclamo = EstadoForm & { hoja?: Hoja };

const DOCUMENTOS: Record<string, { patron: RegExp; error: string }> = {
  DNI: { patron: /^\d{8}$/, error: "El DNI tiene 8 dígitos." },
  CE: { patron: /^[A-Z0-9]{9,12}$/, error: "El carné de extranjería tiene de 9 a 12 letras o números." },
  Pasaporte: { patron: /^[A-Z0-9]{6,12}$/, error: "El pasaporte tiene de 6 a 12 letras o números." },
  RUC: { patron: /^(10|15|17|20)\d{9}$/, error: "El RUC tiene 11 dígitos y empieza con 10, 15, 17 o 20." },
};

export async function registrarReclamo(_estado: EstadoReclamo, form: FormData): Promise<EstadoReclamo> {
  const leer = (campo: string) => String(form.get(campo) ?? "").trim();
  const valores = {
    tipo: leer("tipo"),
    nombre: leer("nombre"),
    tipo_documento: leer("tipo_documento"),
    numero_documento: leer("numero_documento").replace(/[\s-]/g, "").toUpperCase(),
    domicilio: leer("domicilio"),
    telefono: leer("telefono").replace(/[\s-]/g, ""),
    correo: leer("correo").toLowerCase(),
    bien: leer("bien"),
    pedido_codigo: leer("pedido_codigo").toUpperCase(),
    monto: leer("monto").replace(/,/g, ""),
    descripcion_bien: leer("descripcion_bien"),
    detalle: leer("detalle"),
    pedido: leer("pedido"),
    acepto: leer("acepto"),
  };
  const v = valores;

  if (v.tipo !== "reclamo" && v.tipo !== "queja") return { error: "Elige si es un reclamo o una queja.", valores };
  if (v.nombre.length < 3 || v.nombre.length > 120) return { error: "Escribe tu nombre completo.", valores };
  const documento = DOCUMENTOS[v.tipo_documento];
  if (!documento) return { error: "Elige el tipo de documento.", valores };
  if (!documento.patron.test(v.numero_documento)) return { error: documento.error, valores };
  if (v.domicilio.length < 5 || v.domicilio.length > 200) return { error: "Escribe tu domicilio.", valores };
  if (v.telefono && !/^\+?\d{6,15}$/.test(v.telefono)) return { error: "Escribe el teléfono solo con números.", valores };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.correo) || v.correo.length > 120) {
    return { error: "Escribe un correo válido: ahí te enviaríamos la respuesta.", valores };
  }
  if (v.bien !== "producto" && v.bien !== "servicio") return { error: "Elige si es sobre un producto o un servicio.", valores };
  if (v.pedido_codigo && !/^SUR-\d{4,}$/.test(v.pedido_codigo)) {
    return { error: "El código de pedido es como SUR-0019. Si no lo tienes, déjalo vacío.", valores };
  }
  let montoCentimos: number | null = null;
  if (v.monto) {
    if (!/^\d{1,7}(\.\d{1,2})?$/.test(v.monto)) return { error: "Escribe el monto en soles, por ejemplo 1250.50.", valores };
    montoCentimos = Math.round(Number(v.monto) * 100);
  }
  if (v.descripcion_bien.length < 3 || v.descripcion_bien.length > 300) {
    return { error: "Cuéntanos qué producto o servicio fue (por ejemplo, el nombre del producto).", valores };
  }
  if (v.detalle.length < 10 || v.detalle.length > 2000) return { error: "Cuéntanos qué pasó (al menos 10 letras).", valores };
  if (v.pedido.length < 5 || v.pedido.length > 1000) return { error: "Cuéntanos qué te gustaría que hagamos.", valores };
  if (v.acepto !== "si") return { error: "Confirma que los datos son correctos.", valores };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("registrar_reclamo", {
    p_tipo: v.tipo,
    p_nombre: v.nombre,
    p_tipo_documento: v.tipo_documento,
    p_numero_documento: v.numero_documento,
    p_domicilio: v.domicilio,
    p_telefono: v.telefono || null,
    p_correo: v.correo,
    p_bien: v.bien,
    p_pedido_codigo: v.pedido_codigo || null,
    p_monto_centimos: montoCentimos,
    p_descripcion_bien: v.descripcion_bien,
    p_detalle: v.detalle,
    p_pedido: v.pedido,
  });
  if (error || !data) {
    // P0001 = mensaje escrito por nosotros en registrar_reclamo (ya está en español)
    return { error: error?.code === "P0001" ? error.message : "No pudimos registrar tu hoja. Intenta de nuevo en unos minutos.", valores };
  }

  const r = data as { codigo: string; creado_en: string; fecha_limite: string };
  revalidatePath("/libro-de-reclamaciones");
  return {
    mensaje: `Registramos tu hoja ${r.codigo}.`,
    hoja: { ...v, codigo: r.codigo, creado_en: r.creado_en, fecha_limite: r.fecha_limite },
  };
}

export async function responderReclamo(_estado: EstadoForm, form: FormData): Promise<EstadoForm> {
  await exigirRol("admin");
  const id = String(form.get("reclamo_id") ?? "");
  const respuesta = String(form.get("respuesta") ?? "").trim();
  if (respuesta.length < 10 || respuesta.length > 2000) return { error: "Escribe la respuesta (al menos 10 letras)." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_responder_reclamo", { p_reclamo: id, p_respuesta: respuesta });
  if (error) return { error: error.code === "P0001" ? error.message : "No pudimos guardar la respuesta. Intenta de nuevo." };
  revalidatePath("/admin/reclamos");
  return { mensaje: "Respuesta guardada." };
}
