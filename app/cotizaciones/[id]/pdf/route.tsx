// Descarga el PDF de una cotización. RLS: el comprador solo recibe las suyas; el admin, todas.

import { renderToBuffer } from "@react-pdf/renderer";
import { esUuid } from "@/lib/catalogo";
import { PdfCotizacion, type EventoCotizacion, type ItemCotizacion } from "@/lib/pdf-cotizacion";
import { obtenerUsuario } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";

export async function GET(_pedido: Request, { params }: { params: Promise<{ id: string }> }) {
  const [{ id }, usuario] = await Promise.all([params, obtenerUsuario()]);
  if (!usuario) return new Response("Ingresa para descargar la cotización.", { status: 401 });
  if (!esUuid(id)) return new Response("No encontramos esa cotización.", { status: 404 });

  const supabase = await createClient();
  const { data: c } = await supabase
    .from("cotizaciones")
    .select("codigo, creado_en, evento, items, total_centimos, comprador_id")
    .eq("id", id)
    .maybeSingle();
  if (!c) return new Response("No encontramos esa cotización.", { status: 404 });

  const { data: perfil } = await supabase.from("perfiles").select("nombre, empresa").eq("id", c.comprador_id).maybeSingle();
  const para = [perfil?.empresa, perfil?.nombre].filter(Boolean).join(" · ") || "Comprador";

  const pdf = await renderToBuffer(
    <PdfCotizacion
      codigo={c.codigo}
      creadoEn={c.creado_en}
      para={para}
      evento={c.evento as EventoCotizacion | null}
      items={c.items as ItemCotizacion[]}
      total={c.total_centimos}
    />,
  );

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${c.codigo}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
