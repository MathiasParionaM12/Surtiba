"use client";

import { horasDeFiesta, type EntradaCotizador, type Momento, type Parametros, type Receta } from "@/lib/cotizador";
import { campo } from "@/lib/estilos";
import { Interruptor, LineaTiempo } from "./ui";

const decimal = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 1 });
const HORAS = [0.5, 1, 1.5, 2, 2.5, 3, 4];
const textoHoras = (h: number) => `${decimal.format(h)} ${h === 1 ? "hora" : "horas"}`;

function Tarjeta({
  titulo,
  ayuda,
  activo,
  onActivo,
  children,
}: {
  titulo: string;
  ayuda: string;
  activo: boolean;
  onActivo?: (v: boolean) => void;
  children?: React.ReactNode;
}) {
  return (
    <div className={`rounded-md border bg-blanco p-4 transition-colors ${activo ? "border-gris" : "border-linea"}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={`font-medium ${activo ? "" : "text-gris"}`}>{titulo}</p>
          <p className="mt-0.5 text-xs text-gris">{ayuda}</p>
        </div>
        {onActivo && <Interruptor activo={activo} onCambio={onActivo} etiqueta={titulo} />}
      </div>
      {activo && children && <div className="mt-4 flex flex-wrap gap-4">{children}</div>}
    </div>
  );
}

export function PasoMomentos({
  entrada,
  actualizar,
  recetas,
  momentos,
  parametros: par,
}: {
  entrada: EntradaCotizador;
  actualizar: (cambio: Partial<EntradaCotizador>) => void;
  recetas: Receta[];
  momentos: Momento[];
  parametros: Parametros;
}) {
  const fiesta = horasDeFiesta(entrada);

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-gris">
        Activa lo que tendrá tu evento. Van uno tras otro, desde las{" "}
        <span className="font-mono text-tinta">{entrada.horaInicio}</span>; la fiesta usa las horas que quedan.
      </p>
      <LineaTiempo momentos={momentos} />

      <Tarjeta
        titulo="Bienvenida"
        ayuda={`Cóctel de recepción. Es cuando más se toma: ${decimal.format(par.bienvenida_tragos_hora)} tragos por persona por hora.`}
        activo={entrada.bienvenida.activo}
        onActivo={(v) => actualizar({ bienvenida: { ...entrada.bienvenida, activo: v } })}
      >
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-gris">Duración</span>
          <select
            value={entrada.bienvenida.horas}
            onChange={(e) => actualizar({ bienvenida: { ...entrada.bienvenida, horas: Number(e.target.value) } })}
            className={`${campo} h-10 w-36`}
          >
            {HORAS.filter((h) => h <= 3).map((h) => (
              <option key={h} value={h}>
                {textoHoras(h)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-48 flex-1 flex-col gap-1.5">
          <span className="text-xs text-gris">¿Qué se sirve?</span>
          <select
            value={entrada.bienvenida.recetaId ?? ""}
            onChange={(e) => actualizar({ bienvenida: { ...entrada.bienvenida, recetaId: e.target.value || null } })}
            className={`${campo} h-10`}
          >
            <option value="">Los mismos tragos de la barra</option>
            {recetas.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nombre}
              </option>
            ))}
          </select>
        </label>
      </Tarjeta>

      <Tarjeta
        titulo="Cena con vino"
        ayuda={`${decimal.format(par.cena_copas_hora)} copa de vino por persona por hora de cena. Con comida se toma menos.`}
        activo={entrada.cena.activo}
        onActivo={(v) => actualizar({ cena: { ...entrada.cena, activo: v } })}
      >
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-gris">Duración</span>
          <select
            value={entrada.cena.horas}
            onChange={(e) => actualizar({ cena: { ...entrada.cena, horas: Number(e.target.value) } })}
            className={`${campo} h-10 w-36`}
          >
            {HORAS.map((h) => (
              <option key={h} value={h}>
                {textoHoras(h)}
              </option>
            ))}
          </select>
        </label>
      </Tarjeta>

      <Tarjeta
        titulo="Brindis"
        ayuda={`${decimal.format(par.brindis_copas)} copa de espumante por persona que toma.`}
        activo={entrada.brindis.activo}
        onActivo={(v) => actualizar({ brindis: { activo: v } })}
      />

      <Tarjeta
        titulo="Fiesta (barra libre)"
        ayuda={
          fiesta > 0
            ? `${textoHoras(fiesta)} con los tragos de la barra (los eliges en el siguiente paso).`
            : "No quedan horas para la fiesta. Alarga el evento o acorta la bienvenida o la cena."
        }
        activo={fiesta > 0}
      />
      {fiesta < 0 && (
        <p role="alert" className="border-l-2 border-rojo pl-3 text-sm">
          La bienvenida y la cena duran más que todo el evento ({entrada.horas} h). Ajusta las horas.
        </p>
      )}
    </div>
  );
}
