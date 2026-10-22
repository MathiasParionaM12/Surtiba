// Documento PDF de una cotización (se arma en el servidor con @react-pdf/renderer).
// Colores de docs/marca.md. Fuentes incluidas en el PDF: Helvetica (texto) y Courier (códigos y sellos).

import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { Insumo, Momento } from "@/lib/cotizador";
import { fecha, soles } from "@/lib/formato";
import { LOGO_PDF, LOGO_PROPORCION } from "@/lib/marca/logo-pdf";

const C = { papel: "#F5F3EE", tinta: "#121212", gris: "#5C5A55", linea: "#DCD8CF", verde: "#14432F", resaltador: "#E8FF00" };

export type ItemCotizacion = {
  producto_id: string;
  producto: string;
  marca_id: string;
  marca: string;
  pedido_minimo_cajas: number;
  ml: number;
  unidades: number;
  cajas: number;
  precio_caja_centimos: number;
  subtotal_centimos: number;
};

// Primera versión del cotizador (con %): se sigue leyendo para las cotizaciones viejas
type EventoV1 = {
  version?: undefined;
  tipo: string;
  invitados: number;
  horas: number;
  tragos_por_persona: number;
  tragos_totales: number;
  tragos: { receta: string; porcentaje: number; tragos: number }[];
};

// Cotizador por momentos
type EventoV2 = {
  version: 2;
  resumen: {
    nombre: string;
    tipo: string;
    fecha: string;
    invitados: number;
    no_toman: number;
    hora_inicio: string;
    horas: number;
    margen: number;
    aire_libre: boolean;
    tragos_totales: number;
    tragos?: { receta: string; tragos: number; lleva: string; propio: boolean }[];
    momentos: Momento[];
    insumos: Insumo[];
  };
};

export type EventoCotizacion = EventoV1 | EventoV2;

const s = StyleSheet.create({
  pagina: { padding: 40, paddingBottom: 70, fontFamily: "Helvetica", fontSize: 10, color: C.tinta },
  fila: { flexDirection: "row" },
  sello: { fontFamily: "Courier-Bold", fontSize: 8, letterSpacing: 1.2, color: C.gris, textTransform: "uppercase" },
  gris: { color: C.gris },
  celdaProducto: { flex: 1, paddingRight: 8 },
  celdaCajas: { width: 45, textAlign: "right" },
  celdaPrecio: { width: 115, textAlign: "right" },
  celdaSubtotal: { width: 95, textAlign: "right" },
  lineaTabla: { flexDirection: "row", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: C.linea },
});

const entero = new Intl.NumberFormat("en-US");
const decimal = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 2 });

export function PdfCotizacion({
  codigo,
  creadoEn,
  para,
  evento,
  items,
  total,
}: {
  codigo: string;
  creadoEn: string;
  para: string;
  evento: EventoCotizacion | null;
  items: ItemCotizacion[];
  total: number;
}) {
  // Agrupado por marca, como el carrito
  const marcas = new Map<string, { nombre: string; minimo: number; items: ItemCotizacion[] }>();
  for (const i of items) {
    const m = marcas.get(i.marca_id) ?? { nombre: i.marca, minimo: i.pedido_minimo_cajas, items: [] };
    m.items.push(i);
    marcas.set(i.marca_id, m);
  }

  return (
    <Document title={`Cotización ${codigo} · Surtiba`} author="Surtiba" language="es-PE">
      <Page size="A4" style={s.pagina}>
        {/* Encabezado */}
        <View style={[s.fila, { justifyContent: "space-between", alignItems: "flex-start" }]}>
          {/* El logo oficial (imagen): el punto de la "i" es el cuadrado amarillo */}
          {/* eslint-disable-next-line jsx-a11y/alt-text -- la imagen del PDF (react-pdf) no tiene texto alternativo */}
          <Image src={LOGO_PDF} style={{ width: 112, height: 112 / LOGO_PROPORCION, marginTop: 2 }} />
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.sello}>Cotización</Text>
            <Text style={{ fontFamily: "Courier-Bold", fontSize: 16, marginTop: 4 }}>{codigo}</Text>
            <Text style={[s.gris, { marginTop: 2 }]}>{fecha(creadoEn)}</Text>
          </View>
        </View>

        <View style={{ marginTop: 24, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.linea }}>
          <Text style={s.sello}>Para</Text>
          <Text style={{ marginTop: 4, fontSize: 11 }}>{para}</Text>
        </View>

        {/* Evento del cotizador por momentos */}
        {evento?.version === 2 && <EventoPorMomentos e={evento.resumen} />}

        {/* Evento de la primera versión del cotizador */}
        {evento && evento.version !== 2 && (
          <View style={{ marginTop: 14, padding: 10, backgroundColor: C.papel, borderRadius: 4 }}>
            <Text style={s.sello}>Evento</Text>
            <Text style={{ marginTop: 4, fontSize: 11 }}>
              {evento.tipo} · {entero.format(evento.invitados)} invitados · {evento.horas} {evento.horas === 1 ? "hora" : "horas"}
            </Text>
            <Text style={[s.gris, { marginTop: 2 }]}>
              {decimal.format(evento.tragos_por_persona)} tragos por persona · {entero.format(evento.tragos_totales)} tragos en total
            </Text>
            <Text style={[s.gris, { marginTop: 2 }]}>
              {evento.tragos.map((t) => `${t.receta} ${t.porcentaje} %`).join(" · ")}
            </Text>
          </View>
        )}

        {/* Productos por marca */}
        <View style={[s.fila, { marginTop: 20, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: C.tinta }]}>
          <Text style={[s.sello, s.celdaProducto]}>Producto</Text>
          <Text style={[s.sello, s.celdaCajas]}>Cajas</Text>
          <Text style={[s.sello, s.celdaPrecio]}>Precio por caja</Text>
          <Text style={[s.sello, s.celdaSubtotal]}>Subtotal</Text>
        </View>
        {[...marcas.values()].map((m) => {
          const cajas = m.items.reduce((suma, i) => suma + i.cajas, 0);
          const subtotal = m.items.reduce((suma, i) => suma + i.subtotal_centimos, 0);
          return (
            <View key={m.nombre} wrap={false} style={{ marginTop: 10 }}>
              <Text style={{ fontFamily: "Helvetica-Bold", paddingVertical: 4 }}>{m.nombre}</Text>
              {m.items.map((i) => (
                <View key={i.producto_id} style={s.lineaTabla}>
                  <View style={s.celdaProducto}>
                    <Text>{i.producto}</Text>
                    <Text style={[s.gris, { fontSize: 8, marginTop: 1 }]}>
                      {i.unidades} botellas de {i.ml} ml por caja
                    </Text>
                  </View>
                  <Text style={s.celdaCajas}>{i.cajas}</Text>
                  <Text style={s.celdaPrecio}>{soles(i.precio_caja_centimos)}</Text>
                  <Text style={s.celdaSubtotal}>{soles(i.subtotal_centimos)}</Text>
                </View>
              ))}
              <View style={[s.fila, { paddingVertical: 5 }]}>
                <Text style={[s.gris, s.celdaProducto]}>
                  Subtotal {m.nombre} · {cajas} cajas
                </Text>
                <Text style={[s.celdaSubtotal, { fontFamily: "Helvetica-Bold" }]}>{soles(subtotal)}</Text>
              </View>
              {cajas < m.minimo && (
                <Text style={{ fontSize: 9, paddingLeft: 6, borderLeftWidth: 2, borderLeftColor: C.tinta }}>
                  Pedido mínimo de {m.nombre}: {m.minimo} cajas. Esta cotización tiene {cajas}.
                </Text>
              )}
            </View>
          );
        })}

        {/* Totales */}
        <View wrap={false} style={{ marginTop: 16, marginLeft: "auto", width: 230 }}>
          <View style={[s.fila, { justifyContent: "space-between", paddingVertical: 3 }]}>
            <Text style={s.gris}>Productos</Text>
            <Text>{soles(total)}</Text>
          </View>
          <View style={[s.fila, { justifyContent: "space-between", paddingVertical: 3 }]}>
            <Text style={s.gris}>Envío</Text>
            <Text>Por definir</Text>
          </View>
          <View
            style={[s.fila, { justifyContent: "space-between", marginTop: 4, paddingTop: 6, borderTopWidth: 1, borderTopColor: C.tinta }]}
          >
            <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 12 }}>Total</Text>
            <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 12 }}>{soles(total)}</Text>
          </View>
        </View>

        {/* Lo que el comprador consigue por su cuenta (cotizador por momentos) */}
        {evento?.version === 2 && evento.resumen.insumos.length > 0 && (
          <View wrap={false} style={{ marginTop: 24 }}>
            <Text style={s.sello}>Lo consigues por tu cuenta</Text>
            <View style={[s.fila, { flexWrap: "wrap", marginTop: 6 }]}>
              {evento.resumen.insumos.map((i) => (
                <View key={i.nombre} style={[s.fila, { width: "50%", paddingVertical: 3, paddingRight: 16, justifyContent: "space-between" }]}>
                  <Text>{i.nombre}</Text>
                  <Text>
                    {decimal.format(i.cantidad)} {i.unidad}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Notas */}
        <View wrap={false} style={{ marginTop: 24, gap: 3 }}>
          <Text style={s.gris}>Precios en soles con IGV incluido, válidos sujetos a stock al momento de pedir.</Text>
          {evento && (
            <Text style={s.gris}>
              Estimación referencial con supuestos por validar con caterings: ajusta las cantidades antes de pedir.
            </Text>
          )}
          <Text style={s.gris}>Lo que supere el stock de una marca se pide por encargo y la marca lo confirma.</Text>
        </View>

        {/* Pie en cada página */}
        <View
          fixed
          style={{
            position: "absolute",
            bottom: 28,
            left: 40,
            right: 40,
            flexDirection: "row",
            justifyContent: "space-between",
            borderTopWidth: 1,
            borderTopColor: C.linea,
            paddingTop: 6,
          }}
        >
          <Text style={[s.gris, { fontSize: 8 }]}>Surtiba · Prototipo del curso con datos ficticios · surtiba.vercel.app</Text>
          <Text
            style={[s.gris, { fontSize: 8 }]}
            render={({ pageNumber, totalPages }) => `${codigo} · Página ${pageNumber} de ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}

// Recuadro del evento y sus momentos (cotizador por momentos)
function EventoPorMomentos({ e }: { e: EventoV2["resumen"] }) {
  const fin = e.momentos.at(-1)?.hasta ?? e.momentos.at(-1)?.desde ?? e.hora_inicio;
  return (
    <View wrap={false} style={{ marginTop: 14, padding: 10, backgroundColor: C.papel, borderRadius: 4 }}>
      <Text style={s.sello}>Evento</Text>
      <Text style={{ marginTop: 4, fontSize: 12, fontFamily: "Helvetica-Bold" }}>{e.nombre || e.tipo}</Text>
      <Text style={[s.gris, { marginTop: 2 }]}>
        {[e.nombre && e.tipo, e.fecha && fecha(e.fecha), `${entero.format(e.invitados)} invitados (${entero.format(e.invitados - e.no_toman)} toman alcohol)`, `${e.hora_inicio}–${fin}`, e.aire_libre ? "aire libre o verano" : "interior"]
          .filter(Boolean)
          .join(" · ")}
      </Text>
      <Text style={[s.gris, { marginTop: 2 }]}>
        {entero.format(e.tragos_totales)} tragos con alcohol · incluye +{e.margen} % de margen
      </Text>
      <View style={{ marginTop: 8 }}>
        {e.momentos.map((m) => (
          <View key={m.clave} style={[s.fila, { paddingVertical: 3, borderTopWidth: 1, borderTopColor: C.linea }]}>
            <Text style={{ width: 70, fontFamily: "Courier", fontSize: 9, color: C.gris }}>
              {m.desde}
              {m.hasta ? `–${m.hasta}` : ""}
            </Text>
            <View style={{ flex: 1 }}>
              <Text>{m.nombre}</Text>
              {m.detalle.length > 0 && (
                <Text style={[s.gris, { fontSize: 8, marginTop: 1 }]}>
                  {m.detalle.map((d) => `${d.receta} ${entero.format(d.tragos)}`).join(" · ")}
                </Text>
              )}
            </View>
            <Text style={{ width: 70, textAlign: "right" }}>{entero.format(m.tragos)} tragos</Text>
          </View>
        ))}
      </View>
      {e.tragos && e.tragos.length > 0 && (
        <View style={{ marginTop: 8 }}>
          <Text style={s.sello}>Tragos y lo que lleva cada uno</Text>
          {e.tragos.map((t) => (
            <View key={t.receta} style={[s.fila, { paddingVertical: 3, borderTopWidth: 1, borderTopColor: C.linea }]}>
              <View style={{ flex: 1 }}>
                <Text>
                  {t.receta}
                  {t.propio ? " (tu trago)" : ""}
                </Text>
                <Text style={[s.gris, { fontSize: 8, marginTop: 1 }]}>{t.lleva}</Text>
              </View>
              <Text style={{ width: 70, textAlign: "right" }}>{entero.format(t.tragos)} tragos</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
