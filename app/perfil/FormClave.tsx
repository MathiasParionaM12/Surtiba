"use client";

import { useActionState } from "react";
import { AvisoForm } from "@/components/AvisoForm";
import { Etiqueta } from "@/components/Etiqueta";
import type { EstadoForm } from "@/lib/acciones-auth";
import { cambiarClave } from "@/lib/acciones-perfil";
import { botonSecundario, campo } from "@/lib/estilos";

// Cambiar la contraseña. Al terminar (bien o mal) los campos se vacían: las contraseñas nunca vuelven del servidor.
export function FormClave() {
  const [estado, accion, enviando] = useActionState<EstadoForm, FormData>(cambiarClave, {});

  return (
    <form key={JSON.stringify(estado)} action={accion} className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      <label className="flex flex-col gap-2 sm:col-span-2 sm:max-w-sm">
        <Etiqueta texto="Contraseña actual" obligatorio />
        <input name="actual" type="password" autoComplete="current-password" required maxLength={72} className={campo} />
      </label>
      <label className="flex flex-col gap-2">
        <Etiqueta texto="Contraseña nueva" obligatorio nota="mínimo 8, con letras y números" />
        <input name="nueva" type="password" autoComplete="new-password" minLength={8} maxLength={72} required className={campo} />
      </label>
      <label className="flex flex-col gap-2">
        <Etiqueta texto="Repite la nueva" obligatorio />
        <input name="repetir" type="password" autoComplete="new-password" minLength={8} maxLength={72} required className={campo} />
      </label>
      <div className="sm:col-span-2">
        <AvisoForm estado={estado} />
      </div>
      <button type="submit" disabled={enviando} className={`${botonSecundario} sm:col-span-2 sm:justify-self-start`}>
        {enviando ? "Cambiando…" : "Cambiar contraseña"}
      </button>
    </form>
  );
}
