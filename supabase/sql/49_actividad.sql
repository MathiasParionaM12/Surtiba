-- 9-nov-2026 · Admin → Actividad: últimas cuentas creadas, últimos ingresos y productos vistos. Ya aplicada en Supabase.
-- No junta datos nuevos: usa perfiles, el último ingreso que Supabase Auth ya guarda (auth.users.last_sign_in_at)
-- y la tabla eventos. Nunca devuelve correos, contraseñas ni IP. Solo el admin.
-- La "ubicación" es el distrito de la dirección habitual del perfil (lo pone el propio comprador).
create or replace function public.admin_actividad()
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $$
begin
  if not privado.es_admin() then raise exception 'Solo el equipo Surtiba ve la actividad.'; end if;
  return jsonb_build_object(
    'resumen', jsonb_build_object(
      'cuentas_7d', (select count(*) from public.perfiles where creado_en >= now() - interval '7 days'),
      'cuentas_30d', (select count(*) from public.perfiles where creado_en >= now() - interval '30 days'),
      'ingresaron_7d', (select count(*) from auth.users where last_sign_in_at >= now() - interval '7 days'),
      'vieron_7d', (select count(*) from public.eventos where tipo = 'vio_producto' and creado_en >= now() - interval '7 days')),
    'cuentas', (select coalesce(jsonb_agg(c), '[]'::jsonb) from (
      select pf.nombre, pf.empresa, pf.rol, pf.tipo_negocio as tipo, pf.distrito, m.nombre_comercial as marca, pf.creado_en
      from public.perfiles pf left join public.marcas m on m.id = pf.marca_id
      order by pf.creado_en desc limit 30) c),
    'ingresos', (select coalesce(jsonb_agg(i), '[]'::jsonb) from (
      select pf.nombre, pf.empresa, pf.rol, m.nombre_comercial as marca, u.last_sign_in_at as ingreso
      from auth.users u join public.perfiles pf on pf.id = u.id left join public.marcas m on m.id = pf.marca_id
      where u.last_sign_in_at is not null
      order by u.last_sign_in_at desc limit 30) i),
    -- Productos vistos por día, últimos 14 días (hora de Lima)
    'vistas_dia', (select coalesce(jsonb_agg(jsonb_build_object('dia', to_char(d.dia, 'DD/MM'), 'vistas', d.vistas) order by d.dia), '[]'::jsonb) from (
      select g::date as dia, (select count(*) from public.eventos e where e.tipo = 'vio_producto'
        and (e.creado_en at time zone 'America/Lima')::date = g::date) as vistas
      from generate_series((now() at time zone 'America/Lima')::date - 13, (now() at time zone 'America/Lima')::date, interval '1 day') g) d)
  );
end;
$$;
revoke execute on function public.admin_actividad() from public, anon;
grant execute on function public.admin_actividad() to authenticated;
