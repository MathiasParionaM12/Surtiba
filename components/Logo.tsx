import Image from "next/image";
import logo from "@/components/marca/logo-surtiba.png";

// Logo oficial de Surtiba (archivo de Mathias): "surtiba" con el punto de la "i" como cuadrado amarillo.
// La altura se da con className (ej. "h-7"); el ancho se ajusta solo.
export function Logo({ className = "h-7", prioridad = false }: { className?: string; prioridad?: boolean }) {
  return <Image src={logo} alt="surtiba" priority={prioridad} className={`w-auto ${className}`} />;
}
