import type { MetadataRoute } from "next";
import { marcasPublicas } from "@/lib/marcas-publicas";
import { productosPublicos } from "@/lib/productos-catalogo";

// Mapa del sitio para Google (Search Console, 8-nov-2026): solo lo público.
// Las fichas de marcas y productos salen de las mismas listas públicas (en caché) que ve un visitante.
const SITIO = "https://surtiba.vercel.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [marcas, productos] = await Promise.all([marcasPublicas(), productosPublicos()]);
  const fijas = ["", "/catalogo", "/marcas", "/cotizador", "/registro", "/registro/vender", "/condiciones", "/privacidad", "/libro-de-reclamaciones"];
  return [
    ...fijas.map((ruta) => ({ url: `${SITIO}${ruta}`, changeFrequency: "weekly" as const, priority: ruta === "" ? 1 : 0.7 })),
    ...marcas.map((m) => ({ url: `${SITIO}/marcas/${m.id}`, changeFrequency: "weekly" as const, priority: 0.6 })),
    ...productos.map((p) => ({ url: `${SITIO}/catalogo/${p.id}`, changeFrequency: "weekly" as const, priority: 0.6 })),
  ];
}
