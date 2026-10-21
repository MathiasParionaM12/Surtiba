"use client";

// Registra un evento del embudo (vio un producto, empezó a pedir) al abrir la página.
// Sin cookies ni datos personales: la base pone el perfil si hay sesión (registrar_evento).
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export function RegistrarEvento({ tipo, productoId }: { tipo: "vio_producto" | "inicio_pedido"; productoId?: string }) {
  useEffect(() => {
    void createClient().rpc("registrar_evento", { p_tipo: tipo, p_producto: productoId ?? null });
  }, [tipo, productoId]);
  return null;
}
