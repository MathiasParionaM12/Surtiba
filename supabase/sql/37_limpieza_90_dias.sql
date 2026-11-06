-- 5-nov-2026 · KISS: los avisos de la campana y los eventos de analítica se borran solos a los 90 días.
-- Ya aplicada en Supabase. Cada vez que entra uno nuevo, se borran los viejos (sin programar tareas aparte).
-- El embudo de Métricas usa solo 30 días, así que no cambia nada.

create index if not exists avisos_creado_idx on public.avisos (creado_en);
create index if not exists eventos_creado_idx on public.eventos (creado_en);

create or replace function privado.borrar_viejos()
returns trigger language plpgsql security definer set search_path to '' as $$
begin
  if tg_table_name = 'avisos' then
    delete from public.avisos where creado_en < now() - interval '90 days';
  elsif tg_table_name = 'eventos' then
    delete from public.eventos where creado_en < now() - interval '90 days';
  end if;
  return null;
end $$;
revoke execute on function privado.borrar_viejos() from public, anon, authenticated;

create trigger avisos_borrar_viejos after insert on public.avisos
  for each statement execute function privado.borrar_viejos();
create trigger eventos_borrar_viejos after insert on public.eventos
  for each statement execute function privado.borrar_viejos();
