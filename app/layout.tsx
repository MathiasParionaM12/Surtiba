import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import { Avisos } from "@/components/Avisos";
import { BarraCarga } from "@/components/BarraCarga";
import { Encabezado } from "@/components/Encabezado";
import { Pie } from "@/components/Pie";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Surtiba",
  description:
    "Licores y cócteles de marcas peruanas, por cajas, en un solo pedido.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: algunas extensiones del navegador (como LanguageTool)
    // agregan atributos a <html> y Next.js mostraría un aviso falso.
    <html
      lang="es-PE"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        {/* Lee la dirección actual: va dentro de Suspense */}
        <Suspense fallback={null}>
          <BarraCarga />
        </Suspense>
        <Encabezado />
        {children}
        <Pie />
        <Avisos />
      </body>
    </html>
  );
}
