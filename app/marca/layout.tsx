import { Suspense } from "react";
import { PestanasBase, PestanasPanel } from "@/components/PestanasPanel";
import { sello } from "@/lib/estilos";

const PESTANAS = [
  { href: "/marca", texto: "Resumen" },
  { href: "/marca/ordenes", texto: "Órdenes" },
  { href: "/marca/productos", texto: "Productos" },
  { href: "/marca/stock", texto: "Stock" },
  { href: "/marca/mi-marca", texto: "Mi marca" },
];

// Marco común del panel de la marca: título y pestañas. Cada pestaña revisa que el usuario sea marca.
export default function LayoutMarca({ children }: LayoutProps<"/marca">) {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-8 sm:py-12">
      <p className={sello}>Panel de marca</p>
      <Suspense fallback={<PestanasBase enlaces={PESTANAS} ruta={null} />}>
        <PestanasPanel enlaces={PESTANAS} />
      </Suspense>
      <div className="mt-8">{children}</div>
    </main>
  );
}
