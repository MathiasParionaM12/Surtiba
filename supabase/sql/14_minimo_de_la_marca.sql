-- Fase 5 (ajuste) · 14: el pedido mínimo lo decide la marca, y la comisión es fija de 5 % por ahora.
-- (Decisión de Mathias, 14-oct-2026.)

-- La marca propone su pedido mínimo al registrarse con "Quiero vender"
alter table public.solicitudes_marca
  add column pedido_minimo_cajas integer not null default 1 check (pedido_minimo_cajas >= 1);

create or replace function privado.crear_perfil()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  datos jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  vende boolean;
  minimo integer;
begin
  vende := datos->>'tipo' = 'vender'
    and nullif(btrim(datos->>'nombre_comercial'), '') is not null
    and nullif(btrim(datos->>'razon_social'), '') is not null
    and coalesce(datos->>'ruc', '') ~ '^[0-9]{11}$'
    and nullif(btrim(datos->>'direccion_recojo'), '') is not null;
  -- Si el número no es válido, se usa 1 (nunca se rechaza el registro por esto)
  minimo := case when coalesce(datos->>'pedido_minimo', '') ~ '^[0-9]{1,4}$' then greatest(1, (datos->>'pedido_minimo')::integer) else 1 end;

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
    insert into public.solicitudes_marca
      (perfil_id, nombre_comercial, razon_social, ruc, direccion_recojo, contacto_nombre, contacto_whatsapp, pedido_minimo_cajas)
    values (new.id, btrim(datos->>'nombre_comercial'), btrim(datos->>'razon_social'), datos->>'ruc',
            btrim(datos->>'direccion_recojo'), nullif(btrim(datos->>'nombre'), ''), nullif(btrim(datos->>'whatsapp'), ''), minimo);
  end if;
  return new;
end;
$$;

-- Aprobar: comisión de 5 % (fija por ahora) y el pedido mínimo que eligió la marca
drop function public.aprobar_solicitud(uuid, numeric, integer);

create function public.aprobar_solicitud(p_solicitud uuid, p_comision numeric default 5)
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

  insert into public.marcas (nombre_comercial, pedido_minimo_cajas, activa)
  values (s.nombre_comercial, s.pedido_minimo_cajas, true)
  returning id into v_marca;

  insert into public.marcas_privado (marca_id, razon_social, ruc, contacto_nombre, contacto_whatsapp, contacto_correo, direccion_recojo, comision_pct)
  values (v_marca, s.razon_social, s.ruc, s.contacto_nombre, s.contacto_whatsapp,
          (select u.email from auth.users u where u.id = s.perfil_id), s.direccion_recojo, p_comision);

  update public.perfiles set rol = 'marca', marca_id = v_marca where id = s.perfil_id;
  update public.solicitudes_marca set estado = 'aprobada', marca_id = v_marca, revisado_en = now() where id = p_solicitud;
  return v_marca;
end;
$$;
revoke all on function public.aprobar_solicitud(uuid, numeric) from public, anon;
grant execute on function public.aprobar_solicitud(uuid, numeric) to authenticated;

-- La marca cambia su propio pedido mínimo
create function public.marca_guardar_minimo(p_minimo integer)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_marca uuid := privado.mi_marca_id();
begin
  if v_marca is null then raise exception 'Solo una marca puede cambiar su pedido mínimo.'; end if;
  if p_minimo is null or p_minimo < 1 or p_minimo > 9999 then raise exception 'El pedido mínimo debe ser de al menos 1 caja.'; end if;
  update public.marcas set pedido_minimo_cajas = p_minimo where id = v_marca;
end;
$$;
revoke all on function public.marca_guardar_minimo(integer) from public, anon;
grant execute on function public.marca_guardar_minimo(integer) to authenticated;
