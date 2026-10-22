import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Carga } from "@/components/Carga";
import { EsqueletoTabla } from "@/components/Esqueleto";
import { botonSecundario, sello } from "@/lib/estilos";
import { haceDias, mananaEnLima, soles } from "@/lib/formato";
import { separarTelefono } from "@/lib/paises";
import { rutaInicio } from "@/lib/roles";
import { obtenerUsuario } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";
import { FormConfirmar, type Iniciales } from "./FormConfirmar";
import { RegistrarEvento } from "@/components/RegistrarEvento";

export const metadata: Metadata = { title: "Confirmar pedido · Surtiba" };

export default function PaginaConfirmar() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-8 sm:py-14">
      <Link href="/carrito" className="text-sm font-medium enlace text-verde hover:text-tinta">
        ← Volver al carrito
      </Link>
      <p className={`${sello} mt-6`}>Último paso</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Confirmar pedido</h1>
      <Carga fallback={<EsqueletoTabla filas={6} />}>
        <Confirmar />
      </Carga>
    </main>
  );
}

async function Confirmar() {
  const usuario = await obtenerUsuario();
  if (!usuario) redirect("/ingresar");
  if (usuario.rol !== "comprador") redirect(rutaInicio(usuario.rol));

  const supabase = await createClient();
  const [{ data }, { data: perfil }, { data: ultimo }, { data: tipos }, { data: cotizacion }] = await Promise.all([
    supabase.from("carrito_detalle").select("marca, cajas, stock_cajas, precio_caja_centimos, subtotal_centimos").order("marca"),
    supabase.from("perfiles").select("nombre, whatsapp").eq("id", usuario.id).single(),
    // Último pedido del comprador (RLS: solo los suyos), para autocompletar la dirección
    supabase
      .from("pedidos")
      .select("recibe_nombre, recibe_telefono, direccion_entrega, direccion_detalle, distrito, codigo_postal, referencia")
      .not("distrito", "is", null)
      .order("creado_en", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("tipos_evento").select("nombre").eq("activo", true).order("orden"),
    // Su última cotización de las 2 últimas semanas que aún no se volvió pedido: llena los datos del evento
    supabase
      .from("cotizaciones")
      .select("codigo, evento")
      .is("pedido_id", null)
      .gte("creado_en", haceDias(14))
      .order("creado_en", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  const lineas = data ?? [];
  if (lineas.length === 0) redirect("/carrito");

  // Autocompletar: quién recibe sale del último pedido o del perfil; la dirección, del último pedido
  const telefono = separarTelefono(ultimo?.recibe_telefono ?? perfil?.whatsapp);
  const iniciales: Iniciales = {
    recibe_nombre: ultimo?.recibe_nombre ?? perfil?.nombre ?? "",
    prefijo: telefono.prefijo,
    telefono: telefono.numero,
    direccion: ultimo?.direccion_entrega ?? "",
    direccion_detalle: ultimo?.direccion_detalle ?? "",
    distrito: ultimo?.distrito ?? "",
    codigo_postal: ultimo?.codigo_postal ?? "",
    referencia: ultimo?.referencia ?? "",
  };
  const autocompletado = !!(ultimo || perfil?.nombre || perfil?.whatsapp);

  // Datos del evento desde la cotización (la fecha solo si todavía se puede entregar antes)
  const resumen = (cotizacion?.evento as { resumen?: Record<string, unknown> } | null)?.resumen ?? {};
  const texto = (x: unknown) => (typeof x === "string" ? x.trim() : "");
  const fechaEvento = texto(resumen.fecha);
  const evento = {
    evento_nombre: texto(resumen.nombre),
    evento_tipo: texto(resumen.tipo),
    evento_fecha: fechaEvento >= mananaEnLima() ? fechaEvento : "",
    invitados: typeof resumen.invitados === "number" && resumen.invitados > 0 ? String(resumen.invitados) : "",
  };
  const conEvento = Object.values(evento).some(Boolean);
  if (conEvento) Object.assign(iniciales, evento);

  // Resumen por marca (los precios ya vienen calculados por la base de datos)
  const porMarca = new Map<string, { cajas: number; total: number }>();
  for (const l of lineas) {
    const m = porMarca.get(l.marca!) ?? { cajas: 0, total: 0 };
    m.cajas += l.cajas!;
    m.total += l.subtotal_centimos ?? 0;
    porMarca.set(l.marca!, m);
  }
  const total = [...porMarca.values()].reduce((s, m) => s + m.total, 0);
  // Se paga ahora solo lo que tiene stock; lo demás es un encargo que se paga cuando la marca lo confirme
  const pagasAhora = lineas.reduce(
    (s, l) => s + Math.min(l.cajas!, Math.max(0, l.stock_cajas!)) * (l.precio_caja_centimos ?? 0),
    0,
  );

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <RegistrarEvento tipo="inicio_pedido" />
      <div className="rounded-md border border-linea bg-blanco p-5 sm:p-8">
        <FormConfirmar
          fechaMinima={mananaEnLima()}
          pagasAhora={pagasAhora}
          porEncargo={total - pagasAhora}
          iniciales={iniciales}
          autocompletado={autocompletado}
          tiposEvento={(tipos ?? []).map((t) => t.nombre)}
          cotizacion={conEvento ? (cotizacion?.codigo ?? null) : null}
        />
      </div>

      <aside className="h-fit rounded-md border border-linea bg-blanco p-5 lg:sticky lg:top-24">
        <h2 className={sello}>Tu pedido</h2>
        <ul className="mt-4 flex flex-col gap-3 text-sm">
          {[...porMarca.entries()].map(([marca, m]) => (
            <li key={marca} className="flex justify-between gap-3">
              <span>
                {marca}
                <span className="block font-mono text-xs text-gris">{m.cajas} cajas</span>
              </span>
              <span className="font-mono">{soles(m.total)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex justify-between border-t border-linea pt-3">
          <span className="font-medium">Total</span>
          <span className="font-mono font-semibold">{soles(total)}</span>
        </div>
        {total - pagasAhora > 0 && (
          <dl className="mt-3 flex flex-col gap-1 border-t border-linea pt-3 text-sm">
            <div className="flex justify-between">
              <dt>Hay en stock</dt>
              <dd className="font-mono font-medium">{soles(pagasAhora)}</dd>
            </div>
            <div className="flex justify-between text-gris">
              <dt>Falta (por encargo)</dt>
              <dd className="font-mono">{soles(total - pagasAhora)}</dd>
            </div>
          </dl>
        )}
        <p className="mt-2 text-xs text-gris">Envío: tarifa por definir.</p>
        <Link href="/carrito" className={`${botonSecundario} mt-5 w-full`}>
          Editar carrito
        </Link>
      </aside>
    </div>
  );
}
