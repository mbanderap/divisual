-- =====================================================================
-- Reset de Hoteles — empezar de cero, sin cron ni sincronización
-- automática. A partir de aquí, los datos se meten a mano / con
-- scripts puntuales, fuente por fuente, cuando tú lo digas.
-- =====================================================================

-- ---------------------------------------------------------------------
-- PASO 1 — Quitar la sincronización automática que se había montado
-- (cron + función). Si nunca llegaste a ejecutar
-- sql/2026-07-14_realtime_sync_hoteles.sql del todo, estas líneas no
-- hacen nada (los "if exists" las dejan pasar sin error).
-- ---------------------------------------------------------------------
select cron.unschedule('sync-hoteles-jaippy') where exists (select 1 from cron.job where jobname = 'sync-hoteles-jaippy');
drop function if exists sync_hoteles_from_jaippy();

-- Esto lo dejo comentado a propósito: borra la conexión en vivo a Jaippy
-- (server + user mapping + tablas foráneas). Descomenta estas líneas
-- solo si quieres quitarla del todo; si crees que la usarás para tirar
-- de algún dato puntual más adelante (sin cron), puedes dejarla tal cual,
-- no hace nada por sí sola sin el cron.
-- drop schema if exists jaippy cascade;
-- drop server if exists jaippy_server cascade;


-- ---------------------------------------------------------------------
-- PASO 2 — Borrar todos los hoteles y sus vínculos (personal asignado,
-- negocios vinculados, contactos vinculados). Los tickets que apuntaran
-- a un hotel borrado se quedan sin hotel asignado (hotel_id a null), no
-- se borran los tickets en sí.
-- ---------------------------------------------------------------------
delete from hotels;

-- Reinicia el contador de id para que el próximo hotel que insertes
-- empiece otra vez en 1.
alter sequence hotels_id_seq restart with 1;
