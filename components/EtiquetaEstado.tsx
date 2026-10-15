import { CircleCheck, CircleX, Clock, CreditCard, Inbox, Package, PackageCheck, Truck, type LucideIcon } from "lucide-react";

// Etiqueta de estado con los colores de docs/marca.md:
// gris = pendiente/recibido · verde = en proceso · tinta = entregado · rojo apagado = rechazado/cancelado
const ESTADOS: Record<string, { texto: string; clase: string; icono: LucideIcon }> = {
  por_confirmar: { texto: "Por confirmar", clase: "border-linea text-gris", icono: Clock },
  por_pagar: { texto: "Confirmado · por pagar", clase: "border-tinta text-tinta", icono: CreditCard },
  pendiente: { texto: "Pendiente", clase: "border-linea text-gris", icono: Clock },
  recibido: { texto: "Recibido", clase: "border-linea text-gris", icono: Inbox },
  listo_recojo: { texto: "Listo para recojo", clase: "border-verde text-verde", icono: PackageCheck },
  en_preparacion: { texto: "En preparación", clase: "border-verde text-verde", icono: Package },
  recogido: { texto: "Recogido", clase: "border-verde text-verde", icono: PackageCheck },
  en_camino: { texto: "En camino", clase: "border-verde text-verde", icono: Truck },
  entregado: { texto: "Entregado", clase: "border-tinta bg-tinta text-blanco", icono: CircleCheck },
  rechazado: { texto: "Rechazado", clase: "border-rojo text-rojo", icono: CircleX },
  cancelado: { texto: "Cancelado", clase: "border-rojo text-rojo", icono: CircleX },
};

export function EtiquetaEstado({ estado }: { estado: string }) {
  const e = ESTADOS[estado] ?? { texto: estado, clase: "border-linea text-gris", icono: Clock };
  const Icono = e.icono;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 font-mono text-[11px] font-medium tracking-[0.08em] whitespace-nowrap uppercase ${e.clase}`}
    >
      <Icono className="size-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />
      {e.texto}
    </span>
  );
}
