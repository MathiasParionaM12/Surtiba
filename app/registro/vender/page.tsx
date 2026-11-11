import type { Metadata } from "next";
import Link from "next/link";
import { MarcoAuth } from "@/components/MarcoAuth";
import { COMISION_PCT, MARCAS_SIN_APROBACION } from "@/lib/catalogo";
import { PestanasRegistro } from "@/components/PestanasRegistro";
import { FormVender } from "./FormVender";

export const metadata: Metadata = { title: "Quiero vender · Surtiba" };

export default function PaginaVender() {
  return (
    <MarcoAuth
      titulo="Vende en Surtiba"
      bajada={`Cuéntanos de tu marca. ${MARCAS_SIN_APROBACION ? "Tu cuenta queda lista al instante para subir tus productos; el equipo Surtiba revisa cada producto antes de que aparezca en el catálogo." : "El equipo Surtiba revisa cada solicitud antes de que tus productos aparezcan en el catálogo."} Tu primer pedido no paga comisión; después, ${COMISION_PCT} % solo sobre lo vendido y entregado.`}
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
