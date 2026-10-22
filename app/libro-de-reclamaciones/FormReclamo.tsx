"use client";

import { Printer } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
import { AvisoForm } from "@/components/AvisoForm";
import { Etiqueta } from "@/components/Etiqueta";
import { Sello } from "@/components/Sello";
import { registrarReclamo, type EstadoReclamo } from "@/lib/acciones-reclamos";
import { botonPrimario, botonSecundario, campo, sello } from "@/lib/estilos";
import { HojaReclamo } from "./HojaReclamo";

// Hoja de reclamación virtual. Al registrarla se muestra la copia para imprimir o guardar en PDF
// (en el prototipo no se envían correos).
export function FormReclamo({ iniciales }: { iniciales: Record<string, string> }) {
  const [estado, accion, enviando] = useActionState<EstadoReclamo, FormData>(registrarReclamo, {});
  const v = estado.valores ?? iniciales;

  if (estado.hoja) {
    return (
      <div className="flex flex-col gap-4">
        <div className="relative">
          <span className="absolute -top-3 right-3 z-10 print:hidden">
            <Sello tono="verde" giro={-6} animar className="bg-blanco">
              Registrada
            </Sello>
          </span>
          <HojaReclamo h={estado.hoja} />
        </div>
        <p className="text-sm text-gris print:hidden">
          Guarda esta copia: en el prototipo todavía no la enviamos a tu correo.
        </p>
        <button type="button" onClick={() => window.print()} className={`${botonPrimario} self-start print:hidden`}>
          <Printer className="size-4" aria-hidden="true" />
          Imprimir o guardar en PDF
        </button>
      </div>
    );
  }

  return (
    <form key={JSON.stringify(v)} action={accion} className="flex flex-col gap-8 rounded-md border border-linea bg-blanco p-5 sm:p-8">
      <p className="text-xs text-gris">Los campos con * son obligatorios.</p>

      <fieldset>
        <legend className={`${sello} mb-4`}>¿Qué quieres registrar? *</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { valor: "reclamo", titulo: "Reclamo", texto: "No estás conforme con un producto o con el servicio que te dimos." },
            { valor: "queja", titulo: "Queja", texto: "Tu malestar no es por el producto: es por la atención que recibiste." },
          ].map((o) => (
            <label key={o.valor} className="flex cursor-pointer gap-3 rounded-md border border-linea p-4 text-sm has-[:checked]:border-tinta">
              <input type="radio" name="tipo" value={o.valor} required defaultChecked={v.tipo === o.valor} className="mt-0.5 accent-verde" />
              <span>
                <span className="font-medium">{o.titulo}</span>
                <span className="mt-1 block text-gris">{o.texto}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="grid grid-cols-1 gap-5 border-t border-linea pt-6 sm:grid-cols-2">
        <legend className={`${sello} mb-4 pt-6`}>1. Tus datos</legend>
        <label className="flex flex-col gap-2 sm:col-span-2">
          <Etiqueta texto="Nombre completo o razón social" obligatorio />
          <input name="nombre" autoComplete="name" required maxLength={120} defaultValue={v.nombre} className={campo} />
        </label>
        <div className="flex flex-col gap-2">
          <label htmlFor="numero_documento">
            <Etiqueta texto="Documento" obligatorio />
          </label>
          <div className="flex gap-2">
            <div className="w-32 shrink-0">
              <select name="tipo_documento" aria-label="Tipo de documento" defaultValue={v.tipo_documento ?? "DNI"} className={campo}>
                <option value="DNI">DNI</option>
                <option value="CE">C. extranjería</option>
                <option value="Pasaporte">Pasaporte</option>
                <option value="RUC">RUC</option>
              </select>
            </div>
            <input id="numero_documento" name="numero_documento" required maxLength={15} defaultValue={v.numero_documento} className={`${campo} min-w-0 font-mono`} />
          </div>
        </div>
        <label className="flex flex-col gap-2">
          <Etiqueta texto="Teléfono" nota="opcional" />
          <input name="telefono" type="tel" inputMode="tel" autoComplete="tel" maxLength={16} defaultValue={v.telefono} className={`${campo} font-mono`} />
        </label>
        <label className="flex flex-col gap-2">
          <Etiqueta texto="Correo" obligatorio />
          <input name="correo" type="email" autoComplete="email" required maxLength={120} defaultValue={v.correo} className={campo} />
        </label>
        <label className="flex flex-col gap-2">
          <Etiqueta texto="Domicilio" obligatorio />
          <input name="domicilio" autoComplete="street-address" required maxLength={200} defaultValue={v.domicilio} className={campo} />
        </label>
      </fieldset>

      <fieldset className="grid grid-cols-1 gap-5 border-t border-linea pt-6 sm:grid-cols-2">
        <legend className={`${sello} mb-4 pt-6`}>2. Lo que compraste o contrataste</legend>
        <div className="flex flex-col gap-2 sm:col-span-2">
          <Etiqueta texto="Es sobre" obligatorio />
          <div className="flex flex-wrap gap-3">
            {[
              { valor: "producto", texto: "Un producto" },
              { valor: "servicio", texto: "Un servicio (entrega, atención…)" },
            ].map((o) => (
              <label key={o.valor} className="flex cursor-pointer items-center gap-2 rounded-md border border-linea px-3 py-2.5 text-sm has-[:checked]:border-tinta">
                <input type="radio" name="bien" value={o.valor} required defaultChecked={v.bien === o.valor} className="accent-verde" />
                {o.texto}
              </label>
            ))}
          </div>
        </div>
        <label className="flex flex-col gap-2">
          <Etiqueta texto="Código del pedido" nota="opcional" />
          <input name="pedido_codigo" placeholder="SUR-0019" maxLength={12} defaultValue={v.pedido_codigo} className={`${campo} font-mono uppercase`} />
        </label>
        <label className="flex flex-col gap-2">
          <Etiqueta texto="Monto reclamado (S/)" nota="opcional" />
          <input name="monto" inputMode="decimal" placeholder="250.00" maxLength={11} defaultValue={v.monto} className={`${campo} font-mono`} />
        </label>
        <label className="flex flex-col gap-2 sm:col-span-2">
          <Etiqueta texto="¿Qué producto o servicio fue?" obligatorio />
          <input name="descripcion_bien" required maxLength={300} placeholder="Ej.: 2 cajas de Pisco Demo Quebranta" defaultValue={v.descripcion_bien} className={campo} />
        </label>
      </fieldset>

      <fieldset className="grid grid-cols-1 gap-5 border-t border-linea pt-6">
        <legend className={`${sello} mb-4 pt-6`}>3. Detalle</legend>
        <label className="flex flex-col gap-2">
          <Etiqueta texto="¿Qué pasó?" obligatorio />
          <textarea name="detalle" required rows={5} maxLength={2000} defaultValue={v.detalle} className={`${campo} h-auto py-2`} />
        </label>
        <label className="flex flex-col gap-2">
          <Etiqueta texto="¿Qué te gustaría que hagamos?" obligatorio />
          <textarea name="pedido" required rows={3} maxLength={1000} placeholder="Ej.: que repongan la caja rota." defaultValue={v.pedido} className={`${campo} h-auto py-2`} />
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="acepto" value="si" required defaultChecked={v.acepto === "si"} className="mt-1 accent-verde" />
          Confirmo que mis datos y lo que cuento son correctos.
        </label>
      </fieldset>

      <AvisoForm estado={estado} />
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={enviando} className={botonPrimario}>
          {enviando ? "Registrando…" : "Registrar hoja"}
        </button>
        <Link href="/condiciones" className={botonSecundario}>
          Ver condiciones de compra
        </Link>
      </div>
    </form>
  );
}
