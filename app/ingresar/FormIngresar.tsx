"use client";

import { useActionState } from "react";
import { AvisoForm } from "@/components/AvisoForm";
import { Etiqueta } from "@/components/Etiqueta";
import { ingresar, type EstadoForm } from "@/lib/acciones-auth";
import { botonPrimario, campo } from "@/lib/estilos";

export function FormIngresar() {
  // useActionState: envía el formulario a la acción del servidor y guarda su respuesta (error o éxito)
  const [estado, accion, enviando] = useActionState<EstadoForm, FormData>(ingresar, {});

  return (
    // key: al volver con un error, el formulario se dibuja de nuevo con el correo que ya escribiste
    <form key={estado.valores?.email ?? ""} action={accion} className="flex flex-col gap-5">
      <label className="flex flex-col gap-2">
        <Etiqueta texto="Correo" obligatorio />
        <input name="email" type="email" autoComplete="email" required defaultValue={estado.valores?.email} className={campo} />
      </label>
      <label className="flex flex-col gap-2">
        <Etiqueta texto="Contraseña" obligatorio />
        <input name="password" type="password" autoComplete="current-password" required className={campo} />
      </label>

      <AvisoForm estado={estado} fijo />

      <button type="submit" disabled={enviando} className={botonPrimario}>
        {enviando ? "Ingresando…" : "Ingresar"}
      </button>
    </form>
  );
}
