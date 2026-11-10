-- 10-nov-2026 · Preparación para la evaluación del experimento. Ya aplicada en Supabase.
-- 1. Categorías nuevas según los productos reales: "jarabe" y "crema_pisco" (cremas y macerados de pisco).
-- 2. Descripción del producto (la escribe la marca). El registro sanitario sale de la ficha del producto: la marca
--    lo sube como documento en su cuenta (bucket privado "documentos").
-- 3. Ingredientes y tragos nuevos con los productos de las marcas reales.
-- 4. Métricas del cotizador: evento "inicio_cotizacion" (para contar las cotizaciones abandonadas). El tiempo para
--    generar una cotización viaja dentro de cotizaciones.evento (segundos).
-- 5. Retroalimentación de compradores y marcas (tabla nueva con RLS).

-- ══ 1. Categorías ═══
alter table public.productos drop constraint productos_categoria_check;
alter table public.productos add constraint productos_categoria_check
  check (categoria in ('pisco', 'ron', 'gin', 'vodka', 'vino', 'espumante', 'licor', 'coctel_listo', 'crema_pisco', 'jarabe', 'otro'));
alter table public.recetas drop constraint recetas_categoria_check;
alter table public.recetas add constraint recetas_categoria_check
  check (categoria in ('pisco', 'ron', 'gin', 'vodka', 'vino', 'espumante', 'licor', 'coctel_listo', 'crema_pisco', 'jarabe', 'otro'));
alter table public.ingredientes drop constraint ingredientes_categoria_check;
alter table public.ingredientes add constraint ingredientes_categoria_check
  check (categoria is null or categoria in ('pisco', 'ron', 'gin', 'vodka', 'vino', 'espumante', 'licor', 'coctel_listo', 'crema_pisco', 'jarabe', 'otro'));

-- Productos reales a su categoría (por su nombre)
update public.productos set categoria = 'jarabe' where nombre ilike 'jarabe%';
update public.productos set categoria = 'crema_pisco' where nombre ilike 'crema con pisco%' or nombre ilike 'macerado en pisco%';
update public.productos set categoria = 'licor' where nombre ilike 'anisado%';

-- ══ 2. Descripción del producto ═══
alter table public.productos add column descripcion text check (descripcion is null or length(descripcion) <= 600);

-- El visitante también la ve (vista pública del catálogo, con los permisos de quien consulta: se agrega al final)
grant select (descripcion) on public.productos to anon;
create or replace view public.catalogo_publico with (security_invoker = true) as
 SELECT p.id, p.marca_id, m.nombre_comercial AS marca, p.nombre, p.categoria, p.ml, p.grado, p.unidades_por_caja, p.foto_url,
    e.precio_caja_centimos, p.descripcion
   FROM ((public.productos p
     JOIN public.marcas m ON ((m.id = p.marca_id)))
     JOIN public.escalas_precio e ON (((e.producto_id = p.id) AND (e.desde_cajas = 1))))
  WHERE (p.activo AND m.activa AND (p.revision = 'aprobado'::text));

drop function public.guardar_producto(uuid, text, text, integer, numeric, integer, text, integer, boolean, jsonb, uuid);
create function public.guardar_producto(p_id uuid, p_nombre text, p_categoria text, p_ml integer, p_grado numeric, p_unidades integer,
  p_descripcion text, p_stock integer, p_activo boolean, p_tramos jsonb, p_marca_id uuid default null)
 returns uuid
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_marca uuid;
  v_id uuid := p_id;
  v_desde_anterior integer := 0;
  t record;
  v_revisar boolean := false;
  v_descripcion text := nullif(btrim(coalesce(p_descripcion, '')), '');
begin
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

  if nullif(btrim(p_nombre), '') is null then raise exception 'Escribe el nombre del producto.'; end if;
  if p_categoria not in ('pisco', 'ron', 'gin', 'vodka', 'vino', 'espumante', 'licor', 'coctel_listo', 'crema_pisco', 'jarabe', 'otro') then
    raise exception 'Elige una categoría.';
  end if;
  if length(v_descripcion) > 600 then raise exception 'La descripción va hasta 600 letras.'; end if;
  if p_ml is null or p_ml < 1 then raise exception 'Los ml por botella deben ser mayores que 0.'; end if;
  if p_grado is null or p_grado < 0 or p_grado > 100 then raise exception 'El grado debe estar entre 0 y 100.'; end if;
  if p_unidades is null or p_unidades < 1 then raise exception 'Las unidades por caja deben ser al menos 1.'; end if;
  if p_id is null and (p_stock is null or p_stock < 0) then raise exception 'El stock no puede ser negativo.'; end if;

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

  if v_id is null then
    insert into public.productos (marca_id, nombre, categoria, ml, grado, unidades_por_caja, descripcion, stock_cajas, activo, revision)
    values (v_marca, btrim(p_nombre), p_categoria, p_ml, p_grado, p_unidades, v_descripcion, p_stock, coalesce(p_activo, true),
            case when privado.es_admin() then 'aprobado' else 'pendiente' end)
    returning id into v_id;
    v_revisar := not privado.es_admin();
  else
    update public.productos
    set nombre = btrim(p_nombre), categoria = p_categoria, ml = p_ml, grado = p_grado, unidades_por_caja = p_unidades,
        descripcion = v_descripcion, activo = coalesce(p_activo, true)
    where id = v_id;
    -- Si estaba rechazado y la marca lo corrige, vuelve a revisión
    if not privado.es_admin() then
      update public.productos set revision = 'pendiente', motivo_revision = null where id = v_id and revision = 'rechazado';
      v_revisar := found;
    end if;
  end if;

  delete from public.escalas_precio where producto_id = v_id;
  insert into public.escalas_precio (producto_id, desde_cajas, hasta_cajas, precio_caja_centimos)
  select v_id,
         (e->>'desde')::integer,
         (lead((e->>'desde')::integer) over (order by (e->>'desde')::integer)) - 1,
         (e->>'precio')::integer
  from jsonb_array_elements(p_tramos) e;

  if v_revisar then
    perform privado.avisar_admins(
      (select m.nombre_comercial from public.marcas m where m.id = v_marca) || ' subió un producto para revisar: ' || btrim(p_nombre) || '.',
      '/admin/productos');
  end if;

  return v_id;
end;
$function$;
revoke execute on function public.guardar_producto(uuid, text, text, integer, numeric, integer, text, integer, boolean, jsonb, uuid) from public, anon;
grant execute on function public.guardar_producto(uuid, text, text, integer, numeric, integer, text, integer, boolean, jsonb, uuid) to authenticated;

-- ══ 3. Ingredientes y tragos con los productos reales ═══
-- El editor de ingredientes del admin acepta las categorías nuevas (las "genéricas" se reconocen por palabras)
do $$
declare v_def text;
begin
  select pg_get_functiondef('public.admin_guardar_ingrediente(uuid, text, text, text, boolean, numeric, integer, text)'::regprocedure) into v_def;
  if position($q$'licor', 'coctel_listo', 'otro')$q$ in v_def) = 0 or position($q$v_categoria in ('licor', 'otro')$q$ in v_def) = 0 then
    raise exception 'admin_guardar_ingrediente cambió: revisar a mano';
  end if;
  v_def := replace(v_def, $q$'licor', 'coctel_listo', 'otro')$q$, $q$'licor', 'coctel_listo', 'crema_pisco', 'jarabe', 'otro')$q$);
  v_def := replace(v_def, $q$v_categoria in ('licor', 'otro')$q$, $q$v_categoria in ('licor', 'otro', 'jarabe', 'crema_pisco')$q$);
  execute v_def;
end $$;

update public.ingredientes set categoria = 'jarabe' where nombre in ('Jarabe de goma', 'Jarabe de granadina');
-- "Licor de blue curaco Le Mans": se reconoce también por "blue"
update public.ingredientes set palabras = '{curaçao,curacao,blue}' where nombre = 'Blue curaçao';
insert into public.ingredientes (nombre, unidad, categoria, orden, presentacion, precio_supuesto_centimos, palabras) values
  ('Crema de pisco', 'ml', 'crema_pisco', 14, 750, 4500, '{crema}'),
  ('Macerado de pisco', 'ml', 'crema_pisco', 15, 750, 4500, '{macerado}'),
  ('Anisado', 'ml', 'licor', 16, 750, 3500, '{anisado,anís}');

insert into public.recetas (nombre, categoria, ml_por_trago, activo, orden) values
  ('Crema de pisco en las rocas', 'crema_pisco', 90, true, 38),
  ('Crema de pisco frappé', 'crema_pisco', 60, true, 39),
  ('Chilcano de macerado', 'crema_pisco', 60, true, 40),
  ('Macerado con tónica', 'crema_pisco', 60, true, 41),
  ('Pisco puro (copita)', 'pisco', 45, true, 42),
  ('Anisado con hielo', 'licor', 60, true, 43),
  ('Copa de cognac', 'licor', 45, true, 44);
insert into public.receta_ingredientes (receta_id, ingrediente_id, cantidad)
select r.id, i.id, v.cantidad
from (values
  ('Crema de pisco en las rocas', 'Crema de pisco', 90),
  ('Crema de pisco frappé', 'Crema de pisco', 60), ('Crema de pisco frappé', 'Leche evaporada', 30),
  ('Chilcano de macerado', 'Macerado de pisco', 60), ('Chilcano de macerado', 'Ginger ale', 120), ('Chilcano de macerado', 'Limón', 0.5),
  ('Chilcano de macerado', 'Amargo de angostura', 1),
  ('Macerado con tónica', 'Macerado de pisco', 60), ('Macerado con tónica', 'Agua tónica', 120), ('Macerado con tónica', 'Limón', 0.25),
  ('Pisco puro (copita)', 'Pisco', 45),
  ('Anisado con hielo', 'Anisado', 60),
  ('Copa de cognac', 'Cognac', 45)
) as v(receta, ingrediente, cantidad)
join public.recetas r on r.nombre = v.receta
join public.ingredientes i on i.nombre = v.ingrediente;

-- ══ 4. Evento "empezó a cotizar" ═══
alter table public.eventos drop constraint eventos_tipo_check;
alter table public.eventos add constraint eventos_tipo_check
  check (tipo in ('vio_producto', 'agrego_carrito', 'inicio_pedido', 'inicio_cotizacion'));
create or replace function public.registrar_evento(p_tipo text, p_producto uuid default null)
returns void language plpgsql security definer set search_path to '' as $$
begin
  if p_tipo not in ('vio_producto', 'agrego_carrito', 'inicio_pedido', 'inicio_cotizacion') then return; end if;
  insert into public.eventos (tipo, producto_id, perfil_id)
  values (p_tipo, (select id from public.productos where id = p_producto), (select auth.uid()));
end $$;

-- ══ 5. Retroalimentación ═══
-- El comprador la deja al terminar su cotización; la marca, desde su panel. Solo el autor y el admin la leen.
create table public.retroalimentacion (
  id bigint generated always as identity primary key,
  perfil_id uuid not null default auth.uid() references public.perfiles (id) on delete cascade,
  contexto text not null check (contexto in ('cotizacion', 'marca')),
  cotizacion_id uuid references public.cotizaciones (id) on delete set null,
  puntaje smallint check (puntaje between 1 and 5),
  mejorar text check (mejorar is null or length(mejorar) <= 1000),
  fallos text check (fallos is null or length(fallos) <= 1000),
  creado_en timestamptz not null default now(),
  check (puntaje is not null or mejorar is not null or fallos is not null)
);
create index retroalimentacion_fecha_idx on public.retroalimentacion (creado_en desc);
alter table public.retroalimentacion enable row level security;
revoke all on public.retroalimentacion from anon, authenticated;
grant select on public.retroalimentacion to authenticated;
grant insert (contexto, cotizacion_id, puntaje, mejorar, fallos) on public.retroalimentacion to authenticated;
create policy "retroalimentacion: el autor y el admin la ven" on public.retroalimentacion
  for select to authenticated using (perfil_id = (select auth.uid()) or (select privado.es_admin()));
-- Solo a su nombre; la cotización (si va) tiene que ser suya
create policy "retroalimentacion: cada uno deja la suya" on public.retroalimentacion
  for insert to authenticated with check (
    perfil_id = (select auth.uid())
    and (cotizacion_id is null or exists (select 1 from public.cotizaciones c where c.id = cotizacion_id and c.comprador_id = (select auth.uid()))));

-- ══ 6. Documentos de la marca (registros sanitarios y otros) ═══
-- Bucket privado. Cada cuenta sube, ve y borra solo en su carpeta (<su id>/...). El admin los ve todos.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documentos', 'documentos', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);
create policy "documentos: cada uno ve su carpeta (admin todas)" on storage.objects
  for select to authenticated
  using (bucket_id = 'documentos' and ((storage.foldername(name))[1] = (select auth.uid())::text or (select privado.es_admin())));
create policy "documentos: cada uno sube en su carpeta" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'documentos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "documentos: cada uno borra lo de su carpeta" on storage.objects
  for delete to authenticated
  using (bucket_id = 'documentos' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- La algarrobina del cóctel es un jarabe: así no la cubre la "Crema con Pisco de Algarrobina" (los ingredientes
-- genéricos solo buscan productos de su misma categoría o de "otro")
update public.ingredientes set categoria = 'jarabe' where nombre = 'Algarrobina';
