-- 8-nov-2026 · Recompra en Admin → Métricas: de los compradores que hicieron algún pedido (no cancelado)
-- en los últimos 60 días, cuántos hicieron 2 o más. Es la métrica clave de un marketplace B2B: si el comprador vuelve.
-- Se agrega a admin_insights() → compradores.recompra_60d = { compradores, volvieron }. Ya aplicada en Supabase.
do $$
declare
  def text := pg_get_functiondef('public.admin_insights'::regproc);
  ancla text := '''recurrentes'', (select count(*) from (select comprador_id from public.pedidos where estado <> ''cancelado'' group by comprador_id having count(*) > 1) x),';
begin
  if position(ancla in def) = 0 then raise exception 'No encontré dónde agregar la recompra en admin_insights'; end if;
  if position('recompra_60d' in def) > 0 then return; end if;
  def := replace(def, ancla, ancla || E'\n      ''recompra_60d'', (select jsonb_build_object(''compradores'', count(*), ''volvieron'', count(*) filter (where n >= 2)) from (\n        select comprador_id, count(*) as n from public.pedidos\n        where estado <> ''cancelado'' and creado_en >= now() - interval ''60 days'' group by comprador_id) x),');
  execute def;
end $$;
