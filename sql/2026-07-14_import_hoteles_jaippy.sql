-- =====================================================================
-- Importación real de Hoteles desde la base de datos operativa (Jaippy).
-- Sustituye a la nota antigua al final de 2026-07-09_schema_completo.sql:
-- esa versión solo traía 5 campos y emparejaba por nombre; esta trae todo
-- lo que ya está mapeado y empareja por hotels.jaippy_id (más fiable,
-- sobrevive a cambios de nombre). No es parte del esquema — se ejecuta
-- cada vez que quieras volver a sincronizar, no solo una vez.
--
-- NOTA: si ya tienes montada la sincronización automática de
-- sql/2026-07-14_realtime_sync_hoteles.sql (foreign data wrapper + cron
-- cada pocos minutos), no hace falta este script — úsalo solo como
-- alternativa manual (por ejemplo, si el cron no está disponible en tu
-- plan de Supabase, o para forzar una sincronización puntual).
--
-- Nota: "hoteles" / "planes" / "metricas" / "metricas_plan" y
-- "raw.hoteles_booking_collisio" viven en la base de datos operativa,
-- NO en el Supabase de Divisual — son dos bases de datos separadas, así
-- que no se puede hacer un INSERT ... SELECT directo entre ellas.
--
-- Mapeo de campos usado aquí:
--   jaippy_id     <- hoteles.id
--   name          <- hoteles.nombre
--   tau           <- hoteles.tau
--   has_plan      <- existe un plan con activo = true
--   plan_end_date <- planes.fecha_fin del plan activo
--   objective     <- planes.reputacion_objetivo del plan activo
--   deviation_days <- metricas_plan.desviacion más reciente del plan activo
--   current_ij    <- metricas.ij más reciente (por fecha, luego plataforma)
--   deviation_pct <- calculado: (current_ij - objective) / objective * 100
--   booking_url   <- hoteles.url_booking
--   pms           <- hoteles.pms
--   category      <- hoteles.tipo
--   stars         <- raw.hoteles_booking_collisio.estrellas, y si no hay,
--                    hoteles.categoria (ambos son "estrellas del hotel";
--                    se prioriza el dato scrapeado de Booking por venir
--                    de una fuente más actualizada — cámbialo si prefieres
--                    lo contrario)
--   city          <- raw.hoteles_booking_collisio.ciudad
--   postal_code   <- raw.hoteles_booking_collisio.codigo_postal
--   address       <- raw.hoteles_booking_collisio.direccion
--   description   <- raw.hoteles_booking_collisio.descripcion
--
-- IMPORTANTE — la tabla raw.hoteles_booking_collisio no se une por
-- hoteles.id, sino por hoteles.id_collisio (la columna que ya existía en
-- "hoteles" para enlazar con el sistema de scraping de Booking/Collisio).
--
-- Sin fuente todavía (se quedan como estén, no se tocan en el UPDATE):
--   num_rooms, adr, is_chain — pendiente de que nos des otra fuente.
--
-- Ya no se sincroniza (la funcionalidad que lo usaba —flecha ▲▼ de
-- "década" en Cartera activa— se quitó): last_known_tenth,
-- last_tenth_check_at, tenth_increased. Esas columnas se quedan tal cual
-- estén, sin actualizar.
--
-- Paso A — ejecutar en la base de datos operativa (Jaippy). Copiar TODO
-- el resultado (una línea de SQL insert/update por hotel):

select format(
  'insert into hotels (jaippy_id, name, tau, has_plan, plan_end_date, objective, deviation_days, current_ij, deviation_pct, booking_url, pms, category, stars, city, postal_code, address, description, updated_at) '
  || 'values (%L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, now()) '
  || 'on conflict (jaippy_id) do update set '
  || 'name = excluded.name, tau = excluded.tau, has_plan = excluded.has_plan, plan_end_date = excluded.plan_end_date, '
  || 'objective = excluded.objective, deviation_days = excluded.deviation_days, current_ij = excluded.current_ij, '
  || 'deviation_pct = excluded.deviation_pct, booking_url = excluded.booking_url, pms = excluded.pms, '
  || 'category = excluded.category, stars = excluded.stars, city = excluded.city, postal_code = excluded.postal_code, '
  || 'address = excluded.address, description = excluded.description, updated_at = now();',
  t.jaippy_id, t.name, t.tau, t.has_plan, t.plan_end_date, t.objective, t.deviation_days, t.current_ij,
  t.deviation_pct, t.booking_url, t.pms, t.category, t.stars, t.city, t.postal_code, t.address, t.description
)
from (
  select
    b.*,
    case when b.objective is not null and b.objective <> 0
      then round(((b.current_ij - b.objective) / b.objective * 100)::numeric, 2)
      else null
    end as deviation_pct
  from (
    select
      h.id as jaippy_id,
      h.nombre as name,
      h.tau,
      exists(select 1 from planes p2 where p2.hotel = h.id and p2.activo) as has_plan,
      (select p.fecha_fin from planes p where p.hotel = h.id and p.activo order by p.fecha_inicio desc limit 1) as plan_end_date,
      (select p.reputacion_objetivo from planes p where p.hotel = h.id and p.activo order by p.fecha_inicio desc limit 1) as objective,
      (select mp.desviacion from metricas_plan mp join planes p on p.id = mp.plan and p.hotel = h.id where p.activo order by mp.fecha desc limit 1) as deviation_days,
      (select m.ij from metricas m where m.hotel = h.id order by m.fecha desc, m.plataforma asc limit 1) as current_ij,
      h.url_booking as booking_url,
      h.pms,
      h.tipo as category,
      coalesce(bc.estrellas, h.categoria) as stars,
      bc.ciudad as city,
      bc.codigo_postal as postal_code,
      bc.direccion as address,
      bc.descripcion as description
    from hoteles h
    left join raw.hoteles_booking_collisio bc on bc.id = h.id_collisio
  ) b
) t;

-- Paso B — pegar y ejecutar TODO el resultado del Paso A en el SQL
-- Editor de Supabase (proyecto de Divisual). Al usar
-- "on conflict (jaippy_id) do update", funciona igual si el hotel ya
-- existía en Divisual o si hay que crearlo de cero. Requiere haber
-- ejecutado antes sql/2026-07-13_add_missing_fields.sql (crea la
-- columna jaippy_id y su índice único).
-- =====================================================================
