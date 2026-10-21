"use client";

// "Crear mi trago": el comprador pone un nombre y sus ingredientes con la cantidad por trago.
// Elige cada ingrediente de la lista de Surtiba o escribe uno nuevo. El servidor vuelve a revisar
// todo y es quien decide qué ingredientes vende Surtiba (ver limpiarPropios en cotizador-datos.ts).
import { Plus, X } from "lucide-react";
import { useState } from "react";
import { LIMITES, type Ingrediente, type IngredienteReceta, type TragoPropio } from "@/lib/cotizador";
import { botonPrimario, botonSecundario, campo } from "@/lib/estilos";

const UNIDADES: { valor: IngredienteReceta["unidad"]; texto: string }[] = [
  { valor: "ml", texto: "ml" },
  { valor: "unidad", texto: "unidades" },
  { valor: "g", texto: "g" },
];
const textoUnidad = (u: IngredienteReceta["unidad"]) => UNIDADES.find((x) => x.valor === u)?.texto ?? u;

type Linea = { clave: number; id: string; nombreLibre: string; unidad: IngredienteReceta["unidad"]; cantidad: string };
const OTRO = "otro";

export function CrearTrago({
  ingredientes,
  nombreInicial,
  onCrear,
  onCancelar,
}: {
  ingredientes: Ingrediente[];
  nombreInicial: string;
  onCrear: (t: TragoPropio) => void;
  onCancelar: () => void;
}) {
  const [nombre, setNombre] = useState(nombreInicial);
  const [lineas, setLineas] = useState<Linea[]>([{ clave: 1, id: "", nombreLibre: "", unidad: "ml", cantidad: "" }]);
  const [error, setError] = useState<string>();
  const porId = new Map(ingredientes.map((i) => [i.id, i]));
  const deSurtiba = ingredientes.filter((i) => i.categoria);
  const otros = ingredientes.filter((i) => !i.categoria);

  const cambiar = (clave: number, cambio: Partial<Linea>) =>
    setLineas((ls) => ls.map((l) => (l.clave === clave ? { ...l, ...cambio } : l)));
  const sumarLinea = () =>
    setLineas((ls) => [...ls, { clave: Math.max(0, ...ls.map((l) => l.clave)) + 1, id: "", nombreLibre: "", unidad: "ml", cantidad: "" }]);
  const quitarLinea = (clave: number) => setLineas((ls) => (ls.length > 1 ? ls.filter((l) => l.clave !== clave) : ls));

  const crear = () => {
    const limpio = nombre.trim();
    if (limpio.length < 2) return setError("Ponle un nombre a tu trago.");
    const lista: IngredienteReceta[] = [];
    for (const l of lineas) {
      const cantidad = Number(l.cantidad);
      if (!l.id) return setError("Elige cada ingrediente o quita la fila vacía.");
      if (!(cantidad > 0 && cantidad <= LIMITES.cantidadMax))
        return setError(`Cada ingrediente lleva una cantidad entre 0 y ${LIMITES.cantidadMax}.`);
      if (l.id === OTRO) {
        if (l.nombreLibre.trim().length < 2) return setError("Escribe el nombre del ingrediente nuevo.");
        lista.push({ id: "libre", nombre: l.nombreLibre.trim(), unidad: l.unidad, categoria: null, orden: 99, cantidad });
      } else {
        lista.push({ ...porId.get(l.id)!, cantidad });
      }
    }
    onCrear({ id: `propio-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, nombre: limpio, ingredientes: lista });
  };

  return (
    <div className="flex flex-col gap-4 rounded-md border border-tinta bg-blanco p-4">
      <div>
        <h4 className="font-medium">Crear mi trago</h4>
        <p className="mt-0.5 text-xs text-gris">
          Pon lo que lleva <strong className="font-medium text-tinta">un</strong> trago. Lo usamos solo en tu cotización.
        </p>
      </div>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Nombre del trago</span>
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          maxLength={40}
          placeholder="Ej.: Chilcano de maracuyá"
          className={campo}
        />
      </label>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1.5 text-sm font-medium">Ingredientes por trago</legend>
        {lineas.map((l, n) => {
          const conocido = porId.get(l.id);
          return (
            <div key={l.clave} className="flex flex-col gap-2 border-b border-linea pb-3 last:border-b-0 sm:flex-row sm:items-start">
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <select
                  value={l.id}
                  onChange={(e) => cambiar(l.clave, { id: e.target.value })}
                  aria-label={`Ingrediente ${n + 1}`}
                  className={`${campo} text-sm sm:h-10`}
                >
                  <option value="">Elige un ingrediente</option>
                  <optgroup label="Los vende Surtiba">
                    {deSurtiba.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.nombre}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Otros">
                    {otros.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.nombre}
                      </option>
                    ))}
                    <option value={OTRO}>Otro (lo escribo yo)</option>
                  </optgroup>
                </select>
                {l.id === OTRO && (
                  <div className="flex gap-2">
                    <input
                      value={l.nombreLibre}
                      onChange={(e) => cambiar(l.clave, { nombreLibre: e.target.value })}
                      maxLength={40}
                      placeholder="Ej.: Pulpa de aguaymanto"
                      aria-label={`Nombre del ingrediente ${n + 1}`}
                      className={`${campo} min-w-0 text-sm sm:h-10`}
                    />
                    <div className="w-28 shrink-0">
                      <select
                        value={l.unidad}
                        onChange={(e) => cambiar(l.clave, { unidad: e.target.value as IngredienteReceta["unidad"] })}
                        aria-label={`Unidad del ingrediente ${n + 1}`}
                        className={`${campo} text-sm sm:h-10`}
                      >
                        {UNIDADES.map((u) => (
                          <option key={u.valor} value={u.valor}>
                            {u.texto}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="w-24 shrink-0">
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={LIMITES.cantidadMax}
                    step="any"
                    value={l.cantidad}
                    onChange={(e) => cambiar(l.clave, { cantidad: e.target.value })}
                    placeholder="0"
                    aria-label={`Cantidad del ingrediente ${n + 1}`}
                    className={`${campo} text-right font-mono text-sm sm:h-10`}
                  />
                </div>
                <span className="w-16 text-xs text-gris">{textoUnidad(conocido?.unidad ?? l.unidad)}</span>
                <button
                  type="button"
                  onClick={() => quitarLinea(l.clave)}
                  disabled={lineas.length === 1}
                  aria-label={`Quitar el ingrediente ${n + 1}`}
                  className="flex size-11 shrink-0 items-center justify-center rounded-md text-gris hover:bg-papel hover:text-tinta disabled:opacity-30 sm:size-10"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          );
        })}
        {lineas.length < LIMITES.ingredientesMax && (
          <button
            type="button"
            onClick={sumarLinea}
            className="flex min-h-11 items-center gap-1.5 self-start text-sm font-medium text-verde hover:text-tinta"
          >
            <Plus className="size-4" aria-hidden="true" />
            Otro ingrediente
          </button>
        )}
      </fieldset>

      {error && (
        <p role="alert" className="border-l-2 border-tinta pl-3 text-sm">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={crear} className={botonPrimario}>
          Agregar a la barra
        </button>
        <button type="button" onClick={onCancelar} className={botonSecundario}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
