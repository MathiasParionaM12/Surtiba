import Link from "next/link";
import { CATEGORIAS } from "@/lib/catalogo";
import { IconoCategoria } from "@/components/IconoCategoria";

type Categoria = { clave: string; productos: number };

// Franja de la portada con las categorías que hoy tienen productos, moviéndose despacio.
// Se detiene al pasar el mouse o al llegar con el teclado. Con "reducir movimiento" queda quieta
// (estilos .cinta en globals.css). Cada categoría lleva al catálogo ya filtrado.
export function CintaCategorias({ categorias }: { categorias: Categoria[] }) {
  if (categorias.length === 0) return null;
  // Se repite la lista hasta tener suficientes elementos para cubrir pantallas anchas sin huecos
  const vueltas = Math.max(1, Math.ceil(12 / categorias.length));
  const tramo = Array.from({ length: vueltas }, () => categorias).flat();

  const lista = (copia: boolean) => (
    <ul className={`flex shrink-0 ${copia ? "cinta-copia" : ""}`} aria-hidden={copia || undefined}>
      {tramo.map((c, i) => {
        return (
          // Las repeticiones se esconden cuando la cinta queda quieta ("cinta-copia")
          <li key={`${c.clave}-${i}`} className={`flex items-center ${i >= categorias.length ? "cinta-copia" : ""}`}>
            {/* Solo la primera vuelta de la primera copia se puede enfocar con el teclado */}
            <Link
              href={`/catalogo?categoria=${c.clave}`}
              tabIndex={copia || i >= categorias.length ? -1 : undefined}
              aria-hidden={!copia && i >= categorias.length ? true : undefined}
              className="flex items-center gap-2 px-6 py-5 whitespace-nowrap hover:text-verde focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-verde"
            >
              <IconoCategoria categoria={c.clave} className="size-5 shrink-0 text-verde" strokeWidth={1.25} />
              <span className="text-xl font-semibold tracking-tight sm:text-2xl">{CATEGORIAS[c.clave] ?? c.clave}</span>
              <span className="font-mono text-xs text-gris">
                {c.productos} {c.productos === 1 ? "producto" : "productos"}
              </span>
            </Link>
            <span className="size-1.5 shrink-0 rounded-[1px] bg-verde/40" aria-hidden="true" />
          </li>
        );
      })}
    </ul>
  );

  return (
    <nav aria-label="Categorías del catálogo" className="cinta border-t border-linea">
      <div className="cinta-pista">
        {lista(false)}
        {lista(true)}
      </div>
    </nav>
  );
}
