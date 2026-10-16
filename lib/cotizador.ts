// Cálculo del cotizador de evento (corre en el servidor; ver cotizador-datos.ts).
// El evento se divide en momentos que van uno tras otro:
//   bienvenida → cena con vino → brindis → fiesta (barra libre, ocupa las horas que quedan)
// Solo toman alcohol: invitados - los que no toman. Cada momento:
//   bienvenida = toman × tragos por hora × horas × factor
//   cena       = toman × copas por hora × horas × factor
//   brindis    = toman × copas de brindis
//   fiesta     = toman × factor × (1.ª hora más fuerte si es lo primero del evento + 1 trago por hora)
//   factor = perfil (tranquilo / normal / fuerte) × horario (de día se toma menos)
// La barra reparte sus tragos por nivel: principal 3, secundario 2, ocasional 1.
// A todo se le suma el margen de seguridad. Cajas = ml ÷ (ml de la botella × botellas por caja), hacia arriba.
// Todos los valores salen de parametros_cotizador: SUPUESTOS POR VALIDAR CON CATERINGS.

import type { Tramo } from "@/lib/catalogo";

export const LIMITES = { invitadosMax: 5000, horasMax: 12, barraMax: 8, cajasMax: 999 };

export type Nivel = "principal" | "secundario" | "ocasional";
export type Perfil = "tranquilo" | "normal" | "fuerte";
export const PESO: Record<Nivel, number> = { principal: 3, secundario: 2, ocasional: 1 };
export const NIVELES: { valor: Nivel; texto: string }[] = [
  { valor: "principal", texto: "Principal" },
  { valor: "secundario", texto: "Secundario" },
  { valor: "ocasional", texto: "Ocasional" },
];
export const PERFILES: { valor: Perfil; texto: string; ayuda: string }[] = [
  { valor: "tranquilo", texto: "Tranquilo", ayuda: "Evento formal o de trabajo" },
  { valor: "normal", texto: "Normal", ayuda: "La mayoría de eventos" },
  { valor: "fuerte", texto: "Fuerte", ayuda: "Público que toma bastante" },
];

export type Parametros = {
  no_toman_pct: number;
  factor_tranquilo: number;
  factor_normal: number;
  factor_fuerte: number;
  factor_dia: number;
  bienvenida_tragos_hora: number;
  fiesta_primera_hora: number;
  fiesta_tragos_hora: number;
  cena_copas_hora: number;
  brindis_copas: number;
  cena_receta_id: string | null;
  brindis_receta_id: string | null;
  hielo_kg_persona_hora: number;
  factor_calor: number;
  sin_alcohol_l_hora_toma: number;
  sin_alcohol_l_hora_no_toma: number;
  margen_pct: number;
};

export type Receta = {
  id: string;
  nombre: string;
  categoria: string;
  ml_por_trago: number;
  mezclador: string | null;
  mezclador_ml: number;
  limones: number;
  jarabe_ml: number;
};

export type TipoEvento = {
  id: string;
  nombre: string;
  horas: number;
  perfil: Perfil;
  bienvenida: boolean;
  bienvenida_horas: number;
  bienvenida_receta_id: string | null;
  brindis: boolean;
  cena: boolean;
  cena_horas: number;
  barra: { receta_id: string; nivel: Nivel }[];
};

// Lo que manda la pantalla: nunca precios
export type EntradaCotizador = {
  nombre: string;
  fecha: string; // AAAA-MM-DD o vacío
  tipoEventoId: string;
  invitados: number;
  noToman: number;
  horaInicio: string; // "19:00"
  horas: number;
  aireLibre: boolean;
  perfil: Perfil;
  margen: number; // %
  bienvenida: { activo: boolean; horas: number; recetaId: string | null }; // null = los tragos de la barra
  cena: { activo: boolean; horas: number };
  brindis: { activo: boolean };
  barra: { recetaId: string; nivel: Nivel }[];
  productos: Record<string, string>; // receta_id -> producto_id que eligió la persona
  cajasManual: Record<string, number>; // producto_id -> cajas que eligió la persona
};

// Producto que puede entrar en una cotización
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

export type Momento = {
  clave: "bienvenida" | "cena" | "brindis" | "fiesta";
  nombre: string;
  desde: string;
  hasta: string | null; // el brindis es un instante
  horas: number;
  tragos: number;
  detalle: { receta: string; tragos: number }[];
};

export type LineaTrago = {
  recetaId: string;
  receta: string;
  tragos: number;
  productoId: string | null; // el elegido o el recomendado (null si Surtiba no tiene ese licor)
  recomendado: boolean;
  opciones: { id: string; nombre: string; marca: string }[];
};

export type LineaProducto = {
  productoId: string;
  nombre: string;
  marca: string;
  marcaId: string;
  para: string[];
  botellas: number;
  cajasSugeridas: number;
  cajas: number;
  precioCaja: number; // céntimos, según la escala de las cajas
  subtotal: number;
  stock: number | null;
};

export type Insumo = { nombre: string; cantidad: number; unidad: string; nota?: string };
export type AvisoMinimo = { marcaId: string; marca: string; minimo: number; cajas: number; falta: number; productoId: string };

export type ResultadoCotizacion = {
  toman: number;
  tragosTotales: number;
  tragosPorPersona: number; // por invitado que toma
  momentos: Momento[];
  tragos: LineaTrago[];
  productos: LineaProducto[];
  minimos: AvisoMinimo[];
  insumos: Insumo[];
  total: number;
  porInvitado: number;
  avisos: string[];
};

export function precioPara(tramos: Tramo[], cajas: number) {
  const tramo = tramos.find((t) => cajas >= t.desde_cajas && (t.hasta_cajas === null || cajas <= t.hasta_cajas));
  return tramo?.precio_caja_centimos ?? null;
}

// "19:00" + 1.5 horas -> "20:30"
export function sumarHoras(hora: string, horas: number) {
  const [h, m] = hora.split(":").map(Number);
  const minutos = ((h * 60 + m + Math.round(horas * 60)) % 1440 + 1440) % 1440;
  return `${String(Math.floor(minutos / 60)).padStart(2, "0")}:${String(minutos % 60).padStart(2, "0")}`;
}

// Horas que le quedan a la fiesta después de la bienvenida y la cena
export function horasDeFiesta(e: Pick<EntradaCotizador, "horas" | "bienvenida" | "cena">) {
  return e.horas - (e.bienvenida.activo ? e.bienvenida.horas : 0) - (e.cena.activo ? e.cena.horas : 0);
}

// Reparte tragos entre los de la barra según su nivel
export function repartoBarra(barra: EntradaCotizador["barra"]) {
  const total = barra.reduce((s, b) => s + PESO[b.nivel], 0);
  return barra.map((b) => ({ recetaId: b.recetaId, parte: total ? PESO[b.nivel] / total : 0 }));
}

// Redondea hacia arriba sin que un error de decimales (121.0000001) sume una unidad de más
const arriba = (x: number) => Math.ceil(x - 1e-9);

const cajasPara = (ml: number, p: ProductoCotizable) => arriba(ml / (p.ml * p.unidades));

// Recomienda el producto que cubre esos ml al menor costo; primero los que tienen stock suficiente
function recomendar(candidatos: ProductoCotizable[], ml: number) {
  const evaluados = candidatos.map((p) => {
    const cajas = Math.max(1, cajasPara(ml, p));
    const precio = precioPara(p.tramos, cajas) ?? p.tramos[0]?.precio_caja_centimos ?? Infinity;
    return { p, alcanza: p.stock === null || p.stock >= cajas, costo: cajas * precio };
  });
  evaluados.sort((a, b) => Number(b.alcanza) - Number(a.alcanza) || a.costo - b.costo || a.p.nombre.localeCompare(b.p.nombre));
  return evaluados[0]?.p ?? null;
}

export function calcular(
  e: EntradaCotizador,
  par: Parametros,
  recetas: Receta[],
  catalogo: ProductoCotizable[],
): ResultadoCotizacion {
  const avisos: string[] = [];
  const recetaPorId = new Map(recetas.map((r) => [r.id, r]));
  const productoPorId = new Map(catalogo.map((p) => [p.id, p]));
  const toman = Math.max(0, e.invitados - e.noToman);
  const horaInicio = Number(e.horaInicio.split(":")[0]);
  const deDia = horaInicio >= 6 && horaInicio < 17;
  const factorPerfil = { tranquilo: par.factor_tranquilo, normal: par.factor_normal, fuerte: par.factor_fuerte }[e.perfil];
  const factor = factorPerfil * (deDia ? par.factor_dia : 1);
  const margen = 1 + e.margen / 100;
  const reparto = repartoBarra(e.barra);

  // 1. Momentos, uno tras otro
  const momentos: Momento[] = [];
  const porReceta = new Map<string, number>(); // receta_id -> tragos (con margen)
  const sumar = (recetaId: string, tragos: number) => porReceta.set(recetaId, (porReceta.get(recetaId) ?? 0) + tragos);
  let reloj = e.horaInicio;

  const agregarMomento = (m: Omit<Momento, "detalle">, asignacion: { recetaId: string; parte: number }[]) => {
    const detalle = asignacion
      .filter((a) => recetaPorId.has(a.recetaId) && a.parte > 0)
      .map((a) => {
        sumar(a.recetaId, m.tragos * a.parte);
        return { receta: recetaPorId.get(a.recetaId)!.nombre, tragos: Math.round(m.tragos * a.parte) };
      })
      .sort((a, b) => b.tragos - a.tragos);
    momentos.push({ ...m, tragos: Math.round(m.tragos), detalle });
  };

  if (e.bienvenida.activo) {
    const hasta = sumarHoras(reloj, e.bienvenida.horas);
    const asignacion = e.bienvenida.recetaId ? [{ recetaId: e.bienvenida.recetaId, parte: 1 }] : reparto;
    agregarMomento(
      { clave: "bienvenida", nombre: "Bienvenida", desde: reloj, hasta, horas: e.bienvenida.horas,
        tragos: toman * par.bienvenida_tragos_hora * e.bienvenida.horas * factor * margen },
      asignacion,
    );
    reloj = hasta;
  }
  if (e.cena.activo) {
    const hasta = sumarHoras(reloj, e.cena.horas);
    if (!par.cena_receta_id || !recetaPorId.has(par.cena_receta_id)) avisos.push("La cena no tiene un trago configurado. Avísale a Surtiba.");
    agregarMomento(
      { clave: "cena", nombre: "Cena con vino", desde: reloj, hasta, horas: e.cena.horas,
        tragos: toman * par.cena_copas_hora * e.cena.horas * factor * margen },
      par.cena_receta_id ? [{ recetaId: par.cena_receta_id, parte: 1 }] : [],
    );
    reloj = hasta;
  }
  if (e.brindis.activo) {
    if (!par.brindis_receta_id || !recetaPorId.has(par.brindis_receta_id)) avisos.push("El brindis no tiene un trago configurado. Avísale a Surtiba.");
    agregarMomento(
      { clave: "brindis", nombre: "Brindis", desde: reloj, hasta: null, horas: 0, tragos: toman * par.brindis_copas * margen },
      par.brindis_receta_id ? [{ recetaId: par.brindis_receta_id, parte: 1 }] : [],
    );
  }
  const fiesta = horasDeFiesta(e);
  if (fiesta < 0) avisos.push("La bienvenida y la cena duran más que todo el evento. Ajusta las horas.");
  if (fiesta > 0) {
    const esLoPrimero = !e.bienvenida.activo && !e.cena.activo;
    const porPersona = esLoPrimero
      ? Math.min(1, fiesta) * par.fiesta_primera_hora + Math.max(0, fiesta - 1) * par.fiesta_tragos_hora
      : fiesta * par.fiesta_tragos_hora;
    if (e.barra.length === 0) avisos.push("Elige al menos un trago para la barra de la fiesta.");
    agregarMomento(
      { clave: "fiesta", nombre: "Fiesta (barra libre)", desde: reloj, hasta: sumarHoras(reloj, fiesta), horas: fiesta,
        tragos: toman * porPersona * factor * margen },
      reparto,
    );
  }

  // 2. Cada trago: cuántos (hacia arriba) y qué producto lo cubre
  const tragos: LineaTrago[] = [];
  const mlPorProducto = new Map<string, { ml: number; para: string[] }>();
  for (const [recetaId, cantidadExacta] of porReceta) {
    const receta = recetaPorId.get(recetaId)!;
    const cantidad = arriba(cantidadExacta);
    if (cantidad <= 0) continue;
    const candidatos = catalogo.filter((p) => p.categoria === receta.categoria);
    const elegidoId = e.productos[recetaId];
    const elegido = elegidoId ? candidatos.find((p) => p.id === elegidoId) : undefined;
    const ml = cantidad * receta.ml_por_trago;
    const producto = elegido ?? recomendar(candidatos, ml);
    if (!producto) avisos.push(`Por ahora Surtiba no tiene productos para ${receta.nombre.toLowerCase()}.`);

    tragos.push({
      recetaId,
      receta: receta.nombre,
      tragos: cantidad,
      productoId: producto?.id ?? null,
      recomendado: !elegido,
      opciones: candidatos.map((p) => ({ id: p.id, nombre: p.nombre, marca: p.marca })),
    });
    if (producto) {
      const acumulado = mlPorProducto.get(producto.id) ?? { ml: 0, para: [] };
      acumulado.ml += ml;
      acumulado.para.push(receta.nombre);
      mlPorProducto.set(producto.id, acumulado);
    }
  }
  tragos.sort((a, b) => b.tragos - a.tragos);

  // 3. Cada producto: botellas, cajas y precio según la escala
  const productos: LineaProducto[] = [];
  for (const [id, { ml, para }] of mlPorProducto) {
    const p = productoPorId.get(id)!;
    const cajasSugeridas = Math.max(1, cajasPara(ml, p));
    const manual = e.cajasManual[id];
    const cajas = manual && manual >= 1 ? Math.min(manual, LIMITES.cajasMax) : cajasSugeridas;
    const precioCaja = precioPara(p.tramos, cajas) ?? p.tramos[0]?.precio_caja_centimos ?? 0;
    productos.push({
      productoId: id, nombre: p.nombre, marca: p.marca, marcaId: p.marcaId, para,
      botellas: arriba(ml / p.ml), cajasSugeridas, cajas, precioCaja, subtotal: cajas * precioCaja, stock: p.stock,
    });
  }
  productos.sort((a, b) => a.marca.localeCompare(b.marca) || a.nombre.localeCompare(b.nombre));

  // 4. Pedido mínimo de cada marca
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

  // 5. Lo que Surtiba no vende: hielo, agua y gaseosas, mezcladores, limones y jarabe
  const insumos: Insumo[] = [];
  const hielo = arriba(e.invitados * e.horas * par.hielo_kg_persona_hora * (e.aireLibre ? par.factor_calor : 1) * margen);
  if (hielo > 0) insumos.push({ nombre: "Hielo", cantidad: hielo, unidad: "kg", nota: `unas ${arriba(hielo / 5)} bolsas de 5 kg` });
  const agua = arriba((toman * par.sin_alcohol_l_hora_toma + e.noToman * par.sin_alcohol_l_hora_no_toma) * e.horas * margen);
  if (agua > 0) insumos.push({ nombre: "Agua y gaseosas para tomar solas", cantidad: agua, unidad: "litros" });
  const mezcladores = new Map<string, number>();
  let limones = 0;
  let jarabe = 0;
  for (const t of tragos) {
    const r = recetaPorId.get(t.recetaId)!;
    if (r.mezclador && r.mezclador_ml > 0) mezcladores.set(r.mezclador, (mezcladores.get(r.mezclador) ?? 0) + t.tragos * r.mezclador_ml);
    limones += t.tragos * Number(r.limones);
    jarabe += t.tragos * r.jarabe_ml;
  }
  for (const [nombre, ml] of mezcladores) insumos.push({ nombre, cantidad: arriba(ml / 1000), unidad: "litros", nota: "para los tragos" });
  if (limones > 0) insumos.push({ nombre: "Limones", cantidad: arriba(limones), unidad: "unidades" });
  if (jarabe > 0) insumos.push({ nombre: "Jarabe de goma", cantidad: arriba(jarabe / 100) / 10, unidad: "litros" });

  const tragosTotales = tragos.reduce((s, t) => s + t.tragos, 0);
  const total = productos.reduce((s, l) => s + l.subtotal, 0);
  return {
    toman,
    tragosTotales,
    tragosPorPersona: toman ? tragosTotales / toman : 0,
    momentos,
    tragos,
    productos,
    minimos,
    insumos,
    total,
    porInvitado: e.invitados ? Math.round(total / e.invitados) : 0,
    avisos,
  };
}

// Entrada inicial a partir de un tipo de evento
export function entradaDesdeTipo(tipo: TipoEvento, par: Parametros, invitados = 100, base?: Partial<EntradaCotizador>): EntradaCotizador {
  return {
    nombre: base?.nombre ?? "",
    fecha: base?.fecha ?? "",
    tipoEventoId: tipo.id,
    invitados,
    noToman: Math.round((invitados * par.no_toman_pct) / 100),
    horaInicio: base?.horaInicio ?? "19:00",
    horas: tipo.horas,
    aireLibre: base?.aireLibre ?? false,
    perfil: tipo.perfil,
    margen: par.margen_pct,
    bienvenida: { activo: tipo.bienvenida, horas: tipo.bienvenida_horas, recetaId: tipo.bienvenida_receta_id },
    cena: { activo: tipo.cena, horas: tipo.cena_horas },
    brindis: { activo: tipo.brindis },
    barra: tipo.barra.map((b) => ({ recetaId: b.receta_id, nivel: b.nivel })),
    productos: {},
    cajasManual: {},
  };
}
