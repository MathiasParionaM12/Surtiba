import {
  ArrowRight,
  BadgePercent,
  CalendarDays,
  ChefHat,
  FileText,
  Gem,
  Layers,
  PackageCheck,
  ShoppingCart,
  Store,
  Truck,
  Warehouse,
} from "lucide-react";
import Link from "next/link";
import { LineaTiempo } from "@/app/cotizador/ui";
import { Carga } from "@/components/Carga";
import { calcular, entradaDesdeTipo } from "@/lib/cotizador";
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

const PARA_QUIEN = [
  { icono: ChefHat, titulo: "Caterings", texto: "Pide para varios eventos con precios por volumen y una sola entrega." },
  { icono: CalendarDays, titulo: "Organizadores de eventos", texto: "Cotiza el evento, descarga el PDF y compártelo con tu cliente." },
  { icono: Gem, titulo: "Wedding planners", texto: "Bienvenida, cena, brindis y fiesta: cuánto pedir de cada cosa, en minutos." },
  { icono: Store, titulo: "Bares y restaurantes", texto: "Vuelve a pedir lo de siempre con un clic desde tus pedidos anteriores." },
];

const VENTAJAS = [
  { icono: BadgePercent, titulo: "Precio por volumen", texto: "Mientras más cajas, mejor precio. Lo ves antes de pedir." },
  { icono: Layers, titulo: "Varias marcas, un pedido", texto: "Un solo carrito para todas las marcas. Surtiba coordina el recojo y la entrega." },
  { icono: Warehouse, titulo: "Con stock o por encargo", texto: "Si una marca no tiene todo, lo que falta se pide por encargo." },
  { icono: FileText, titulo: "Cotización en PDF", texto: "Con tu evento, las cajas y los precios, lista para compartir." },
];

// Visitante: crear cuenta. Comprador: sus pedidos. Marca y admin: su panel.
async function Acciones() {
  const usuario = await obtenerUsuario();
  const catalogo = (
    <Link href="/catalogo" className={botonPrimario}>
      Ver catálogo
    </Link>
  );
  if (usuario?.rol === "marca" || usuario?.rol === "admin" || usuario?.rol === "solicitante") {
    return (
      <>
        {usuario.rol !== "solicitante" && catalogo}
        <Link href={rutaInicio(usuario.rol)} className={usuario.rol === "solicitante" ? botonPrimario : botonSecundario}>
          {usuario.rol === "marca" ? "Ir a mi panel" : usuario.rol === "admin" ? "Ir al panel Surtiba" : "Ver mi solicitud"}
        </Link>
      </>
    );
  }
  return (
    <>
      {catalogo}
      <Link href="/cotizador" className={botonSecundario}>
        Cotizar mi evento
      </Link>
      {usuario ? (
        <Link href="/pedidos" className={botonSecundario}>
          Mis pedidos
        </Link>
      ) : (
        <Link href="/registro" className={botonSecundario}>
          Crear cuenta
        </Link>
      )}
    </>
  );
}

// Un ejemplo real del cotizador, calculado con los supuestos que hoy tiene guardados
async function EjemploCotizador() {
  const { parametros, tipos, recetas } = await supuestosCotizador();
  if (!parametros || tipos.length === 0) return null;
  const entrada = entradaDesdeTipo(tipos[0], parametros, 100);
  const r = calcular(entrada, parametros, recetas, []);
  const hielo = r.insumos.find((i) => i.nombre === "Hielo");
  return (
    <div className="rounded-md border border-linea bg-papel p-5">
      <p className={sello}>Ejemplo</p>
      <p className="mt-2 font-medium">
        {tipos[0].nombre} de {entero.format(entrada.invitados)} invitados, {entrada.horas} horas
      </p>
      <div className="mt-4">
        <LineaTiempo momentos={r.momentos} />
      </div>
      <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-linea pt-4">
        <div>
          <dt className="text-xs text-gris">Tragos</dt>
          <dd className="mt-1 font-mono text-xl font-semibold">{entero.format(r.tragosTotales)}</dd>
        </div>
        <div>
          <dt className="text-xs text-gris">Toman alcohol</dt>
          <dd className="mt-1 font-mono text-xl font-semibold">{entero.format(r.toman)}</dd>
        </div>
        {hielo && (
          <div>
            <dt className="text-xs text-gris">Hielo</dt>
            <dd className="mt-1 font-mono text-xl font-semibold">
              {entero.format(hielo.cantidad)} <span className="text-sm font-normal text-gris">kg</span>
            </dd>
          </div>
        )}
      </dl>
      <p className="mt-4 text-xs text-gris">Estimación con supuestos por validar con caterings.</p>
    </div>
  );
}

export default function Home() {
  return (
    <main className="flex-1">
      {/* Portada */}
      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-8 sm:py-24">
        <p className={sello}>Prototipo · datos ficticios</p>
        <h1 className="mt-4 max-w-3xl text-4xl leading-tight font-semibold tracking-tight text-balance sm:text-6xl sm:leading-[1.05]">
          Licores y cócteles de marcas peruanas, por cajas,{" "}
          {/* Resaltador: un solo uso por pantalla (docs/marca.md) */}
          <span className="bg-[linear-gradient(var(--color-resaltador),var(--color-resaltador))] bg-[length:100%_0.3em] bg-[position:0_92%] bg-no-repeat">
            en un solo pedido
          </span>
          .
        </h1>
        <p className="mt-6 max-w-xl text-lg text-gris">
          Para caterings, organizadores de eventos, wedding planners y bares que compran por caja.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          {/* Los botones dependen de quién ingresó; mientras se sabe, solo el catálogo */}
          <Carga
            fallback={
              <Link href="/catalogo" className={botonPrimario}>
                Ver catálogo
              </Link>
            }
          >
            <Acciones />
          </Carga>
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="border-y border-linea bg-blanco">
        <div className="mx-auto grid w-full max-w-6xl px-4 sm:px-8 md:grid-cols-3">
          {PASOS.map((p, i) => (
            <div
              key={p.titulo}
              className="aparecer border-b border-linea py-8 last:border-b-0 md:border-r md:border-b-0 md:px-8 md:first:pl-0 md:last:border-r-0"
            >
              <div className="flex items-center gap-3">
                <p.icono className="size-5 text-verde" strokeWidth={1.75} aria-hidden="true" />
                <p className="font-mono text-xs text-gris">0{i + 1}</p>
              </div>
              <h2 className="mt-3 text-lg font-semibold tracking-tight">{p.titulo}</h2>
              <p className="mt-2 text-[15px] text-gris">{p.texto}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Para quién */}
      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-8 sm:py-20">
        <p className={sello}>Para quién es</p>
        <h2 className="mt-3 max-w-2xl text-2xl font-semibold tracking-tight sm:text-3xl">Hecho para quien compra por caja</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PARA_QUIEN.map((q) => (
            <div key={q.titulo} className="aparecer rounded-md border border-linea bg-blanco p-5">
              <q.icono className="size-6 text-verde" strokeWidth={1.5} aria-hidden="true" />
              <h3 className="mt-4 font-semibold">{q.titulo}</h3>
              <p className="mt-1 text-sm text-gris">{q.texto}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Cotizador */}
      <section className="border-y border-linea bg-blanco">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 py-16 sm:px-8 sm:py-20 lg:grid-cols-2">
          <div className="aparecer">
            <p className={sello}>Cotizador de evento</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">¿Cuánto pedir para tu evento? Lo calculamos.</h2>
            <p className="mt-4 text-gris">
              Cuéntanos los invitados, el horario y qué se va a servir. Te decimos cuántos tragos salen en cada momento, cuántas cajas
              pedir de cada producto y todo lo demás: hielo, agua, gaseosas y limones.
            </p>
            <Link href="/cotizador" className={`${botonPrimario} mt-8`}>
              Cotizar mi evento
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
          <div className="aparecer">
            <Carga fallback={<div className="brillo h-64 rounded-md" />}>
              <EjemploCotizador />
            </Carga>
          </div>
        </div>
      </section>

      {/* Ventajas */}
      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-8 sm:py-20">
        <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {VENTAJAS.map((v) => (
            <div key={v.titulo} className="aparecer">
              <v.icono className="size-5 text-verde" strokeWidth={1.75} aria-hidden="true" />
              <h3 className="mt-3 font-semibold">{v.titulo}</h3>
              <p className="mt-1 text-sm text-gris">{v.texto}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Para marcas */}
      <section className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-8 sm:pb-24">
        <div className="aparecer flex flex-col gap-6 rounded-md border border-tinta bg-blanco p-6 sm:p-10 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <p className={sello}>Para marcas</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight">¿Tienes una marca de licores o cócteles?</h2>
            <p className="mt-3 text-gris">
              Publica tu catálogo y tu stock. Surtiba vende, recoge en tu local y entrega. Pagas comisión solo sobre lo vendido y
              entregado, y tus primeros 3 pedidos no pagan comisión.
            </p>
          </div>
          <Link href="/registro/vender" className={`${botonSecundario} shrink-0`}>
            Quiero vender
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </main>
  );
}
