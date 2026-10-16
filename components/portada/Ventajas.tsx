// Ventajas en grilla "bento": cada celda muestra un dato, no solo un ícono.
// Precio por volumen: sin sesión, un ejemplo en % (sin sesión solo se ve el precio "desde");
// con sesión de comprador o admin, la escala real de un producto.
import { Carga } from "@/components/Carga";
import { ordenarTramos, textoTramo } from "@/lib/catalogo";
import { sello } from "@/lib/estilos";
import { soles } from "@/lib/formato";
import { obtenerUsuario } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";

const celda = "aparecer rounded-md border border-linea bg-blanco p-5 sm:p-6";

function FilaTramo({ tramo, valor, ancho, nota }: { tramo: string; valor: string; ancho: number; nota?: string }) {
  return (
    <li className="py-3">
      <div className="flex items-baseline justify-between gap-4 text-sm">
        <span>{tramo}</span>
        <span className="font-mono font-medium tabular-nums">
          {valor}
          {nota && <span className="ml-2 text-xs font-normal text-verde">{nota}</span>}
        </span>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-papel">
        <div className="h-full rounded-full bg-verde/70" style={{ width: `${ancho}%` }} />
      </div>
    </li>
  );
}

function TramosEjemplo() {
  return (
    <>
      <ul className="mt-5 divide-y divide-linea">
        <FilaTramo tramo="1 a 4 cajas" valor="Precio base" ancho={100} />
        <FilaTramo tramo="5 a 9 cajas" valor="−5 %" ancho={95} />
        <FilaTramo tramo="10 o más cajas" valor="−10 %" ancho={90} />
      </ul>
      <p className="mt-3 text-xs text-gris">Ejemplo. Cada marca define su escala; la ves al ingresar.</p>
    </>
  );
}

// Con sesión: la escala real del producto con más tramos
async function Tramos() {
  const usuario = await obtenerUsuario();
  if (usuario?.rol !== "comprador" && usuario?.rol !== "admin") return <TramosEjemplo />;
  const supabase = await createClient();
  const { data } = await supabase
    .from("productos")
    .select("nombre, marcas(nombre_comercial), escalas_precio(desde_cajas, hasta_cajas, precio_caja_centimos)")
    .eq("activo", true)
    .order("nombre");
  const producto = (data ?? []).sort((a, b) => b.escalas_precio.length - a.escalas_precio.length)[0];
  if (!producto || producto.escalas_precio.length < 2) return <TramosEjemplo />;
  const tramos = ordenarTramos(producto.escalas_precio);
  const base = tramos[0].precio_caja_centimos;
  return (
    <>
      <ul className="mt-5 divide-y divide-linea">
        {tramos.map((t, i) => {
          const descuento = Math.round((1 - t.precio_caja_centimos / base) * 100);
          return (
            <FilaTramo
              key={t.desde_cajas}
              tramo={textoTramo(t)}
              valor={`${soles(t.precio_caja_centimos)} por caja`}
              ancho={(t.precio_caja_centimos / base) * 100}
              nota={i > 0 && descuento > 0 ? `−${descuento} %` : undefined}
            />
          );
        })}
      </ul>
      <p className="mt-3 text-xs text-gris">
        {producto.nombre} · {producto.marcas?.nombre_comercial}
      </p>
    </>
  );
}

export function Ventajas({ marcas }: { marcas: string[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Precio por volumen (celda grande) */}
      <div className={`${celda} md:row-span-2 lg:col-span-2`}>
        <p className={sello}>Precio por volumen</p>
        <h3 className="mt-3 text-xl font-semibold tracking-tight">Mientras más cajas, mejor precio</h3>
        <p className="mt-1 text-sm text-gris">Lo ves antes de pedir, en el carrito y en la cotización.</p>
        <Carga fallback={<TramosEjemplo />}>
          <Tramos />
        </Carga>
      </div>

      {/* Varias marcas, un pedido */}
      <div className={`${celda} lg:col-span-2`}>
        <p className={sello}>Varias marcas, un pedido</p>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          {marcas.map((m) => (
            <span key={m} className="rounded-sm border border-linea px-2.5 py-1 text-xs">
              {m}
            </span>
          ))}
          <span className="px-1 text-gris" aria-hidden="true">
            →
          </span>
          <span className="rounded-sm bg-tinta px-2.5 py-1 font-mono text-xs text-blanco">1 pedido · 1 entrega</span>
        </div>
        <p className="mt-4 text-sm text-gris">Un solo carrito para todas las marcas. Surtiba coordina el recojo y la entrega.</p>
      </div>

      {/* Con stock o por encargo */}
      <div className={celda}>
        <p className={sello}>Stock o encargo</p>
        <ul className="mt-5 flex flex-col gap-3 text-sm">
          <li className="flex items-center justify-between gap-3">
            <span>Hay stock</span>
            <span className="font-mono text-xs text-verde">Sale con tu pedido</span>
          </li>
          <li className="flex items-center justify-between gap-3">
            <span>Falta stock</span>
            <span className="rounded-sm border border-linea px-2 py-0.5 font-mono text-[11px] tracking-[0.08em] text-gris uppercase">
              Por encargo
            </span>
          </li>
        </ul>
        <p className="mt-4 text-xs text-gris">La marca confirma el encargo con fecha y recién ahí lo pagas.</p>
      </div>

      {/* Cotización en PDF: miniatura */}
      <div className={celda}>
        <p className={sello}>Cotización en PDF</p>
        <div aria-hidden="true" className="mt-5 rounded-sm border border-linea bg-papel p-3">
          <div className="flex items-start justify-between">
            <span className="text-xs font-semibold">surtiba</span>
            <span className="font-mono text-[10px] text-gris">COT-0001</span>
          </div>
          <div className="mt-3 flex flex-col gap-1.5">
            {[80, 65, 72, 55].map((w) => (
              <div key={w} className="flex items-center justify-between gap-2">
                <div className="h-1.5 rounded-full bg-linea" style={{ width: `${w}%` }} />
                <div className="h-1.5 w-6 rounded-full bg-linea" />
              </div>
            ))}
          </div>
          <div className="mt-3 flex justify-end border-t border-linea pt-2">
            <div className="h-2 w-12 rounded-full bg-tinta/70" />
          </div>
        </div>
        <p className="mt-3 text-xs text-gris">Con tu evento, las cajas y los precios, lista para compartir.</p>
      </div>
    </div>
  );
}
