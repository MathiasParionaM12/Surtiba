"use client";

import { useActionState } from "react";
import { AvisoForm } from "@/components/AvisoForm";
import { Etiqueta } from "@/components/Etiqueta";
import type { EstadoForm } from "@/lib/acciones-auth";
import { guardarPerfil } from "@/lib/acciones-perfil";
import { TIPOS_NEGOCIO } from "@/lib/cuenta";
import { DISTRITOS_CALLAO, DISTRITOS_LIMA } from "@/lib/distritos";
import { botonPrimario, campo, sello } from "@/lib/estilos";
import { PAISES, PREFIJO_PERU } from "@/lib/paises";

// Datos del comprador y su dirección de entrega habitual (con ella se llena sola al confirmar un pedido)
export function FormPerfil({ iniciales }: { iniciales: Record<string, string> }) {
  const [estado, accion, enviando] = useActionState<EstadoForm, FormData>(guardarPerfil, {});
  const v = estado.valores ?? iniciales;

  return (
    <form key={JSON.stringify(v)} action={accion} className="flex flex-col gap-8">
      <fieldset className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <legend className={`${sello} mb-4`}>Tus datos</legend>
        <label className="flex flex-col gap-2">
          <Etiqueta texto="Tu nombre" obligatorio />
          <input name="nombre" autoComplete="name" required maxLength={80} defaultValue={v.nombre} className={campo} />
        </label>
        <label className="flex flex-col gap-2">
          <Etiqueta texto="Empresa" obligatorio />
          <input name="empresa" autoComplete="organization" required maxLength={80} defaultValue={v.empresa} className={campo} />
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
              <select name="prefijo" aria-label="País del WhatsApp" defaultValue={v.prefijo ?? PREFIJO_PERU} className={`${campo} font-mono`}>
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
      </fieldset>

      <fieldset className="grid grid-cols-1 gap-5 border-t border-linea pt-6 sm:grid-cols-6">
        <legend className={`${sello} mb-4 pt-6`}>Dirección de entrega habitual (opcional)</legend>
        <p className="-mt-1 text-sm text-gris sm:col-span-6">Al confirmar un pedido, la llenamos sola. Puedes cambiarla en cada pedido.</p>
        <label className="flex flex-col gap-2 sm:col-span-4">
          <Etiqueta texto="Calle y número" />
          <input name="direccion" autoComplete="address-line1" maxLength={150} placeholder="Av. Larco 123" defaultValue={v.direccion} className={campo} />
        </label>
        <label className="flex flex-col gap-2 sm:col-span-2">
          <Etiqueta texto="Dpto., oficina" />
          <input name="direccion_detalle" autoComplete="address-line2" maxLength={80} placeholder="Of. 402" defaultValue={v.direccion_detalle} className={campo} />
        </label>
        <label className="flex flex-col gap-2 sm:col-span-4">
          <Etiqueta texto="Distrito" />
          <select name="distrito" defaultValue={v.distrito ?? ""} className={campo}>
            <option value="">Elige el distrito</option>
            <optgroup label="Lima">
              {DISTRITOS_LIMA.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </optgroup>
            <optgroup label="Callao">
              {DISTRITOS_CALLAO.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </optgroup>
          </select>
        </label>
        <label className="flex flex-col gap-2 sm:col-span-2">
          <Etiqueta texto="Código postal" />
          <input
            name="codigo_postal"
            inputMode="numeric"
            autoComplete="postal-code"
            maxLength={5}
            placeholder="15074"
            defaultValue={v.codigo_postal}
            className={`${campo} font-mono`}
          />
        </label>
        <label className="flex flex-col gap-2 sm:col-span-6">
          <Etiqueta texto="Referencia" />
          <input name="referencia" maxLength={150} placeholder="Frente al parque, portón negro" defaultValue={v.referencia} className={campo} />
        </label>
      </fieldset>

      <AvisoForm estado={estado} />
      <button type="submit" disabled={enviando} className={`${botonPrimario} self-start`}>
        {enviando ? "Guardando…" : "Guardar cambios"}
      </button>
    </form>
  );
}
