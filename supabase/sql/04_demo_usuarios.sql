-- Fase 1 · 04: roles de los usuarios demo + pedidos demo. Todo ficticio.
-- ANTES: crear los usuarios en Supabase -> Authentication -> Users -> Add user
-- (con "Auto Confirm User"). El trigger ya les creó un perfil de comprador.
-- Correr UNA sola vez (descuenta stock).

-- 0. Qué correo hace cada papel (cambiar aquí si se usan otros correos)
create temp table usuarios_demo (papel text primary key, correo text not null);
insert into usuarios_demo (papel, correo) values
  ('admin',    'admin.demo@surtiba.com'),
  ('catering', 'catering.demo@surtiba.com'),
  ('bar',      'CORREO_DEL_COMPRADOR_BAR'), -- se usó un correo personal: no se sube a GitHub
  ('pisco',    'leroisac.demo@surtiba.com'),
  ('ron',      'ron.demo@surtiba.com'),
  ('cocteles', 'cocteles.demo@surtiba.com');

do $$
declare
  faltan text;
begin
  select string_agg(d.correo, ', ') into faltan
  from usuarios_demo d
  where not exists (select 1 from auth.users u where u.email = d.correo);

  if faltan is not null then
    raise exception 'Faltan crear estos usuarios en Authentication: %', faltan;
  end if;
end $$;

-- 1. Roles y datos de perfil
update public.perfiles p
set rol = 'admin', nombre = 'Admin Demo', empresa = 'Surtiba (demo)'
from auth.users u join usuarios_demo d on d.correo = u.email
where u.id = p.id and d.papel = 'admin';

update public.perfiles p
set nombre = 'Comprador Demo 1', empresa = 'Catering Demo', tipo_negocio = 'catering', whatsapp = '+51900000011'
from auth.users u join usuarios_demo d on d.correo = u.email
where u.id = p.id and d.papel = 'catering';

update public.perfiles p
set nombre = 'Comprador Demo 2', empresa = 'Bar Demo', tipo_negocio = 'bar_restaurante', whatsapp = '+51900000012'
from auth.users u join usuarios_demo d on d.correo = u.email
where u.id = p.id and d.papel = 'bar';

update public.perfiles p
set rol = 'marca', marca_id = m.id, nombre = 'Usuario ' || m.nombre_comercial
from auth.users u
join usuarios_demo d on d.correo = u.email
join public.marcas m on (d.papel, m.nombre_comercial) in (
  ('pisco', 'Marca Demo Pisco'),
  ('ron', 'Marca Demo Ron'),
  ('cocteles', 'Marca Demo Cócteles')
)
where u.id = p.id;

-- 2. Favoritos demo
insert into public.favoritos (comprador_id, producto_id)
select p.id, pr.id
from public.perfiles p
join public.productos pr on (p.empresa, pr.nombre) in (
  ('Catering Demo', 'Pisco Quebranta Demo'),
  ('Bar Demo', 'Chilcano Listo Demo')
);

-- 3. Pedidos demo
-- (En la fase 3 los pedidos los creará una función con transacción; aquí se cargan a mano.)

-- Agrega ítems a un subpedido con el precio del tramo que corresponde a las cajas
create function pg_temp.demo_items(p_subpedido uuid, p_items jsonb)
returns void
language sql
as $f$
  insert into public.items (subpedido_id, producto_id, cajas, precio_caja_centimos, subtotal_centimos)
  select p_subpedido, p.id, (x->>1)::int, e.precio_caja_centimos, (x->>1)::int * e.precio_caja_centimos
  from jsonb_array_elements(p_items) as x
  join public.productos p on p.nombre = x->>0
  join public.escalas_precio e
    on e.producto_id = p.id
   and (x->>1)::int >= e.desde_cajas
   and (e.hasta_cajas is null or (x->>1)::int <= e.hasta_cajas);
$f$;

do $$
declare
  v_pedido uuid;
  v_codigo text;
  v_sub uuid;
begin
  -- Pedido 1: Catering Demo compra a 2 marcas -> 2 subpedidos
  insert into public.pedidos (comprador_id, evento_nombre, evento_tipo, evento_fecha, invitados,
                              fecha_entrega_deseada, direccion_entrega, nota)
  select p.id, 'Boda Demo', 'boda', current_date + 20, 150,
         current_date + 18, 'Av. Ficticia 500, Miraflores (demo)', 'Pedido de prueba'
  from public.perfiles p where p.empresa = 'Catering Demo'
  returning id, codigo into v_pedido, v_codigo;

  insert into public.subpedidos (pedido_id, marca_id, codigo, comision_pct_aplicada)
  select v_pedido, m.id, v_codigo, m.comision_pct from public.marcas m where m.nombre_comercial = 'Marca Demo Pisco'
  returning id into v_sub;
  perform pg_temp.demo_items(v_sub, '[["Pisco Quebranta Demo", 6], ["Pisco Acholado Demo", 2]]');

  insert into public.subpedidos (pedido_id, marca_id, codigo, comision_pct_aplicada)
  select v_pedido, m.id, v_codigo, m.comision_pct from public.marcas m where m.nombre_comercial = 'Marca Demo Ron'
  returning id into v_sub;
  perform pg_temp.demo_items(v_sub, '[["Ron Blanco Demo", 4]]');

  -- Pedido 2: Bar Demo compra a 1 marca
  insert into public.pedidos (comprador_id, fecha_entrega_deseada, direccion_entrega)
  select p.id, current_date + 7, 'Jr. Ficticio 900, Barranco (demo)'
  from public.perfiles p where p.empresa = 'Bar Demo'
  returning id, codigo into v_pedido, v_codigo;

  insert into public.subpedidos (pedido_id, marca_id, codigo, comision_pct_aplicada)
  select v_pedido, m.id, v_codigo, m.comision_pct from public.marcas m where m.nombre_comercial = 'Marca Demo Cócteles'
  returning id into v_sub;
  perform pg_temp.demo_items(v_sub, '[["Chilcano Listo Demo", 10], ["Pisco Sour Listo Demo", 4]]');
end $$;

-- 4. Totales y stock reservado (lo que hará la función de la fase 3)
update public.subpedidos s
set total_cajas = t.cajas, total_centimos = t.total
from (select subpedido_id, sum(cajas) as cajas, sum(subtotal_centimos) as total
      from public.items group by subpedido_id) t
where t.subpedido_id = s.id;

update public.pedidos p
set subtotal_centimos = t.total, total_centimos = t.total + p.envio_centimos
from (select pedido_id, sum(total_centimos) as total
      from public.subpedidos where estado not in ('rechazado', 'cancelado') group by pedido_id) t
where t.pedido_id = p.id;

update public.productos p
set stock_cajas = p.stock_cajas - t.cajas
from (select producto_id, sum(cajas) as cajas from public.items group by producto_id) t
where t.producto_id = p.id;
