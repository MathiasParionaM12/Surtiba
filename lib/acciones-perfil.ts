"use server";

// "Mi perfil" del comprador: sus datos, su dirección de entrega habitual, su foto y su contraseña.
// Todo se revisa aquí, en el servidor; la base además solo deja tocar la fila propia (RLS).

import { revalidatePath } from "next/cache";
import type { EstadoForm } from "@/lib/acciones-auth";
import { revisarClave, TIPOS_NEGOCIO } from "@/lib/cuenta";
import { DISTRITOS } from "@/lib/distritos";
import { PAISES, PREFIJO_PERU } from "@/lib/paises";
import { exigirRol } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";

const leer = (form: FormData, campo: string) => String(form.get(campo) ?? "").trim();

export async function guardarPerfil(_estado: EstadoForm, form: FormData): Promise<EstadoForm> {
  const usuario = await exigirRol("comprador");
  const valores = {
    nombre: leer(form, "nombre"),
    empresa: leer(form, "empresa"),
    tipo_negocio: leer(form, "tipo_negocio"),
    prefijo: leer(form, "prefijo") || PREFIJO_PERU,
    whatsapp: leer(form, "whatsapp").replace(/[\s-]/g, ""),
    ruc: leer(form, "ruc").replace(/\s/g, ""),
    direccion: leer(form, "direccion"),
    direccion_detalle: leer(form, "direccion_detalle"),
    distrito: leer(form, "distrito"),
    codigo_postal: leer(form, "codigo_postal"),
    referencia: leer(form, "referencia"),
  };
  const v = valores;

  if (!v.nombre || !v.empresa) return { error: "Completa tu nombre y el nombre de tu empresa.", valores };
  if (v.nombre.length > 80 || v.empresa.length > 80) return { error: "El nombre o la empresa es demasiado largo.", valores };
  if (!TIPOS_NEGOCIO.some((t) => t.valor === v.tipo_negocio)) return { error: "Elige el tipo de negocio.", valores };
  if (!PAISES.some((p) => p.prefijo === v.prefijo)) return { error: "Elige el país de tu WhatsApp.", valores };
  if (v.prefijo === PREFIJO_PERU && !/^9\d{8}$/.test(v.whatsapp)) {
    return { error: "Escribe un celular peruano de 9 dígitos que empiece con 9. Ejemplo: 987654321.", valores };
  }
  if (v.prefijo !== PREFIJO_PERU && !/^\d{6,14}$/.test(v.whatsapp)) {
    return { error: "Escribe tu número de WhatsApp solo con dígitos, sin el prefijo del país.", valores };
  }
  if (v.ruc && !/^\d{11}$/.test(v.ruc)) return { error: "El RUC tiene 11 dígitos. Si no lo tienes a la mano, déjalo vacío.", valores };

  // La dirección es opcional; si escribes una parte, hacen falta la calle y el distrito
  const hayDireccion = !!(v.direccion || v.direccion_detalle || v.distrito || v.codigo_postal || v.referencia);
  if (hayDireccion) {
    if (v.direccion.length < 3 || v.direccion.length > 150) return { error: "Escribe la calle y el número de tu dirección.", valores };
    if (!DISTRITOS.includes(v.distrito)) return { error: "Elige el distrito de tu dirección.", valores };
    if (v.codigo_postal && !/^\d{5}$/.test(v.codigo_postal)) {
      return { error: "El código postal tiene 5 dígitos. Si no lo sabes, déjalo vacío.", valores };
    }
    if (v.direccion_detalle.length > 80 || v.referencia.length > 150) return { error: "El detalle o la referencia es demasiado largo.", valores };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("perfiles")
    .update({
      nombre: v.nombre,
      empresa: v.empresa,
      tipo_negocio: v.tipo_negocio,
      whatsapp: `${v.prefijo}${v.whatsapp}`,
      ruc: v.ruc || null,
      direccion: hayDireccion ? v.direccion : null,
      direccion_detalle: hayDireccion ? v.direccion_detalle || null : null,
      distrito: hayDireccion ? v.distrito : null,
      codigo_postal: hayDireccion ? v.codigo_postal || null : null,
      referencia: hayDireccion ? v.referencia || null : null,
    })
    .eq("id", usuario.id);
  if (error) return { error: "No pudimos guardar tus datos. Intenta de nuevo.", valores };

  revalidatePath("/", "layout"); // el nombre de la empresa sale en el encabezado
  return { mensaje: "Guardamos tus datos.", valores };
}

// La foto ya se subió desde el navegador a su carpeta del bucket privado "perfiles".
// La función de la base revisa que la ruta sea suya; la foto anterior se borra.
export async function guardarFoto(ruta: string | null): Promise<EstadoForm> {
  const usuario = await exigirRol("comprador");
  const supabase = await createClient();
  const { data: antes } = await supabase.from("perfiles").select("foto_ruta").eq("id", usuario.id).single();

  const { error } = await supabase.rpc("perfil_guardar_foto", { p_ruta: ruta });
  if (error) return { error: "No pudimos guardar tu foto. Intenta de nuevo." };
  if (antes?.foto_ruta && antes.foto_ruta !== ruta) await supabase.storage.from("perfiles").remove([antes.foto_ruta]);

  revalidatePath("/", "layout");
  return { mensaje: ruta ? "Foto actualizada." : "Quitamos tu foto." };
}

// Cambiar la contraseña: primero se comprueba la actual (si alguien deja la sesión abierta, no puede cambiarla)
export async function cambiarClave(_estado: EstadoForm, form: FormData): Promise<EstadoForm> {
  const usuario = await exigirRol("comprador");
  const actual = String(form.get("actual") ?? "");
  const nueva = String(form.get("nueva") ?? "");
  const repetir = String(form.get("repetir") ?? "");

  if (!actual) return { error: "Escribe tu contraseña actual." };
  const errorClave = revisarClave(nueva);
  if (errorClave) return { error: errorClave };
  if (nueva !== repetir) return { error: "Las contraseñas nuevas no coinciden. Escríbelas de nuevo." };
  if (nueva === actual) return { error: "La contraseña nueva tiene que ser distinta de la actual." };

  const supabase = await createClient();
  const { error: errorActual } = await supabase.auth.signInWithPassword({ email: usuario.email, password: actual });
  if (errorActual) return { error: "Tu contraseña actual no es correcta." };

  const { error } = await supabase.auth.updateUser({ password: nueva });
  if (error) {
    return { error: error.code === "weak_password" ? "Esa contraseña es muy débil. Usa letras y números." : "No pudimos cambiar tu contraseña. Intenta de nuevo." };
  }
  return { mensaje: "Listo: tu contraseña cambió. La próxima vez ingresa con la nueva." };
}
