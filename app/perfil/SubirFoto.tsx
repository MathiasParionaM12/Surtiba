"use client";

import { useState } from "react";
import { AvisoForm } from "@/components/AvisoForm";
import { FotoPerfil } from "@/components/FotoPerfil";
import type { EstadoForm } from "@/lib/acciones-auth";
import { guardarFoto } from "@/lib/acciones-perfil";
import { botonSecundario } from "@/lib/estilos";
import { createClient } from "@/lib/supabase/client";

const TIPOS = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 2 * 1024 * 1024;

// La foto se sube directo al bucket privado "perfiles", a la carpeta de la persona (RLS solo la deja ahí).
// Después la base revisa que la ruta sea suya y la guarda en su perfil.
export function SubirFoto({ perfilId, nombre, fotoActual }: { perfilId: string; nombre: string; fotoActual: string | null }) {
  const [vista, setVista] = useState<string | null>(fotoActual);
  const [estado, setEstado] = useState<EstadoForm>({});
  const [subiendo, setSubiendo] = useState(false);

  async function alElegir(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;
    if (!TIPOS.includes(archivo.type)) return setEstado({ error: "La foto debe ser JPG, PNG o WebP." });
    if (archivo.size > MAX_BYTES) return setEstado({ error: "La foto pesa más de 2 MB. Usa una más liviana." });

    setSubiendo(true);
    setEstado({});
    const extension = archivo.type === "image/png" ? "png" : archivo.type === "image/webp" ? "webp" : "jpg";
    const ruta = `${perfilId}/foto-${Date.now()}.${extension}`;
    const { error } = await createClient().storage.from("perfiles").upload(ruta, archivo, { contentType: archivo.type });
    if (error) {
      setSubiendo(false);
      return setEstado({ error: "No pudimos subir la foto. Intenta de nuevo." });
    }
    const resultado = await guardarFoto(ruta);
    setSubiendo(false);
    setEstado(resultado);
    if (!resultado.error) setVista(URL.createObjectURL(archivo));
  }

  async function quitar() {
    setSubiendo(true);
    const resultado = await guardarFoto(null);
    setSubiendo(false);
    setEstado(resultado);
    if (!resultado.error) setVista(null);
  }

  return (
    <div className="flex items-center gap-4">
      <FotoPerfil nombre={nombre} foto={vista} tamano="grande" />
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <label className={`${botonSecundario} cursor-pointer ${subiendo ? "pointer-events-none opacity-50" : ""}`}>
            {subiendo ? "Guardando…" : vista ? "Cambiar foto" : "Subir foto"}
            <input type="file" accept={TIPOS.join(",")} onChange={alElegir} className="sr-only" disabled={subiendo} />
          </label>
          {vista && !subiendo && (
            <button type="button" onClick={quitar} className="text-sm font-medium enlace text-verde hover:text-tinta">
              Quitar
            </button>
          )}
        </div>
        <p className="text-xs text-gris">Tu foto o el logo de tu empresa. JPG, PNG o WebP de hasta 2 MB. Solo la ven tú y Surtiba.</p>
        <div className="empty:hidden">
          <AvisoForm estado={estado} />
        </div>
      </div>
    </div>
  );
}
