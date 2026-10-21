-- 21-oct-2026 · Avisos en tiempo real. Ya aplicada en Supabase.
-- Supabase Realtime envía cada aviso nuevo al navegador de su dueño (components/Campana.tsx).
-- Realtime respeta RLS: cada persona solo recibe los avisos que puede ver (los suyos).
alter publication supabase_realtime add table public.avisos;
