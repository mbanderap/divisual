-- =====================================================================
-- Divisual — Repetición (recurrencia) en Calendario y Tablero
-- Ejecutar en Supabase → SQL Editor → New query → Run.
-- =====================================================================

alter table events add column if not exists recurrence text; -- 'weekly' | 'monthly' | null
alter table events add column if not exists recurrence_day smallint; -- semanal: 1(Lun)-7(Dom) · mensual: 1-31

alter table tasks add column if not exists recurrence text; -- 'weekly' | 'monthly' | null
alter table tasks add column if not exists recurrence_day smallint; -- semanal: 1(Lun)-7(Dom) · mensual: 1-31
