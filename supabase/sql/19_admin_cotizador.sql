-- Fase 6 · 19: el admin edita los parámetros del cotizador.
-- Tipo de evento + su mezcla se guardan juntos (una transacción) y la mezcla debe sumar 100 %.

create function public.admin_guardar_tipo_evento(
  p_id uuid,              -- null = nuevo
  p_nombre text,
  p_primera numeric,
  p_siguiente numeric,
  p_activo boolean,
  p_mezcla jsonb          -- [{receta_id, porcentaje}]
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_id uuid := p_id;
  v_suma integer;
begin
  if not privado.es_admin() then raise exception 'Solo el equipo Surtiba edita el cotizador.'; end if;
  if length(btrim(coalesce(p_nombre, ''))) not between 2 and 60 then raise exception 'Escribe el nombre del tipo de evento (2 a 60 letras).'; end if;
  if p_primera is null or p_primera <= 0 or p_primera > 10 then raise exception 'Tragos en la primera hora: entre 0.1 y 10 por persona.'; end if;
  if p_siguiente is null or p_siguiente < 0 or p_siguiente > 10 then raise exception 'Tragos por hora siguiente: entre 0 y 10 por persona.'; end if;
  if p_mezcla is null or jsonb_typeof(p_mezcla) <> 'array' or jsonb_array_length(p_mezcla) = 0 then
    raise exception 'Elige al menos un trago con su porcentaje.';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_mezcla) x
    where (x->>'porcentaje')::integer not between 1 and 100
       or not exists (select 1 from public.recetas r where r.id = (x->>'receta_id')::uuid)
  ) then
    raise exception 'Cada trago necesita un porcentaje entre 1 y 100.';
  end if;
  select sum((x->>'porcentaje')::integer) into v_suma from jsonb_array_elements(p_mezcla) x;
  if v_suma <> 100 then raise exception 'Los porcentajes suman % %%. Deben sumar 100 %%.', v_suma; end if;

  if v_id is null then
    insert into public.tipos_evento (nombre, tragos_primera_hora, tragos_hora_siguiente, activo, orden)
    values (btrim(p_nombre), p_primera, p_siguiente, coalesce(p_activo, true),
            coalesce((select max(orden) from public.tipos_evento), 0) + 1)
    returning id into v_id;
  else
    update public.tipos_evento
    set nombre = btrim(p_nombre), tragos_primera_hora = p_primera, tragos_hora_siguiente = p_siguiente, activo = coalesce(p_activo, true)
    where id = v_id;
    if not found then raise exception 'No encontramos ese tipo de evento.'; end if;
  end if;

  delete from public.tipo_evento_recetas where tipo_evento_id = v_id;
  insert into public.tipo_evento_recetas (tipo_evento_id, receta_id, porcentaje)
  select v_id, (x->>'receta_id')::uuid, sum((x->>'porcentaje')::integer)
  from jsonb_array_elements(p_mezcla) x
  group by (x->>'receta_id')::uuid;

  return v_id;
exception
  when unique_violation then raise exception 'Ya existe un tipo de evento con ese nombre.';
end;
$$;
revoke all on function public.admin_guardar_tipo_evento(uuid, text, numeric, numeric, boolean, jsonb) from public, anon;
grant execute on function public.admin_guardar_tipo_evento(uuid, text, numeric, numeric, boolean, jsonb) to authenticated;

create function public.admin_guardar_receta(p_id uuid, p_nombre text, p_categoria text, p_ml integer, p_activo boolean)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_id uuid := p_id;
begin
  if not privado.es_admin() then raise exception 'Solo el equipo Surtiba edita el cotizador.'; end if;
  if length(btrim(coalesce(p_nombre, ''))) not between 2 and 60 then raise exception 'Escribe el nombre del trago (2 a 60 letras).'; end if;
  if p_categoria not in ('pisco', 'ron', 'gin', 'vodka', 'vino', 'licor', 'coctel_listo', 'otro') then raise exception 'Elige el licor del trago.'; end if;
  if p_ml is null or p_ml not between 10 and 500 then raise exception 'Los ml por trago van de 10 a 500.'; end if;

  if v_id is null then
    insert into public.recetas (nombre, categoria, ml_por_trago, activo, orden)
    values (btrim(p_nombre), p_categoria, p_ml, coalesce(p_activo, true), coalesce((select max(orden) from public.recetas), 0) + 1)
    returning id into v_id;
  else
    update public.recetas set nombre = btrim(p_nombre), categoria = p_categoria, ml_por_trago = p_ml, activo = coalesce(p_activo, true)
    where id = v_id;
    if not found then raise exception 'No encontramos ese trago.'; end if;
  end if;
  return v_id;
exception
  when unique_violation then raise exception 'Ya existe un trago con ese nombre.';
end;
$$;
revoke all on function public.admin_guardar_receta(uuid, text, text, integer, boolean) from public, anon;
grant execute on function public.admin_guardar_receta(uuid, text, text, integer, boolean) to authenticated;
