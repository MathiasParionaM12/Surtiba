-- 21-oct-2026 · Fechas del encargo (pedido de Mathias). Ya aplicada en Supabase.
-- 1) La marca promete el encargo desde mañana (un encargo se produce: no puede estar listo hoy).
-- 2) No puede marcarlo "listo para recojo" antes de la fecha que prometió.

create or replace function public.marca_responder_encargo(p_subpedido uuid, p_acepta boolean, p_fecha date default null, p_motivo text default null)
returns void
language plpgsql
security definer
set search_path to ''
as $$
declare
  s record;
begin
  select * into s from public.subpedidos where id = p_subpedido for update;
  if not found or s.marca_id is distinct from privado.mi_marca_id() then raise exception 'No encontramos ese encargo en tu marca.'; end if;
  if s.estado <> 'por_confirmar' then raise exception 'Este encargo ya fue respondido.'; end if;

  if p_acepta then
    if p_fecha is null or p_fecha <= (now() at time zone 'America/Lima')::date then
      raise exception 'Elige la fecha en que tendrás listo el encargo (desde mañana).';
    end if;
    update public.subpedidos set estado = 'pendiente', fecha_disponible = p_fecha where id = p_subpedido;
  else
    if length(btrim(coalesce(p_motivo, ''))) < 5 then raise exception 'Escribe el motivo (al menos 5 letras).'; end if;
    update public.subpedidos set estado = 'rechazado', motivo_rechazo = btrim(p_motivo) where id = p_subpedido;
    perform privado.devolver_stock(p_subpedido);
  end if;

  perform privado.recalcular_pedido(s.pedido_id);

  update public.pedidos pe set estado = 'por_pagar'
  where pe.id = s.pedido_id and pe.estado = 'por_confirmar'
    and not exists (select 1 from public.subpedidos x where x.pedido_id = s.pedido_id and x.estado = 'por_confirmar');
end;
$$;

create or replace function public.marcar_listo(p_subpedido uuid)
returns void
language plpgsql
security definer
set search_path to ''
as $$
declare
  s record;
begin
  select * into s from public.subpedidos where id = p_subpedido for update;
  if not found or s.marca_id is distinct from privado.mi_marca_id() then raise exception 'No encontramos esa orden en tu marca.'; end if;
  if s.estado <> 'pendiente' then raise exception 'Solo puedes marcar como lista una orden pendiente.'; end if;
  if exists (select 1 from public.pedidos where id = s.pedido_id and estado in ('por_confirmar', 'por_pagar')) then
    raise exception 'Espera a que el cliente pague este encargo. Te avisaremos aquí.';
  end if;
  if s.fecha_disponible is not null and s.fecha_disponible > (now() at time zone 'America/Lima')::date then
    raise exception 'Prometiste tenerlo listo el %. Podrás marcarlo listo desde ese día.', to_char(s.fecha_disponible, 'DD/MM/YYYY');
  end if;

  update public.subpedidos set estado = 'listo_recojo', listo_en = now() where id = p_subpedido;
  update public.pedidos set estado = 'en_preparacion' where id = s.pedido_id and estado = 'recibido';
end;
$$;
