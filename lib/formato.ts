// Formatos de la interfaz (docs/marca.md y CLAUDE.md).

const numeroSoles = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// El dinero se guarda en céntimos: 123450 -> "S/ 1,234.50"
export function soles(centimos: number) {
  return `S/ ${numeroSoles.format(centimos / 100)}`;
}
