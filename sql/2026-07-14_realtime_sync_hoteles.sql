-- =====================================================================
-- Sincronización automática de Hoteles desde la BD operativa (Jaippy)
-- ---------------------------------------------------------------------
-- Sustituye al copiar/pegar manual de sql/2026-07-14_import_hoteles_jaippy.sql.
-- En vez de eso: se crea una conexión en vivo (foreign data wrapper) desde
-- este proyecto de Supabase hacia el proyecto de Supabase de Jaippy, y un
-- cron job que corre la sincronización cada pocos minutos automáticamente.
--
-- Requisitos antes de ejecutar esto:
--   1. Habilitar las extensiones "postgres_fdw" y "pg_cron" en este
--      proyecto (Dashboard → Database → Extensions).
--   2. Datos de conexión Postgres del proyecto Jaippy (NO el anon key ni
--      la URL de la API REST — la cadena de conexión de Postgres directa:
--      Dashboard de Jaippy → Project Settings → Database → Connection
--      string). Rellena los marcadores <HOST>, <PORT>, <DBNAME>, <USUARIO>,
--      <PASSWORD> tú mismo, directamente aquí en el SQL Editor de
--      Supabase — no lo compartas en ningún otro sitio.
--   3. Ejecutar esto DESPUÉS de sql/2026-07-13_add_missing_fields.sql
--      (crea jaippy_id y su índice único, que aquí se usa para el upsert).
-- =====================================================================


-- ---------------------------------------------------------------------
-- PASO 1 — Extensiones. Van en el esquema "extensions" (convención de
-- Supabase, ya está en el search_path por defecto) y no en "public".
-- Alternativa: activarlas desde Dashboard → Database → Extensions en vez
-- de estas dos líneas — hace exactamente lo mismo.
-- ---------------------------------------------------------------------
create extension if not exists postgres_fdw with schema extensions;
create extension if not exists pg_cron with schema extensions;


-- ---------------------------------------------------------------------
-- PASO 2 — Conexión en vivo al proyecto de Jaippy
-- ---------------------------------------------------------------------
create server if not exists jaippy_server
  foreign data wrapper postgres_fdw
  options (host '<HOST>', port '<PORT>', dbname '<DBNAME>', sslmode 'require');

create user mapping if not exists for current_user
  server jaippy_server
  options (user '<USUARIO>', password '<PASSWORD>');


-- ---------------------------------------------------------------------
-- PASO 3 — Tablas remotas visibles aquí como si fueran locales (no traen
-- datos por sí solas; cada consulta contra ellas viaja en vivo a Jaippy).
-- ---------------------------------------------------------------------
create schema if not exists jaippy;

import foreign schema public
  limit to (hoteles, planes, metricas, metricas_plan)
  from server jaippy_server into jaippy;

import foreign schema raw
  limit to (hoteles_booking_collisio)
  from server jaippy_server into jaippy;


-- ---------------------------------------------------------------------
-- PASO 4 — Función que hace el upsert (mismo mapeo de campos que
-- sql/2026-07-14_import_hoteles_jaippy.sql, pero leyendo en vivo de las
-- tablas remotas en vez de un volcado copiado a mano).
-- ---------------------------------------------------------------------
create or replace function sync_hoteles_from_jaippy() returns void as $$
begin
  insert into hotels (
    jaippy_id, name, tau, has_plan, plan_end_date, objective, deviation_days,
    current_ij, deviation_pct, booking_url, pms, category, stars, city,
    postal_code, address, description, updated_at
  )
  select
    b.jaippy_id, b.name, b.tau, b.has_plan, b.plan_end_date, b.objective, b.deviation_days,
    b.current_ij,
    case when b.objective is not null and b.objective <> 0
      then round(((b.current_ij - b.objective) / b.objective * 100)::numeric, 2)
      else null
    end,
    b.booking_url, b.pms, b.category, b.stars, b.city, b.postal_code, b.address, b.description, now()
  from (
    select
      h.id as jaippy_id,
      h.nombre as name,
      h.tau,
      exists(select 1 from jaippy.planes p2 where p2.hotel = h.id and p2.activo) as has_plan,
      (select p.fecha_fin from jaippy.planes p where p.hotel = h.id and p.activo order by p.fecha_inicio desc limit 1) as plan_end_date,
      (select p.reputacion_objetivo from jaippy.planes p where p.hotel = h.id and p.activo order by p.fecha_inicio desc limit 1) as objective,
      (select mp.desviacion from jaippy.metricas_plan mp join jaippy.planes p on p.id = mp.plan and p.hotel = h.id where p.activo order by mp.fecha desc limit 1) as deviation_days,
      (select m.ij from jaippy.metricas m where m.hotel = h.id order by m.fecha desc, m.plataforma asc limit 1) as current_ij,
      h.url_booking as booking_url,
      h.pms,
      h.tipo as category,
      coalesce(bc.estrellas, h.categoria) as stars,
      bc.ciudad as city,
      bc.codigo_postal as postal_code,
      bc.direccion as address,
      bc.descripcion as description
    from jaippy.hoteles h
    left join jaippy.hoteles_booking_collisio bc on bc.id = h.id_collisio
  ) b
  on conflict (jaippy_id) do update set
    name = excluded.name, tau = excluded.tau, has_plan = excluded.has_plan, plan_end_date = excluded.plan_end_date,
    objective = excluded.objective, deviation_days = excluded.deviation_days, current_ij = excluded.current_ij,
    deviation_pct = excluded.deviation_pct, booking_url = excluded.booking_url, pms = excluded.pms,
    category = excluded.category, stars = excluded.stars, city = excluded.city, postal_code = excluded.postal_code,
    address = excluded.address, description = excluded.description, updated_at = now();
end;
$$ language plpgsql;


-- ---------------------------------------------------------------------
-- PASO 5 — Ejecuta la sincronización ahora mismo, una vez, para
-- comprobar que funciona antes de dejarla en automático.
-- ---------------------------------------------------------------------
select sync_hoteles_from_jaippy();


-- ---------------------------------------------------------------------
-- PASO 6 — Cron: repite la sincronización sola cada 15 minutos. Cambia
-- '*/15 * * * *' si quieres otra frecuencia (p. ej. '*/5 * * * *' cada 5
-- minutos, o '0 * * * *' cada hora en punto).
-- ---------------------------------------------------------------------
select cron.unschedule('sync-hoteles-jaippy') where exists (select 1 from cron.job where jobname = 'sync-hoteles-jaippy');

select cron.schedule(
  'sync-hoteles-jaippy',
  '*/15 * * * *',
  $$select sync_hoteles_from_jaippy();$$
);

-- Para comprobar que el cron está corriendo y ver su historial:
--   select * from cron.job where jobname = 'sync-hoteles-jaippy';
--   select * from cron.job_run_details order by start_time desc limit 20;
-- =====================================================================
