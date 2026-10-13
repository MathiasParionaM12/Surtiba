import type { Metadata } from "next";
import Link from "next/link";
import { FormRegistro } from "./FormRegistro";

export const metadata: Metadata = { title: "Crear cuenta · Surtiba" };

export default function PaginaRegistro() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12 sm:py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Crea tu cuenta</h1>
      <p className="mt-2 max-w-lg text-gris">
        Para caterings, organizadores de eventos, wedding planners y bares. No necesitas aprobación: creas tu cuenta y ya
        puedes pedir.
      </p>

      <div className="mt-8 rounded-md border border-linea bg-blanco p-5 sm:p-6">
        <FormRegistro />
      </div>

      <p className="mt-6 text-sm text-gris">
        ¿Ya tienes cuenta?{" "}
        <Link href="/ingresar" className="font-medium text-verde underline underline-offset-4 hover:text-tinta">
          Ingresa aquí
        </Link>
      </p>
    </main>
  );
}
