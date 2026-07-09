-- =====================================================================
-- Divisual — Registrar cuándo cambia la fecha de cierre de un negocio
-- Ejecutar en Supabase → SQL Editor → New query → Run.
-- =====================================================================

alter table deals add column if not exists closing_date_prev date;
alter table deals add column if not exists closing_date_changed_at timestamptz;

create or replace function deals_track_closing_date_change() returns trigger as $$
begin
  if new.closing_date is distinct from old.closing_date then
    new.closing_date_prev := old.closing_date;
    new.closing_date_changed_at := now();
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_deals_closing_date_change on deals;
create trigger trg_deals_closing_date_change
  before update on deals
  for each row execute function deals_track_closing_date_change();
