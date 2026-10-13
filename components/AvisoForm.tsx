// Mensaje bajo un formulario. Error: borde rojo apagado (el rojo nunca va de fondo).
export function AvisoForm({ error, mensaje }: { error?: string; mensaje?: string }) {
  if (error) {
    return (
      <p role="alert" className="border-l-2 border-rojo pl-3 text-sm">
        {error}
      </p>
    );
  }
  if (mensaje) {
    return (
      <p role="status" className="border-l-2 border-verde pl-3 text-sm">
        {mensaje}
      </p>
    );
  }
  return null;
}
