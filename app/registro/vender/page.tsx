import type { Metadata } from "next";
import Link from "next/link";
import { MarcoAuth } from "@/components/MarcoAuth";
import { PestanasRegistro } from "@/components/PestanasRegistro";
import { FormVender } from "./FormVender";

export const metadata: Metadata = { title: "Quiero vender · Surtiba" };

export default function PaginaVender() {
  return (
    <MarcoAuth
      titulo="Vende en Surtiba"
      bajada="Cuéntanos de tu marca. El equipo Surtiba revisa cada solicitud y acuerda contigo la comisión y el pedido mínimo antes de que tus productos aparezcan en el catálogo."
      pie={
        <>
          ¿Ya tienes cuenta?{" "}
          <Link href="/ingresar" className="font-medium text-verde underline underline-offset-4 hover:text-tinta">
            Ingresa aquí
          </Link>
        </>
      }
    >
      <PestanasRegistro activa="vender" />
      <FormVender />
    </MarcoAuth>
  );
}
