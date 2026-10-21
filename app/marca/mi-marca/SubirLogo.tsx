"use client";

import { useState } from "react";
import { AvisoForm } from "@/components/AvisoForm";
import { LogoMarca } from "@/components/LogoMarca";
import type { EstadoForm } from "@/lib/acciones-auth";
import { guardarLogo } from "@/lib/acciones-marca";
import { botonSecundario } from "@/lib/estilos";
import { createClient } from "@/lib/supabase/client";

const TIPOS = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 2 * 1024 * 1024;

// El logo se sube directo a Supabase Storage, a la carpeta de la marca (RLS solo la deja subir ahí).
// Después la base revisa que la ruta sea de su carpeta y la guarda.
export function SubirLogo({ marcaId, nombre, logoActual }: { marcaId: string; nombre: string; logoActual: string | null }) {
  const [vista, setVista] = useState<string | null>(logoActual);
  const [estado, setEstado] = useState<EstadoForm>({});
  const [subiendo, setSubiendo] = useState(false);

  async function alElegir(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;
    if (!TIPOS.includes(archivo.type)) return setEstado({ error: "El logo debe ser JPG, PNG o WebP." });
    if (archivo.size > MAX_BYTES) return setEstado({ error: "El logo pesa más de 2 MB. Usa uno más liviano." });

    setSubiendo(true);
    setEstado({});
    const extension = archivo.type === "image/png" ? "png" : archivo.type === "image/webp" ? "webp" : "jpg";
    const ruta = `${marcaId}/logo-${Date.now()}.${extension}`;
    const { error } = await createClient().storage.from("productos").upload(ruta, archivo, { contentType: archivo.type });
    if (error) {
      setSubiendo(false);
      return setEstado({ error: "No pudimos subir el logo. Intenta de nuevo." });
    }
    const resultado = await guardarLogo(ruta);
    setSubiendo(false);
    setEstado(resultado);
    if (!resultado.error) setVista(URL.createObjectURL(archivo));
  }

  return (
    <div className="flex items-center gap-4">
      <LogoMarca nombre={nombre} logo={vista} grande />
      <div className="flex flex-col gap-2">
        <label className={`${botonSecundario} cursor-pointer ${subiendo ? "pointer-events-none opacity-50" : ""}`}>
          {subiendo ? "Subiendo…" : vista ? "Cambiar logo" : "Subir logo"}
          <input type="file" accept={TIPOS.join(",")} onChange={alElegir} className="sr-only" disabled={subiendo} />
        </label>
        <p className="text-xs text-gris">JPG, PNG o WebP de hasta 2 MB, mejor cuadrado.</p>
        <div className="empty:hidden">
          <AvisoForm estado={estado} />
        </div>
      </div>
    </div>
  );
}
