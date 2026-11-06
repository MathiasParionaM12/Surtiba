// Días de entrega y anticipación (tabla entregas_config). Solo para el servidor: se guarda en caché y se renueva
// al instante cuando el admin los cambia (updateTag("entregas")). Las reglas de la fecha están en lib/entregas.ts.
import { cacheLife, cacheTag } from "next/cache";
import type { ConfigEntregas } from "@/lib/entregas";
import { clientePublico } from "@/lib/supabase/publico";

export async function configEntregas(): Promise<ConfigEntregas> {
  "use cache";
  cacheLife("hours");
  cacheTag("entregas");
  const { data } = await clientePublico().from("entregas_config").select("dias, corte_dias").single();
  return { dias: data?.dias ?? [2, 4], corteDias: data?.corte_dias ?? 2 };
}
