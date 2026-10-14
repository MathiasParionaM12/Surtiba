"use server";

// Acciones del panel del admin (equipo Surtiba). Cada una llama a una función de la base de
// datos que revisa que quien la usa sea admin y que el cambio de estado sea válido.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { EstadoForm } from "@/lib/acciones-auth";
import { esUuid } from "@/lib/catalogo";
import { exigirRol } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";

type Resultado = { error: { code?: string; message: string } | null };

// Llama a la función, traduce el error y refresca las pantallas
async function ejecutar(llamada: PromiseLike<Resultado>, exito: string): Promise<EstadoForm> {
  const { error } = await llamada;
  if (error) {
    return { error: error.code === "P0001" ? error.message : "No pudimos guardar el cambio. Intenta de nuevo." };
  }
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
  // Comisión fija de 5 % por ahora; el pedido mínimo es el que eligió la marca en su solicitud
  const supabase = await createClient();
  return ejecutar(
    supabase.rpc("aprobar_solicitud", { p_solicitud: solicitud }),
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
  );
}

// ── Recojos y entregas ──
export async function fijarRecojo(_e: EstadoForm, form: FormData): Promise<EstadoForm> {
  await exigirRol("admin");
  const subpedido = id(form, "subpedido_id");
  const fecha = texto(form, "fecha");
  if (!subpedido || !fecha) return { error: "Elige la fecha de recojo." };
  const supabase = await createClient();
  return ejecutar(supabase.rpc("admin_fijar_recojo", { p_subpedido: subpedido, p_fecha: fecha }), "Fecha de recojo guardada.");
}

export async function marcarRecogido(_e: EstadoForm, form: FormData): Promise<EstadoForm> {
  await exigirRol("admin");
  const subpedido = id(form, "subpedido_id");
  if (!subpedido) return { error: "No encontramos esa orden." };
  const supabase = await createClient();
  return ejecutar(supabase.rpc("admin_marcar_recogido", { p_subpedido: subpedido }), "Marcado como recogido.");
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
  const supabase = await createClient();
  return ejecutar(
    supabase.rpc("admin_marcar_pagado", { p_pedido: pedido, p_metodo: texto(form, "metodo") }),
    "Pago registrado.",
  );
}

// ── Cotizador ──
// Acepta "1.5" o "1,5"
function decimal(form: FormData, campo: string) {
  const n = Number(texto(form, campo).replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

// Tipo de evento + su mezcla de tragos (campos "pct_<receta_id>"). La base de datos valida que sume 100 %.
export async function guardarTipoEvento(_e: EstadoForm, form: FormData): Promise<EstadoForm> {
  await exigirRol("admin");
  const mezcla = [...form.entries()]
    .filter(([campo]) => campo.startsWith("pct_") && esUuid(campo.slice(4)))
    .map(([campo, valor]) => ({ receta_id: campo.slice(4), porcentaje: Math.trunc(Number(valor)) || 0 }))
    .filter((m) => m.porcentaje > 0);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_guardar_tipo_evento", {
    p_id: id(form, "tipo_id"),
    p_nombre: texto(form, "nombre"),
    p_primera: decimal(form, "primera"),
    p_siguiente: decimal(form, "siguiente"),
    p_activo: form.get("activo") === "on",
    p_mezcla: mezcla,
  });
  if (error) {
    return { error: error.code === "P0001" ? error.message : "No pudimos guardar el tipo de evento. Revisa los números." };
  }
  revalidatePath("/", "layout");
  if (!id(form, "tipo_id")) redirect(`/admin/cotizador/tipos/${data}?creado=1`);
  return { mensaje: "Guardado. El cotizador ya usa estos valores." };
}

export async function guardarReceta(_e: EstadoForm, form: FormData): Promise<EstadoForm> {
  await exigirRol("admin");
  const supabase = await createClient();
  return ejecutar(
    supabase.rpc("admin_guardar_receta", {
      p_id: id(form, "receta_id"),
      p_nombre: texto(form, "nombre"),
      p_categoria: texto(form, "categoria"),
      p_ml: Math.trunc(Number(texto(form, "ml"))),
      p_activo: form.get("activo") === "on",
    }),
    "Trago guardado.",
  );
}
