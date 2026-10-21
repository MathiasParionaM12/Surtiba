import type { Metadata } from "next";
import Link from "next/link";
import { Carga } from "@/components/Carga";
import { EsqueletoTabla } from "@/components/Esqueleto";
import { FormAccion } from "@/components/FormAccion";
import { guardarIngrediente } from "@/lib/acciones-admin";
import { CATEGORIAS } from "@/lib/catalogo";
import { PERFILES } from "@/lib/cotizador";
import { datosCotizador } from "@/lib/cotizador-datos";
import { botonSecundario, campo, sello } from "@/lib/estilos";
import { fecha, soles } from "@/lib/formato";
import { exigirRol } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";
import { EditorTrago, type TragoAdmin } from "./EditorTrago";
import { FormParametros } from "./FormParametros";

export const metadata: Metadata = { title: "Cotizador · Panel Surtiba" };

const NIVEL = { principal: "principal", secundario: "secundario", ocasional: "ocasional" } as Record<string, string>;

export default function PaginaCotizadorAdmin() {
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Cotizador</h1>
        <Link href="/cotizador" className="text-sm font-medium text-verde hover:text-tinta">
          Ver el cotizador →
        </Link>
      </div>
      <p className="mt-2 max-w-2xl text-sm text-gris">
        Los valores iniciales son supuestos por validar con caterings. Cámbialos aquí cuando tengas datos reales: el cotizador
        los usa al instante.
      </p>
      <Carga fallback={<EsqueletoTabla filas={6} />}>
        <Contenido />
      </Carga>
    </>
  );
}

type IngredienteAdmin = { id: string; nombre: string; unidad: "ml" | "unidad" | "g"; categoria: string | null; orden: number; activo: boolean };

async function Contenido() {
  await exigirRol("admin");
  const supabase = await createClient();
  // RLS: el admin ve también lo inactivo y todas las cotizaciones
  const [{ parametros }, { data: tipos }, { data: recetas }, { data: ingredientesData }, { data: cotizaciones }, { count: total }, { count: conPedido }] =
    await Promise.all([
      datosCotizador({ conProductos: false }),
      supabase
        .from("tipos_evento")
        .select("id, nombre, activo, horas, perfil, bienvenida, cena, brindis, tipo_evento_recetas(nivel, recetas(nombre))")
        .order("orden"),
      supabase
        .from("recetas")
        .select("id, nombre, activo, receta_ingredientes(ingrediente_id, cantidad)")
        .order("orden"),
      supabase.from("ingredientes").select("id, nombre, unidad, categoria, orden, activo").order("orden"),
      supabase
        .from("cotizaciones")
        .select("id, codigo, creado_en, total_centimos, evento, pedido_id, perfiles(empresa, nombre), pedidos(codigo)")
        .order("creado_en", { ascending: false })
        .limit(15),
      supabase.from("cotizaciones").select("id", { count: "exact", head: true }),
      supabase.from("cotizaciones").select("id", { count: "exact", head: true }).not("pedido_id", "is", null),
    ]);
  const conversion = total ? Math.round(((conPedido ?? 0) / total) * 100) : 0;
  const ingredientes = (ingredientesData ?? []) as IngredienteAdmin[];
  const tragos: TragoAdmin[] = (recetas ?? []).map((r) => ({
    id: r.id,
    nombre: r.nombre,
    activo: r.activo,
    ingredientes: r.receta_ingredientes.map((x) => ({ ingrediente_id: x.ingrediente_id, cantidad: Number(x.cantidad) })),
  }));

  return (
    <div className="mt-8 flex flex-col gap-10">
      {/* Cuántas cotizaciones terminan en pedido */}
      <section className="grid gap-3 sm:grid-cols-3">
        {[
          { titulo: "Cotizaciones guardadas", valor: String(total ?? 0) },
          { titulo: "Terminaron en pedido", valor: String(conPedido ?? 0) },
          { titulo: "Conversión", valor: `${conversion} %` },
        ].map((m) => (
          <div key={m.titulo} className="rounded-md border border-linea bg-blanco p-4">
            <p className={sello}>{m.titulo}</p>
            <p className="mt-2 font-mono text-2xl font-semibold">{m.valor}</p>
          </div>
        ))}
      </section>

      {/* Supuestos generales */}
      {parametros && (
        <section>
          <h2 className={sello}>Supuestos del cálculo</h2>
          <details className="group mt-3">
            <summary className={`${botonSecundario} h-9 cursor-pointer list-none px-4`}>
              <span className="group-open:hidden">Ver y editar supuestos</span>
              <span className="hidden group-open:inline">Ocultar supuestos</span>
            </summary>
            <div className="mt-3">
              <FormParametros parametros={parametros} recetas={(recetas ?? []).map((r) => ({ id: r.id, nombre: r.nombre }))} />
            </div>
          </details>
        </section>
      )}

      {/* Tipos de evento */}
      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className={sello}>Tipos de evento</h2>
          <Link href="/admin/cotizador/tipos/nuevo" className={`${botonSecundario} h-9 px-4`}>
            Nuevo tipo de evento
          </Link>
        </div>
        <ul className="mt-3 overflow-hidden rounded-md border border-linea bg-blanco">
          {(tipos ?? []).map((t) => {
            const momentos = [t.bienvenida && "bienvenida", t.cena && "cena", t.brindis && "brindis", "fiesta"].filter(Boolean).join(", ");
            return (
              <li key={t.id} className="flex flex-wrap items-start justify-between gap-3 border-b border-linea px-4 py-4 last:border-b-0 sm:px-5">
                <div className="min-w-0">
                  <p className="font-medium">
                    {t.nombre}
                    {!t.activo && <span className="ml-2 text-xs font-normal text-gris">Inactivo</span>}
                  </p>
                  <p className="mt-0.5 text-xs text-gris">
                    <span className="font-mono">{t.horas} h</span> · público {PERFILES.find((p) => p.valor === t.perfil)?.texto.toLowerCase()} ·{" "}
                    {momentos}
                  </p>
                  <p className="mt-1 text-sm text-gris">
                    Barra: {t.tipo_evento_recetas.map((m) => `${m.recetas?.nombre} (${NIVEL[m.nivel] ?? m.nivel})`).join(" · ")}
                  </p>
                </div>
                <Link href={`/admin/cotizador/tipos/${t.id}`} className="text-sm font-medium text-verde hover:text-tinta">
                  Editar
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Tragos (recetario) */}
      <section>
        <h2 className={sello}>Tragos</h2>
        <p className="mt-1 text-sm text-gris">
          Cada trago se arma con sus ingredientes por trago. Con eso el cotizador suma lo que se necesita: lo que vende Surtiba busca
          su producto y lo demás va a &quot;Lo consigues por tu cuenta&quot;. Las cantidades son supuestos por validar.
        </p>
        <div className="mt-3 flex flex-col rounded-md border border-linea bg-blanco px-4 sm:px-5">
          {tragos.map((t) => (
            <div key={t.id} className="border-b border-linea py-3">
              <EditorTrago receta={t} ingredientes={ingredientes} />
            </div>
          ))}
          <div className="py-4">
            <p className="text-sm font-medium">Agregar un trago</p>
            <EditorTrago ingredientes={ingredientes} />
          </div>
        </div>
      </section>

      {/* Ingredientes del recetario */}
      <section>
        <h2 className={sello}>Ingredientes</h2>
        <p className="mt-1 text-sm text-gris">
          Si Surtiba lo vende, elige qué categoría de producto lo cubre (se mide en ml). Un ingrediente inactivo deja de usarse en
          los tragos.
        </p>
        <details className="group mt-3">
          <summary className={`${botonSecundario} h-9 cursor-pointer list-none px-4`}>
            <span className="group-open:hidden">Ver y editar ingredientes ({ingredientes.length})</span>
            <span className="hidden group-open:inline">Ocultar ingredientes</span>
          </summary>
          <div className="mt-3 flex flex-col gap-3 rounded-md border border-linea bg-blanco p-4 sm:p-5">
            {ingredientes.map((i) => (
              <div key={i.id} className="border-b border-linea pb-3 last:border-b-0">
                <FilaIngrediente ingrediente={i} />
              </div>
            ))}
            <div className="border-t border-linea pt-4">
              <p className="mb-2 text-sm font-medium">Agregar un ingrediente</p>
              <FilaIngrediente />
            </div>
          </div>
        </details>
      </section>

      {/* Últimas cotizaciones */}
      <section>
        <h2 className={sello}>Últimas cotizaciones</h2>
        {!cotizaciones || cotizaciones.length === 0 ? (
          <p className="mt-3 rounded-md border border-linea bg-blanco p-4 text-sm text-gris">
            Aún no hay cotizaciones. Aparecen aquí cuando un comprador guarda una.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-md border border-linea bg-blanco">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-linea text-left">
                  <th className={`${sello} px-4 py-3 font-medium`}>Código</th>
                  <th className={`${sello} px-4 py-3 font-medium`}>Comprador</th>
                  <th className={`${sello} px-4 py-3 font-medium`}>Evento</th>
                  <th className={`${sello} px-4 py-3 text-right font-medium`}>Total</th>
                  <th className={`${sello} px-4 py-3 font-medium`}>Pedido</th>
                </tr>
              </thead>
              <tbody>
                {cotizaciones.map((c) => {
                  const e = c.evento as { version?: number; tipo?: string; invitados?: number; resumen?: { nombre?: string; tipo?: string; invitados?: number } } | null;
                  const r = e?.version === 2 ? e.resumen : undefined;
                  const tipo = r?.tipo ?? e?.tipo;
                  const invitados = r?.invitados ?? e?.invitados;
                  return (
                    <tr key={c.id} className="border-b border-linea last:border-b-0">
                      <td className="px-4 py-3">
                        <a href={`/cotizaciones/${c.id}/pdf`} download className="font-mono font-medium text-verde hover:text-tinta">
                          {c.codigo}
                        </a>
                        <span className="block text-xs text-gris">{fecha(c.creado_en)}</span>
                      </td>
                      <td className="px-4 py-3">{c.perfiles?.empresa ?? c.perfiles?.nombre ?? "—"}</td>
                      <td className="px-4 py-3 text-gris">
                        {tipo ? `${r?.nombre ? `${r.nombre} · ` : ""}${tipo} · ${invitados} invitados` : "Desde el carrito"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono whitespace-nowrap">{soles(c.total_centimos)}</td>
                      <td className="px-4 py-3">
                        {c.pedido_id ? (
                          <Link href={`/admin/pedidos/${c.pedido_id}`} className="font-mono text-verde hover:text-tinta">
                            {c.pedidos?.codigo}
                          </Link>
                        ) : (
                          <span className="text-gris">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

// Un ingrediente editable en línea (sin ingrediente = formulario para agregar uno nuevo)
function FilaIngrediente({ ingrediente }: { ingrediente?: IngredienteAdmin }) {
  return (
    <FormAccion
      accion={guardarIngrediente}
      ocultos={ingrediente ? { ingrediente_id: ingrediente.id } : {}}
      texto={ingrediente ? "Guardar" : "Agregar"}
      variante="secundario"
    >
      <label className="flex min-w-40 flex-1 flex-col gap-1">
        <span className="text-xs text-gris">Ingrediente</span>
        <input name="nombre" required minLength={2} maxLength={40} defaultValue={ingrediente?.nombre} placeholder="Ej.: Pulpa de aguaymanto" className={`${campo} h-10`} />
      </label>
      <label className="flex w-28 flex-col gap-1">
        <span className="text-xs text-gris">Unidad</span>
        <select name="unidad" defaultValue={ingrediente?.unidad ?? "ml"} className={`${campo} h-10`}>
          <option value="ml">ml</option>
          <option value="unidad">unidades</option>
          <option value="g">gramos</option>
        </select>
      </label>
      <label className="flex w-44 flex-col gap-1">
        <span className="text-xs text-gris">¿Lo vende Surtiba?</span>
        <select name="categoria" defaultValue={ingrediente?.categoria ?? ""} className={`${campo} h-10`}>
          <option value="">No lo vende</option>
          {Object.entries(CATEGORIAS)
            .filter(([valor]) => valor !== "otro")
            .map(([valor, nombre]) => (
              <option key={valor} value={valor}>
                Sí, como {nombre.toLowerCase()}
              </option>
            ))}
        </select>
      </label>
      <label className="flex h-10 items-center gap-2 text-sm">
        <input name="activo" type="checkbox" defaultChecked={ingrediente?.activo ?? true} className="accent-verde" />
        Activo
      </label>
    </FormAccion>
  );
}
