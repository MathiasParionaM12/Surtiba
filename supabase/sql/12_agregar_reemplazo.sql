-- Fase 4 · 12: el comprador agrega un reemplazo AL MISMO pedido cuando una marca no pudo atender.
-- Una sola transacción: revisa el pedido, bloquea el stock, aplica la escala, crea o completa
-- el subpedido de la marca nueva y recalcula el total.

create or replace function public.agregar_reemplazo(p_pedido uuid, p_producto uuid, p_cajas integer)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  pe record;
  pr record;
  s record;
  v_sub uuid;
  v_cajas_item integer;
  v_precio integer;
begin
  -- El pedido debe ser del comprador y seguir abierto
  select * into pe from public.pedidos where id = p_pedido for update;
  if not found or pe.comprador_id is distinct from v_uid or privado.mi_rol() is distinct from 'comprador' then
    raise exception 'No encontramos ese pedido.';
  end if;
  if pe.estado not in ('recibido', 'en_preparacion') then
    raise exception 'Este pedido ya no se puede cambiar. Agrega el producto a un pedido nuevo.';
  end if;
  if not exists (select 1 from public.subpedidos where pedido_id = p_pedido and estado in ('rechazado', 'cancelado')) then
    raise exception 'Solo puedes agregar reemplazos cuando una marca no pudo atender tu pedido.';
  end if;
  if p_cajas is null or p_cajas < 1 or p_cajas > 999 then
    raise exception 'Elige entre 1 y 999 cajas.';
  end if;

  -- El producto: disponible y con stock (fila bloqueada para que nadie más lo venda mientras tanto)
  select p.*, m.activa as marca_activa, m.nombre_comercial as marca, m.pedido_minimo_cajas
  into pr
  from public.productos p join public.marcas m on m.id = p.marca_id
  where p.id = p_producto
  for update of p;
  if not found or not pr.activo or not pr.marca_activa then
    raise exception 'Ese producto ya no está disponible.';
  end if;
  if pr.stock_cajas < p_cajas then
    raise exception 'Solo quedan % cajas de %.', pr.stock_cajas, pr.nombre;
  end if;

  -- ¿La marca ya tiene parte en este pedido?
  select * into s from public.subpedidos where pedido_id = p_pedido and marca_id = pr.marca_id for update;
  -- "found" = se encontró la fila (ojo: "s is not null" exige que TODAS sus columnas tengan valor)
  if found then
    if s.estado in ('rechazado', 'cancelado') then
      raise exception '% no pudo atender este pedido. Elige una opción de otra marca.', pr.marca;
    end if;
    if s.estado <> 'pendiente' then
      raise exception '% ya preparó su parte de este pedido. Agrega este producto a un pedido nuevo.', pr.marca;
    end if;
    v_sub := s.id;
  else
    -- Marca nueva en el pedido: debe cumplir su pedido mínimo
    if p_cajas < pr.pedido_minimo_cajas then
      raise exception 'Pedido mínimo de %: % cajas. Elige al menos % cajas.', pr.marca, pr.pedido_minimo_cajas, pr.pedido_minimo_cajas;
    end if;
    insert into public.subpedidos (pedido_id, marca_id, codigo, comision_pct_aplicada)
    select p_pedido, pr.marca_id, pe.codigo, mp.comision_pct
    from public.marcas_privado mp where mp.marca_id = pr.marca_id
    returning id into v_sub;
  end if;

  -- Cajas totales de este producto en la parte de la marca, y su precio según la escala
  v_cajas_item := p_cajas + coalesce((select cajas from public.items where subpedido_id = v_sub and producto_id = p_producto), 0);
  select e.precio_caja_centimos into v_precio
  from public.escalas_precio e
  where e.producto_id = p_producto and v_cajas_item >= e.desde_cajas and (e.hasta_cajas is null or v_cajas_item <= e.hasta_cajas);
  if v_precio is null then
    raise exception '% no tiene precio para % cajas.', pr.nombre, v_cajas_item;
  end if;

  insert into public.items (subpedido_id, producto_id, cajas, precio_caja_centimos, subtotal_centimos)
  values (v_sub, p_producto, v_cajas_item, v_precio, v_cajas_item * v_precio)
  on conflict (subpedido_id, producto_id)
  do update set cajas = excluded.cajas, precio_caja_centimos = excluded.precio_caja_centimos, subtotal_centimos = excluded.subtotal_centimos;

  -- Totales de la parte de la marca y del pedido; reserva del stock
  update public.subpedidos sp
  set total_cajas = t.cajas, total_centimos = t.total
  from (select sum(i.cajas) as cajas, sum(i.subtotal_centimos) as total from public.items i where i.subpedido_id = v_sub) t
  where sp.id = v_sub;

  update public.productos set stock_cajas = stock_cajas - p_cajas where id = p_producto;

  perform privado.recalcular_pedido(p_pedido);

  return pe.codigo;
end;
$$;

revoke all on function public.agregar_reemplazo(uuid, uuid, integer) from public, anon;
grant execute on function public.agregar_reemplazo(uuid, uuid, integer) to authenticated;
