import Link from "next/link";
import { botonPrimario, botonSecundario, sello } from "@/lib/estilos";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-16 sm:px-8 sm:py-24">
      <p className={sello}>Prototipo · datos ficticios</p>
      <h1 className="mt-4 max-w-2xl text-4xl leading-tight font-semibold tracking-tight text-balance sm:text-5xl">
        Licores y cócteles de marcas peruanas, por cajas, en un solo pedido.
      </h1>
      <p className="mt-6 max-w-xl text-lg text-gris">
        Armas tu pedido con productos de varias marcas. Surtiba recoge en cada una y te entrega todo junto.
      </p>
      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/registro" className={botonPrimario}>
          Crear cuenta
        </Link>
        <Link href="/ingresar" className={botonSecundario}>
          Ingresar
        </Link>
      </div>
    </main>
  );
}
