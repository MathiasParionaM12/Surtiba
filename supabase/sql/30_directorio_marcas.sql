-- 21-oct-2026 · Directorio de marcas (/marcas). Ya aplicada en Supabase.
-- Cada marca agrega una descripción corta y su logo. Son datos públicos (como el nombre comercial):
-- nunca contacto ni dirección, que siguen en marcas_privado.

alter table public.marcas
  add column descripcion text check (descripcion is null or length(btrim(descripcion)) between 10 and 280),
  add column logo_url text check (logo_url is null or logo_url ~ '^[0-9a-f-]{36}/logo-[0-9]+\.(jpg|png|webp)$');

-- La marca cambia su descripción (o el admin la de cualquiera)
create or replace function public.marca_guardar_descripcion(p_descripcion text)
returns void language plpgsql security definer set search_path to '' as $$
declare
  v_marca uuid := privado.mi_marca_id();
  v_texto text := nullif(btrim(coalesce(p_descripcion, '')), '');
begin
  if v_marca is null then raise exception 'Solo una marca puede cambiar su descripción.'; end if;
  if v_texto is not null and length(v_texto) not between 10 and 280 then
    raise exception 'La descripción va de 10 a 280 letras.';
  end if;
  update public.marcas set descripcion = v_texto where id = v_marca;
end $$;

-- La marca guarda la ruta de su logo, que ya subió a su carpeta en Storage
create or replace function public.marca_guardar_logo(p_ruta text)
returns void language plpgsql security definer set search_path to '' as $$
declare
  v_marca uuid := privado.mi_marca_id();
begin
  if v_marca is null then raise exception 'Solo una marca puede cambiar su logo.'; end if;
  if p_ruta is null or p_ruta !~ ('^' || v_marca::text || '/logo-[0-9]+\.(jpg|png|webp)$') then
    raise exception 'Logo no válido.';
  end if;
  update public.marcas set logo_url = p_ruta where id = v_marca;
end $$;

revoke execute on function public.marca_guardar_descripcion(text), public.marca_guardar_logo(text) from public, anon;
grant execute on function public.marca_guardar_descripcion(text), public.marca_guardar_logo(text) to authenticated;
