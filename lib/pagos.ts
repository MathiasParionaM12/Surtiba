// Métodos de pago. En el prototipo el pago es SIMULADO: no se cobra dinero real.
export const METODOS_PAGO = [
  { valor: "yape", texto: "Yape" },
  { valor: "plin", texto: "Plin" },
  { valor: "transferencia", texto: "Transferencia" },
  { valor: "tarjeta", texto: "Tarjeta" },
] as const;

// El admin además puede registrar pagos en efectivo
export const METODOS_PAGO_ADMIN = [...METODOS_PAGO, { valor: "efectivo", texto: "Efectivo" }] as const;

export function nombreMetodo(valor: string | null | undefined) {
  return METODOS_PAGO_ADMIN.find((m) => m.valor === valor)?.texto ?? valor ?? "";
}

// Lo que falta pagar (nunca negativo) y el saldo a favor (si una marca rechazó algo ya pagado)
export function saldos(p: { total_centimos: number; pagado_centimos: number }) {
  return {
    falta: Math.max(0, p.total_centimos - p.pagado_centimos),
    aFavor: Math.max(0, p.pagado_centimos - p.total_centimos),
  };
}
