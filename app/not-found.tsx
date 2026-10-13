import Link from "next/link";
import { botonPrimario, sello } from "@/lib/estilos";

// Se muestra cuando una página o un producto no existe
export default function NoEncontrado() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-16 sm:px-8 sm:py-24">
      <p className={sello}>Error 404</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">No encontramos esta página</h1>
      <p className="mt-2 text-gris">Puede que el enlace esté mal escrito o que el producto ya no esté disponible.</p>
      <Link href="/catalogo" className={`${botonPrimario} mt-8`}>
        Ir al catálogo
      </Link>
    </main>
  );
}
