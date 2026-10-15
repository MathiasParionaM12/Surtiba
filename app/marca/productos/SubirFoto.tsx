"use client";

import Image from "next/image";
import { useState } from "react";
import { AvisoForm } from "@/components/AvisoForm";
import type { EstadoForm } from "@/lib/acciones-auth";
import { guardarFoto } from "@/lib/acciones-marca";
import { botonSecundario, sello } from "@/lib/estilos";
import { createClient } from "@/lib/supabase/client";

const TIPOS = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 2 * 1024 * 1024;

// La foto se sube directo desde el navegador a Supabase Storage (con la sesión de la marca:
// RLS solo la deja subir en su carpeta). Después se guarda la ruta en el producto.
export function SubirFoto({ productoId, marcaId, fotoActual }: { productoId: string; marcaId: string; fotoActual: string | null }) {
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
    const ruta = `${marcaId}/${productoId}-${Date.now()}.${extension}`;

    const supabase = createClient();
    const { error } = await supabase.storage.from("productos").upload(ruta, archivo, { contentType: archivo.type });
    if (error) {
      setSubiendo(false);
      return setEstado({ error: "No pudimos subir la foto. Intenta de nuevo." });
    }

    const resultado = await guardarFoto(productoId, ruta);
    setSubiendo(false);
    setEstado(resultado);
    if (!resultado.error) setVista(URL.createObjectURL(archivo));
  }

  return (
    <div className="rounded-md border border-linea bg-blanco p-5">
      <h2 className={sello}>Foto</h2>
      <div className="relative mt-4 aspect-square overflow-hidden rounded-md border border-linea bg-papel">
        {vista ? (
          <Image src={vista} alt="Foto del producto" fill sizes="320px" className="object-contain p-4" unoptimized />
        ) : (
          <p className="flex h-full items-center justify-center p-4 text-center text-sm text-gris">Sin foto todavía</p>
        )}
      </div>
      <label className={`${botonSecundario} mt-4 w-full cursor-pointer ${subiendo ? "pointer-events-none opacity-50" : ""}`}>
        {subiendo ? "Subiendo…" : vista ? "Cambiar foto" : "Subir foto"}
        <input type="file" accept={TIPOS.join(",")} onChange={alElegir} className="sr-only" disabled={subiendo} />
      </label>
      <p className="mt-2 text-xs text-gris">JPG, PNG o WebP de hasta 2 MB. Mejor con fondo claro.</p>
      <div className="mt-3 empty:hidden">
        <AvisoForm estado={estado} />
      </div>
    </div>
  );
}
