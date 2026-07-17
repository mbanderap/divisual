-- A tickets le faltaban las foreign keys hacia companies, personnel y
-- hotels (igual que le pasó antes a events_personnel, tickets_contacts
-- y tasks_personnel): sin ellas, PostgREST no puede resolver el embed
-- anidado companies(...)/personnel(...)/hotels(...) que usa la app, y la
-- consulta de tickets fallaba en silencio, vaciando la lista.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'tickets_company_id_fkey') then
    alter table tickets add constraint tickets_company_id_fkey foreign key (company_id) references companies(id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'tickets_owner_id_fkey') then
    alter table tickets add constraint tickets_owner_id_fkey foreign key (owner_id) references personnel(id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'tickets_hotel_id_fkey') then
    alter table tickets add constraint tickets_hotel_id_fkey foreign key (hotel_id) references hotels(id) on delete set null;
  end if;
end $$;

select pg_notify('pgrst', 'reload schema');
