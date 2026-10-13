-- Fase 1 · 01: tablas, relaciones y reglas básicas.
-- Dinero en céntimos (integer). Fechas con timestamptz. IDs uuid.
-- La seguridad (RLS) está en 02_seguridad.sql.

-- Esquema privado: funciones internas que NO se exponen en la API de Supabase.
create schema if not exists privado;

-- Arma códigos legibles: ('SUR', 1) -> 'SUR-0001'. Si pasa de 9999 no corta dígitos.
create function privado.formatear_codigo(prefijo text, numero bigint)
returns text
language sql
immutable
set search_path = ''
as $$
  select prefijo || '-' || lpad(numero::text, greatest(4, length(numero::text)), '0')
$$;

-- ── marcas ─────────────────────────────────────────────────────────────
create table public.marcas (
  id uuid primary key default gen_random_uuid(),
  nombre_comercial text not null,
  razon_social text not null,
  ruc text not null check (ruc ~ '^[0-9]{11}$'),
  contacto_nombre text,
  contacto_whatsapp text,
  contacto_correo text,
  direccion_recojo text,
  pedido_minimo_cajas integer not null default 1 check (pedido_minimo_cajas >= 1),
  comision_pct numeric(5,2) not null check (comision_pct between 0 and 100),
  activa boolean not null default true,
  creado_en timestamptz not null default now()
);

-- ── perfiles (extiende auth.users) ─────────────────────────────────────
create table public.perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  rol text not null default 'comprador' check (rol in ('comprador', 'marca', 'admin')),
  nombre text,
  empresa text,
  tipo_negocio text check (tipo_negocio in ('catering', 'organizador_eventos', 'wedding_planner', 'bar_restaurante', 'otro')),
  whatsapp text,
  ruc text check (ruc ~ '^[0-9]{11}$'),
  marca_id uuid references public.marcas(id) on delete restrict,
  creado_en timestamptz not null default now(),
  -- rol "marca" siempre tiene marca_id, y los demás roles nunca
  constraint perfil_marca_coherente check ((rol = 'marca') = (marca_id is not null))
);
-- Una sola cuenta por marca
create unique index perfiles_una_cuenta_por_marca on public.perfiles (marca_id) where marca_id is not null;

-- ── productos ──────────────────────────────────────────────────────────
create table public.productos (
  id uuid primary key default gen_random_uuid(),
  marca_id uuid not null references public.marcas(id) on delete restrict,
  nombre text not null,
  categoria text not null check (categoria in ('pisco', 'ron', 'gin', 'vodka', 'vino', 'licor', 'coctel_listo', 'otro')),
  ml integer not null check (ml > 0),
  grado numeric(4,1) not null check (grado between 0 and 100),
  unidades_por_caja integer not null check (unidades_por_caja >= 1),
  registro_sanitario text,
  foto_url text,
  stock_cajas integer not null default 0 check (stock_cajas >= 0),
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);
create index productos_marca_id_idx on public.productos (marca_id);

-- ── escalas_precio ─────────────────────────────────────────────────────
-- Que los tramos no se superpongan ni dejen huecos se valida al guardar (fase 4).
create table public.escalas_precio (
  id uuid primary key default gen_random_uuid(),
  producto_id uuid not null references public.productos(id) on delete cascade,
  desde_cajas integer not null check (desde_cajas >= 1),
  hasta_cajas integer check (hasta_cajas >= desde_cajas), -- null = sin tope
  precio_caja_centimos integer not null check (precio_caja_centimos > 0),
  unique (producto_id, desde_cajas)
);

-- ── favoritos ──────────────────────────────────────────────────────────
create table public.favoritos (
  comprador_id uuid not null references public.perfiles(id) on delete cascade,
  producto_id uuid not null references public.productos(id) on delete cascade,
  creado_en timestamptz not null default now(),
  primary key (comprador_id, producto_id)
);
create index favoritos_producto_id_idx on public.favoritos (producto_id);

-- ── pedidos ────────────────────────────────────────────────────────────
create sequence public.pedidos_codigo_seq;

create table public.pedidos (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique default privado.formatear_codigo('SUR', nextval('public.pedidos_codigo_seq')),
  comprador_id uuid not null references public.perfiles(id) on delete restrict,
  estado text not null default 'recibido' check (estado in ('recibido', 'en_preparacion', 'en_camino', 'entregado', 'cancelado')),
  evento_nombre text,
  evento_tipo text,
  evento_fecha date,
  invitados integer check (invitados > 0),
  fecha_entrega_deseada date not null,
  direccion_entrega text not null,
  nota text,
  subtotal_centimos integer not null default 0 check (subtotal_centimos >= 0),
  envio_centimos integer not null default 0 check (envio_centimos >= 0),
  total_centimos integer not null default 0 check (total_centimos >= 0),
  pago_estado text not null default 'pendiente' check (pago_estado in ('pendiente', 'pagado')),
  pago_metodo text,
  pagado_en timestamptz,
  creado_en timestamptz not null default now(),
  entregado_en timestamptz
);
create index pedidos_comprador_id_idx on public.pedidos (comprador_id);

-- ── subpedidos (uno por marca dentro de un pedido) ─────────────────────
create table public.subpedidos (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos(id) on delete cascade,
  marca_id uuid not null references public.marcas(id) on delete restrict,
  -- Copia del código del pedido: la marca no puede leer la tabla pedidos, pero necesita el código
  codigo text not null,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'listo_recojo', 'recogido', 'entregado', 'rechazado', 'cancelado')),
  fecha_recojo date,
  total_centimos integer not null default 0 check (total_centimos >= 0),
  total_cajas integer not null default 0 check (total_cajas >= 0),
  comision_pct_aplicada numeric(5,2) not null check (comision_pct_aplicada between 0 and 100),
  exento_comision boolean not null default false,
  comision_centimos integer not null default 0 check (comision_centimos >= 0),
  motivo_rechazo text,
  listo_en timestamptz,
  recogido_en timestamptz,
  entregado_en timestamptz,
  creado_en timestamptz not null default now(),
  unique (pedido_id, marca_id),
  constraint rechazo_con_motivo check (estado <> 'rechazado' or nullif(btrim(motivo_rechazo), '') is not null)
);
create index subpedidos_marca_id_idx on public.subpedidos (marca_id);

-- ── items ──────────────────────────────────────────────────────────────
create table public.items (
  id uuid primary key default gen_random_uuid(),
  subpedido_id uuid not null references public.subpedidos(id) on delete cascade,
  producto_id uuid not null references public.productos(id) on delete restrict,
  cajas integer not null check (cajas >= 1),
  precio_caja_centimos integer not null check (precio_caja_centimos > 0), -- copia del precio aplicado
  subtotal_centimos integer not null,
  unique (subpedido_id, producto_id),
  constraint subtotal_correcto check (subtotal_centimos = cajas * precio_caja_centimos)
);
create index items_producto_id_idx on public.items (producto_id);

-- ── RLS activado desde el primer momento ───────────────────────────────
-- Sin políticas, nadie puede leer ni escribir. Las políticas están en 02_seguridad.sql.
alter table public.marcas enable row level security;
alter table public.perfiles enable row level security;
alter table public.productos enable row level security;
alter table public.escalas_precio enable row level security;
alter table public.favoritos enable row level security;
alter table public.pedidos enable row level security;
alter table public.subpedidos enable row level security;
alter table public.items enable row level security;
