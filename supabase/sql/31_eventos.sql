-- 21-oct-2026 · Eventos propios para el embudo del panel admin. Ya aplicada en Supabase.
-- Se registran solo 3 cosas: vio un producto, agregó al carrito, empezó a pedir (pantalla de confirmar).
-- Sin cookies ni datos personales: solo el tipo, el producto y, si tiene sesión, su perfil.
-- Cualquiera puede registrar (visitantes incluidos) solo con registrar_evento; solo el admin los lee.

create table public.eventos (
  id bigint generated always as identity primary key,
  tipo text not null check (tipo in ('vio_producto', 'agrego_carrito', 'inicio_pedido')),
  producto_id uuid references public.productos (id) on delete set null,
  perfil_id uuid references public.perfiles (id) on delete set null,
  creado_en timestamptz not null default now()
);
create index eventos_tipo_fecha_idx on public.eventos (tipo, creado_en desc);

alter table public.eventos enable row level security;
create policy "eventos: solo el admin los ve" on public.eventos
  for select to authenticated using ((select privado.es_admin()));
-- Supabase da por defecto todos los permisos sobre tablas nuevas: se quitan y se dan solo los justos
revoke all on public.eventos from anon, authenticated;
grant select on public.eventos to authenticated;

-- Registrar un evento: el perfil lo pone la base (nadie se hace pasar por otro)
create or replace function public.registrar_evento(p_tipo text, p_producto uuid default null)
returns void language plpgsql security definer set search_path to '' as $$
begin
  if p_tipo not in ('vio_producto', 'agrego_carrito', 'inicio_pedido') then return; end if;
  insert into public.eventos (tipo, producto_id, perfil_id)
  values (p_tipo, (select id from public.productos where id = p_producto), (select auth.uid()));
end $$;
revoke execute on function public.registrar_evento(text, uuid) from public;
grant execute on function public.registrar_evento(text, uuid) to anon, authenticated;
