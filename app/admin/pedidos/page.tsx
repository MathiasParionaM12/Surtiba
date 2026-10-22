import type { Metadata } from "next";
import { Carga } from "@/components/Carga";
import { EsqueletoTabla } from "@/components/Esqueleto";
import { exigirRol } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";
import { ListaPedidos, type FiltrosPedidos, type PedidoAdmin } from "./ListaPedidos";

export const metadata: Metadata = { title: "Pedidos · Panel Surtiba" };

export default function PaginaPedidosAdmin({ searchParams }: PageProps<"/admin/pedidos">) {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Pedidos</h1>
      <Carga fallback={<EsqueletoTabla filas={5} />}>
        <Lista searchParams={searchParams as Promise<FiltrosPedidos>} />
      </Carga>
    </>
  );
}

// Trae todos los pedidos una vez; las pestañas y los filtros se aplican en el navegador (ListaPedidos)
async function Lista({ searchParams }: { searchParams: Promise<FiltrosPedidos> }) {
  const [filtros] = await Promise.all([searchParams, exigirRol("admin")]);
  const supabase = await createClient();

  const [{ data: pedidos }, { data: marcas }] = await Promise.all([
    supabase
      .from("pedidos")
      .select(
        "id, codigo, estado, tipo, total_centimos, pagado_centimos, pago_estado, creado_en, fecha_entrega_deseada, perfiles(empresa, nombre), subpedidos(estado, marca_id, marcas(nombre_comercial))",
      )
      .order("creado_en", { ascending: false }),
    supabase.from("marcas").select("id, nombre_comercial").order("nombre_comercial"),
  ]);

  const lista: PedidoAdmin[] = (pedidos ?? []).map((p) => ({
    id: p.id,
    codigo: p.codigo,
    estado: p.estado,
    tipo: p.tipo,
    total_centimos: p.total_centimos,
    pagado_centimos: p.pagado_centimos,
    pago_estado: p.pago_estado,
    creado_en: p.creado_en,
    fecha_entrega_deseada: p.fecha_entrega_deseada,
    comprador: p.perfiles?.empresa ?? p.perfiles?.nombre ?? "—",
    marcas: p.subpedidos.map((s) => ({
      id: s.marca_id,
      nombre: s.marcas?.nombre_comercial ?? "",
      fuera: s.estado === "rechazado" || s.estado === "cancelado",
    })),
  }));

  return (
    <ListaPedidos
      pedidos={lista}
      marcas={(marcas ?? []).map((m) => ({ id: m.id, nombre: m.nombre_comercial }))}
      filtrosIniciales={filtros}
    />
  );
}
