"use server";

// Acciones del panel de la marca. Los cambios de estado pasan por funciones de la base
// de datos que revisan que la orden sea de esta marca y que el cambio sea válido.

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import type { EstadoForm } from "@/lib/acciones-auth";
import { CATEGORIAS, esUuid } from "@/lib/catalogo";
import { exigirRol, obtenerUsuario } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";

// Los mensajes P0001 los escribimos nosotros en las funciones de la base de datos (en español)
function mensaje(error: { code?: string; message: string }) {
  return error.code === "P0001" ? error.message : "No pudimos guardar el cambio. Intenta de nuevo en unos minutos.";
}

function actualizarPantallas() {
  revalidatePath("/", "layout");
}

// Cambió algo que ve un visitante (producto o foto): también se renueva la caché del catálogo público
function actualizarCatalogo() {
  updateTag("catalogo");
  actualizarPantallas();
}

export async function marcarListo(_estado: EstadoForm, form: FormData): Promise<EstadoForm> {
  await exigirRol("marca");
  const id = String(form.get("subpedido_id") ?? "");
  if (!esUuid(id)) return { error: "No encontramos esa orden." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("marcar_listo", { p_subpedido: id });
  if (error) return { error: mensaje(error) };

  actualizarPantallas();
  return { mensaje: "Listo. Surtiba verá que esta orden está lista para recoger." };
}

export async function rechazarOrden(_estado: EstadoForm, form: FormData): Promise<EstadoForm> {
  await exigirRol("marca");
  const id = String(form.get("subpedido_id") ?? "");
  const motivo = String(form.get("motivo") ?? "").trim();
  if (!esUuid(id)) return { error: "No encontramos esa orden." };
  if (motivo.length < 5) return { error: "Escribe el motivo (al menos 5 letras).", valores: { motivo } };

  const supabase = await createClient();
  const { error } = await supabase.rpc("rechazar_subpedido", { p_subpedido: id, p_motivo: motivo });
  if (error) return { error: mensaje(error), valores: { motivo } };

  actualizarPantallas();
  return { mensaje: "Registramos que no puedes atender esta orden. El stock volvió a tu inventario." };
}

// Stock rápido: por cada producto el formulario trae "stock:<id>" (lo nuevo) y "antes:<id>"
// (lo que había en pantalla). Solo se guardan las filas que la marca cambió.
export async function guardarStock(_estado: EstadoForm, form: FormData): Promise<EstadoForm> {
  await exigirRol("marca");
  const cambios: { id: string; stock: number; antes: number }[] = [];
  for (const [campo, valor] of form.entries()) {
    if (!campo.startsWith("stock:")) continue;
    const id = campo.slice("stock:".length);
    const stock = Number(valor);
    const antes = Number(form.get(`antes:${id}`));
    if (!esUuid(id)) continue;
    if (!Number.isInteger(stock) || stock < 0 || stock > 99999) {
      return { error: "El stock debe ser un número entero entre 0 y 99,999." };
    }
    if (stock !== antes) cambios.push({ id, stock, antes });
  }
  if (cambios.length === 0) return { mensaje: "No cambiaste ningún número." };

  // Solo se guarda si el stock sigue siendo el que viste. Si un pedido o un rechazo lo cambió
  // mientras editabas, no se pisa: se avisa para que revises el número nuevo.
  // (RLS además asegura que el producto sea de esta marca.)
  const supabase = await createClient();
  let guardados = 0;
  let cambiaronMientras = 0;
  for (const c of cambios) {
    const { data, error } = await supabase
      .from("productos")
      .update({ stock_cajas: c.stock })
      .eq("id", c.id)
      .eq("stock_cajas", c.antes)
      .select("id");
    if (error) return { error: "No pudimos guardar el stock. Intenta de nuevo." };
    if (data.length > 0) guardados++;
    else cambiaronMientras++;
  }

  actualizarPantallas();
  if (cambiaronMientras > 0) {
    return {
      error:
        `${cambiaronMientras} ${cambiaronMientras === 1 ? "producto cambió" : "productos cambiaron"} mientras editabas ` +
        "(por un pedido o un rechazo) y no se guardó. La tabla ya muestra el número actual: revísalo y guarda de nuevo." +
        (guardados > 0 ? ` Los demás (${guardados}) sí se guardaron.` : ""),
    };
  }
  return { mensaje: `Stock guardado (${guardados} ${guardados === 1 ? "producto" : "productos"}).` };
}

// Crear o editar un producto con su escala de precios
export async function guardarProducto(_estado: EstadoForm, form: FormData): Promise<EstadoForm> {
  // La marca guarda en la suya; el admin puede guardar productos de cualquier marca (manda "marca_id")
  const usuario = await obtenerUsuario();
  if (!usuario || (usuario.rol !== "marca" && usuario.rol !== "admin")) return { error: "No tienes permiso para guardar productos." };
  const esAdmin = usuario.rol === "admin";
  const marcaAdmin = String(form.get("marca_id") ?? "");
  const leer = (campo: string) => String(form.get(campo) ?? "").trim();
  const id = leer("id");
  const valores = {
    nombre: leer("nombre"),
    categoria: leer("categoria"),
    ml: leer("ml"),
    grado: leer("grado"),
    unidades: leer("unidades"),
    registro: leer("registro"),
    stock: leer("stock"),
    activo: form.get("activo") ? "si" : "",
  };

  if (!valores.nombre) return { error: "Escribe el nombre del producto.", valores };
  if (!CATEGORIAS[valores.categoria]) return { error: "Elige una categoría.", valores };

  // Tramos: "desde" en cajas y precio en soles (se guarda en céntimos)
  const desdes = form.getAll("tramo_desde").map(String);
  const precios = form.getAll("tramo_precio").map(String);
  const tramos = desdes
    .map((d, i) => ({ desde: Number(d), precio: Math.round(Number(precios[i]) * 100) }))
    .filter((t) => !(Number.isNaN(t.desde) && Number.isNaN(t.precio)));
  if (tramos.some((t) => !Number.isInteger(t.desde) || !Number.isFinite(t.precio))) {
    return { error: "Revisa los tramos: cada uno necesita las cajas 'desde' y un precio.", valores };
  }

  const supabase = await createClient();
  const { data: nuevoId, error } = await supabase.rpc("guardar_producto", {
    p_id: esUuid(id) ? id : null,
    p_nombre: valores.nombre,
    p_categoria: valores.categoria,
    p_ml: Number(valores.ml),
    p_grado: Number(valores.grado),
    p_unidades: Number(valores.unidades),
    p_registro: valores.registro || null,
    p_stock: Number(valores.stock || 0),
    p_activo: !!valores.activo,
    p_tramos: tramos,
    p_marca_id: esAdmin && esUuid(marcaAdmin) ? marcaAdmin : undefined,
  });
  if (error) return { error: mensaje(error), valores };

  actualizarCatalogo();
  const base = esAdmin ? "/admin/productos" : "/marca/productos";
  redirect(`${base}/${nuevoId}?${esUuid(id) ? "guardado" : "creado"}=1`);
}

// Después de subir la foto a Storage (desde el navegador), se guarda su ruta en el producto
export async function guardarFoto(productoId: string, ruta: string): Promise<EstadoForm> {
  const usuario = await obtenerUsuario();
  if (!usuario || (usuario.rol !== "marca" && usuario.rol !== "admin") || !esUuid(productoId)) return { error: "Foto no válida." };

  // La foto debe estar en la carpeta de la marca dueña del producto (RLS: la marca solo ve los suyos)
  const supabase = await createClient();
  const { data: producto } = await supabase.from("productos").select("marca_id").eq("id", productoId).maybeSingle();
  if (!producto || !ruta.startsWith(`${producto.marca_id}/`)) return { error: "Foto no válida." };
  const { data, error } = await supabase.from("productos").update({ foto_url: ruta }).eq("id", productoId).select("id");
  if (error || !data?.length) return { error: "No pudimos guardar la foto. Intenta de nuevo." };

  actualizarCatalogo();
  return { mensaje: "Foto actualizada." };
}

// Directorio de marcas: la descripción corta que ven los compradores en /marcas
export async function guardarDescripcion(_estado: EstadoForm, form: FormData): Promise<EstadoForm> {
  await exigirRol("marca");
  const texto = String(form.get("descripcion") ?? "").trim();
  if (texto && (texto.length < 10 || texto.length > 280)) return { error: "La descripción va de 10 a 280 letras.", valores: { descripcion: texto } };
  const supabase = await createClient();
  const { error } = await supabase.rpc("marca_guardar_descripcion", { p_descripcion: texto || null });
  if (error) return { error: mensaje(error), valores: { descripcion: texto } };
  actualizarCatalogo();
  return { mensaje: "Descripción guardada." };
}

// Directorio de marcas: el logo ya se subió a la carpeta de la marca; aquí se guarda su ruta
export async function guardarLogo(ruta: string): Promise<EstadoForm> {
  await exigirRol("marca");
  const supabase = await createClient();
  const { error } = await supabase.rpc("marca_guardar_logo", { p_ruta: ruta });
  if (error) return { error: "No pudimos guardar el logo. Intenta de nuevo." };
  actualizarCatalogo();
  return { mensaje: "Logo actualizado." };
}

// La marca cambia su propio pedido mínimo (lo decide ella, no Surtiba)
export async function guardarMinimo(_estado: EstadoForm, form: FormData): Promise<EstadoForm> {
  await exigirRol("marca");
  const minimo = Number(form.get("pedido_minimo"));
  if (!Number.isInteger(minimo) || minimo < 1 || minimo > 9999) return { error: "El pedido mínimo debe ser de al menos 1 caja." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("marca_guardar_minimo", { p_minimo: minimo });
  if (error) return { error: mensaje(error) };

  actualizarPantallas();
  return { mensaje: `Pedido mínimo guardado: ${minimo} ${minimo === 1 ? "caja" : "cajas"}.` };
}

// La marca responde un encargo: lo acepta con la fecha en que lo tendrá listo, o lo rechaza con motivo
export async function responderEncargo(_estado: EstadoForm, form: FormData): Promise<EstadoForm> {
  await exigirRol("marca");
  const id = String(form.get("subpedido_id") ?? "");
  const acepta = form.get("respuesta") === "acepto";
  const fecha = String(form.get("fecha") ?? "");
  const motivo = String(form.get("motivo") ?? "").trim();
  if (!esUuid(id)) return { error: "No encontramos ese encargo." };
  if (acepta && !fecha) return { error: "Elige la fecha en que lo tendrás listo." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("marca_responder_encargo", {
    p_subpedido: id,
    p_acepta: acepta,
    p_fecha: acepta ? fecha : undefined,
    p_motivo: acepta ? undefined : motivo,
  });
  if (error) return { error: mensaje(error), valores: { motivo, fecha } };

  actualizarPantallas();
  return {
    mensaje: acepta
      ? "Encargo aceptado. Le avisamos al cliente para que lo pague; te diremos aquí cuando puedas marcarlo listo."
      : "Registramos que no puedes hacer este encargo.",
  };
}
