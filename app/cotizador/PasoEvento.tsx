"use client";

import { Etiqueta } from "@/components/Etiqueta";
import { LIMITES, type EntradaCotizador, type TipoEvento } from "@/lib/cotizador";
import { campo } from "@/lib/estilos";
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
}: {
  entrada: EntradaCotizador;
  actualizar: (cambio: Partial<EntradaCotizador>) => void;
  tipos: TipoEvento[];
  cambiarTipo: (id: string) => void;
  cambiarInvitados: (valor: string) => void;
  sugeridoNoToman: number;
}) {
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
              <button type="button" onClick={() => actualizar({ noToman: sugeridoNoToman })} className="font-medium text-verde hover:text-tinta">
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
    </div>
  );
}
