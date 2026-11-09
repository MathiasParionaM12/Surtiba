-- 9-nov-2026 · Cotizador: lo que Surtiba no tiene también cuesta, bartender por hora y tragos nuevos. Ya aplicada en Supabase.
-- 1. Cada ingrediente tiene un precio supuesto y cómo se compra (botella de 750 ml, litro, unidad…). Con eso
--    "Tu precio para el cliente" suma lo que el comprador consigue por su cuenta (ron, gaseosas, limones…).
--    Son supuestos de Surtiba (aprobados por Mathias el 9-nov-2026): el comprador los cambia en su cotización.
-- 2. "palabras": cómo se reconoce un producto por su nombre. Los licores y los jarabes no tienen categoría propia
--    en el catálogo: "Jarabe de goma Valle Real" cubre el jarabe de goma porque su nombre dice "jarabe de goma".
-- 3. Ingredientes nuevos (blue curaçao, cognac) y tragos nuevos. Los que Surtiba aún no vende quedan listos para
--    cuando una marca los suba.
-- 4. Bartender: S/ 50 por hora, mínimo 3 horas. Agua y gaseosas para tomar solas: S/ 3 por litro.

-- 1 y 2. Columnas nuevas de ingredientes
alter table public.ingredientes drop constraint ingredientes_categoria_check;
alter table public.ingredientes add constraint ingredientes_categoria_check
  check (categoria is null or categoria in ('pisco', 'ron', 'gin', 'vodka', 'vino', 'espumante', 'licor', 'coctel_listo', 'otro'));
alter table public.ingredientes
  add column presentacion numeric not null default 1 check (presentacion > 0 and presentacion <= 100000),
  add column precio_supuesto_centimos integer not null default 0 check (precio_supuesto_centimos between 0 and 1000000),
  add column palabras text[] not null default '{}' check (cardinality(palabras) <= 5);

-- 3. Ingredientes nuevos
insert into public.ingredientes (nombre, unidad, categoria, orden) values
  ('Blue curaçao', 'ml', 'licor', 13),
  ('Cognac', 'ml', 'licor', 22);
update public.ingredientes set nombre = 'Jarabe de granadina' where nombre = 'Granadina';

-- Categoría, presentación (en la unidad del ingrediente), precio supuesto (céntimos) y palabras para reconocerlo
update public.ingredientes i set categoria = v.categoria, presentacion = v.presentacion, precio_supuesto_centimos = v.precio, palabras = v.palabras
from (values
  ('Pisco', 'pisco', 750, 4000, '{pisco}'::text[]),
  ('Ron', 'ron', 750, 3500, '{ron}'),
  ('Gin', 'gin', 750, 6000, '{gin}'),
  ('Vodka', 'vodka', 750, 3500, '{vodka}'),
  ('Vino', 'vino', 750, 2500, '{vino}'),
  ('Espumante', 'espumante', 750, 3000, '{espumante}'),
  ('Cóctel listo', 'coctel_listo', 750, 2500, '{coctel,cóctel}'),
  ('Triple sec', 'licor', 750, 4500, '{triple sec}'),
  ('Licor de menta', 'licor', 750, 4500, '{menta}'),
  ('Vermouth rojo', 'licor', 750, 4500, '{vermouth,vermut}'),
  ('Campari', 'licor', 750, 5500, '{campari}'),
  ('Aperol', 'licor', 750, 6000, '{aperol}'),
  ('Blue curaçao', 'licor', 750, 4500, '{curaçao,curacao}'),
  ('Tequila', 'licor', 750, 7000, '{tequila}'),
  ('Whisky', 'licor', 750, 7000, '{whisky,whiskey}'),
  ('Cognac', 'licor', 750, 12000, '{cognac,coñac}'),
  ('Jarabe de goma', 'otro', 1000, 1200, '{jarabe de goma}'),
  ('Jarabe de granadina', 'otro', 1000, 1500, '{granadina}'),
  ('Amargo de angostura', 'otro', 200, 4500, '{angostura}'),
  ('Algarrobina', 'otro', 500, 1500, '{algarrobina}')
) as v(nombre, categoria, presentacion, precio, palabras)
where i.nombre = v.nombre;

-- Lo que Surtiba no vende: solo presentación y precio supuesto
update public.ingredientes i set presentacion = v.presentacion, precio_supuesto_centimos = v.precio
from (values
  ('Limón', 1, 30),
  ('Clara de huevo', 1, 50),
  ('Leche evaporada', 400, 450),
  ('Hierbabuena', 100, 300),
  ('Crema de coco', 400, 1200),
  ('Fruta picada', 1000, 800),
  ('Ginger ale', 1500, 600),
  ('Gaseosa cola', 3000, 1100),
  ('Agua tónica', 1500, 600),
  ('Soda', 1500, 500),
  ('Gaseosa de limón', 3000, 1000),
  ('Jugo de naranja', 1000, 700),
  ('Jugo de maracuyá', 1000, 800),
  ('Jugo de piña', 1000, 700),
  ('Jugo de arándano', 1000, 1200),
  ('Cerveza', 1, 400)
) as v(nombre, presentacion, precio)
where i.nombre = v.nombre;

-- Tragos nuevos (con nombres que se usan en Lima). El licor principal es el ingrediente de Surtiba con más ml.
insert into public.recetas (nombre, categoria, ml_por_trago, activo, orden) values
  ('Chilcano azul', 'pisco', 60, true, 27),
  ('Laguna azul', 'vodka', 40, true, 28),
  ('Piña colada azul', 'ron', 40, true, 29),
  ('Pisco sunrise', 'pisco', 50, true, 30),
  ('Old fashioned de pisco', 'pisco', 60, true, 31),
  ('Cóctel de espumante', 'espumante', 120, true, 32),
  ('Vino con cola', 'vino', 100, true, 33),
  ('Cognac con ginger ale', 'licor', 50, true, 34),
  ('Cognac con menta', 'licor', 50, true, 35),
  ('Sidecar', 'licor', 50, true, 36),
  ('Menta frappé', 'licor', 60, true, 37);

insert into public.receta_ingredientes (receta_id, ingrediente_id, cantidad)
select r.id, i.id, v.cantidad
from (values
  ('Chilcano azul', 'Pisco', 60), ('Chilcano azul', 'Blue curaçao', 15), ('Chilcano azul', 'Ginger ale', 120), ('Chilcano azul', 'Limón', 0.5),
  ('Laguna azul', 'Vodka', 40), ('Laguna azul', 'Blue curaçao', 20), ('Laguna azul', 'Gaseosa de limón', 120), ('Laguna azul', 'Limón', 0.5),
  ('Piña colada azul', 'Ron', 40), ('Piña colada azul', 'Blue curaçao', 20), ('Piña colada azul', 'Crema de coco', 30), ('Piña colada azul', 'Jugo de piña', 90),
  ('Pisco sunrise', 'Pisco', 50), ('Pisco sunrise', 'Jugo de naranja', 120), ('Pisco sunrise', 'Jarabe de granadina', 15),
  ('Old fashioned de pisco', 'Pisco', 60), ('Old fashioned de pisco', 'Jarabe de goma', 10), ('Old fashioned de pisco', 'Amargo de angostura', 2),
  ('Cóctel de espumante', 'Espumante', 120), ('Cóctel de espumante', 'Jarabe de goma', 10), ('Cóctel de espumante', 'Amargo de angostura', 1),
  ('Vino con cola', 'Vino', 100), ('Vino con cola', 'Gaseosa cola', 100), ('Vino con cola', 'Limón', 0.25),
  ('Cognac con ginger ale', 'Cognac', 50), ('Cognac con ginger ale', 'Ginger ale', 150), ('Cognac con ginger ale', 'Limón', 0.25),
  ('Cognac con menta', 'Cognac', 50), ('Cognac con menta', 'Licor de menta', 20),
  ('Sidecar', 'Cognac', 50), ('Sidecar', 'Triple sec', 20), ('Sidecar', 'Limón', 1), ('Sidecar', 'Jarabe de goma', 10),
  ('Menta frappé', 'Licor de menta', 60)
) as v(receta, ingrediente, cantidad)
join public.recetas r on r.nombre = v.receta
join public.ingredientes i on i.nombre = v.ingrediente;

-- 4. Bartender por hora y agua para tomar sola
alter table public.parametros_cotizador
  add column bartender_horas_minimo integer not null default 3 check (bartender_horas_minimo between 0 and 12),
  add column precio_litro_sin_alcohol_centimos integer not null default 300 check (precio_litro_sin_alcohol_centimos between 0 and 10000);
update public.parametros_cotizador set precio_bartender_centimos = 5000 where id; -- ahora es S/ por hora

create or replace function public.admin_guardar_parametros(p jsonb)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $function$
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
    margen_pct = (p->>'margen_pct')::integer,
    invitados_por_bartender = (p->>'invitados_por_bartender')::integer,
    precio_bartender_centimos = (p->>'precio_bartender_centimos')::integer,
    bartender_horas_minimo = (p->>'bartender_horas_minimo')::integer,
    vasos_por_toma = (p->>'vasos_por_toma')::numeric,
    precio_vaso_centimos = (p->>'precio_vaso_centimos')::integer,
    precio_bolsa_hielo_centimos = (p->>'precio_bolsa_hielo_centimos')::integer,
    precio_litro_sin_alcohol_centimos = (p->>'precio_litro_sin_alcohol_centimos')::integer
  where id;
exception
  when not_null_violation or check_violation or invalid_text_representation or numeric_value_out_of_range then
    raise exception 'Revisa los valores: alguno está vacío o fuera de rango.';
end;
$function$;

-- El admin edita también la presentación, el precio supuesto y las palabras de cada ingrediente
drop function public.admin_guardar_ingrediente(uuid, text, text, text, boolean);
create function public.admin_guardar_ingrediente(
  p_id uuid, p_nombre text, p_unidad text, p_categoria text, p_activo boolean,
  p_presentacion numeric, p_precio_supuesto_centimos integer, p_palabras text)
returns uuid
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_id uuid := p_id;
  v_categoria text := nullif(btrim(coalesce(p_categoria, '')), '');
  -- "jarabe de goma, goma" -> {jarabe de goma, goma} (en minúsculas, sin vacíos)
  v_palabras text[] := coalesce((
    select array_agg(distinct lower(btrim(x))) from unnest(string_to_array(coalesce(p_palabras, ''), ',')) x
    where length(btrim(x)) between 2 and 30), '{}');
begin
  if not privado.es_admin() then raise exception 'Solo el equipo Surtiba edita el cotizador.'; end if;
  if length(btrim(coalesce(p_nombre, ''))) not between 2 and 40 then raise exception 'Escribe el nombre del ingrediente (2 a 40 letras).'; end if;
  if p_unidad not in ('ml', 'unidad', 'g') then raise exception 'Elige la unidad: ml, unidades o gramos.'; end if;
  if v_categoria is not null and v_categoria not in ('pisco', 'ron', 'gin', 'vodka', 'vino', 'espumante', 'licor', 'coctel_listo', 'otro') then
    raise exception 'Elige qué categoría de Surtiba lo cubre, o "No lo vende".';
  end if;
  if v_categoria is not null and p_unidad <> 'ml' then raise exception 'Lo que vende Surtiba se mide en ml.'; end if;
  if v_categoria in ('licor', 'otro') and cardinality(v_palabras) = 0 then
    raise exception 'Escribe cómo reconocerlo en el nombre del producto (por ejemplo: menta).';
  end if;
  if cardinality(v_palabras) > 5 then raise exception 'Pon hasta 5 palabras para reconocerlo.'; end if;
  if coalesce(p_presentacion, 0) not between 0.01 and 100000 then raise exception 'Escribe cuánto trae lo que compras (por ejemplo 750 ml).'; end if;
  if coalesce(p_precio_supuesto_centimos, -1) not between 0 and 1000000 then raise exception 'Revisa el precio supuesto.'; end if;

  if v_id is null then
    insert into public.ingredientes (nombre, unidad, categoria, activo, orden, presentacion, precio_supuesto_centimos, palabras)
    values (btrim(p_nombre), p_unidad, v_categoria, coalesce(p_activo, true), coalesce((select max(orden) from public.ingredientes), 0) + 1,
      p_presentacion, p_precio_supuesto_centimos, v_palabras)
    returning id into v_id;
  else
    update public.ingredientes
    set nombre = btrim(p_nombre), unidad = p_unidad, categoria = v_categoria, activo = coalesce(p_activo, true),
        presentacion = p_presentacion, precio_supuesto_centimos = p_precio_supuesto_centimos, palabras = v_palabras
    where id = v_id;
    if not found then raise exception 'No encontramos ese ingrediente.'; end if;
  end if;
  return v_id;
exception
  when unique_violation then raise exception 'Ya existe un ingrediente con ese nombre.';
end;
$$;
revoke execute on function public.admin_guardar_ingrediente(uuid, text, text, text, boolean, numeric, integer, text) from public, anon;
grant execute on function public.admin_guardar_ingrediente(uuid, text, text, text, boolean, numeric, integer, text) to authenticated;
