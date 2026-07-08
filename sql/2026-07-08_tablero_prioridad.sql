-- =====================================================================
-- Divisual — Prioridad y fecha límite en el Tablero (tasks)
-- Ejecutar en Supabase → SQL Editor → New query → Run.
-- =====================================================================

alter table tasks add column if not exists priority text; -- 'Alta' | 'Media' | 'Baja'
alter table tasks add column if not exists due_date date;
