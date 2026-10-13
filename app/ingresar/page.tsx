import type { Metadata } from "next";
import Link from "next/link";
import { MarcoAuth } from "@/components/MarcoAuth";
import { FormIngresar } from "./FormIngresar";

export const metadata: Metadata = { title: "Ingresar · Surtiba" };

export default function PaginaIngresar() {
  return (
    <MarcoAuth
      titulo="Ingresar"
      bajada="Compradores, marcas y equipo Surtiba entran por aquí con su correo y contraseña."
      pie={
        <>
          ¿Aún no tienes cuenta?{" "}
          <Link href="/registro" className="font-medium text-verde underline underline-offset-4 hover:text-tinta">
            Crea una aquí
          </Link>
        </>
      }
    >
      <div className="max-w-md">
        <FormIngresar />
      </div>
    </MarcoAuth>
  );
}
