"use server";

// Acción del cotizador: la pantalla manda el evento y los tragos (nunca precios)
// y el servidor devuelve las cajas sugeridas con los precios que le corresponden a quien mira.

import type { EntradaCotizador, ResultadoCotizacion } from "@/lib/cotizador";
import { cotizarEvento } from "@/lib/cotizador-datos";

export async function cotizar(entrada: EntradaCotizador): Promise<{ resultado?: ResultadoCotizacion; error?: string }> {
  return cotizarEvento(entrada);
}
