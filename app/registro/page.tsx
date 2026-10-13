import type { Metadata } from "next";
import Link from "next/link";
import { MarcoAuth } from "@/components/MarcoAuth";
import { FormRegistro } from "./FormRegistro";

export const metadata: Metadata = { title: "Crear cuenta · Surtiba" };

export default function PaginaRegistro() {
  return (
    <MarcoAuth
      titulo="Crea tu cuenta"
      bajada="Para caterings, organizadores de eventos, wedding planners y bares. No necesitas aprobación: creas tu cuenta y ya puedes pedir."
      pie={
        <>
          ¿Ya tienes cuenta?{" "}
          <Link href="/ingresar" className="font-medium text-verde underline underline-offset-4 hover:text-tinta">
            Ingresa aquí
          </Link>
          . ¿Eres una marca? Tu cuenta la crea el equipo Surtiba.
        </>
      }
    >
      <FormRegistro />
    </MarcoAuth>
  );
}
