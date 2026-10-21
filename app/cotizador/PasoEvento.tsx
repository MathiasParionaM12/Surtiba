"use client";

import { Etiqueta } from "@/components/Etiqueta";
import { LIMITES, PERFILES, type EntradaCotizador, type Parametros, type TipoEvento } from "@/lib/cotizador";
import { areaToque, campo } from "@/lib/estilos";
import { Segmentado } from "./ui";

// Resumen de los momentos de un tipo de evento: "6 h · bienvenida, cena, brindis y fiesta"
function describir(t: TipoEvento) {
  const partes = [t.bienvenida && "bienvenida", t.cena && "cena", t.brindis && "brindis", "fiesta"].filter(Boolean) as string[];
  const lista = partes.length > 1 ? `${partes.slice(0, -1).join(", ")} y ${partes.at(-1)}` : partes[0];
  return `${t.horas} h · ${lista}`;
}

export function PasoEvento({
  entrada,
  actualizar,
  tipos,
  cambiarTipo,
  cambiarInvitados,
  sugeridoNoToman,
  parametros,
}: {
  entrada: EntradaCotizador;
  actualizar: (cambio: Partial<EntradaCotizador>) => void;
  tipos: TipoEvento[];
  cambiarTipo: (id: string) => void;
  cambiarInvitados: (valor: string) => void;
  sugeridoNoToman: number;
  parametros: Parametros;
}) {
  // Tragos por hora en la fiesta de cada tipo de público (de día se toma un poco menos)
  const hora = Number(entrada.horaInicio.split(":")[0]);
  const deDia = hora >= 6 && hora < 17;
  const factor = { tranquilo: parametros.factor_tranquilo, normal: parametros.factor_normal, fuerte: parametros.factor_fuerte };
  const porHora = (p: keyof typeof factor) => parametros.fiesta_tragos_hora * factor[p] * (deDia ? parametros.factor_dia : 1);
  const decimal = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });

  return (
    <div className="flex flex-col gap-7">
      <fieldset>
        <legend className="mb-3 text-sm font-medium">¿Qué tipo de evento es?</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {tipos.map((t) => {
            const activo = t.id === entrada.tipoEventoId;
            return (
              <button
                key={t.id}
                type="button"
                aria-pressed={activo}
                onClick={() => cambiarTipo(t.id)}
                className={`rounded-md border px-4 py-3 text-left transition-colors ${
                  activo ? "border-tinta bg-blanco" : "border-linea bg-blanco hover:border-gris"
                }`}
              >
                <span className="block font-medium">{t.nombre}</span>
                <span className="mt-0.5 block text-xs text-gris">{describir(t)}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-gris">Al elegirlo, llenamos los momentos y la barra típicos. Después puedes cambiar todo.</p>
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="flex flex-col gap-2">
          <Etiqueta texto="Nombre del evento" nota="opcional" />
          <input
            value={entrada.nombre}
            maxLength={80}
            onChange={(e) => actualizar({ nombre: e.target.value })}
            placeholder="Ej.: Boda Pérez García"
            className={campo}
          />
        </label>
        <label className="flex flex-col gap-2">
          <Etiqueta texto="Fecha" nota="opcional" />
          <input type="date" value={entrada.fecha} onChange={(e) => actualizar({ fecha: e.target.value })} className={`${campo} font-mono`} />
        </label>
        <label className="flex flex-col gap-2">
          <Etiqueta texto="Invitados" obligatorio />
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={LIMITES.invitadosMax}
            value={entrada.invitados || ""}
            onChange={(e) => cambiarInvitados(e.target.value)}
            className={`${campo} font-mono`}
          />
        </label>
        <label className="flex flex-col gap-2">
          <Etiqueta texto="¿Cuántos no toman alcohol?" />
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={entrada.invitados}
            value={entrada.noToman}
            onChange={(e) => actualizar({ noToman: Math.max(0, Math.trunc(Number(e.target.value)) || 0) })}
            className={`${campo} font-mono`}
          />
          <span className="text-xs text-gris">
            Niños, conductores y quienes no toman. Sugerido: {sugeridoNoToman}.{" "}
            {entrada.noToman !== sugeridoNoToman && (
              <button type="button" onClick={() => actualizar({ noToman: sugeridoNoToman })} className={`${areaToque} font-medium enlace text-verde hover:text-tinta`}>
                Usar sugerido
              </button>
            )}
          </span>
        </label>
        <label className="flex flex-col gap-2">
          <Etiqueta texto="Hora de inicio" />
          <input
            type="time"
            step={1800}
            value={entrada.horaInicio}
            onChange={(e) => actualizar({ horaInicio: e.target.value || "19:00" })}
            className={`${campo} font-mono`}
          />
        </label>
        <label className="flex flex-col gap-2">
          <Etiqueta texto="Duración" />
          <select value={entrada.horas} onChange={(e) => actualizar({ horas: Number(e.target.value) })} className={campo}>
            {Array.from({ length: LIMITES.horasMax }, (_, i) => i + 1).map((h) => (
              <option key={h} value={h}>
                {h} {h === 1 ? "hora" : "horas"}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">¿Dónde es?</span>
        <Segmentado
          etiqueta="Lugar del evento"
          opciones={[
            { valor: "interior", texto: "Interior" },
            { valor: "calor", texto: "Aire libre o verano" },
          ]}
          valor={entrada.aireLibre ? "calor" : "interior"}
          onCambio={(v) => actualizar({ aireLibre: v === "calor" })}
        />
        <span className="text-xs text-gris">Con calor se necesita más hielo.</span>
      </div>

      <fieldset>
        <legend className="text-sm font-medium">¿Cómo es tu público?</legend>
        <p className="mt-0.5 mb-3 text-xs text-gris">
          Define cuánto se toma en la fiesta. Lo sugiere el tipo de evento; cámbialo si conoces a tus invitados.
        </p>
        <div role="radiogroup" aria-label="Cómo es tu público" className="grid gap-2 sm:grid-cols-3">
          {PERFILES.map((p) => {
            const activo = entrada.perfil === p.valor;
            return (
              <button
                key={p.valor}
                type="button"
                role="radio"
                aria-checked={activo}
                onClick={() => actualizar({ perfil: p.valor })}
                className={`flex min-h-11 flex-col rounded-md border bg-blanco px-4 py-3 text-left transition-colors ${
                  activo ? "border-tinta" : "border-linea hover:border-gris"
                }`}
              >
                <span className="font-medium">{p.texto}</span>
                <span className="mt-0.5 text-xs text-gris">{p.ayuda}</span>
                <span className="mt-2 font-mono text-xs">
                  ≈ {decimal.format(porHora(p.valor))} {decimal.format(porHora(p.valor)) === "1" ? "trago" : "tragos"} por hora por persona
                </span>
              </button>
            );
          })}
        </div>
        {deDia && <p className="mt-2 text-xs text-gris">Tu evento empieza de día: se toma un poco menos que de noche.</p>}
      </fieldset>
    </div>
  );
}
