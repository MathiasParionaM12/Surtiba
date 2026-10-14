-- Fase 6 · 17: tablas del cotizador de evento (plan aprobado por Mathias el 14-oct-2026).
-- Reemplaza el borrador "config_cotizador" por parámetros según el tipo de evento + recetas.
-- Cálculo (paso 2):
--   tragos por persona = tragos_primera_hora + (horas - 1) × tragos_hora_siguiente
--   tragos de cada receta = invitados × tragos por persona × porcentaje / 100
--   botellas = tragos × ml_por_trago ÷ ml de la botella ; cajas = botellas ÷ unidades por caja (hacia arriba)
-- TODOS los valores iniciales son SUPUESTOS POR VALIDAR CON CATERINGS. El admin los edita.

-- ══ 1. Tipos de evento ══════════════════════════════════════════════════
create table public.tipos_evento (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique check (length(btrim(nombre)) between 2 and 60),
  tragos_primera_hora numeric(4,2) not null check (tragos_primera_hora > 0 and tragos_primera_hora <= 10),
  tragos_hora_siguiente numeric(4,2) not null check (tragos_hora_siguiente >= 0 and tragos_hora_siguiente <= 10),
  orden integer not null default 0,
  activo boolean not null default true
);

-- ══ 2. Recetas: qué trago se sirve, con qué licor y cuántos ml lleva ═══
-- Una receta usa un solo licor base (la categoría del producto). No incluye hielo, gaseosas ni insumos.
create table public.recetas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique check (length(btrim(nombre)) between 2 and 60),
  categoria text not null check (categoria in ('pisco', 'ron', 'gin', 'vodka', 'vino', 'licor', 'coctel_listo', 'otro')),
  ml_por_trago integer not null check (ml_por_trago between 10 and 500),
  orden integer not null default 0,
  activo boolean not null default true
);

-- ══ 3. Mezcla sugerida: qué tragos se sirven en cada tipo de evento ════
-- Los porcentajes de un tipo de evento suman 100 (se valida al guardar desde el panel del admin).
create table public.tipo_evento_recetas (
  tipo_evento_id uuid not null references public.tipos_evento(id) on delete cascade,
  receta_id uuid not null references public.recetas(id) on delete cascade,
  porcentaje integer not null check (porcentaje between 1 and 100),
  primary key (tipo_evento_id, receta_id)
);
create index tipo_evento_recetas_receta_idx on public.tipo_evento_recetas (receta_id);

-- ══ 4. Cotizaciones guardadas (COT-0001) ════════════════════════════════
-- Se crean al descargar el PDF (paso 4) con una función del servidor que copia precios y cajas.
-- pedido_id se llena si esa cotización terminó en pedido (para la métrica del admin).
create sequence public.cotizaciones_codigo_seq;
create table public.cotizaciones (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique default privado.formatear_codigo('COT', nextval('public.cotizaciones_codigo_seq')),
  comprador_id uuid not null references public.perfiles(id) on delete cascade,
  creado_en timestamptz not null default now(),
  evento jsonb,                 -- copia: tipo de evento, invitados, horas y tragos (null si no vino del cotizador)
  items jsonb not null,         -- copia: [{producto, marca, cajas, precio_caja_centimos, subtotal_centimos}]
  total_centimos integer not null check (total_centimos >= 0),
  pedido_id uuid references public.pedidos(id) on delete set null
);
alter sequence public.cotizaciones_codigo_seq owned by public.cotizaciones.codigo;
create index cotizaciones_comprador_idx on public.cotizaciones (comprador_id, creado_en desc);
create index cotizaciones_pedido_idx on public.cotizaciones (pedido_id);

-- ══ 5. Seguridad (RLS en todas) ═════════════════════════════════════════
alter table public.tipos_evento enable row level security;
alter table public.recetas enable row level security;
alter table public.tipo_evento_recetas enable row level security;
alter table public.cotizaciones enable row level security;

revoke all on public.tipos_evento, public.recetas, public.tipo_evento_recetas, public.cotizaciones from anon;
revoke truncate, references, trigger on public.tipos_evento, public.recetas, public.tipo_evento_recetas from authenticated;
grant select on public.tipos_evento, public.recetas, public.tipo_evento_recetas to anon;
-- Cotizaciones: nadie las escribe directo (solo la función del paso 4); el comprador solo lee las suyas
revoke all on public.cotizaciones from authenticated;
grant select on public.cotizaciones to authenticated;

-- El cotizador es abierto: cualquiera (con o sin sesión) lee lo activo. El admin ve y edita todo.
create policy "tipos_evento: ver los activos (admin ve todos)"
  on public.tipos_evento for select to anon, authenticated
  using (activo or (select privado.es_admin()));
create policy "tipos_evento: solo el admin crea"
  on public.tipos_evento for insert to authenticated with check ((select privado.es_admin()));
create policy "tipos_evento: solo el admin edita"
  on public.tipos_evento for update to authenticated
  using ((select privado.es_admin())) with check ((select privado.es_admin()));
create policy "tipos_evento: solo el admin borra"
  on public.tipos_evento for delete to authenticated using ((select privado.es_admin()));

create policy "recetas: ver las activas (admin ve todas)"
  on public.recetas for select to anon, authenticated
  using (activo or (select privado.es_admin()));
create policy "recetas: solo el admin crea"
  on public.recetas for insert to authenticated with check ((select privado.es_admin()));
create policy "recetas: solo el admin edita"
  on public.recetas for update to authenticated
  using ((select privado.es_admin())) with check ((select privado.es_admin()));
create policy "recetas: solo el admin borra"
  on public.recetas for delete to authenticated using ((select privado.es_admin()));

create policy "mezcla: ver la de tipos y recetas visibles"
  on public.tipo_evento_recetas for select to anon, authenticated
  using (
    exists (select 1 from public.tipos_evento t where t.id = tipo_evento_id)
    and exists (select 1 from public.recetas r where r.id = receta_id)
  );
create policy "mezcla: solo el admin crea"
  on public.tipo_evento_recetas for insert to authenticated with check ((select privado.es_admin()));
create policy "mezcla: solo el admin edita"
  on public.tipo_evento_recetas for update to authenticated
  using ((select privado.es_admin())) with check ((select privado.es_admin()));
create policy "mezcla: solo el admin borra"
  on public.tipo_evento_recetas for delete to authenticated using ((select privado.es_admin()));

create policy "cotizaciones: el comprador ve las suyas (admin ve todas)"
  on public.cotizaciones for select to authenticated
  using (comprador_id = (select auth.uid()) or (select privado.es_admin()));

-- ══ 6. Valores iniciales (SUPUESTOS POR VALIDAR CON CATERINGS) ══════════
insert into public.recetas (nombre, categoria, ml_por_trago, orden) values
  ('Pisco sour',   'pisco',        90, 1),
  ('Chilcano',     'pisco',        60, 2),
  ('Cuba libre',   'ron',          50, 3),
  ('Gin tonic',    'gin',          50, 4),
  ('Vodka con jugo', 'vodka',      50, 5),
  ('Copa de vino', 'vino',        150, 6),
  ('Cóctel listo', 'coctel_listo', 150, 7);

insert into public.tipos_evento (nombre, tragos_primera_hora, tragos_hora_siguiente, orden) values
  ('Boda',                 2.00, 1.00, 1),
  ('Evento corporativo',   1.50, 0.75, 2),
  ('Cumpleaños o fiesta',  2.00, 1.00, 3),
  ('Cóctel o lanzamiento', 1.50, 1.00, 4);

insert into public.tipo_evento_recetas (tipo_evento_id, receta_id, porcentaje)
select t.id, r.id, m.pct
from (values
  ('Boda', 'Pisco sour', 30), ('Boda', 'Chilcano', 20), ('Boda', 'Copa de vino', 30), ('Boda', 'Cuba libre', 20),
  ('Evento corporativo', 'Pisco sour', 40), ('Evento corporativo', 'Copa de vino', 40), ('Evento corporativo', 'Chilcano', 20),
  ('Cumpleaños o fiesta', 'Cuba libre', 40), ('Cumpleaños o fiesta', 'Chilcano', 30), ('Cumpleaños o fiesta', 'Pisco sour', 30),
  ('Cóctel o lanzamiento', 'Cóctel listo', 50), ('Cóctel o lanzamiento', 'Copa de vino', 30), ('Cóctel o lanzamiento', 'Pisco sour', 20)
) as m(tipo, receta, pct)
join public.tipos_evento t on t.nombre = m.tipo
join public.recetas r on r.nombre = m.receta;
