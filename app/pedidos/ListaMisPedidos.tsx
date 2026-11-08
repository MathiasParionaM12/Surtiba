"use client";

// Mis pedidos con una barra de pestañas (6-nov-2026): eliges qué ver y cada pestaña dice cuántos hay.
// Se abre en la primera que tiene pedidos, empezando por lo que necesita algo de ti (pagar).
import Link from "next/link";
import { useState } from "react";
import { EtiquetaEstado } from "@/components/EtiquetaEstado";
import { fecha, soles } from "@/lib/formato";

export type PedidoComprador = {
  id: string;
  codigo: string;
  estado: string;
  tipo: string;
  total_centimos: number;
  pagado_centimos: number;
  creado_en: string;
  fecha_entrega_deseada: string;
  evento_nombre: string | null;
  subpedidos: { total_cajas: number; estado: string }[];
};

const porPagar = (p: PedidoComprador) => p.estado !== "cancelado" && p.estado !== "por_confirmar" && p.total_centimos > p.pagado_centimos;

// Cada pedido va en la primera pestaña que le corresponde
const PESTANAS: { clave: string; titulo: string; ayuda: string; incluye: (p: PedidoComprador) => boolean }[] = [
  { clave: "pagar", titulo: "Para pagar", ayuda: "Encargos que la marca ya confirmó: págalos para que los prepare.", incluye: porPagar },
  { clave: "camino", titulo: "En camino", ayuda: "Ya salieron hacia ti.", incluye: (p) => p.estado === "en_camino" },
  { clave: "preparacion", titulo: "En preparación", ayuda: "Pagados: las marcas los preparan y Surtiba los recoge.", incluye: (p) => p.estado === "recibido" || p.estado === "en_preparacion" },
  { clave: "marca", titulo: "Esperando a la marca", ayuda: "Encargos que la marca todavía no confirma. No pagas nada hasta que confirme.", incluye: (p) => p.estado === "por_confirmar" },
  { clave: "entregados", titulo: "Entregados", ayuda: "", incluye: (p) => p.estado === "entregado" },
  { clave: "cancelados", titulo: "Cancelados", ayuda: "", incluye: (p) => p.estado === "cancelado" },
];

export function ListaMisPedidos({ pedidos }: { pedidos: PedidoComprador[] }) {
  const usados = new Set<string>();
  const grupos = PESTANAS.map((t) => {
    const lista = pedidos.filter((p) => !usados.has(p.id) && t.incluye(p));
    lista.forEach((p) => usados.add(p.id));
    return { ...t, lista };
  });
  const [activa, setActiva] = useState(grupos.find((g) => g.lista.length > 0)?.clave ?? "todos");
  const actual = grupos.find((g) => g.clave === activa);
  const visibles = actual ? actual.lista : pedidos;

  return (
    <>
      <div
        role="tablist"
        aria-label="Qué pedidos ver"
        className="mt-8 flex gap-6 overflow-x-auto border-b border-linea [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {[...grupos.filter((g) => g.lista.length > 0), { clave: "todos", titulo: "Todos", lista: pedidos }].map((g) => {
          const sel = g.clave === activa;
          return (
            <button
              key={g.clave}
              type="button"
              role="tab"
              aria-selected={sel}
              onClick={() => setActiva(g.clave)}
              className={`-mb-px flex min-h-11 items-center gap-2 border-b-2 pb-2 text-sm font-medium whitespace-nowrap transition-colors ${
                sel ? "border-verde text-tinta" : "border-transparent text-gris hover:text-tinta"
              }`}
            >
              {g.titulo}
              <span className={`rounded-sm px-1.5 font-mono text-[11px] ${sel ? "bg-tinta text-blanco" : "bg-linea/60 text-gris"}`}>{g.lista.length}</span>
            </button>
          );
        })}
      </div>
      {actual?.ayuda && <p className="mt-3 text-sm text-gris">{actual.ayuda}</p>}

      <ul key={activa} className="escalonado mt-4 flex flex-col gap-3">
        {visibles.map((p) => (
          <FilaPedido key={p.id} p={p} />
        ))}
      </ul>
    </>
  );
}

function FilaPedido({ p }: { p: PedidoComprador }) {
  const vigentes = p.subpedidos.filter((s) => s.estado !== "rechazado" && s.estado !== "cancelado");
  const cajas = vigentes.reduce((s, x) => s + x.total_cajas, 0);
  return (
    <li>
      <Link
        href={`/pedidos/${p.id}`}
        className="grid grid-cols-2 gap-3 rounded-md border border-linea bg-blanco p-4 transition-colors hover:border-gris sm:grid-cols-[1fr_auto_auto_auto] sm:items-center sm:gap-6 sm:p-5"
      >
        <div className="col-span-2 sm:col-span-1">
          <p className="font-mono font-medium">
            {p.codigo}
            {p.tipo === "encargo" && (
              <span className="ml-2 rounded-sm border border-linea px-1.5 py-0.5 font-sans text-[11px] font-normal text-gris">Encargo</span>
            )}
          </p>
          <p className="mt-0.5 text-sm text-gris">
            {p.evento_nombre ? `${p.evento_nombre} · ` : ""}Pedido el {fecha(p.creado_en)}
          </p>
        </div>
        <div className="text-sm">
          <p className="text-xs text-gris">Entrega</p>
          <p className="font-mono">{fecha(p.fecha_entrega_deseada)}</p>
        </div>
        <div className="text-sm sm:text-right">
          <p className="text-xs text-gris">
            {vigentes.length} {vigentes.length === 1 ? "marca" : "marcas"} · {cajas} {cajas === 1 ? "caja" : "cajas"}
          </p>
          <p className="font-mono font-medium">{soles(p.total_centimos)}</p>
        </div>
        <div className="col-span-2 flex flex-col items-start gap-1 sm:col-span-1">
          <EtiquetaEstado estado={p.estado} />
          {porPagar(p) && <span className="text-xs font-medium">Por pagar: {soles(p.total_centimos - p.pagado_centimos)}</span>}
        </div>
      </Link>
    </li>
  );
}
