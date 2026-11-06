-- 6-nov-2026 · Entregas solo martes y jueves (Mathias). Ya aplicada en Supabase.
-- · El comprador ya no elige la fecha: pone la fecha de su evento (opcional) y Surtiba le asigna
--   la ÚLTIMA entrega antes del evento; sin evento, o si marca "lo antes posible", la MÁS CERCANA.
-- · Hay que pedir con 2 días de anticipación (jueves → hasta el martes; martes → hasta el domingo).
-- · El recojo en cada marca es la víspera de la entrega: se calcula solo (ya no se pone a mano).
-- · Encargos: la entrega es la primera después de que todas sus marcas lo tengan listo; se recalcula
--   cuando las marcas confirman y cuando el comprador paga.
-- · Logística: "Recogí todo de esta marca" (un clic por marca) y el pedido pasa solo a "en camino".

-- ══ 1. Días de entrega y anticipación (el admin los cambia en Logística) ═══
create table public.entregas_config (
  id boolean primary key default true check (id),
  dias smallint[] not null default '{2,4}' check (array_length(dias, 1) between 1 and 7 and dias <@ '{1,2,3,4,5,6,7}'),
  corte_dias integer not null default 2 check (corte_dias between 1 and 7)
);
insert into public.entregas_config default values;
alter table public.entregas_config enable row level security;
create policy "entregas_config: la ve cualquiera" on public.entregas_config for select to anon, authenticated using (true);
revoke all on public.entregas_config from anon, authenticated;
grant select on public.entregas_config to anon, authenticated;

create or replace function public.admin_guardar_entregas(p_dias smallint[], p_corte integer)
returns void language plpgsql security definer set search_path to '' as $$
begin
  if not privado.es_admin() then raise exception 'Solo el equipo Surtiba cambia los días de entrega.'; end if;
  if p_dias is null or array_length(p_dias, 1) is null then raise exception 'Elige al menos un día de entrega.'; end if;
  if not (p_dias <@ '{1,2,3,4,5,6,7}'::smallint[]) then raise exception 'Día de entrega no válido.'; end if;
  if p_corte is null or p_corte < 1 or p_corte > 7 then raise exception 'La anticipación debe ser de 1 a 7 días.'; end if;
  update public.entregas_config set dias = (select array_agg(distinct d order by d) from unnest(p_dias) d), corte_dias = p_corte;
end $$;
revoke execute on function public.admin_guardar_entregas(smallint[], integer) from public, anon;
grant execute on function public.admin_guardar_entregas(smallint[], integer) to authenticated;

-- ══ 2. La regla de la fecha ═══
-- p_minimo: la primera fecha posible (hoy + anticipación; en un encargo, además, el día después de que esté listo).
-- Devuelve null si no se llega antes del evento (salvo con "lo antes posible").
create or replace function privado.entrega_asignada(p_minimo date, p_evento date, p_lo_antes boolean)
returns date language plpgsql stable set search_path to '' as $$
declare
  v_dias smallint[] := (select dias from public.entregas_config);
  d date := p_minimo;
  v_primera date;
  i integer;
begin
  for i in 0 .. 13 loop
    if extract(isodow from d)::smallint = any(v_dias) then v_primera := d; exit; end if;
    d := d + 1;
  end loop;
  if v_primera is null then raise exception 'No hay días de entrega configurados.'; end if;
  if p_evento is null or coalesce(p_lo_antes, false) then return v_primera; end if;
  if v_primera >= p_evento then return null; end if;
  -- La última entrega antes del evento
  d := p_evento - 1;
  while d > v_primera loop
    if extract(isodow from d)::smallint = any(v_dias) then return d; end if;
    d := d - 1;
  end loop;
  return v_primera;
end $$;

-- Hoy en Lima + la anticipación
create or replace function privado.primer_dia_posible()
returns date language sql stable set search_path to '' as $$
  select (now() at time zone 'America/Lima')::date + (select corte_dias from public.entregas_config);
$$;

alter table public.pedidos add column lo_antes boolean not null default false;

-- ══ 3. crear_pedido sin fecha elegida (ni nombre, tipo e invitados del evento, ni "todo junto") ═══
drop function public.crear_pedido(date, text, text, text, text, text, text, text, text, text, text, text, date, integer, text);

create function public.crear_pedido(
  p_direccion text, p_distrito text, p_recibe_nombre text, p_recibe_telefono text,
  p_metodo_pago text default null, p_direccion_detalle text default null, p_codigo_postal text default null,
  p_referencia text default null, p_nota text default null, p_evento_fecha date default null, p_lo_antes boolean default false
) returns table(pedido_id uuid, codigo text, tipo text)
language plpgsql security definer set search_path to '' as $$
#variable_conflict use_column
declare
  v_uid uuid := (select auth.uid());
  v_hoy date := (now() at time zone 'America/Lima')::date;
  v_entrega date;
  v_directo uuid;
  v_cod_directo text;
  v_encargo uuid;
  v_cod_encargo text;
  v_sub uuid;
  v_hay_directo boolean;
  v_hay_encargo boolean;
  v_envio integer;
  r record;
begin
  if v_uid is null or privado.mi_rol() is distinct from 'comprador' then
    raise exception 'Solo los compradores con sesión pueden hacer pedidos.';
  end if;

  if nullif(btrim(p_direccion), '') is null then raise exception 'Escribe la calle y el número de la dirección de entrega.'; end if;
  if nullif(btrim(p_distrito), '') is null then raise exception 'Elige el distrito de entrega.'; end if;
  if nullif(btrim(p_recibe_nombre), '') is null then raise exception 'Escribe el nombre de quien recibe el pedido.'; end if;
  if p_recibe_telefono is null or p_recibe_telefono !~ '^\+\d{7,15}$' then raise exception 'Escribe el celular de quien recibe el pedido.'; end if;
  if nullif(btrim(p_codigo_postal), '') is not null and btrim(p_codigo_postal) !~ '^\d{5}$' then
    raise exception 'El código postal tiene 5 dígitos. Si no lo sabes, déjalo vacío.';
  end if;
  if p_evento_fecha is not null and (p_evento_fecha <= v_hoy or p_evento_fecha > v_hoy + 366) then
    raise exception 'La fecha del evento debe ser desde mañana y hasta dentro de un año.';
  end if;

  -- La entrega: la última antes del evento, o la más cercana
  v_entrega := privado.entrega_asignada(privado.primer_dia_posible(), p_evento_fecha, p_lo_antes);
  if v_entrega is null then
    raise exception 'Ya no llegamos antes de tu evento del %: la primera entrega posible es el %. Marca «Lo quiero lo antes posible» si igual te sirve.',
      to_char(p_evento_fecha, 'DD/MM'), to_char(privado.entrega_asignada(privado.primer_dia_posible(), null, true), 'DD/MM');
  end if;

  perform 1 from public.productos p
  where p.id in (select c.producto_id from public.carrito c where c.comprador_id = v_uid)
  order by p.id for update;

  if not exists (select 1 from public.carrito c where c.comprador_id = v_uid) then raise exception 'Tu carrito está vacío.'; end if;

  for r in select * from public.carrito_detalle d where d.comprador_id = v_uid order by d.nombre loop
    if not r.activo or not r.marca_activa then raise exception '% ya no está disponible. Quítalo de tu carrito.', r.nombre; end if;
    if r.precio_caja_centimos is null then raise exception '% no tiene precio para % cajas. Escríbenos para revisarlo.', r.nombre, r.cajas; end if;
  end loop;

  -- Lo que pasa del stock tiene que estar decidido en el carrito (encargo, cambio o solo lo que hay)
  for r in select * from public.carrito_detalle d where d.comprador_id = v_uid and d.cajas > d.stock_cajas and not d.encargo loop
    raise exception 'De % hay % cajas en stock. En tu carrito, elige qué hacer con las que faltan.', r.nombre, greatest(r.stock_cajas, 0);
  end loop;

  -- Pedido mínimo: 3 cajas en total, sumando todas las marcas
  if (select coalesce(sum(c.cajas), 0) from public.carrito c where c.comprador_id = v_uid) < 3 then
    raise exception 'El pedido mínimo es de 3 cajas en total. Agrega más cajas a tu carrito.';
  end if;

  v_hay_directo := exists (select 1 from public.carrito_detalle d where d.comprador_id = v_uid and d.stock_cajas > 0);
  v_hay_encargo := exists (select 1 from public.carrito_detalle d where d.comprador_id = v_uid and d.cajas > d.stock_cajas);

  -- Envío fijo por zona: uno solo por compra (en la directa si hay; si no, en el encargo)
  select z.monto_centimos into v_envio from public.distritos_envio de
  join public.zonas_envio z on z.zona = de.zona where de.distrito = btrim(p_distrito);
  if v_envio is null then raise exception 'Por ahora no entregamos en ese distrito.'; end if;

  if v_hay_directo and coalesce(p_metodo_pago, '') not in ('yape', 'plin', 'transferencia', 'tarjeta') then
    raise exception 'Elige cómo vas a pagar.';
  end if;

  -- Encargo: lo que falta de stock. Su entrega es una estimación: se recalcula cuando las marcas confirman y al pagar.
  if v_hay_encargo then
    insert into public.pedidos (tipo, estado, comprador_id, fecha_entrega_deseada, direccion_entrega, direccion_detalle, distrito,
      codigo_postal, referencia, recibe_nombre, recibe_telefono, nota, evento_fecha, lo_antes, envio_centimos)
    values ('encargo', 'por_confirmar', v_uid, v_entrega, btrim(p_direccion), nullif(btrim(p_direccion_detalle), ''), btrim(p_distrito),
      nullif(btrim(p_codigo_postal), ''), nullif(btrim(p_referencia), ''), btrim(p_recibe_nombre), p_recibe_telefono,
      nullif(btrim(p_nota), ''), p_evento_fecha, coalesce(p_lo_antes, false), case when v_hay_directo then 0 else v_envio end)
    returning id, pedidos.codigo into v_encargo, v_cod_encargo;

    for r in select distinct d.marca_id from public.carrito_detalle d where d.comprador_id = v_uid and d.cajas > d.stock_cajas loop
      insert into public.subpedidos (pedido_id, marca_id, codigo, estado, comision_pct_aplicada, fecha_recojo)
      select v_encargo, r.marca_id, v_cod_encargo, 'por_confirmar', mp.comision_pct, v_entrega - 1
      from public.marcas_privado mp where mp.marca_id = r.marca_id
      returning id into v_sub;

      insert into public.items (subpedido_id, producto_id, cajas, cajas_reservadas, precio_caja_centimos, subtotal_centimos)
      select v_sub, d.producto_id, d.cajas - greatest(d.stock_cajas, 0), 0, d.precio_caja_centimos, (d.cajas - greatest(d.stock_cajas, 0)) * d.precio_caja_centimos
      from public.carrito_detalle d
      where d.comprador_id = v_uid and d.marca_id = r.marca_id and d.cajas > d.stock_cajas;

      update public.subpedidos sp set total_cajas = t.cajas, total_centimos = t.total
      from (select sum(i.cajas) as cajas, sum(i.subtotal_centimos) as total from public.items i where i.subpedido_id = v_sub) t
      where sp.id = v_sub;
    end loop;
    perform privado.recalcular_pedido(v_encargo);
  end if;

  -- Compra directa: lo que tiene stock. Se paga ahora (simulado) y se aparta el stock.
  if v_hay_directo then
    insert into public.pedidos (tipo, estado, comprador_id, fecha_entrega_deseada, direccion_entrega, direccion_detalle, distrito,
      codigo_postal, referencia, recibe_nombre, recibe_telefono, nota, evento_fecha, lo_antes, envio_centimos)
    values ('directo', 'recibido', v_uid, v_entrega, btrim(p_direccion), nullif(btrim(p_direccion_detalle), ''), btrim(p_distrito),
      nullif(btrim(p_codigo_postal), ''), nullif(btrim(p_referencia), ''), btrim(p_recibe_nombre), p_recibe_telefono,
      nullif(btrim(p_nota), ''), p_evento_fecha, coalesce(p_lo_antes, false), v_envio)
    returning id, pedidos.codigo into v_directo, v_cod_directo;

    for r in select distinct d.marca_id from public.carrito_detalle d where d.comprador_id = v_uid and d.stock_cajas > 0 loop
      insert into public.subpedidos (pedido_id, marca_id, codigo, comision_pct_aplicada, fecha_recojo)
      select v_directo, r.marca_id, v_cod_directo, mp.comision_pct, v_entrega - 1
      from public.marcas_privado mp where mp.marca_id = r.marca_id
      returning id into v_sub;

      insert into public.items (subpedido_id, producto_id, cajas, cajas_reservadas, precio_caja_centimos, subtotal_centimos)
      select v_sub, d.producto_id, least(d.cajas, d.stock_cajas), least(d.cajas, d.stock_cajas), d.precio_caja_centimos,
             least(d.cajas, d.stock_cajas) * d.precio_caja_centimos
      from public.carrito_detalle d
      where d.comprador_id = v_uid and d.marca_id = r.marca_id and d.stock_cajas > 0;

      update public.subpedidos sp set total_cajas = t.cajas, total_centimos = t.total
      from (select sum(i.cajas) as cajas, sum(i.subtotal_centimos) as total from public.items i where i.subpedido_id = v_sub) t
      where sp.id = v_sub;
    end loop;

    update public.pedidos pe
    set subtotal_centimos = t.total, total_centimos = t.total + pe.envio_centimos,
        pagado_centimos = t.total + pe.envio_centimos, pago_estado = 'pagado', pago_metodo = p_metodo_pago, pagado_en = now()
    from (select sum(s.total_centimos) as total from public.subpedidos s where s.pedido_id = v_directo) t
    where pe.id = v_directo;

    update public.productos p
    set stock_cajas = p.stock_cajas - least(c.cajas, p.stock_cajas)
    from public.carrito c
    where c.comprador_id = v_uid and c.producto_id = p.id;
  end if;

  delete from public.carrito c where c.comprador_id = v_uid;

  if v_directo is not null then return query select v_directo, v_cod_directo, 'directo'::text; end if;
  if v_encargo is not null then return query select v_encargo, v_cod_encargo, 'encargo'::text; end if;
end $$;
revoke execute on function public.crear_pedido(text, text, text, text, text, text, text, text, text, date, boolean) from public, anon;
grant execute on function public.crear_pedido(text, text, text, text, text, text, text, text, text, date, boolean) to authenticated;

-- ══ 4. Encargos: la entrega se recalcula cuando las marcas confirman y cuando el comprador paga ═══
create or replace function privado.entrega_de_encargo()
returns trigger language plpgsql security definer set search_path to '' as $$
declare
  v_minimo date;
  v_fecha date;
begin
  if new.tipo = 'encargo'
     and ((old.estado = 'por_confirmar' and new.estado = 'por_pagar') or (old.estado = 'por_pagar' and new.estado = 'recibido')) then
    -- El día después de que la última marca lo tenga listo (el recojo es la víspera de la entrega)
    v_minimo := greatest(privado.primer_dia_posible(),
      coalesce((select max(s.fecha_disponible) + 1 from public.subpedidos s
                where s.pedido_id = new.id and s.estado not in ('rechazado', 'cancelado')), privado.primer_dia_posible()));
    v_fecha := coalesce(privado.entrega_asignada(v_minimo, new.evento_fecha, new.lo_antes),
                        privado.entrega_asignada(v_minimo, null, true));
    new.fecha_entrega_deseada := v_fecha;
    update public.subpedidos set fecha_recojo = v_fecha - 1
    where pedido_id = new.id and estado not in ('rechazado', 'cancelado', 'recogido', 'entregado');
  end if;
  return new;
end $$;
revoke execute on function privado.entrega_de_encargo() from public, anon, authenticated;
create trigger pedidos_entrega_de_encargo before update of estado on public.pedidos
  for each row execute function privado.entrega_de_encargo();

-- ══ 5. Recojo: un clic por marca; el pedido pasa solo a "en camino" ═══
create or replace function privado.pasar_en_camino(p_pedido uuid)
returns void language sql security definer set search_path to '' as $$
  update public.pedidos set estado = 'en_camino'
  where id = p_pedido and estado in ('recibido', 'en_preparacion')
    and not exists (select 1 from public.subpedidos s where s.pedido_id = p_pedido and s.estado in ('pendiente', 'listo_recojo', 'por_confirmar'))
    and exists (select 1 from public.subpedidos s where s.pedido_id = p_pedido and s.estado = 'recogido');
$$;
revoke execute on function privado.pasar_en_camino(uuid) from public, anon, authenticated;

-- Todo lo de una marca para un día de recojo (lo marcado "listo" y lo que no, porque Surtiba ya lo tiene)
create or replace function public.admin_recoger_marca(p_marca uuid, p_fecha_recojo date)
returns integer language plpgsql security definer set search_path to '' as $$
declare
  v_pedidos uuid[];
  v_id uuid;
begin
  if not privado.es_admin() then raise exception 'Solo el equipo Surtiba gestiona recojos.'; end if;
  with recogidos as (
    update public.subpedidos s set estado = 'recogido', recogido_en = now()
    from public.pedidos pe
    where pe.id = s.pedido_id and s.marca_id = p_marca and s.fecha_recojo = p_fecha_recojo
      and s.estado in ('pendiente', 'listo_recojo') and pe.estado in ('recibido', 'en_preparacion')
    returning s.pedido_id
  )
  select array_agg(distinct pedido_id) into v_pedidos from recogidos;
  if v_pedidos is null then raise exception 'No hay nada por recoger de esta marca ese día.'; end if;
  foreach v_id in array v_pedidos loop
    perform privado.pasar_en_camino(v_id);
  end loop;
  return array_length(v_pedidos, 1);
end $$;
revoke execute on function public.admin_recoger_marca(uuid, date) from public, anon;
grant execute on function public.admin_recoger_marca(uuid, date) to authenticated;

-- Una sola orden (desde el detalle del pedido): también pasa solo a "en camino" cuando no falta nada
create or replace function public.admin_marcar_recogido(p_subpedido uuid)
returns void language plpgsql security definer set search_path to '' as $$
declare
  s record;
begin
  if not privado.es_admin() then raise exception 'Solo el equipo Surtiba gestiona recojos.'; end if;
  select * into s from public.subpedidos where id = p_subpedido for update;
  if not found then raise exception 'No encontramos esa orden.'; end if;
  if s.estado not in ('pendiente', 'listo_recojo') then raise exception 'Esta orden ya no está por recoger.'; end if;
  if exists (select 1 from public.pedidos where id = s.pedido_id and estado in ('por_confirmar', 'por_pagar')) then
    raise exception 'Este encargo todavía no está pagado.';
  end if;
  update public.subpedidos set estado = 'recogido', recogido_en = now() where id = p_subpedido;
  perform privado.pasar_en_camino(s.pedido_id);
end $$;

-- La fecha de recojo ya no se pone a mano
drop function public.admin_fijar_recojo(uuid, date);

-- Órdenes abiertas sin fecha de recojo: la víspera de su entrega
update public.subpedidos s set fecha_recojo = pe.fecha_entrega_deseada - 1
from public.pedidos pe
where pe.id = s.pedido_id and s.fecha_recojo is null and s.estado in ('pendiente', 'listo_recojo')
  and pe.estado in ('recibido', 'en_preparacion');
