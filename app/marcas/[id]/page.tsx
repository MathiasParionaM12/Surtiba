import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Explorador } from "@/app/catalogo/Explorador";
import { Carga } from "@/components/Carga";
import { EsqueletoTarjetas } from "@/components/Esqueleto";
import { LogoMarca } from "@/components/LogoMarca";
import { esUuid } from "@/lib/catalogo";
import { marcasPublicas } from "@/lib/marcas-publicas";
import { productosConSesion, productosPublicos } from "@/lib/productos-catalogo";
import { obtenerUsuario } from "@/lib/sesion";

export const metadata: Metadata = { title: "Marca · Surtiba" };

// Una marca del directorio y sus productos (con los mismos filtros del catálogo).
export default function PaginaMarca({ params }: PageProps<"/marcas/[id]">) {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-8 sm:py-14">
      <Link href="/marcas" className="enlace text-sm font-medium text-verde hover:text-tinta">
        ← Todas las marcas
      </Link>
      <Carga fallback={<EsqueletoTarjetas />}>
        <Contenido params={params} />
      </Carga>
    </main>
  );
}

async function Contenido({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, usuario] = await Promise.all([params, obtenerUsuario()]);
  if (!esUuid(id)) notFound();
  if (usuario?.rol === "solicitante") redirect("/solicitud");
  const marca = (await marcasPublicas()).find((m) => m.id === id);
  if (!marca) notFound();
  // Con sesión: precios por volumen y stock (RLS); sin sesión: solo el precio del primer tramo
  const todos = usuario ? await productosConSesion(usuario.rol === "comprador") : await productosPublicos();
  const productos = todos.filter((p) => p.marca === marca.nombre);

  return (
    <>
      <header className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-center">
        <LogoMarca nombre={marca.nombre} logo={marca.logo} grande />
        <div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{marca.nombre}</h1>
          {marca.descripcion && <p className="mt-2 max-w-2xl text-gris">{marca.descripcion}</p>}
          <p className="mt-2 font-mono text-xs text-gris">
            {productos.length} {productos.length === 1 ? "producto" : "productos"}
          </p>
        </div>
      </header>
      <Explorador productos={productos} filtrosIniciales={{}} visitante={!usuario} puedeAgregar={usuario?.rol === "comprador"} />
    </>
  );
}
