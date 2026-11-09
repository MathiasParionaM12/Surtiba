// Cálculo del cotizador de evento (corre en el servidor; ver cotizador-datos.ts).
// El evento se divide en momentos que van uno tras otro:
//   bienvenida → cena con vino → brindis → fiesta (barra libre, ocupa las horas que quedan)
// Solo toman alcohol: invitados - menores - adultos que no toman. Cada momento:
//   bienvenida = toman × tragos por hora × horas × factor
//   cena       = toman × copas por hora × horas × factor
//   brindis    = adultos (toman o no: todos levantan la copa) × copas de brindis
//   fiesta     = toman × factor × (1.ª hora más fuerte si es lo primero del evento + 1 trago por hora)
//   factor = perfil (tranquilo / normal / fuerte) × horario (de día se toma menos, salvo que el perfil ya sea
//            "toma poco": no se castiga dos veces, 7-nov-2026)
// La barra reparte sus tragos por nivel: principal 3, secundario 2, ocasional 1.
// A todo se le suma el margen de seguridad. Luego se suman los ingredientes de todos los tragos (recetario):
// lo que vende Surtiba (pisco, ron, vino…) busca su producto; lo demás va a "lo consigues por tu cuenta".
// Los licores y jarabes no tienen categoría propia en el catálogo: se reconocen por el nombre del producto
// ("Jarabe de goma Valle Real" dice "jarabe de goma"; ver ingredientes.palabras).
// Lo que el comprador marca como "lo pone tu cliente" no busca producto: va a su propia lista, en botellas de 750 ml.
// Cajas = ml ÷ (ml de la botella × botellas por caja), hacia arriba.
// Todos los valores salen de parametros_cotizador. Se revisaron con la investigación de docs/investigacion/ (nov-2026).

import type { Tramo } from "@/lib/catalogo";
import { PEDIDO_MINIMO_CAJAS } from "@/lib/catalogo";

const fmt = new Intl.NumberFormat("en-US");

export const LIMITES = { invitadosMax: 5000, horasMax: 12, barraMax: 8, cajasMax: 999, propiosMax: 5, ingredientesMax: 8, cantidadMax: 1000 };

export type Nivel = "principal" | "secundario" | "ocasional";
export type Perfil = "tranquilo" | "normal" | "fuerte";
export const PESO: Record<Nivel, number> = { principal: 3, secundario: 2, ocasional: 1 };
export const NIVELES: { valor: Nivel; texto: string }[] = [
  { valor: "principal", texto: "Principal" },
  { valor: "secundario", texto: "Secundario" },
  { valor: "ocasional", texto: "Ocasional" },
];
export const PERFILES: { valor: Perfil; texto: string; ayuda: string }[] = [
  { valor: "tranquilo", texto: "Toma poco", ayuda: "Evento formal, de trabajo o público mayor" },
  { valor: "normal", texto: "Normal", ayuda: "Público mixto: la mayoría de eventos" },
  { valor: "fuerte", texto: "Toma bastante", ayuda: "Público joven o con ganas de fiesta" },
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
  // Tu precio para el cliente (supuestos, 7-nov-2026). Dinero en céntimos.
  invitados_por_bartender: number;
  precio_bartender_centimos: number; // por hora (desde el 9-nov-2026; antes era por evento)
  bartender_horas_minimo: number;
  vasos_por_toma: number;
  precio_vaso_centimos: number;
  precio_bolsa_hielo_centimos: number;
  precio_litro_sin_alcohol_centimos: number; // agua y gaseosas para tomar solas
};

// Ingrediente de un trago. "categoria" = la categoría de producto de Surtiba que lo cubre (null = no lo vende)
export type IngredienteReceta = {
  id: string;
  nombre: string;
  unidad: "ml" | "unidad" | "g";
  categoria: string | null;
  orden: number;
  cantidad: number; // por trago
  // Para "lo que compras por tu cuenta" (9-nov-2026): cuánto trae lo que se compra (750 ml, 1 unidad…) y su precio
  // supuesto en céntimos. Los ingredientes escritos a mano no los tienen.
  presentacion?: number;
  precio?: number;
  palabras?: string[]; // cómo se reconoce su producto por el nombre (licores y jarabes)
};

export type Receta = {
  id: string;
  nombre: string;
  categoria: string; // licor principal (para agrupar en pantalla)
  ingredientes: IngredienteReceta[];
};

// Ingrediente de la lista de Surtiba (para elegirlo al crear un trago)
export type Ingrediente = Omit<IngredienteReceta, "cantidad">;

// Un trago que armó el comprador ("Crear mi trago"). Vive solo dentro de su cotización.
// El servidor lo revisa y pone él la categoría de cada ingrediente (ver limpiarEntrada).
export type TragoPropio = { id: string; nombre: string; ingredientes: IngredienteReceta[] };

// Para buscar sin importar mayúsculas ni tildes: "Maracuyá" -> "maracuya"
export const normalizar = (t: string) =>
  t.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();

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
  noToman: number; // adultos que no toman alcohol
  menores?: number; // menores de edad: no toman ni brindan (las cotizaciones viejas no lo tienen = 0)
  horaInicio: string; // "19:00"
  horas: number;
  aireLibre: boolean;
  perfil: Perfil;
  margen: number; // %
  bienvenida: { activo: boolean; horas: number; recetaId: string | null }; // null = los tragos de la barra
  cena: { activo: boolean; horas: number };
  brindis: { activo: boolean };
  barra: { recetaId: string; nivel: Nivel }[]; // recetaId puede ser de un trago propio ("propio-…")
  propios: TragoPropio[];
  productos: Record<string, string>; // ingrediente_id -> producto_id que eligió la persona
  cajasManual: Record<string, number>; // producto_id -> cajas que eligió la persona
  clientePone?: string[]; // ingrediente_id de los licores que compra el cliente final (no van al pedido)
  reventa?: Reventa; // lo que el comprador le cobra a su cliente final
};

// "Tu precio para el cliente" (7-nov-2026). Son los números del comprador, no precios de Surtiba:
//   costo  = bebidas de Surtiba + otros costos (bartenders, cristalería, hielo con precio supuesto, y los que agregue)
//   precio = costo × (1 + ganancia %)
// Dinero en céntimos (enteros). Lo calcula el servidor igual que todo lo demás.
//   Los sugeridos son los de servicio (bartender, cristalería, hielo) y uno por cada cosa que el comprador consigue
//   por su cuenta ("insumo:<ingrediente>", 9-nov-2026): ron, gaseosas, limones… con un precio supuesto de Surtiba.
export type ClaveSugerida = "bartender" | "cristaleria" | "hielo";
export const SUGERIDOS: ClaveSugerida[] = ["bartender", "cristaleria", "hielo"];
export const CLAVE_INSUMO = /^insumo:(agua|[0-9a-f-]{36}|libre-[a-z0-9-]{1,30})$/;
export const esClaveSugerida = (k: string) => (SUGERIDOS as string[]).includes(k) || CLAVE_INSUMO.test(k);
export const LIMITES_REVENTA = { otrosMax: 8, cantidadMax: 100000, precioMax: 10000000, gananciaMax: 300, conceptoMax: 40, sugeridosMax: 60 };
export type OtroCosto = { id: string; concepto: string; cantidad: number; precio: number };
export type Reventa = {
  ganancia: number | null; // % sobre el costo; null = todavía no la pone
  quitados: string[]; // costos sugeridos que no quiere (bartender, cristaleria, hielo o insumo:…)
  ajustes: Record<string, { cantidad?: number; precio?: number }>; // lo que cambió de los sugeridos
  otros: OtroCosto[];
};
export const REVENTA_VACIA: Reventa = { ganancia: null, quitados: [], ajustes: {}, otros: [] };
export type LineaCosto = {
  clave: string; // "bartender", "cristaleria", "hielo" o el id de un costo agregado
  concepto: string;
  nota?: string;
  cantidad: number;
  precio: number; // céntimos por unidad
  subtotal: number;
  sugerida: boolean; // es uno de los costos sugeridos
  cantidadSugerida?: number;
  precioSupuesto?: number;
  grupo?: "servicio" | "insumo"; // insumo = lo que compra por su cuenta (las cotizaciones viejas no lo tienen)
  incluye?: string; // cómo se lee en el PDF para su cliente, sin precios: "2 bartenders durante 5 horas"
};
export type ResultadoReventa = {
  lineas: LineaCosto[];
  quitados: { clave: string; concepto: string }[];
  bebidas: number; // lo de Surtiba
  costo: number; // bebidas + otros costos
  ganancia: number | null;
  gananciaMonto: number;
  precio: number; // lo que cobra a su cliente
  porInvitado: number;
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

// lleva: "pisco 90 ml · limón 2 unid." (por trago); propio: lo creó el comprador
export type LineaTrago = { recetaId: string; receta: string; tragos: number; lleva: string; propio: boolean };

// Un ingrediente que vende Surtiba, con cuánto se necesita y qué producto lo cubre
export type LineaIngrediente = {
  ingredienteId: string;
  nombre: string;
  ml: number; // total del evento (con margen)
  para: string[]; // tragos que lo usan
  productoId: string | null; // el elegido o el recomendado (null si no hay o si hay que elegirlo)
  recomendado: boolean;
  puedeRecomendar: boolean;
  licor: boolean; // false en jarabes y amargos: no se ofrecen en "¿Tu cliente pone algún licor?"
  opciones: { id: string; nombre: string; marca: string }[];
};

// Un licor que pone el cliente final del comprador: no entra al pedido ni al total
export const ML_BOTELLA_CLIENTE = 750;
export type LineaCliente = { ingredienteId: string; nombre: string; ml: number; botellas: number; para: string[] };

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

// deSurtiba: es de una categoría que vende Surtiba, pero no hay producto (o falta elegirlo)
export type Insumo = { nombre: string; cantidad: number; unidad: string; nota?: string; deSurtiba?: boolean };

export type ResultadoCotizacion = {
  toman: number;
  tragosTotales: number;
  tragosPorPersona: number; // por invitado que toma
  momentos: Momento[];
  tragos: LineaTrago[];
  ingredientes: LineaIngrediente[]; // lo que vende Surtiba
  productos: LineaProducto[];
  clientePone: LineaCliente[];
  reventa: ResultadoReventa;
  faltaMinimo: number; // cajas que faltan para el pedido mínimo de Surtiba (3 en total)
  productoMayor: string | null; // el producto con más cajas: ahí se suben las que faltan
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

// "Tragos que lo usan" en texto: "pisco sour, chilcano y maracuyá sour"
const lista = (nombres: string[]) => {
  const n = nombres.map((x) => x.toLowerCase());
  return n.length > 1 ? `${n.slice(0, -1).join(", ")} y ${n.at(-1)}` : (n[0] ?? "");
};

// Cantidad fácil de leer: 1,250 ml -> 1.3 litros; 2,400 g -> 2.4 kg; 37.5 limones -> 38 unidades
export function cantidadLegible(unidad: IngredienteReceta["unidad"], total: number): { cantidad: number; unidad: string } {
  if (unidad === "unidad") return { cantidad: arriba(total), unidad: "unidades" };
  if (unidad === "g") return total >= 1000 ? { cantidad: arriba(total / 100) / 10, unidad: "kg" } : { cantidad: arriba(total), unidad: "g" };
  return total >= 1000 ? { cantidad: arriba(total / 100) / 10, unidad: "litros" } : { cantidad: arriba(total), unidad: "ml" };
}

// Productos que cubren un ingrediente. Pisco, ron, vino…: los de su categoría. Licores y jarabes ("licor" y "otro"):
// los de esas categorías cuyo nombre dice alguna de sus palabras ("Licor de menta X" dice "menta").
const GENERICAS = new Set(["licor", "otro"]);
function candidatosDe(ing: IngredienteReceta, catalogo: ProductoCotizable[]) {
  if (!ing.categoria || !GENERICAS.has(ing.categoria)) return catalogo.filter((p) => p.categoria === ing.categoria);
  const palabras = (ing.palabras?.length ? ing.palabras : [ing.nombre]).map(normalizar).filter(Boolean);
  return catalogo.filter((p) => GENERICAS.has(p.categoria) && palabras.some((w) => normalizar(p.nombre).includes(w)));
}

// "1 bartender", "2 bartenders"
const plural = (n: number, uno: string, varios: string) => `${fmt.format(n)} ${n === 1 ? uno : varios}`;

// Cómo se compra un ingrediente: 750 ml -> botella(s) de 750 ml; 1000 ml -> litro(s); 1 unidad -> unidad(es)
export function unidadDeCompra(unidad: IngredienteReceta["unidad"], presentacion: number): [string, string] {
  if (unidad === "unidad") return presentacion === 1 ? ["unidad", "unidades"] : [`paquete de ${presentacion}`, `paquetes de ${presentacion}`];
  if (unidad === "g") return presentacion === 1000 ? ["kg", "kg"] : [`paquete de ${presentacion} g`, `paquetes de ${presentacion} g`];
  if (presentacion === 1000) return ["litro", "litros"];
  if (presentacion > 1000) return [`botella de ${presentacion / 1000} litros`, `botellas de ${presentacion / 1000} litros`];
  if (presentacion >= 700) return [`botella de ${presentacion} ml`, `botellas de ${presentacion} ml`];
  return [`envase de ${presentacion} ml`, `envases de ${presentacion} ml`];
}

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
  // Los tragos propios del comprador se calculan igual que los del recetario
  const propios: Receta[] = (e.propios ?? []).map((t) => ({ id: t.id, nombre: t.nombre, categoria: "otro", ingredientes: t.ingredientes }));
  const recetaPorId = new Map([...recetas, ...propios].map((r) => [r.id, r]));
  const productoPorId = new Map(catalogo.map((p) => [p.id, p]));
  const menores = Math.min(Math.max(0, e.menores ?? 0), e.invitados);
  const adultos = e.invitados - menores;
  const toman = Math.max(0, adultos - e.noToman);
  const horaInicio = Number(e.horaInicio.split(":")[0]);
  const deDia = horaInicio >= 6 && horaInicio < 17;
  const factorPerfil = { tranquilo: par.factor_tranquilo, normal: par.factor_normal, fuerte: par.factor_fuerte }[e.perfil];
  // De día se toma menos, pero si el público ya es "toma poco" no se castiga dos veces (antes daba ×0.64)
  const factor = factorPerfil * (deDia && e.perfil !== "tranquilo" ? par.factor_dia : 1);
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
        return { receta: recetaPorId.get(a.recetaId)!.nombre, tragos: arriba(m.tragos * a.parte) };
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
      { clave: "brindis", nombre: "Brindis", desde: reloj, hasta: null, horas: 0, tragos: adultos * par.brindis_copas * margen },
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

  // 2. Cada trago: cuántos (hacia arriba), y sus ingredientes sumados para todo el evento
  const tragos: LineaTrago[] = [];
  const porIngrediente = new Map<string, { ing: IngredienteReceta; total: number; para: string[] }>();
  for (const [recetaId, cantidadExacta] of porReceta) {
    const receta = recetaPorId.get(recetaId)!;
    const cantidad = arriba(cantidadExacta);
    if (cantidad <= 0) continue;
    tragos.push({
      recetaId,
      receta: receta.nombre,
      tragos: cantidad,
      lleva: receta.ingredientes.map((i) => `${i.nombre.toLowerCase()} ${i.cantidad} ${i.unidad === "unidad" ? "unid." : i.unidad}`).join(" · "),
      propio: recetaId.startsWith("propio-"),
    });
    for (const ing of receta.ingredientes) {
      const acumulado = porIngrediente.get(ing.id) ?? { ing, total: 0, para: [] };
      acumulado.total += cantidad * ing.cantidad;
      acumulado.para.push(receta.nombre);
      porIngrediente.set(ing.id, acumulado);
    }
  }
  tragos.sort((a, b) => b.tragos - a.tragos);

  // Lo que vende Surtiba busca su producto; lo demás va a "lo consigues por tu cuenta"
  const ingredientes: LineaIngrediente[] = [];
  const porTuCuenta: (Insumo & { orden: number })[] = [];
  const pone = new Set(e.clientePone ?? []);
  // Lo que compra por su cuenta, para sumarlo a su costo con el precio supuesto
  const comprasPropias: { id: string; nombre: string; unidad: IngredienteReceta["unidad"]; total: number; presentacion: number; precio: number; para: string[] }[] = [];
  const comprar = (ing: IngredienteReceta, total: number, para: string[]) =>
    comprasPropias.push({
      id: ing.id, nombre: ing.nombre, unidad: ing.unidad, total, para,
      presentacion: ing.presentacion && ing.presentacion > 0 ? ing.presentacion : ing.unidad === "unidad" ? 1 : 1000,
      precio: ing.precio ?? 0,
    });
  const clientePone: LineaCliente[] = [];
  const mlPorProducto = new Map<string, { ml: number; para: string[] }>();
  for (const [id, { ing, total, para }] of porIngrediente) {
    const candidatos = ing.categoria && ing.unidad === "ml" ? candidatosDe(ing, catalogo) : [];
    if (!ing.categoria || ing.unidad !== "ml") {
      porTuCuenta.push({ nombre: ing.nombre, ...cantidadLegible(ing.unidad, total), nota: `para ${lista(para)}`, orden: ing.orden });
      comprar(ing, total, para);
      continue;
    }
    // Un jarabe o amargo que Surtiba no tiene se consigue por tu cuenta, sin alarma
    if (candidatos.length === 0 && ing.categoria === "otro") {
      porTuCuenta.push({ nombre: ing.nombre, ...cantidadLegible("ml", total), nota: `para ${lista(para)}`, orden: ing.orden });
      comprar(ing, total, para);
      continue;
    }
    if (pone.has(id)) {
      clientePone.push({ ingredienteId: id, nombre: ing.nombre, ml: total, botellas: arriba(total / ML_BOTELLA_CLIENTE), para });
      continue;
    }
    const elegidoId = e.productos[id];
    const elegido = elegidoId ? candidatos.find((p) => p.id === elegidoId) : undefined;
    // Los licores se buscan por nombre (candidatosDe): el de menta nunca recomienda un vermouth
    const producto = elegido ?? recomendar(candidatos, total);
    ingredientes.push({
      ingredienteId: id,
      nombre: ing.nombre,
      ml: total,
      para,
      productoId: producto?.id ?? null,
      recomendado: !elegido && !!producto,
      puedeRecomendar: true,
      licor: ing.categoria !== "otro",
      opciones: candidatos.map((p) => ({ id: p.id, nombre: p.nombre, marca: p.marca })),
    });
    if (producto) {
      const acumulado = mlPorProducto.get(producto.id) ?? { ml: 0, para: [] };
      acumulado.ml += total;
      acumulado.para.push(...para.filter((x) => !acumulado.para.includes(x)));
      mlPorProducto.set(producto.id, acumulado);
    } else {
      const nota = candidatos.length > 0 ? "elige un producto de Surtiba arriba o consíguelo por tu cuenta" : "Surtiba no lo tiene por ahora";
      porTuCuenta.push({ nombre: ing.nombre, ...cantidadLegible("ml", total), nota, orden: ing.orden, deSurtiba: true });
      comprar(ing, total, para);
    }
  }
  ingredientes.sort((a, b) => b.ml - a.ml);
  clientePone.sort((a, b) => b.ml - a.ml);

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

  // 4. Pedido mínimo: 3 cajas en total, de cualquier marca
  const cajasTotales = productos.reduce((s, l) => s + l.cajas, 0);
  const faltaMinimo = productos.length > 0 ? Math.max(0, PEDIDO_MINIMO_CAJAS - cajasTotales) : 0;
  const productoMayor = productos.reduce<LineaProducto | null>((m, l) => (!m || l.cajas > m.cajas ? l : m), null)?.productoId ?? null;

  // 5. Lo que consigues por tu cuenta: hielo, agua y gaseosas, y los ingredientes que Surtiba no vende
  const insumos: Insumo[] = [];
  const hielo = arriba(e.invitados * e.horas * par.hielo_kg_persona_hora * (e.aireLibre ? par.factor_calor : 1) * margen);
  // En Lima el hielo se vende en bolsas de 3 kg (algunos mayoristas piden un mínimo de bolsas)
  if (hielo > 0) insumos.push({ nombre: "Hielo", cantidad: hielo, unidad: "kg", nota: `${arriba(hielo / 3)} bolsas de 3 kg` });
  const aguaInsumo = arriba((toman * par.sin_alcohol_l_hora_toma + (e.noToman + menores) * par.sin_alcohol_l_hora_no_toma) * e.horas * margen);
  if (aguaInsumo > 0) insumos.push({ nombre: "Agua y gaseosas para tomar solas", cantidad: aguaInsumo, unidad: "litros" });
  porTuCuenta.sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre));
  for (const i of porTuCuenta) insumos.push({ nombre: i.nombre, cantidad: i.cantidad, unidad: i.unidad, nota: i.nota, deSurtiba: i.deSurtiba });

  const tragosTotales = tragos.reduce((s, t) => s + t.tragos, 0);
  const total = productos.reduce((s, l) => s + l.subtotal, 0);

  // 6. Tu precio para el cliente: costos sugeridos (con precio supuesto, editables) + los que agregó + su ganancia
  const rv = e.reventa ?? REVENTA_VACIA;
  const copasVino = e.cena.activo ? toman : 0;
  const copasEspumante = e.brindis.activo ? adultos : 0;
  const vasos = arriba(toman * par.vasos_por_toma);
  // Bartender: se paga por hora, con un mínimo de horas. Cantidad = horas de bartender (bartenders × horas)
  const bartenders = toman > 0 ? Math.ceil(toman / par.invitados_por_bartender) : 0;
  const horasBartender = Math.max(par.bartender_horas_minimo, e.horas);
  const sugeridos: Record<ClaveSugerida, Omit<LineaCosto, "subtotal" | "sugerida" | "clave">> = {
    bartender: {
      concepto: "Bartenders",
      nota: `${plural(bartenders, "bartender", "bartenders")} × ${horasBartender} horas${e.horas < par.bartender_horas_minimo ? ` (mínimo ${par.bartender_horas_minimo})` : ""} · 1 por cada ${par.invitados_por_bartender} personas que toman · precio por hora`,
      cantidad: bartenders * horasBartender,
      precio: par.precio_bartender_centimos,
    },
    cristaleria: {
      concepto: "Cristalería (alquiler)",
      nota: [`${fmt.format(vasos)} vasos`, copasVino && `${fmt.format(copasVino)} copas de vino`, copasEspumante && `${fmt.format(copasEspumante)} copas de espumante`]
        .filter(Boolean)
        .join(" · "),
      cantidad: vasos + copasVino + copasEspumante,
      precio: par.precio_vaso_centimos,
    },
    hielo: { concepto: "Hielo", nota: "bolsas de 3 kg", cantidad: hielo > 0 ? arriba(hielo / 3) : 0, precio: par.precio_bolsa_hielo_centimos },
  };
  // Lo que compra por su cuenta: una línea por cosa, en lo que se compra (botellas, litros, unidades)
  const agua = aguaInsumo;
  const insumosSugeridos: (Omit<LineaCosto, "subtotal" | "sugerida"> & { unidadCompra: [string, string] })[] = [
    ...comprasPropias.map((c) => {
      const unidadCompra = unidadDeCompra(c.unidad, c.presentacion);
      const cantidad = arriba(c.total / c.presentacion);
      return {
        clave: `insumo:${c.id}`,
        concepto: c.nombre,
        nota: `para ${lista(c.para)} · ${unidadCompra[1]}`,
        cantidad,
        precio: c.precio,
        unidadCompra,
      };
    }),
    ...(agua > 0
      ? [{ clave: "insumo:agua", concepto: "Agua y gaseosas para tomar solas", nota: "litros", cantidad: agua, precio: par.precio_litro_sin_alcohol_centimos, unidadCompra: ["litro", "litros"] as [string, string] }]
      : []),
  ];
  const servicio = SUGERIDOS.map((k) => ({ ...sugeridos[k], clave: k as string }));
  const conAjuste = (s: Omit<LineaCosto, "subtotal" | "sugerida">, grupo: "servicio" | "insumo"): LineaCosto => {
    const cantidad = rv.ajustes[s.clave]?.cantidad ?? s.cantidad;
    const precio = rv.ajustes[s.clave]?.precio ?? s.precio;
    return { ...s, cantidad, precio, subtotal: cantidad * precio, sugerida: true, cantidadSugerida: s.cantidad, precioSupuesto: s.precio, grupo };
  };
  // Texto para el PDF de su cliente (sin precios)
  const incluye: Record<string, (cantidad: number, sugerida: number) => string> = {
    bartender: (n, sug) => (n === sug && bartenders > 0 ? `${plural(bartenders, "bartender", "bartenders")} durante ${e.horas} horas` : `${fmt.format(n)} horas de bartender`),
    cristaleria: (n) => `${fmt.format(n)} vasos y copas`,
    hielo: (n) => `${plural(n, "bolsa", "bolsas")} de hielo de 3 kg`,
  };
  const lineas: LineaCosto[] = [
    ...servicio
      .filter((s) => !rv.quitados.includes(s.clave))
      .map((s) => {
        const l = conAjuste(s, "servicio");
        return { ...l, incluye: incluye[s.clave](l.cantidad, s.cantidad) };
      }),
    ...rv.otros.map((o) => ({
      clave: o.id, concepto: o.concepto, cantidad: o.cantidad, precio: o.precio, subtotal: o.cantidad * o.precio, sugerida: false,
      grupo: "servicio" as const, incluye: o.cantidad > 1 ? `${o.concepto} · ${fmt.format(o.cantidad)}` : o.concepto,
    })),
    ...insumosSugeridos
      .filter((s) => !rv.quitados.includes(s.clave))
      .map(({ unidadCompra, ...s }) => {
        const l = conAjuste(s, "insumo");
        return { ...l, incluye: `${s.concepto} · ${fmt.format(l.cantidad)} ${l.cantidad === 1 ? unidadCompra[0] : unidadCompra[1]}` };
      }),
  ];
  const quitados = [...servicio, ...insumosSugeridos]
    .filter((s) => rv.quitados.includes(s.clave))
    .map((s) => ({ clave: s.clave, concepto: s.concepto }));
  const costo = total + lineas.reduce((s, l) => s + l.subtotal, 0);
  const gananciaMonto = Math.round((costo * (rv.ganancia ?? 0)) / 100);
  const reventa: ResultadoReventa = {
    lineas,
    quitados,
    bebidas: total,
    costo,
    ganancia: rv.ganancia,
    gananciaMonto,
    precio: costo + gananciaMonto,
    porInvitado: e.invitados ? Math.round((costo + gananciaMonto) / e.invitados) : 0,
  };
  return {
    toman,
    tragosTotales,
    tragosPorPersona: toman ? tragosTotales / toman : 0,
    momentos,
    tragos,
    ingredientes,
    productos,
    clientePone,
    reventa,
    faltaMinimo,
    productoMayor,
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
    noToman: Math.round(((invitados - (base?.menores ?? 0)) * par.no_toman_pct) / 100),
    menores: base?.menores ?? 0,
    horaInicio: base?.horaInicio ?? "19:00",
    horas: tipo.horas,
    aireLibre: base?.aireLibre ?? false,
    perfil: tipo.perfil,
    margen: par.margen_pct,
    bienvenida: { activo: tipo.bienvenida, horas: tipo.bienvenida_horas, recetaId: tipo.bienvenida_receta_id },
    cena: { activo: tipo.cena, horas: tipo.cena_horas },
    brindis: { activo: tipo.brindis },
    barra: tipo.barra.map((b) => ({ recetaId: b.receta_id, nivel: b.nivel })),
    propios: [],
    productos: {},
    cajasManual: {},
    clientePone: base?.clientePone ?? [],
    reventa: base?.reventa,
  };
}
