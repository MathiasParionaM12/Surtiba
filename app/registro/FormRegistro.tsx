"use client";

import { useActionState } from "react";
import { AvisoForm } from "@/components/AvisoForm";
import { CampoCelular } from "@/components/CampoCelular";
import { Etiqueta } from "@/components/Etiqueta";
import { registrarse, type EstadoForm } from "@/lib/acciones-auth";
import { TIPOS_NEGOCIO } from "@/lib/cuenta";
import { botonPrimario, campo } from "@/lib/estilos";

export function FormRegistro() {
  const [estado, accion, enviando] = useActionState<EstadoForm, FormData>(registrarse, {});
  const v = estado.valores ?? {};

  return (
    // key: al volver con un error, el formulario se dibuja de nuevo con lo que ya escribiste
    <form key={JSON.stringify(v)} action={accion} className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      <p className="text-xs text-gris sm:col-span-2">Los campos con * son obligatorios.</p>

      <label className="flex flex-col gap-2">
        <Etiqueta texto="Tu nombre" obligatorio />
        <input name="nombre" autoComplete="name" required defaultValue={v.nombre} className={campo} />
      </label>
      <label className="flex flex-col gap-2">
        <Etiqueta texto="Empresa" obligatorio />
        <input name="empresa" autoComplete="organization" required defaultValue={v.empresa} className={campo} />
      </label>

      <label className="flex flex-col gap-2">
        <Etiqueta texto="Tipo de negocio" obligatorio />
        <select name="tipo_negocio" required defaultValue={v.tipo_negocio ?? ""} className={campo}>
          <option value="" disabled>
            Elige una opción
          </option>
          {TIPOS_NEGOCIO.map((t) => (
            <option key={t.valor} value={t.valor}>
              {t.texto}
            </option>
          ))}
        </select>
      </label>

      <CampoCelular nombre="whatsapp" etiqueta="WhatsApp" valor={v.whatsapp} />

      <label className="flex flex-col gap-2 sm:col-span-2">
        <Etiqueta texto="RUC" nota="opcional, 11 dígitos" />
        <input name="ruc" inputMode="numeric" maxLength={11} defaultValue={v.ruc} className={`${campo} font-mono sm:max-w-xs`} />
      </label>

      <hr className="border-linea sm:col-span-2" />

      <label className="flex flex-col gap-2 sm:col-span-2">
        <Etiqueta texto="Correo" obligatorio />
        <input name="email" type="email" autoComplete="email" required defaultValue={v.email} className={campo} />
      </label>
      <label className="flex flex-col gap-2">
        <Etiqueta texto="Contraseña" obligatorio nota="mínimo 8, con letras y números" />
        <input name="password" type="password" autoComplete="new-password" minLength={8} maxLength={72} required className={campo} />
      </label>
      <label className="flex flex-col gap-2">
        <Etiqueta texto="Repite tu contraseña" obligatorio />
        <input name="password2" type="password" autoComplete="new-password" minLength={8} required className={campo} />
      </label>

      <div className="sm:col-span-2">
        <AvisoForm estado={estado} fijo />
      </div>

      <button type="submit" disabled={enviando} className={`${botonPrimario} sm:col-span-2 sm:justify-self-start`}>
        {enviando ? "Creando cuenta…" : "Crear cuenta"}
      </button>
    </form>
  );
}
