"use client";

import { useActionState } from "react";
import { AvisoForm } from "@/components/AvisoForm";
import { Etiqueta } from "@/components/Etiqueta";
import { registrarse, type EstadoForm } from "@/lib/acciones-auth";
import { botonPrimario, campo } from "@/lib/estilos";
import { PAISES, PREFIJO_PERU } from "@/lib/paises";

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

      <div className="flex flex-col gap-2">
        <label htmlFor="whatsapp">
          <Etiqueta texto="WhatsApp" obligatorio />
        </label>
        <div className="flex gap-2">
          <div className="w-28 shrink-0">
            <select
              name="prefijo"
              aria-label="País del WhatsApp"
              defaultValue={v.prefijo ?? PREFIJO_PERU}
              className={`${campo} font-mono`}
            >
              {PAISES.map((p) => (
                <option key={p.codigo} value={p.prefijo}>
                  {p.codigo} {p.prefijo}
                </option>
              ))}
            </select>
          </div>
          <input
            id="whatsapp"
            name="whatsapp"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            placeholder="987654321"
            required
            defaultValue={v.whatsapp}
            className={`${campo} min-w-0 font-mono`}
          />
        </div>
      </div>

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
        <Etiqueta texto="Contraseña" obligatorio nota="mínimo 8" />
        <input name="password" type="password" autoComplete="new-password" minLength={8} required className={campo} />
      </label>
      <label className="flex flex-col gap-2">
        <Etiqueta texto="Repite tu contraseña" obligatorio />
        <input name="password2" type="password" autoComplete="new-password" minLength={8} required className={campo} />
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
