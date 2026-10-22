"use client";

import { useActionState, useState } from "react";
import { AvisoForm } from "@/components/AvisoForm";
import { Etiqueta } from "@/components/Etiqueta";
import type { EstadoForm } from "@/lib/acciones-auth";
import { confirmarPedido } from "@/lib/acciones-pedidos";
import { DISTRITOS_CALLAO, DISTRITOS_LIMA } from "@/lib/distritos";
import { botonPrimario, campo, sello } from "@/lib/estilos";
import { soles } from "@/lib/formato";
import { METODOS_PAGO } from "@/lib/pagos";
import { PAISES } from "@/lib/paises";

// Valores con los que empieza el formulario (perfil del comprador y su último pedido)
export type Iniciales = Record<string, string>;

type Modo = "separado" | "junto";
const OPCIONES: { valor: Modo; titulo: string }[] = [
  { valor: "separado", titulo: "Lo que hay ahora + el resto por encargo" },
  { valor: "junto", titulo: "Todo junto cuando esté completo" },
];

export function FormConfirmar({
  fechaMinima,
  pagasAhora,
  porEncargo,
  iniciales,
  autocompletado,
  tiposEvento,
  cotizacion,
  envioPorDistrito,
}: {
  fechaMinima: string;
  pagasAhora: number; // céntimos: lo que tiene stock (se paga ahora)
  porEncargo: number; // céntimos: lo que va por encargo (se paga al confirmar)
  iniciales: Iniciales;
  autocompletado: boolean;
  tiposEvento: string[]; // los del cotizador; además está "Otro"
  cotizacion: string | null; // código de la cotización con la que se llenaron los datos del evento
  envioPorDistrito: Record<string, number>; // céntimos; solo para mostrar (lo cobra crear_pedido en la base)
}) {
  const [estado, accion, enviando] = useActionState<EstadoForm, FormData>(confirmarPedido, {});
  // Si el servidor devolvió un error, se muestran los valores que la persona ya escribió
  const v = estado.valores ?? iniciales;
  const [modo, setModo] = useState<Modo>(v.modo === "junto" ? "junto" : "separado");
  // El evento no puede ser antes de la entrega: su calendario empieza en la fecha de entrega elegida
  const [fechaEntrega, setFechaEntrega] = useState(v.fecha_entrega ?? "");
  const minimoEvento = fechaEntrega && fechaEntrega > fechaMinima ? fechaEntrega : fechaMinima;
  const tipos = v.evento_tipo && !tiposEvento.includes(v.evento_tipo) && v.evento_tipo !== "Otro" ? [...tiposEvento, v.evento_tipo] : tiposEvento;

  // Envío fijo según el distrito: uno solo por compra (va en lo que pagas ahora; si no hay, en el encargo)
  const [distrito, setDistrito] = useState(v.distrito ?? "");
  const envio = envioPorDistrito[distrito] ?? 0;
  const productos = pagasAhora + porEncargo;
  const total = productos + envio;
  const hayEleccion = pagasAhora > 0 && porEncargo > 0;
  // Con "todo junto" no se paga nada ahora: se paga todo cuando las marcas confirmen
  const pagaAhora = pagasAhora > 0 && !(hayEleccion && modo === "junto");

  return (
    <form key={JSON.stringify(v)} action={accion} className="flex flex-col gap-8">
      <p className="text-xs text-gris">
        Los campos con * son obligatorios.
        {autocompletado && " Llenamos algunos datos con tu perfil y tu último pedido: revísalos."}
      </p>

      {/* Quién recibe */}
      <fieldset className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <legend className={`${sello} mb-4`}>Quién recibe</legend>
        <label className="flex flex-col gap-2">
          <Etiqueta texto="Nombre y apellido" obligatorio />
          <input name="recibe_nombre" autoComplete="name" required defaultValue={v.recibe_nombre} className={campo} />
        </label>
        <div className="flex flex-col gap-2">
          <label htmlFor="telefono">
            <Etiqueta texto="Celular" obligatorio />
          </label>
          <div className="flex gap-2">
            <div className="w-28 shrink-0">
              <select name="prefijo" aria-label="País del celular" defaultValue={v.prefijo} className={`${campo} font-mono`}>
                {PAISES.map((p) => (
                  <option key={p.codigo} value={p.prefijo}>
                    {p.codigo} {p.prefijo}
                  </option>
                ))}
              </select>
            </div>
            <input
              id="telefono"
              name="telefono"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder="987654321"
              required
              defaultValue={v.telefono}
              className={`${campo} min-w-0 font-mono`}
            />
          </div>
        </div>
      </fieldset>

      {/* Dirección */}
      <fieldset className="grid grid-cols-1 gap-5 border-t border-linea pt-6 sm:grid-cols-6">
        <legend className={`${sello} mb-4 pt-6`}>Dirección de entrega</legend>
        <label className="flex flex-col gap-2 sm:col-span-4">
          <Etiqueta texto="Calle y número" obligatorio />
          <input
            name="direccion"
            autoComplete="address-line1"
            placeholder="Av. Larco 123"
            required
            defaultValue={v.direccion}
            className={campo}
          />
        </label>
        <label className="flex flex-col gap-2 sm:col-span-2">
          <Etiqueta texto="Dpto., oficina" nota="opcional" />
          <input
            name="direccion_detalle"
            autoComplete="address-line2"
            placeholder="Of. 402"
            defaultValue={v.direccion_detalle}
            className={campo}
          />
        </label>
        <label className="flex flex-col gap-2 sm:col-span-4">
          <Etiqueta texto="Distrito" obligatorio />
          <select name="distrito" required value={distrito} onChange={(e) => setDistrito(e.target.value)} className={campo}>
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
          <span className="text-xs text-gris">
            {distrito && envioPorDistrito[distrito] !== undefined
              ? `Envío a ${distrito}: ${soles(envio)}, fijo por pedido.`
              : "El envío es fijo por pedido y depende del distrito."}
          </span>
        </label>
        <label className="flex flex-col gap-2 sm:col-span-2">
          <Etiqueta texto="Código postal" nota="opcional" />
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
          <Etiqueta texto="Referencia" nota="opcional" />
          <input
            name="referencia"
            placeholder="Frente al parque, portón negro"
            defaultValue={v.referencia}
            className={campo}
          />
        </label>
      </fieldset>

      {/* Fecha y nota */}
      <fieldset className="grid grid-cols-1 gap-5 border-t border-linea pt-6 sm:grid-cols-2">
        <legend className={`${sello} mb-4 pt-6`}>Fecha</legend>
        <label className="flex flex-col gap-2">
          <Etiqueta texto="Fecha deseada de entrega" obligatorio />
          <input
            name="fecha_entrega"
            type="date"
            min={fechaMinima}
            required
            value={fechaEntrega}
            onChange={(e) => setFechaEntrega(e.target.value)}
            className={`${campo} font-mono`}
          />
          <span className="text-xs text-gris">Desde mañana.</span>
        </label>
        <label className="flex flex-col gap-2 sm:col-span-2">
          <Etiqueta texto="Nota para Surtiba" nota="opcional" />
          <textarea
            name="nota"
            rows={3}
            placeholder="Ej.: entregar por la puerta de servicio."
            defaultValue={v.nota}
            className={`${campo} h-auto py-2`}
          />
        </label>
      </fieldset>

      {/* Evento */}
      <fieldset className="grid grid-cols-1 gap-5 border-t border-linea pt-6 sm:grid-cols-2">
        <legend className={`${sello} mb-4 pt-6`}>Datos del evento (opcional)</legend>
        <p className="-mt-1 text-sm text-gris sm:col-span-2">
          {cotizacion
            ? `Los llenamos con tu cotización ${cotizacion}: revísalos. `
            : ""}
          Con el nombre reconoces este pedido en «Mis pedidos», y con la fecha coordinamos la entrega antes de tu evento.
        </p>
        <label className="flex flex-col gap-2">
          <Etiqueta texto="Nombre del evento" />
          <input name="evento_nombre" maxLength={80} placeholder="Ej.: Boda Pérez" defaultValue={v.evento_nombre} className={campo} />
        </label>
        <label className="flex flex-col gap-2">
          <Etiqueta texto="Tipo de evento" />
          <select name="evento_tipo" defaultValue={v.evento_tipo ?? ""} className={campo}>
            <option value="">Elige el tipo</option>
            {tipos.map((t) => (
              <option key={t}>{t}</option>
            ))}
            <option>Otro</option>
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <Etiqueta texto="Fecha del evento" />
          <input
            name="evento_fecha"
            type="date"
            min={minimoEvento}
            defaultValue={v.evento_fecha}
            className={`${campo} font-mono`}
          />
          <span className="text-xs text-gris">El mismo día de la entrega o después.</span>
        </label>
        <label className="flex flex-col gap-2">
          <Etiqueta texto="Invitados" />
          <input
            name="invitados"
            type="number"
            min={1}
            max={100000}
            inputMode="numeric"
            defaultValue={v.invitados}
            className={`${campo} font-mono`}
          />
        </label>
      </fieldset>

      {/* Si falta stock y hay algo disponible, el comprador elige cómo recibirlo */}
      {hayEleccion && (
        <fieldset className="border-t border-linea pt-6">
          <legend className={`${sello} mb-4 pt-6`}>¿Cómo lo quieres recibir?</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {OPCIONES.map((o) => (
              <label
                key={o.valor}
                className="flex cursor-pointer gap-3 rounded-md border border-linea bg-blanco p-4 text-sm has-[:checked]:border-tinta"
              >
                <input
                  type="radio"
                  name="modo"
                  value={o.valor}
                  checked={modo === o.valor}
                  onChange={() => setModo(o.valor)}
                  className="mt-0.5 accent-verde"
                />
                <span>
                  <span className="font-medium">{o.titulo}</span>
                  <span className="mt-1 block text-gris">
                    {o.valor === "separado"
                      ? `Pagas ${soles(pagasAhora + envio)} ahora (con el envío) y eso sale primero. El resto (${soles(porEncargo)}) lo pagas cuando la marca lo confirme, sin otro envío. Pueden llegar en fechas distintas.`
                      : `No pagas ahora. Apartamos lo que hay en stock y las marcas confirman lo que falta. Pagas todo (${soles(total)}, con el envío) en un solo pago y llega junto.`}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {/* Pago: solo de lo que tiene stock. El encargo se paga cuando la marca lo confirme. */}
      {pagaAhora && (
        <fieldset className="border-t border-linea pt-6">
          <legend className={`${sello} mb-4 pt-6`}>Pago</legend>
          <p className="mb-3 text-sm">
            Pagas ahora <strong className="font-mono">{soles(pagasAhora + envio)}</strong>
            {envio > 0 && <span className="text-gris"> (incluye {soles(envio)} de envío)</span>}
            {porEncargo > 0 && (
              <span className="text-gris"> · el encargo ({soles(porEncargo)}) lo pagas cuando la marca lo confirme</span>
            )}
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {METODOS_PAGO.map((m) => (
              <label
                key={m.valor}
                className="flex cursor-pointer items-center gap-2 rounded-md border border-linea bg-blanco px-3 py-2.5 text-sm has-[:checked]:border-tinta"
              >
                <input type="radio" name="metodo_pago" value={m.valor} required defaultChecked={v.metodo_pago === m.valor} className="accent-verde" />
                {m.texto}
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs text-gris">Pago simulado: es un prototipo, no se cobra dinero real.</p>
        </fieldset>
      )}

      <AvisoForm estado={estado} />

      <div className="flex flex-col gap-3 border-t border-linea pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gris">
          {pagaAhora
            ? "Al pagar, Surtiba reserva el stock de cada marca."
            : "Las marcas confirmarán tu encargo y te avisaremos aquí para que lo pagues."}
        </p>
        <button type="submit" disabled={enviando} className={`${botonPrimario} shrink-0`}>
          {enviando
            ? "Enviando…"
            : pagaAhora
              ? `Pagar ${soles(pagasAhora + envio)} y enviar`
              : `Enviar pedido por encargo · ${soles(total)}`}
        </button>
      </div>
    </form>
  );
}
