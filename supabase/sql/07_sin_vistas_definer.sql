-- Fase 1 · 07: quitar las vistas "security definer" (aviso CRITICAL del Security Advisor).
-- Antes: el visitante leía vistas que se saltaban RLS.
-- Ahora: todo pasa por RLS + permisos por columna. Ninguna vista se salta RLS.

-- ══ 1. Separar los datos privados de cada marca ═════════════════════════
-- marcas          -> solo datos públicos (nombre, pedido mínimo, activa)
-- marcas_privado  -> razón social, RUC, contacto, dirección de recojo y comisión
--                    (solo la propia marca y el admin)
create table public.marcas_privado (
  marca_id uuid primary key references public.marcas(id) on delete cascade,
  razon_social text not null,
  ruc text not null check (ruc ~ '^[0-9]{11}$'),
  contacto_nombre text,
  contacto_whatsapp text,
  contacto_correo text,
  direccion_recojo text,
  comision_pct numeric(5,2) not null check (comision_pct between 0 and 100)
);
alter table public.marcas_privado enable row level security;

insert into public.marcas_privado
  (marca_id, razon_social, ruc, contacto_nombre, contacto_whatsapp, contacto_correo, direccion_recojo, comision_pct)
select id, razon_social, ruc, contacto_nombre, contacto_whatsapp, contacto_correo, direccion_recojo, comision_pct
from public.marcas;

drop view public.catalogo_publico;
drop view public.marcas_publicas;

alter table public.marcas
  drop column razon_social,
  drop column ruc,
  drop column contacto_nombre,
  drop column contacto_whatsapp,
  drop column contacto_correo,
  drop column direccion_recojo,
  drop column comision_pct;

-- ══ 2. Los visitantes nunca escriben ════════════════════════════════════
revoke insert, update, delete, truncate, references, trigger on all tables in schema public from anon;
revoke truncate, references, trigger on public.marcas_privado from authenticated;

-- ══ 3. Políticas nuevas ═════════════════════════════════════════════════
-- marcas: ahora solo tiene datos públicos. Todos ven las activas;
-- la marca ve la suya aunque esté inactiva; el admin ve todas.
drop policy "marcas: ver la propia (admin ve todas)" on public.marcas;
create policy "marcas: ver las activas (marca la suya, admin todas)"
  on public.marcas for select to anon, authenticated
  using (activa or id = (select privado.mi_marca_id()) or (select privado.es_admin()));

-- marcas_privado: solo la propia marca y el admin
create policy "marcas_privado: ver la propia (admin ve todas)"
  on public.marcas_privado for select to authenticated
  using (marca_id = (select privado.mi_marca_id()) or (select privado.es_admin()));

create policy "marcas_privado: solo el admin crea"
  on public.marcas_privado for insert to authenticated
  with check ((select privado.es_admin()));

create policy "marcas_privado: solo el admin edita"
  on public.marcas_privado for update to authenticated
  using ((select privado.es_admin()))
  with check ((select privado.es_admin()));

-- productos: el visitante ve los activos de marcas activas, pero SIN stock ni
-- registro sanitario (no tiene permiso sobre esas columnas).
revoke select on public.productos from anon;
grant select (id, marca_id, nombre, categoria, ml, grado, unidades_por_caja, foto_url, activo)
  on public.productos to anon;

create policy "productos: visitantes ven los activos"
  on public.productos for select to anon
  using (activo and privado.marca_activa(marca_id));

-- escalas_precio: el visitante solo ve el PRIMER tramo ("S/ 420 por caja")
create policy "escalas: visitantes ven solo el primer tramo"
  on public.escalas_precio for select to anon
  using (desde_cajas = 1 and exists (select 1 from public.productos p where p.id = escalas_precio.producto_id));

-- ══ 4. Vista del catálogo (respeta RLS de quien la consulta) ════════════
-- security_invoker = true: cada usuario ve solo lo que RLS le permite.
create view public.catalogo_publico
with (security_invoker = true)
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

revoke all on public.catalogo_publico from anon, authenticated;
grant select on public.catalogo_publico to anon, authenticated;
