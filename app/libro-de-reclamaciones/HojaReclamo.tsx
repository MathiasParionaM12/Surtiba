import { DIAS_HABILES_RESPUESTA, EMPRESA, SIN_DATO } from "@/lib/empresa";
import { sello } from "@/lib/estilos";
import { fecha } from "@/lib/formato";

// La hoja registrada, tal como la guardó la base: es la copia que se imprime o se guarda en PDF
export function HojaReclamo({
  h,
}: {
  h: {
    codigo: string;
    creado_en: string;
    fecha_limite: string;
    tipo: string;
    nombre: string;
    tipo_documento: string;
    numero_documento: string;
    domicilio: string;
    telefono: string | null;
    correo: string;
    bien: string;
    pedido_codigo: string | null;
    monto: string | null; // en soles, como texto
    descripcion_bien: string;
    detalle: string;
    pedido: string;
    respuesta?: string | null;
    respondido_en?: string | null;
  };
}) {
  const fila = (titulo: string, valor: React.ReactNode) => (
    <div className="grid grid-cols-[9rem_1fr] gap-3 border-b border-linea py-2 last:border-b-0 sm:grid-cols-[12rem_1fr]">
      <dt className="text-gris">{titulo}</dt>
      <dd className="min-w-0 break-words whitespace-pre-line">{valor || "—"}</dd>
    </div>
  );
  return (
    <article className="recibo rounded-md border border-linea bg-blanco p-5 text-sm sm:p-8 print:border-0 print:p-0">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold">Hoja de {h.tipo === "queja" ? "queja" : "reclamación"}</h2>
        <p className="font-mono font-medium">{h.codigo}</p>
      </div>
      <p className="mt-1 font-mono text-xs text-gris">Registrada el {fecha(h.creado_en)}</p>

      <h3 className={`${sello} mt-6`}>Proveedor</h3>
      <dl className="mt-2">
        {fila("Nombre", `${EMPRESA.nombre} · ${EMPRESA.estado}`)}
        {fila("Razón social y RUC", EMPRESA.razonSocial && EMPRESA.ruc ? `${EMPRESA.razonSocial} · RUC ${EMPRESA.ruc}` : SIN_DATO)}
        {fila("Dirección", EMPRESA.direccion ?? SIN_DATO)}
      </dl>

      <h3 className={`${sello} mt-6`}>1. Quien reclama</h3>
      <dl className="mt-2">
        {fila("Nombre", h.nombre)}
        {fila("Documento", `${h.tipo_documento} ${h.numero_documento}`)}
        {fila("Domicilio", h.domicilio)}
        {fila("Teléfono", h.telefono)}
        {fila("Correo", h.correo)}
      </dl>

      <h3 className={`${sello} mt-6`}>2. Lo que compró o contrató</h3>
      <dl className="mt-2">
        {fila("Tipo", h.bien === "producto" ? "Producto" : "Servicio")}
        {fila("Pedido", h.pedido_codigo)}
        {fila("Monto reclamado", h.monto ? `S/ ${Number(h.monto).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : null)}
        {fila("Descripción", h.descripcion_bien)}
      </dl>

      <h3 className={`${sello} mt-6`}>3. Detalle</h3>
      <dl className="mt-2">
        {fila(h.tipo === "queja" ? "Queja" : "Reclamo", h.detalle)}
        {fila("Pedido del consumidor", h.pedido)}
      </dl>

      <h3 className={`${sello} mt-6`}>4. Respuesta de Surtiba</h3>
      <dl className="mt-2">
        {h.respuesta
          ? fila(`Respondida el ${fecha(h.respondido_en ?? h.creado_en)}`, h.respuesta)
          : fila("Plazo", `Te respondemos hasta el ${fecha(h.fecha_limite)} (${DIAS_HABILES_RESPUESTA} días hábiles).`)}
      </dl>

      <p className="mt-6 text-xs text-gris">
        Reclamo: disconformidad relacionada con los productos o servicios. Queja: disconformidad no relacionada con los productos o
        servicios, o malestar por la atención. Registrar esta hoja no impide acudir a otras vías de solución de controversias ni es
        requisito previo para presentar una denuncia ante el Indecopi.
      </p>
    </article>
  );
}
