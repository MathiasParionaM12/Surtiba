-- Fase 1 · 05: pruebas de RLS. Simula cada rol y compara lo que ve con lo esperado.
-- Cada prueba se deshace al terminar: no cambia ningún dato. Correr después de 04.
-- Resultado: una tabla con ✓ o ✗ por prueba.

drop table if exists pg_temp.resultados;
drop function if exists pg_temp.ser(text);
create temp table resultados (
  n serial primary key,
  quien text,
  papel text,           -- null = visitante sin sesión
  prueba text,
  consulta text,
  esperado text,
  obtenido text
);

-- Cambia la "identidad" de la conexión, como si entrara ese usuario por la app
-- Papeles: null (visitante), admin, catering, bar, pisco, cocteles
create function pg_temp.ser(p_papel text)
returns void
language plpgsql
as $f$
declare
  v_id uuid;
begin
  if p_papel is null then
    perform set_config('request.jwt.claims', '{"role":"anon"}', true);
    perform set_config('role', 'anon', true);
  else
    select p.id into strict v_id
    from public.perfiles p
    left join public.marcas m on m.id = p.marca_id
    where (p_papel = 'admin'    and p.rol = 'admin' and p.nombre = 'Admin Demo')
       or (p_papel = 'catering' and p.empresa = 'Catering Demo')
       or (p_papel = 'bar'      and p.empresa = 'Bar Demo')
       or (p_papel = 'pisco'    and m.nombre_comercial = 'Marca Demo Pisco')
       or (p_papel = 'cocteles' and m.nombre_comercial = 'Marca Demo Cócteles');

    perform set_config('request.jwt.claims',
      json_build_object('sub', v_id, 'role', 'authenticated')::text, true);
    perform set_config('role', 'authenticated', true);
  end if;
end;
$f$;

insert into resultados (quien, papel, prueba, consulta, esperado) values
-- Visitante
('Visitante', null, 'Ve el catálogo público',                    'select count(*) from public.catalogo_publico', '8'),
('Visitante', null, 'Ve los productos activos',                  'select count(*) from public.productos', '8'),
('Visitante', null, 'No puede ver el stock',                     'select count(stock_cajas) from public.productos', 'bloqueado'),
('Visitante', null, 'Solo ve el primer tramo de precio',         'select count(*) from public.escalas_precio', '8'),
('Visitante', null, 'Ve las marcas activas',                     'select count(*) from public.marcas', '3'),
('Visitante', null, 'No lee datos privados de marcas',           'select count(*) from public.marcas_privado', '0'),
('Visitante', null, 'No lee pedidos',                            'select count(*) from public.pedidos', '0'),
('Visitante', null, 'No puede editar marcas',                    'with x as (update public.marcas set nombre_comercial = nombre_comercial returning 1) select count(*) from x', 'bloqueado'),
-- Comprador 1
('Catering Demo', 'catering', 'Ve productos activos de marcas activas, con stock', 'select count(*) from public.productos', '8'),
('Catering Demo', 'catering', 'Ve la escala completa de esos productos',           'select count(*) from public.escalas_precio', '20'),
('Catering Demo', 'catering', 'Ve las marcas activas',                             'select count(*) from public.marcas', '3'),
('Catering Demo', 'catering', 'No ve contactos, dirección ni comisión de marcas',  'select count(*) from public.marcas_privado', '0'),
('Catering Demo', 'catering', 'Ve solo su pedido',                                 'select count(*) from public.pedidos', '1'),
('Catering Demo', 'catering', 'Ve sus 2 subpedidos',                               'select count(*) from public.subpedidos', '2'),
('Catering Demo', 'catering', 'Ve sus 3 ítems',                                    'select count(*) from public.items', '3'),
('Catering Demo', 'catering', 'Ve solo su perfil',                                 'select count(*) from public.perfiles', '1'),
('Catering Demo', 'catering', 'Ve solo sus favoritos',                             'select count(*) from public.favoritos', '1'),
('Catering Demo', 'catering', 'No puede cambiarse el rol a admin',                 'with x as (update public.perfiles set rol = ''admin'' where id = auth.uid() returning 1) select count(*) from x', 'bloqueado'),
('Catering Demo', 'catering', 'Puede editar su WhatsApp',                          'with x as (update public.perfiles set whatsapp = whatsapp where id = auth.uid() returning 1) select count(*) from x', '1'),
('Catering Demo', 'catering', 'No puede crear pedidos sin pasar por el servidor',  'with x as (insert into public.pedidos (comprador_id, fecha_entrega_deseada, direccion_entrega) values (auth.uid(), current_date, ''x'') returning 1) select count(*) from x', 'bloqueado'),
('Catering Demo', 'catering', 'No puede editar productos ni stock',                'with x as (update public.productos set stock_cajas = stock_cajas returning 1) select count(*) from x', '0'),
-- Comprador 2
('Bar Demo', 'bar', 'No ve el pedido de otro comprador', 'select count(*) from public.pedidos where evento_nombre = ''Boda Demo''', '0'),
('Bar Demo', 'bar', 'Ve solo su pedido',                 'select count(*) from public.pedidos', '1'),
-- Marca
('Marca Demo Pisco', 'pisco', 'No lee pedidos (ahí están los datos del comprador)', 'select count(*) from public.pedidos', '0'),
('Marca Demo Pisco', 'pisco', 'Ve solo su subpedido',                    'select count(*) from public.subpedidos', '1'),
('Marca Demo Pisco', 'pisco', 'Ve solo los ítems de su subpedido',       'select count(*) from public.items', '2'),
('Marca Demo Pisco', 'pisco', 'Ve solo sus productos',                   'select count(*) from public.productos', '3'),
('Marca Demo Pisco', 'pisco', 'Ve solo sus datos privados',              'select count(*) from public.marcas_privado', '1'),
('Marca Demo Pisco', 'pisco', 'No ve perfiles de compradores (solo el suyo)', 'select count(*) from public.perfiles', '1'),
('Marca Demo Pisco', 'pisco', 'No ve favoritos de compradores',          'select count(*) from public.favoritos', '0'),
('Marca Demo Pisco', 'pisco', 'Puede editar el stock de su producto',    'with x as (update public.productos set stock_cajas = stock_cajas where nombre = ''Pisco Quebranta Demo'' returning 1) select count(*) from x', '1'),
('Marca Demo Pisco', 'pisco', 'No puede editar productos de otra marca', 'with x as (update public.productos set stock_cajas = stock_cajas where nombre = ''Ron Blanco Demo'' returning 1) select count(*) from x', '0'),
('Marca Demo Pisco', 'pisco', 'No puede pasar su producto a otra marca', 'with x as (update public.productos set marca_id = (select id from public.marcas where nombre_comercial = ''Marca Demo Ron'') where nombre = ''Pisco Quebranta Demo'' returning 1) select count(*) from x', 'bloqueado'),
('Marca Demo Cócteles', 'cocteles', 'Ve solo su subpedido (del Bar Demo)', 'select count(*) from public.subpedidos', '1'),
-- Admin
('Admin Demo', 'admin', 'Ve todos los pedidos',                       'select count(*) from public.pedidos', '2'),
('Admin Demo', 'admin', 'Ve todos los subpedidos',                    'select count(*) from public.subpedidos', '3'),
('Admin Demo', 'admin', 'Ve todas las marcas (también la inactiva)',  'select count(*) from public.marcas', '4'),
('Admin Demo', 'admin', 'Ve los datos privados de todas las marcas',  'select count(*) from public.marcas_privado', '4'),
('Admin Demo', 'admin', 'Ve todos los productos',                     'select count(*) from public.productos', '10'),
('Admin Demo', 'admin', 'Ve todos los perfiles',                      'select count(*) from public.perfiles', '6');

do $$
declare
  pruebas resultados[];
  t resultados;
  v text;
begin
  select array_agg(r order by r.n) into pruebas from resultados r;

  foreach t in array pruebas loop
    reset role;
    perform pg_temp.ser(t.papel);
    begin
      execute t.consulta into v;
      raise exception '__deshacer__'; -- deshace cualquier cambio de la prueba
    exception
      when insufficient_privilege then v := 'bloqueado';
      when others then
        if sqlerrm <> '__deshacer__' then v := 'error: ' || sqlerrm; end if;
    end;
    reset role;
    update resultados set obtenido = v where n = t.n;
  end loop;
end $$;

reset role;

select
  n,
  quien,
  prueba,
  esperado,
  obtenido,
  case when esperado = obtenido then '✓' else '✗' end as ok
from resultados
order by n;
