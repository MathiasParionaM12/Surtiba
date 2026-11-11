-- 10-nov-2026 · Pedido de Mathias "por el momento" (él avisa cuándo volver todo como estaba).
-- 1. Las marcas que se registran con "Quiero vender" quedan APROBADAS al instante (comisión 7 %), sin esperar al admin.
--    Sus productos nuevos siguen pasando por la revisión del admin. Al admin le llega un aviso.
-- 2. Viñedos de Villa queda inactiva junto con sus 10 productos (no se ven en el catálogo, el directorio ni el cotizador).
--
-- PARA VOLVER COMO ESTABA:
--   drop trigger if exists solicitudes_autoaprobar on public.solicitudes_marca;
--   update public.marcas set activa = true where nombre_comercial = 'Viñedos de Villa';
--   update public.productos set activo = true where marca_id = (select id from public.marcas where nombre_comercial = 'Viñedos de Villa');
--   y en lib/catalogo.ts poner MARCAS_SIN_APROBACION = false.
-- (Los 10 productos de Viñedos de Villa estaban todos activos antes de este cambio.)

-- ══ 1. Aprobación automática ═══
-- Se dispara cuando el registro crea la solicitud (privado.crear_perfil, al crear la cuenta). Hace lo mismo que
-- aprobar_solicitud, sin pedir que sea admin. Corre sin sesión, así que el candado de rol (23) lo deja pasar.
create or replace function privado.autoaprobar_solicitud()
returns trigger language plpgsql security definer set search_path to '' as $$
declare
  v_marca uuid;
begin
  if new.estado <> 'pendiente' then return new; end if;

  insert into public.marcas (nombre_comercial, pedido_minimo_cajas, activa)
  values (new.nombre_comercial, new.pedido_minimo_cajas, true)
  returning id into v_marca;

  insert into public.marcas_privado (marca_id, razon_social, ruc, contacto_nombre, contacto_whatsapp, contacto_correo, direccion_recojo, comision_pct)
  values (v_marca, new.razon_social, new.ruc, new.contacto_nombre, new.contacto_whatsapp,
          (select u.email from auth.users u where u.id = new.perfil_id), new.direccion_recojo, 7);

  update public.perfiles set rol = 'marca', marca_id = v_marca where id = new.perfil_id;
  update public.solicitudes_marca set estado = 'aprobada', marca_id = v_marca, revisado_en = now() where id = new.id;

  perform privado.avisar_admins('Nueva marca registrada (aprobada automáticamente): ' || new.nombre_comercial || '.', '/admin/marcas');
  return new;
end $$;
revoke execute on function privado.autoaprobar_solicitud() from public, anon, authenticated;

drop trigger if exists solicitudes_autoaprobar on public.solicitudes_marca;
create trigger solicitudes_autoaprobar
  after insert on public.solicitudes_marca
  for each row execute function privado.autoaprobar_solicitud();

-- ══ 2. Viñedos de Villa inactiva (marca y productos) ═══
update public.productos set activo = false
where marca_id = (select id from public.marcas where nombre_comercial = 'Viñedos de Villa');
update public.marcas set activa = false where nombre_comercial = 'Viñedos de Villa';

-- Revisión: la marca inactiva y cuántos productos activos le quedan (debe ser 0)
select m.nombre_comercial, m.activa, count(p.id) filter (where p.activo) productos_activos
from public.marcas m left join public.productos p on p.marca_id = m.id
where m.nombre_comercial = 'Viñedos de Villa'
group by m.id;
