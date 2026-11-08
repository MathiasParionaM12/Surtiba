// Enlace al WhatsApp de atención de Surtiba (lib/empresa.ts). Abre la conversación en otra pestaña.
// El mensaje inicial es genérico: nunca se ponen datos personales en el enlace.
import { EMPRESA, enlaceWhatsapp } from "@/lib/empresa";

export function EnlaceWhatsapp({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return (
    <a href={enlaceWhatsapp()} target="_blank" rel="noopener noreferrer" className={`font-medium enlace text-verde hover:text-tinta ${className}`}>
      {children ?? `WhatsApp ${EMPRESA.whatsappVisible}`}
    </a>
  );
}
