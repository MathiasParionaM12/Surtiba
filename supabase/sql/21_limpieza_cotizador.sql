-- Fase 6.1 · 21: limpieza del cotizador viejo (se aplica cuando el código nuevo ya está publicado).
-- Borra la mezcla en % y los tragos por hora de cada tipo de evento: ahora están en parametros_cotizador
-- y en el nivel de cada trago (principal / secundario / ocasional).

-- Funciones del formato viejo
drop function public.admin_guardar_tipo_evento(uuid, text, numeric, numeric, boolean, jsonb);
drop function public.admin_guardar_receta(uuid, text, text, integer, boolean);

-- La función nueva ya no llena las columnas viejas
create or replace function public.admin_guardar_tipo_evento(
  p_id uuid,
  p_nombre text,
  p_activo boolean,
  p_horas integer,
  p_perfil text,
  p_bienvenida boolean,
  p_bienvenida_horas numeric,
  p_bienvenida_receta uuid,
  p_brindis boolean,
  p_cena boolean,
  p_cena_horas numeric,
  p_barra jsonb
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_id uuid := p_id;
  v_ocupado numeric := 0; -- horas de bienvenida + cena (la fiesta usa el resto)
begin
  if not privado.es_admin() then raise exception 'Solo el equipo Surtiba edita el cotizador.'; end if;
  if length(btrim(coalesce(p_nombre, ''))) not between 2 and 60 then raise exception 'Escribe el nombre del tipo de evento (2 a 60 letras).'; end if;
  if p_horas is null or p_horas not between 1 and 12 then raise exception 'La duración va de 1 a 12 horas.'; end if;
  if coalesce(p_bienvenida, false) then v_ocupado := v_ocupado + coalesce(p_bienvenida_horas, 1); end if;
  if coalesce(p_cena, false) then v_ocupado := v_ocupado + coalesce(p_cena_horas, 1.5); end if;
  if v_ocupado > p_horas then raise exception 'La bienvenida y la cena no pueden durar más que todo el evento.'; end if;
  if p_barra is null or jsonb_typeof(p_barra) <> 'array' or jsonb_array_length(p_barra) = 0 then
    raise exception 'Elige al menos un trago para la barra.';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_barra) x
    where coalesce(x->>'nivel', '') not in ('principal', 'secundario', 'ocasional')
       or not exists (select 1 from public.recetas r where r.id = (x->>'receta_id')::uuid)
  ) then
    raise exception 'Cada trago de la barra necesita su nivel: principal, secundario u ocasional.';
  end if;

  if v_id is null then
    insert into public.tipos_evento (nombre, activo, horas, perfil, bienvenida, bienvenida_horas, bienvenida_receta_id, brindis, cena, cena_horas, orden)
    values (btrim(p_nombre), coalesce(p_activo, true), p_horas, p_perfil, coalesce(p_bienvenida, false), coalesce(p_bienvenida_horas, 1),
      p_bienvenida_receta, coalesce(p_brindis, false), coalesce(p_cena, false), coalesce(p_cena_horas, 1.5),
      coalesce((select max(orden) from public.tipos_evento), 0) + 1)
    returning id into v_id;
  else
    update public.tipos_evento
    set nombre = btrim(p_nombre), activo = coalesce(p_activo, true), horas = p_horas, perfil = p_perfil,
        bienvenida = coalesce(p_bienvenida, false), bienvenida_horas = coalesce(p_bienvenida_horas, 1), bienvenida_receta_id = p_bienvenida_receta,
        brindis = coalesce(p_brindis, false), cena = coalesce(p_cena, false), cena_horas = coalesce(p_cena_horas, 1.5)
    where id = v_id;
    if not found then raise exception 'No encontramos ese tipo de evento.'; end if;
  end if;

  delete from public.tipo_evento_recetas where tipo_evento_id = v_id;
  insert into public.tipo_evento_recetas (tipo_evento_id, receta_id, nivel)
  select distinct on ((x->>'receta_id')::uuid) v_id, (x->>'receta_id')::uuid, x->>'nivel'
  from jsonb_array_elements(p_barra) x;

  return v_id;
exception
  when unique_violation then raise exception 'Ya existe un tipo de evento con ese nombre.';
  when check_violation then raise exception 'Revisa los valores: alguno está fuera de rango.';
end;
$$;

-- Columnas viejas
alter table public.tipos_evento drop column tragos_primera_hora, drop column tragos_hora_siguiente;
alter table public.tipo_evento_recetas drop column porcentaje;
