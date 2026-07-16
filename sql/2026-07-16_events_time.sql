-- Añade hora de inicio/fin opcional a los eventos del calendario.
alter table events add column if not exists start_time time;
alter table events add column if not exists end_time time;
