-- Fase 1 · 03: datos demo del catálogo. TODO es ficticio (marcas, RUC, contactos, precios).
-- 4 marcas (3 activas + 1 inactiva para probar que no se ve) y 10 productos.
-- Precios en céntimos por caja: 42000 = S/ 420.00

insert into public.marcas
  (nombre_comercial, razon_social, ruc, contacto_nombre, contacto_whatsapp, contacto_correo, direccion_recojo, pedido_minimo_cajas, comision_pct, activa)
values
  ('Marca Demo Pisco',    'Marca Demo Pisco S.A.C.',    '20000000001', 'Contacto Demo Pisco',    '+51900000001', 'pisco.contacto@example.com',    'Av. Demo 101, Lima (ficticia)',     5, 5.00, true),
  ('Marca Demo Ron',      'Marca Demo Ron S.A.C.',      '20000000002', 'Contacto Demo Ron',      '+51900000002', 'ron.contacto@example.com',      'Jr. Ficticio 202, Lima (ficticia)', 3, 5.00, true),
  ('Marca Demo Cócteles', 'Marca Demo Cócteles S.A.C.', '20000000003', 'Contacto Demo Cócteles', '+51900000003', 'cocteles.contacto@example.com', 'Calle Prueba 303, Lima (ficticia)', 4, 5.00, true),
  ('Marca Demo Inactiva', 'Marca Demo Inactiva S.A.C.', '20000000004', 'Contacto Demo Inactiva', '+51900000004', 'inactiva.contacto@example.com', 'Psje. Demo 404, Lima (ficticia)',   2, 5.00, false);

-- Cada producto con sus tramos: [desde, hasta (null = sin tope), precio en céntimos]
with datos (marca, nombre, categoria, ml, grado, unidades, registro, stock, activo, tramos) as (
  values
  ('Marca Demo Pisco',    'Pisco Quebranta Demo',     'pisco',        700, 42.0, 12, 'DEMO-RS-0001', 40, true,  '[[1,4,42000],[5,9,40000],[10,null,38000]]'::jsonb),
  ('Marca Demo Pisco',    'Pisco Acholado Demo',      'pisco',        700, 41.0, 12, 'DEMO-RS-0002', 25, true,  '[[1,4,48000],[5,9,46000],[10,null,44000]]'::jsonb),
  ('Marca Demo Pisco',    'Pisco Italia Demo',        'pisco',        700, 42.0,  6, 'DEMO-RS-0003',  0, true,  '[[1,4,33000],[5,null,31500]]'::jsonb),            -- agotado
  ('Marca Demo Ron',      'Ron Añejo 5 Años Demo',    'ron',          750, 40.0, 12, 'DEMO-RS-0004', 30, true,  '[[1,4,54000],[5,9,51500],[10,null,49000]]'::jsonb),
  ('Marca Demo Ron',      'Ron Blanco Demo',          'ron',          750, 37.5, 12, 'DEMO-RS-0005', 50, true,  '[[1,4,36000],[5,9,34500],[10,null,33000]]'::jsonb),
  ('Marca Demo Ron',      'Ron Especiado Demo',       'ron',          750, 35.0, 12, 'DEMO-RS-0006', 15, false, '[[1,null,45000]]'::jsonb),                      -- producto inactivo
  ('Marca Demo Cócteles', 'Pisco Sour Listo Demo',    'coctel_listo', 750, 12.0, 12, 'DEMO-RS-0007', 60, true,  '[[1,9,30000],[10,null,28500]]'::jsonb),
  ('Marca Demo Cócteles', 'Chilcano Listo Demo',      'coctel_listo', 355,  6.0, 24, 'DEMO-RS-0008', 80, true,  '[[1,4,26400],[5,9,25000],[10,null,24000]]'::jsonb),
  ('Marca Demo Cócteles', 'Maracuyá Sour Listo Demo', 'coctel_listo', 750, 12.0, 12, 'DEMO-RS-0009', 35, true,  '[[1,null,30000]]'::jsonb),
  ('Marca Demo Inactiva', 'Vodka Demo',               'vodka',        750, 40.0, 12, 'DEMO-RS-0010', 10, true,  '[[1,null,32000]]'::jsonb)                       -- de marca inactiva
),
nuevos as (
  insert into public.productos
    (marca_id, nombre, categoria, ml, grado, unidades_por_caja, registro_sanitario, stock_cajas, activo)
  select m.id, d.nombre, d.categoria, d.ml, d.grado, d.unidades, d.registro, d.stock, d.activo
  from datos d
  join public.marcas m on m.nombre_comercial = d.marca
  returning id, nombre
)
insert into public.escalas_precio (producto_id, desde_cajas, hasta_cajas, precio_caja_centimos)
select n.id, (t->>0)::int, (t->>1)::int, (t->>2)::int
from nuevos n
join datos d on d.nombre = n.nombre
cross join lateral jsonb_array_elements(d.tramos) as t;
