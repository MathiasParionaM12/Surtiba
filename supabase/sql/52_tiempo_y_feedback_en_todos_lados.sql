-- 10-nov-2026 · Los compradores bajaban su cotización desde el CARRITO (no desde el cotizador): ahí no se medía el
-- tiempo ni se pedía su opinión. Ya aplicada en Supabase.
-- 1. cotizaciones.segundos: tiempo para armar la cotización (desde que abrió el cotizador o agregó lo primero al
--    carrito, hasta que bajó el PDF). Lo mide el navegador; solo el dueño lo pone, una vez (cotizacion_tiempo).
-- 2. La retroalimentación también se pide al hacer el pedido (contexto "pedido", con su pedido_id).

alter table public.cotizaciones add column segundos integer check (segundos between 0 and 86400);
update public.cotizaciones set segundos = (evento->>'segundos')::integer where evento ? 'segundos' and evento->>'segundos' ~ '^\d+$';

create or replace function public.cotizacion_tiempo(p_id uuid, p_segundos integer)
returns void language plpgsql security definer set search_path to '' as $$
begin
  if p_segundos is null or p_segundos not between 0 and 86400 then return; end if;
  update public.cotizaciones set segundos = p_segundos
  where id = p_id and comprador_id = (select auth.uid()) and segundos is null;
end $$;
revoke execute on function public.cotizacion_tiempo(uuid, integer) from public, anon;
grant execute on function public.cotizacion_tiempo(uuid, integer) to authenticated;

alter table public.retroalimentacion drop constraint retroalimentacion_contexto_check;
alter table public.retroalimentacion add constraint retroalimentacion_contexto_check check (contexto in ('cotizacion', 'pedido', 'marca'));
alter table public.retroalimentacion add column pedido_id uuid references public.pedidos (id) on delete set null;
grant insert (pedido_id) on public.retroalimentacion to authenticated;
drop policy "retroalimentacion: cada uno deja la suya" on public.retroalimentacion;
create policy "retroalimentacion: cada uno deja la suya" on public.retroalimentacion
  for insert to authenticated with check (
    perfil_id = (select auth.uid())
    and (cotizacion_id is null or exists (select 1 from public.cotizaciones c where c.id = cotizacion_id and c.comprador_id = (select auth.uid())))
    and (pedido_id is null or exists (select 1 from public.pedidos p where p.id = pedido_id and p.comprador_id = (select auth.uid()))));

-- Las 3 cotizaciones del 10-nov-2026 que se bajaron desde el carrito antes de este arreglo (COT-0019, 0020 y 0021):
-- su tiempo se calculó con los registros que sí había: desde que abrieron el cotizador (evento inicio_cotizacion)
-- hasta que guardaron la cotización. Resultado: 485, 540 y 296 segundos.
update public.cotizaciones c
set segundos = round(extract(epoch from c.creado_en - (
  select min(e.creado_en) from public.eventos e
  where e.perfil_id = c.comprador_id and e.tipo = 'inicio_cotizacion'
    and e.creado_en < c.creado_en and e.creado_en > c.creado_en - interval '6 hours')))::int
where c.codigo in ('COT-0019', 'COT-0020', 'COT-0021') and c.segundos is null;
