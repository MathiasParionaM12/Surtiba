-- 21-oct-2026 · Métricas del panel admin (/admin/metricas). Ya aplicada en Supabase.
-- Todo en una función (solo el admin): ventas por semana y del mes, embudo, operación, marcas,
-- compradores y productos. Lo "vendido" cuenta solo lo ENTREGADO (docs/modelo-datos.md).

create or replace function public.admin_insights()
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $$
declare
  v_mes timestamptz := date_trunc('month', now() at time zone 'America/Lima') at time zone 'America/Lima';
  v_mes_anterior timestamptz := (date_trunc('month', now() at time zone 'America/Lima') - interval '1 month') at time zone 'America/Lima';
  v_hoy date := (now() at time zone 'America/Lima')::date;
  r jsonb;
begin
  if not privado.es_admin() then raise exception 'Solo el equipo Surtiba ve las métricas.'; end if;

  r := jsonb_build_object(
    -- Ventas entregadas por semana (8 semanas, de la más antigua a la actual)
    'semanas', (select jsonb_agg(jsonb_build_object('desde', to_char(s.desde, 'DD/MM'), 'ventas', s.ventas, 'cajas', s.cajas) order by s.n desc)
      from (select n, (now() - (n + 1) * interval '7 days') as desde,
              coalesce((select sum(total_centimos) from public.subpedidos where estado = 'entregado'
                and entregado_en >= now() - (n + 1) * interval '7 days' and entregado_en < now() - n * interval '7 days'), 0) as ventas,
              coalesce((select sum(total_cajas) from public.subpedidos where estado = 'entregado'
                and entregado_en >= now() - (n + 1) * interval '7 days' and entregado_en < now() - n * interval '7 days'), 0) as cajas
            from generate_series(0, 7) as n) s),
    'mes', (select jsonb_build_object(
        'ventas', coalesce(sum(total_centimos) filter (where entregado_en >= v_mes), 0),
        'ventas_antes', coalesce(sum(total_centimos) filter (where entregado_en >= v_mes_anterior and entregado_en < v_mes), 0),
        'cajas', coalesce(sum(total_cajas) filter (where entregado_en >= v_mes), 0),
        'comision', coalesce(sum(comision_centimos) filter (where entregado_en >= v_mes), 0),
        'exonerada', coalesce(sum(round(total_centimos * comision_pct_aplicada / 100)) filter (where entregado_en >= v_mes and exento_comision), 0))
      from public.subpedidos where estado = 'entregado'),
    'pedidos_mes', (select jsonb_build_object(
        'creados', count(*) filter (where estado <> 'cancelado'),
        'cancelados', count(*) filter (where estado = 'cancelado'),
        'ticket', coalesce(round(avg(total_centimos) filter (where estado <> 'cancelado')), 0))
      from public.pedidos where creado_en >= v_mes),
    -- Embudo de 30 días: eventos propios y pedidos
    'embudo', jsonb_build_object(
      'vio_producto', (select count(*) from public.eventos where tipo = 'vio_producto' and creado_en >= now() - interval '30 days'),
      'agrego_carrito', (select count(*) from public.eventos where tipo = 'agrego_carrito' and creado_en >= now() - interval '30 days'),
      'inicio_pedido', (select count(*) from public.eventos where tipo = 'inicio_pedido' and creado_en >= now() - interval '30 days'),
      'pedidos', (select count(*) from public.pedidos where creado_en >= now() - interval '30 days'),
      'pagados', (select count(*) from public.pedidos where creado_en >= now() - interval '30 days' and pago_estado = 'pagado'),
      'entregados', (select count(*) from public.pedidos where creado_en >= now() - interval '30 days' and estado = 'entregado'),
      'cotizaciones', (select count(*) from public.cotizaciones where creado_en >= now() - interval '30 days'),
      'cotizaciones_con_pedido', (select count(*) from public.cotizaciones where creado_en >= now() - interval '30 days' and pedido_id is not null)),
    -- Operación: tiempos promedio (horas, últimos 90 días) y lo atrasado hoy
    'operacion', jsonb_build_object(
      'horas_hasta_listo', (select round((avg(extract(epoch from (listo_en - creado_en))) / 3600)::numeric, 1) from public.subpedidos
        where listo_en is not null and creado_en >= now() - interval '90 days'),
      'horas_listo_a_recogido', (select round((avg(extract(epoch from (recogido_en - listo_en))) / 3600)::numeric, 1) from public.subpedidos
        where recogido_en is not null and listo_en is not null and creado_en >= now() - interval '90 days'),
      'horas_recogido_a_entregado', (select round((avg(extract(epoch from (s.entregado_en - s.recogido_en))) / 3600)::numeric, 1) from public.subpedidos s
        where s.entregado_en is not null and s.recogido_en is not null and s.creado_en >= now() - interval '90 days'),
      'entregas_atrasadas', (select count(*) from public.pedidos where fecha_entrega_deseada < v_hoy and estado not in ('entregado', 'cancelado')),
      'encargos_sin_respuesta_2d', (select count(*) from public.subpedidos where estado = 'por_confirmar' and creado_en < now() - interval '2 days'),
      'listas_sin_recoger_1d', (select count(*) from public.subpedidos where estado = 'listo_recojo' and listo_en < now() - interval '1 day')),
    -- Marcas: últimos 90 días
    'marcas', (select coalesce(jsonb_agg(m order by (m->>'ventas')::bigint desc), '[]'::jsonb) from (
      select jsonb_build_object(
        'nombre', ma.nombre_comercial,
        'ventas', coalesce(sum(s.total_centimos) filter (where s.estado = 'entregado'), 0),
        'cajas', coalesce(sum(s.total_cajas) filter (where s.estado = 'entregado'), 0),
        'ordenes', count(s.id),
        'no_atendidas', count(s.id) filter (where s.estado = 'rechazado'),
        'agotados', (select count(*) from public.productos p where p.marca_id = ma.id and p.activo and p.stock_cajas = 0)) as m
      from public.marcas ma
      left join public.subpedidos s on s.marca_id = ma.id and s.creado_en >= now() - interval '90 days'
      where ma.activa
      group by ma.id, ma.nombre_comercial) t),
    -- Compradores: este mes, y por tipo de negocio (90 días, lo entregado)
    'compradores', jsonb_build_object(
      'activos_mes', (select count(distinct comprador_id) from public.pedidos where creado_en >= v_mes and estado <> 'cancelado'),
      'nuevos_mes', (select count(*) from (select comprador_id, min(creado_en) as primero from public.pedidos where estado <> 'cancelado' group by comprador_id) x where x.primero >= v_mes),
      'recurrentes', (select count(*) from (select comprador_id from public.pedidos where estado <> 'cancelado' group by comprador_id having count(*) > 1) x),
      'por_tipo', (select coalesce(jsonb_agg(jsonb_build_object('tipo', tipo, 'pedidos', pedidos, 'ventas', ventas) order by ventas desc), '[]'::jsonb) from (
        select coalesce(pf.tipo_negocio, 'otro') as tipo, count(distinct pe.id) as pedidos, coalesce(sum(pe.total_centimos) filter (where pe.estado = 'entregado'), 0) as ventas
        from public.pedidos pe join public.perfiles pf on pf.id = pe.comprador_id
        where pe.creado_en >= now() - interval '90 days' and pe.estado <> 'cancelado'
        group by 1) t),
      'por_distrito', (select coalesce(jsonb_agg(jsonb_build_object('distrito', distrito, 'pedidos', pedidos) order by pedidos desc), '[]'::jsonb) from (
        select coalesce(distrito, 'Sin distrito') as distrito, count(*) as pedidos from public.pedidos
        where creado_en >= now() - interval '90 days' and estado <> 'cancelado' group by 1 order by 2 desc limit 6) t)),
    -- Productos: más vendidos (90 días), más cotizados (30 días) y activos que nunca se vendieron
    'productos', jsonb_build_object(
      'vendidos', (select coalesce(jsonb_agg(jsonb_build_object('nombre', nombre, 'marca', marca, 'cajas', cajas) order by cajas desc), '[]'::jsonb) from (
        select pr.nombre, ma.nombre_comercial as marca, sum(i.cajas)::int as cajas
        from public.items i join public.subpedidos s on s.id = i.subpedido_id
        join public.productos pr on pr.id = i.producto_id join public.marcas ma on ma.id = pr.marca_id
        where s.estado = 'entregado' and s.entregado_en >= now() - interval '90 days'
        group by pr.nombre, ma.nombre_comercial order by 3 desc limit 5) t),
      'cotizados', (select coalesce(jsonb_agg(jsonb_build_object('nombre', nombre, 'veces', veces) order by veces desc), '[]'::jsonb) from (
        select e->>'producto' as nombre, count(*) as veces
        from public.cotizaciones c, jsonb_array_elements(c.items) e
        where c.creado_en >= now() - interval '30 days'
        group by 1 order by 2 desc limit 5) t),
      'nunca_vendidos', (select count(*) from public.productos p where p.activo
        and not exists (select 1 from public.items i join public.subpedidos s on s.id = i.subpedido_id where i.producto_id = p.id and s.estado = 'entregado')))
  );
  return r;
end;
$$;

revoke execute on function public.admin_insights() from public, anon;
grant execute on function public.admin_insights() to authenticated;
