-- 21-oct-2026 · Recetario (paso 3a). Ya aplicada en Supabase.
-- Cada trago se describe por sus ingredientes. Si un ingrediente tiene "categoria", Surtiba lo
-- vende (pisco, ron, vino…) y el cotizador sugiere el producto; si no, va a "lo consigues por tu cuenta".
-- Las cantidades son por trago y son SUPUESTOS POR VALIDAR con caterings (recetas clásicas).
-- Los 17 tragos nuevos quedan desactivados hasta que el cotizador calcule con ingredientes (paso 3b).

create table public.ingredientes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique check (length(btrim(nombre)) between 2 and 40),
  unidad text not null check (unidad in ('ml', 'unidad', 'g')),
  -- Categoría de producto de Surtiba que lo cubre; null = Surtiba no lo vende
  categoria text check (categoria is null or categoria in ('pisco', 'ron', 'gin', 'vodka', 'vino', 'espumante', 'licor', 'coctel_listo')),
  activo boolean not null default true,
  orden integer not null default 0
);

create table public.receta_ingredientes (
  receta_id uuid not null references public.recetas (id) on delete cascade,
  ingrediente_id uuid not null references public.ingredientes (id) on delete restrict,
  cantidad numeric(8, 2) not null check (cantidad > 0 and cantidad <= 1000), -- por trago, en la unidad del ingrediente
  primary key (receta_id, ingrediente_id)
);
create index receta_ingredientes_ingrediente_idx on public.receta_ingredientes (ingrediente_id);

-- RLS: como recetas. Todos leen (el cotizador del visitante calcula con esto); solo el admin escribe.
alter table public.ingredientes enable row level security;
alter table public.receta_ingredientes enable row level security;

create policy "ingredientes: ver los activos (admin ve todos)" on public.ingredientes
  for select to anon, authenticated using (activo or (select privado.es_admin()));
create policy "ingredientes: solo el admin crea" on public.ingredientes
  for insert to authenticated with check ((select privado.es_admin()));
create policy "ingredientes: solo el admin edita" on public.ingredientes
  for update to authenticated using ((select privado.es_admin())) with check ((select privado.es_admin()));
create policy "ingredientes: solo el admin borra" on public.ingredientes
  for delete to authenticated using ((select privado.es_admin()));

create policy "receta_ingredientes: todos los leen" on public.receta_ingredientes
  for select to anon, authenticated using (true);
create policy "receta_ingredientes: solo el admin crea" on public.receta_ingredientes
  for insert to authenticated with check ((select privado.es_admin()));
create policy "receta_ingredientes: solo el admin edita" on public.receta_ingredientes
  for update to authenticated using ((select privado.es_admin())) with check ((select privado.es_admin()));
create policy "receta_ingredientes: solo el admin borra" on public.receta_ingredientes
  for delete to authenticated using ((select privado.es_admin()));

grant select on public.ingredientes, public.receta_ingredientes to anon, authenticated;
grant insert, update, delete on public.ingredientes, public.receta_ingredientes to authenticated;

-- Ingredientes
insert into public.ingredientes (nombre, unidad, categoria, orden) values
  -- Los vende Surtiba
  ('Pisco', 'ml', 'pisco', 1), ('Ron', 'ml', 'ron', 2), ('Gin', 'ml', 'gin', 3), ('Vodka', 'ml', 'vodka', 4),
  ('Vino', 'ml', 'vino', 5), ('Espumante', 'ml', 'espumante', 6), ('Cóctel listo', 'ml', 'coctel_listo', 7),
  ('Triple sec', 'ml', 'licor', 8), ('Licor de menta', 'ml', 'licor', 9), ('Vermouth rojo', 'ml', 'licor', 10),
  ('Campari', 'ml', 'licor', 11), ('Aperol', 'ml', 'licor', 12),
  -- No los vende Surtiba
  ('Tequila', 'ml', null, 20), ('Whisky', 'ml', null, 21),
  ('Limón', 'unidad', null, 30), ('Jarabe de goma', 'ml', null, 31), ('Clara de huevo', 'unidad', null, 32),
  ('Amargo de angostura', 'ml', null, 33), ('Algarrobina', 'ml', null, 34), ('Leche evaporada', 'ml', null, 35),
  ('Granadina', 'ml', null, 36), ('Hierbabuena', 'g', null, 37), ('Crema de coco', 'ml', null, 38),
  ('Fruta picada', 'g', null, 39),
  ('Ginger ale', 'ml', null, 40), ('Gaseosa cola', 'ml', null, 41), ('Agua tónica', 'ml', null, 42),
  ('Soda', 'ml', null, 43), ('Gaseosa de limón', 'ml', null, 44),
  ('Jugo de naranja', 'ml', null, 50), ('Jugo de maracuyá', 'ml', null, 51), ('Jugo de piña', 'ml', null, 52),
  ('Jugo de arándano', 'ml', null, 53);

-- Tragos nuevos (desactivados hasta el paso 3b). Las columnas viejas (ml_por_trago, mezclador…) se
-- llenan con el licor principal para que nada se rompa mientras conviven los dos formatos.
insert into public.recetas (nombre, categoria, ml_por_trago, orden, activo, mezclador, mezclador_ml, limones, jarabe_ml) values
  ('Maracuyá sour', 'pisco', 90, 9, false, 'Jugo de maracuyá', 30, 0, 20),
  ('Algarrobina', 'pisco', 60, 10, false, 'Leche evaporada', 60, 0, 10),
  ('Machu Picchu', 'pisco', 45, 11, false, 'Jugo de naranja', 90, 0, 0),
  ('Capitán', 'pisco', 45, 12, false, null, 0, 0, 0),
  ('Pisco tonic', 'pisco', 60, 13, false, 'Agua tónica', 150, 0.25, 0),
  ('Mojito', 'ron', 50, 14, false, 'Soda', 90, 1, 20),
  ('Piña colada', 'ron', 50, 15, false, 'Jugo de piña', 90, 0, 0),
  ('Daiquiri', 'ron', 60, 16, false, null, 0, 1.5, 20),
  ('Negroni', 'gin', 30, 17, false, null, 0, 0, 0),
  ('Margarita', 'licor', 20, 18, false, null, 0, 1.5, 0),
  ('Cosmopolitan', 'vodka', 40, 19, false, 'Jugo de arándano', 30, 0.5, 0),
  ('Vodka tonic', 'vodka', 50, 20, false, 'Agua tónica', 150, 0.25, 0),
  ('Sangría', 'vino', 100, 21, false, 'Jugo de naranja', 50, 0, 10),
  ('Tinto de verano', 'vino', 100, 22, false, 'Gaseosa de limón', 100, 0.25, 0),
  ('Mimosa', 'espumante', 90, 23, false, 'Jugo de naranja', 60, 0, 0),
  ('Aperol spritz', 'espumante', 90, 24, false, 'Soda', 30, 0, 0),
  ('Whisky con soda', 'otro', 50, 25, false, 'Soda', 150, 0, 0);

-- Ingredientes de cada trago (los 8 de antes con sus mismos valores, más los 17 nuevos)
insert into public.receta_ingredientes (receta_id, ingrediente_id, cantidad)
select r.id, i.id, v.cantidad
from (values
  ('Pisco sour', 'Pisco', 90), ('Pisco sour', 'Limón', 2), ('Pisco sour', 'Jarabe de goma', 30),
  ('Pisco sour', 'Clara de huevo', 0.25), ('Pisco sour', 'Amargo de angostura', 1),
  ('Chilcano', 'Pisco', 60), ('Chilcano', 'Ginger ale', 120), ('Chilcano', 'Limón', 0.5),
  ('Chilcano', 'Jarabe de goma', 10), ('Chilcano', 'Amargo de angostura', 1),
  ('Cuba libre', 'Ron', 50), ('Cuba libre', 'Gaseosa cola', 150), ('Cuba libre', 'Limón', 0.25),
  ('Gin tonic', 'Gin', 50), ('Gin tonic', 'Agua tónica', 150), ('Gin tonic', 'Limón', 0.25),
  ('Vodka con jugo', 'Vodka', 50), ('Vodka con jugo', 'Jugo de naranja', 150),
  ('Copa de vino', 'Vino', 150),
  ('Cóctel listo', 'Cóctel listo', 150),
  ('Copa de espumante', 'Espumante', 125),
  ('Maracuyá sour', 'Pisco', 90), ('Maracuyá sour', 'Jugo de maracuyá', 30), ('Maracuyá sour', 'Jarabe de goma', 20),
  ('Maracuyá sour', 'Clara de huevo', 0.25), ('Maracuyá sour', 'Amargo de angostura', 1),
  ('Algarrobina', 'Pisco', 60), ('Algarrobina', 'Algarrobina', 20), ('Algarrobina', 'Leche evaporada', 60),
  ('Algarrobina', 'Jarabe de goma', 10), ('Algarrobina', 'Clara de huevo', 0.25),
  ('Machu Picchu', 'Pisco', 45), ('Machu Picchu', 'Jugo de naranja', 90), ('Machu Picchu', 'Granadina', 15),
  ('Machu Picchu', 'Licor de menta', 15),
  ('Capitán', 'Pisco', 45), ('Capitán', 'Vermouth rojo', 45),
  ('Pisco tonic', 'Pisco', 60), ('Pisco tonic', 'Agua tónica', 150), ('Pisco tonic', 'Limón', 0.25),
  ('Mojito', 'Ron', 50), ('Mojito', 'Limón', 1), ('Mojito', 'Jarabe de goma', 20), ('Mojito', 'Hierbabuena', 5),
  ('Mojito', 'Soda', 90),
  ('Piña colada', 'Ron', 50), ('Piña colada', 'Crema de coco', 45), ('Piña colada', 'Jugo de piña', 90),
  ('Daiquiri', 'Ron', 60), ('Daiquiri', 'Limón', 1.5), ('Daiquiri', 'Jarabe de goma', 20),
  ('Negroni', 'Gin', 30), ('Negroni', 'Campari', 30), ('Negroni', 'Vermouth rojo', 30),
  ('Margarita', 'Tequila', 50), ('Margarita', 'Triple sec', 20), ('Margarita', 'Limón', 1.5),
  ('Cosmopolitan', 'Vodka', 40), ('Cosmopolitan', 'Triple sec', 15), ('Cosmopolitan', 'Jugo de arándano', 30),
  ('Cosmopolitan', 'Limón', 0.5),
  ('Vodka tonic', 'Vodka', 50), ('Vodka tonic', 'Agua tónica', 150), ('Vodka tonic', 'Limón', 0.25),
  ('Sangría', 'Vino', 100), ('Sangría', 'Jugo de naranja', 50), ('Sangría', 'Gaseosa de limón', 30),
  ('Sangría', 'Fruta picada', 30), ('Sangría', 'Triple sec', 10), ('Sangría', 'Jarabe de goma', 10),
  ('Tinto de verano', 'Vino', 100), ('Tinto de verano', 'Gaseosa de limón', 100), ('Tinto de verano', 'Limón', 0.25),
  ('Mimosa', 'Espumante', 90), ('Mimosa', 'Jugo de naranja', 60),
  ('Aperol spritz', 'Espumante', 90), ('Aperol spritz', 'Aperol', 60), ('Aperol spritz', 'Soda', 30),
  ('Whisky con soda', 'Whisky', 50), ('Whisky con soda', 'Soda', 150)
) as v (receta, ingrediente, cantidad)
join public.recetas r on r.nombre = v.receta
join public.ingredientes i on i.nombre = v.ingrediente;
