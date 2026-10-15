import type { Metadata } from "next";
import Link from "next/link";
import { Carga } from "@/components/Carga";
import { EsqueletoTabla } from "@/components/Esqueleto";
import { exigirRol } from "@/lib/sesion";
import { FormProducto } from "../FormProducto";

export const metadata: Metadata = { title: "Nuevo producto · Panel de marca · Surtiba" };

export default function PaginaNuevoProducto() {
  return (
    <>
      <Link href="/marca/productos" className="text-sm font-medium text-verde hover:text-tinta">
        ← Productos
      </Link>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight sm:text-3xl">Nuevo producto</h1>
      <p className="mt-2 text-gris">Después de crearlo podrás subir su foto.</p>
      <div className="mt-6 max-w-3xl rounded-md border border-linea bg-blanco p-5 sm:p-8">
        <Carga fallback={<EsqueletoTabla filas={3} />}>
          <Formulario />
        </Carga>
      </div>
    </>
  );
}

async function Formulario() {
  await exigirRol("marca");
  return (
    <FormProducto
      inicial={{
        nombre: "",
        categoria: "",
        ml: "750",
        grado: "",
        unidades: "12",
        registro: "",
        stock: "0",
        activo: true,
        tramos: [{ desde: "1", precio: "" }],
      }}
    />
  );
}
