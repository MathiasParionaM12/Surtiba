-- Fase 6 · 18: guardar una cotización (COT-0001) al descargar el PDF.
-- La pantalla solo manda producto_id y cajas (o nada: entonces se usa el carrito).
-- Los precios los pone la base de datos según la escala, igual que en el carrito.

create function public.crear_cotizacion(p_items jsonb default null, p_evento jsonb default null)
returns table (cotizacion_id uuid, codigo text)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_uid uuid := (select auth.uid());
  v_items jsonb;
  v_total integer;
  v_id uuid;
  v_codigo text;
begin
  if v_uid is null or privado.mi_rol() is distinct from 'comprador' then
    raise exception 'Ingresa como comprador para descargar la cotización.';
  end if;
  if p_items is not null and (jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) > 50) then
    raise exception 'La cotización tiene datos que no entendemos. Vuelve a intentarlo.';
  end if;
  if p_evento is not null and length(p_evento::text) > 4000 then
    raise exception 'Los datos del evento son demasiado largos.';
  end if;

  with pedido as (
    -- Del cotizador (si viene la lista) o del carrito del comprador
    select (x->>'producto_id')::uuid as producto_id, (x->>'cajas')::integer as cajas
    from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) x
    where p_items is not null
    union all
    select c.producto_id, c.cajas from public.carrito c where p_items is null and c.comprador_id = v_uid
  ),
  sumado as (
    select producto_id, sum(cajas)::integer as cajas from pedido group by producto_id
  ),
  lineas as (
    select p.id, p.nombre, m.id as marca_id, m.nombre_comercial as marca, m.pedido_minimo_cajas, p.ml, p.unidades_por_caja, s.cajas,
      (select e.precio_caja_centimos from public.escalas_precio e
       where e.producto_id = p.id and s.cajas >= e.desde_cajas and (e.hasta_cajas is null or s.cajas <= e.hasta_cajas)) as precio
    from sumado s
    join public.productos p on p.id = s.producto_id
    join public.marcas m on m.id = p.marca_id
    where p.activo and m.activa and s.cajas between 1 and 999
  )
  select jsonb_agg(jsonb_build_object(
           'producto_id', l.id, 'producto', l.nombre, 'marca_id', l.marca_id, 'marca', l.marca,
           'pedido_minimo_cajas', l.pedido_minimo_cajas, 'ml', l.ml, 'unidades', l.unidades_por_caja,
           'cajas', l.cajas, 'precio_caja_centimos', l.precio, 'subtotal_centimos', l.cajas * l.precio)
         order by l.marca, l.nombre),
         sum(l.cajas * l.precio)::integer
  into v_items, v_total
  from lineas l
  where l.precio is not null;

  if v_items is null then raise exception 'No hay productos disponibles para cotizar.'; end if;

  insert into public.cotizaciones (comprador_id, evento, items, total_centimos)
  values (v_uid, p_evento, v_items, v_total)
  returning id, cotizaciones.codigo into v_id, v_codigo;

  return query select v_id, v_codigo;
end;
$$;
revoke all on function public.crear_cotizacion(jsonb, jsonb) from public, anon;
grant execute on function public.crear_cotizacion(jsonb, jsonb) to authenticated;

-- Cuando el comprador hace un pedido, su última cotización sin pedido (de los últimos 30 días)
-- queda marcada como "terminó en pedido". Sirve para la métrica del admin.
create function privado.vincular_cotizacion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.cotizaciones
  set pedido_id = new.id
  where id = (
    select c.id from public.cotizaciones c
    where c.comprador_id = new.comprador_id and c.pedido_id is null and c.creado_en > now() - interval '30 days'
    order by c.creado_en desc, c.codigo desc -- desempate si se crearon en el mismo instante
    limit 1
  );
  return new;
end;
$$;
revoke all on function privado.vincular_cotizacion() from public, anon, authenticated;

create trigger pedidos_vincular_cotizacion
  after insert on public.pedidos
  for each row execute function privado.vincular_cotizacion();
