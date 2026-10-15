import Link from "next/link";
import { Logo } from "@/components/Logo";

// Pie de página de todas las pantallas
export function Pie() {
  return (
    <footer className="border-t border-linea">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-start sm:justify-between sm:px-8">
        <div>
          <Logo className="text-xl" />
          <p className="mt-2 max-w-xs text-sm text-gris">Licores y cócteles de marcas peruanas, por cajas, en un solo pedido. Lima, Perú.</p>
        </div>
        <nav aria-label="Pie de página" className="grid grid-cols-2 gap-x-10 gap-y-2 text-sm">
          <Link href="/catalogo" className="hover:text-verde">
            Catálogo
          </Link>
          <Link href="/cotizador" className="hover:text-verde">
            Cotizar evento
          </Link>
          <Link href="/registro/vender" className="hover:text-verde">
            Quiero vender
          </Link>
        </nav>
      </div>
      <div className="border-t border-linea">
        <p className="mx-auto w-full max-w-6xl px-4 py-4 font-mono text-[11px] tracking-[0.08em] text-gris uppercase sm:px-8">
          Prototipo del curso · datos ficticios · no se venden ni entregan productos reales
        </p>
      </div>
    </footer>
  );
}
