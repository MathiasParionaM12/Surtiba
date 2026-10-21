"use client";

import { useActionState } from "react";
import { AvisoForm } from "@/components/AvisoForm";
import { Etiqueta } from "@/components/Etiqueta";
import { registrarVendedor, type EstadoForm } from "@/lib/acciones-auth";
import { DISTRITOS_CALLAO, DISTRITOS_LIMA } from "@/lib/distritos";
import { botonPrimario, campo, sello } from "@/lib/estilos";
import { PAISES, PREFIJO_PERU } from "@/lib/paises";
import { PEDIDO_MINIMO_ACTIVO } from "@/lib/catalogo";

export function FormVender() {
  const [estado, accion, enviando] = useActionState<EstadoForm, FormData>(registrarVendedor, {});
  const v = estado.valores ?? {};

  return (
    <form key={JSON.stringify(v)} action={accion} className="flex flex-col gap-8">
      <p className="text-xs text-gris">Los campos con * son obligatorios.</p>

      <fieldset className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <legend className={`${sello} mb-4`}>Tu marca</legend>
        <label className="flex flex-col gap-2">
          <Etiqueta texto="Nombre comercial" obligatorio />
          <input name="nombre_comercial" required defaultValue={v.nombre_comercial} className={campo} />
        </label>
        <label className="flex flex-col gap-2">
          <Etiqueta texto="Razón social" obligatorio />
          <input name="razon_social" required defaultValue={v.razon_social} className={campo} />
        </label>
        <label className="flex flex-col gap-2">
          <Etiqueta texto="RUC" obligatorio />
          <input name="ruc" inputMode="numeric" maxLength={11} required defaultValue={v.ruc} className={`${campo} font-mono`} />
        </label>
        <label className="flex flex-col gap-2">
          <Etiqueta texto="Distrito de recojo" obligatorio />
          <select name="distrito" required defaultValue={v.distrito ?? ""} className={campo}>
            <option value="" disabled>
              Elige el distrito
            </option>
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
        {!PEDIDO_MINIMO_ACTIVO && <input type="hidden" name="pedido_minimo" value="1" />}
        {PEDIDO_MINIMO_ACTIVO && (
        <label className="flex flex-col gap-2">
          <Etiqueta texto="Pedido mínimo (cajas)" obligatorio />
          <input
            name="pedido_minimo"
            type="number"
            min={1}
            max={9999}
            required
            defaultValue={v.pedido_minimo ?? "1"}
            className={`${campo} font-mono`}
          />
          <span className="text-xs text-gris">Lo mínimo que te deben pedir, sumando cualquiera de tus productos.</span>
        </label>
        )}
        <label className="flex flex-col gap-2 sm:col-span-2">
          <Etiqueta texto="Dirección donde Surtiba recogerá tus pedidos" obligatorio />
          <input name="direccion" placeholder="Calle, número, referencia" required defaultValue={v.direccion} className={campo} />
        </label>
      </fieldset>

      <fieldset className="grid grid-cols-1 gap-5 border-t border-linea pt-6 sm:grid-cols-2">
        <legend className={`${sello} mb-4 pt-6`}>Tus datos de contacto</legend>
        <label className="flex flex-col gap-2">
          <Etiqueta texto="Tu nombre" obligatorio />
          <input name="nombre" autoComplete="name" required defaultValue={v.nombre} className={campo} />
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
              placeholder="987654321"
              required
              defaultValue={v.whatsapp}
              className={`${campo} min-w-0 font-mono`}
            />
          </div>
        </div>
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
      </fieldset>

      <AvisoForm estado={estado} fijo />

      <div className="flex flex-col gap-3 border-t border-linea pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gris">El equipo Surtiba revisará tu solicitud antes de que puedas vender.</p>
        <button type="submit" disabled={enviando} className={`${botonPrimario} shrink-0`}>
          {enviando ? "Enviando…" : "Enviar solicitud"}
        </button>
      </div>
    </form>
  );
}
