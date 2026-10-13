import type { Metadata } from "next";
import Link from "next/link";
import { FormIngresar } from "./FormIngresar";

export const metadata: Metadata = { title: "Ingresar · Surtiba" };

export default function PaginaIngresar() {
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-12 sm:py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Ingresar</h1>
      <p className="mt-2 text-gris">Usa el correo y la contraseña de tu cuenta.</p>

      <div className="mt-8 rounded-md border border-linea bg-blanco p-5 sm:p-6">
        <FormIngresar />
      </div>

      <p className="mt-6 text-sm text-gris">
        ¿Aún no tienes cuenta?{" "}
        <Link href="/registro" className="font-medium text-verde underline underline-offset-4 hover:text-tinta">
          Crea una aquí
        </Link>
      </p>
    </main>
  );
}
