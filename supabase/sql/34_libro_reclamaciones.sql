-- 22-oct-2026 · Libro de Reclamaciones virtual (D.S. 011-2011-PCM y D.S. 101-2022-PCM). Ya aplicada en Supabase.
-- Cualquiera puede registrar una hoja (con o sin cuenta) SOLO con registrar_reclamo. Nadie la edita después:
-- el admin solo agrega su respuesta con admin_responder_reclamo. Quien tiene cuenta ve las suyas; el admin, todas.
-- La marca nunca (son datos del comprador).

-- ══ 1. Tabla ═══
create sequence public.reclamos_numero_seq;

create table public.reclamos (
  id uuid primary key default gen_random_uuid(),
  numero integer not null unique default nextval('public.reclamos_numero_seq'),
  codigo text not null unique,
  tipo text not null check (tipo in ('reclamo', 'queja')),
  -- 1. Quien reclama
  nombre text not null check (length(btrim(nombre)) between 3 and 120),
  tipo_documento text not null check (tipo_documento in ('DNI', 'CE', 'Pasaporte', 'RUC')),
  numero_documento text not null check (numero_documento ~ '^[A-Za-z0-9]{6,15}$'),
  domicilio text not null check (length(btrim(domicilio)) between 5 and 200),
  telefono text check (telefono is null or telefono ~ '^\+?[0-9]{6,15}$'),
  correo text not null check (length(correo) between 5 and 120 and correo like '%_@_%._%'),
  -- 2. Lo que compró o contrató
  bien text not null check (bien in ('producto', 'servicio')),
  pedido_codigo text check (pedido_codigo is null or pedido_codigo ~ '^SUR-[0-9]{4,}$'),
  monto_centimos integer check (monto_centimos is null or monto_centimos between 0 and 100000000),
  descripcion_bien text not null check (length(btrim(descripcion_bien)) between 3 and 300),
  -- 3. Detalle y lo que pide
  detalle text not null check (length(btrim(detalle)) between 10 and 2000),
  pedido text not null check (length(btrim(pedido)) between 5 and 1000),
  -- 4. Respuesta de Surtiba
  respuesta text check (respuesta is null or length(btrim(respuesta)) between 10 and 2000),
  respondido_en timestamptz,
  perfil_id uuid references public.perfiles (id) on delete set null,
  creado_en timestamptz not null default now(),
  fecha_limite date not null
);
create index reclamos_perfil_idx on public.reclamos (perfil_id);
create index reclamos_documento_idx on public.reclamos (numero_documento, creado_en desc);

alter table public.reclamos enable row level security;
create policy "reclamos: cada uno ve los suyos (admin todos)" on public.reclamos
  for select to authenticated
  using (perfil_id = (select auth.uid()) or (select privado.es_admin()));
-- Supabase da por defecto todos los permisos sobre tablas nuevas: se quitan y se dan solo los justos
revoke all on public.reclamos from anon, authenticated;
revoke all on sequence public.reclamos_numero_seq from anon, authenticated;
grant select on public.reclamos to authenticated;

-- ══ 2. Plazo: 15 días hábiles (lunes a viernes; los feriados no se descuentan, así el plazo queda más corto) ═══
create or replace function privado.sumar_dias_habiles(p_desde date, p_dias integer)
returns date language plpgsql immutable set search_path to '' as $$
declare
  d date := p_desde;
  n integer := 0;
begin
  while n < p_dias loop
    d := d + 1;
    if extract(isodow from d) < 6 then n := n + 1; end if;
  end loop;
  return d;
end $$;

-- ══ 3. Registrar una hoja (visitantes incluidos) ═══
create or replace function public.registrar_reclamo(
  p_tipo text, p_nombre text, p_tipo_documento text, p_numero_documento text, p_domicilio text,
  p_telefono text, p_correo text, p_bien text, p_pedido_codigo text, p_monto_centimos integer,
  p_descripcion_bien text, p_detalle text, p_pedido text
) returns jsonb language plpgsql security definer set search_path to '' as $$
declare
  v_hoy date := (now() at time zone 'America/Lima')::date;
  v_numero integer;
  r public.reclamos;
begin
  -- Freno contra envíos masivos: pocos por documento al día y un tope general por minuto
  if (select count(*) from public.reclamos where numero_documento = upper(btrim(p_numero_documento)) and creado_en > now() - interval '1 day') >= 3 then
    raise exception 'Ya registraste 3 hojas hoy con ese documento. Si necesitas agregar algo, espera a nuestra respuesta.';
  end if;
  if (select count(*) from public.reclamos where creado_en > now() - interval '1 minute') >= 20 then
    raise exception 'Estamos recibiendo muchas hojas. Intenta de nuevo en un minuto.';
  end if;

  v_numero := nextval('public.reclamos_numero_seq');
  insert into public.reclamos (
    numero, codigo, tipo, nombre, tipo_documento, numero_documento, domicilio, telefono, correo, bien, pedido_codigo,
    monto_centimos, descripcion_bien, detalle, pedido, perfil_id, fecha_limite)
  values (
    v_numero, 'REC-' || to_char(v_hoy, 'YYYY') || '-' || lpad(v_numero::text, 4, '0'), p_tipo, btrim(p_nombre),
    p_tipo_documento, upper(btrim(p_numero_documento)), btrim(p_domicilio), nullif(btrim(p_telefono), ''),
    lower(btrim(p_correo)), p_bien, nullif(upper(btrim(p_pedido_codigo)), ''), p_monto_centimos, btrim(p_descripcion_bien),
    btrim(p_detalle), btrim(p_pedido), (select auth.uid()), privado.sumar_dias_habiles(v_hoy, 15))
  returning * into r;

  perform privado.avisar_admins(
    'Nueva hoja ' || r.codigo || ' (' || r.tipo || '). Respóndela hasta el ' || to_char(r.fecha_limite, 'DD/MM') || '.',
    '/admin/reclamos');
  return jsonb_build_object('codigo', r.codigo, 'creado_en', r.creado_en, 'fecha_limite', r.fecha_limite);
end $$;
revoke execute on function public.registrar_reclamo(text, text, text, text, text, text, text, text, text, integer, text, text, text) from public;
grant execute on function public.registrar_reclamo(text, text, text, text, text, text, text, text, text, integer, text, text, text) to anon, authenticated;

-- ══ 4. Responder (solo el admin, una vez) ═══
create or replace function public.admin_responder_reclamo(p_reclamo uuid, p_respuesta text)
returns void language plpgsql security definer set search_path to '' as $$
declare
  r public.reclamos;
begin
  if not privado.es_admin() then raise exception 'Solo el equipo Surtiba responde reclamos.'; end if;
  update public.reclamos set respuesta = btrim(p_respuesta), respondido_en = now()
  where id = p_reclamo and respuesta is null
  returning * into r;
  if r.id is null then raise exception 'Esa hoja no existe o ya fue respondida.'; end if;
  if r.perfil_id is not null then
    perform privado.avisar(r.perfil_id, 'Respondimos tu hoja ' || r.codigo || '.', '/libro-de-reclamaciones');
  end if;
end $$;
revoke execute on function public.admin_responder_reclamo(uuid, text) from public, anon;
grant execute on function public.admin_responder_reclamo(uuid, text) to authenticated;
