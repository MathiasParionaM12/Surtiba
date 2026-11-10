"use client";

// Al terminar la cotización (ya guardada): ¿qué mejorarías?, ¿qué falló? (10-nov-2026, experimento del curso).
// Incentivo: la opinión ayuda a postular a los primeros 2 pedidos con envío gratis.
import { Gift, Star } from "lucide-react";
import { useState, useTransition } from "react";
import { AvisoForm } from "@/components/AvisoForm";
import { enviarRetroalimentacion } from "@/lib/acciones-cotizador";
import { botonPrimario, campo, sello } from "@/lib/estilos";

export function Retroalimentacion({ cotizacionId }: { cotizacionId: string }) {
  const [puntaje, setPuntaje] = useState<number | null>(null);
  const [mejorar, setMejorar] = useState("");
  const [fallos, setFallos] = useState("");
  const [estado, setEstado] = useState<{ error?: string; mensaje?: string }>({});
  const [enviando, enviar] = useTransition();

  if (estado.mensaje) {
    return (
      <div role="status" className="aparecer rounded-md border border-verde/40 bg-verde/5 p-5 text-sm">
        <p className="font-medium text-verde">{estado.mensaje}</p>
      </div>
    );
  }

  return (
    <section className="aparecer flex flex-col gap-4 rounded-md border border-linea bg-blanco p-5 sm:p-6">
      <div>
        <h3 className={sello}>Cuéntanos cómo te fue</h3>
        <p className="mt-2 flex items-start gap-2 text-sm">
          <Gift className="mt-0.5 size-4 shrink-0 text-verde" aria-hidden="true" />
          <span>
            Surtiba está en prueba y tu opinión nos ayuda a mejorarlo. Al dejarla, <strong>postulas a tus primeros 2 pedidos con envío gratis</strong>.
          </span>
        </p>
      </div>

      <fieldset>
        <legend className="text-sm font-medium">¿Qué tan fácil fue armar tu cotización?</legend>
        <div className="mt-2 flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setPuntaje(n === puntaje ? null : n)}
              aria-label={`${n} de 5`}
              aria-pressed={puntaje !== null && n <= puntaje}
              className="inline-flex size-11 items-center justify-center rounded-md hover:bg-papel"
            >
              <Star className={`size-6 ${puntaje !== null && n <= puntaje ? "fill-verde text-verde" : "text-linea"}`} aria-hidden="true" />
            </button>
          ))}
        </div>
        <p className="mt-1 text-xs text-gris">1 = muy difícil · 5 = muy fácil</p>
      </fieldset>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">¿Qué podemos mejorar?</span>
        <textarea
          value={mejorar}
          onChange={(e) => setMejorar(e.target.value)}
          rows={3}
          maxLength={1000}
          placeholder="Ej.: me faltó un trago, quisiera ver más marcas, el precio por invitado…"
          className={`${campo} h-auto py-2 text-sm`}
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">¿Encontraste algún fallo?</span>
        <textarea
          value={fallos}
          onChange={(e) => setFallos(e.target.value)}
          rows={2}
          maxLength={1000}
          placeholder="Ej.: un botón no respondía, un número no cuadraba…"
          className={`${campo} h-auto py-2 text-sm`}
        />
      </label>

      <AvisoForm error={estado.error} />
      <button
        type="button"
        disabled={enviando}
        onClick={() => enviar(async () => setEstado(await enviarRetroalimentacion({ cotizacionId, puntaje, mejorar, fallos })))}
        className={`${botonPrimario} self-start`}
      >
        {enviando ? "Enviando…" : "Enviar mi opinión"}
      </button>
    </section>
  );
}
