"use client";

// "Sube tus registros sanitarios o documentos importantes" (10-nov-2026). Los archivos van directo al bucket
// privado "documentos", a la carpeta de la cuenta (RLS no deja subir en otra). Solo la cuenta y el admin los ven.
import { FileText, Trash2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AvisoForm } from "@/components/AvisoForm";
import type { EstadoForm } from "@/lib/acciones-auth";
import { DOCUMENTOS, type Documento } from "@/lib/documentos";
import { botonSecundario, sello } from "@/lib/estilos";
import { fecha } from "@/lib/formato";
import { createClient } from "@/lib/supabase/client";

// "Registro Sanitario (2).pdf" -> "registro-sanitario-2.pdf"
const nombreSeguro = (n: string) => {
  const punto = n.lastIndexOf(".");
  const base = (punto > 0 ? n.slice(0, punto) : n).normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  const ext = punto > 0 ? n.slice(punto + 1).toLowerCase().replace(/[^a-z0-9]/g, "") : "";
  return `${base.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "documento"}${ext ? `.${ext}` : ""}`;
};

export function DocumentosMarca({ perfilId, documentos }: { perfilId: string; documentos: Documento[] }) {
  const router = useRouter();
  const [estado, setEstado] = useState<EstadoForm>({});
  const [ocupado, setOcupado] = useState(false);

  async function alElegir(e: React.ChangeEvent<HTMLInputElement>) {
    const archivos = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (archivos.length === 0) return;
    if (documentos.length + archivos.length > DOCUMENTOS.max) return setEstado({ error: `Puedes tener hasta ${DOCUMENTOS.max} documentos.` });
    if (archivos.some((a) => !DOCUMENTOS.tipos.includes(a.type))) return setEstado({ error: "Sube archivos PDF, JPG, PNG o WebP." });
    if (archivos.some((a) => a.size > DOCUMENTOS.maxBytes)) return setEstado({ error: "Cada archivo puede pesar hasta 10 MB." });

    setOcupado(true);
    setEstado({});
    const supabase = createClient();
    for (const [i, a] of archivos.entries()) {
      const { error } = await supabase.storage
        .from("documentos")
        .upload(`${perfilId}/${Date.now() + i}-${nombreSeguro(a.name)}`, a, { contentType: a.type });
      if (error) {
        setOcupado(false);
        return setEstado({ error: `No pudimos subir ${a.name}. Intenta de nuevo.` });
      }
    }
    setOcupado(false);
    setEstado({ mensaje: archivos.length === 1 ? "Documento subido." : `${archivos.length} documentos subidos.` });
    router.refresh();
  }

  async function borrar(ruta: string) {
    setOcupado(true);
    const { error } = await createClient().storage.from("documentos").remove([ruta]);
    setOcupado(false);
    setEstado(error ? { error: "No pudimos borrar el documento." } : { mensaje: "Documento borrado." });
    router.refresh();
  }

  return (
    <section className="rounded-md border border-linea bg-blanco p-5 sm:p-6">
      <h2 className={sello}>Sube tus registros sanitarios o documentos importantes</h2>
      <p className="mt-2 max-w-prose text-sm text-gris">
        Registro sanitario de cada producto (DIGESA), ficha técnica u otros documentos que respalden a tu marca. Solo los ve el equipo Surtiba.
        PDF o foto, hasta 10 MB cada uno.
      </p>
      {documentos.length > 0 && (
        <ul className="mt-4 flex flex-col divide-y divide-linea rounded-md border border-linea">
          {documentos.map((d) => (
            <li key={d.ruta} className="flex items-center gap-3 px-3 py-2 text-sm">
              <FileText className="size-4 shrink-0 text-verde" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                {d.url ? (
                  <a href={d.url} target="_blank" rel="noopener noreferrer" className="block truncate enlace hover:text-verde">
                    {d.nombre}
                  </a>
                ) : (
                  <span className="block truncate">{d.nombre}</span>
                )}
                {d.subido && <span className="block text-xs text-gris">Subido el {fecha(d.subido)}</span>}
              </span>
              <button
                type="button"
                onClick={() => borrar(d.ruta)}
                disabled={ocupado}
                aria-label={`Borrar ${d.nombre}`}
                className="inline-flex size-11 shrink-0 items-center justify-center rounded-md text-gris hover:bg-papel hover:text-tinta disabled:opacity-50 sm:size-9"
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <label className={`${botonSecundario} mt-4 inline-flex cursor-pointer gap-2 ${ocupado ? "pointer-events-none opacity-50" : ""}`}>
        <Upload className="size-4" aria-hidden="true" />
        {ocupado ? "Subiendo…" : "Subir documentos"}
        <input type="file" multiple accept={DOCUMENTOS.tipos.join(",")} onChange={alElegir} className="sr-only" disabled={ocupado} />
      </label>
      <div className="mt-3">
        <AvisoForm estado={estado} />
      </div>
    </section>
  );
}
