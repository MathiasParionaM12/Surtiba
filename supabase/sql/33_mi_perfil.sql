-- 22-oct-2026 · "Mi perfil" del comprador: foto y dirección de entrega habitual. Ya aplicada en Supabase.
-- La foto va a un bucket PRIVADO (es un dato personal): cada usuario sube, ve y borra solo su carpeta
-- (<su id>/...). El admin puede verlas. La marca nunca (no lee perfiles ni este bucket).

-- ══ 1. Columnas nuevas en perfiles ═══
alter table public.perfiles
  add column foto_ruta text check (foto_ruta is null or length(foto_ruta) <= 200),
  add column direccion text check (direccion is null or length(btrim(direccion)) between 3 and 150),
  add column direccion_detalle text check (direccion_detalle is null or length(direccion_detalle) <= 80),
  add column distrito text check (distrito is null or length(distrito) <= 60),
  add column codigo_postal text check (codigo_postal is null or codigo_postal ~ '^\d{5}$'),
  add column referencia text check (referencia is null or length(referencia) <= 150);

-- El usuario edita su dirección (la política "el suyo" ya limita a su fila). La foto NO: solo con la función.
grant update (direccion, direccion_detalle, distrito, codigo_postal, referencia) on public.perfiles to authenticated;

-- ══ 2. Bucket privado para las fotos de perfil ═══
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('perfiles', 'perfiles', false, 2097152, array['image/jpeg', 'image/png', 'image/webp']);

create policy "perfiles: cada uno ve su carpeta (admin todas)" on storage.objects
  for select to authenticated
  using (bucket_id = 'perfiles' and ((storage.foldername(name))[1] = (select auth.uid())::text or (select privado.es_admin())));
create policy "perfiles: cada uno sube en su carpeta" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'perfiles' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "perfiles: cada uno cambia lo de su carpeta" on storage.objects
  for update to authenticated
  using (bucket_id = 'perfiles' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "perfiles: cada uno borra lo de su carpeta" on storage.objects
  for delete to authenticated
  using (bucket_id = 'perfiles' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ══ 3. Guardar (o quitar) la foto: la ruta tiene que ser de su propia carpeta ═══
create or replace function public.perfil_guardar_foto(p_ruta text)
returns void language plpgsql security definer set search_path to '' as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then raise exception 'Ingresa para cambiar tu foto.'; end if;
  if p_ruta is not null and (p_ruta not like v_uid::text || '/%' or p_ruta like '%..%' or length(p_ruta) > 200) then
    raise exception 'Esa foto no es tuya.';
  end if;
  update public.perfiles set foto_ruta = p_ruta where id = v_uid;
end $$;
revoke execute on function public.perfil_guardar_foto(text) from public, anon;
grant execute on function public.perfil_guardar_foto(text) to authenticated;
