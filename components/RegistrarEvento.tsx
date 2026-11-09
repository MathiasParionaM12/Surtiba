"use client";

// Registra un evento del embudo (vio un producto, empezó a pedir) al abrir la página.
// Sin cookies ni datos personales: la base pone el perfil si hay sesión (registrar_evento).
// Ojo: una consulta de Supabase solo se envía cuando se espera su respuesta (.then). Hasta el 9-nov-2026
// se usaba "void consulta" y nunca se enviaba: el embudo no contaba "vio un producto" ni "empezó a pedir".
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export function RegistrarEvento({ tipo, productoId }: { tipo: "vio_producto" | "inicio_pedido"; productoId?: string }) {
  useEffect(() => {
    // Si falla (sin conexión, bloqueador), no se muestra nada: es solo una métrica
    createClient()
      .rpc("registrar_evento", { p_tipo: tipo, p_producto: productoId ?? null })
      .then(
        () => undefined,
        () => undefined,
      );
  }, [tipo, productoId]);
  return null;
}
