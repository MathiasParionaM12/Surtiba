import type { Metadata } from "next";
import Link from "next/link";
import { MarcoAuth } from "@/components/MarcoAuth";
import { PestanasRegistro } from "@/components/PestanasRegistro";
import { FormRegistro } from "./FormRegistro";

export const metadata: Metadata = { title: "Crear cuenta · Surtiba" };

export default function PaginaRegistro() {
  return (
    <MarcoAuth
      titulo="Crea tu cuenta"
      bajada="No necesitas aprobación para comprar: creas tu cuenta y ya puedes pedir."
      pie={
        <>
          ¿Ya tienes cuenta?{" "}
          <Link href="/ingresar" className="font-medium text-verde underline underline-offset-4 hover:text-tinta">
            Ingresa aquí
          </Link>
        </>
      }
    >
      <PestanasRegistro activa="comprar" />
      <FormRegistro />
    </MarcoAuth>
  );
}
