// Ayudas para mostrar productos y precios.

// Pedido mínimo por marca: pausado el 19-oct-2026 (Mathias). Todas las marcas quedaron en 1 caja y no
// se muestra ni se pide en ninguna pantalla. Para volver a usarlo: true, y que cada marca ponga el suyo.
export const PEDIDO_MINIMO_ACTIVO = false;

export const CATEGORIAS: Record<string, string> = {
  pisco: "Pisco",
  ron: "Ron",
  gin: "Gin",
  vodka: "Vodka",
  vino: "Vino",
  espumante: "Espumante",
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

// Datos que necesita una tarjeta del catálogo
export type ProductoTarjeta = {
  id: string;
  nombre: string;
  marca: string;
  categoria: string;
  ml: number;
  grado: number;
  unidades: number;
  precioCaja: number; // precio del primer tramo, en céntimos
  // Solo con sesión:
  precioMinimo?: number;
  siguienteTramo?: { desde: number; precio: number }; // el primer precio por volumen (ej. desde 5 cajas)
  stock?: number;
  inactivo?: boolean; // solo lo ve el admin: el producto o su marca está desactivado
  favorito?: boolean; // solo compradores: muestra el corazón
  foto?: string | null; // dirección pública de la foto (si tiene)
};

type FilaProducto = {
  id: string;
  nombre: string;
  categoria: string;
  ml: number;
  grado: number;
  unidades_por_caja: number;
  stock_cajas: number;
  foto_url: string | null;
  activo: boolean;
  marcas: { nombre_comercial: string; activa: boolean } | null;
  escalas_precio: { desde_cajas: number; precio_caja_centimos: number }[];
};

// Convierte una fila de "productos" (con su marca y escala) en datos de tarjeta.
// Devuelve null si el producto no tiene precio para 1 caja.
export function aTarjeta(p: FilaProducto, favorito?: boolean): ProductoTarjeta | null {
  const primero = p.escalas_precio.find((e) => e.desde_cajas === 1);
  if (!primero) return null;
  const siguiente = ordenarTramos(p.escalas_precio).find((e) => e.desde_cajas > 1);
  return {
    id: p.id,
    nombre: p.nombre,
    marca: p.marcas?.nombre_comercial ?? "",
    categoria: p.categoria,
    ml: p.ml,
    grado: p.grado,
    unidades: p.unidades_por_caja,
    precioCaja: primero.precio_caja_centimos,
    precioMinimo: Math.min(...p.escalas_precio.map((e) => e.precio_caja_centimos)),
    siguienteTramo: siguiente ? { desde: siguiente.desde_cajas, precio: siguiente.precio_caja_centimos } : undefined,
    stock: p.stock_cajas,
    inactivo: !p.activo || !p.marcas?.activa,
    favorito,
    foto: urlFoto(p.foto_url),
  };
}

// Dirección pública de una foto guardada en Supabase Storage (carpeta "productos")
export function urlFoto(ruta: string | null | undefined) {
  if (!ruta) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/productos/${ruta}`;
}
