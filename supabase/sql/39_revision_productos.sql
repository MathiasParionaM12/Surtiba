-- 5-nov-2026 · Aprobación de productos (Mathias): lo que crea una marca queda "pendiente" y solo aparece en el
-- catálogo cuando el admin lo aprueba. Ya aplicada en Supabase.
-- · Los productos que ya existían quedan aprobados.
-- · Lo que crea el admin entra aprobado. Si la marca corrige uno rechazado, vuelve a "pendiente".
-- · Editar un producto ya aprobado (precio, stock, fotos) no pide aprobación otra vez.
-- · La marca no puede cambiar "revision" (no tiene permiso sobre esa columna): solo con guardar_producto o el admin.

-- ══ 1. Columnas ═══
alter table public.productos
  add column revision text not null default 'pendiente' check (revision in ('pendiente', 'aprobado', 'rechazado')),
  add column motivo_revision text check (motivo_revision is null or length(btrim(motivo_revision)) between 5 and 300);
update public.productos set revision = 'aprobado';
-- Los visitantes leen productos columna por columna: sin esto, la vista catalogo_publico (que filtra por revision) falla
grant select (revision) on public.productos to anon;

-- ══ 2. Compradores y visitantes ven solo lo aprobado (la marca ve los suyos; el admin, todo) ═══
drop policy "productos: ver según rol" on public.productos;
create policy "productos: ver según rol" on public.productos for select to authenticated using (
  ((select privado.mi_rol()) = 'comprador' and activo and revision = 'aprobado' and privado.marca_activa(marca_id))
  or marca_id = (select privado.mi_marca_id())
  or (select privado.es_admin())
);
drop policy "productos: visitantes ven los activos" on public.productos;
create policy "productos: visitantes ven los activos" on public.productos for select to anon using (
  activo and revision = 'aprobado' and privado.marca_activa(marca_id)
);

create or replace view public.catalogo_publico with (security_invoker = true) as
  select p.id, p.marca_id, m.nombre_comercial as marca, p.nombre, p.categoria, p.ml, p.grado, p.unidades_por_caja,
         p.foto_url, e.precio_caja_centimos
  from public.productos p
  join public.marcas m on m.id = p.marca_id
  join public.escalas_precio e on e.producto_id = p.id and e.desde_cajas = 1
  where p.activo and m.activa and p.revision = 'aprobado';

-- ══ 3. guardar_producto: la marca crea en "pendiente" y avisa al admin ═══
do $$
declare
  v_def text := pg_get_functiondef('public.guardar_producto(uuid, text, text, integer, numeric, integer, text, integer, boolean, jsonb, uuid)'::regprocedure);
  v_nuevo text := v_def;
  v_partes text[] := array[
    E'  t record;\nbegin',
    E'    insert into public.productos (marca_id, nombre, categoria, ml, grado, unidades_por_caja, registro_sanitario, stock_cajas, activo)\n    values (v_marca, btrim(p_nombre), p_categoria, p_ml, p_grado, p_unidades, nullif(btrim(p_registro), ''''), p_stock, coalesce(p_activo, true))\n    returning id into v_id;',
    E'        registro_sanitario = nullif(btrim(p_registro), ''''), activo = coalesce(p_activo, true)\n    where id = v_id;'
  ];
  v_cambios text[] := array[
    E'  t record;\n  v_revisar boolean := false;\nbegin',
    E'    insert into public.productos (marca_id, nombre, categoria, ml, grado, unidades_por_caja, registro_sanitario, stock_cajas, activo, revision)\n    values (v_marca, btrim(p_nombre), p_categoria, p_ml, p_grado, p_unidades, nullif(btrim(p_registro), ''''), p_stock, coalesce(p_activo, true),\n            case when privado.es_admin() then ''aprobado'' else ''pendiente'' end)\n    returning id into v_id;\n    v_revisar := not privado.es_admin();',
    E'        registro_sanitario = nullif(btrim(p_registro), ''''), activo = coalesce(p_activo, true)\n    where id = v_id;\n    -- Si estaba rechazado y la marca lo corrige, vuelve a revisión\n    if not privado.es_admin() then\n      update public.productos set revision = ''pendiente'', motivo_revision = null where id = v_id and revision = ''rechazado'';\n      v_revisar := found;\n    end if;'
  ];
  i integer;
begin
  for i in 1 .. array_length(v_partes, 1) loop
    if position(v_partes[i] in v_nuevo) = 0 then raise exception 'guardar_producto no tiene la forma esperada (parte %): revisar a mano.', i; end if;
    v_nuevo := replace(v_nuevo, v_partes[i], v_cambios[i]);
  end loop;
  -- Al final: aviso al admin si hay algo nuevo por revisar
  v_nuevo := replace(v_nuevo, E'\n  return v_id;\nend;',
    E'\n  if v_revisar then\n    perform privado.avisar_admins(\n      (select m.nombre_comercial from public.marcas m where m.id = v_marca) || '' subió un producto para revisar: '' || btrim(p_nombre) || ''.'',\n      ''/admin/productos'');\n  end if;\n\n  return v_id;\nend;');
  if position('v_revisar then' in v_nuevo) = 0 then raise exception 'No pude agregar el aviso al admin.'; end if;
  execute v_nuevo;
end $$;

-- ══ 4. El admin aprueba o rechaza (con motivo) y la marca recibe un aviso ═══
create or replace function public.admin_revisar_producto(p_producto uuid, p_aprueba boolean, p_motivo text default null)
returns void language plpgsql security definer set search_path to '' as $$
declare
  p public.productos;
begin
  if not privado.es_admin() then raise exception 'Solo el equipo Surtiba revisa productos.'; end if;
  if not p_aprueba and (p_motivo is null or length(btrim(p_motivo)) < 5) then
    raise exception 'Escribe el motivo del rechazo para que la marca pueda corregirlo.';
  end if;
  update public.productos
  set revision = case when p_aprueba then 'aprobado' else 'rechazado' end,
      motivo_revision = case when p_aprueba then null else btrim(p_motivo) end
  where id = p_producto and revision = 'pendiente'
  returning * into p;
  if p.id is null then raise exception 'Ese producto no existe o ya fue revisado.'; end if;
  perform privado.avisar_marca(p.marca_id,
    case when p_aprueba then 'Aprobamos ' || p.nombre || ': ya está en el catálogo.'
         else 'No aprobamos ' || p.nombre || ': ' || btrim(p_motivo) end,
    '/marca/productos/' || p.id);
end $$;
revoke execute on function public.admin_revisar_producto(uuid, boolean, text) from public, anon;
grant execute on function public.admin_revisar_producto(uuid, boolean, text) to authenticated;

-- ══ 5. Permisos por columna de verdad (5-nov-2026) ═══
-- Supabase da permiso sobre la tabla entera, y eso anula los permisos por columna: la marca podía cambiar
-- "revision" y aprobarse sola. La app solo escribe directo el stock y la foto; lo demás pasa por guardar_producto.
revoke insert, update, delete on public.productos from authenticated, anon;
grant update (stock_cajas, foto_url) on public.productos to authenticated;
