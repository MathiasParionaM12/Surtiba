-- 22-oct-2026 · La comisión sube de 5 % a 7 % para todas las marcas (Mathias): Surtiba cubre el recojo.
-- Ya aplicada en Supabase. Las órdenes ya creadas conservan el % que copiaron al crearse (docs/producto.md → Comisión);
-- las nuevas copian el 7 %.

update public.marcas_privado set comision_pct = 7 where comision_pct = 5;

-- aprobar_solicitud: el valor por defecto pasa a 7 (la app igual lo envía desde COMISION_PCT en lib/catalogo.ts).
-- Se reescribe la misma función cambiando solo "default 5" por "default 7".
do $$
declare
  v_def text := pg_get_functiondef('public.aprobar_solicitud(uuid, numeric)'::regprocedure);
begin
  if v_def !~* 'default 5\M' then raise exception 'No encontré "default 5" en aprobar_solicitud'; end if;
  execute regexp_replace(v_def, 'DEFAULT 5\M', 'DEFAULT 7', 'i');
end $$;
