// Un ícono de trazo fino por categoría (chips del catálogo, cinta de la portada, producto sin foto).
import { Amphora, FlaskConical, Grape, Leaf, Martini, Package, Snowflake, Sparkles, TreePalm, Wine, type LucideIcon } from "lucide-react";
import { createElement } from "react";

const ICONOS: Record<string, LucideIcon> = {
  pisco: Amphora, // la botija del pisco
  ron: TreePalm,
  gin: Leaf, // enebro y hierbas
  vodka: Snowflake,
  vino: Wine,
  espumante: Sparkles,
  licor: FlaskConical,
  coctel_listo: Martini,
  otro: Package,
};

export function IconoCategoria({
  categoria,
  className = "size-4",
  strokeWidth = 1.5,
}: {
  categoria: string;
  className?: string;
  strokeWidth?: number;
}) {
  return createElement(ICONOS[categoria] ?? Grape, { className, strokeWidth, "aria-hidden": true });
}
