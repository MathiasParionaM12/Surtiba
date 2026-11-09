"use client";

// "Tu precio para el cliente" (7-nov-2026): el comprador suma sus otros costos (bartenders, cristalería, hielo…,
// con un precio supuesto que puede cambiar) y su ganancia, y ve cuánto cobrarle a su cliente por invitado.
// Desde el 9-nov-2026 también suma lo que consigue por su cuenta (ron, gaseosas, limones…): sin eso el precio
// salía muy bajo. El bartender se cobra por hora.
// La pantalla solo manda cantidades, precios del propio comprador y el %: el servidor revisa y calcula todo.
import { ChevronDown, Plus, X } from "lucide-react";
import { useState } from "react";
import { Cifra } from "@/components/Cifra";
import { LIMITES_REVENTA, REVENTA_VACIA, type EntradaCotizador, type LineaCosto, type Reventa, type ResultadoCotizacion } from "@/lib/cotizador";
import { areaToque, campo, sello } from "@/lib/estilos";
import { soles } from "@/lib/formato";

const enSoles = (centimos: number) => (centimos / 100).toFixed(2);
// "0.80" o "0,80" -> 80 céntimos; vacío o inválido -> undefined
const aCentimos = (t: string) => {
  const n = Number(t.replace(",", "."));
  return t.trim() !== "" && Number.isFinite(n) && n >= 0 ? Math.min(Math.round(n * 100), LIMITES_REVENTA.precioMax) : undefined;
};
const aEntero = (t: string, max: number) => {
  const n = Math.trunc(Number(t));
  return t.trim() !== "" && Number.isFinite(n) && n >= 0 ? Math.min(n, max) : undefined;
};

// Mientras escribes, muestra lo que escribes; al salir del campo, lo que calculó el servidor
function CampoNumero({
  valor,
  onCambio,
  etiqueta,
  decimal = false,
  ancho = "w-20",
  placeholder,
}: {
  valor: string;
  onCambio: (texto: string) => void;
  etiqueta: string;
  decimal?: boolean;
  ancho?: string;
  placeholder?: string;
}) {
  const [texto, setTexto] = useState(valor);
  const [editando, setEditando] = useState(false);
  return (
    <div className={`${ancho} shrink-0`}>
      <input
        type="text"
        inputMode={decimal ? "decimal" : "numeric"}
        aria-label={etiqueta}
        placeholder={placeholder}
        value={editando ? texto : valor}
        onFocus={() => {
          setTexto(valor);
          setEditando(true);
        }}
        onBlur={() => setEditando(false)}
        onChange={(e) => {
          setTexto(e.target.value);
          onCambio(e.target.value);
        }}
        className={`${campo} text-right font-mono text-sm sm:h-9`}
      />
    </div>
  );
}

export function PrecioCliente({
  entrada,
  actualizar,
  resultado,
}: {
  entrada: EntradaCotizador;
  actualizar: (cambio: Partial<EntradaCotizador>) => void;
  resultado: ResultadoCotizacion;
}) {
  const rv: Reventa = entrada.reventa ?? REVENTA_VACIA;
  const p = resultado.reventa;
  const cambiar = (c: Partial<Reventa>) => actualizar({ reventa: { ...rv, ...c } });

  // Cambiar la cantidad o el precio de un costo sugerido (undefined = volver a lo sugerido)
  const ajustar = (clave: string, campoAjuste: "cantidad" | "precio", valor: number | undefined) => {
    const a = { ...rv.ajustes[clave] };
    if (valor === undefined) delete a[campoAjuste];
    else a[campoAjuste] = valor;
    const ajustes = { ...rv.ajustes, [clave]: a };
    if (Object.keys(a).length === 0) delete ajustes[clave];
    cambiar({ ajustes });
  };
  const volverASugerido = (clave: string) => {
    const ajustes = { ...rv.ajustes };
    delete ajustes[clave];
    cambiar({ ajustes });
  };
  const editarOtro = (id: string, cambio: Partial<Reventa["otros"][number]>) =>
    cambiar({ otros: rv.otros.map((o) => (o.id === id ? { ...o, ...cambio } : o)) });
  const agregarOtro = () =>
    cambiar({ otros: [...rv.otros, { id: `otro-${Date.now().toString(36)}`, concepto: "", cantidad: 1, precio: 0 }] });

  const servicio = p.lineas.filter((l) => l.grupo !== "insumo");
  const insumos = p.lineas.filter((l) => l.grupo === "insumo");
  const suma = (ls: LineaCosto[]) => ls.reduce((s, l) => s + l.subtotal, 0);
  const sinPrecio = insumos.filter((l) => l.precio === 0).length;

  const fila = (l: LineaCosto) => {
    const otro = l.sugerida ? null : rv.otros.find((o) => o.id === l.clave);
    const cambiada = l.sugerida && rv.ajustes[l.clave];
    return (
      <li key={l.clave} className="relative flex flex-col gap-2 rounded-md border border-linea bg-blanco px-4 py-3 text-sm sm:flex-row sm:items-center sm:gap-3">
        <div className="min-w-0 flex-1 pr-10 sm:pr-0">
          {otro ? (
            <input
              value={otro.concepto}
              maxLength={LIMITES_REVENTA.conceptoMax}
              onChange={(e) => editarOtro(otro.id, { concepto: e.target.value })}
              placeholder="Ej.: barra móvil, movilidad, mozos"
              aria-label="Qué es este costo"
              className={`${campo} text-sm sm:h-9`}
            />
          ) : (
            <span className="font-medium">{l.concepto}</span>
          )}
          {l.nota && <span className="block text-xs text-gris">{l.nota}</span>}
          {l.sugerida && l.precio === 0 && <span className="block text-xs font-medium text-rojo">Pon tu precio.</span>}
          {l.sugerida && l.precio > 0 && l.precio === l.precioSupuesto && <span className="block text-xs text-gris">Precio supuesto: pon el tuyo.</span>}
          {cambiada && (
            <button type="button" onClick={() => volverASugerido(l.clave)} className={`${areaToque} text-xs font-medium enlace text-verde hover:text-tinta`}>
              Volver a lo sugerido
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <CampoNumero
            valor={String(l.cantidad)}
            ancho="w-16"
            etiqueta={`Cantidad de ${l.concepto || "este costo"}`}
            onCambio={(t) => {
              const n = aEntero(t, LIMITES_REVENTA.cantidadMax);
              if (l.sugerida) ajustar(l.clave, "cantidad", n);
              else if (otro) editarOtro(otro.id, { cantidad: n ?? 0 });
            }}
          />
          <span className="whitespace-nowrap text-gris" aria-hidden="true">
            × S/
          </span>
          <CampoNumero
            valor={enSoles(l.precio)}
            decimal
            ancho="w-20 sm:w-24"
            etiqueta={`Precio por unidad de ${l.concepto || "este costo"}, en soles`}
            onCambio={(t) => {
              const c = aCentimos(t);
              if (l.sugerida) ajustar(l.clave, "precio", c);
              else if (otro) editarOtro(otro.id, { precio: c ?? 0 });
            }}
          />
          <span className="ml-auto text-right font-mono whitespace-nowrap sm:w-24">{soles(l.subtotal)}</span>
          <button
            type="button"
            onClick={() => (l.sugerida ? cambiar({ quitados: [...rv.quitados, l.clave] }) : cambiar({ otros: rv.otros.filter((o) => o.id !== l.clave) }))}
            aria-label={`Quitar ${l.concepto || "este costo"}`}
            className="absolute top-1 right-1 inline-flex size-11 shrink-0 items-center justify-center rounded-md text-gris hover:bg-papel hover:text-tinta sm:static sm:size-9"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      </li>
    );
  };

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h3 className={sello}>Tu precio para el cliente</h3>
        <p className="mt-1 text-sm text-gris">
          Suma tus otros costos y tu ganancia para saber cuánto cobrar por invitado. Los precios son supuestos: cámbialos por los tuyos.
        </p>
      </div>

      <ul className="flex flex-col gap-2">{servicio.map(fila)}</ul>

      {/* Lo que consigue por su cuenta: una línea por cosa, plegado para no llenar la pantalla */}
      {insumos.length > 0 && (
        <details className="group rounded-md border border-linea bg-papel/60">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm">
            <span>
              <span className="font-medium">Lo que compras por tu cuenta</span>
              <span className="block text-xs text-gris">
                {insumos.length} {insumos.length === 1 ? "cosa" : "cosas"} que Surtiba no vende o no tiene por ahora
                {sinPrecio > 0 && <span className="font-medium text-rojo"> · {sinPrecio} sin precio</span>}
              </span>
            </span>
            <span className="flex items-center gap-2">
              <span className="font-mono">{soles(suma(insumos))}</span>
              <ChevronDown className="size-4 text-gris transition-transform group-open:rotate-180" aria-hidden="true" />
            </span>
          </summary>
          <ul className="flex flex-col gap-2 px-2 pb-2 sm:px-3 sm:pb-3">{insumos.map(fila)}</ul>
        </details>
      )}

      <div className="flex flex-wrap gap-2">
        {p.quitados.map((k) => (
          <button
            key={k.clave}
            type="button"
            onClick={() => cambiar({ quitados: rv.quitados.filter((x) => x !== k.clave) })}
            className="inline-flex min-h-11 items-center gap-1 rounded-md border border-linea bg-blanco px-3 text-sm hover:border-gris sm:min-h-9"
          >
            <Plus className="size-3.5 text-verde" aria-hidden="true" />
            {k.concepto}
          </button>
        ))}
        {rv.otros.length < LIMITES_REVENTA.otrosMax && (
          <button type="button" onClick={agregarOtro} className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium enlace text-verde hover:text-tinta">
            <Plus className="size-4" aria-hidden="true" />
            Agregar otro costo
          </button>
        )}
      </div>

      {/* Resumen: costo, ganancia y precio para el cliente */}
      <dl className="flex flex-col gap-2 rounded-md border border-linea bg-blanco p-4 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-gris">Bebidas de Surtiba{resultado.clientePone.length > 0 ? " (sin lo que pone tu cliente)" : ""}</dt>
          <dd className="font-mono">{soles(p.bebidas)}</dd>
        </div>
        {insumos.length > 0 && (
          <div className="flex justify-between gap-3">
            <dt className="text-gris">Lo que compras por tu cuenta</dt>
            <dd className="font-mono">{soles(suma(insumos))}</dd>
          </div>
        )}
        <div className="flex justify-between gap-3">
          <dt className="text-gris">Servicio y otros costos</dt>
          <dd className="font-mono">{soles(suma(servicio))}</dd>
        </div>
        <div className="flex justify-between gap-3 border-t border-linea pt-2">
          <dt className="font-medium">Tu costo</dt>
          <dd className="font-mono font-medium">{soles(p.costo)}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt>
            Tu ganancia
            <span className="block text-xs text-gris">% sobre tu costo</span>
          </dt>
          <dd className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <CampoNumero
                valor={rv.ganancia === null ? "" : String(rv.ganancia)}
                etiqueta="Tu ganancia en porcentaje"
                ancho="w-16"
                placeholder="Ej.: 30"
                onCambio={(t) => cambiar({ ganancia: aEntero(t, LIMITES_REVENTA.gananciaMax) ?? null })}
              />
              <span className="text-gris">%</span>
            </div>
            <span className="w-24 text-right font-mono">{soles(p.gananciaMonto)}</span>
          </dd>
        </div>
        <div className="mt-1 flex items-baseline justify-between gap-3 border-t border-linea pt-3">
          <dt className="font-medium">Precio para tu cliente</dt>
          <dd className="text-right">
            <span className="block font-mono text-lg font-semibold">
              <Cifra>{soles(p.porInvitado)}</Cifra> <span className="text-sm font-normal text-gris">por invitado</span>
            </span>
            <span className="block font-mono text-xs text-gris">{soles(p.precio)} en total</span>
          </dd>
        </div>
        {p.ganancia === null && <p className="text-xs text-gris">Pon tu ganancia para ver cuánto cobrarle.</p>}
      </dl>
    </section>
  );
}
