import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Carga } from "@/components/Carga";
import { EsqueletoPagina } from "@/components/Esqueleto";
import { esUuid } from "@/lib/catalogo";
import { calcular, entradaDesdeTipo, LIMITES, type EntradaCotizador } from "@/lib/cotizador";
import { datosCotizador, limpiarEntrada } from "@/lib/cotizador-datos";
import { botonPrimario, botonSecundario, sello } from "@/lib/estilos";
import { createClient } from "@/lib/supabase/server";
import { Cotizador } from "./Cotizador";
import { LineaTiempo } from "./ui";

export const metadata: Metadata = { title: "Cotizador de evento · Surtiba" };

const entero = new Intl.NumberFormat("en-US");
const decimal = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 1 });

export default function PaginaCotizador({ searchParams }: PageProps<"/cotizador">) {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-8 sm:py-14">
      <p className={sello}>Cotizador de evento</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">¿Cuánto necesitas para tu evento?</h1>
      <p className="mt-3 max-w-2xl text-gris">
        Cuéntanos cómo es tu evento y calculamos los tragos, las cajas de cada producto y todo lo demás que vas a necesitar.
      </p>
      <div className="mt-8">
        <Carga fallback={<EsqueletoPagina />}>
          <Contenido searchParams={searchParams as Promise<Busqueda>} />
        </Carga>
      </div>
    </main>
  );
}

// desde: cotización guardada. invitados y horas: vienen del mini-cotizador de la portada.
type Busqueda = { desde?: string; invitados?: string; horas?: string };

async function Contenido({ searchParams }: { searchParams: Promise<Busqueda> }) {
  const [{ desde, invitados: inv, horas: hrs }, datos] = await Promise.all([searchParams, datosCotizador()]);
  const { usuario, puedeUsar, parametros, tipos, recetas, catalogo } = datos;
  if (usuario?.rol === "solicitante") redirect("/solicitud");
  if (!parametros || tipos.length === 0) {
    return <p className="rounded-md border border-linea bg-blanco p-5 text-gris">El cotizador no está disponible por ahora.</p>;
  }

  // Evento inicial: el primer tipo, con los invitados y horas de la portada si vinieron (y son válidos)
  const invitados = Number(inv);
  const horas = Number(hrs);
  const inicial = (): EntradaCotizador => {
    const e = entradaDesdeTipo(tipos[0], parametros, Number.isInteger(invitados) && invitados >= 1 && invitados <= LIMITES.invitadosMax ? invitados : 100);
    const ocupado = (e.bienvenida.activo ? e.bienvenida.horas : 0) + (e.cena.activo ? e.cena.horas : 0);
    if (Number.isInteger(horas) && horas >= Math.ceil(ocupado) && horas <= LIMITES.horasMax) e.horas = horas;
    return e;
  };

  // Sin cuenta: qué hace, con un ejemplo calculado con los mismos supuestos
  if (!usuario) {
    const ejemplo = inicial();
    return <Presentacion tipo={tipos[0].nombre} entrada={ejemplo} resultado={calcular(ejemplo, parametros, recetas, [])} />;
  }
  if (!puedeUsar) {
    return (
      <p className="rounded-md border border-linea bg-blanco p-5 text-gris">
        El cotizador es para compradores. Tus productos aparecen en él cuando un comprador cotiza su evento.
      </p>
    );
  }

  // Volver a abrir una cotización guardada (RLS: solo las suyas, o todas si es admin)
  let entrada: EntradaCotizador = inicial();
  let abierta: string | undefined;
  if (esUuid(desde)) {
    const supabase = await createClient();
    const { data } = await supabase.from("cotizaciones").select("codigo, evento").eq("id", desde).maybeSingle();
    const guardada = data?.evento as { version?: number; entrada?: EntradaCotizador } | null;
    if (guardada?.version === 2 && guardada.entrada) {
      const limpia = limpiarEntrada(guardada.entrada, tipos, recetas);
      if (typeof limpia !== "string") {
        entrada = limpia;
        abierta = data!.codigo;
      }
    }
  }

  return (
    <>
      {usuario.rol === "comprador" && (
        <Link href="/cotizaciones" className="-mt-4 mb-8 inline-block text-sm font-medium text-verde hover:text-tinta">
          Mis cotizaciones →
        </Link>
      )}
      <Cotizador
      tipos={tipos}
      recetas={recetas}
      parametros={parametros}
      entradaInicial={entrada}
      resultadoInicial={calcular(entrada, parametros, recetas, catalogo)}
      rol={usuario.rol}
      abierta={abierta}
      />
    </>
  );
}

function Presentacion({
  tipo,
  entrada,
  resultado,
}: {
  tipo: string;
  entrada: EntradaCotizador;
  resultado: ReturnType<typeof calcular>;
}) {
  const QUE_HACE = [
    { titulo: "Tu evento, paso a paso", texto: "Invitados, cuántos no toman, horario, lugar y los momentos: bienvenida, cena, brindis y fiesta." },
    { titulo: "Tu barra, a tu manera", texto: "Eliges los tragos y cuáles se piden más. Sin porcentajes ni cálculos." },
    { titulo: "Productos y precios", texto: "Te recomendamos productos de Surtiba con su precio por volumen y te avisamos si una marca no llega a su mínimo." },
    { titulo: "Todo lo demás", texto: "Hielo, agua, gaseosas, limones y jarabe: la lista completa, aunque no lo compres aquí." },
  ];
  return (
    <div className="flex flex-col gap-10">
      <div className="grid gap-px overflow-hidden rounded-md border border-linea bg-linea sm:grid-cols-2">
        {QUE_HACE.map((q, i) => (
          <div key={q.titulo} className="bg-blanco p-5">
            <p className="font-mono text-xs text-gris">0{i + 1}</p>
            <h2 className="mt-2 font-semibold">{q.titulo}</h2>
            <p className="mt-1 text-sm text-gris">{q.texto}</p>
          </div>
        ))}
      </div>

      <section className="rounded-md border border-linea bg-blanco p-5 sm:p-6">
        <p className={sello}>Ejemplo</p>
        <h2 className="mt-2 text-lg font-semibold">
          {tipo} de {entero.format(entrada.invitados)} invitados, {entrada.horas} horas
        </h2>
        <p className="mt-1 text-sm text-gris">
          {entero.format(resultado.toman)} toman alcohol · {entero.format(resultado.tragosTotales)} tragos (
          {decimal.format(resultado.tragosPorPersona)} por persona que toma)
        </p>
        <div className="mt-5">
          <LineaTiempo momentos={resultado.momentos} />
        </div>
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div>
            <h3 className="text-sm font-medium">Tragos</h3>
            <ul className="mt-2 flex flex-col gap-1 text-sm">
              {resultado.tragos.map((t) => (
                <li key={t.recetaId} className="flex justify-between gap-3">
                  <span>{t.receta}</span>
                  <span className="font-mono">{entero.format(t.tragos)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-medium">Lo consigues por tu cuenta</h3>
            <ul className="mt-2 flex flex-col gap-1 text-sm">
              {/* El ejemplo se calcula sin catálogo: lo que vende Surtiba no va en esta lista */}
              {resultado.insumos.filter((i) => !i.deSurtiba).map((i) => (
                <li key={i.nombre} className="flex justify-between gap-3">
                  <span>{i.nombre}</span>
                  <span className="font-mono">
                    {decimal.format(i.cantidad)} {i.unidad}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="mt-6 text-xs text-gris">Estimación referencial con supuestos por validar con caterings.</p>
      </section>

      <div className="flex flex-col gap-4 rounded-md border border-tinta bg-blanco p-5 sm:flex-row sm:items-center sm:justify-between">
        <p>
          Crea tu cuenta para cotizar tu evento, ver los productos con su precio, pasarlo al carrito y guardar la cotización en PDF.
        </p>
        <div className="flex shrink-0 gap-2">
          <Link href="/ingresar" className={botonSecundario}>
            Ingresar
          </Link>
          <Link href="/registro" className={botonPrimario}>
            Crear cuenta
          </Link>
        </div>
      </div>
    </div>
  );
}
