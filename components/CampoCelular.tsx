import { Etiqueta } from "@/components/Etiqueta";
import { campo } from "@/lib/estilos";

// Celular peruano: el +51 va fijo (Surtiba atiende solo en Lima, 5-nov-2026) y se escriben los 9 dígitos.
export function CampoCelular({
  nombre,
  etiqueta,
  valor,
  autoComplete = "tel-national",
}: {
  nombre: string;
  etiqueta: string;
  valor?: string;
  autoComplete?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={nombre}>
        <Etiqueta texto={etiqueta} obligatorio />
      </label>
      <div className="flex">
        <span className="flex h-11 items-center rounded-l-md border border-r-0 border-linea bg-papel px-3 font-mono text-gris">+51</span>
        <input
          id={nombre}
          name={nombre}
          type="tel"
          inputMode="numeric"
          autoComplete={autoComplete}
          placeholder="987654321"
          maxLength={11}
          required
          defaultValue={valor}
          className={`${campo} min-w-0 rounded-l-none font-mono`}
        />
      </div>
    </div>
  );
}
