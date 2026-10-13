-- Fase 0: tabla temporal para comprobar que la app se conecta a Supabase.
-- Se borra en la fase 1.
-- Cómo usarlo: Supabase -> SQL Editor -> New query -> pegar todo -> Run.

create table public.prueba_conexion (
  id smallint primary key,
  mensaje text not null
);

-- RLS activado, como en todas las tablas.
alter table public.prueba_conexion enable row level security;

-- Cualquiera (con o sin sesión) puede LEER. Nadie puede escribir desde la app.
create policy "Cualquiera puede leer prueba_conexion"
  on public.prueba_conexion
  for select
  to anon, authenticated
  using (true);

grant select on public.prueba_conexion to anon, authenticated;

insert into public.prueba_conexion (id, mensaje)
values (1, 'Hola desde Supabase');
