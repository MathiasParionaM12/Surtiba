// Documento PDF de una cotización (se arma en el servidor con @react-pdf/renderer).
// Colores de docs/marca.md. Fuentes incluidas en el PDF: Helvetica (texto) y Courier (códigos y sellos).

import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { fecha, soles } from "@/lib/formato";

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

export type EventoCotizacion = {
  tipo: string;
  invitados: number;
  horas: number;
  tragos_por_persona: number;
  tragos_totales: number;
  tragos: { receta: string; porcentaje: number; tragos: number }[];
};

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
          <View style={[s.fila, { alignItems: "flex-start" }]}>
            <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 22, letterSpacing: -0.5 }}>surtiba</Text>
            <View style={{ width: 5, height: 5, backgroundColor: C.resaltador, marginLeft: 2, marginTop: 3 }} />
          </View>
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

        {/* Evento (si vino del cotizador) */}
        {evento && (
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

        {/* Notas */}
        <View wrap={false} style={{ marginTop: 24, gap: 3 }}>
          <Text style={s.gris}>Precios válidos sujetos a stock al momento de pedir.</Text>
          {evento && (
            <Text style={s.gris}>
              Estimación referencial: ajusta las cantidades antes de pedir. Solo incluye el licor (no hielo, gaseosas ni
              insumos).
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
