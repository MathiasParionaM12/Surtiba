import Link from "next/link";

// "Quiero comprar" / "Quiero vender" arriba del formulario de registro
export function PestanasRegistro({ activa }: { activa: "comprar" | "vender" }) {
  const opciones = [
    { clave: "comprar", href: "/registro", titulo: "Quiero comprar", texto: "Para caterings, eventos y bares" },
    { clave: "vender", href: "/registro/vender", titulo: "Quiero vender", texto: "Para marcas de licores y cócteles" },
  ] as const;

  return (
    <div className="mb-6 grid grid-cols-2 gap-2" role="tablist">
      {opciones.map((o) => {
        const esta = o.clave === activa;
        return (
          <Link
            key={o.clave}
            href={o.href}
            role="tab"
            aria-selected={esta}
            className={`rounded-md border p-3 transition-colors sm:p-4 ${
              esta ? "border-tinta bg-blanco" : "border-linea bg-papel text-gris hover:border-gris"
            }`}
          >
            <span className="block text-sm font-semibold text-tinta">{o.titulo}</span>
            <span className="mt-0.5 block text-xs">{o.texto}</span>
          </Link>
        );
      })}
    </div>
  );
}
