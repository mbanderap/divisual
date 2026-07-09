-- =====================================================================
-- Divisual — Registrar cuándo cambia la etapa de un negocio (para detectar
-- negocios "estancados": mucho tiempo sin moverse de etapa).
-- Ejecutar en Supabase → SQL Editor → New query → Run.
-- =====================================================================

alter table deals add column if not exists status_prev text;
alter table deals add column if not exists status_changed_at timestamptz not null default now();

create or replace function deals_track_status_change() returns trigger as $$
begin
  if new.status is distinct from old.status then
    new.status_prev := old.status;
    new.status_changed_at := now();
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_deals_status_change on deals;
create trigger trg_deals_status_change
  before update on deals
  for each row execute function deals_track_status_change();
