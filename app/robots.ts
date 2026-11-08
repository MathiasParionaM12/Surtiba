import type { MetadataRoute } from "next";
import { EMPRESA } from "@/lib/empresa";

// Reglas para los buscadores: lo público se puede indexar; los paneles, el carrito y los pedidos no.
// "/marca$" y "/marca/" bloquean el panel de marca sin bloquear el directorio público "/marcas".
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/marca$", "/marca/", "/carrito", "/pedidos", "/perfil", "/favoritos", "/cotizaciones", "/solicitud", "/ingresar"],
    },
    sitemap: `${EMPRESA.sitio}/sitemap.xml`,
  };
}
