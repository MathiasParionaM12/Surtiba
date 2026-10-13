// Texto de un campo. Los obligatorios llevan * ; los opcionales, una nota en gris.
export function Etiqueta({ texto, obligatorio = false, nota }: { texto: string; obligatorio?: boolean; nota?: string }) {
  return (
    <span className="text-sm font-medium">
      {texto}
      {obligatorio && (
        <span className="text-gris" aria-hidden="true">
          {" "}*
        </span>
      )}
      {nota && <span className="font-normal text-gris"> ({nota})</span>}
    </span>
  );
}
