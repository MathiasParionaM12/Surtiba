-- 5-nov-2026 · Pedido mínimo: 3 cajas en total por pedido, de cualquier marca (Mathias). Ya aplicada en Supabase.
-- Se quita el mínimo por marca: crear_pedido revisa el total del carrito y se borra marca_guardar_minimo.
-- Las columnas marcas.pedido_minimo_cajas y solicitudes_marca.pedido_minimo_cajas quedan sin uso (siempre 1):
-- borrarlas obliga a reescribir 6 funciones y la vista carrito_detalle, sin cambiar nada para nadie.

drop function if exists public.marca_guardar_minimo(integer);

-- crear_pedido: el bucle que revisaba el mínimo de cada marca pasa a ser una sola revisión del total
do $$
declare
  v_def text := pg_get_functiondef('public.crear_pedido(date, text, text, text, text, text, text, text, text, text, text, text, date, integer, text)'::regprocedure);
  v_viejo text := E'  for r in\n    select d.marca, d.pedido_minimo_cajas, sum(d.cajas) as cajas\n    from public.carrito_detalle d where d.comprador_id = v_uid\n    group by d.marca, d.pedido_minimo_cajas\n    having sum(d.cajas) < d.pedido_minimo_cajas\n  loop\n    raise exception ''Pedido mínimo de %: % cajas. Te faltan %.'', r.marca, r.pedido_minimo_cajas, r.pedido_minimo_cajas - r.cajas;\n  end loop;\n';
  v_nuevo text := E'  -- Pedido mínimo: 3 cajas en total, sumando todas las marcas (5-nov-2026)\n  if (select coalesce(sum(c.cajas), 0) from public.carrito c where c.comprador_id = v_uid) < 3 then\n    raise exception ''El pedido mínimo es de 3 cajas en total. Agrega más cajas a tu carrito.'';\n  end if;\n';
begin
  if position(v_viejo in v_def) = 0 then raise exception 'crear_pedido no tiene la forma esperada: revisar a mano.'; end if;
  execute replace(v_def, v_viejo, v_nuevo);
end $$;
