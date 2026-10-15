"use client";

import { useActionState } from "react";
import { AvisoForm } from "@/components/AvisoForm";
import type { EstadoForm } from "@/lib/acciones-auth";
import { guardarStock } from "@/lib/acciones-marca";
import { botonPrimario, campo, sello } from "@/lib/estilos";

type ProductoStock = { id: string; nombre: string; stock: number; activo: boolean; unidades: number };

// Tabla editable: cambias las cajas de todos tus productos y guardas una sola vez
export function FormStock({ productos }: { productos: ProductoStock[] }) {
  const [estado, accion, enviando] = useActionState<EstadoForm, FormData>(guardarStock, {});

  return (
    // key: cuando llegan números nuevos del servidor, la tabla se vuelve a dibujar con ellos
    <form key={productos.map((p) => p.stock).join(",")} action={accion}>
      <div className="overflow-x-auto rounded-md border border-linea bg-blanco">
        <table className="w-full min-w-[480px] text-sm">
          <thead>
            <tr className="border-b border-linea text-left">
              <th className={`${sello} px-4 py-3 font-medium`}>Producto</th>
              <th className={`${sello} px-4 py-3 font-medium`}>Estado</th>
              <th className={`${sello} px-4 py-3 text-right font-medium`}>Cajas disponibles</th>
            </tr>
          </thead>
          <tbody>
            {productos.map((p) => (
              <tr key={p.id} className="border-b border-linea last:border-b-0">
                <td className="px-4 py-2.5">
                  <label htmlFor={`stock-${p.id}`}>{p.nombre}</label>
                  <span className="block font-mono text-xs text-gris">{p.unidades} u/caja</span>
                </td>
                <td className="px-4 py-2.5 text-gris">{p.activo ? "Activo" : "Inactivo"}</td>
                <td className="px-4 py-2.5 text-right">
                  {/* Lo que había en pantalla: el servidor lo compara para no pisar cambios de otros */}
                  <input type="hidden" name={`antes:${p.id}`} value={p.stock} />
                  <input
                    id={`stock-${p.id}`}
                    name={`stock:${p.id}`}
                    type="number"
                    min={0}
                    max={99999}
                    required
                    defaultValue={p.stock}
                    className={`${campo} h-10 w-28 text-right font-mono ${p.stock === 0 ? "border-gris" : ""}`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <button type="submit" disabled={enviando} className={botonPrimario}>
          {enviando ? "Guardando…" : "Guardar stock"}
        </button>
        <AvisoForm estado={estado} />
      </div>
    </form>
  );
}
