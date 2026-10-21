-- 19-oct-2026 (pedido de Mathias). Ya aplicada en Supabase.
-- 1) Pedido mínimo pausado: todas las marcas y las solicitudes en revisión quedan en 1 caja.
update marcas set pedido_minimo_cajas = 1 where pedido_minimo_cajas <> 1;
update solicitudes_marca set pedido_minimo_cajas = 1 where pedido_minimo_cajas <> 1 and estado = 'pendiente';

-- 2) Ocultar la marca "squirts divinos" y sus productos (sus pedidos quedan en el historial).
update productos set activo = false where marca_id in (select id from marcas where nombre_comercial = 'squirts divinos');
update marcas set activa = false where nombre_comercial = 'squirts divinos';

-- 3) Borrar un trago no apto. Nada lo usaba salvo una cotización guardada, que solo deja de mostrarlo.
delete from tipo_evento_recetas where receta_id in (select id from recetas where nombre = 'Semen');
update tipos_evento set bienvenida_receta_id = null where bienvenida_receta_id in (select id from recetas where nombre = 'Semen');
delete from recetas where nombre = 'Semen';
