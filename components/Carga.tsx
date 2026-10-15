import { Suspense, ViewTransition } from "react";

// Como <Suspense>, pero el esqueleto se desvanece y el contenido aparece con un fundido corto
// (View Transitions de React 19.3; estilos .salida-carga y .entrada-carga en globals.css).
// Si el navegador no las soporta o la persona pidió "reducir movimiento", el cambio es directo.
// default="none": no se anima con otros cambios de la página.
export function Carga({ fallback, children }: { fallback: React.ReactNode; children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <ViewTransition exit="salida-carga" default="none">
          {fallback}
        </ViewTransition>
      }
    >
      <ViewTransition enter="entrada-carga" default="none">
        {children}
      </ViewTransition>
    </Suspense>
  );
}
