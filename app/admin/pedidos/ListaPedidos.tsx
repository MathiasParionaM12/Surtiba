"use client";

// Lista de pedidos del admin: pestañas por etapa (con su número), filtros por marca y pago, y un buscador
// por código o comprador. Filtra en el navegador (son pocos pedidos): cambia al instante, sin recargar,
// y deja los filtros en la dirección (?etapa=recoger&marca=…) para poder volver a ellos.
import { Inbox, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { EstadoVacio } from "@/components/EstadoVacio";
import { EtiquetaEstado } from "@/components/EtiquetaEstado";
import { normalizar } from "@/lib/cotizador";
import { campo, sello } from "@/lib/estilos";
import { fecha, soles } from "@/lib/formato";

export type PedidoAdmin = {
  id: string;
  codigo: string;
  estado: string;
  tipo: string;
  total_centimos: number;
  pagado_centimos: number;
  pago_estado: string;
  creado_en: string;
  fecha_entrega_deseada: string;
  comprador: string;
  marcas: { id: string; nombre: string; fuera: boolean }[]; // fuera = rechazada o cancelada
};

// estado: un estado exacto (llega desde los enlaces del inicio del admin, ej. ?estado=por_pagar)
export type FiltrosPedidos = { etapa?: string; estado?: string; marca?: string; pago?: string; q?: string };

// Etapas desde el punto de vista del equipo Surtiba (docs/modelo-datos.md → Estados)
const ETAPAS: Record<string, { texto: string; ayuda: string; estados: string[] | null }> = {
  atender: {
    texto: "Por atender",
    ayuda: "Encargos que esperan a la marca o el pago, y pedidos que las marcas están preparando.",
    estados: ["por_confirmar", "por_pagar", "recibido"],
  },
  recoger: { texto: "Por recoger", ayuda: "Alguna marca ya dejó su parte lista: toca ir a recogerla.", estados: ["en_preparacion"] },
  camino: { texto: "En camino", ayuda: "Todo recogido y en ruta al comprador.", estados: ["en_camino"] },
  cerrados: { texto: "Cerrados", ayuda: "Entregados y cancelados.", estados: ["entregado", "cancelado"] },
  todos: { texto: "Todos", ayuda: "", estados: null },
};

export function ListaPedidos({
  pedidos,
  marcas,
  filtrosIniciales: f,
}: {
  pedidos: PedidoAdmin[];
  marcas: { id: string; nombre: string }[];
  filtrosIniciales: FiltrosPedidos;
}) {
  const [estado, setEstado] = useState(f.estado ?? "");
  // Con un estado exacto se abre la pestaña que lo contiene
  const etapaDelEstado = Object.keys(ETAPAS).find((k) => ETAPAS[k].estados?.includes(f.estado ?? ""));
  const [etapa, setEtapa] = useState(f.etapa && ETAPAS[f.etapa] ? f.etapa : (etapaDelEstado ?? "atender"));
  const [marca, setMarca] = useState(f.marca ?? "");
  const [pago, setPago] = useState(f.pago === "pendiente" || f.pago === "pagado" ? f.pago : "");
  const [busqueda, setBusqueda] = useState(f.q ?? "");

  // Los filtros quedan en la dirección, sin recargar ni sumar pasos al historial
  useEffect(() => {
    const p = new URLSearchParams();
    if (etapa !== "atender") p.set("etapa", etapa);
    if (estado) p.set("estado", estado);
    if (marca) p.set("marca", marca);
    if (pago) p.set("pago", pago);
    if (busqueda.trim()) p.set("q", busqueda.trim());
    const texto = p.toString();
    window.history.replaceState(null, "", texto ? `?${texto}` : window.location.pathname);
  }, [etapa, estado, marca, pago, busqueda]);

  // Marca, pago y buscador se aplican antes de contar: el número de cada pestaña respeta los filtros
  const filtrados = useMemo(() => {
    const q = normalizar(busqueda.trim());
    return pedidos.filter(
      (p) =>
        (!estado || p.estado === estado) &&
        (!marca || p.marcas.some((m) => m.id === marca)) &&
        (!pago || p.pago_estado === pago) &&
        (!q || normalizar(`${p.codigo} ${p.comprador}`).includes(q)),
    );
  }, [pedidos, estado, marca, pago, busqueda]);

  const enEtapa = (clave: string) => {
    const estados = ETAPAS[clave].estados;
    return estados ? filtrados.filter((p) => estados.includes(p.estado)) : filtrados;
  };
  const visibles = enEtapa(etapa);
  const hayFiltros = !!(estado || marca || pago || busqueda.trim());

  return (
    <>
      {/* Pestañas por etapa */}
      <div
        role="tablist"
        aria-label="Etapa del pedido"
        className="mt-6 flex gap-6 overflow-x-auto border-b border-linea [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {Object.entries(ETAPAS).map(([clave, e]) => {
          const activa = clave === etapa;
          return (
            <button
              key={clave}
              type="button"
              role="tab"
              aria-selected={activa}
              onClick={() => {
                setEtapa(clave);
                setEstado("");
              }}
              className={`-mb-px flex items-center gap-2 border-b-2 pb-3 text-sm font-medium whitespace-nowrap transition-colors ${
                activa ? "border-verde text-tinta" : "border-transparent text-gris hover:text-tinta"
              }`}
            >
              {e.texto}
              <span
                className={`rounded-sm px-1.5 font-mono text-[11px] ${activa ? "bg-tinta text-blanco" : "bg-linea/60 text-gris"}`}
              >
                {enEtapa(clave).length}
              </span>
            </button>
          );
        })}
      </div>
      {ETAPAS[etapa].ayuda && <p className="mt-3 text-sm text-gris">{ETAPAS[etapa].ayuda}</p>}

      {/* Filtros: se aplican apenas cambian */}
      <div className="mt-4 flex flex-wrap items-end gap-3 rounded-md border border-linea bg-blanco p-4">
        <label className="flex min-w-0 flex-1 basis-56 flex-col gap-1.5">
          <span className="text-xs font-medium text-gris">Buscar</span>
          <span className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gris" aria-hidden="true" />
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Código o comprador"
              className={`${campo} h-10 pl-9`}
            />
          </span>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-gris">Marca</span>
          <div className="w-52">
            <select value={marca} onChange={(e) => setMarca(e.target.value)} className={`${campo} h-10`}>
              <option value="">Todas</option>
              {marcas.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre}
                </option>
              ))}
            </select>
          </div>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-gris">Pago</span>
          <div className="w-36">
            <select value={pago} onChange={(e) => setPago(e.target.value)} className={`${campo} h-10`}>
              <option value="">Todos</option>
              <option value="pendiente">Pendiente</option>
              <option value="pagado">Pagado</option>
            </select>
          </div>
        </label>
        {estado && (
          <span className="flex h-10 items-center gap-2 text-sm">
            Solo: <EtiquetaEstado estado={estado} />
          </span>
        )}
        {hayFiltros && (
          <button
            type="button"
            onClick={() => {
              setEstado("");
              setMarca("");
              setPago("");
              setBusqueda("");
            }}
            className="h-10 text-sm font-medium enlace text-verde hover:text-tinta"
          >
            Quitar filtros
          </button>
        )}
      </div>

      {visibles.length === 0 ? (
        <EstadoVacio
          icono={Inbox}
          texto={hayFiltros ? "No hay pedidos con esos filtros en esta etapa." : `No hay pedidos en «${ETAPAS[etapa].texto}».`}
        />
      ) : (
        <div className="mt-6 overflow-x-auto rounded-md border border-linea bg-blanco">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-linea text-left">
                <th className={`${sello} px-4 py-3 font-medium`}>Código</th>
                <th className={`${sello} px-4 py-3 font-medium`}>Comprador</th>
                <th className={`${sello} px-4 py-3 font-medium`}>Marcas</th>
                <th className={`${sello} px-4 py-3 font-medium`}>Entrega</th>
                <th className={`${sello} px-4 py-3 text-right font-medium`}>Total</th>
                <th className={`${sello} px-4 py-3 font-medium`}>Estado</th>
                <th className={`${sello} px-4 py-3 font-medium`}>Pago</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((p) => (
                <tr key={p.id} className="border-b border-linea last:border-b-0 hover:bg-papel">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Link href={`/admin/pedidos/${p.id}`} className="font-mono font-medium enlace text-verde hover:text-tinta">
                      {p.codigo}
                    </Link>
                    {p.tipo === "encargo" && <span className="ml-1.5 text-[11px] text-gris">Encargo</span>}
                    <span className="block text-xs text-gris">{fecha(p.creado_en)}</span>
                  </td>
                  <td className="px-4 py-3">{p.comprador}</td>
                  <td className="px-4 py-3">
                    <Marcas marcas={p.marcas} />
                  </td>
                  <td className="px-4 py-3 font-mono whitespace-nowrap">{fecha(p.fecha_entrega_deseada)}</td>
                  <td className="px-4 py-3 text-right font-mono whitespace-nowrap">{soles(p.total_centimos)}</td>
                  <td className="px-4 py-3">
                    <EtiquetaEstado estado={p.estado} />
                  </td>
                  <td className="px-4 py-3 text-xs whitespace-nowrap">
                    {p.estado === "por_confirmar" ? (
                      <span className="text-gris">Al confirmar</span>
                    ) : p.pagado_centimos >= p.total_centimos && p.pagado_centimos > 0 ? (
                      "Pagado"
                    ) : p.estado === "cancelado" ? (
                      <span className="text-gris">—</span>
                    ) : (
                      <span>Falta {soles(p.total_centimos - p.pagado_centimos)}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// Hasta 2 marcas por nombre, cada una en una sola línea; el resto como "+N" (al pasar el mouse se ven todas)
function Marcas({ marcas }: { marcas: PedidoAdmin["marcas"] }) {
  const vistas = marcas.slice(0, 2);
  const resto = marcas.length - vistas.length;
  return (
    <span className="flex flex-wrap items-center gap-1" title={marcas.map((m) => m.nombre).join(", ")}>
      {vistas.map((m) => (
        <span
          key={m.id}
          className={`rounded-sm border border-linea px-1.5 py-0.5 text-xs whitespace-nowrap ${m.fuera ? "text-gris line-through" : ""}`}
        >
          {m.nombre}
        </span>
      ))}
      {resto > 0 && <span className="px-1 font-mono text-xs text-gris">+{resto}</span>}
    </span>
  );
}
