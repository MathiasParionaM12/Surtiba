"use client";

import { useActionState, useState } from "react";
import { AvisoForm } from "@/components/AvisoForm";
import { Etiqueta } from "@/components/Etiqueta";
import type { EstadoForm } from "@/lib/acciones-auth";
import { guardarProducto } from "@/lib/acciones-marca";
import { CATEGORIAS } from "@/lib/catalogo";
import { botonPrimario, botonSecundario, campo, sello } from "@/lib/estilos";

export type DatosProducto = {
  id?: string;
  nombre: string;
  categoria: string;
  ml: string;
  grado: string;
  unidades: string;
  registro: string;
  stock: string;
  activo: boolean;
  tramos: { desde: string; precio: string }[]; // precio en soles, ej. "420.00"
};

export function FormProducto({ inicial }: { inicial: DatosProducto }) {
  const [estado, accion, enviando] = useActionState<EstadoForm, FormData>(guardarProducto, {});
  const v = estado.valores;
  const [tramos, setTramos] = useState(inicial.tramos.length ? inicial.tramos : [{ desde: "1", precio: "" }]);
  const nuevo = !inicial.id;

  const cambiarTramo = (i: number, campoTramo: "desde" | "precio", valor: string) =>
    setTramos((t) => t.map((x, j) => (j === i ? { ...x, [campoTramo]: valor } : x)));

  return (
    <form action={accion} className="flex flex-col gap-8">
      {inicial.id && <input type="hidden" name="id" value={inicial.id} />}
      <p className="text-xs text-gris">Los campos con * son obligatorios.</p>

      <fieldset className="grid grid-cols-2 gap-5 sm:grid-cols-4">
        <legend className={`${sello} mb-4`}>Datos del producto</legend>
        <label className="col-span-2 flex flex-col gap-2 sm:col-span-3">
          <Etiqueta texto="Nombre" obligatorio />
          <input name="nombre" required defaultValue={v?.nombre ?? inicial.nombre} className={campo} />
        </label>
        <label className="col-span-2 flex flex-col gap-2 sm:col-span-1">
          <Etiqueta texto="Categoría" obligatorio />
          <select name="categoria" required defaultValue={v?.categoria ?? inicial.categoria} className={campo}>
            <option value="" disabled>
              Elige
            </option>
            {Object.entries(CATEGORIAS).map(([valor, texto]) => (
              <option key={valor} value={valor}>
                {texto}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <Etiqueta texto="ml por botella" obligatorio />
          <input name="ml" type="number" min={1} required defaultValue={v?.ml ?? inicial.ml} className={`${campo} font-mono`} />
        </label>
        <label className="flex flex-col gap-2">
          <Etiqueta texto="Grado (%)" obligatorio />
          <input
            name="grado"
            type="number"
            min={0}
            max={100}
            step="0.1"
            required
            defaultValue={v?.grado ?? inicial.grado}
            className={`${campo} font-mono`}
          />
        </label>
        <label className="flex flex-col gap-2">
          <Etiqueta texto="Unidades por caja" obligatorio />
          <input
            name="unidades"
            type="number"
            min={1}
            required
            defaultValue={v?.unidades ?? inicial.unidades}
            className={`${campo} font-mono`}
          />
        </label>
        {nuevo ? (
          <label className="flex flex-col gap-2">
            <Etiqueta texto="Stock inicial (cajas)" obligatorio />
            <input
              name="stock"
              type="number"
              min={0}
              required
              defaultValue={v?.stock ?? inicial.stock}
              className={`${campo} font-mono`}
            />
          </label>
        ) : (
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Stock</span>
            <p className="flex h-11 items-center font-mono text-sm text-gris">{inicial.stock} cajas · se edita en Stock</p>
          </div>
        )}
        <label className="col-span-2 flex flex-col gap-2">
          <Etiqueta texto="Registro sanitario" nota="opcional" />
          <input name="registro" defaultValue={v?.registro ?? inicial.registro} className={`${campo} font-mono`} />
        </label>
        <label className="col-span-2 flex items-center gap-3 self-end pb-3">
          <input
            name="activo"
            type="checkbox"
            defaultChecked={v ? !!v.activo : inicial.activo}
            className="size-5 accent-verde"
          />
          <span className="text-sm">Activo (visible en el catálogo)</span>
        </label>
      </fieldset>

      {/* Escala de precios: el "hasta" de cada tramo se calcula solo */}
      <fieldset className="border-t border-linea pt-6">
        <legend className={`${sello} mb-2 pt-6`}>Precio por caja según cantidad</legend>
        <p className="mb-4 text-sm text-gris">
          El primer tramo empieza en 1 caja. Cada tramo llega hasta donde empieza el siguiente, y el último vale para
          cualquier cantidad mayor.
        </p>
        <div className="flex flex-col gap-3">
          {tramos.map((t, i) => {
            const siguiente = tramos[i + 1]?.desde;
            const hasta = siguiente && Number(siguiente) > Number(t.desde) ? Number(siguiente) - 1 : null;
            return (
              <div key={i} className="flex flex-wrap items-end gap-3 rounded-md border border-linea bg-papel p-3">
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-gris">Desde (cajas)</span>
                  <input
                    name="tramo_desde"
                    type="number"
                    min={1}
                    required
                    readOnly={i === 0}
                    value={i === 0 ? "1" : t.desde}
                    onChange={(e) => cambiarTramo(i, "desde", e.target.value)}
                    className={`${campo} h-10 w-24 font-mono ${i === 0 ? "bg-papel text-gris" : ""}`}
                  />
                </label>
                <p className="h-10 content-center font-mono text-sm text-gris">
                  {hasta ? `hasta ${hasta}` : i === tramos.length - 1 ? "o más" : ""}
                </p>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-gris">Precio por caja (S/)</span>
                  <input
                    name="tramo_precio"
                    type="number"
                    min={0.01}
                    step="0.01"
                    required
                    value={t.precio}
                    onChange={(e) => cambiarTramo(i, "precio", e.target.value)}
                    placeholder="420.00"
                    className={`${campo} h-10 w-32 font-mono`}
                  />
                </label>
                {i > 0 && (
                  <button
                    type="button"
                    onClick={() => setTramos((x) => x.filter((_, j) => j !== i))}
                    className="h-10 px-2 text-sm font-medium text-gris hover:text-tinta"
                  >
                    Quitar
                  </button>
                )}
              </div>
            );
          })}
        </div>
        {tramos.length < 10 && (
          <button
            type="button"
            onClick={() => {
              const ultimo = Number(tramos[tramos.length - 1]?.desde || 1);
              setTramos((x) => [...x, { desde: String(ultimo + 5), precio: "" }]);
            }}
            className={`${botonSecundario} mt-3 h-10`}
          >
            Agregar tramo
          </button>
        )}
      </fieldset>

      <AvisoForm error={estado.error} mensaje={estado.mensaje} />

      <div className="border-t border-linea pt-6">
        <button type="submit" disabled={enviando} className={botonPrimario}>
          {enviando ? "Guardando…" : nuevo ? "Crear producto" : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}
