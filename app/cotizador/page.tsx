import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { EsqueletoPagina } from "@/components/Esqueleto";
import { calcular, type EntradaCotizador } from "@/lib/cotizador";
import { datosCotizador } from "@/lib/cotizador-datos";
import { sello } from "@/lib/estilos";
import { Cotizador } from "./Cotizador";

export const metadata: Metadata = { title: "Cotizador de evento · Surtiba" };

export default function PaginaCotizador() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-8 sm:py-14">
      <p className={sello}>Cotizador de evento</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">¿Cuánto necesitas para tu evento?</h1>
      <p className="mt-3 max-w-2xl text-gris">
        Con los invitados, las horas y los tragos que vas a servir, calculamos cuántas cajas pedir de cada producto.
      </p>
      <div className="mt-8">
        <Suspense fallback={<EsqueletoPagina />}>
          <Contenido />
        </Suspense>
      </div>
    </main>
  );
}

async function Contenido() {
  const { usuario, conSesion, tipos, recetas, catalogo } = await datosCotizador();
  if (usuario?.rol === "solicitante") redirect("/solicitud");
  if (tipos.length === 0 || recetas.length === 0) {
    return <p className="rounded-md border border-linea bg-blanco p-5 text-gris">El cotizador no está disponible por ahora.</p>;
  }

  // Empieza con el primer tipo de evento, 100 invitados y 5 horas
  const tipo = tipos[0];
  const entrada: EntradaCotizador = {
    tipoEventoId: tipo.id,
    invitados: 100,
    horas: 5,
    tragos: tipo.mezcla.map((m) => ({ recetaId: m.receta_id, porcentaje: m.porcentaje })),
  };

  return (
    <Cotizador
      tipos={tipos}
      recetas={recetas}
      entradaInicial={entrada}
      resultadoInicial={calcular(entrada, tipo, recetas, catalogo, conSesion)}
      rol={usuario?.rol ?? null}
    />
  );
}
