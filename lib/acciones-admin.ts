"use server";

// Acciones del panel del admin (equipo Surtiba). Cada una llama a una función de la base de
// datos que revisa que quien la usa sea admin y que el cambio de estado sea válido.

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import type { EstadoForm } from "@/lib/acciones-auth";
import { COMISION_PCT, esUuid } from "@/lib/catalogo";
import { enUnAnioEnLima, fechaEnRango } from "@/lib/formato";
import { exigirRol } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";

type Resultado = { error: { code?: string; message: string } | null };

// Llama a la función, traduce el error y refresca las pantallas
// etiqueta: caché pública que también hay que renovar ("catalogo", "cotizador" o "envio")
async function ejecutar(llamada: PromiseLike<Resultado>, exito: string, etiqueta?: "catalogo" | "cotizador" | "envio"): Promise<EstadoForm> {
  const { error } = await llamada;
  if (error) {
    return { error: error.code === "P0001" ? error.message : "No pudimos guardar el cambio. Intenta de nuevo." };
  }
  if (etiqueta) updateTag(etiqueta);
  revalidatePath("/", "layout");
  return { mensaje: exito };
}

function id(form: FormData, campo: string) {
  const valor = String(form.get(campo) ?? "");
  return esUuid(valor) ? valor : null;
}

function texto(form: FormData, campo: string) {
  return String(form.get(campo) ?? "").trim();
}

// ── Solicitudes de marca ──
export async function aprobarSolicitud(_e: EstadoForm, form: FormData): Promise<EstadoForm> {
  await exigirRol("admin");
  const solicitud = id(form, "solicitud_id");
  if (!solicitud) return { error: "No encontramos esa solicitud." };
  // Comisión fija (COMISION_PCT) para todas; el pedido mínimo es el que eligió la marca en su solicitud
  const supabase = await createClient();
  return ejecutar(
    supabase.rpc("aprobar_solicitud", { p_solicitud: solicitud, p_comision: COMISION_PCT }),
    "Marca aprobada. Ya puede ingresar a su panel y cargar sus productos.",
  );
}

export async function rechazarSolicitud(_e: EstadoForm, form: FormData): Promise<EstadoForm> {
  await exigirRol("admin");
  const solicitud = id(form, "solicitud_id");
  if (!solicitud) return { error: "No encontramos esa solicitud." };
  const supabase = await createClient();
  return ejecutar(
    supabase.rpc("rechazar_solicitud", { p_solicitud: solicitud, p_motivo: texto(form, "motivo") }),
    "Solicitud rechazada. La persona verá el motivo al ingresar.",
  );
}

export async function guardarMarca(_e: EstadoForm, form: FormData): Promise<EstadoForm> {
  await exigirRol("admin");
  const marca = id(form, "marca_id");
  if (!marca) return { error: "No encontramos esa marca." };
  const supabase = await createClient();
  return ejecutar(
    supabase.rpc("admin_guardar_marca", {
      p_marca: marca,
      p_nombre: texto(form, "nombre"),
      p_pedido_minimo: Number(texto(form, "pedido_minimo")),
      p_activa: !!form.get("activa"),
      p_comision: Number(texto(form, "comision")),
      p_razon_social: texto(form, "razon_social"),
      p_ruc: texto(form, "ruc"),
      p_contacto_nombre: texto(form, "contacto_nombre"),
      p_contacto_whatsapp: texto(form, "contacto_whatsapp"),
      p_contacto_correo: texto(form, "contacto_correo"),
      p_direccion_recojo: texto(form, "direccion_recojo"),
    }),
    "Marca guardada.",
    "catalogo", // nombre o activa: cambia lo que ve el visitante
  );
}

// ── Confianza (8-nov-2026) ──
// "Marca verificada": el admin la marca después de revisar RUC y registro sanitario (RLS: solo el admin edita marcas)
export async function verificarMarca(_e: EstadoForm, form: FormData): Promise<EstadoForm> {
  await exigirRol("admin");
  const marca = id(form, "marca_id");
  if (!marca) return { error: "No encontramos esa marca." };
  const verificada = form.get("verificada") === "true";
  const supabase = await createClient();
  return ejecutar(
    supabase.from("marcas").update({ verificada }).eq("id", marca),
    verificada ? "Marca verificada." : "Se quitó la verificación.",
    "catalogo",
  );
}

// Ocultar (o volver a mostrar) un comentario ofensivo
export async function ocultarCalificacion(_e: EstadoForm, form: FormData): Promise<EstadoForm> {
  await exigirRol("admin");
  const calificacion = id(form, "calificacion_id");
  if (!calificacion) return { error: "No encontramos esa calificación." };
  const oculta = form.get("oculta") === "true";
  const supabase = await createClient();
  return ejecutar(
    supabase.rpc("admin_ocultar_calificacion", { p_id: calificacion, p_oculta: oculta }),
    oculta ? "Calificación oculta." : "Calificación visible otra vez.",
    "catalogo",
  );
}

// ── Recojos y entregas ──
// "Recogí todo de esta marca": todas sus órdenes de ese día de recojo. El pedido pasa solo a "en camino"
// cuando ya no falta recoger nada (la base lo hace en admin_recoger_marca).
export async function recogerMarca(_e: EstadoForm, form: FormData): Promise<EstadoForm> {
  await exigirRol("admin");
  const marca = id(form, "marca_id");
  const dia = texto(form, "fecha_recojo");
  if (!marca || !fechaEnRango(dia, "2026-01-01", enUnAnioEnLima())) return { error: "No encontramos ese recojo." };
  const supabase = await createClient();
  return ejecutar(supabase.rpc("admin_recoger_marca", { p_marca: marca, p_fecha_recojo: dia }), "Recojo guardado.");
}

// Días de entrega (1 = lunes … 7 = domingo) y con cuántos días de anticipación hay que pedir
export async function guardarEntregas(_e: EstadoForm, form: FormData): Promise<EstadoForm> {
  await exigirRol("admin");
  const dias = form.getAll("dias").map(Number).filter((d) => Number.isInteger(d) && d >= 1 && d <= 7);
  const corte = Number(form.get("corte"));
  if (dias.length === 0) return { error: "Elige al menos un día de entrega." };
  if (!Number.isInteger(corte) || corte < 1 || corte > 7) return { error: "La anticipación debe ser de 1 a 7 días." };
  const supabase = await createClient();
  const resultado = await ejecutar(supabase.rpc("admin_guardar_entregas", { p_dias: dias, p_corte: corte }), "Días de entrega guardados.");
  if (!resultado.error) updateTag("entregas");
  return resultado;
}

export async function marcarRecogido(_e: EstadoForm, form: FormData): Promise<EstadoForm> {
  await exigirRol("admin");
  const subpedido = id(form, "subpedido_id");
  if (!subpedido) return { error: "No encontramos esa orden." };
  // Si la marca no la marcó lista, el admin tiene que confirmar que se la entregaron (doble confirmación)
  const sinListo = form.get("sin_listo") === "si";
  if (form.get("pide_confirmacion") === "si" && !sinListo) {
    return { error: "Marca la casilla para confirmar que la marca te entregó esta orden." };
  }
  const supabase = await createClient();
  return ejecutar(supabase.rpc("admin_marcar_recogido", { p_subpedido: subpedido, p_sin_listo: sinListo }), "Marcado como recogido.");
}

export async function marcarEnCamino(_e: EstadoForm, form: FormData): Promise<EstadoForm> {
  await exigirRol("admin");
  const pedido = id(form, "pedido_id");
  if (!pedido) return { error: "No encontramos ese pedido." };
  const supabase = await createClient();
  return ejecutar(supabase.rpc("admin_en_camino", { p_pedido: pedido }), "El pedido va en camino.");
}

export async function marcarEntregado(_e: EstadoForm, form: FormData): Promise<EstadoForm> {
  await exigirRol("admin");
  const pedido = id(form, "pedido_id");
  if (!pedido) return { error: "No encontramos ese pedido." };
  const supabase = await createClient();
  return ejecutar(supabase.rpc("admin_entregar", { p_pedido: pedido }), "Pedido entregado. La comisión de cada marca ya está calculada.");
}

// ── Cancelaciones ──
export async function cancelarSubpedido(_e: EstadoForm, form: FormData): Promise<EstadoForm> {
  await exigirRol("admin");
  const subpedido = id(form, "subpedido_id");
  if (!subpedido) return { error: "No encontramos esa orden." };
  const supabase = await createClient();
  return ejecutar(
    supabase.rpc("admin_cancelar_subpedido", { p_subpedido: subpedido, p_motivo: texto(form, "motivo") }),
    "Parte cancelada. El stock volvió a la marca.",
  );
}

export async function cancelarPedido(_e: EstadoForm, form: FormData): Promise<EstadoForm> {
  await exigirRol("admin");
  const pedido = id(form, "pedido_id");
  if (!pedido) return { error: "No encontramos ese pedido." };
  const supabase = await createClient();
  return ejecutar(
    supabase.rpc("admin_cancelar_pedido", { p_pedido: pedido, p_motivo: texto(form, "motivo") }),
    "Pedido cancelado. El stock volvió a cada marca.",
  );
}

// ── Pagos ──
export async function marcarPagado(_e: EstadoForm, form: FormData): Promise<EstadoForm> {
  await exigirRol("admin");
  const pedido = id(form, "pedido_id");
  if (!pedido) return { error: "No encontramos ese pedido." };
  // Doble confirmación: registrar un pago a mano es delicado
  if (form.get("confirmo") !== "si") return { error: "Marca la casilla para confirmar que recibiste el pago." };
  const supabase = await createClient();
  return ejecutar(
    supabase.rpc("admin_marcar_pagado", { p_pedido: pedido, p_metodo: texto(form, "metodo") }),
    "Pago registrado.",
  );
}

// ── Cotizador ──
// Acepta "1.5" o "1,5"
function decimal(form: FormData, campo: string) {
  const valor = texto(form, campo).replace(",", ".");
  return valor === "" ? NaN : Number(valor);
}

const CAMPOS_PARAMETROS = [
  "no_toman_pct", "factor_tranquilo", "factor_normal", "factor_fuerte", "factor_dia", "bienvenida_tragos_hora",
  "fiesta_primera_hora", "fiesta_tragos_hora", "cena_copas_hora", "brindis_copas", "hielo_kg_persona_hora",
  "factor_calor", "sin_alcohol_l_hora_toma", "sin_alcohol_l_hora_no_toma", "margen_pct",
  "invitados_por_bartender", "precio_bartender_centimos", "bartender_horas_minimo", "vasos_por_toma", "precio_vaso_centimos",
  "precio_bolsa_hielo_centimos", "precio_litro_sin_alcohol_centimos",
];

// Supuestos generales del cotizador. La base de datos revisa que cada valor esté en su rango.
export async function guardarParametros(_e: EstadoForm, form: FormData): Promise<EstadoForm> {
  await exigirRol("admin");
  const p: Record<string, number | string | null> = {};
  for (const campo of CAMPOS_PARAMETROS) {
    const n = decimal(form, campo);
    if (!Number.isFinite(n)) return { error: "Revisa los valores: hay uno vacío o que no es un número." };
    // Los precios se escriben en soles y se guardan en céntimos (enteros)
    p[campo] = campo.endsWith("_centimos") ? Math.round(n * 100) : n;
  }
  p.cena_receta_id = id(form, "cena_receta_id");
  p.brindis_receta_id = id(form, "brindis_receta_id");
  const supabase = await createClient();
  return ejecutar(supabase.rpc("admin_guardar_parametros", { p }), "Guardado. El cotizador ya usa estos valores.", "cotizador");
}

// Tipo de evento: momentos por defecto y la barra (campos "nivel_<receta_id>")
export async function guardarTipoEvento(_e: EstadoForm, form: FormData): Promise<EstadoForm> {
  await exigirRol("admin");
  const barra = [...form.entries()]
    .filter(([campo, valor]) => campo.startsWith("nivel_") && esUuid(campo.slice(6)) && valor !== "")
    .map(([campo, valor]) => ({ receta_id: campo.slice(6), nivel: String(valor) }));

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_guardar_tipo_evento", {
    p_id: id(form, "tipo_id"),
    p_nombre: texto(form, "nombre"),
    p_activo: form.get("activo") === "on",
    p_horas: Math.trunc(Number(texto(form, "horas"))),
    p_perfil: texto(form, "perfil"),
    p_bienvenida: form.get("bienvenida") === "on",
    p_bienvenida_horas: decimal(form, "bienvenida_horas"),
    p_bienvenida_receta: id(form, "bienvenida_receta"),
    p_brindis: form.get("brindis") === "on",
    p_cena: form.get("cena") === "on",
    p_cena_horas: decimal(form, "cena_horas"),
    p_barra: barra,
  });
  if (error) {
    return { error: error.code === "P0001" ? error.message : "No pudimos guardar el tipo de evento. Revisa los valores." };
  }
  updateTag("cotizador");
  revalidatePath("/", "layout");
  if (!id(form, "tipo_id")) redirect(`/admin/cotizador/tipos/${data}?creado=1`);
  return { mensaje: "Guardado. El cotizador ya usa estos valores." };
}

// Un trago con sus ingredientes (recetario). La base de datos lo guarda todo junto en una transacción,
// revisa cada ingrediente y calcula sola el licor principal.
export async function guardarTrago(_e: EstadoForm, form: FormData): Promise<EstadoForm> {
  await exigirRol("admin");
  let lineas: unknown;
  try {
    lineas = JSON.parse(texto(form, "ingredientes") || "[]");
  } catch {
    return { error: "No pudimos leer los ingredientes. Intenta de nuevo." };
  }
  if (!Array.isArray(lineas) || lineas.length === 0) return { error: "Agrega al menos un ingrediente." };
  const ingredientes = lineas.map((l) => ({ ingrediente_id: String(l?.ingrediente_id ?? ""), cantidad: Number(l?.cantidad) }));
  if (ingredientes.some((l) => !esUuid(l.ingrediente_id) || !(l.cantidad > 0 && l.cantidad <= 1000))) {
    return { error: "Cada ingrediente va de la lista y con una cantidad entre 0 y 1000." };
  }
  const supabase = await createClient();
  return ejecutar(
    supabase.rpc("admin_guardar_trago", {
      p_id: id(form, "receta_id"),
      p_nombre: texto(form, "nombre"),
      p_activo: form.get("activo") === "on",
      p_ingredientes: ingredientes,
    }),
    "Trago guardado.",
    "cotizador",
  );
}

// Un ingrediente del recetario: si Surtiba lo vende, con qué categoría de producto (los licores y jarabes se
// reconocen por palabras del nombre del producto), y cómo se compra con su precio supuesto (en soles -> céntimos)
export async function guardarIngrediente(_e: EstadoForm, form: FormData): Promise<EstadoForm> {
  await exigirRol("admin");
  const supabase = await createClient();
  return ejecutar(
    supabase.rpc("admin_guardar_ingrediente", {
      p_id: id(form, "ingrediente_id"),
      p_nombre: texto(form, "nombre"),
      p_unidad: texto(form, "unidad"),
      p_categoria: texto(form, "categoria") || null,
      p_activo: form.get("activo") === "on",
      p_presentacion: decimal(form, "presentacion"),
      p_precio_supuesto_centimos: Math.round(decimal(form, "precio_supuesto") * 100),
      p_palabras: texto(form, "palabras"),
    }),
    "Ingrediente guardado.",
    "cotizador",
  );
}

// Monto fijo del envío de una zona, en soles (se guarda en céntimos)
export async function guardarEnvio(_e: EstadoForm, form: FormData): Promise<EstadoForm> {
  await exigirRol("admin");
  const zona = Number(form.get("zona"));
  const texto = String(form.get("monto") ?? "").trim();
  if (!/^\d{1,4}(\.\d{1,2})?$/.test(texto)) return { error: "Escribe el monto en soles, por ejemplo 25 o 25.50." };
  const supabase = await createClient();
  return ejecutar(
    supabase.rpc("admin_guardar_envio", { p_zona: zona, p_monto_centimos: Math.round(Number(texto) * 100) }),
    "Envío actualizado. Los pedidos nuevos ya usan este monto.",
    "envio",
  );
}

// Aprobar o rechazar (con motivo) un producto nuevo de una marca. Al aprobarlo aparece en el catálogo.
export async function revisarProducto(_e: EstadoForm, form: FormData): Promise<EstadoForm> {
  await exigirRol("admin");
  const producto = id(form, "producto_id");
  const aprueba = form.get("decision") === "aprobar";
  const motivo = texto(form, "motivo");
  if (!producto) return { error: "No encontramos ese producto." };
  if (!aprueba && motivo.length < 5) return { error: "Escribe el motivo del rechazo para que la marca pueda corregirlo." };
  const supabase = await createClient();
  return ejecutar(
    supabase.rpc("admin_revisar_producto", { p_producto: producto, p_aprueba: aprueba, p_motivo: aprueba ? null : motivo }),
    aprueba ? "Producto aprobado: ya está en el catálogo." : "Producto rechazado. La marca recibió el motivo.",
    "catalogo",
  );
}
