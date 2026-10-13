// Etiqueta de estado con los colores de docs/marca.md:
// gris = pendiente/recibido · verde = en proceso · tinta = entregado · rojo apagado = rechazado/cancelado
const ESTADOS: Record<string, { texto: string; clase: string }> = {
  pendiente: { texto: "Pendiente", clase: "border-linea text-gris" },
  recibido: { texto: "Recibido", clase: "border-linea text-gris" },
  listo_recojo: { texto: "Listo para recojo", clase: "border-verde text-verde" },
  en_preparacion: { texto: "En preparación", clase: "border-verde text-verde" },
  recogido: { texto: "Recogido", clase: "border-verde text-verde" },
  en_camino: { texto: "En camino", clase: "border-verde text-verde" },
  entregado: { texto: "Entregado", clase: "border-tinta bg-tinta text-blanco" },
  rechazado: { texto: "Rechazado", clase: "border-rojo text-rojo" },
  cancelado: { texto: "Cancelado", clase: "border-rojo text-rojo" },
};

export function EtiquetaEstado({ estado }: { estado: string }) {
  const e = ESTADOS[estado] ?? { texto: estado, clase: "border-linea text-gris" };
  return (
    <span
      className={`inline-flex items-center rounded-sm border px-2 py-0.5 font-mono text-[11px] font-medium tracking-[0.08em] whitespace-nowrap uppercase ${e.clase}`}
    >
      {e.texto}
    </span>
  );
}
