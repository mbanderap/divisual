-- =====================================================================
-- Divisual — Importar/actualizar Hoteles desde Jaippy
-- Campos traídos: name, tau, has_plan, plan_end_date, deviation_days,
-- current_ij. El resto de campos de hotels (contracted_tenths,
-- remaining_tenths, current_tenth, deviation_pct, invoiced) NO se tocan:
-- son datos comerciales/manuales, no vienen de Jaippy.
--
-- Además, cada vez que se ejecuta este script se compara la década nueva
-- (current_ij) contra la que tenía el hotel ANTES de esta ejecución, y
-- guarda si subió, bajó o se mantuvo (last_known_tenth, last_tenth_check_at,
-- tenth_increased) — ver 2026-07-08_hoteles_decima_tracking.sql.
-- =====================================================================

-- Paso 1 — ejecutar UNA VEZ en Supabase (SQL Editor), antes de nada.
-- Requiere haber corrido ya 2026-07-08_tickets_tablero_cartera.sql
-- (añade la columna updated_at a hotels) y 2026-07-08_hoteles_decima_tracking.sql
-- (añade last_known_tenth, last_tenth_check_at, tenth_increased).
-- Si falla por nombres de hotel duplicados, resolver eso antes de seguir.
alter table hotels add constraint hotels_name_unique unique (name);

-- Paso 2 — ejecutar esto en la base de datos de JAIPPY.
-- Copiar TODO el resultado (una línea de SQL por hotel).
select format(
  'insert into hotels (name, tau, has_plan, plan_end_date, deviation_days, current_ij, tenth_increased, last_known_tenth, last_tenth_check_at, updated_at) '
  || 'values (%L, %L, %L, %L, %L, %L, false, null, now(), now()) '
  || 'on conflict (name) do update set '
  || 'tau = excluded.tau, has_plan = excluded.has_plan, plan_end_date = excluded.plan_end_date, deviation_days = excluded.deviation_days, '
  || 'tenth_increased = coalesce(excluded.current_ij > hotels.current_ij, false), '
  || 'last_known_tenth = hotels.current_ij, '
  || 'last_tenth_check_at = now(), '
  || 'current_ij = excluded.current_ij, '
  || 'updated_at = now();',
  hotel_name, tau, has_plan, plan_end_date, deviation_days, current_ij
)
from (
  select
    h.nombre as hotel_name,
    h.tau,
    exists(select 1 from planes p2 where p2.hotel = h.id and p2.activo) as has_plan,
    (select p.fecha_fin from planes p where p.hotel = h.id and p.activo order by p.fecha_inicio desc limit 1) as plan_end_date,
    (select mp.desviacion from metricas_plan mp join planes p on p.id = mp.plan and p.hotel = h.id where p.activo order by mp.fecha desc limit 1) as deviation_days,
    (select m.ij from metricas m where m.hotel = h.id order by m.fecha desc, m.plataforma asc limit 1) as current_ij
  from hoteles h
) t;

-- Paso 3 — pegar y ejecutar TODO el resultado del paso 2 en el SQL
-- Editor de Supabase. Al usar "on conflict (name) do update", funciona
-- igual si el hotel ya existía o si hay que crearlo de cero. La primera
-- vez que se ejecuta para un hotel, tenth_increased queda en false y
-- last_known_tenth en null (todavía no hay "última vez" con la que comparar).
