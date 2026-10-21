-- 21-oct-2026 · KPIs del panel de la marca. Ya aplicada en Supabase.
-- Calcula todo para la marca de la sesión (privado.mi_marca_id()) y devuelve SOLO totales:
-- nunca nombres ni datos de compradores. Es SECURITY DEFINER porque usa tablas que la marca no lee
-- directo (pedidos para saber si fue encargo, cotizaciones para contar en cuántas salió).

create or replace function public.marca_insights()
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $$
declare
  v_marca uuid := privado.mi_marca_id();
  v_mes timestamptz := date_trunc('month', now() at time zone 'America/Lima') at time zone 'America/Lima';
  v_mes_anterior timestamptz := (date_trunc('month', now() at time zone 'America/Lima') - interval '1 month') at time zone 'America/Lima';
  r jsonb;
begin
  if v_marca is null then raise exception 'Solo para cuentas de marca.'; end if;

  select jsonb_build_object(
    'hoy', jsonb_build_object(
      'por_confirmar', count(*) filter (where estado = 'por_confirmar'),
      'por_preparar', count(*) filter (where estado = 'pendiente'),
      'esperando_recojo', count(*) filter (where estado = 'listo_recojo')),
    'mes', jsonb_build_object(
      'ventas', coalesce(sum(total_centimos) filter (where estado = 'entregado' and entregado_en >= v_mes), 0),
      'cajas', coalesce(sum(total_cajas) filter (where estado = 'entregado' and entregado_en >= v_mes), 0),
      'entregas', count(*) filter (where estado = 'entregado' and entregado_en >= v_mes)),
    'mes_anterior', jsonb_build_object(
      'ventas', coalesce(sum(total_centimos) filter (where estado = 'entregado' and entregado_en >= v_mes_anterior and entregado_en < v_mes), 0),
      'cajas', coalesce(sum(total_cajas) filter (where estado = 'entregado' and entregado_en >= v_mes_anterior and entregado_en < v_mes), 0),
      'entregas', count(*) filter (where estado = 'entregado' and entregado_en >= v_mes_anterior and entregado_en < v_mes)),
    'cumplimiento', jsonb_build_object(
      -- Últimos 90 días. Un encargo aceptado es el que tiene fecha prometida.
      'encargos_aceptados', count(*) filter (where fecha_disponible is not null and creado_en >= now() - interval '90 days'),
      'no_atendidas', count(*) filter (where estado = 'rechazado' and creado_en >= now() - interval '90 days'),
      'dias_hasta_listo', round((avg(extract(epoch from (listo_en - creado_en)) / 86400)
        filter (where listo_en is not null and creado_en >= now() - interval '90 days'))::numeric, 1))
  ) into r
  from public.subpedidos where marca_id = v_marca;

  r := r || jsonb_build_object(
    -- Los 3 productos con más cajas entregadas en 90 días
    'estrella', (select coalesce(jsonb_agg(jsonb_build_object('nombre', nombre, 'cajas', cajas) order by cajas desc), '[]'::jsonb)
      from (select pr.nombre, sum(i.cajas)::int as cajas
            from public.items i
            join public.subpedidos s on s.id = i.subpedido_id
            join public.productos pr on pr.id = i.producto_id
            where s.marca_id = v_marca and s.estado = 'entregado' and s.entregado_en >= now() - interval '90 days'
            group by pr.nombre order by 2 desc limit 3) t),
    -- Cajas que pidieron por encargo (más de lo que había en stock) en 30 días
    'demanda_encargo', (select coalesce(jsonb_agg(jsonb_build_object('nombre', nombre, 'cajas', cajas) order by cajas desc), '[]'::jsonb)
      from (select pr.nombre, sum(i.cajas - i.cajas_reservadas)::int as cajas
            from public.items i
            join public.subpedidos s on s.id = i.subpedido_id
            join public.pedidos p on p.id = s.pedido_id
            join public.productos pr on pr.id = i.producto_id
            where s.marca_id = v_marca and p.tipo = 'encargo' and i.cajas > i.cajas_reservadas
              and s.creado_en >= now() - interval '30 days'
            group by pr.nombre order by 2 desc limit 3) t),
    -- En cuántas cotizaciones de eventos salió algún producto de la marca (30 días)
    'cotizaciones', (select count(*) from public.cotizaciones c
      where c.creado_en >= now() - interval '30 days'
        and exists (select 1 from jsonb_array_elements(c.items) e where e->>'marca_id' = v_marca::text))
  );
  return r;
end;
$$;

revoke execute on function public.marca_insights() from public, anon;
grant execute on function public.marca_insights() to authenticated;
