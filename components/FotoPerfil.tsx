import Image from "next/image";

// Foto de perfil en un círculo. Sin foto: la inicial en verde, sobre papel.
// La foto viene de un bucket privado con un enlace firmado que vence: por eso "unoptimized"
// (así Vercel no guarda copias de una foto privada).
export function FotoPerfil({ nombre, foto, tamano = "chico" }: { nombre: string; foto: string | null; tamano?: "chico" | "grande" }) {
  const clase = tamano === "grande" ? "size-20 text-3xl" : "size-9 text-sm";
  return (
    <span className={`relative flex ${clase} shrink-0 items-center justify-center overflow-hidden rounded-full border border-linea bg-papel`}>
      {foto ? (
        <Image src={foto} alt="" fill unoptimized className="object-cover" />
      ) : (
        <span className="font-semibold text-verde" aria-hidden="true">
          {nombre.trim().charAt(0).toUpperCase() || "?"}
        </span>
      )}
    </span>
  );
}
