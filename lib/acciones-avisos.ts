"use server";

// Avisos de la campana. Los crea la base de datos (supabase/sql/27_avisos.sql); aquí solo se marcan leídos.
import { revalidatePath } from "next/cache";
import { obtenerUsuario } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";

export async function marcarAvisosLeidos() {
  if (!(await obtenerUsuario())) return;
  const supabase = await createClient();
  // RLS: solo cambia los avisos propios, y solo la columna leido_en
  await supabase.from("avisos").update({ leido_en: new Date().toISOString() }).is("leido_en", null);
  revalidatePath("/", "layout");
}
