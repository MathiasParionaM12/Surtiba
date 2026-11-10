// Documentos que subió una marca (solo lectura, para el admin). Los enlaces vencen en 1 hora.
import { FileText } from "lucide-react";
import type { Documento } from "@/lib/documentos";
import { fecha } from "@/lib/formato";

export function ListaDocumentos({ documentos }: { documentos: Documento[] }) {
  if (documentos.length === 0) return <p className="text-sm text-rojo">Todavía no subió registros sanitarios ni documentos.</p>;
  return (
    <ul className="flex flex-col gap-1.5">
      {documentos.map((d) => (
        <li key={d.ruta} className="flex items-center gap-2 text-sm">
          <FileText className="size-4 shrink-0 text-verde" aria-hidden="true" />
          {d.url ? (
            <a href={d.url} target="_blank" rel="noopener noreferrer" className="min-w-0 truncate enlace hover:text-verde">
              {d.nombre}
            </a>
          ) : (
            <span className="min-w-0 truncate">{d.nombre}</span>
          )}
          {d.subido && <span className="shrink-0 text-xs text-gris">{fecha(d.subido)}</span>}
        </li>
      ))}
    </ul>
  );
}
