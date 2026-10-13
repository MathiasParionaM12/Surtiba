import Link from "next/link";
import { botonPrimario, botonSecundario, sello } from "@/lib/estilos";

const PASOS = [
  {
    numero: "01",
    titulo: "Armas tu pedido",
    texto: "Eliges productos de varias marcas peruanas, por caja, con el precio según la cantidad.",
  },
  {
    numero: "02",
    titulo: "Surtiba recoge",
    texto: "Cada marca prepara su parte y Surtiba la recoge en su local.",
  },
  {
    numero: "03",
    titulo: "Recibes todo junto",
    texto: "Una sola entrega con todo el pedido, en la fecha que pediste.",
  },
];

export default function Home() {
  return (
    <main className="flex-1">
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
          <Link href="/catalogo" className={botonPrimario}>
            Ver catálogo
          </Link>
          <Link href="/registro" className={botonSecundario}>
            Crear cuenta
          </Link>
        </div>
      </section>

      <section className="border-y border-linea bg-blanco">
        <div className="mx-auto grid w-full max-w-6xl px-4 sm:px-8 md:grid-cols-3">
          {PASOS.map((p) => (
            <div key={p.numero} className="border-b border-linea py-8 last:border-b-0 md:border-r md:border-b-0 md:px-8 md:first:pl-0 md:last:border-r-0">
              <p className="font-mono text-xs text-gris">{p.numero}</p>
              <h2 className="mt-3 text-lg font-semibold tracking-tight">{p.titulo}</h2>
              <p className="mt-2 text-[15px] text-gris">{p.texto}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
