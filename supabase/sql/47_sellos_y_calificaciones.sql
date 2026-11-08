-- 8-nov-2026 · Sellos de confianza y calificaciones (decisiones de Mathias del 8-nov). Ya aplicada en Supabase.
--
-- Sellos (se calculan, salvo "verificada"):
--   · Marca verificada: el admin la marca a mano después de revisar RUC y registro sanitario.
--   · Responde rápido: mediana de menos de 24 h desde que llega la orden hasta "listo para recojo",
--     con al menos 3 órdenes de compra directa en 90 días (los encargos no cuentan: tienen producción).
--   · Nueva en Surtiba: sus primeros 30 días.
-- Calificaciones:
--   · El comprador califica a cada marca de su pedido (1 a 5 estrellas + comentario opcional) cuando esa parte
--     se entregó, hasta 30 días después. Puede cambiarla en ese plazo. Solo con la función calificar().
--   · Todos ven las estrellas y los comentarios, firmados como "Comprador verificado": nadie (ni la marca)
--     puede leer quién calificó. El admin puede ocultar un comentario ofensivo.
--   · El promedio se muestra desde 3 calificaciones (eso lo decide la pantalla).

-- ══ 1. Marca verificada ═══
alter table public.marcas add column verificada boolean not null default false;
-- anon y authenticated tienen SELECT sobre la tabla entera: la columna nueva ya se puede leer.
-- Solo el admin la cambia (política "marcas: solo el admin edita").

-- ══ 2. Calificaciones ═══
create table public.calificaciones (
  id uuid primary key default gen_random_uuid(),
  subpedido_id uuid not null unique references public.subpedidos (id) on delete cascade,
  marca_id uuid not null references public.marcas (id) on delete cascade,
  comprador_id uuid not null references public.perfiles (id) on delete cascade,
  estrellas smallint not null check (estrellas between 1 and 5),
  comentario text check (comentario is null or char_length(comentario) <= 300),
  oculta boolean not null default false,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index calificaciones_marca on public.calificaciones (marca_id);
create index calificaciones_comprador on public.calificaciones (comprador_id);
alter table public.calificaciones enable row level security;

-- Lectura: las visibles para todos; el comprador ve también las suyas y el admin todas
create policy "calificaciones: ver las visibles (comprador las suyas, admin todas)" on public.calificaciones
  for select using (not oculta or comprador_id = (select auth.uid()) or (select privado.es_admin()));

-- Nadie escribe directo: solo con calificar() y admin_ocultar_calificacion()
revoke all on public.calificaciones from anon, authenticated;
-- Nunca se entrega comprador_id: la calificación es anónima para todos (la marca nunca ve datos del comprador)
grant select (id, marca_id, estrellas, comentario, creado_en) on public.calificaciones to anon;
grant select (id, subpedido_id, marca_id, estrellas, comentario, oculta, creado_en) on public.calificaciones to authenticated;

-- ══ 3. Calificar (comprador) ═══
create or replace function public.calificar(p_subpedido uuid, p_estrellas integer, p_comentario text)
returns void
language plpgsql
security definer
set search_path to ''
as $$
declare
  s record;
  v_comentario text := nullif(btrim(coalesce(p_comentario, '')), '');
begin
  if p_estrellas is null or p_estrellas not between 1 and 5 then raise exception 'Elige de 1 a 5 estrellas.'; end if;
  if v_comentario is not null and char_length(v_comentario) > 300 then raise exception 'El comentario va hasta 300 letras.'; end if;
  select sp.id, sp.marca_id, sp.estado, sp.entregado_en, pe.comprador_id into s
  from public.subpedidos sp join public.pedidos pe on pe.id = sp.pedido_id
  where sp.id = p_subpedido;
  if s.id is null or s.comprador_id is distinct from (select auth.uid()) then raise exception 'No encontramos esa parte de tu pedido.'; end if;
  if s.estado <> 'entregado' then raise exception 'Puedes calificar cuando esta parte se haya entregado.'; end if;
  if s.entregado_en < now() - interval '30 days' then raise exception 'Ya pasaron 30 días desde la entrega: no se puede calificar.'; end if;
  insert into public.calificaciones (subpedido_id, marca_id, comprador_id, estrellas, comentario)
  values (s.id, s.marca_id, s.comprador_id, p_estrellas, v_comentario)
  on conflict (subpedido_id) do update
    set estrellas = excluded.estrellas, comentario = excluded.comentario, actualizado_en = now();
end;
$$;
revoke execute on function public.calificar(uuid, integer, text) from public, anon;
grant execute on function public.calificar(uuid, integer, text) to authenticated;

-- ══ 4. Ocultar un comentario (admin) ═══
create or replace function public.admin_ocultar_calificacion(p_id uuid, p_oculta boolean)
returns void
language plpgsql
security definer
set search_path to ''
as $$
begin
  if not privado.es_admin() then raise exception 'Solo el equipo Surtiba modera las calificaciones.'; end if;
  update public.calificaciones set oculta = p_oculta where id = p_id;
  if not found then raise exception 'No encontramos esa calificación.'; end if;
end;
$$;
revoke execute on function public.admin_ocultar_calificacion(uuid, boolean) from public, anon;
grant execute on function public.admin_ocultar_calificacion(uuid, boolean) to authenticated;

-- ══ 5. Reputación de cada marca activa (pública: solo totales, nada del comprador) ═══
create or replace function public.reputacion_marcas()
returns table (marca_id uuid, verificada boolean, responde_rapido boolean, nueva boolean, promedio numeric, calificaciones integer)
language sql
stable
security definer
set search_path to ''
as $$
  select m.id,
    m.verificada,
    coalesce((
      select count(*) >= 3 and percentile_cont(0.5) within group (order by extract(epoch from (sp.listo_en - sp.creado_en))) < 24 * 3600
      from public.subpedidos sp
      where sp.marca_id = m.id and sp.listo_en is not null and sp.fecha_disponible is null
        and sp.creado_en >= now() - interval '90 days'), false),
    m.creado_en >= now() - interval '30 days',
    (select round(avg(c.estrellas), 1) from public.calificaciones c where c.marca_id = m.id and not c.oculta),
    (select count(*)::integer from public.calificaciones c where c.marca_id = m.id and not c.oculta)
  from public.marcas m
  where m.activa;
$$;
revoke execute on function public.reputacion_marcas() from public;
grant execute on function public.reputacion_marcas() to anon, authenticated;
