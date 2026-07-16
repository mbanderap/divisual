-- Estas 3 foreign keys estaban definidas en el esquema original pero
-- faltaban en la base de datos real (deriva de esquema). Sin ellas,
-- PostgREST no puede resolver los embeds anidados que usa la app
-- (events_personnel(...personnel...), tickets_contacts(...contacts...),
-- tasks_personnel(...personnel...)), así que esas consultas fallan en
-- silencio y vacían events/tickets/tasks en cada recarga de catálogos —
-- por eso un evento se creaba bien pero "desaparecía" al momento.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'events_personnel_personnel_id_fkey') then
    alter table events_personnel add constraint events_personnel_personnel_id_fkey foreign key (personnel_id) references personnel(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'tickets_contacts_contact_id_fkey') then
    alter table tickets_contacts add constraint tickets_contacts_contact_id_fkey foreign key (contact_id) references contacts(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'tasks_personnel_personnel_id_fkey') then
    alter table tasks_personnel add constraint tasks_personnel_personnel_id_fkey foreign key (personnel_id) references personnel(id) on delete cascade;
  end if;
end $$;

select pg_notify('pgrst', 'reload schema');
