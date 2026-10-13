import { Suspense } from "react";
import { EstadoConexion, EstadoConexionCargando } from "@/components/EstadoConexion";
import { Logo } from "@/components/Logo";

export default function Home() {
  return (
    <>
      <header className="border-b border-linea">
        <div className="mx-auto flex h-18 w-full max-w-6xl items-center px-4 sm:px-8">
          <Logo className="text-[28px]" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-16 sm:px-8 sm:py-24">
        <p className="font-mono text-xs font-medium tracking-[0.14em] text-gris uppercase">
          Prototipo · datos ficticios
        </p>
        <h1 className="mt-4 max-w-2xl text-4xl leading-tight font-semibold tracking-tight text-balance sm:text-5xl">
          Licores y cócteles de marcas peruanas, por cajas, en un solo pedido.
        </h1>
        <p className="mt-6 max-w-xl text-lg text-gris">
          Armas tu pedido con productos de varias marcas. Surtiba recoge en cada
          una y te entrega todo junto.
        </p>

        {/* Fase 0: prueba de conexión. Suspense deja cargar la página mientras llega el dato. */}
        <div className="mt-12 max-w-md">
          <Suspense fallback={<EstadoConexionCargando />}>
            <EstadoConexion />
          </Suspense>
        </div>
      </main>
    </>
  );
}
