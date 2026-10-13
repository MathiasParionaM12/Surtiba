-- Fase 1 · 02: seguridad.
-- 1) Funciones de ayuda  2) Perfil automático al registrarse
-- 3) Políticas RLS por tabla  4) Vistas públicas (columnas seguras)
-- Ver la tabla "Quién puede ver qué" en docs/modelo-datos.md.

-- ══ 1. Funciones de ayuda ═══════════════════════════════════════════════
-- Viven en el esquema "privado" (no se exponen en la API).
-- Son security definer: leen perfiles y marcas sin pasar por RLS, para que
-- una política no dependa de otra política (evita bucles y errores).

grant usage on schema privado to anon, authenticated, service_role;

-- Rol del usuario con sesión: 'comprador', 'marca', 'admin' o null (sin sesión)
create function privado.mi_rol()
returns text
language sql stable security definer set search_path = ''
as $$
  select rol from public.perfiles where id = (select auth.uid())
$$;

create function privado.es_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce((select rol = 'admin' from public.perfiles where id = (select auth.uid())), false)
$$;

-- Marca del usuario con sesión (solo si su rol es marca)
create function privado.mi_marca_id()
returns uuid
language sql stable security definer set search_path = ''
as $$
  select marca_id from public.perfiles where id = (select auth.uid()) and rol = 'marca'
$$;

create function privado.marca_activa(p_marca_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce((select activa from public.marcas where id = p_marca_id), false)
$$;

revoke all on function privado.mi_rol(), privado.es_admin(), privado.mi_marca_id(), privado.marca_activa(uuid) from public;
grant execute on function privado.mi_rol(), privado.es_admin(), privado.mi_marca_id(), privado.marca_activa(uuid) to anon, authenticated;

-- ══ 2. Perfil automático al registrarse ═════════════════════════════════
-- Cada usuario nuevo recibe un perfil de COMPRADOR. Los roles marca y admin
-- solo los asigna Surtiba desde el servidor; nadie puede elegirlos al registrarse.
create function privado.crear_perfil()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  datos jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  insert into public.perfiles (id, rol, nombre, empresa, tipo_negocio, whatsapp, ruc)
  values (
    new.id,
    'comprador',
    nullif(btrim(datos->>'nombre'), ''),
    nullif(btrim(datos->>'empresa'), ''),
    case when datos->>'tipo_negocio' in ('catering', 'organizador_eventos', 'wedding_planner', 'bar_restaurante', 'otro')
      then datos->>'tipo_negocio' end,
    nullif(btrim(datos->>'whatsapp'), ''),
    case when datos->>'ruc' ~ '^[0-9]{11}$' then datos->>'ruc' end
  );
  return new;
end;
$$;
revoke all on function privado.crear_perfil() from public, anon, authenticated;

create trigger al_crear_usuario
  after insert on auth.users
  for each row execute function privado.crear_perfil();

-- ══ 3. Permisos base y políticas RLS ════════════════════════════════════
-- TRUNCATE ignora RLS: se le quita a los usuarios de la app por si acaso.
revoke truncate, references, trigger on all tables in schema public from anon, authenticated;

-- ── perfiles ──
-- Nadie crea ni borra perfiles desde la app (los crea el trigger).
-- Cada uno puede editar SOLO sus datos de contacto: nunca su rol ni su marca.
revoke insert, update, delete on public.perfiles from anon, authenticated;
grant update (nombre, empresa, tipo_negocio, whatsapp, ruc) on public.perfiles to authenticated;

create policy "perfiles: ver el propio (admin ve todos)"
  on public.perfiles for select to authenticated
  using (id = (select auth.uid()) or (select privado.es_admin()));

create policy "perfiles: editar el propio"
  on public.perfiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ── marcas ──
-- La tabla completa (con contacto y dirección) solo la ven la propia marca y el admin.
-- Visitantes y compradores usan la vista marcas_publicas.
create policy "marcas: ver la propia (admin ve todas)"
  on public.marcas for select to authenticated
  using (id = (select privado.mi_marca_id()) or (select privado.es_admin()));

create policy "marcas: solo el admin crea"
  on public.marcas for insert to authenticated
  with check ((select privado.es_admin()));

create policy "marcas: solo el admin edita"
  on public.marcas for update to authenticated
  using ((select privado.es_admin()))
  with check ((select privado.es_admin()));

-- ── productos ──
-- Comprador: activos de marcas activas (con stock). Marca: los suyos. Admin: todos.
-- Visitantes: no leen esta tabla; usan la vista catalogo_publico (sin stock).
create policy "productos: ver según rol"
  on public.productos for select to authenticated
  using (
    ((select privado.mi_rol()) = 'comprador' and activo and privado.marca_activa(marca_id))
    or marca_id = (select privado.mi_marca_id())
    or (select privado.es_admin())
  );

create policy "productos: la marca (o el admin) crea"
  on public.productos for insert to authenticated
  with check (marca_id = (select privado.mi_marca_id()) or (select privado.es_admin()));

create policy "productos: la marca (o el admin) edita"
  on public.productos for update to authenticated
  using (marca_id = (select privado.mi_marca_id()) or (select privado.es_admin()))
  with check (marca_id = (select privado.mi_marca_id()) or (select privado.es_admin()));
-- Sin política de borrar: un producto se desactiva (activo = false), no se borra.

-- ── escalas_precio ──
-- Se ven las escalas de los productos que el usuario puede ver.
create policy "escalas: ver las de productos visibles"
  on public.escalas_precio for select to authenticated
  using (exists (select 1 from public.productos p where p.id = escalas_precio.producto_id));

create policy "escalas: la marca (o el admin) crea"
  on public.escalas_precio for insert to authenticated
  with check (exists (
    select 1 from public.productos p
    where p.id = escalas_precio.producto_id
      and (p.marca_id = (select privado.mi_marca_id()) or (select privado.es_admin()))
  ));

create policy "escalas: la marca (o el admin) edita"
  on public.escalas_precio for update to authenticated
  using (exists (
    select 1 from public.productos p
    where p.id = escalas_precio.producto_id
      and (p.marca_id = (select privado.mi_marca_id()) or (select privado.es_admin()))
  ))
  with check (exists (
    select 1 from public.productos p
    where p.id = escalas_precio.producto_id
      and (p.marca_id = (select privado.mi_marca_id()) or (select privado.es_admin()))
  ));

create policy "escalas: la marca (o el admin) borra"
  on public.escalas_precio for delete to authenticated
  using (exists (
    select 1 from public.productos p
    where p.id = escalas_precio.producto_id
      and (p.marca_id = (select privado.mi_marca_id()) or (select privado.es_admin()))
  ));

-- ── favoritos ── (solo compradores, solo los suyos)
create policy "favoritos: ver los propios"
  on public.favoritos for select to authenticated
  using (comprador_id = (select auth.uid()) and (select privado.mi_rol()) = 'comprador');

create policy "favoritos: agregar a los propios"
  on public.favoritos for insert to authenticated
  with check (
    comprador_id = (select auth.uid())
    and (select privado.mi_rol()) = 'comprador'
    and exists (select 1 from public.productos p where p.id = favoritos.producto_id)
  );

create policy "favoritos: quitar de los propios"
  on public.favoritos for delete to authenticated
  using (comprador_id = (select auth.uid()) and (select privado.mi_rol()) = 'comprador');

-- ── pedidos ──
-- La marca NO tiene ninguna política aquí: no puede leer pedidos (dirección, evento, comprador).
-- Crear pedidos se hará con una función del servidor (fase 3), no con insert directo.
create policy "pedidos: el comprador ve los suyos (admin ve todos)"
  on public.pedidos for select to authenticated
  using (comprador_id = (select auth.uid()) or (select privado.es_admin()));

create policy "pedidos: solo el admin edita"
  on public.pedidos for update to authenticated
  using ((select privado.es_admin()))
  with check ((select privado.es_admin()));

-- ── subpedidos ──
create policy "subpedidos: ver según rol"
  on public.subpedidos for select to authenticated
  using (
    marca_id = (select privado.mi_marca_id())
    or (select privado.es_admin())
    or exists (select 1 from public.pedidos p where p.id = subpedidos.pedido_id and p.comprador_id = (select auth.uid()))
  );

create policy "subpedidos: solo el admin edita"
  on public.subpedidos for update to authenticated
  using ((select privado.es_admin()))
  with check ((select privado.es_admin()));
-- La marca marcará "listo" o "rechazado" con una función (fase 4) que valida el estado.

-- ── items ── (se ven los de los subpedidos que el usuario puede ver)
create policy "items: ver los de subpedidos visibles"
  on public.items for select to authenticated
  using (exists (select 1 from public.subpedidos s where s.id = items.subpedido_id));

-- ══ 4. Vistas públicas ══════════════════════════════════════════════════
-- Muestran solo columnas seguras. Corren con permisos del dueño (security_invoker = false)
-- a propósito: así el visitante ve el catálogo sin poder leer las tablas completas.
-- Supabase las marcará como aviso "Security Definer View": es intencional.

-- Catálogo para todos: productos activos de marcas activas, con el precio del
-- primer tramo ("S/ 300 por caja"). SIN stock y SIN la escala completa.
create view public.catalogo_publico
with (security_invoker = false)
as
select
  p.id,
  p.marca_id,
  m.nombre_comercial as marca,
  p.nombre,
  p.categoria,
  p.ml,
  p.grado,
  p.unidades_por_caja,
  p.foto_url,
  e.precio_caja_centimos
from public.productos p
join public.marcas m on m.id = p.marca_id
join public.escalas_precio e on e.producto_id = p.id and e.desde_cajas = 1
where p.activo and m.activa;

-- Marcas para todos: solo nombre y pedido mínimo. SIN contacto ni dirección.
create view public.marcas_publicas
with (security_invoker = false)
as
select id, nombre_comercial, pedido_minimo_cajas
from public.marcas
where activa;

-- Solo lectura: sin esto, se podría editar la tabla marcas a través de la vista.
revoke all on public.catalogo_publico, public.marcas_publicas from anon, authenticated;
grant select on public.catalogo_publico, public.marcas_publicas to anon, authenticated;
