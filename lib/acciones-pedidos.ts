"use server";

// Acciones del comprador: carrito, pedido, repetir pedido y favoritos.
// El navegador solo manda producto_id y cajas. Los precios los pone la base de datos.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { EstadoForm } from "@/lib/acciones-auth";
import { esUuid } from "@/lib/catalogo";
import { DISTRITOS } from "@/lib/distritos";
import { enUnAnioEnLima, fechaEnRango, mananaEnLima } from "@/lib/formato";
import { celularValido, limpiarCelular, PREFIJO_PERU } from "@/lib/celular";
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
    .upsert({ comprador_id: usuario.id, producto_id: productoId, cajas: total, encargo: false });
  if (error) return { error: "No pudimos agregarlo al carrito. Intenta de nuevo." };

  // Embudo del panel admin: "agregó al carrito" (la base pone quién fue)
  await supabase.rpc("registrar_evento", { p_tipo: "agrego_carrito", p_producto: productoId });
  actualizarPantallas();
  // Si pide más que el stock, en el carrito elige qué hacer con lo que falta (encargo, cambio o solo lo que hay)
  const encargo = Math.max(0, total - producto.stock_cajas);
  const textoCajas = (n: number) => `${n} ${n === 1 ? "caja" : "cajas"}`;
  return {
    mensaje:
      encargo === 0
        ? `Listo: tienes ${textoCajas(total)} de ${producto.nombre} en tu carrito.`
        : `En tu carrito: ${textoCajas(total)} de ${producto.nombre}. Hay ${textoCajas(Math.max(0, producto.stock_cajas))} en stock: en el carrito eliges qué hacer con las que faltan.`,
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
    await supabase.from("carrito").update({ cajas: Math.min(cajas, MAX_CAJAS), encargo: false }).eq("producto_id", productoId);
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

// Lo que falta de stock en una línea del carrito (5-nov-2026): el comprador decide antes de pagar.
// "encargo": la marca confirma si llega y recién ahí lo paga · "solo_stock": se queda con lo que hay
// "deshacer": vuelve a preguntar. La base revisa en crear_pedido que nada quede sin decidir.
export async function decidirFaltante(form: FormData) {
  await comprador();
  const productoId = String(form.get("producto_id") ?? "");
  const decision = String(form.get("decision") ?? "");
  if (!esUuid(productoId)) return;

  const supabase = await createClient();
  if (decision === "encargo" || decision === "deshacer") {
    await supabase.from("carrito").update({ encargo: decision === "encargo" }).eq("producto_id", productoId);
  } else if (decision === "solo_stock") {
    const { data: p } = await supabase.from("productos").select("stock_cajas").eq("id", productoId).maybeSingle();
    const stock = Math.max(0, p?.stock_cajas ?? 0);
    if (stock > 0) await supabase.from("carrito").update({ cajas: stock, encargo: false }).eq("producto_id", productoId);
    else await supabase.from("carrito").delete().eq("producto_id", productoId);
  }
  actualizarPantallas();
}

// Cambia lo que falta de un producto por otro que sí tiene stock. Solo viajan los ids: las cajas y el stock
// se leen aquí (RLS: el comprador solo ve productos aprobados y activos) y el precio lo pone la base.
export async function cambiarPorOtro(form: FormData) {
  const usuario = await comprador();
  const productoId = String(form.get("producto_id") ?? "");
  const nuevoId = String(form.get("nuevo_id") ?? "");
  if (!esUuid(productoId) || !esUuid(nuevoId) || productoId === nuevoId) return;

  const supabase = await createClient();
  const [{ data: linea }, { data: original }, { data: nuevo }, { data: yaTenia }] = await Promise.all([
    supabase.from("carrito").select("cajas").eq("producto_id", productoId).maybeSingle(),
    supabase.from("productos").select("stock_cajas").eq("id", productoId).maybeSingle(),
    supabase.from("productos").select("stock_cajas").eq("id", nuevoId).maybeSingle(),
    supabase.from("carrito").select("cajas").eq("producto_id", nuevoId).maybeSingle(),
  ]);
  if (!linea || !nuevo) return;
  const stock = Math.max(0, original?.stock_cajas ?? 0);
  const faltan = Math.max(0, linea.cajas - stock);
  const cajasNuevo = Math.min(faltan, Math.max(0, nuevo.stock_cajas - (yaTenia?.cajas ?? 0)));
  if (cajasNuevo < 1) return;

  // El original se queda con lo que hay; el nuevo suma las cajas que faltaban
  if (stock > 0) await supabase.from("carrito").update({ cajas: stock, encargo: false }).eq("producto_id", productoId);
  else await supabase.from("carrito").delete().eq("producto_id", productoId);
  await supabase
    .from("carrito")
    .upsert({ comprador_id: usuario.id, producto_id: nuevoId, cajas: Math.min((yaTenia?.cajas ?? 0) + cajasNuevo, MAX_CAJAS), encargo: false });
  actualizarPantallas();
}

export async function confirmarPedido(_estado: EstadoForm, form: FormData): Promise<EstadoForm> {
  await comprador();
  const leer = (campo: string) => String(form.get(campo) ?? "").trim();
  const valores = {
    recibe_nombre: leer("recibe_nombre"),
    telefono: limpiarCelular(leer("telefono")),
    direccion: leer("direccion"),
    direccion_detalle: leer("direccion_detalle"),
    distrito: leer("distrito"),
    codigo_postal: leer("codigo_postal"),
    referencia: leer("referencia"),
    fecha_entrega: leer("fecha_entrega"),
    nota: leer("nota"),
    evento_fecha: leer("evento_fecha"),
    metodo_pago: leer("metodo_pago"),
  };

  if (!valores.recibe_nombre) return { error: "Escribe el nombre de quien recibe el pedido.", valores };
  if (!celularValido(valores.telefono)) {
    return { error: "Escribe un celular válido para quien recibe. En Perú: 9 dígitos que empiezan con 9.", valores };
  }
  if (!valores.direccion) return { error: "Escribe la calle y el número de la dirección.", valores };
  if (!DISTRITOS.includes(valores.distrito)) return { error: "Elige el distrito de entrega.", valores };
  if (valores.codigo_postal && !/^\d{5}$/.test(valores.codigo_postal)) {
    return { error: "El código postal tiene 5 dígitos. Si no lo sabes, déjalo vacío.", valores };
  }
  if (!fechaEnRango(valores.fecha_entrega, mananaEnLima(), enUnAnioEnLima())) {
    return { error: "Elige una fecha de entrega desde mañana y hasta dentro de un año.", valores };
  }
  if (valores.evento_fecha && valores.evento_fecha > enUnAnioEnLima()) {
    return { error: "La fecha del evento puede ser hasta dentro de un año.", valores };
  }
  // Fechas AAAA-MM-DD: se comparan como texto. El evento no puede ser antes de la entrega.
  if (valores.evento_fecha && !/^\d{4}-\d{2}-\d{2}$/.test(valores.evento_fecha)) {
    return { error: "Elige la fecha del evento en el calendario.", valores };
  }
  if (valores.evento_fecha && valores.evento_fecha < valores.fecha_entrega) {
    return { error: "La fecha del evento no puede ser antes de la entrega. Si el evento es antes, cambia la fecha de entrega.", valores };
  }

  // Toda la lógica (stock, precios, mínimos, subpedidos) corre en la función crear_pedido, en una transacción
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("crear_pedido", {
    p_fecha_entrega: valores.fecha_entrega,
    p_direccion: valores.direccion,
    p_distrito: valores.distrito,
    p_recibe_nombre: valores.recibe_nombre,
    p_recibe_telefono: `${PREFIJO_PERU}${valores.telefono}`,
    p_metodo_pago: valores.metodo_pago || undefined,
    p_direccion_detalle: valores.direccion_detalle || undefined,
    p_codigo_postal: valores.codigo_postal || undefined,
    p_referencia: valores.referencia || undefined,
    p_nota: valores.nota || undefined,
    p_evento_fecha: valores.evento_fecha || undefined,
  });

  if (error) {
    // P0001 = mensaje escrito por nosotros en crear_pedido (ya está en español)
    const mensaje = error.code === "P0001" ? error.message : "No pudimos enviar tu pedido. Intenta de nuevo en unos minutos.";
    return { error: mensaje, valores };
  }

  actualizarPantallas();
  // Puede crear 1 o 2 pedidos: la compra directa (pagada) y/o el encargo (por confirmar).
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
      .upsert({ comprador_id: usuario.id, producto_id: item.producto_id, cajas: item.cajas, encargo: false });
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
