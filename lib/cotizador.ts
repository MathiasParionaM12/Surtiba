// Cálculo del cotizador de evento (corre en el servidor; ver acciones-cotizador.ts).
//   tragos por persona = tragos de la 1.ª hora + (horas - 1) × tragos por hora siguiente
//   tragos de cada receta = invitados × tragos por persona × % / 100
//   ml de licor = tragos × ml por trago
//   cajas = ml ÷ (ml de la botella × botellas por caja), redondeado hacia arriba
// Si dos tragos usan el mismo producto (ej. pisco sour y chilcano), se suman antes de redondear.

import type { Tramo } from "@/lib/catalogo";

export const LIMITES = { invitadosMax: 5000, horasMax: 12, tragosMax: 8, cajasMax: 999 };

export type Receta = { id: string; nombre: string; categoria: string; ml_por_trago: number };
export type TipoEvento = {
  id: string;
  nombre: string;
  tragos_primera_hora: number;
  tragos_hora_siguiente: number;
  mezcla: { receta_id: string; porcentaje: number }[];
};

// Lo que manda la pantalla: nunca precios
export type EntradaCotizador = {
  tipoEventoId: string;
  invitados: number;
  horas: number;
  tragos: { recetaId: string; porcentaje: number; productoId?: string }[];
  cajasManual?: Record<string, number>; // producto_id -> cajas que eligió la persona (reemplaza lo sugerido)
};

// Producto que puede entrar en una cotización. Sin sesión: solo el primer tramo y sin stock.
export type ProductoCotizable = {
  id: string;
  nombre: string;
  marca: string;
  marcaId: string;
  categoria: string;
  ml: number;
  unidades: number;
  tramos: Tramo[];
  stock: number | null;
  pedidoMinimo: number;
};

export type LineaTrago = {
  recetaId: string;
  receta: string;
  porcentaje: number;
  tragos: number;
  productoId: string | null; // el elegido o el recomendado (null si no hay productos de ese licor)
  recomendado: boolean;
  opciones: { id: string; nombre: string; marca: string }[];
};

export type LineaProducto = {
  productoId: string;
  nombre: string;
  marca: string;
  marcaId: string;
  para: string[]; // tragos que cubre
  botellas: number;
  cajasSugeridas: number;
  cajas: number; // las sugeridas, o las que eligió la persona
  precioCaja: number; // céntimos. Con sesión: el del tramo según las cajas. Sin sesión: el del primer tramo
  subtotal: number | null; // solo con sesión
  stock: number | null;
};

export type AvisoMinimo = { marcaId: string; marca: string; minimo: number; cajas: number; falta: number; productoId: string };

export type ResultadoCotizacion = {
  tragosPorPersona: number;
  tragosTotales: number;
  sumaPorcentajes: number;
  tragos: LineaTrago[];
  productos: LineaProducto[];
  minimos: AvisoMinimo[];
  total: number | null; // solo con sesión
  conSesion: boolean;
};

export function tragosPorPersona(tipo: Pick<TipoEvento, "tragos_primera_hora" | "tragos_hora_siguiente">, horas: number) {
  return tipo.tragos_primera_hora + Math.max(0, horas - 1) * tipo.tragos_hora_siguiente;
}

export function precioPara(tramos: Tramo[], cajas: number) {
  const tramo = tramos.find((t) => cajas >= t.desde_cajas && (t.hasta_cajas === null || cajas <= t.hasta_cajas));
  return tramo?.precio_caja_centimos ?? null;
}

const cajasPara = (ml: number, p: ProductoCotizable) => Math.ceil(ml / (p.ml * p.unidades));

// Recomienda el producto que cubre esos ml al menor costo. Con sesión, primero los que tienen stock.
function recomendar(candidatos: ProductoCotizable[], ml: number, conSesion: boolean) {
  const evaluados = candidatos.map((p) => {
    const cajas = Math.max(1, cajasPara(ml, p));
    const precio = (conSesion ? precioPara(p.tramos, cajas) : null) ?? p.tramos[0]?.precio_caja_centimos ?? Infinity;
    return { p, alcanza: p.stock === null || p.stock >= cajas, costo: cajas * precio };
  });
  evaluados.sort((a, b) => Number(b.alcanza) - Number(a.alcanza) || a.costo - b.costo || a.p.nombre.localeCompare(b.p.nombre));
  return evaluados[0]?.p ?? null;
}

export function calcular(
  entrada: EntradaCotizador,
  tipo: TipoEvento,
  recetas: Receta[],
  catalogo: ProductoCotizable[],
  conSesion: boolean,
): ResultadoCotizacion {
  const porPersona = tragosPorPersona(tipo, entrada.horas);
  const tragosTotales = Math.round(entrada.invitados * porPersona);
  const recetaPorId = new Map(recetas.map((r) => [r.id, r]));
  const productoPorId = new Map(catalogo.map((p) => [p.id, p]));

  // 1. Cada trago: cuántos se sirven y qué producto lo cubre
  const mlPorProducto = new Map<string, { ml: number; para: string[] }>();
  const tragos: LineaTrago[] = [];
  for (const t of entrada.tragos) {
    const receta = recetaPorId.get(t.recetaId);
    if (!receta) continue;
    const cantidad = Math.round(entrada.invitados * porPersona * (t.porcentaje / 100));
    const ml = cantidad * receta.ml_por_trago;
    const candidatos = catalogo.filter((p) => p.categoria === receta.categoria);
    const elegido = t.productoId ? candidatos.find((p) => p.id === t.productoId) : undefined;
    const producto = elegido ?? recomendar(candidatos, ml, conSesion);

    tragos.push({
      recetaId: receta.id,
      receta: receta.nombre,
      porcentaje: t.porcentaje,
      tragos: cantidad,
      productoId: producto?.id ?? null,
      recomendado: !elegido,
      opciones: candidatos.map((p) => ({ id: p.id, nombre: p.nombre, marca: p.marca })),
    });

    if (producto && ml > 0) {
      const acumulado = mlPorProducto.get(producto.id) ?? { ml: 0, para: [] };
      acumulado.ml += ml;
      acumulado.para.push(receta.nombre);
      mlPorProducto.set(producto.id, acumulado);
    }
  }

  // 2. Cada producto: botellas, cajas y precio según la escala
  const productos: LineaProducto[] = [];
  for (const [id, { ml, para }] of mlPorProducto) {
    const p = productoPorId.get(id)!;
    const cajasSugeridas = cajasPara(ml, p);
    const manual = entrada.cajasManual?.[id];
    const cajas = manual && manual >= 1 ? Math.min(manual, LIMITES.cajasMax) : cajasSugeridas;
    const precioCaja = (conSesion ? precioPara(p.tramos, cajas) : null) ?? p.tramos[0]?.precio_caja_centimos ?? 0;
    productos.push({
      productoId: id,
      nombre: p.nombre,
      marca: p.marca,
      marcaId: p.marcaId,
      para,
      botellas: Math.ceil(ml / p.ml),
      cajasSugeridas,
      cajas,
      precioCaja,
      subtotal: conSesion ? cajas * precioCaja : null,
      stock: p.stock,
    });
  }
  productos.sort((a, b) => a.marca.localeCompare(b.marca) || a.nombre.localeCompare(b.nombre));

  // 3. Pedido mínimo de cada marca (se avisa ya, sin esperar al carrito)
  const porMarca = new Map<string, { marca: string; cajas: number; minimo: number; mayor: LineaProducto }>();
  for (const l of productos) {
    const m = porMarca.get(l.marcaId);
    if (m) {
      m.cajas += l.cajas;
      if (l.cajas > m.mayor.cajas) m.mayor = l;
    } else {
      porMarca.set(l.marcaId, { marca: l.marca, cajas: l.cajas, minimo: productoPorId.get(l.productoId)!.pedidoMinimo, mayor: l });
    }
  }
  const minimos: AvisoMinimo[] = [...porMarca.entries()]
    .filter(([, m]) => m.cajas < m.minimo)
    .map(([marcaId, m]) => ({ marcaId, marca: m.marca, minimo: m.minimo, cajas: m.cajas, falta: m.minimo - m.cajas, productoId: m.mayor.productoId }));

  return {
    tragosPorPersona: porPersona,
    tragosTotales,
    sumaPorcentajes: entrada.tragos.reduce((s, t) => s + t.porcentaje, 0),
    tragos,
    productos,
    minimos,
    total: conSesion ? productos.reduce((s, l) => s + (l.subtotal ?? 0), 0) : null,
    conSesion,
  };
}
