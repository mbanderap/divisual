-- Permite marcar un evento del calendario como finalizado.
alter table events add column if not exists completed boolean not null default false;
