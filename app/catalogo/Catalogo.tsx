import { redirect } from "next/navigation";
import { productosConSesion, productosPublicos } from "@/lib/productos-catalogo";
import { obtenerUsuario } from "@/lib/sesion";
import { LoQuePidesSiempre } from "@/components/LoQuePidesSiempre";
import { Explorador, type FiltrosCatalogo } from "./Explorador";

export type Filtros = FiltrosCatalogo;

export async function Catalogo({ searchParams }: { searchParams: Promise<Filtros> }) {
  const [usuario, filtros] = await Promise.all([obtenerUsuario(), searchParams]);
  // Quien está en revisión como marca todavía no ve el catálogo
  if (usuario?.rol === "solicitante") redirect("/solicitud");
  const productos = usuario ? await productosConSesion(usuario.rol === "comprador") : await productosPublicos();
  return (
    <>
      {/* Atajo para volver a pedir lo de siempre (solo compradores con 2 o más pedidos) */}
      {usuario?.rol === "comprador" && <LoQuePidesSiempre productos={productos} />}
      <Explorador
        productos={productos}
        filtrosIniciales={filtros}
        visitante={!usuario}
        puedeAgregar={usuario?.rol === "comprador"}
      />
    </>
  );
}
