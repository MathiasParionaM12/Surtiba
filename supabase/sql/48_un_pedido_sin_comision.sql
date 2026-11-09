-- 9-nov-2026 · Solo el PRIMER pedido entregado de cada marca va sin comisión (antes eran 3). Decisión de Mathias, "por ahora".
-- Lo ya entregado no cambia: cada subpedido guarda si fue exento al entregarse. Ya aplicada en Supabase.
do $$
declare
  def text := pg_get_functiondef('public.admin_entregar(uuid)'::regprocedure);
  antes text := 'where x.marca_id = r.marca_id and x.estado = ''entregado'') < 3;';
begin
  if position(antes in def) = 0 then raise exception 'No encontré la regla de 3 pedidos en admin_entregar'; end if;
  execute replace(def, antes, 'where x.marca_id = r.marca_id and x.estado = ''entregado'') < 1;');
end $$;
