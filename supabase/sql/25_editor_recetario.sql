-- 21-oct-2026 · Recetario (paso 3d): el admin edita los tragos por sus ingredientes. Ya aplicada en Supabase.
-- Guardar un trago toca dos tablas (recetas + receta_ingredientes): va en una sola función (una transacción).
-- El licor principal del trago (recetas.categoria) se calcula solo: el ingrediente de Surtiba con más cantidad.
-- Las columnas viejas (ml_por_trago, mezclador…) ya no las usa el cotizador; se llenan para cumplir sus reglas.

create or replace function public.admin_guardar_trago(p_id uuid, p_nombre text, p_activo boolean, p_ingredientes jsonb)
returns uuid
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_id uuid := p_id;
  v_total int;
  v_distintos int;
  v_validos int;
  v_categoria text;
  v_ml numeric;
begin
  if not privado.es_admin() then raise exception 'Solo el equipo Surtiba edita el cotizador.'; end if;
  if length(btrim(coalesce(p_nombre, ''))) not between 2 and 60 then raise exception 'Escribe el nombre del trago (2 a 60 letras).'; end if;
  if jsonb_typeof(p_ingredientes) is distinct from 'array' then raise exception 'Agrega los ingredientes del trago.'; end if;

  select count(*), count(distinct (x->>'ingrediente_id')),
         count(*) filter (where i.id is not null and (x->>'cantidad')::numeric > 0 and (x->>'cantidad')::numeric <= 1000)
    into v_total, v_distintos, v_validos
  from jsonb_array_elements(p_ingredientes) x
  left join public.ingredientes i on i.id::text = x->>'ingrediente_id';
  if v_total not between 1 and 12 then raise exception 'Un trago lleva entre 1 y 12 ingredientes.'; end if;
  if v_distintos <> v_total then raise exception 'Hay un ingrediente repetido.'; end if;
  if v_validos <> v_total then raise exception 'Revisa los ingredientes: cada uno de la lista y con una cantidad entre 0 y 1000.'; end if;

  -- Licor principal: el ingrediente que vende Surtiba con más ml en el trago (si no hay, "otro")
  select i.categoria, (x->>'cantidad')::numeric into v_categoria, v_ml
  from jsonb_array_elements(p_ingredientes) x
  join public.ingredientes i on i.id::text = x->>'ingrediente_id'
  where i.categoria is not null and i.unidad = 'ml'
  order by (x->>'cantidad')::numeric desc
  limit 1;

  if v_id is null then
    insert into public.recetas (nombre, categoria, ml_por_trago, activo, orden)
    values (btrim(p_nombre), coalesce(v_categoria, 'otro'), greatest(10, least(500, round(coalesce(v_ml, 10))))::int,
      coalesce(p_activo, true), coalesce((select max(orden) from public.recetas), 0) + 1)
    returning id into v_id;
  else
    update public.recetas
    set nombre = btrim(p_nombre), categoria = coalesce(v_categoria, 'otro'),
        ml_por_trago = greatest(10, least(500, round(coalesce(v_ml, 10))))::int, activo = coalesce(p_activo, true)
    where id = v_id;
    if not found then raise exception 'No encontramos ese trago.'; end if;
    delete from public.receta_ingredientes where receta_id = v_id;
  end if;

  insert into public.receta_ingredientes (receta_id, ingrediente_id, cantidad)
  select v_id, (x->>'ingrediente_id')::uuid, round((x->>'cantidad')::numeric, 2)
  from jsonb_array_elements(p_ingredientes) x;
  return v_id;
exception
  when unique_violation then raise exception 'Ya existe un trago con ese nombre.';
end;
$$;

create or replace function public.admin_guardar_ingrediente(p_id uuid, p_nombre text, p_unidad text, p_categoria text, p_activo boolean)
returns uuid
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_id uuid := p_id;
  v_categoria text := nullif(btrim(coalesce(p_categoria, '')), '');
begin
  if not privado.es_admin() then raise exception 'Solo el equipo Surtiba edita el cotizador.'; end if;
  if length(btrim(coalesce(p_nombre, ''))) not between 2 and 40 then raise exception 'Escribe el nombre del ingrediente (2 a 40 letras).'; end if;
  if p_unidad not in ('ml', 'unidad', 'g') then raise exception 'Elige la unidad: ml, unidades o gramos.'; end if;
  if v_categoria is not null and v_categoria not in ('pisco', 'ron', 'gin', 'vodka', 'vino', 'espumante', 'licor', 'coctel_listo') then
    raise exception 'Elige qué categoría de Surtiba lo cubre, o "No lo vende".';
  end if;
  if v_categoria is not null and p_unidad <> 'ml' then raise exception 'Lo que vende Surtiba se mide en ml.'; end if;

  if v_id is null then
    insert into public.ingredientes (nombre, unidad, categoria, activo, orden)
    values (btrim(p_nombre), p_unidad, v_categoria, coalesce(p_activo, true), coalesce((select max(orden) from public.ingredientes), 0) + 1)
    returning id into v_id;
  else
    update public.ingredientes
    set nombre = btrim(p_nombre), unidad = p_unidad, categoria = v_categoria, activo = coalesce(p_activo, true)
    where id = v_id;
    if not found then raise exception 'No encontramos ese ingrediente.'; end if;
  end if;
  return v_id;
exception
  when unique_violation then raise exception 'Ya existe un ingrediente con ese nombre.';
end;
$$;

-- Solo usuarios con sesión pueden llamarlas (y adentro se exige admin), como las demás funciones del admin
revoke execute on function public.admin_guardar_trago(uuid, text, boolean, jsonb) from public, anon;
revoke execute on function public.admin_guardar_ingrediente(uuid, text, text, text, boolean) from public, anon;
grant execute on function public.admin_guardar_trago(uuid, text, boolean, jsonb) to authenticated;
grant execute on function public.admin_guardar_ingrediente(uuid, text, text, text, boolean) to authenticated;

-- La función vieja editaba solo las columnas viejas: ya no se usa
drop function public.admin_guardar_receta(uuid, text, text, integer, boolean, text, integer, numeric, integer);
