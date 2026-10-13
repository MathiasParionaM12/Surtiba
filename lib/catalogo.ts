// Ayudas para mostrar productos y precios.

export const CATEGORIAS: Record<string, string> = {
  pisco: "Pisco",
  ron: "Ron",
  gin: "Gin",
  vodka: "Vodka",
  vino: "Vino",
  licor: "Licor",
  coctel_listo: "Cóctel listo",
  otro: "Otro",
};

export type Tramo = { desde_cajas: number; hasta_cajas: number | null; precio_caja_centimos: number };

// [5, 9] -> "5 a 9 cajas" ; [10, null] -> "10 o más cajas" ; [1, 1] -> "1 caja"
export function textoTramo(t: Pick<Tramo, "desde_cajas" | "hasta_cajas">) {
  if (t.hasta_cajas === null) return `${t.desde_cajas} o más cajas`;
  if (t.desde_cajas === t.hasta_cajas) return `${t.desde_cajas} ${t.desde_cajas === 1 ? "caja" : "cajas"}`;
  return `${t.desde_cajas} a ${t.hasta_cajas} cajas`;
}

export function ordenarTramos<T extends { desde_cajas: number }>(tramos: T[]) {
  return [...tramos].sort((a, b) => a.desde_cajas - b.desde_cajas);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function esUuid(valor: string | undefined): valor is string {
  return !!valor && UUID.test(valor);
}
