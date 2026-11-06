-- 7-nov-2026 · Ajustes del cotizador según la investigación (docs/investigacion/). Ya aplicada en Supabase.
-- Consenso de los informes de Claude, ChatGPT y Gemini, y de las fuentes revisadas (IBA, Tacama, Moodrinks):
-- · Pisco sour y Maracuyá sour: 60 ml de pisco (medida IBA), no 90. Pisco sour: 30 ml de limón (≈1.5) y 20 ml de jarabe.
-- · Agua y gaseosas para quien no toma: 0.35 L por hora (antes 0.5).
-- · Cerveza: nuevo trago. Surtiba no la vende, así que va en "Lo consigues por tu cuenta". Moodrinks calcula
--   120 cervezas por cada 100 invitados en una boda; se suma como secundaria a boda, cumpleaños y quinceañero.
-- · Nuevo tipo de evento: Quinceañero (con los menores contados aparte en el cotizador).

-- ══ 1. Sours a 60 ml ═══
update public.recetas set ml_por_trago = 60 where nombre in ('Pisco sour', 'Maracuyá sour');
update public.receta_ingredientes ri set cantidad = 60
from public.recetas r, public.ingredientes i
where r.id = ri.receta_id and i.id = ri.ingrediente_id and r.nombre in ('Pisco sour', 'Maracuyá sour') and i.nombre = 'Pisco';
update public.receta_ingredientes ri set cantidad = case i.nombre when 'Limón' then 1.5 when 'Jarabe de goma' then 20 else ri.cantidad end
from public.recetas r, public.ingredientes i
where r.id = ri.receta_id and i.id = ri.ingrediente_id and r.nombre = 'Pisco sour' and i.nombre in ('Limón', 'Jarabe de goma');

-- ══ 2. Agua para quien no toma ═══
update public.parametros_cotizador set sin_alcohol_l_hora_no_toma = 0.35;

-- ══ 3. Cerveza (por tu cuenta) ═══
insert into public.ingredientes (nombre, unidad, categoria, activo, orden)
values ('Cerveza', 'unidad', null, true, coalesce((select max(orden) + 1 from public.ingredientes), 1));
insert into public.recetas (nombre, categoria, ml_por_trago, orden, activo, mezclador_ml, limones, jarabe_ml)
values ('Cerveza', 'otro', 330, coalesce((select max(orden) + 1 from public.recetas), 1), true, 0, 0, 0);
insert into public.receta_ingredientes (receta_id, ingrediente_id, cantidad)
select r.id, i.id, 1 from public.recetas r, public.ingredientes i where r.nombre = 'Cerveza' and i.nombre = 'Cerveza';

-- ══ 4. Quinceañero (como una boda: bienvenida, cena, brindis y fiesta) ═══
insert into public.tipos_evento (nombre, horas, perfil, bienvenida, bienvenida_horas, bienvenida_receta_id, cena, cena_horas, brindis, orden, activo)
select 'Quinceañero', 6, 'normal', true, 1, b.bienvenida_receta_id, true, 1.5, true, 5, true
from public.tipos_evento b where b.nombre = 'Boda';
insert into public.tipo_evento_recetas (tipo_evento_id, receta_id, nivel)
select q.id, ter.receta_id, ter.nivel
from public.tipos_evento q, public.tipos_evento b join public.tipo_evento_recetas ter on ter.tipo_evento_id = b.id
where q.nombre = 'Quinceañero' and b.nombre = 'Boda';

-- La cerveza, secundaria en boda, cumpleaños y quinceañero
insert into public.tipo_evento_recetas (tipo_evento_id, receta_id, nivel)
select t.id, r.id, 'secundario' from public.tipos_evento t, public.recetas r
where t.nombre in ('Boda', 'Cumpleaños o fiesta', 'Quinceañero') and r.nombre = 'Cerveza';
