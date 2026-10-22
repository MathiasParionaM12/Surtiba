import { ArrowRight, PackageCheck, ShoppingCart, Truck } from "lucide-react";
import Link from "next/link";
import { Carga } from "@/components/Carga";
import { Contador } from "@/components/Contador";
import { CintaCategorias } from "@/components/portada/CintaCategorias";
import { MiniCotizador } from "@/components/portada/MiniCotizador";
import { ParaQuien, type Perfil } from "@/components/portada/ParaQuien";
import { Recorrido } from "@/components/portada/Recorrido";
import { Ventajas } from "@/components/portada/Ventajas";
import { COMISION_PCT } from "@/lib/catalogo";
import { catalogoPublico } from "@/lib/catalogo-publico";
import { calcular, entradaDesdeTipo, type ProductoCotizable } from "@/lib/cotizador";
import { supuestosCotizador } from "@/lib/cotizador-datos";
import { botonPrimario, botonSecundario, sello } from "@/lib/estilos";
import { rutaInicio } from "@/lib/roles";
import { obtenerUsuario } from "@/lib/sesion";

const entero = new Intl.NumberFormat("en-US");

const PASOS = [
  { icono: ShoppingCart, titulo: "Armas tu pedido", texto: "Eliges productos de varias marcas peruanas, por caja, con el precio según la cantidad." },
  { icono: Truck, titulo: "Surtiba recoge", texto: "Cada marca prepara su parte y Surtiba la recoge en su local." },
  { icono: PackageCheck, titulo: "Recibes todo junto", texto: "Una sola entrega con todo el pedido, en la fecha que pediste." },
];

const PASOS_MARCA = [
  "Publicas tu catálogo, tus precios por volumen y tu stock.",
  "Cuando llega una orden, la dejas lista para recojo.",
  "Surtiba recoge en tu local y entrega al cliente.",
];

// Visitante y comprador: cotizar o ver el catálogo. Marca y admin: su panel. Crear cuenta ya está arriba.
function BotonesComprador() {
  return (
    <>
      <Link href="/cotizador" className={botonPrimario}>
        Cotizar mi evento
        <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
      <Link href="/catalogo" className={botonSecundario}>
        Ver catálogo
      </Link>
    </>
  );
}

async function Acciones() {
  const usuario = await obtenerUsuario();
  if (usuario?.rol === "marca" || usuario?.rol === "admin") {
    return (
      <>
        <Link href={rutaInicio(usuario.rol)} className={botonPrimario}>
          {usuario.rol === "marca" ? "Ir a mi panel" : "Ir al panel Surtiba"}
        </Link>
        <Link href="/catalogo" className={botonSecundario}>
          Ver catálogo
        </Link>
      </>
    );
  }
  if (usuario?.rol === "solicitante") {
    return (
      <Link href="/solicitud" className={botonPrimario}>
        Ver mi solicitud
      </Link>
    );
  }
  return <BotonesComprador />;
}

export default async function Home() {
  // Ambos vienen de la caché (iguales para todos): la portada llega armada, sin esqueletos
  const [{ parametros, tipos, recetas }, filas] = await Promise.all([supuestosCotizador(), catalogoPublico()]);

  // Productos públicos para contar cajas en los ejemplos (sin precios ni stock)
  const productos: ProductoCotizable[] = filas.map((p) => ({
    id: p.id!,
    nombre: p.nombre!,
    marca: p.marca!,
    marcaId: p.marca_id!,
    categoria: p.categoria!,
    ml: p.ml!,
    unidades: p.unidades_por_caja!,
    tramos: [{ desde_cajas: 1, hasta_cajas: null, precio_caja_centimos: p.precio_caja_centimos! }],
    stock: null,
    pedidoMinimo: 1,
  }));
  const marcas = [...new Set(filas.map((f) => f.marca!))].sort().slice(0, 3);

  // Categorías con productos hoy, de la que más tiene a la que menos (para la cinta). "Otro" no se muestra.
  const porCategoria = new Map<string, number>();
  for (const f of filas) if (f.categoria !== "otro") porCategoria.set(f.categoria!, (porCategoria.get(f.categoria!) ?? 0) + 1);
  const categorias = [...porCategoria].map(([clave, productos]) => ({ clave, productos })).sort((a, b) => b.productos - a.productos);

  // Escenarios de "Para quién es", calculados con el mismo cotizador
  let perfiles: Perfil[] = [];
  if (parametros && tipos.length > 0) {
    const escenario = (nombre: string, invitados: number, horas: number) => {
      const tipo = tipos.find((t) => t.nombre === nombre) ?? tipos[0];
      const e = entradaDesdeTipo(tipo, parametros, invitados);
      const ocupado = (e.bienvenida.activo ? e.bienvenida.horas : 0) + (e.cena.activo ? e.cena.horas : 0);
      const r = calcular({ ...e, horas: Math.max(horas, Math.ceil(ocupado)) }, parametros, recetas, productos);
      return {
        r,
        cajas: r.productos.reduce((s, p) => s + p.cajas, 0),
        marcas: new Set(r.productos.map((p) => p.marcaId)).size,
        hielo: r.insumos.find((i) => i.nombre === "Hielo")?.cantidad ?? 0,
      };
    };
    const catering = escenario("Evento corporativo", 240, 4);
    const corporativo = escenario("Evento corporativo", 200, 4);
    const boda = escenario("Boda", 150, 7);
    perfiles = [
      {
        titulo: "Caterings",
        texto: "Pide para varios eventos con precios por volumen: mientras más cajas juntas, mejor precio por caja.",
        escenario: "3 eventos de 80 invitados en una semana, en un solo pedido",
        datos: [
          ["Tragos", entero.format(catering.r.tragosTotales)],
          ["Cajas", `${catering.cajas} de ${catering.marcas} ${catering.marcas === 1 ? "marca" : "marcas"}`],
          ["Entregas", "1"],
        ],
      },
      {
        titulo: "Organizadores de eventos",
        texto: "Cotiza el evento en minutos, descarga el PDF y compártelo con tu cliente antes de pedir.",
        escenario: "Evento corporativo de 200 invitados, 4 horas",
        datos: [
          ["Tragos", entero.format(corporativo.r.tragosTotales)],
          ["Hielo", `${entero.format(corporativo.hielo)} kg`],
          ["Cotización", "PDF para tu cliente"],
        ],
      },
      {
        titulo: "Wedding planners",
        texto: "Bienvenida, cena, brindis y fiesta: cuánto pedir para cada momento y todo lo demás que hace falta.",
        escenario: "Boda de 150 invitados, 7 horas",
        datos: [
          ["Momentos", `${boda.r.momentos.length}`],
          ["Tragos", entero.format(boda.r.tragosTotales)],
          ["Hielo", `${entero.format(boda.hielo)} kg`],
        ],
      },
      {
        titulo: "Bares y restaurantes",
        texto: "Tu pedido de siempre, sin volver a armarlo: lo repites desde tus pedidos anteriores.",
        escenario: "Tu pedido de cada semana",
        datos: [
          ["Repetirlo", "1 clic"],
          ["Cambias", "solo las cajas"],
          ["Entregas", "1, con todas las marcas"],
        ],
      },
    ];
  }

  return (
    <main className="flex-1">
      {/* Portada: mensaje a la izquierda y el cotizador para probar a la derecha */}
      <section className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 py-14 sm:px-8 sm:py-20 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-14">
        <div>
          <p className={sello}>Abastecimiento para eventos y bares</p>
          {/* El título entra frase por frase (una sola vez, al abrir la portada) */}
          <h1 className="mt-4 text-4xl leading-tight font-semibold tracking-tight text-balance sm:text-6xl sm:leading-[1.05]">
            <span className="subir inline-block">Licores y cócteles de marcas peruanas,</span>{" "}
            <span className="subir inline-block" style={{ animationDelay: "110ms" }}>
              por cajas,{" "}
              {/* Resaltador: un solo uso por pantalla (docs/marca.md) */}
              <span className="bg-[linear-gradient(var(--color-resaltador),var(--color-resaltador))] bg-[length:100%_0.3em] bg-[position:0_92%] bg-no-repeat">
                en un solo pedido
              </span>
              .
            </span>
          </h1>
          <p className="subir mt-6 max-w-xl text-lg text-gris" style={{ animationDelay: "220ms" }}>
            Para caterings, organizadores de eventos, wedding planners y bares que compran por caja.
          </p>
          <div className="subir mt-10 flex flex-wrap gap-3" style={{ animationDelay: "300ms" }}>
            {/* Los botones dependen de quién ingresó; mientras se sabe, los del comprador */}
            <Carga fallback={<BotonesComprador />}>
              <Acciones />
            </Carga>
          </div>
        </div>
        {parametros && tipos.length > 0 && <MiniCotizador tipo={tipos[0]} parametros={parametros} recetas={recetas} />}
      </section>

      {/* Cinta con las categorías que hay hoy en el catálogo */}
      <CintaCategorias categorias={categorias} />

      {/* Cómo funciona: el recorrido y los 3 pasos */}
      <section className="border-y border-linea bg-blanco">
        <div className="mx-auto w-full max-w-6xl px-4 pt-10 sm:px-8">
          <p className={sello}>Cómo funciona</p>
          <div className="mt-6">
            <Recorrido />
          </div>
        </div>
        <div className="mx-auto grid w-full max-w-6xl px-4 sm:px-8 md:grid-cols-3">
          {PASOS.map((p, i) => (
            <div key={p.titulo} className="aparecer border-b border-linea py-8 last:border-b-0 md:border-b-0 md:px-6 md:text-center">
              <div className="flex items-center gap-3 md:justify-center">
                <p.icono className="size-5 text-verde" strokeWidth={1.75} aria-hidden="true" />
                <p className="font-mono text-xs text-gris">0{i + 1}</p>
              </div>
              <h2 className="mt-3 text-lg font-semibold tracking-tight">{p.titulo}</h2>
              <p className="mt-2 text-[15px] text-gris">{p.texto}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Para quién es */}
      {perfiles.length > 0 && (
        <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-8 sm:py-20">
          <p className={sello}>Para quién es</p>
          <h2 className="mt-3 max-w-2xl text-2xl font-semibold tracking-tight sm:text-3xl">Hecho para quien compra por caja</h2>
          <ParaQuien perfiles={perfiles} />
        </section>
      )}

      {/* Ventajas en grilla */}
      <section className="border-y border-linea bg-blanco">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-8 sm:py-20">
          <p className={sello}>Por qué Surtiba</p>
          <h2 className="mt-3 max-w-2xl text-2xl font-semibold tracking-tight sm:text-3xl">Números claros antes de pedir</h2>
          <div className="mt-8">
            <Ventajas marcas={marcas} />
          </div>
        </div>
      </section>

      {/* Para marcas: el único bloque oscuro de la página */}
      <section className="bg-tinta text-blanco">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 py-16 sm:px-8 sm:py-20 lg:grid-cols-2 lg:gap-16">
          <div className="aparecer">
            <p className="font-mono text-xs font-medium tracking-[0.12em] text-blanco/60 uppercase">Para marcas</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">¿Tienes una marca de licores o cócteles?</h2>
            <p className="mt-8 font-mono text-5xl font-semibold tracking-tight tabular-nums sm:text-6xl">
              <Contador valor={3} /> pedidos
            </p>
            <p className="mt-2 text-lg text-blanco/85">sin comisión para empezar</p>
            <p className="mt-4 max-w-md text-sm text-blanco/70">Después, {COMISION_PCT} % solo sobre lo vendido y entregado. Nada por publicar.</p>
          </div>
          <div className="aparecer">
            <ol className="divide-y divide-blanco/15 border-y border-blanco/15">
              {PASOS_MARCA.map((texto, i) => (
                <li key={texto} className="flex gap-4 py-4">
                  <span className="font-mono text-sm text-blanco/60">0{i + 1}</span>
                  <span>{texto}</span>
                </li>
              ))}
            </ol>
            <Link
              href="/registro/vender"
              className="mt-8 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-blanco px-5 text-sm font-medium text-tinta transition-[background-color,scale] duration-150 hover:bg-papel focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blanco active:scale-[0.98]"
            >
              Quiero vender
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
