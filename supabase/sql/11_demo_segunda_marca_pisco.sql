-- Fase 4 · 11: segunda marca demo de pisco (ficticia), para que existan "opciones parecidas"
-- cuando una marca rechaza su parte de un pedido.

with nueva as (
  insert into public.marcas (nombre_comercial, pedido_minimo_cajas, activa)
  values ('Marca Demo Valle', 3, true)
  returning id
),
privado as (
  insert into public.marcas_privado (marca_id, razon_social, ruc, contacto_nombre, contacto_whatsapp, contacto_correo, direccion_recojo, comision_pct)
  select id, 'Marca Demo Valle S.A.C.', '20000000005', 'Contacto Demo Valle', '+51900000005', 'valle.contacto@example.com',
         'Av. Ficticia 505, Lima (ficticia)', 5.00
  from nueva
),
productos_nuevos as (
  insert into public.productos (marca_id, nombre, categoria, ml, grado, unidades_por_caja, registro_sanitario, stock_cajas, activo)
  select nueva.id, d.nombre, 'pisco', 700, d.grado, 12, d.registro, d.stock, true
  from nueva, (values ('Pisco Quebranta Valle Demo', 41.0, 'DEMO-RS-0011', 30),
                      ('Pisco Torontel Valle Demo', 42.0, 'DEMO-RS-0012', 15)) as d(nombre, grado, registro, stock)
  returning id, nombre
)
insert into public.escalas_precio (producto_id, desde_cajas, hasta_cajas, precio_caja_centimos)
select p.id, t.desde, t.hasta, t.precio
from productos_nuevos p
join (values ('Pisco Quebranta Valle Demo', 1, 4, 41000), ('Pisco Quebranta Valle Demo', 5, null, 39000),
             ('Pisco Torontel Valle Demo', 1, 4, 52000), ('Pisco Torontel Valle Demo', 5, null, 49500))
  as t(nombre, desde, hasta, precio) on t.nombre = p.nombre;
