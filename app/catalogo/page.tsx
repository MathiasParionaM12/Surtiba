import type { Metadata } from "next";
import { Carga } from "@/components/Carga";
import { EsqueletoTarjetas } from "@/components/Esqueleto";
import { sello } from "@/lib/estilos";
import { Catalogo, type Filtros } from "./Catalogo";

export const metadata: Metadata = { title: "Catálogo · Surtiba" };

export default function PaginaCatalogo({ searchParams }: PageProps<"/catalogo">) {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-8 sm:py-14">
      <p className={sello}>Catálogo</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Licores y cócteles por caja</h1>

      {/* Lo que se muestra depende de la sesión y de los filtros: se carga dentro de Suspense */}
      <Carga fallback={<EsqueletoTarjetas />}>
        <Catalogo searchParams={searchParams as Promise<Filtros>} />
      </Carga>
    </main>
  );
}
