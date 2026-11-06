-- 5-nov-2026 · Lo que no tiene stock se decide en el carrito, antes de pagar (Mathias). Ya aplicada en Supabase.
-- Por cada producto que no alcanza, el comprador elige: pedir lo que falta por encargo, cambiarlo por otro con stock
-- o llevar solo lo que hay. Se quita "todo junto" y el reemplazo después de pagar (agregar_reemplazo): si una marca
-- no atiende algo ya pagado, Surtiba devuelve la plata.

-- ══ 1. El carrito guarda si el comprador aceptó el encargo de lo que falta ═══
alter table public.carrito add column encargo boolean not null default false;

create or replace view public.carrito_detalle with (security_invoker = true) as
  select c.comprador_id, c.producto_id, c.cajas, p.nombre, p.categoria, p.ml, p.unidades_por_caja, p.stock_cajas, p.activo,
         p.marca_id, m.nombre_comercial as marca, m.pedido_minimo_cajas, m.activa as marca_activa, e.precio_caja_centimos,
         (c.cajas::bigint * e.precio_caja_centimos)::integer as subtotal_centimos,
         c.encargo
  from public.carrito c
  join public.productos p on p.id = c.producto_id
  join public.marcas m on m.id = p.marca_id
  left join public.escalas_precio e on e.producto_id = p.id and c.cajas >= e.desde_cajas and (e.hasta_cajas is null or c.cajas <= e.hasta_cajas);

-- ══ 2. crear_pedido: sin "todo junto" y sin faltantes sin decidir ═══
do $$
declare
  v_def text := pg_get_functiondef('public.crear_pedido(date, text, text, text, text, text, text, text, text, text, text, text, date, integer, text)'::regprocedure);
  v_nuevo text := v_def;
  v_partes text[] := array[
    E'  v_junto := p_modo = ''junto'' and v_hay_encargo;\n',
    E'    if r.precio_caja_centimos is null then raise exception ''% no tiene precio para % cajas. Escríbenos para revisarlo.'', r.nombre, r.cajas; end if;\n  end loop;\n'
  ];
  v_cambios text[] := array[
    E'  v_junto := false; -- "todo junto" se quitó el 5-nov-2026: lo que hay sale ahora y el encargo va aparte\n',
    E'    if r.precio_caja_centimos is null then raise exception ''% no tiene precio para % cajas. Escríbenos para revisarlo.'', r.nombre, r.cajas; end if;\n  end loop;\n\n  -- Lo que pasa del stock tiene que estar decidido en el carrito (encargo, cambio o solo lo que hay)\n  for r in select * from public.carrito_detalle d where d.comprador_id = v_uid and d.cajas > d.stock_cajas and not d.encargo loop\n    raise exception ''De % hay % cajas en stock. En tu carrito, elige qué hacer con las que faltan.'', r.nombre, greatest(r.stock_cajas, 0);\n  end loop;\n'
  ];
  i integer;
begin
  for i in 1 .. array_length(v_partes, 1) loop
    if position(v_partes[i] in v_nuevo) = 0 then raise exception 'crear_pedido no tiene la forma esperada (parte %): revisar a mano.', i; end if;
    v_nuevo := replace(v_nuevo, v_partes[i], v_cambios[i]);
  end loop;
  execute v_nuevo;
end $$;

-- ══ 3. Sin reemplazo después de pagar ═══
drop function if exists public.agregar_reemplazo(uuid, uuid, integer);
