import { Package } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Carga } from "@/components/Carga";
import { EsqueletoTabla } from "@/components/Esqueleto";
import { EstadoVacio } from "@/components/EstadoVacio";
import { sello } from "@/lib/estilos";
import { rutaInicio } from "@/lib/roles";
import { obtenerUsuario } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";
import { ListaMisPedidos } from "./ListaMisPedidos";
import { LoQuePidesSiempre } from "@/components/LoQuePidesSiempre";
import { productosConSesion } from "@/lib/productos-catalogo";

export const metadata: Metadata = { title: "Mis pedidos · Surtiba" };

export default function PaginaPedidos() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-8 sm:py-14">
      <p className={sello}>Seguimiento</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Mis pedidos</h1>
      <Carga fallback={<EsqueletoTabla filas={3} />}>
        <Pedidos />
      </Carga>
    </main>
  );
}

async function Pedidos() {
  const usuario = await obtenerUsuario();
  if (!usuario) redirect("/ingresar");
  if (usuario.rol !== "comprador") redirect(rutaInicio(usuario.rol));

  // RLS: el comprador recibe solo sus pedidos
  const supabase = await createClient();
  const { data: pedidos } = await supabase
    .from("pedidos")
    .select("id, codigo, estado, tipo, total_centimos, pagado_centimos, creado_en, fecha_entrega_deseada, evento_nombre, subpedidos(total_cajas, estado)")
    .order("creado_en", { ascending: false });

  if (!pedidos || pedidos.length === 0) {
    return (
      <EstadoVacio icono={Package} texto="Aún no tienes pedidos. Explora el catálogo para armar el primero." accion={{ href: "/catalogo", texto: "Ir al catálogo" }} />
    );
  }
  return (
    <>
      <LoQuePidesSiempre productos={await productosConSesion(true)} />
      <ListaMisPedidos pedidos={pedidos} />
    </>
  );
}
