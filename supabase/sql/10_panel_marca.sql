-- Fase 4 · 10: acciones de la marca (listo / rechazar), guardar productos con su escala y fotos.
-- La marca no puede editar subpedidos ni pedidos directamente: lo hace por estas funciones,
-- que revisan que la orden sea suya y que el cambio de estado sea válido.

-- ══ Ayuda interna: recalcular el total de un pedido ═════════════════════
-- Suma solo los subpedidos vigentes. Si ya no queda ninguno, el pedido pasa a "cancelado".
create function privado.recalcular_pedido(p_pedido uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_subtotal integer;
  v_vigentes integer;
begin
  select coalesce(sum(s.total_centimos), 0), count(*)
  into v_subtotal, v_vigentes
  from public.subpedidos s
  where s.pedido_id = p_pedido and s.estado not in ('rechazado', 'cancelado');

  update public.pedidos pe
  set subtotal_centimos = v_subtotal,
      total_centimos = v_subtotal + pe.envio_centimos,
      estado = case when v_vigentes = 0 then 'cancelado' else pe.estado end
  where pe.id = p_pedido;
end;
$$;
revoke all on function privado.recalcular_pedido(uuid) from public, anon, authenticated;

-- ══ La marca marca su orden como "Listo para recojo" ════════════════════
create function public.marcar_listo(p_subpedido uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  s record;
begin
  select * into s from public.subpedidos where id = p_subpedido for update;
  if s is null or s.marca_id is distinct from privado.mi_marca_id() then
    raise exception 'No encontramos esa orden en tu marca.';
  end if;
  if s.estado <> 'pendiente' then
    raise exception 'Solo puedes marcar como lista una orden pendiente.';
  end if;

  update public.subpedidos set estado = 'listo_recojo', listo_en = now() where id = p_subpedido;

  -- Regla: el pedido pasa a "en preparación" cuando al menos una marca está lista
  update public.pedidos set estado = 'en_preparacion' where id = s.pedido_id and estado = 'recibido';
end;
$$;
revoke all on function public.marcar_listo(uuid) from public, anon;
grant execute on function public.marcar_listo(uuid) to authenticated;

-- ══ La marca no puede atender su orden ("No puedo atenderla") ═══════════
create function public.rechazar_subpedido(p_subpedido uuid, p_motivo text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  s record;
begin
  select * into s from public.subpedidos where id = p_subpedido for update;
  if s is null or s.marca_id is distinct from privado.mi_marca_id() then
    raise exception 'No encontramos esa orden en tu marca.';
  end if;
  if s.estado <> 'pendiente' then
    raise exception 'Solo puedes rechazar una orden pendiente. Si ya la marcaste como lista, escríbele a Surtiba.';
  end if;
  if length(btrim(coalesce(p_motivo, ''))) < 5 then
    raise exception 'Escribe el motivo (al menos 5 letras) para que Surtiba pueda avisarle al cliente.';
  end if;

  update public.subpedidos set estado = 'rechazado', motivo_rechazo = btrim(p_motivo) where id = p_subpedido;

  -- El stock reservado vuelve a la marca
  update public.productos p
  set stock_cajas = p.stock_cajas + i.cajas
  from public.items i
  where i.subpedido_id = p_subpedido and i.producto_id = p.id;

  -- El total del pedido se recalcula (y si no queda ninguna marca, se cancela)
  perform privado.recalcular_pedido(s.pedido_id);
end;
$$;
revoke all on function public.rechazar_subpedido(uuid, text) from public, anon;
grant execute on function public.rechazar_subpedido(uuid, text) to authenticated;

-- ══ Crear o editar un producto con su escala de precios ═════════════════
-- p_tramos: [{"desde": 1, "precio": 42000}, {"desde": 5, "precio": 40000}, ...]
-- El "hasta" de cada tramo se calcula solo: así nunca hay huecos ni superposiciones,
-- y el último tramo siempre es "N o más cajas".
create function public.guardar_producto(
  p_id uuid,                -- null = producto nuevo
  p_nombre text,
  p_categoria text,
  p_ml integer,
  p_grado numeric,
  p_unidades integer,
  p_registro text,
  p_stock integer,
  p_activo boolean,
  p_tramos jsonb,
  p_marca_id uuid default null  -- solo el admin lo usa; la marca siempre guarda en la suya
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_marca uuid;
  v_id uuid := p_id;
  v_desde_anterior integer := 0;
  t record;
begin
  -- ¿De qué marca es y quién puede guardarlo?
  if privado.es_admin() then
    v_marca := coalesce(p_marca_id, (select marca_id from public.productos where id = p_id));
  else
    v_marca := privado.mi_marca_id();
    if v_marca is null then
      raise exception 'Solo una marca o el admin pueden guardar productos.';
    end if;
  end if;
  if v_marca is null then
    raise exception 'Elige la marca del producto.';
  end if;
  if p_id is not null and not exists (select 1 from public.productos where id = p_id and marca_id = v_marca) then
    raise exception 'No encontramos ese producto en tu marca.';
  end if;

  -- Datos del producto
  if nullif(btrim(p_nombre), '') is null then raise exception 'Escribe el nombre del producto.'; end if;
  if p_categoria not in ('pisco', 'ron', 'gin', 'vodka', 'vino', 'licor', 'coctel_listo', 'otro') then
    raise exception 'Elige una categoría.';
  end if;
  if p_ml is null or p_ml < 1 then raise exception 'Los ml por botella deben ser mayores que 0.'; end if;
  if p_grado is null or p_grado < 0 or p_grado > 100 then raise exception 'El grado debe estar entre 0 y 100.'; end if;
  if p_unidades is null or p_unidades < 1 then raise exception 'Las unidades por caja deben ser al menos 1.'; end if;
  if p_id is null and (p_stock is null or p_stock < 0) then raise exception 'El stock no puede ser negativo.'; end if;

  -- Tramos: el primero desde 1, cada uno más grande que el anterior, precio mayor que 0
  if jsonb_typeof(p_tramos) <> 'array' or jsonb_array_length(p_tramos) = 0 then
    raise exception 'Agrega al menos un precio (desde 1 caja).';
  end if;
  if jsonb_array_length(p_tramos) > 10 then raise exception 'Máximo 10 tramos de precio.'; end if;
  for t in select (e->>'desde')::integer as desde, (e->>'precio')::integer as precio
           from jsonb_array_elements(p_tramos) e
  loop
    if v_desde_anterior = 0 and t.desde <> 1 then
      raise exception 'El primer tramo debe empezar en 1 caja.';
    end if;
    if t.desde <= v_desde_anterior then
      raise exception 'Cada tramo debe empezar en más cajas que el anterior (revisa el tramo "desde %").', t.desde;
    end if;
    if t.precio is null or t.precio < 1 then
      raise exception 'Cada tramo necesita un precio mayor que 0.';
    end if;
    v_desde_anterior := t.desde;
  end loop;

  -- Guardar producto
  if v_id is null then
    insert into public.productos (marca_id, nombre, categoria, ml, grado, unidades_por_caja, registro_sanitario, stock_cajas, activo)
    values (v_marca, btrim(p_nombre), p_categoria, p_ml, p_grado, p_unidades, nullif(btrim(p_registro), ''), p_stock, coalesce(p_activo, true))
    returning id into v_id;
  else
    -- Al editar NO se toca el stock: se cambia en la pantalla de Stock (así no se pisa una reserva reciente)
    update public.productos
    set nombre = btrim(p_nombre), categoria = p_categoria, ml = p_ml, grado = p_grado, unidades_por_caja = p_unidades,
        registro_sanitario = nullif(btrim(p_registro), ''), activo = coalesce(p_activo, true)
    where id = v_id;
  end if;

  -- Reemplazar la escala completa (los pedidos ya hechos no cambian: copiaron su precio)
  delete from public.escalas_precio where producto_id = v_id;
  insert into public.escalas_precio (producto_id, desde_cajas, hasta_cajas, precio_caja_centimos)
  select v_id,
         (e->>'desde')::integer,
         (lead((e->>'desde')::integer) over (order by (e->>'desde')::integer)) - 1,
         (e->>'precio')::integer
  from jsonb_array_elements(p_tramos) e;

  return v_id;
end;
$$;
revoke all on function public.guardar_producto(uuid, text, text, integer, numeric, integer, text, integer, boolean, jsonb, uuid) from public, anon;
grant execute on function public.guardar_producto(uuid, text, text, integer, numeric, integer, text, integer, boolean, jsonb, uuid) to authenticated;

-- ══ Fotos de productos (Supabase Storage) ═══════════════════════════════
-- Carpeta pública "productos". Cada marca sube solo dentro de su carpeta: productos/<marca_id>/...
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('productos', 'productos', true, 2097152, array['image/jpeg', 'image/png', 'image/webp']);

create policy "fotos: la marca sube en su carpeta (admin en todas)"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'productos'
    and ((storage.foldername(name))[1] = (select privado.mi_marca_id())::text or (select privado.es_admin()))
  );

create policy "fotos: la marca cambia las de su carpeta (admin todas)"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'productos'
    and ((storage.foldername(name))[1] = (select privado.mi_marca_id())::text or (select privado.es_admin()))
  );

create policy "fotos: la marca borra las de su carpeta (admin todas)"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'productos'
    and ((storage.foldername(name))[1] = (select privado.mi_marca_id())::text or (select privado.es_admin()))
  );
