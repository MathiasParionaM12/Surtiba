"use server";

// Acciones del comprador: carrito, pedido, repetir pedido y favoritos.
// El navegador solo manda producto_id y cajas. Los precios los pone la base de datos.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { EstadoForm } from "@/lib/acciones-auth";
import { esUuid } from "@/lib/catalogo";
import { DISTRITOS } from "@/lib/distritos";
import { PREFIJO_PERU, telefonoValido } from "@/lib/paises";
import { obtenerUsuario } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";

const MAX_CAJAS = 999;

// Después de cambiar datos: descarta las copias guardadas en el navegador (incluido el
// contador del carrito en el encabezado) para que todas las pantallas muestren lo nuevo.
function actualizarPantallas() {
  revalidatePath("/", "layout");
}

// Solo un comprador con sesión puede usar estas acciones
async function comprador() {
  const usuario = await obtenerUsuario();
  if (!usuario) redirect("/ingresar");
  if (usuario.rol !== "comprador") throw new Error("Solo los compradores tienen carrito.");
  return usuario;
}

function leerCajas(form: FormData) {
  const n = Number(form.get("cajas"));
  return Number.isInteger(n) ? n : NaN;
}

export async function agregarAlCarrito(_estado: EstadoForm, form: FormData): Promise<EstadoForm> {
  const usuario = await comprador();
  const productoId = String(form.get("producto_id") ?? "");
  const cajas = leerCajas(form);
  if (!esUuid(productoId)) return { error: "No encontramos ese producto." };
  if (!(cajas >= 1 && cajas <= MAX_CAJAS)) return { error: `Elige entre 1 y ${MAX_CAJAS} cajas.` };

  const supabase = await createClient();
  const [{ data: producto }, { data: actual }] = await Promise.all([
    supabase.from("productos").select("nombre, stock_cajas").eq("id", productoId).maybeSingle(),
    supabase.from("carrito").select("cajas").eq("producto_id", productoId).maybeSingle(),
  ]);
  if (!producto) return { error: "Este producto ya no está disponible." };

  const total = Math.min((actual?.cajas ?? 0) + cajas, MAX_CAJAS);

  const { error } = await supabase
    .from("carrito")
    .upsert({ comprador_id: usuario.id, producto_id: productoId, cajas: total });
  if (error) return { error: "No pudimos agregarlo al carrito. Intenta de nuevo." };

  actualizarPantallas();
  // Si pide más que el stock, lo que falta irá como pedido por encargo (la marca lo confirma)
  const encargo = Math.max(0, total - producto.stock_cajas);
  const textoCajas = (n: number) => `${n} ${n === 1 ? "caja" : "cajas"}`;
  return {
    mensaje:
      encargo === 0
        ? `Listo: tienes ${textoCajas(total)} de ${producto.nombre} en tu carrito.`
        : `Listo: ${textoCajas(total)} de ${producto.nombre} en tu carrito: ${textoCajas(total - encargo)} ahora y ${textoCajas(encargo)} por encargo.`,
  };
}

export async function cambiarCajas(form: FormData) {
  await comprador();
  const productoId = String(form.get("producto_id") ?? "");
  const cajas = leerCajas(form);
  if (!esUuid(productoId) || Number.isNaN(cajas)) return;

  const supabase = await createClient();
  if (cajas < 1) {
    await supabase.from("carrito").delete().eq("producto_id", productoId);
  } else {
    await supabase.from("carrito").update({ cajas: Math.min(cajas, MAX_CAJAS) }).eq("producto_id", productoId);
  }
  actualizarPantallas();
}

export async function quitarDelCarrito(form: FormData) {
  await comprador();
  const productoId = String(form.get("producto_id") ?? "");
  if (!esUuid(productoId)) return;
  const supabase = await createClient();
  await supabase.from("carrito").delete().eq("producto_id", productoId);
  actualizarPantallas();
}

export async function confirmarPedido(_estado: EstadoForm, form: FormData): Promise<EstadoForm> {
  await comprador();
  const leer = (campo: string) => String(form.get(campo) ?? "").trim();
  const valores = {
    recibe_nombre: leer("recibe_nombre"),
    prefijo: leer("prefijo") || PREFIJO_PERU,
    telefono: leer("telefono").replace(/[\s-]/g, ""),
    direccion: leer("direccion"),
    direccion_detalle: leer("direccion_detalle"),
    distrito: leer("distrito"),
    codigo_postal: leer("codigo_postal"),
    referencia: leer("referencia"),
    fecha_entrega: leer("fecha_entrega"),
    nota: leer("nota"),
    evento_nombre: leer("evento_nombre"),
    evento_tipo: leer("evento_tipo"),
    evento_fecha: leer("evento_fecha"),
    invitados: leer("invitados"),
    metodo_pago: leer("metodo_pago"),
    modo: leer("modo") === "junto" ? "junto" : "separado",
  };

  if (!valores.recibe_nombre) return { error: "Escribe el nombre de quien recibe el pedido.", valores };
  if (!telefonoValido(valores.prefijo, valores.telefono)) {
    return { error: "Escribe un celular válido para quien recibe. En Perú: 9 dígitos que empiezan con 9.", valores };
  }
  if (!valores.direccion) return { error: "Escribe la calle y el número de la dirección.", valores };
  if (!DISTRITOS.includes(valores.distrito)) return { error: "Elige el distrito de entrega.", valores };
  if (valores.codigo_postal && !/^\d{5}$/.test(valores.codigo_postal)) {
    return { error: "El código postal tiene 5 dígitos. Si no lo sabes, déjalo vacío.", valores };
  }
  if (!valores.fecha_entrega) return { error: "Elige la fecha de entrega.", valores };
  const invitados = valores.invitados ? Number(valores.invitados) : undefined;
  if (invitados !== undefined && !(Number.isInteger(invitados) && invitados > 0)) {
    return { error: "El número de invitados debe ser un número entero mayor que 0.", valores };
  }

  // Toda la lógica (stock, precios, mínimos, subpedidos) corre en la función crear_pedido, en una transacción
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("crear_pedido", {
    p_fecha_entrega: valores.fecha_entrega,
    p_direccion: valores.direccion,
    p_distrito: valores.distrito,
    p_recibe_nombre: valores.recibe_nombre,
    p_recibe_telefono: `${valores.prefijo}${valores.telefono}`,
    p_metodo_pago: valores.metodo_pago || undefined,
    p_direccion_detalle: valores.direccion_detalle || undefined,
    p_codigo_postal: valores.codigo_postal || undefined,
    p_referencia: valores.referencia || undefined,
    p_nota: valores.nota || undefined,
    p_evento_nombre: valores.evento_nombre || undefined,
    p_evento_tipo: valores.evento_tipo || undefined,
    p_evento_fecha: valores.evento_fecha || undefined,
    p_invitados: invitados,
    p_modo: valores.modo as "separado" | "junto",
  });

  if (error) {
    // P0001 = mensaje escrito por nosotros en crear_pedido (ya está en español)
    const mensaje = error.code === "P0001" ? error.message : "No pudimos enviar tu pedido. Intenta de nuevo en unos minutos.";
    return { error: mensaje, valores };
  }

  actualizarPantallas();
  // Puede crear 1 o 2 pedidos: la compra directa (pagada) y/o el encargo (por confirmar).
  // Con "todo junto" crea solo el encargo.
  const directo = data.find((p) => p.tipo === "directo");
  const encargo = data.find((p) => p.tipo === "encargo");
  if (directo) redirect(`/pedidos/${directo.pedido_id}?nuevo=1${encargo ? `&encargo=${encargo.pedido_id}` : ""}`);
  redirect(`/pedidos/${encargo!.pedido_id}?nuevo=1`);
}

export async function repetirPedido(form: FormData) {
  const usuario = await comprador();
  const pedidoId = String(form.get("pedido_id") ?? "");
  if (!esUuid(pedidoId)) return;

  const supabase = await createClient();
  const { data: subpedidos } = await supabase
    .from("subpedidos")
    .select("estado, items(producto_id, cajas)")
    .eq("pedido_id", pedidoId);

  const items = (subpedidos ?? [])
    .filter((s) => s.estado !== "rechazado" && s.estado !== "cancelado")
    .flatMap((s) => s.items);

  // Uno por uno: si un producto ya no está disponible, RLS lo rechaza y seguimos con los demás
  let agregados = 0;
  for (const item of items) {
    const { error } = await supabase
      .from("carrito")
      .upsert({ comprador_id: usuario.id, producto_id: item.producto_id, cajas: item.cajas });
    if (!error) agregados++;
  }

  actualizarPantallas();
  redirect(`/carrito?repetido=${agregados}&omitidos=${items.length - agregados}`);
}

export async function alternarFavorito(form: FormData) {
  const usuario = await comprador();
  const productoId = String(form.get("producto_id") ?? "");
  if (!esUuid(productoId)) return;

  const supabase = await createClient();
  const { data: existe } = await supabase.from("favoritos").select("producto_id").eq("producto_id", productoId).maybeSingle();
  if (existe) {
    await supabase.from("favoritos").delete().eq("producto_id", productoId);
  } else {
    await supabase.from("favoritos").insert({ comprador_id: usuario.id, producto_id: productoId });
  }
  actualizarPantallas();
}

// Agrega un reemplazo AL MISMO pedido cuando una marca no pudo atender su parte.
// La función agregar_reemplazo hace todo en una transacción (stock, escala, mínimo y totales).
export async function agregarReemplazo(_estado: EstadoForm, form: FormData): Promise<EstadoForm> {
  await comprador();
  const pedidoId = String(form.get("pedido_id") ?? "");
  const productoId = String(form.get("producto_id") ?? "");
  const cajas = leerCajas(form);
  if (!esUuid(pedidoId) || !esUuid(productoId)) return { error: "No encontramos ese producto o pedido." };
  if (!(cajas >= 1 && cajas <= MAX_CAJAS)) return { error: `Elige entre 1 y ${MAX_CAJAS} cajas.` };

  const supabase = await createClient();
  const { data: codigo, error } = await supabase.rpc("agregar_reemplazo", {
    p_pedido: pedidoId,
    p_producto: productoId,
    p_cajas: cajas,
  });
  if (error) {
    return { error: error.code === "P0001" ? error.message : "No pudimos agregarlo a tu pedido. Intenta de nuevo." };
  }

  actualizarPantallas();
  return { mensaje: `Agregado a tu pedido ${codigo}.` };
}

// El cliente paga un encargo confirmado (o lo que falte de un pedido). Pago simulado.
export async function pagarPedido(_estado: EstadoForm, form: FormData): Promise<EstadoForm> {
  await comprador();
  const pedidoId = String(form.get("pedido_id") ?? "");
  const metodo = String(form.get("metodo_pago") ?? "");
  if (!esUuid(pedidoId)) return { error: "No encontramos ese pedido." };
  if (!metodo) return { error: "Elige cómo vas a pagar." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("pagar_pedido", { p_pedido: pedidoId, p_metodo: metodo });
  if (error) return { error: error.code === "P0001" ? error.message : "No pudimos registrar el pago. Intenta de nuevo." };

  actualizarPantallas();
  return { mensaje: "Pago registrado (simulado). Seguimos con tu pedido." };
}
