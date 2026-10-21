import type { NextConfig } from "next";

// Las fotos de productos vienen de Supabase Storage: Next.js solo optimiza imágenes de dominios permitidos
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname : "";

// Cabeceras de seguridad (auditoría C1, 21-oct-2026) para todas las páginas.
// La CSP va en modo "solo reporte": no bloquea nada, solo avisa en la consola del navegador
// si algo no está en la lista. Cuando no aparezcan avisos, se puede pasar a Content-Security-Policy.
const supabaseOrigen = supabaseHost ? `https://${supabaseHost}` : "";
const csp = [
  "default-src 'self'",
  // Next.js y React ponen scripts en línea para cargar la página; en desarrollo también usan eval
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  // Fotos de productos desde Supabase Storage (y las que optimiza Next en /_next/image)
  `img-src 'self' data: blob: ${supabaseOrigen}`,
  "font-src 'self' data:",
  // El navegador solo habla con Supabase para subir fotos (panel de la marca)
  `connect-src 'self' ${supabaseOrigen} ${supabaseHost ? `wss://${supabaseHost}` : ""}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const cabeceras = [
  { key: "X-Frame-Options", value: "DENY" }, // nadie puede meter Surtiba dentro de otra web (clickjacking)
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()" },
  { key: "Content-Security-Policy-Report-Only", value: csp },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: cabeceras }];
  },
  cacheComponents: true,
  images: {
    remotePatterns: supabaseHost
      ? [{ protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/**" }]
      : [],
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
