-- Fase 7 · 15: pedidos por encargo y pago en el carrito (simulado).
-- Decisiones de Mathias (14-oct-2026):
--  · Con stock: compra directa, se paga al confirmar (pago simulado), sin aprobación de la marca.
--  · Más que el stock: la parte que falta es un PEDIDO POR ENCARGO aparte. La marca lo acepta
--    (con la fecha en que lo tendrá listo) o lo rechaza. Al confirmarse, el cliente lo paga.
--  · Todos los productos aceptan encargo. La marca sigue marcando "Listo para recojo".

-- ══ 1. Columnas y estados nuevos ════════════════════════════════════════
alter table public.pedidos
  add column tipo text not null default 'directo' check (tipo in ('directo', 'encargo')),
  add column pagado_centimos integer not null default 0 check (pagado_centimos >= 0);

-- Lo ya marcado como pagado cuenta como pagado completo
update public.pedidos set pagado_centimos = total_centimos where pago_estado = 'pagado';

alter table public.pedidos drop constraint pedidos_estado_check;
alter table public.pedidos add constraint pedidos_estado_check
  check (estado in ('por_confirmar', 'por_pagar', 'recibido', 'en_preparacion', 'en_camino', 'entregado', 'cancelado'));

alter table public.subpedidos add column fecha_disponible date; -- encargo: cuándo lo tendrá listo la marca
alter table public.subpedidos drop constraint subpedidos_estado_check;
alter table public.subpedidos add constraint subpedidos_estado_check
  check (estado in ('por_confirmar', 'pendiente', 'listo_recojo', 'recogido', 'entregado', 'rechazado', 'cancelado'));

-- ══ 2. Totales y estado de pago ═════════════════════════════════════════
-- El pago queda "pagado" si lo pagado cubre el total. Si una marca rechaza algo ya pagado,
-- lo pagado supera al total: es saldo a favor del cliente (Surtiba lo devuelve por fuera).
create or replace function privado.recalcular_pedido(p_pedido uuid)
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
      estado = case when v_vigentes = 0 then 'cancelado' else pe.estado end,
      pago_estado = case when pe.pagado_centimos > 0 and pe.pagado_centimos >= v_subtotal + pe.envio_centimos
                         then 'pagado' else 'pendiente' end
  where pe.id = p_pedido;
end;
$$;

-- El stock solo vuelve en compras directas (en un encargo nunca se reservó)
create or replace function privado.cancelar_parte(p_subpedido uuid, p_motivo text)
returns void
language plpgsql set search_path = ''
as $$
begin
  update public.subpedidos set estado = 'cancelado', motivo_rechazo = btrim(p_motivo) where id = p_subpedido;
  update public.productos p
  set stock_cajas = p.stock_cajas + i.cajas
  from public.items i
  join public.subpedidos s on s.id = i.subpedido_id
  join public.pedidos pe on pe.id = s.pedido_id
  where i.subpedido_id = p_subpedido and i.producto_id = p.id and pe.tipo = 'directo';
end;
$$;

-- ══ 3. Crear pedido: compra directa (se paga ya) + encargo (si falta stock) ══
drop function public.crear_pedido(date, text, text, text, text, text, text, text, text, text, text, date, integer);

create function public.crear_pedido(
  p_fecha_entrega date,
  p_direccion text,
  p_distrito text,
  p_recibe_nombre text,
  p_recibe_telefono text,
  p_metodo_pago text default null,
  p_direccion_detalle text default null,
  p_codigo_postal text default null,
  p_referencia text default null,
  p_nota text default null,
  p_evento_nombre text default null,
  p_evento_tipo text default null,
  p_evento_fecha date default null,
  p_invitados integer default null
)
returns table (pedido_id uuid, codigo text, tipo text)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_uid uuid := (select auth.uid());
  v_hoy date := (now() at time zone 'America/Lima')::date;
  v_directo uuid;
  v_cod_directo text;
  v_encargo uuid;
  v_cod_encargo text;
  v_sub uuid;
  v_hay_directo boolean;
  v_hay_encargo boolean;
  r record;
begin
  if v_uid is null or privado.mi_rol() is distinct from 'comprador' then
    raise exception 'Solo los compradores con sesión pueden hacer pedidos.';
  end if;

  -- Datos de entrega
  if p_fecha_entrega is null or p_fecha_entrega < v_hoy + 1 then raise exception 'La fecha de entrega debe ser desde mañana.'; end if;
  if nullif(btrim(p_direccion), '') is null then raise exception 'Escribe la calle y el número de la dirección de entrega.'; end if;
  if nullif(btrim(p_distrito), '') is null then raise exception 'Elige el distrito de entrega.'; end if;
  if nullif(btrim(p_recibe_nombre), '') is null then raise exception 'Escribe el nombre de quien recibe el pedido.'; end if;
  if p_recibe_telefono is null or p_recibe_telefono !~ '^\+\d{7,15}$' then raise exception 'Escribe el celular de quien recibe el pedido.'; end if;
  if nullif(btrim(p_codigo_postal), '') is not null and btrim(p_codigo_postal) !~ '^\d{5}$' then
    raise exception 'El código postal tiene 5 dígitos. Si no lo sabes, déjalo vacío.';
  end if;
  if p_invitados is not null and p_invitados < 1 then raise exception 'El número de invitados debe ser mayor que 0.'; end if;

  -- Bloquea las filas de los productos del carrito (nadie más puede venderlas mientras tanto)
  perform 1 from public.productos p
  where p.id in (select c.producto_id from public.carrito c where c.comprador_id = v_uid)
  order by p.id for update;

  if not exists (select 1 from public.carrito c where c.comprador_id = v_uid) then raise exception 'Tu carrito está vacío.'; end if;

  -- Cada producto: disponible y con precio. (Si falta stock, ya no es error: lo que falta va por encargo.)
  for r in select * from public.carrito_detalle d where d.comprador_id = v_uid order by d.nombre loop
    if not r.activo or not r.marca_activa then raise exception '% ya no está disponible. Quítalo de tu carrito.', r.nombre; end if;
    if r.precio_caja_centimos is null then raise exception '% no tiene precio para % cajas. Escríbenos para revisarlo.', r.nombre, r.cajas; end if;
  end loop;

  -- Pedido mínimo por marca (sobre el total: lo que hay en stock + lo que va por encargo)
  for r in
    select d.marca, d.pedido_minimo_cajas, sum(d.cajas) as cajas
    from public.carrito_detalle d where d.comprador_id = v_uid
    group by d.marca, d.pedido_minimo_cajas
    having sum(d.cajas) < d.pedido_minimo_cajas
  loop
    raise exception 'Pedido mínimo de %: % cajas. Te faltan %.', r.marca, r.pedido_minimo_cajas, r.pedido_minimo_cajas - r.cajas;
  end loop;

  v_hay_directo := exists (select 1 from public.carrito_detalle d where d.comprador_id = v_uid and d.stock_cajas > 0);
  v_hay_encargo := exists (select 1 from public.carrito_detalle d where d.comprador_id = v_uid and d.cajas > d.stock_cajas);

  if v_hay_directo and coalesce(p_metodo_pago, '') not in ('yape', 'plin', 'transferencia', 'tarjeta') then
    raise exception 'Elige cómo vas a pagar.';
  end if;

  -- ── Pedido por encargo: lo que supera el stock (se crea antes de tocar el stock) ──
  if v_hay_encargo then
    insert into public.pedidos (tipo, estado, comprador_id, fecha_entrega_deseada, direccion_entrega, direccion_detalle, distrito,
      codigo_postal, referencia, recibe_nombre, recibe_telefono, nota, evento_nombre, evento_tipo, evento_fecha, invitados)
    values ('encargo', 'por_confirmar', v_uid, p_fecha_entrega, btrim(p_direccion), nullif(btrim(p_direccion_detalle), ''), btrim(p_distrito),
      nullif(btrim(p_codigo_postal), ''), nullif(btrim(p_referencia), ''), btrim(p_recibe_nombre), p_recibe_telefono,
      nullif(btrim(p_nota), ''), nullif(btrim(p_evento_nombre), ''), nullif(btrim(p_evento_tipo), ''), p_evento_fecha, p_invitados)
    returning id, pedidos.codigo into v_encargo, v_cod_encargo;

    for r in select distinct d.marca_id from public.carrito_detalle d where d.comprador_id = v_uid and d.cajas > d.stock_cajas loop
      insert into public.subpedidos (pedido_id, marca_id, codigo, estado, comision_pct_aplicada)
      select v_encargo, r.marca_id, v_cod_encargo, 'por_confirmar', mp.comision_pct
      from public.marcas_privado mp where mp.marca_id = r.marca_id
      returning id into v_sub;

      insert into public.items (subpedido_id, producto_id, cajas, precio_caja_centimos, subtotal_centimos)
      select v_sub, d.producto_id, d.cajas - d.stock_cajas, d.precio_caja_centimos, (d.cajas - d.stock_cajas) * d.precio_caja_centimos
      from public.carrito_detalle d
      where d.comprador_id = v_uid and d.marca_id = r.marca_id and d.cajas > d.stock_cajas;

      update public.subpedidos sp set total_cajas = t.cajas, total_centimos = t.total
      from (select sum(i.cajas) as cajas, sum(i.subtotal_centimos) as total from public.items i where i.subpedido_id = v_sub) t
      where sp.id = v_sub;
    end loop;
    perform privado.recalcular_pedido(v_encargo);
  end if;

  -- ── Compra directa: lo que sí hay en stock (se paga ahora, pago simulado) ──
  if v_hay_directo then
    insert into public.pedidos (tipo, estado, comprador_id, fecha_entrega_deseada, direccion_entrega, direccion_detalle, distrito,
      codigo_postal, referencia, recibe_nombre, recibe_telefono, nota, evento_nombre, evento_tipo, evento_fecha, invitados)
    values ('directo', 'recibido', v_uid, p_fecha_entrega, btrim(p_direccion), nullif(btrim(p_direccion_detalle), ''), btrim(p_distrito),
      nullif(btrim(p_codigo_postal), ''), nullif(btrim(p_referencia), ''), btrim(p_recibe_nombre), p_recibe_telefono,
      nullif(btrim(p_nota), ''), nullif(btrim(p_evento_nombre), ''), nullif(btrim(p_evento_tipo), ''), p_evento_fecha, p_invitados)
    returning id, pedidos.codigo into v_directo, v_cod_directo;

    for r in select distinct d.marca_id from public.carrito_detalle d where d.comprador_id = v_uid and d.stock_cajas > 0 loop
      insert into public.subpedidos (pedido_id, marca_id, codigo, comision_pct_aplicada)
      select v_directo, r.marca_id, v_cod_directo, mp.comision_pct
      from public.marcas_privado mp where mp.marca_id = r.marca_id
      returning id into v_sub;

      insert into public.items (subpedido_id, producto_id, cajas, precio_caja_centimos, subtotal_centimos)
      select v_sub, d.producto_id, least(d.cajas, d.stock_cajas), d.precio_caja_centimos, least(d.cajas, d.stock_cajas) * d.precio_caja_centimos
      from public.carrito_detalle d
      where d.comprador_id = v_uid and d.marca_id = r.marca_id and d.stock_cajas > 0;

      update public.subpedidos sp set total_cajas = t.cajas, total_centimos = t.total
      from (select sum(i.cajas) as cajas, sum(i.subtotal_centimos) as total from public.items i where i.subpedido_id = v_sub) t
      where sp.id = v_sub;
    end loop;

    -- Pago simulado: queda pagado al instante (en el prototipo no se cobra dinero real)
    update public.pedidos pe
    set subtotal_centimos = t.total, total_centimos = t.total + pe.envio_centimos,
        pagado_centimos = t.total + pe.envio_centimos, pago_estado = 'pagado', pago_metodo = p_metodo_pago, pagado_en = now()
    from (select sum(s.total_centimos) as total from public.subpedidos s where s.pedido_id = v_directo) t
    where pe.id = v_directo;

    -- Reserva el stock de la compra directa
    update public.productos p
    set stock_cajas = p.stock_cajas - least(c.cajas, p.stock_cajas)
    from public.carrito c
    where c.comprador_id = v_uid and c.producto_id = p.id;
  end if;

  delete from public.carrito c where c.comprador_id = v_uid;

  if v_directo is not null then return query select v_directo, v_cod_directo, 'directo'::text; end if;
  if v_encargo is not null then return query select v_encargo, v_cod_encargo, 'encargo'::text; end if;
end;
$$;
revoke all on function public.crear_pedido(date, text, text, text, text, text, text, text, text, text, text, text, date, integer) from public, anon;
grant execute on function public.crear_pedido(date, text, text, text, text, text, text, text, text, text, text, text, date, integer) to authenticated;

-- ══ 4. La marca responde un encargo ═════════════════════════════════════
create function public.marca_responder_encargo(p_subpedido uuid, p_acepta boolean, p_fecha date default null, p_motivo text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  s record;
begin
  select * into s from public.subpedidos where id = p_subpedido for update;
  if not found or s.marca_id is distinct from privado.mi_marca_id() then raise exception 'No encontramos ese encargo en tu marca.'; end if;
  if s.estado <> 'por_confirmar' then raise exception 'Este encargo ya fue respondido.'; end if;

  if p_acepta then
    if p_fecha is null or p_fecha < (now() at time zone 'America/Lima')::date then
      raise exception 'Elige la fecha en que tendrás listo el encargo (desde hoy).';
    end if;
    update public.subpedidos set estado = 'pendiente', fecha_disponible = p_fecha where id = p_subpedido;
  else
    if length(btrim(coalesce(p_motivo, ''))) < 5 then raise exception 'Escribe el motivo (al menos 5 letras).'; end if;
    update public.subpedidos set estado = 'rechazado', motivo_rechazo = btrim(p_motivo) where id = p_subpedido;
  end if;

  perform privado.recalcular_pedido(s.pedido_id);

  -- Cuando todas las marcas respondieron (y alguna aceptó), el encargo queda confirmado: falta pagar
  update public.pedidos pe set estado = 'por_pagar'
  where pe.id = s.pedido_id and pe.estado = 'por_confirmar'
    and not exists (select 1 from public.subpedidos x where x.pedido_id = s.pedido_id and x.estado = 'por_confirmar');
end;
$$;
revoke all on function public.marca_responder_encargo(uuid, boolean, date, text) from public, anon;
grant execute on function public.marca_responder_encargo(uuid, boolean, date, text) to authenticated;

-- ══ 5. El cliente paga (encargo confirmado o diferencia pendiente) ══════
create function public.pagar_pedido(p_pedido uuid, p_metodo text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  pe record;
begin
  select * into pe from public.pedidos where id = p_pedido for update;
  if not found or pe.comprador_id is distinct from (select auth.uid()) then raise exception 'No encontramos ese pedido.'; end if;
  if pe.estado in ('cancelado', 'por_confirmar') then raise exception 'Este pedido todavía no se puede pagar.'; end if;
  if pe.pagado_centimos >= pe.total_centimos then raise exception 'Este pedido ya está pagado.'; end if;
  if coalesce(p_metodo, '') not in ('yape', 'plin', 'transferencia', 'tarjeta') then raise exception 'Elige cómo vas a pagar.'; end if;

  update public.pedidos
  set pagado_centimos = total_centimos, pago_estado = 'pagado', pago_metodo = p_metodo, pagado_en = now(),
      estado = case when estado = 'por_pagar' then 'recibido' else estado end
  where id = p_pedido;
end;
$$;
revoke all on function public.pagar_pedido(uuid, text) from public, anon;
grant execute on function public.pagar_pedido(uuid, text) to authenticated;

-- ══ 6. Ajustes a funciones existentes ═══════════════════════════════════
-- Listo para recojo: un encargo solo después de que el cliente pagó
create or replace function public.marcar_listo(p_subpedido uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  s record;
begin
  select * into s from public.subpedidos where id = p_subpedido for update;
  if not found or s.marca_id is distinct from privado.mi_marca_id() then raise exception 'No encontramos esa orden en tu marca.'; end if;
  if s.estado <> 'pendiente' then raise exception 'Solo puedes marcar como lista una orden pendiente.'; end if;
  if exists (select 1 from public.pedidos where id = s.pedido_id and estado in ('por_confirmar', 'por_pagar')) then
    raise exception 'Espera a que el cliente pague este encargo. Te avisaremos aquí.';
  end if;

  update public.subpedidos set estado = 'listo_recojo', listo_en = now() where id = p_subpedido;
  update public.pedidos set estado = 'en_preparacion' where id = s.pedido_id and estado = 'recibido';
end;
$$;

-- La marca no puede atender una orden ya aceptada: el stock vuelve solo si era compra directa
create or replace function public.rechazar_subpedido(p_subpedido uuid, p_motivo text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  s record;
begin
  select * into s from public.subpedidos where id = p_subpedido for update;
  if not found or s.marca_id is distinct from privado.mi_marca_id() then raise exception 'No encontramos esa orden en tu marca.'; end if;
  if s.estado <> 'pendiente' then
    raise exception 'Solo puedes rechazar una orden pendiente. Si ya la marcaste como lista, escríbele a Surtiba.';
  end if;
  if length(btrim(coalesce(p_motivo, ''))) < 5 then
    raise exception 'Escribe el motivo (al menos 5 letras) para que Surtiba pueda avisarle al cliente.';
  end if;

  update public.subpedidos set estado = 'rechazado', motivo_rechazo = btrim(p_motivo) where id = p_subpedido;
  update public.productos p
  set stock_cajas = p.stock_cajas + i.cajas
  from public.items i
  join public.pedidos pe on pe.id = (select pedido_id from public.subpedidos where id = p_subpedido)
  where i.subpedido_id = p_subpedido and i.producto_id = p.id and pe.tipo = 'directo';

  perform privado.recalcular_pedido(s.pedido_id);
end;
$$;

-- Pago manual del admin: también método tarjeta, y deja el monto pagado completo
create or replace function public.admin_marcar_pagado(p_pedido uuid, p_metodo text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  pe record;
begin
  if not privado.es_admin() then raise exception 'Solo el equipo Surtiba registra pagos.'; end if;
  select * into pe from public.pedidos where id = p_pedido for update;
  if not found then raise exception 'No encontramos ese pedido.'; end if;
  if pe.estado in ('cancelado', 'por_confirmar') then raise exception 'Este pedido no se puede marcar como pagado.'; end if;
  if pe.pagado_centimos >= pe.total_centimos and pe.total_centimos > 0 then raise exception 'Este pedido ya figura como pagado.'; end if;
  if p_metodo not in ('transferencia', 'yape', 'plin', 'efectivo', 'tarjeta') then raise exception 'Elige el método de pago.'; end if;
  update public.pedidos
  set pagado_centimos = total_centimos, pago_estado = 'pagado', pago_metodo = p_metodo, pagado_en = now(),
      estado = case when estado = 'por_pagar' then 'recibido' else estado end
  where id = p_pedido;
end;
$$;

-- Cancelaciones del admin: también encargos por confirmar o por pagar
create or replace function public.admin_cancelar_subpedido(p_subpedido uuid, p_motivo text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  s record;
begin
  if not privado.es_admin() then raise exception 'Solo el equipo Surtiba puede cancelar.'; end if;
  select * into s from public.subpedidos where id = p_subpedido for update;
  if not found then raise exception 'No encontramos esa orden.'; end if;
  if s.estado not in ('por_confirmar', 'pendiente', 'listo_recojo') then
    raise exception 'Solo se cancela una parte por confirmar, pendiente o lista para recojo.';
  end if;
  if length(btrim(coalesce(p_motivo, ''))) < 5 then raise exception 'Escribe el motivo (al menos 5 letras).'; end if;
  perform privado.cancelar_parte(p_subpedido, p_motivo);
  perform privado.recalcular_pedido(s.pedido_id);
  update public.pedidos pe set estado = 'por_pagar'
  where pe.id = s.pedido_id and pe.estado = 'por_confirmar'
    and not exists (select 1 from public.subpedidos x where x.pedido_id = s.pedido_id and x.estado = 'por_confirmar');
end;
$$;

create or replace function public.admin_cancelar_pedido(p_pedido uuid, p_motivo text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  pe record;
  r record;
begin
  if not privado.es_admin() then raise exception 'Solo el equipo Surtiba puede cancelar.'; end if;
  select * into pe from public.pedidos where id = p_pedido for update;
  if not found then raise exception 'No encontramos ese pedido.'; end if;
  if pe.estado not in ('por_confirmar', 'por_pagar', 'recibido', 'en_preparacion') then raise exception 'Este pedido ya no se puede cancelar.'; end if;
  if exists (select 1 from public.subpedidos where pedido_id = p_pedido and estado = 'recogido') then
    raise exception 'Ya se recogió una parte de este pedido. Cancela las partes que faltan una por una.';
  end if;
  if length(btrim(coalesce(p_motivo, ''))) < 5 then raise exception 'Escribe el motivo (al menos 5 letras).'; end if;

  for r in select id from public.subpedidos where pedido_id = p_pedido and estado in ('por_confirmar', 'pendiente', 'listo_recojo') for update
  loop
    perform privado.cancelar_parte(r.id, p_motivo);
  end loop;
  perform privado.recalcular_pedido(p_pedido);
end;
$$;

-- Reemplazos al mismo pedido: solo en compras directas (después el cliente paga la diferencia)
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
  select * into pe from public.pedidos where id = p_pedido for update;
  if not found or pe.comprador_id is distinct from v_uid or privado.mi_rol() is distinct from 'comprador' then
    raise exception 'No encontramos ese pedido.';
  end if;
  if pe.tipo <> 'directo' then raise exception 'En un pedido por encargo, agrega el reemplazo a un pedido nuevo.'; end if;
  if pe.estado not in ('recibido', 'en_preparacion') then
    raise exception 'Este pedido ya no se puede cambiar. Agrega el producto a un pedido nuevo.';
  end if;
  if not exists (select 1 from public.subpedidos where pedido_id = p_pedido and estado in ('rechazado', 'cancelado')) then
    raise exception 'Solo puedes agregar reemplazos cuando una marca no pudo atender tu pedido.';
  end if;
  if p_cajas is null or p_cajas < 1 or p_cajas > 999 then raise exception 'Elige entre 1 y 999 cajas.'; end if;

  select p.*, m.activa as marca_activa, m.nombre_comercial as marca, m.pedido_minimo_cajas
  into pr
  from public.productos p join public.marcas m on m.id = p.marca_id
  where p.id = p_producto
  for update of p;
  if not found or not pr.activo or not pr.marca_activa then raise exception 'Ese producto ya no está disponible.'; end if;
  if pr.stock_cajas < p_cajas then raise exception 'Solo quedan % cajas de %.', pr.stock_cajas, pr.nombre; end if;

  select * into s from public.subpedidos where pedido_id = p_pedido and marca_id = pr.marca_id for update;
  if found then
    if s.estado in ('rechazado', 'cancelado') then raise exception '% no pudo atender este pedido. Elige una opción de otra marca.', pr.marca; end if;
    if s.estado <> 'pendiente' then raise exception '% ya preparó su parte de este pedido. Agrega este producto a un pedido nuevo.', pr.marca; end if;
    v_sub := s.id;
  else
    if p_cajas < pr.pedido_minimo_cajas then
      raise exception 'Pedido mínimo de %: % cajas. Elige al menos % cajas.', pr.marca, pr.pedido_minimo_cajas, pr.pedido_minimo_cajas;
    end if;
    insert into public.subpedidos (pedido_id, marca_id, codigo, comision_pct_aplicada)
    select p_pedido, pr.marca_id, pe.codigo, mp.comision_pct
    from public.marcas_privado mp where mp.marca_id = pr.marca_id
    returning id into v_sub;
  end if;

  v_cajas_item := p_cajas + coalesce((select cajas from public.items where subpedido_id = v_sub and producto_id = p_producto), 0);
  select e.precio_caja_centimos into v_precio
  from public.escalas_precio e
  where e.producto_id = p_producto and v_cajas_item >= e.desde_cajas and (e.hasta_cajas is null or v_cajas_item <= e.hasta_cajas);
  if v_precio is null then raise exception '% no tiene precio para % cajas.', pr.nombre, v_cajas_item; end if;

  insert into public.items (subpedido_id, producto_id, cajas, precio_caja_centimos, subtotal_centimos)
  values (v_sub, p_producto, v_cajas_item, v_precio, v_cajas_item * v_precio)
  on conflict (subpedido_id, producto_id)
  do update set cajas = excluded.cajas, precio_caja_centimos = excluded.precio_caja_centimos, subtotal_centimos = excluded.subtotal_centimos;

  update public.subpedidos sp
  set total_cajas = t.cajas, total_centimos = t.total
  from (select sum(i.cajas) as cajas, sum(i.subtotal_centimos) as total from public.items i where i.subpedido_id = v_sub) t
  where sp.id = v_sub;

  update public.productos set stock_cajas = stock_cajas - p_cajas where id = p_producto;

  perform privado.recalcular_pedido(p_pedido);
  return pe.codigo;
end;
$$;
