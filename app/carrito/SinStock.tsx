import { cambiarPorOtro, decidirFaltante } from "@/lib/acciones-pedidos";
import { botonPrimario, botonSecundario } from "@/lib/estilos";
import { soles } from "@/lib/formato";

export type OpcionCambio = { id: string; nombre: string; marca: string; precio: number | null };

const cajas = (n: number) => `${n} ${n === 1 ? "caja" : "cajas"}`;

// Cuando un producto del carrito no alcanza el stock (5-nov-2026): el comprador decide antes de pagar.
// Pedir lo que falta por encargo, cambiarlo por otro con stock o llevar solo lo que hay.
export function SinStock({ productoId, stock, faltan, opciones }: { productoId: string; stock: number; faltan: number; opciones: OpcionCambio[] }) {
  return (
    <div className="mt-3 rounded-md border-2 border-rojo bg-blanco p-3">
      <p className="text-sm font-medium text-rojo">
        {stock > 0 ? `Hay ${cajas(stock)} en stock.` : "No hay stock ahora."} ¿Qué hacemos con {faltan === 1 ? "la caja que falta" : `las ${faltan} que faltan`}?
      </p>
      <div className="mt-3 flex flex-col gap-3">
        <form action={decidirFaltante} className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <input type="hidden" name="producto_id" value={productoId} />
          <input type="hidden" name="decision" value="encargo" />
          <button type="submit" className={`${botonPrimario} h-9 px-3 text-xs`}>
            Pedirlas por encargo
          </button>
          <span className="text-xs text-gris">La marca confirma si llega para tu fecha y recién ahí lo pagas.</span>
        </form>

        {opciones.length > 0 && (
          <div>
            <p className="text-xs text-gris">O cámbialas por otro con stock:</p>
            <ul className="mt-1.5 flex flex-col gap-1.5">
              {opciones.map((o) => (
                <li key={o.id}>
                  <form action={cambiarPorOtro} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-linea px-3 py-2">
                    <input type="hidden" name="producto_id" value={productoId} />
                    <input type="hidden" name="nuevo_id" value={o.id} />
                    <span className="min-w-0 text-sm">
                      <span className="font-medium">{o.nombre}</span>
                      <span className="block font-mono text-xs text-gris">
                        {o.marca} · {o.precio !== null ? `${soles(o.precio)} por caja` : "ver precio"}
                      </span>
                    </span>
                    <button type="submit" className={`${botonSecundario} h-9 px-3 text-xs`}>
                      Cambiar {cajas(faltan)}
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          </div>
        )}

        <form action={decidirFaltante}>
          <input type="hidden" name="producto_id" value={productoId} />
          <input type="hidden" name="decision" value="solo_stock" />
          <button type="submit" className="text-xs font-medium enlace text-verde hover:text-tinta">
            {stock > 0 ? `Llevar solo las ${stock}` : "Quitar este producto"}
          </button>
        </form>
      </div>
    </div>
  );
}

// Ya eligió encargo para lo que falta: se ve así, con la opción de cambiar de idea
export function EnEncargo({ productoId, ahora, faltan }: { productoId: string; ahora: number; faltan: number }) {
  return (
    <form action={decidirFaltante} className="mt-1 flex flex-wrap items-center gap-x-2 border-l-2 border-linea pl-2 text-xs">
      <input type="hidden" name="producto_id" value={productoId} />
      <input type="hidden" name="decision" value="deshacer" />
      <span>
        {ahora > 0 ? `${cajas(ahora)} ahora + ${cajas(faltan)} por encargo` : `${cajas(faltan)} por encargo`}
        <span className="text-gris"> · la marca confirma y recién ahí lo pagas</span>
      </span>
      <button type="submit" className="font-medium enlace text-verde hover:text-tinta">
        Cambiar
      </button>
    </form>
  );
}
