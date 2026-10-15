-- Fase 6.1 · 20: cotizador completo (plan aprobado por Mathias el 14-oct-2026).
-- Momentos del evento (bienvenida, cena con vino, brindis, fiesta), invitados que no toman,
-- perfil de consumo, margen, insumos que Surtiba no vende y categoría "espumante".
-- Solo AGREGA columnas y funciones: lo viejo se borra en 21 cuando el código nuevo esté publicado.
-- Todos los valores iniciales son SUPUESTOS POR VALIDAR CON CATERINGS (el admin los edita).

-- ══ 1. Categoría "espumante" ════════════════════════════════════════════
alter table public.productos drop constraint productos_categoria_check;
alter table public.productos add constraint productos_categoria_check
  check (categoria in ('pisco', 'ron', 'gin', 'vodka', 'vino', 'espumante', 'licor', 'coctel_listo', 'otro'));
alter table public.recetas drop constraint recetas_categoria_check;
alter table public.recetas add constraint recetas_categoria_check
  check (categoria in ('pisco', 'ron', 'gin', 'vodka', 'vino', 'espumante', 'licor', 'coctel_listo', 'otro'));

-- guardar_producto valida la lista de categorías: se agrega 'espumante' sin reescribir la función
do $$
declare
  d text;
begin
  select pg_get_functiondef('public.guardar_producto(uuid, text, text, integer, numeric, integer, text, integer, boolean, jsonb, uuid)'::regprocedure) into d;
  d := replace(d, '''vino'', ''licor''', '''vino'', ''espumante'', ''licor''');
  execute d;
end $$;

-- Producto demo para el brindis (nombre claramente ficticio)
with nuevo as (
  insert into public.productos (marca_id, nombre, categoria, ml, grado, unidades_por_caja, registro_sanitario, stock_cajas, activo)
  select id, 'Espumante Brut Demo', 'espumante', 750, 12.0, 6, 'DEMO-RS-0012', 40, true
  from public.marcas where nombre_comercial = 'Marca Demo Valle'
  returning id
)
insert into public.escalas_precio (producto_id, desde_cajas, hasta_cajas, precio_caja_centimos)
select nuevo.id, t.desde, t.hasta, t.precio from nuevo,
  (values (1, 4, 24000), (5, 9, 23000), (10, null::integer, 22000)) as t(desde, hasta, precio);

-- ══ 2. Recetas: insumos que Surtiba no vende ════════════════════════════
alter table public.recetas
  add column mezclador text check (mezclador is null or length(btrim(mezclador)) between 2 and 40),
  add column mezclador_ml integer not null default 0 check (mezclador_ml between 0 and 500),
  add column limones numeric(4,2) not null default 0 check (limones between 0 and 10),
  add column jarabe_ml integer not null default 0 check (jarabe_ml between 0 and 200);

update public.recetas r set mezclador = v.mezclador, mezclador_ml = v.ml, limones = v.limones, jarabe_ml = v.jarabe
from (values
  ('Pisco sour',     null,               0,   2.00, 30),
  ('Chilcano',       'Ginger ale',       120, 0.50, 10),
  ('Cuba libre',     'Gaseosa cola',     150, 0.25, 0),
  ('Gin tonic',      'Agua tónica',      150, 0.25, 0),
  ('Vodka con jugo', 'Jugo de naranja',  150, 0.00, 0)
) as v(nombre, mezclador, ml, limones, jarabe)
where r.nombre = v.nombre;

insert into public.recetas (nombre, categoria, ml_por_trago, orden)
values ('Copa de espumante', 'espumante', 125, 8);

-- ══ 3. Parámetros generales (una sola fila, la edita el admin) ══════════
create table public.parametros_cotizador (
  id boolean primary key default true check (id),
  no_toman_pct integer not null default 20 check (no_toman_pct between 0 and 90),
  factor_tranquilo numeric(3,2) not null default 0.75 check (factor_tranquilo between 0.1 and 3),
  factor_normal numeric(3,2) not null default 1.00 check (factor_normal between 0.1 and 3),
  factor_fuerte numeric(3,2) not null default 1.30 check (factor_fuerte between 0.1 and 3),
  factor_dia numeric(3,2) not null default 0.85 check (factor_dia between 0.1 and 3),
  bienvenida_tragos_hora numeric(4,2) not null default 2.00 check (bienvenida_tragos_hora between 0 and 10),
  fiesta_primera_hora numeric(4,2) not null default 1.50 check (fiesta_primera_hora between 0 and 10),
  fiesta_tragos_hora numeric(4,2) not null default 1.00 check (fiesta_tragos_hora between 0 and 10),
  cena_copas_hora numeric(4,2) not null default 1.00 check (cena_copas_hora between 0 and 10),
  brindis_copas numeric(4,2) not null default 1.00 check (brindis_copas between 0 and 5),
  cena_receta_id uuid references public.recetas(id) on delete set null,
  brindis_receta_id uuid references public.recetas(id) on delete set null,
  hielo_kg_persona_hora numeric(4,2) not null default 0.25 check (hielo_kg_persona_hora between 0 and 5),
  factor_calor numeric(3,2) not null default 1.40 check (factor_calor between 1 and 3),
  sin_alcohol_l_hora_toma numeric(4,2) not null default 0.20 check (sin_alcohol_l_hora_toma between 0 and 5),
  sin_alcohol_l_hora_no_toma numeric(4,2) not null default 0.50 check (sin_alcohol_l_hora_no_toma between 0 and 5),
  margen_pct integer not null default 10 check (margen_pct between 0 and 50)
);
create index parametros_cotizador_cena_idx on public.parametros_cotizador (cena_receta_id);
create index parametros_cotizador_brindis_idx on public.parametros_cotizador (brindis_receta_id);

insert into public.parametros_cotizador (cena_receta_id, brindis_receta_id)
values ((select id from public.recetas where nombre = 'Copa de vino'), (select id from public.recetas where nombre = 'Copa de espumante'));

alter table public.parametros_cotizador enable row level security;
revoke all on public.parametros_cotizador from anon, authenticated;
grant select on public.parametros_cotizador to anon, authenticated;
create policy "parametros: todos los leen"
  on public.parametros_cotizador for select to anon, authenticated using (true);
-- Se editan solo con admin_guardar_parametros (más abajo)

-- ══ 4. Tipos de evento: momentos y perfil por defecto ═══════════════════
alter table public.tipos_evento
  add column horas integer not null default 5 check (horas between 1 and 12),
  add column perfil text not null default 'normal' check (perfil in ('tranquilo', 'normal', 'fuerte')),
  add column bienvenida boolean not null default false,
  add column bienvenida_horas numeric(3,1) not null default 1 check (bienvenida_horas between 0.5 and 4),
  add column bienvenida_receta_id uuid references public.recetas(id) on delete set null,
  add column brindis boolean not null default false,
  add column cena boolean not null default false,
  add column cena_horas numeric(3,1) not null default 1.5 check (cena_horas between 0.5 and 4);
create index tipos_evento_bienvenida_receta_idx on public.tipos_evento (bienvenida_receta_id);

-- La barra ya no usa %: cada trago es principal (3), secundario (2) u ocasional (1)
alter table public.tipo_evento_recetas
  add column nivel text not null default 'secundario' check (nivel in ('principal', 'secundario', 'ocasional')),
  alter column porcentaje drop not null; -- se borra en 21

update public.tipos_evento t set horas = v.horas, perfil = v.perfil, bienvenida = v.bienvenida, bienvenida_horas = 1,
  bienvenida_receta_id = case when v.bienvenida then (select id from public.recetas where nombre = 'Pisco sour') end,
  brindis = v.brindis, cena = v.cena, cena_horas = v.cena_horas
from (values
  ('Boda',                 6, 'normal',    true,  true,  true,  1.5),
  ('Evento corporativo',   4, 'tranquilo', true,  false, true,  1.0),
  ('Cumpleaños o fiesta',  5, 'fuerte',    false, false, false, 1.5),
  ('Cóctel o lanzamiento', 3, 'tranquilo', false, true,  false, 1.5)
) as v(nombre, horas, perfil, bienvenida, brindis, cena, cena_horas)
where t.nombre = v.nombre;

-- Barra de cada tipo de evento (reemplaza la mezcla en %)
delete from public.tipo_evento_recetas;
insert into public.tipo_evento_recetas (tipo_evento_id, receta_id, nivel)
select t.id, r.id, m.nivel
from (values
  ('Boda', 'Chilcano', 'principal'), ('Boda', 'Cuba libre', 'principal'), ('Boda', 'Pisco sour', 'secundario'), ('Boda', 'Gin tonic', 'ocasional'),
  ('Evento corporativo', 'Pisco sour', 'principal'), ('Evento corporativo', 'Chilcano', 'secundario'), ('Evento corporativo', 'Copa de vino', 'secundario'),
  ('Cumpleaños o fiesta', 'Cuba libre', 'principal'), ('Cumpleaños o fiesta', 'Chilcano', 'principal'), ('Cumpleaños o fiesta', 'Pisco sour', 'secundario'), ('Cumpleaños o fiesta', 'Vodka con jugo', 'ocasional'),
  ('Cóctel o lanzamiento', 'Cóctel listo', 'principal'), ('Cóctel o lanzamiento', 'Pisco sour', 'secundario'), ('Cóctel o lanzamiento', 'Copa de vino', 'secundario')
) as m(tipo, receta, nivel)
join public.tipos_evento t on t.nombre = m.tipo
join public.recetas r on r.nombre = m.receta;

-- Transición: la versión publicada todavía lee "porcentaje" hasta que se suba el código nuevo
update public.tipo_evento_recetas m
set porcentaje = greatest(1, round(100.0 * x.peso / x.total))
from (
  select tipo_evento_id, receta_id,
         case nivel when 'principal' then 3 when 'secundario' then 2 else 1 end as peso,
         sum(case nivel when 'principal' then 3 when 'secundario' then 2 else 1 end) over (partition by tipo_evento_id) as total
  from public.tipo_evento_recetas
) x
where x.tipo_evento_id = m.tipo_evento_id and x.receta_id = m.receta_id;

-- ══ 5. Cotizaciones: el evento completo se guarda para volver a abrirlo ══
do $$
declare
  d text;
begin
  select pg_get_functiondef('public.crear_cotizacion(jsonb, jsonb)'::regprocedure) into d;
  d := replace(d, 'length(p_evento::text) > 4000', 'length(p_evento::text) > 16000');
  execute d;
end $$;

-- ══ 6. Admin: guardar parámetros, tipos de evento y tragos (formato nuevo) ══
create function public.admin_guardar_parametros(p jsonb)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not privado.es_admin() then raise exception 'Solo el equipo Surtiba edita el cotizador.'; end if;
  update public.parametros_cotizador set
    no_toman_pct = (p->>'no_toman_pct')::integer,
    factor_tranquilo = (p->>'factor_tranquilo')::numeric,
    factor_normal = (p->>'factor_normal')::numeric,
    factor_fuerte = (p->>'factor_fuerte')::numeric,
    factor_dia = (p->>'factor_dia')::numeric,
    bienvenida_tragos_hora = (p->>'bienvenida_tragos_hora')::numeric,
    fiesta_primera_hora = (p->>'fiesta_primera_hora')::numeric,
    fiesta_tragos_hora = (p->>'fiesta_tragos_hora')::numeric,
    cena_copas_hora = (p->>'cena_copas_hora')::numeric,
    brindis_copas = (p->>'brindis_copas')::numeric,
    cena_receta_id = nullif(p->>'cena_receta_id', '')::uuid,
    brindis_receta_id = nullif(p->>'brindis_receta_id', '')::uuid,
    hielo_kg_persona_hora = (p->>'hielo_kg_persona_hora')::numeric,
    factor_calor = (p->>'factor_calor')::numeric,
    sin_alcohol_l_hora_toma = (p->>'sin_alcohol_l_hora_toma')::numeric,
    sin_alcohol_l_hora_no_toma = (p->>'sin_alcohol_l_hora_no_toma')::numeric,
    margen_pct = (p->>'margen_pct')::integer
  where id;
exception
  when not_null_violation or check_violation or invalid_text_representation or numeric_value_out_of_range then
    raise exception 'Revisa los valores: alguno está vacío o fuera de rango.';
end;
$$;
revoke all on function public.admin_guardar_parametros(jsonb) from public, anon;
grant execute on function public.admin_guardar_parametros(jsonb) to authenticated;

create function public.admin_guardar_tipo_evento(
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
  p_barra jsonb -- [{receta_id, nivel}]
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
    insert into public.tipos_evento (nombre, activo, horas, perfil, bienvenida, bienvenida_horas, bienvenida_receta_id, brindis, cena, cena_horas,
      tragos_primera_hora, tragos_hora_siguiente, orden)
    values (btrim(p_nombre), coalesce(p_activo, true), p_horas, p_perfil, coalesce(p_bienvenida, false), coalesce(p_bienvenida_horas, 1),
      p_bienvenida_receta, coalesce(p_brindis, false), coalesce(p_cena, false), coalesce(p_cena_horas, 1.5),
      2, 1, coalesce((select max(orden) from public.tipos_evento), 0) + 1)
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
revoke all on function public.admin_guardar_tipo_evento(uuid, text, boolean, integer, text, boolean, numeric, uuid, boolean, boolean, numeric, jsonb) from public, anon;
grant execute on function public.admin_guardar_tipo_evento(uuid, text, boolean, integer, text, boolean, numeric, uuid, boolean, boolean, numeric, jsonb) to authenticated;

create function public.admin_guardar_receta(
  p_id uuid, p_nombre text, p_categoria text, p_ml integer, p_activo boolean,
  p_mezclador text, p_mezclador_ml integer, p_limones numeric, p_jarabe_ml integer
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_id uuid := p_id;
begin
  if not privado.es_admin() then raise exception 'Solo el equipo Surtiba edita el cotizador.'; end if;
  if length(btrim(coalesce(p_nombre, ''))) not between 2 and 60 then raise exception 'Escribe el nombre del trago (2 a 60 letras).'; end if;
  if p_categoria not in ('pisco', 'ron', 'gin', 'vodka', 'vino', 'espumante', 'licor', 'coctel_listo', 'otro') then raise exception 'Elige el licor del trago.'; end if;
  if p_ml is null or p_ml not between 10 and 500 then raise exception 'Los ml de licor por trago van de 10 a 500.'; end if;

  if v_id is null then
    insert into public.recetas (nombre, categoria, ml_por_trago, activo, mezclador, mezclador_ml, limones, jarabe_ml, orden)
    values (btrim(p_nombre), p_categoria, p_ml, coalesce(p_activo, true), nullif(btrim(p_mezclador), ''), coalesce(p_mezclador_ml, 0),
      coalesce(p_limones, 0), coalesce(p_jarabe_ml, 0), coalesce((select max(orden) from public.recetas), 0) + 1)
    returning id into v_id;
  else
    update public.recetas
    set nombre = btrim(p_nombre), categoria = p_categoria, ml_por_trago = p_ml, activo = coalesce(p_activo, true),
        mezclador = nullif(btrim(p_mezclador), ''), mezclador_ml = coalesce(p_mezclador_ml, 0),
        limones = coalesce(p_limones, 0), jarabe_ml = coalesce(p_jarabe_ml, 0)
    where id = v_id;
    if not found then raise exception 'No encontramos ese trago.'; end if;
  end if;
  return v_id;
exception
  when unique_violation then raise exception 'Ya existe un trago con ese nombre.';
  when check_violation then raise exception 'Revisa los insumos: alguno está fuera de rango.';
end;
$$;
revoke all on function public.admin_guardar_receta(uuid, text, text, integer, boolean, text, integer, numeric, integer) from public, anon;
grant execute on function public.admin_guardar_receta(uuid, text, text, integer, boolean, text, integer, numeric, integer) to authenticated;
