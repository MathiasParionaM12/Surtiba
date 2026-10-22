import { sello } from "@/lib/estilos";

const PUNTOS = [
  { numero: "01", texto: "Precios por volumen a la vista, sin pedir cotización." },
  { numero: "02", texto: "Productos de varias marcas en un solo pedido." },
  { numero: "03", texto: "Surtiba recoge en cada marca y te entrega todo junto." },
];

// Marco de las páginas de registro e ingreso: a la izquierda qué es Surtiba,
// a la derecha el formulario. En celular, el formulario va primero.
export function MarcoAuth({
  titulo,
  bajada,
  children,
  pie,
}: {
  titulo: string;
  bajada: string;
  children: React.ReactNode;
  pie: React.ReactNode;
}) {
  return (
    <main className="mx-auto grid w-full max-w-6xl flex-1 gap-10 px-4 py-10 sm:px-8 sm:py-16 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
      <section className="order-2 lg:order-1 lg:pt-2">
        <p className={sello}>Compras por caja para eventos y negocios</p>
        <ul className="mt-6 border-t border-linea">
          {PUNTOS.map((p) => (
            <li key={p.numero} className="flex gap-4 border-b border-linea py-4">
              <span className="font-mono text-xs text-gris">{p.numero}</span>
              <span className="text-[15px]">{p.texto}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="order-1 lg:order-2">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{titulo}</h1>
        <p className="mt-2 max-w-lg text-gris">{bajada}</p>
        <div className="mt-8 rounded-md border border-linea bg-blanco p-5 sm:p-8">{children}</div>
        <div className="mt-6 text-sm text-gris">{pie}</div>
      </section>
    </main>
  );
}
