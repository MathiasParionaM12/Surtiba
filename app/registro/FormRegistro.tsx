"use client";

import { useActionState } from "react";
import { AvisoForm } from "@/components/AvisoForm";
import { registrarse, type EstadoForm } from "@/lib/acciones-auth";
import { botonPrimario, campo, etiqueta } from "@/lib/estilos";

const TIPOS_NEGOCIO = [
  { valor: "catering", texto: "Catering" },
  { valor: "organizador_eventos", texto: "Organizador de eventos" },
  { valor: "wedding_planner", texto: "Wedding planner" },
  { valor: "bar_restaurante", texto: "Bar o restaurante" },
  { valor: "otro", texto: "Otro" },
];

export function FormRegistro() {
  const [estado, accion, enviando] = useActionState<EstadoForm, FormData>(registrarse, {});
  const v = estado.valores ?? {};

  return (
    // key: al volver con un error, el formulario se dibuja de nuevo con lo que ya escribiste
    <form key={JSON.stringify(v)} action={accion} className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      <label className="flex flex-col gap-2">
        <span className={etiqueta}>Tu nombre</span>
        <input name="nombre" autoComplete="name" required defaultValue={v.nombre} className={campo} />
      </label>
      <label className="flex flex-col gap-2">
        <span className={etiqueta}>Empresa</span>
        <input name="empresa" autoComplete="organization" required defaultValue={v.empresa} className={campo} />
      </label>
      <label className="flex flex-col gap-2">
        <span className={etiqueta}>Tipo de negocio</span>
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
      <label className="flex flex-col gap-2">
        <span className={etiqueta}>WhatsApp</span>
        <input
          name="whatsapp"
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          placeholder="987654321"
          required
          defaultValue={v.whatsapp}
          className={`${campo} font-mono`}
        />
      </label>
      <label className="flex flex-col gap-2 sm:col-span-2">
        <span className={etiqueta}>
          RUC <span className="font-normal text-gris">(opcional)</span>
        </span>
        <input name="ruc" inputMode="numeric" maxLength={11} defaultValue={v.ruc} className={`${campo} font-mono`} />
      </label>

      <hr className="border-linea sm:col-span-2" />

      <label className="flex flex-col gap-2">
        <span className={etiqueta}>Correo</span>
        <input name="email" type="email" autoComplete="email" required defaultValue={v.email} className={campo} />
      </label>
      <label className="flex flex-col gap-2">
        <span className={etiqueta}>
          Contraseña <span className="font-normal text-gris">(mínimo 8)</span>
        </span>
        <input name="password" type="password" autoComplete="new-password" minLength={8} required className={campo} />
      </label>

      <div className="sm:col-span-2">
        <AvisoForm error={estado.error} mensaje={estado.mensaje} />
      </div>

      <button type="submit" disabled={enviando} className={`${botonPrimario} sm:col-span-2 sm:justify-self-start`}>
        {enviando ? "Creando cuenta…" : "Crear cuenta"}
      </button>
    </form>
  );
}
