-- =====================================================================
-- Divisual — Seguimiento de subida/bajada de década en Hoteles
-- Ejecutar en Supabase → SQL Editor → New query → Run.
-- =====================================================================

alter table hotels add column if not exists last_known_tenth numeric;
alter table hotels add column if not exists last_tenth_check_at timestamptz;
alter table hotels add column if not exists tenth_increased boolean;
