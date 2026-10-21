-- 21-oct-2026 · Avisos en la app (campana). Ya aplicada en Supabase.
-- Los avisos los crea solo la base de datos, con triggers cuando cambia un pedido o un subpedido.
-- Nadie los inserta ni borra desde la app; cada persona solo ve los suyos y solo puede marcarlos leídos.
-- Los textos para la marca llevan solo el código de la orden: nunca datos del comprador.

create table public.avisos (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid not null references public.perfiles (id) on delete cascade,
  texto text not null check (length(texto) between 3 and 300),
  enlace text check (enlace is null or enlace ~ '^/[a-z0-9/_-]*$'),
  leido_en timestamptz,
  creado_en timestamptz not null default now()
);
create index avisos_perfil_idx on public.avisos (perfil_id, creado_en desc);

alter table public.avisos enable row level security;
create policy "avisos: ver los propios" on public.avisos
  for select to authenticated using (perfil_id = (select auth.uid()));
create policy "avisos: marcar leídos los propios" on public.avisos
  for update to authenticated using (perfil_id = (select auth.uid())) with check (perfil_id = (select auth.uid()));
-- Supabase da por defecto todos los permisos sobre tablas nuevas: se quitan y se dan solo los justos.
-- Probado: el comprador ve y marca leídos los suyos; no puede cambiar el texto ni el dueño, ni borrar ni crear.
revoke all on public.avisos from anon, authenticated;
grant select on public.avisos to authenticated;
grant update (leido_en) on public.avisos to authenticated; -- solo esa columna

-- Ayudas para crear avisos (solo las usan los triggers)
create or replace function privado.avisar(p_perfil uuid, p_texto text, p_enlace text)
returns void language sql security definer set search_path to '' as $$
  -- Sin texto no hay aviso (estados que no avisan): así nunca falla el cambio de estado que lo dispara
  insert into public.avisos (perfil_id, texto, enlace) select p_perfil, p_texto, p_enlace where p_perfil is not null and p_texto is not null;
$$;
create or replace function privado.avisar_marca(p_marca uuid, p_texto text, p_enlace text)
returns void language sql security definer set search_path to '' as $$
  insert into public.avisos (perfil_id, texto, enlace) select id, p_texto, p_enlace from public.perfiles where marca_id = p_marca and rol = 'marca' and p_texto is not null;
$$;
create or replace function privado.avisar_admins(p_texto text, p_enlace text)
returns void language sql security definer set search_path to '' as $$
  insert into public.avisos (perfil_id, texto, enlace) select id, p_texto, p_enlace from public.perfiles where rol = 'admin' and p_texto is not null;
$$;

-- Pedido: avisos al comprador por cada cambio de estado; al admin si hay pedido nuevo o pago;
-- a las marcas cuando el cliente paga un encargo (recién ahí pueden prepararlo)
create or replace function privado.avisos_pedido()
returns trigger language plpgsql security definer set search_path to '' as $$
declare
  sp record;
begin
  if tg_op = 'INSERT' then
    perform privado.avisar_admins(
      'Nuevo pedido ' || new.codigo || case when new.tipo = 'encargo' then ' por encargo (las marcas lo confirman).' else '.' end,
      '/admin/pedidos/' || new.id);
    return new;
  end if;

  if new.estado is distinct from old.estado then
    perform privado.avisar(new.comprador_id, case new.estado
      when 'por_pagar' then 'Tu pedido ' || new.codigo || ' está confirmado y en producción. Págalo para continuar.'
      when 'en_preparacion' then 'Las marcas ya están preparando tu pedido ' || new.codigo || '.'
      when 'en_camino' then 'Tu pedido ' || new.codigo || ' va en camino.'
      when 'entregado' then 'Tu pedido ' || new.codigo || ' fue entregado. Gracias por pedir con Surtiba.'
      when 'cancelado' then 'Tu pedido ' || new.codigo || ' fue cancelado. Surtiba te escribirá con el detalle.'
    end, '/pedidos/' || new.id);
  end if;

  if new.pago_estado = 'pagado' and old.pago_estado is distinct from 'pagado' then
    perform privado.avisar_admins('El pedido ' || new.codigo || ' fue pagado.', '/admin/pedidos/' || new.id);
    if new.tipo = 'encargo' then
      for sp in select id, codigo, marca_id from public.subpedidos where pedido_id = new.id and estado not in ('rechazado', 'cancelado') loop
        perform privado.avisar_marca(sp.marca_id, 'Pagaron la orden ' || sp.codigo || '. Ya puedes prepararla.', '/marca/ordenes/' || sp.id);
      end loop;
    end if;
  end if;
  return new;
end $$;

-- Subpedido: a la marca cuando le llega una orden o un encargo; al admin cuando la marca responde
-- un encargo, no puede atender una orden o la deja lista para recojo
create or replace function privado.avisos_subpedido()
returns trigger language plpgsql security definer set search_path to '' as $$
declare
  v_marca text;
begin
  if tg_op = 'INSERT' then
    perform privado.avisar_marca(new.marca_id, case when new.estado = 'por_confirmar'
      then 'Nuevo encargo ' || new.codigo || ': dinos si puedes hacerlo y para cuándo.'
      else 'Nueva orden ' || new.codigo || ': prepárala para el recojo.' end,
      '/marca/ordenes/' || new.id);
    return new;
  end if;

  if new.estado is distinct from old.estado then
    select coalesce(nombre_comercial, 'Una marca') into v_marca from public.marcas where id = new.marca_id;
    v_marca := coalesce(v_marca, 'Una marca');
    if new.estado = 'pendiente' and old.estado = 'por_confirmar' then
      perform privado.avisar_admins(v_marca || ' aceptó el encargo ' || new.codigo || ' para el ' || coalesce(to_char(new.fecha_disponible, 'DD/MM'), 'la fecha que eligió') || '.', '/admin/pedidos/' || new.pedido_id);
    elsif new.estado = 'rechazado' then
      perform privado.avisar_admins(v_marca || ' no puede atender ' || new.codigo || '. Motivo: ' || left(coalesce(new.motivo_rechazo, ''), 120), '/admin/pedidos/' || new.pedido_id);
    elsif new.estado = 'listo_recojo' then
      perform privado.avisar_admins('La orden ' || new.codigo || ' de ' || v_marca || ' está lista para recojo.', '/admin/logistica');
    end if;
  end if;
  return new;
end $$;

create trigger pedidos_avisos after insert or update on public.pedidos
  for each row execute function privado.avisos_pedido();
create trigger subpedidos_avisos after insert or update on public.subpedidos
  for each row execute function privado.avisos_subpedido();

-- Nadie las llama directo (los triggers se disparan igual)
revoke execute on function privado.avisar(uuid, text, text), privado.avisar_marca(uuid, text, text),
  privado.avisar_admins(text, text), privado.avisos_pedido(), privado.avisos_subpedido() from public, anon, authenticated;

-- Avisos para lo que ya estaba pendiente antes de que existiera la campana (1 comprador, 3 marcas)
insert into public.avisos (perfil_id, texto, enlace)
select comprador_id, 'Tu pedido ' || codigo || ' está confirmado y en producción. Págalo para continuar.', '/pedidos/' || id
from public.pedidos where estado = 'por_pagar';

insert into public.avisos (perfil_id, texto, enlace)
select pf.id, 'Nuevo encargo ' || sp.codigo || ': dinos si puedes hacerlo y para cuándo.', '/marca/ordenes/' || sp.id
from public.subpedidos sp join public.perfiles pf on pf.marca_id = sp.marca_id and pf.rol = 'marca'
where sp.estado = 'por_confirmar';
