-- Fase 5 · 13: solicitudes "Quiero vender", logística del admin (recojos y entregas),
-- comisión al entregar, cancelaciones y pagos manuales.
-- Todo cambio de estado pasa por estas funciones: así nadie se salta pasos.

-- ══ 1. Rol "solicitante": se registró con "Quiero vender" y espera aprobación ═
-- No tiene acceso a nada (ninguna política lo menciona) hasta que el admin lo aprueba.
alter table public.perfiles drop constraint perfiles_rol_check;
alter table public.perfiles add constraint perfiles_rol_check check (rol in ('comprador', 'marca', 'admin', 'solicitante'));

create table public.solicitudes_marca (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid not null references public.perfiles(id) on delete cascade,
  nombre_comercial text not null,
  razon_social text not null,
  ruc text not null check (ruc ~ '^[0-9]{11}$'),
  direccion_recojo text not null,
  contacto_nombre text,
  contacto_whatsapp text,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'aprobada', 'rechazada')),
  motivo_rechazo text,
  marca_id uuid references public.marcas(id) on delete set null,
  creado_en timestamptz not null default now(),
  revisado_en timestamptz
);
create index solicitudes_marca_perfil_id_idx on public.solicitudes_marca (perfil_id);
create index solicitudes_marca_marca_id_idx on public.solicitudes_marca (marca_id);
alter table public.solicitudes_marca enable row level security;
revoke all on public.solicitudes_marca from anon;
revoke insert, update, delete, truncate, references, trigger on public.solicitudes_marca from authenticated;

create policy "solicitudes: ver la propia (admin ve todas)"
  on public.solicitudes_marca for select to authenticated
  using (perfil_id = (select auth.uid()) or (select privado.es_admin()));

-- El perfil automático ahora distingue "Quiero comprar" de "Quiero vender"
create or replace function privado.crear_perfil()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  datos jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  vende boolean;
begin
  vende := datos->>'tipo' = 'vender'
    and nullif(btrim(datos->>'nombre_comercial'), '') is not null
    and nullif(btrim(datos->>'razon_social'), '') is not null
    and coalesce(datos->>'ruc', '') ~ '^[0-9]{11}$'
    and nullif(btrim(datos->>'direccion_recojo'), '') is not null;

  insert into public.perfiles (id, rol, nombre, empresa, tipo_negocio, whatsapp, ruc)
  values (
    new.id,
    case when vende then 'solicitante' else 'comprador' end,
    nullif(btrim(datos->>'nombre'), ''),
    case when vende then btrim(datos->>'nombre_comercial') else nullif(btrim(datos->>'empresa'), '') end,
    case when not vende and datos->>'tipo_negocio' in ('catering', 'organizador_eventos', 'wedding_planner', 'bar_restaurante', 'otro')
      then datos->>'tipo_negocio' end,
    nullif(btrim(datos->>'whatsapp'), ''),
    case when datos->>'ruc' ~ '^[0-9]{11}$' then datos->>'ruc' end
  );

  if vende then
    insert into public.solicitudes_marca (perfil_id, nombre_comercial, razon_social, ruc, direccion_recojo, contacto_nombre, contacto_whatsapp)
    values (new.id, btrim(datos->>'nombre_comercial'), btrim(datos->>'razon_social'), datos->>'ruc',
            btrim(datos->>'direccion_recojo'), nullif(btrim(datos->>'nombre'), ''), nullif(btrim(datos->>'whatsapp'), ''));
  end if;
  return new;
end;
$$;

-- ══ 2. El admin aprueba o rechaza solicitudes ═══════════════════════════
create function public.aprobar_solicitud(p_solicitud uuid, p_comision numeric, p_pedido_minimo integer)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  s record;
  v_marca uuid;
begin
  if not privado.es_admin() then raise exception 'Solo el equipo Surtiba puede aprobar marcas.'; end if;
  select * into s from public.solicitudes_marca where id = p_solicitud for update;
  if not found then raise exception 'No encontramos esa solicitud.'; end if;
  if s.estado <> 'pendiente' then raise exception 'Esta solicitud ya fue revisada.'; end if;
  if p_comision is null or p_comision < 0 or p_comision > 100 then raise exception 'La comisión debe estar entre 0 y 100 %%.'; end if;
  if p_pedido_minimo is null or p_pedido_minimo < 1 then raise exception 'El pedido mínimo debe ser de al menos 1 caja.'; end if;

  insert into public.marcas (nombre_comercial, pedido_minimo_cajas, activa)
  values (s.nombre_comercial, p_pedido_minimo, true)
  returning id into v_marca;

  insert into public.marcas_privado (marca_id, razon_social, ruc, contacto_nombre, contacto_whatsapp, contacto_correo, direccion_recojo, comision_pct)
  values (v_marca, s.razon_social, s.ruc, s.contacto_nombre, s.contacto_whatsapp,
          (select u.email from auth.users u where u.id = s.perfil_id), s.direccion_recojo, p_comision);

  update public.perfiles set rol = 'marca', marca_id = v_marca where id = s.perfil_id;
  update public.solicitudes_marca set estado = 'aprobada', marca_id = v_marca, revisado_en = now() where id = p_solicitud;
  return v_marca;
end;
$$;

create function public.rechazar_solicitud(p_solicitud uuid, p_motivo text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  s record;
begin
  if not privado.es_admin() then raise exception 'Solo el equipo Surtiba puede revisar solicitudes.'; end if;
  select * into s from public.solicitudes_marca where id = p_solicitud for update;
  if not found then raise exception 'No encontramos esa solicitud.'; end if;
  if s.estado <> 'pendiente' then raise exception 'Esta solicitud ya fue revisada.'; end if;
  if length(btrim(coalesce(p_motivo, ''))) < 5 then raise exception 'Escribe el motivo (al menos 5 letras).'; end if;
  update public.solicitudes_marca set estado = 'rechazada', motivo_rechazo = btrim(p_motivo), revisado_en = now() where id = p_solicitud;
end;
$$;

-- El admin edita los datos de una marca (públicos y privados) en una sola operación
create function public.admin_guardar_marca(
  p_marca uuid, p_nombre text, p_pedido_minimo integer, p_activa boolean, p_comision numeric,
  p_razon_social text, p_ruc text, p_contacto_nombre text, p_contacto_whatsapp text, p_contacto_correo text, p_direccion_recojo text
)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not privado.es_admin() then raise exception 'Solo el equipo Surtiba puede editar marcas.'; end if;
  if not exists (select 1 from public.marcas where id = p_marca) then raise exception 'No encontramos esa marca.'; end if;
  if nullif(btrim(p_nombre), '') is null then raise exception 'Escribe el nombre comercial.'; end if;
  if p_pedido_minimo is null or p_pedido_minimo < 1 then raise exception 'El pedido mínimo debe ser de al menos 1 caja.'; end if;
  if p_comision is null or p_comision < 0 or p_comision > 100 then raise exception 'La comisión debe estar entre 0 y 100 %%.'; end if;
  if nullif(btrim(p_razon_social), '') is null then raise exception 'Escribe la razón social.'; end if;
  if coalesce(p_ruc, '') !~ '^[0-9]{11}$' then raise exception 'El RUC tiene 11 dígitos.'; end if;

  update public.marcas
  set nombre_comercial = btrim(p_nombre), pedido_minimo_cajas = p_pedido_minimo, activa = coalesce(p_activa, true)
  where id = p_marca;

  update public.marcas_privado
  set razon_social = btrim(p_razon_social), ruc = p_ruc, comision_pct = p_comision,
      contacto_nombre = nullif(btrim(p_contacto_nombre), ''), contacto_whatsapp = nullif(btrim(p_contacto_whatsapp), ''),
      contacto_correo = nullif(btrim(p_contacto_correo), ''), direccion_recojo = nullif(btrim(p_direccion_recojo), '')
  where marca_id = p_marca;
end;
$$;

-- ══ 3. Logística: recojos y entregas ════════════════════════════════════
-- Ayuda interna: cancelar una parte (devuelve el stock). La usan las dos funciones de cancelar.
create function privado.cancelar_parte(p_subpedido uuid, p_motivo text)
returns void
language plpgsql set search_path = ''
as $$
begin
  update public.subpedidos set estado = 'cancelado', motivo_rechazo = btrim(p_motivo) where id = p_subpedido;
  update public.productos p
  set stock_cajas = p.stock_cajas + i.cajas
  from public.items i
  where i.subpedido_id = p_subpedido and i.producto_id = p.id;
end;
$$;
revoke all on function privado.cancelar_parte(uuid, text) from public, anon, authenticated;

create function public.admin_fijar_recojo(p_subpedido uuid, p_fecha date)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  s record;
begin
  if not privado.es_admin() then raise exception 'Solo el equipo Surtiba gestiona recojos.'; end if;
  select * into s from public.subpedidos where id = p_subpedido for update;
  if not found then raise exception 'No encontramos esa orden.'; end if;
  if s.estado not in ('pendiente', 'listo_recojo') then raise exception 'Esta orden ya no necesita fecha de recojo.'; end if;
  if p_fecha is null or p_fecha < (now() at time zone 'America/Lima')::date then
    raise exception 'La fecha de recojo no puede ser en el pasado.';
  end if;
  update public.subpedidos set fecha_recojo = p_fecha where id = p_subpedido;
end;
$$;

create function public.admin_marcar_recogido(p_subpedido uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  s record;
begin
  if not privado.es_admin() then raise exception 'Solo el equipo Surtiba gestiona recojos.'; end if;
  select * into s from public.subpedidos where id = p_subpedido for update;
  if not found then raise exception 'No encontramos esa orden.'; end if;
  if s.estado <> 'listo_recojo' then raise exception 'Solo se recoge una orden que la marca marcó como lista.'; end if;
  update public.subpedidos set estado = 'recogido', recogido_en = now() where id = p_subpedido;
end;
$$;

create function public.admin_en_camino(p_pedido uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  pe record;
begin
  if not privado.es_admin() then raise exception 'Solo el equipo Surtiba gestiona entregas.'; end if;
  select * into pe from public.pedidos where id = p_pedido for update;
  if not found then raise exception 'No encontramos ese pedido.'; end if;
  if pe.estado not in ('recibido', 'en_preparacion') then raise exception 'Este pedido no puede pasar a "en camino".'; end if;
  -- Regla: solo si TODAS las partes vigentes ya fueron recogidas
  if exists (select 1 from public.subpedidos where pedido_id = p_pedido and estado in ('pendiente', 'listo_recojo')) then
    raise exception 'Aún falta recoger alguna marca de este pedido.';
  end if;
  if not exists (select 1 from public.subpedidos where pedido_id = p_pedido and estado = 'recogido') then
    raise exception 'Este pedido no tiene nada recogido para entregar.';
  end if;
  update public.pedidos set estado = 'en_camino' where id = p_pedido;
end;
$$;

-- Entregar: el pedido y sus partes pasan a "entregado" y se calcula la comisión de cada marca.
-- Los primeros 3 subpedidos entregados de cada marca no pagan comisión.
create function public.admin_entregar(p_pedido uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  pe record;
  r record;
  v_exento boolean;
begin
  if not privado.es_admin() then raise exception 'Solo el equipo Surtiba gestiona entregas.'; end if;
  select * into pe from public.pedidos where id = p_pedido for update;
  if not found then raise exception 'No encontramos ese pedido.'; end if;
  if pe.estado <> 'en_camino' then raise exception 'Primero marca el pedido como "en camino".'; end if;

  for r in
    select * from public.subpedidos where pedido_id = p_pedido and estado = 'recogido' for update
  loop
    v_exento := (select count(*) from public.subpedidos x where x.marca_id = r.marca_id and x.estado = 'entregado') < 3;
    update public.subpedidos
    set estado = 'entregado',
        entregado_en = now(),
        exento_comision = v_exento,
        comision_centimos = case when v_exento then 0 else round(r.total_centimos * r.comision_pct_aplicada / 100.0)::integer end
    where id = r.id;
  end loop;

  update public.pedidos set estado = 'entregado', entregado_en = now() where id = p_pedido;
end;
$$;

-- ══ 4. Cancelaciones del admin (el stock vuelve) ════════════════════════
create function public.admin_cancelar_subpedido(p_subpedido uuid, p_motivo text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  s record;
begin
  if not privado.es_admin() then raise exception 'Solo el equipo Surtiba puede cancelar.'; end if;
  select * into s from public.subpedidos where id = p_subpedido for update;
  if not found then raise exception 'No encontramos esa orden.'; end if;
  if s.estado not in ('pendiente', 'listo_recojo') then
    raise exception 'Solo se cancela una parte pendiente o lista para recojo.';
  end if;
  if length(btrim(coalesce(p_motivo, ''))) < 5 then raise exception 'Escribe el motivo (al menos 5 letras).'; end if;
  perform privado.cancelar_parte(p_subpedido, p_motivo);
  perform privado.recalcular_pedido(s.pedido_id);
end;
$$;

create function public.admin_cancelar_pedido(p_pedido uuid, p_motivo text)
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
  if pe.estado not in ('recibido', 'en_preparacion') then raise exception 'Este pedido ya no se puede cancelar.'; end if;
  if exists (select 1 from public.subpedidos where pedido_id = p_pedido and estado = 'recogido') then
    raise exception 'Ya se recogió una parte de este pedido. Cancela las partes que faltan una por una.';
  end if;
  if length(btrim(coalesce(p_motivo, ''))) < 5 then raise exception 'Escribe el motivo (al menos 5 letras).'; end if;

  for r in select id from public.subpedidos where pedido_id = p_pedido and estado in ('pendiente', 'listo_recojo') for update
  loop
    perform privado.cancelar_parte(r.id, p_motivo);
  end loop;
  perform privado.recalcular_pedido(p_pedido); -- sin partes vigentes, queda "cancelado"
end;
$$;

-- ══ 5. Pago manual ══════════════════════════════════════════════════════
create function public.admin_marcar_pagado(p_pedido uuid, p_metodo text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  pe record;
begin
  if not privado.es_admin() then raise exception 'Solo el equipo Surtiba registra pagos.'; end if;
  select * into pe from public.pedidos where id = p_pedido for update;
  if not found then raise exception 'No encontramos ese pedido.'; end if;
  if pe.estado = 'cancelado' then raise exception 'Este pedido está cancelado.'; end if;
  if pe.pago_estado = 'pagado' then raise exception 'Este pedido ya figura como pagado.'; end if;
  if p_metodo not in ('transferencia', 'yape', 'plin', 'efectivo') then raise exception 'Elige el método de pago.'; end if;
  update public.pedidos set pago_estado = 'pagado', pago_metodo = p_metodo, pagado_en = now() where id = p_pedido;
end;
$$;

-- ══ 6. Permisos ═════════════════════════════════════════════════════════
-- Desde ahora los estados de pedidos y subpedidos solo cambian por funciones (nadie se salta pasos)
drop policy "pedidos: solo el admin edita" on public.pedidos;
drop policy "subpedidos: solo el admin edita" on public.subpedidos;

revoke all on function public.aprobar_solicitud(uuid, numeric, integer) from public, anon;
revoke all on function public.rechazar_solicitud(uuid, text) from public, anon;
revoke all on function public.admin_guardar_marca(uuid, text, integer, boolean, numeric, text, text, text, text, text, text) from public, anon;
revoke all on function public.admin_fijar_recojo(uuid, date) from public, anon;
revoke all on function public.admin_marcar_recogido(uuid) from public, anon;
revoke all on function public.admin_en_camino(uuid) from public, anon;
revoke all on function public.admin_entregar(uuid) from public, anon;
revoke all on function public.admin_cancelar_subpedido(uuid, text) from public, anon;
revoke all on function public.admin_cancelar_pedido(uuid, text) from public, anon;
revoke all on function public.admin_marcar_pagado(uuid, text) from public, anon;

grant execute on function public.aprobar_solicitud(uuid, numeric, integer) to authenticated;
grant execute on function public.rechazar_solicitud(uuid, text) to authenticated;
grant execute on function public.admin_guardar_marca(uuid, text, integer, boolean, numeric, text, text, text, text, text, text) to authenticated;
grant execute on function public.admin_fijar_recojo(uuid, date) to authenticated;
grant execute on function public.admin_marcar_recogido(uuid) to authenticated;
grant execute on function public.admin_en_camino(uuid) to authenticated;
grant execute on function public.admin_entregar(uuid) to authenticated;
grant execute on function public.admin_cancelar_subpedido(uuid, text) to authenticated;
grant execute on function public.admin_cancelar_pedido(uuid, text) to authenticated;
grant execute on function public.admin_marcar_pagado(uuid, text) to authenticated;
