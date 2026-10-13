import { createClient } from "@/lib/supabase/server";

// Fase 0: lee la fila de prueba_conexion para comprobar que la app llega a Supabase.
// Se quita en la fase 1, cuando borremos esa tabla.
async function leerPrueba(): Promise<{ ok: true; mensaje: string } | { ok: false; error: string }> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("prueba_conexion")
      .select("mensaje")
      .eq("id", 1)
      .maybeSingle();

    if (error) return { ok: false, error: error.message };
    if (!data) {
      return {
        ok: false,
        error: "La tabla prueba_conexion está vacía o RLS no deja leerla. Vuelve a correr supabase/sql/00_prueba_conexion.sql.",
      };
    }
    return { ok: true, mensaje: data.mensaje };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error desconocido." };
  }
}

export async function EstadoConexion() {
  const resultado = await leerPrueba();

  return (
    <div className="rounded-md border border-linea bg-blanco p-5">
      <div className="flex items-center justify-between gap-4">
        <p className="font-mono text-xs font-medium tracking-[0.12em] text-gris uppercase">
          Conexión con Supabase
        </p>
        {resultado.ok ? (
          <span className="rounded-sm border border-verde px-2 py-0.5 font-mono text-xs font-medium tracking-[0.1em] text-verde uppercase">
            OK
          </span>
        ) : (
          <span className="rounded-sm border border-rojo px-2 py-0.5 font-mono text-xs font-medium tracking-[0.1em] text-rojo uppercase">
            Error
          </span>
        )}
      </div>
      {resultado.ok ? (
        <p className="mt-3 font-mono text-sm">Dato leído: “{resultado.mensaje}”</p>
      ) : (
        <p className="mt-3 text-sm text-gris">{resultado.error}</p>
      )}
    </div>
  );
}

// Lo que se ve mientras llega el dato.
export function EstadoConexionCargando() {
  return (
    <div className="rounded-md border border-linea bg-blanco p-5">
      <p className="font-mono text-xs font-medium tracking-[0.12em] text-gris uppercase">
        Conexión con Supabase
      </p>
      <p className="mt-3 text-sm text-gris">Comprobando…</p>
    </div>
  );
}
