-- Fase 3 (mejora) · 09: datos completos de entrega en el pedido.
-- Quién recibe, su celular y la dirección por partes. La marca nunca los ve (no lee pedidos).

alter table public.pedidos
  add column direccion_detalle text,   -- dpto, oficina, interior
  add column distrito text,            -- distrito de Lima o Callao
  add column codigo_postal text check (codigo_postal ~ '^\d{5}$'),
  add column referencia text,
  add column recibe_nombre text,
  add column recibe_telefono text;     -- formato internacional: +51987654321

-- crear_pedido ahora recibe los datos nuevos (se reemplaza la versión anterior)
drop function public.crear_pedido(date, text, text, text, text, date, integer);

create function public.crear_pedido(
  p_fecha_entrega date,
  p_direccion text,
  p_distrito text,
  p_recibe_nombre text,
  p_recibe_telefono text,
  p_direccion_detalle text default null,
  p_codigo_postal text default null,
  p_referencia text default null,
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
  if v_uid is null or privado.mi_rol() is distinct from 'comprador' then
    raise exception 'Solo los compradores con sesión pueden hacer pedidos.';
  end if;

  -- Datos de entrega
  if p_fecha_entrega is null or p_fecha_entrega < v_hoy + 1 then
    raise exception 'La fecha de entrega debe ser desde mañana.';
  end if;
  if nullif(btrim(p_direccion), '') is null then
    raise exception 'Escribe la calle y el número de la dirección de entrega.';
  end if;
  if nullif(btrim(p_distrito), '') is null then
    raise exception 'Elige el distrito de entrega.';
  end if;
  if nullif(btrim(p_recibe_nombre), '') is null then
    raise exception 'Escribe el nombre de quien recibe el pedido.';
  end if;
  if p_recibe_telefono is null or p_recibe_telefono !~ '^\+\d{7,15}$' then
    raise exception 'Escribe el celular de quien recibe el pedido.';
  end if;
  if nullif(btrim(p_codigo_postal), '') is not null and btrim(p_codigo_postal) !~ '^\d{5}$' then
    raise exception 'El código postal tiene 5 dígitos. Si no lo sabes, déjalo vacío.';
  end if;
  if p_invitados is not null and p_invitados < 1 then
    raise exception 'El número de invitados debe ser mayor que 0.';
  end if;

  -- Bloquea las filas de los productos del carrito (nadie más puede venderlas mientras tanto)
  perform 1
  from public.productos p
  where p.id in (select c.producto_id from public.carrito c where c.comprador_id = v_uid)
  order by p.id
  for update;

  if not exists (select 1 from public.carrito c where c.comprador_id = v_uid) then
    raise exception 'Tu carrito está vacío.';
  end if;

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

  for r in
    select d.marca, d.pedido_minimo_cajas, sum(d.cajas) as cajas
    from public.carrito_detalle d
    where d.comprador_id = v_uid
    group by d.marca, d.pedido_minimo_cajas
    having sum(d.cajas) < d.pedido_minimo_cajas
  loop
    raise exception 'Pedido mínimo de %: % cajas. Te faltan %.', r.marca, r.pedido_minimo_cajas, r.pedido_minimo_cajas - r.cajas;
  end loop;

  insert into public.pedidos (
    comprador_id, fecha_entrega_deseada, direccion_entrega, direccion_detalle, distrito, codigo_postal,
    referencia, recibe_nombre, recibe_telefono, nota, evento_nombre, evento_tipo, evento_fecha, invitados)
  values (
    v_uid, p_fecha_entrega, btrim(p_direccion), nullif(btrim(p_direccion_detalle), ''), btrim(p_distrito),
    nullif(btrim(p_codigo_postal), ''), nullif(btrim(p_referencia), ''), btrim(p_recibe_nombre), p_recibe_telefono,
    nullif(btrim(p_nota), ''), nullif(btrim(p_evento_nombre), ''), nullif(btrim(p_evento_tipo), ''), p_evento_fecha, p_invitados)
  returning id, pedidos.codigo into v_pedido, v_codigo;

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

  update public.pedidos pe
  set subtotal_centimos = t.total, total_centimos = t.total + pe.envio_centimos
  from (select sum(s.total_centimos) as total from public.subpedidos s where s.pedido_id = v_pedido) t
  where pe.id = v_pedido;

  update public.productos p
  set stock_cajas = p.stock_cajas - c.cajas
  from public.carrito c
  where c.comprador_id = v_uid and c.producto_id = p.id;

  delete from public.carrito c where c.comprador_id = v_uid;

  return query select v_pedido, v_codigo;
end;
$$;

revoke all on function public.crear_pedido(date, text, text, text, text, text, text, text, text, text, text, date, integer) from public, anon;
grant execute on function public.crear_pedido(date, text, text, text, text, text, text, text, text, text, text, date, integer) to authenticated;
