import { Suspense } from "react";
import { PestanasBase, PestanasPanel } from "@/components/PestanasPanel";
import { sello } from "@/lib/estilos";

const PESTANAS = [
  { href: "/admin", texto: "Inicio" },
  { href: "/admin/pedidos", texto: "Pedidos" },
  { href: "/admin/logistica", texto: "Logística" },
  { href: "/admin/marcas", texto: "Marcas" },
  { href: "/admin/cotizador", texto: "Cotizador" },
];

// Marco común del panel del admin. Cada pestaña revisa que el usuario sea admin.
export default function LayoutAdmin({ children }: LayoutProps<"/admin">) {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-8 sm:py-12">
      <p className={sello}>Panel Surtiba</p>
      <Suspense fallback={<PestanasBase enlaces={PESTANAS} ruta={null} />}>
        <PestanasPanel enlaces={PESTANAS} />
      </Suspense>
      <div className="mt-8">{children}</div>
    </main>
  );
}
