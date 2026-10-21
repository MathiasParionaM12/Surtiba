"use server";

// Acciones del servidor para registrarse, ingresar y salir.
// Corren en el servidor: el navegador solo envía el formulario.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { DISTRITOS } from "@/lib/distritos";
import { PAISES, PREFIJO_PERU, telefonoValido } from "@/lib/paises";
import { rutaInicio, type Rol } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

export type EstadoForm = {
  error?: string;
  mensaje?: string;
  valores?: Record<string, string>; // para no borrar lo que el usuario ya escribió
};

const TIPOS_NEGOCIO = ["catering", "organizador_eventos", "wedding_planner", "bar_restaurante", "otro"];

function leer(form: FormData, campo: string) {
  return String(form.get(campo) ?? "").trim();
}

// Traduce los errores de Supabase a mensajes que dicen qué pasó y qué hacer
// La misma regla que Supabase Auth (Authentication → Sign In / Providers → Email): mínimo 8 caracteres,
// con letras y números. Supabase la vuelve a revisar aunque alguien llame a su API directo.
function revisarClave(password: string) {
  if (password.length < 8) return "La contraseña debe tener al menos 8 caracteres.";
  if (password.length > 72) return "La contraseña puede tener como máximo 72 caracteres.";
  if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) return "La contraseña debe tener letras y números.";
  return null;
}

function mensajeDeError(codigo?: string) {
  switch (codigo) {
    case "invalid_credentials":
      return "Correo o contraseña incorrectos. Revísalos e intenta de nuevo.";
    case "user_already_exists":
    case "email_exists":
      // Genérico a propósito: no confirma si el correo ya está registrado (evita que se adivinen correos)
      return "No pudimos crear la cuenta con ese correo. Si ya tienes una, ingresa con tu contraseña.";
    case "weak_password":
      return "La contraseña es muy débil o ya apareció en filtraciones de otras webs. Usa una distinta, de al menos 8 caracteres, con letras y números.";
    case "email_not_confirmed":
      return "Aún no confirmas tu correo. Abre el correo que te enviamos y luego ingresa.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Demasiados intentos seguidos. Espera unos minutos e intenta de nuevo.";
    case "email_address_invalid":
      return "Ese correo no es válido. Revisa que esté bien escrito.";
    default:
      return "No pudimos completar la operación. Intenta de nuevo en unos minutos.";
  }
}

export async function ingresar(_estado: EstadoForm, form: FormData): Promise<EstadoForm> {
  const email = leer(form, "email").toLowerCase();
  const password = String(form.get("password") ?? "");
  const valores = { email };

  if (!email || !password) {
    return { error: "Escribe tu correo y tu contraseña.", valores };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: mensajeDeError(error.code), valores };

  // Cada rol empieza en su pantalla: comprador -> catálogo, marca -> su panel, admin -> panel Surtiba
  const { data: perfil } = await supabase.from("perfiles").select("rol").eq("id", data.user.id).single();
  revalidatePath("/", "layout"); // el encabezado cambia: ahora hay sesión
  redirect(rutaInicio((perfil?.rol ?? "comprador") as Rol));
}

export async function registrarse(_estado: EstadoForm, form: FormData): Promise<EstadoForm> {
  const email = leer(form, "email").toLowerCase();
  const password = String(form.get("password") ?? "");
  const password2 = String(form.get("password2") ?? "");
  const nombre = leer(form, "nombre");
  const empresa = leer(form, "empresa");
  const tipoNegocio = leer(form, "tipo_negocio");
  const prefijo = leer(form, "prefijo") || PREFIJO_PERU;
  const numero = leer(form, "whatsapp").replace(/[\s-]/g, "");
  const ruc = leer(form, "ruc").replace(/\s/g, "");
  const valores = { email, nombre, empresa, tipo_negocio: tipoNegocio, prefijo, whatsapp: numero, ruc };

  if (!nombre || !empresa) return { error: "Completa tu nombre y el nombre de tu empresa.", valores };
  if (!TIPOS_NEGOCIO.includes(tipoNegocio)) return { error: "Elige el tipo de negocio.", valores };
  if (!PAISES.some((p) => p.prefijo === prefijo)) return { error: "Elige el país de tu WhatsApp.", valores };
  if (prefijo === PREFIJO_PERU && !/^9\d{8}$/.test(numero)) {
    return { error: "Escribe un celular peruano de 9 dígitos que empiece con 9. Ejemplo: 987654321.", valores };
  }
  if (prefijo !== PREFIJO_PERU && !/^\d{6,14}$/.test(numero)) {
    return { error: "Escribe tu número de WhatsApp solo con dígitos, sin el prefijo del país.", valores };
  }
  if (ruc && !/^\d{11}$/.test(ruc)) {
    return { error: "El RUC tiene 11 dígitos. Si no lo tienes a la mano, déjalo vacío.", valores };
  }
  if (!email) return { error: "Escribe tu correo.", valores };
  const errorClave = revisarClave(password);
  if (errorClave) return { error: errorClave, valores };
  if (password !== password2) return { error: "Las contraseñas no coinciden. Escríbelas de nuevo.", valores };

  // Se guarda en formato internacional: +51987654321
  const whatsapp = `${prefijo}${numero}`;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    // Estos datos los copia a la tabla perfiles el trigger de la base de datos (siempre como comprador)
    options: { data: { nombre, empresa, tipo_negocio: tipoNegocio, whatsapp, ruc: ruc || null } },
  });
  if (error) return { error: mensajeDeError(error.code), valores };

  // Si Supabase pide confirmar el correo, todavía no hay sesión
  if (!data.session) {
    return { mensaje: "Te enviamos un correo para confirmar tu cuenta. Ábrelo y luego ingresa.", valores };
  }

  revalidatePath("/", "layout");
  redirect(rutaInicio("comprador"));
}

export async function salir() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

// "Quiero vender": crea la cuenta como SOLICITUD de marca. El trigger de la base de datos la guarda
// en solicitudes_marca y el perfil queda como "solicitante" hasta que el admin la apruebe.
export async function registrarVendedor(_estado: EstadoForm, form: FormData): Promise<EstadoForm> {
  const email = leer(form, "email").toLowerCase();
  const password = String(form.get("password") ?? "");
  const password2 = String(form.get("password2") ?? "");
  const nombre = leer(form, "nombre");
  const prefijo = leer(form, "prefijo") || PREFIJO_PERU;
  const numero = leer(form, "whatsapp").replace(/[\s-]/g, "");
  const nombreComercial = leer(form, "nombre_comercial");
  const razonSocial = leer(form, "razon_social");
  const ruc = leer(form, "ruc").replace(/\s/g, "");
  const direccion = leer(form, "direccion");
  const distrito = leer(form, "distrito");
  const pedidoMinimo = leer(form, "pedido_minimo");
  const valores = {
    email, nombre, prefijo, whatsapp: numero, nombre_comercial: nombreComercial,
    razon_social: razonSocial, ruc, direccion, distrito, pedido_minimo: pedidoMinimo,
  };

  if (!nombre) return { error: "Escribe tu nombre.", valores };
  if (!telefonoValido(prefijo, numero)) {
    return { error: "Escribe un celular válido. En Perú: 9 dígitos que empiezan con 9.", valores };
  }
  if (!nombreComercial || !razonSocial) return { error: "Completa el nombre comercial y la razón social de tu marca.", valores };
  if (!/^\d{11}$/.test(ruc)) return { error: "El RUC de tu marca tiene 11 dígitos.", valores };
  if (!direccion) return { error: "Escribe la dirección donde Surtiba recogerá tus pedidos.", valores };
  if (!DISTRITOS.includes(distrito)) return { error: "Elige el distrito de la dirección de recojo.", valores };
  if (!/^\d{1,4}$/.test(pedidoMinimo) || Number(pedidoMinimo) < 1) {
    return { error: "El pedido mínimo debe ser de al menos 1 caja.", valores };
  }
  if (!email) return { error: "Escribe tu correo.", valores };
  const errorClave = revisarClave(password);
  if (errorClave) return { error: errorClave, valores };
  if (password !== password2) return { error: "Las contraseñas no coinciden. Escríbelas de nuevo.", valores };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        tipo: "vender",
        nombre,
        whatsapp: `${prefijo}${numero}`,
        nombre_comercial: nombreComercial,
        razon_social: razonSocial,
        ruc,
        direccion_recojo: `${direccion}, ${distrito}`,
        pedido_minimo: pedidoMinimo,
      },
    },
  });
  if (error) return { error: mensajeDeError(error.code), valores };
  if (!data.session) {
    return { mensaje: "Te enviamos un correo para confirmar tu cuenta. Ábrelo y luego ingresa.", valores };
  }

  revalidatePath("/", "layout");
  redirect(rutaInicio("solicitante"));
}
