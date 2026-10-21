-- 21-oct-2026 · Auditoría de seguridad B1. Ya aplicada en Supabase.
-- Defensa en profundidad: aunque algún día se dé permiso amplio sobre perfiles,
-- nadie puede cambiarse el rol ni la marca salvo el admin. Los cambios a mano en la
-- base (sin sesión, auth.uid() vacío) siguen permitidos: así se crea un admin.
-- Probado: comprador -> admin BLOQUEADO; comprador -> marca BLOQUEADO; comprador cambia su
-- nombre OK; admin (aprobar_solicitud) cambia un rol OK; cambio a mano sin sesión OK.
create or replace function privado.proteger_rol_perfil()
returns trigger language plpgsql set search_path to '' as $$
begin
  if (new.rol is distinct from old.rol or new.marca_id is distinct from old.marca_id)
     and (select auth.uid()) is not null
     and not privado.es_admin() then
    raise exception 'No puedes cambiar el rol ni la marca de una cuenta.' using errcode = '42501';
  end if;
  return new;
end $$;

create trigger perfiles_proteger_rol
  before update on public.perfiles
  for each row execute function privado.proteger_rol_perfil();

-- El trigger se dispara igual (Postgres solo revisa EXECUTE al crear el trigger);
-- así nadie puede llamar la función por su cuenta.
revoke execute on function privado.proteger_rol_perfil() from public, anon, authenticated;

-- B3 (revisado el 21-oct-2026): ninguna función de public la puede ejecutar anon; todas validan
-- rol y propiedad adentro (patrón intencional). Las de privado que anon sí puede ejecutar
-- (es_admin, mi_rol, mi_marca_id, marca_activa) las usan las políticas RLS y la vista del
-- catálogo para visitantes: NO quitarles EXECUTE o se rompe el catálogo.
