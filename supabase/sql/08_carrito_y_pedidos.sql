-- Fase 3 · 08: carrito del comprador y creación de pedidos en una sola transacción.

-- ══ 1. Carrito (guardado en la cuenta del comprador) ═════════════════════
create table public.carrito (
  comprador_id uuid not null references public.perfiles(id) on delete cascade,
  producto_id uuid not null references public.productos(id) on delete cascade,
  cajas integer not null check (cajas between 1 and 999),
  agregado_en timestamptz not null default now(),
  primary key (comprador_id, producto_id)
);
create index carrito_producto_id_idx on public.carrito (producto_id);
alter table public.carrito enable row level security;

revoke all on public.carrito from anon;
revoke truncate, references, trigger on public.carrito from authenticated;

-- Cada comprador ve y cambia solo SU carrito, y solo con productos que puede ver
create policy "carrito: ver el propio"
  on public.carrito for select to authenticated
  using (comprador_id = (select auth.uid()) and (select privado.mi_rol()) = 'comprador');

create policy "carrito: agregar al propio"
  on public.carrito for insert to authenticated
  with check (
    comprador_id = (select auth.uid())
    and (select privado.mi_rol()) = 'comprador'
    and exists (select 1 from public.productos p where p.id = carrito.producto_id)
  );

create policy "carrito: cambiar el propio"
  on public.carrito for update to authenticated
  using (comprador_id = (select auth.uid()) and (select privado.mi_rol()) = 'comprador')
  with check (comprador_id = (select auth.uid()));

create policy "carrito: quitar del propio"
  on public.carrito for delete to authenticated
  using (comprador_id = (select auth.uid()) and (select privado.mi_rol()) = 'comprador');

-- ══ 2. Vista del carrito con el precio del tramo que corresponde ════════
-- El precio se calcula AQUÍ (en la base de datos), no en el navegador.
-- La misma vista la usa crear_pedido: una sola regla de precios para todo.
create view public.carrito_detalle
with (security_invoker = true)
as
select
  c.comprador_id,
  c.producto_id,
  c.cajas,
  p.nombre,
  p.categoria,
  p.ml,
  p.unidades_por_caja,
  p.stock_cajas,
  p.activo,
  p.marca_id,
  m.nombre_comercial as marca,
  m.pedido_minimo_cajas,
  m.activa as marca_activa,
  e.precio_caja_centimos,
  (c.cajas::bigint * e.precio_caja_centimos)::integer as subtotal_centimos
from public.carrito c
join public.productos p on p.id = c.producto_id
join public.marcas m on m.id = p.marca_id
left join public.escalas_precio e
  on e.producto_id = p.id
 and c.cajas >= e.desde_cajas
 and (e.hasta_cajas is null or c.cajas <= e.hasta_cajas);

revoke all on public.carrito_detalle from anon, authenticated;
grant select on public.carrito_detalle to authenticated;

-- ══ 3. Crear pedido (una sola transacción) ═════════════════════════════
-- El navegador solo manda los datos de entrega. Los productos y cajas salen del
-- carrito guardado y los precios de la escala. Si algo falla, no se guarda nada.
create function public.crear_pedido(
  p_fecha_entrega date,
  p_direccion text,
  p_nota text default null,
  p_evento_nombre text default null,
  p_evento_tipo text default null,
  p_evento_fecha date default null,
  p_invitados integer default null
)
returns table (pedido_id uuid, codigo text)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_uid uuid := (select auth.uid());
  v_hoy date := (now() at time zone 'America/Lima')::date;
  v_pedido uuid;
  v_codigo text;
  v_sub uuid;
  r record;
begin
  -- Quién pide
  if v_uid is null or privado.mi_rol() is distinct from 'comprador' then
    raise exception 'Solo los compradores con sesión pueden hacer pedidos.';
  end if;

  -- Datos de entrega
  if p_fecha_entrega is null or p_fecha_entrega < v_hoy + 1 then
    raise exception 'La fecha de entrega debe ser desde mañana.';
  end if;
  if nullif(btrim(p_direccion), '') is null then
    raise exception 'Escribe la dirección de entrega.';
  end if;
  if p_invitados is not null and p_invitados < 1 then
    raise exception 'El número de invitados debe ser mayor que 0.';
  end if;

  -- Bloquea las filas de los productos del carrito: si otra persona pide lo mismo
  -- al mismo tiempo, espera a que esta transacción termine (no se vende dos veces).
  perform 1
  from public.productos p
  where p.id in (select c.producto_id from public.carrito c where c.comprador_id = v_uid)
  order by p.id
  for update;

  if not exists (select 1 from public.carrito c where c.comprador_id = v_uid) then
    raise exception 'Tu carrito está vacío.';
  end if;

  -- Revisa cada producto: disponible, con stock y con precio
  for r in
    select * from public.carrito_detalle d where d.comprador_id = v_uid order by d.nombre
  loop
    if not r.activo or not r.marca_activa then
      raise exception '% ya no está disponible. Quítalo de tu carrito.', r.nombre;
    end if;
    if r.stock_cajas < r.cajas then
      if r.stock_cajas = 0 then
        raise exception '% se agotó. Quítalo de tu carrito.', r.nombre;
      end if;
      raise exception 'Solo quedan % cajas de %. Ajusta la cantidad en tu carrito.', r.stock_cajas, r.nombre;
    end if;
    if r.precio_caja_centimos is null then
      raise exception '% no tiene precio para % cajas. Escríbenos para revisarlo.', r.nombre, r.cajas;
    end if;
  end loop;

  -- Pedido mínimo por marca (suma de cajas de sus productos)
  for r in
    select d.marca, d.pedido_minimo_cajas, sum(d.cajas) as cajas
    from public.carrito_detalle d
    where d.comprador_id = v_uid
    group by d.marca, d.pedido_minimo_cajas
    having sum(d.cajas) < d.pedido_minimo_cajas
  loop
    raise exception 'Pedido mínimo de %: % cajas. Te faltan %.', r.marca, r.pedido_minimo_cajas, r.pedido_minimo_cajas - r.cajas;
  end loop;

  -- Crea el pedido
  insert into public.pedidos (comprador_id, fecha_entrega_deseada, direccion_entrega, nota,
                              evento_nombre, evento_tipo, evento_fecha, invitados)
  values (v_uid, p_fecha_entrega, btrim(p_direccion), nullif(btrim(p_nota), ''),
          nullif(btrim(p_evento_nombre), ''), nullif(btrim(p_evento_tipo), ''), p_evento_fecha, p_invitados)
  returning id, pedidos.codigo into v_pedido, v_codigo;

  -- Un subpedido por marca, con sus ítems (precio copiado) y su % de comisión vigente
  for r in
    select distinct d.marca_id from public.carrito_detalle d where d.comprador_id = v_uid
  loop
    insert into public.subpedidos (pedido_id, marca_id, codigo, comision_pct_aplicada)
    select v_pedido, r.marca_id, v_codigo, mp.comision_pct
    from public.marcas_privado mp
    where mp.marca_id = r.marca_id
    returning id into v_sub;

    insert into public.items (subpedido_id, producto_id, cajas, precio_caja_centimos, subtotal_centimos)
    select v_sub, d.producto_id, d.cajas, d.precio_caja_centimos, d.subtotal_centimos
    from public.carrito_detalle d
    where d.comprador_id = v_uid and d.marca_id = r.marca_id;

    update public.subpedidos s
    set total_cajas = t.cajas, total_centimos = t.total
    from (select sum(i.cajas) as cajas, sum(i.subtotal_centimos) as total
          from public.items i where i.subpedido_id = v_sub) t
    where s.id = v_sub;
  end loop;

  -- Totales del pedido (envío en 0 por ahora: decisión pendiente)
  update public.pedidos pe
  set subtotal_centimos = t.total, total_centimos = t.total + pe.envio_centimos
  from (select sum(s.total_centimos) as total from public.subpedidos s where s.pedido_id = v_pedido) t
  where pe.id = v_pedido;

  -- Reserva el stock
  update public.productos p
  set stock_cajas = p.stock_cajas - c.cajas
  from public.carrito c
  where c.comprador_id = v_uid and c.producto_id = p.id;

  -- Vacía el carrito
  delete from public.carrito c where c.comprador_id = v_uid;

  return query select v_pedido, v_codigo;
end;
$$;

revoke all on function public.crear_pedido(date, text, text, text, text, date, integer) from public, anon;
grant execute on function public.crear_pedido(date, text, text, text, text, date, integer) to authenticated;
