-- 22-oct-2026 · Envío fijo por zona (Mathias). Ya aplicada en Supabase.
-- Un monto fijo POR PEDIDO según el distrito; no cambia con las cajas. Zona 1 (Lima Centro y Moderna): S/ 20.
-- Zona 2 (Lima Norte, Sur, Este y Callao): S/ 35. Son supuestos: el admin los cambia en Logística.
-- Si el pedido se divide (lo que hay ahora + el resto por encargo), se cobra UN solo envío: en la compra directa.
-- El recojo en cada marca lo cubre la comisión (7 %).

-- ══ 1. Zonas y distritos (los lee cualquiera; solo el admin cambia los montos) ═══
create table public.zonas_envio (
  zona smallint primary key check (zona in (1, 2)),
  nombre text not null,
  monto_centimos integer not null check (monto_centimos between 0 and 100000)
);
create table public.distritos_envio (
  distrito text primary key,
  zona smallint not null references public.zonas_envio (zona)
);
alter table public.zonas_envio enable row level security;
alter table public.distritos_envio enable row level security;
create policy "zonas_envio: las ve cualquiera" on public.zonas_envio for select to anon, authenticated using (true);
create policy "distritos_envio: los ve cualquiera" on public.distritos_envio for select to anon, authenticated using (true);
-- Supabase da por defecto todos los permisos sobre tablas nuevas: se quitan y se dan solo los justos
revoke all on public.zonas_envio, public.distritos_envio from anon, authenticated;
grant select on public.zonas_envio, public.distritos_envio to anon, authenticated;

insert into public.zonas_envio (zona, nombre, monto_centimos) values
  (1, 'Lima Centro y Moderna', 2000),
  (2, 'Lima Norte, Sur, Este y Callao', 3500);

insert into public.distritos_envio (distrito, zona) values
  ('Ancón', 2),
  ('Ate', 2),
  ('Barranco', 1),
  ('Breña', 1),
  ('Carabayllo', 2),
  ('Chaclacayo', 2),
  ('Chorrillos', 2),
  ('Cieneguilla', 2),
  ('Comas', 2),
  ('El Agustino', 2),
  ('Independencia', 2),
  ('Jesús María', 1),
  ('La Molina', 2),
  ('La Victoria', 1),
  ('Lima (Cercado)', 1),
  ('Lince', 1),
  ('Los Olivos', 2),
  ('Lurigancho (Chosica)', 2),
  ('Lurín', 2),
  ('Magdalena del Mar', 1),
  ('Miraflores', 1),
  ('Pachacámac', 2),
  ('Pucusana', 2),
  ('Pueblo Libre', 1),
  ('Puente Piedra', 2),
  ('Punta Hermosa', 2),
  ('Punta Negra', 2),
  ('Rímac', 1),
  ('San Bartolo', 2),
  ('San Borja', 1),
  ('San Isidro', 1),
  ('San Juan de Lurigancho', 2),
  ('San Juan de Miraflores', 2),
  ('San Luis', 1),
  ('San Martín de Porres', 2),
  ('San Miguel', 1),
  ('Santa Anita', 2),
  ('Santa María del Mar', 2),
  ('Santa Rosa', 2),
  ('Santiago de Surco', 1),
  ('Surquillo', 1),
  ('Villa El Salvador', 2),
  ('Villa María del Triunfo', 2),
  ('Bellavista', 2),
  ('Callao', 2),
  ('Carmen de la Legua Reynoso', 2),
  ('La Perla', 2),
  ('La Punta', 2),
  ('Mi Perú', 2),
  ('Ventanilla', 2);

-- ══ 2. El admin cambia un monto ═══
create or replace function public.admin_guardar_envio(p_zona smallint, p_monto_centimos integer)
returns void language plpgsql security definer set search_path to '' as $$
begin
  if not privado.es_admin() then raise exception 'Solo el equipo Surtiba cambia el envío.'; end if;
  if p_monto_centimos is null or p_monto_centimos < 0 or p_monto_centimos > 100000 then
    raise exception 'El envío debe estar entre S/ 0 y S/ 1,000.';
  end if;
  update public.zonas_envio set monto_centimos = p_monto_centimos where zona = p_zona;
  if not found then raise exception 'Esa zona no existe.'; end if;
end $$;
revoke execute on function public.admin_guardar_envio(smallint, integer) from public, anon;
grant execute on function public.admin_guardar_envio(smallint, integer) to authenticated;

-- ══ 3. Si todas las marcas de un pedido quedan fuera, el pedido se cancela y el envío vuelve a 0 ═══
create or replace function privado.recalcular_pedido(p_pedido uuid)
returns void language plpgsql set search_path to '' as $$
declare
  v_subtotal integer;
  v_vigentes integer;
begin
  select coalesce(sum(s.total_centimos), 0), count(*)
  into v_subtotal, v_vigentes
  from public.subpedidos s
  where s.pedido_id = p_pedido and s.estado not in ('rechazado', 'cancelado');

  update public.pedidos pe
  set subtotal_centimos = v_subtotal,
      envio_centimos = case when v_vigentes = 0 then 0 else pe.envio_centimos end,
      total_centimos = v_subtotal + case when v_vigentes = 0 then 0 else pe.envio_centimos end,
      estado = case when v_vigentes = 0 then 'cancelado' else pe.estado end,
      pago_estado = case when pe.pagado_centimos > 0
                          and pe.pagado_centimos >= v_subtotal + case when v_vigentes = 0 then 0 else pe.envio_centimos end
                         then 'pagado' else 'pendiente' end
  where pe.id = p_pedido;
end $$;

-- ══ 4. crear_pedido: el envío sale de la base según el distrito (el navegador nunca lo manda) ═══
-- Se reescribe la función actual con 4 cambios puntuales; si alguno no calza, la migración se detiene.
do $$
declare
  v_def text := pg_get_functiondef('public.crear_pedido(date, text, text, text, text, text, text, text, text, text, text, text, date, integer, text)'::regprocedure);
  v_nuevo text;
begin
  v_nuevo := replace(v_def, E'  r record;\nbegin', E'  r record;\n  v_envio integer;\nbegin');
  v_nuevo := replace(v_nuevo, E'  if v_junto then v_hay_directo := false; end if;\n',
    E'  if v_junto then v_hay_directo := false; end if;\n\n'
    || E'  -- Envío fijo por zona: uno solo por compra (en la directa si hay; si no, en el encargo)\n'
    || E'  select z.monto_centimos into v_envio from public.distritos_envio de\n'
    || E'  join public.zonas_envio z on z.zona = de.zona where de.distrito = btrim(p_distrito);\n'
    || E'  if v_envio is null then raise exception ''Por ahora no entregamos en ese distrito.''; end if;\n');
  -- Encargo: lleva el envío solo si no hay compra directa
  v_nuevo := replace(v_nuevo,
    E'evento_fecha, invitados)\n    values (''encargo''',
    E'evento_fecha, invitados, envio_centimos)\n    values (''encargo''');
  v_nuevo := replace(v_nuevo,
    E'p_evento_fecha, p_invitados)\n    returning id, pedidos.codigo into v_encargo, v_cod_encargo;',
    E'p_evento_fecha, p_invitados, case when v_hay_directo then 0 else v_envio end)\n    returning id, pedidos.codigo into v_encargo, v_cod_encargo;');
  -- Compra directa: siempre lleva el envío
  v_nuevo := replace(v_nuevo,
    E'evento_fecha, invitados)\n    values (''directo''',
    E'evento_fecha, invitados, envio_centimos)\n    values (''directo''');
  v_nuevo := replace(v_nuevo,
    E'p_evento_fecha, p_invitados)\n    returning id, pedidos.codigo into v_directo, v_cod_directo;',
    E'p_evento_fecha, p_invitados, v_envio)\n    returning id, pedidos.codigo into v_directo, v_cod_directo;');

  if (length(v_nuevo) - length(replace(v_nuevo, 'v_envio', ''))) / length('v_envio') <> 5
     or position('invitados, envio_centimos)' in v_nuevo) = 0 then
    raise exception 'crear_pedido no tiene la forma esperada: revisar a mano.';
  end if;
  execute v_nuevo;
end $$;
