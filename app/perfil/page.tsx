import type { Metadata } from "next";
import { Carga } from "@/components/Carga";
import { EsqueletoTabla } from "@/components/Esqueleto";
import { sello } from "@/lib/estilos";
import { separarTelefono } from "@/lib/paises";
import { exigirRol } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";
import { FormClave } from "./FormClave";
import { FormPerfil } from "./FormPerfil";
import { SubirFoto } from "./SubirFoto";

export const metadata: Metadata = { title: "Mi perfil · Surtiba" };

export default function PaginaPerfil() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-8 sm:py-14">
      <p className={sello}>Tu cuenta</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Mi perfil</h1>
      <Carga fallback={<EsqueletoTabla filas={6} />}>
        <Perfil />
      </Carga>
    </main>
  );
}

async function Perfil() {
  const usuario = await exigirRol("comprador");
  const supabase = await createClient();
  // RLS: solo su propio perfil
  const { data: p } = await supabase
    .from("perfiles")
    .select("nombre, empresa, tipo_negocio, whatsapp, ruc, foto_ruta, direccion, direccion_detalle, distrito, codigo_postal, referencia")
    .eq("id", usuario.id)
    .single();

  // La foto está en un bucket privado: un enlace firmado que vence en 1 hora
  const foto = p?.foto_ruta
    ? ((await supabase.storage.from("perfiles").createSignedUrl(p.foto_ruta, 3600)).data?.signedUrl ?? null)
    : null;
  const telefono = separarTelefono(p?.whatsapp);
  const nombre = p?.empresa ?? p?.nombre ?? usuario.email;

  return (
    <div className="mt-8 flex flex-col gap-6">
      <section className="rounded-md border border-linea bg-blanco p-5 sm:p-8">
        <SubirFoto perfilId={usuario.id} nombre={nombre} fotoActual={foto} />
        <p className="mt-5 border-t border-linea pt-4 text-sm text-gris">
          Ingresas con <span className="font-medium text-tinta">{usuario.email}</span>. El correo no se cambia desde aquí.
        </p>
      </section>

      <section className="rounded-md border border-linea bg-blanco p-5 sm:p-8">
        <FormPerfil
          iniciales={{
            nombre: p?.nombre ?? "",
            empresa: p?.empresa ?? "",
            tipo_negocio: p?.tipo_negocio ?? "",
            prefijo: telefono.prefijo,
            whatsapp: telefono.numero,
            ruc: p?.ruc ?? "",
            direccion: p?.direccion ?? "",
            direccion_detalle: p?.direccion_detalle ?? "",
            distrito: p?.distrito ?? "",
            codigo_postal: p?.codigo_postal ?? "",
            referencia: p?.referencia ?? "",
          }}
        />
      </section>

      <section className="rounded-md border border-linea bg-blanco p-5 sm:p-8">
        <h2 className={`${sello} mb-4`}>Contraseña</h2>
        <FormClave />
      </section>
    </div>
  );
}
