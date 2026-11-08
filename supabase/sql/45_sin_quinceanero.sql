-- 8-nov-2026 · Se quita el tipo de evento "Quinceañero" (lo pidió Mathias después de lo que dijo Adriano:
-- en un quinceañero la mayoría son menores y no siempre hay adultos, así que el cálculo de tragos no aplica).
-- No se borra: queda inactivo (el admin puede volver a activarlo). El campo "Menores de edad" se queda para otros eventos.
-- Ya aplicada en Supabase.
update public.tipos_evento set activo = false where nombre = 'Quinceañero';
