import { sello } from "@/lib/estilos";
import { ACTUALIZADO } from "@/lib/empresa";

// Diseño común de las páginas legales: título, fecha de actualización y secciones numeradas
export function PaginaLegal({ etiqueta, titulo, intro, children }: { etiqueta: string; titulo: string; intro: React.ReactNode; children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-8 sm:py-14">
      <p className={sello}>{etiqueta}</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{titulo}</h1>
      <p className="mt-2 font-mono text-xs text-gris">Actualizado el {ACTUALIZADO}</p>
      <div className="mt-6 border-l-2 border-verde pl-4 text-gris">{intro}</div>
      <div className="mt-10 flex flex-col gap-8 [counter-reset:seccion]">{children}</div>
    </main>
  );
}

export function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="[counter-increment:seccion]">
      <h2 className="text-lg font-semibold tracking-tight before:mr-2 before:font-mono before:text-sm before:text-verde before:content-[counter(seccion,decimal-leading-zero)]">
        {titulo}
      </h2>
      <div className="mt-3 flex flex-col gap-3 leading-relaxed [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1.5">
        {children}
      </div>
    </section>
  );
}
