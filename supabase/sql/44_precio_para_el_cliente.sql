-- 7-nov-2026 · Bloque 2a + 2c del cotizador: "Tu precio para el cliente". Ya aplicada en Supabase.
-- Supuestos (los edita el admin; el comprador los cambia en su cotización):
-- · 1 bartender por cada 50 personas que toman, S/ 150 por evento.
-- · Cristalería: 2 vasos por persona que toma + copas de vino (cena) y de espumante (brindis), S/ 0.80 cada una (alquiler).
-- · Hielo: S/ 6 por bolsa de 3 kg.
-- No hay fuentes de Lima para estos precios: son supuestos para confirmar en las entrevistas con caterings.
-- Dinero en céntimos (enteros).

alter table public.parametros_cotizador
  add column invitados_por_bartender integer not null default 50 check (invitados_por_bartender between 10 and 500),
  add column precio_bartender_centimos integer not null default 15000 check (precio_bartender_centimos between 0 and 1000000),
  add column vasos_por_toma numeric not null default 2 check (vasos_por_toma between 0 and 10),
  add column precio_vaso_centimos integer not null default 80 check (precio_vaso_centimos between 0 and 10000),
  add column precio_bolsa_hielo_centimos integer not null default 600 check (precio_bolsa_hielo_centimos between 0 and 10000);

create or replace function public.admin_guardar_parametros(p jsonb)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $function$
begin
  if not privado.es_admin() then raise exception 'Solo el equipo Surtiba edita el cotizador.'; end if;
  update public.parametros_cotizador set
    no_toman_pct = (p->>'no_toman_pct')::integer,
    factor_tranquilo = (p->>'factor_tranquilo')::numeric,
    factor_normal = (p->>'factor_normal')::numeric,
    factor_fuerte = (p->>'factor_fuerte')::numeric,
    factor_dia = (p->>'factor_dia')::numeric,
    bienvenida_tragos_hora = (p->>'bienvenida_tragos_hora')::numeric,
    fiesta_primera_hora = (p->>'fiesta_primera_hora')::numeric,
    fiesta_tragos_hora = (p->>'fiesta_tragos_hora')::numeric,
    cena_copas_hora = (p->>'cena_copas_hora')::numeric,
    brindis_copas = (p->>'brindis_copas')::numeric,
    cena_receta_id = nullif(p->>'cena_receta_id', '')::uuid,
    brindis_receta_id = nullif(p->>'brindis_receta_id', '')::uuid,
    hielo_kg_persona_hora = (p->>'hielo_kg_persona_hora')::numeric,
    factor_calor = (p->>'factor_calor')::numeric,
    sin_alcohol_l_hora_toma = (p->>'sin_alcohol_l_hora_toma')::numeric,
    sin_alcohol_l_hora_no_toma = (p->>'sin_alcohol_l_hora_no_toma')::numeric,
    margen_pct = (p->>'margen_pct')::integer,
    invitados_por_bartender = (p->>'invitados_por_bartender')::integer,
    precio_bartender_centimos = (p->>'precio_bartender_centimos')::integer,
    vasos_por_toma = (p->>'vasos_por_toma')::numeric,
    precio_vaso_centimos = (p->>'precio_vaso_centimos')::integer,
    precio_bolsa_hielo_centimos = (p->>'precio_bolsa_hielo_centimos')::integer
  where id;
exception
  when not_null_violation or check_violation or invalid_text_representation or numeric_value_out_of_range then
    raise exception 'Revisa los valores: alguno está vacío o fuera de rango.';
end;
$function$;
