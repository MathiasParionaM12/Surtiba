import type { Metadata } from "next";
import { Carga } from "@/components/Carga";
import { Contador } from "@/components/Contador";
import { EsqueletoPagina } from "@/components/Esqueleto";
import { TIPOS_NEGOCIO } from "@/lib/cuenta";
import { sello } from "@/lib/estilos";
import { exigirRol } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Actividad · Panel Surtiba" };

type Actividad = {
  resumen: { cuentas_7d: number; cuentas_30d: number; ingresaron_7d: number; vieron_7d: number };
  cuentas: { nombre: string | null; empresa: string | null; rol: string; tipo: string | null; distrito: string | null; marca: string | null; creado_en: string }[];
  ingresos: { nombre: string | null; empresa: string | null; rol: string; marca: string | null; ingreso: string }[];
  vistas_dia: { dia: string; vistas: number }[];
};

const ROL: Record<string, string> = { comprador: "Comprador", marca: "Marca", admin: "Equipo Surtiba", solicitante: "Solicitud de marca" };
const TIPO = Object.fromEntries(TIPOS_NEGOCIO.map((t) => [t.valor, t.texto]));
// "9 nov, 14:32" en hora de Lima
const cuando = new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Lima" });

// Actividad de la plataforma (9-nov-2026): cuentas nuevas, últimos ingresos y productos vistos.
// Visitas, países y dispositivos están en Vercel Analytics (no se guardan aquí).
export default function PaginaActividad() {
  return (
    <Carga fallback={<EsqueletoPagina />}>
      <Contenido />
    </Carga>
  );
}

async function Contenido() {
  await exigirRol("admin");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_actividad");
  if (error || !data) return <p className="text-gris">No pudimos cargar la actividad. Recarga la página.</p>;
  const a = data as unknown as Actividad;
  const maxVistas = Math.max(1, ...a.vistas_dia.map((d) => d.vistas));
  const quien = (x: { nombre: string | null; empresa: string | null; marca: string | null }) =>
    [x.nombre ?? "Sin nombre", x.marca ?? x.empresa].filter(Boolean).join(" · ");

  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Actividad</h1>
      <p className="mt-2 max-w-2xl text-gris">
        Quién se registra y quién entra. Las visitas a la página, el país y el dispositivo están en Vercel → tu proyecto → Analytics.
      </p>

      <dl className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {(
          [
            ["Cuentas nuevas · 7 días", a.resumen.cuentas_7d],
            ["Cuentas nuevas · 30 días", a.resumen.cuentas_30d],
            ["Entraron · 7 días", a.resumen.ingresaron_7d],
            ["Productos vistos · 7 días", a.resumen.vieron_7d],
          ] as const
        ).map(([t, v]) => (
          <div key={t} className="rounded-md border border-linea bg-blanco p-4">
            <dt className="text-xs text-gris">{t}</dt>
            <dd className="mt-1 font-mono text-2xl font-semibold">
              <Contador valor={v} />
            </dd>
          </div>
        ))}
      </dl>

      {/* Productos vistos por día: barras simples, sin librería */}
      <section className="mt-10">
        <h2 className={sello}>Productos vistos por día · 14 días</h2>
        <div className="mt-3 rounded-md border border-linea bg-blanco p-4">
          <ol className="flex h-28 items-end gap-1" aria-label="Productos vistos por día">
            {a.vistas_dia.map((d) => (
              <li key={d.dia} className="flex h-full flex-1 flex-col items-center justify-end gap-1" title={`${d.dia}: ${d.vistas}`}>
                <span className="font-mono text-[10px] text-gris">{d.vistas || ""}</span>
                <span className="crecer block w-full max-w-8 rounded-t-[4px] bg-verde/70" style={{ height: `${(d.vistas / maxVistas) * 100}%` }} />
              </li>
            ))}
          </ol>
          <div className="mt-1 flex gap-1 font-mono text-[10px] text-gris">
            {a.vistas_dia.map((d, i) => (
              <span key={d.dia} className="flex-1 text-center">
                {i % 2 === 0 ? d.dia : ""}
              </span>
            ))}
          </div>
        </div>
      </section>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className={sello}>Últimas cuentas creadas</h2>
          <ul className="escalonado mt-3 overflow-hidden rounded-md border border-linea bg-blanco">
            {a.cuentas.length === 0 && <li className="px-4 py-3 text-sm text-gris">Aún no hay cuentas.</li>}
            {a.cuentas.map((c, i) => (
              <li key={`${c.creado_en}-${i}`} className="flex items-start justify-between gap-3 border-b border-linea px-4 py-3 text-sm last:border-b-0">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{quien(c)}</span>
                  <span className="block truncate text-xs text-gris">
                    {[ROL[c.rol] ?? c.rol, c.tipo ? TIPO[c.tipo] ?? c.tipo : null, c.distrito].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <span className="shrink-0 font-mono text-xs text-gris">{cuando.format(new Date(c.creado_en))}</span>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h2 className={sello}>Últimos ingresos</h2>
          <ul className="escalonado mt-3 overflow-hidden rounded-md border border-linea bg-blanco">
            {a.ingresos.length === 0 && <li className="px-4 py-3 text-sm text-gris">Nadie ha ingresado todavía.</li>}
            {a.ingresos.map((x, i) => (
              <li key={`${x.ingreso}-${i}`} className="flex items-start justify-between gap-3 border-b border-linea px-4 py-3 text-sm last:border-b-0">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{quien(x)}</span>
                  <span className="block text-xs text-gris">{ROL[x.rol] ?? x.rol}</span>
                </span>
                <span className="shrink-0 font-mono text-xs text-gris">{cuando.format(new Date(x.ingreso))}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-gris">Es el último ingreso de cada cuenta. El historial completo está en Supabase → Authentication → Logs.</p>
        </section>
      </div>
    </>
  );
}
