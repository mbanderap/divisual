-- Conecta Usuarios (personnel) con las cuentas reales de auth.users.
-- El navegador no puede leer auth.users directamente (ni con RLS), así
-- que se refleja solo lo imprescindible (id/email/fecha de alta) en esta
-- tabla mediante un trigger — el patrón recomendado por Supabase.

create table if not exists profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;
drop policy if exists "authenticated full access" on profiles;
create policy "authenticated full access" on profiles for all to authenticated using (true) with check (true);

-- Además de reflejar el email en profiles, cuando se crea una cuenta
-- nueva (INSERT, no al cambiar el email de una ya existente) se crea
-- también su ficha en personnel automáticamente, con el nombre
-- provisional a partir del correo (igual que el resto de la app cuando
-- falta un nombre), para que aparezca sola en Usuarios sin darla de
-- alta a mano.
create unique index if not exists idx_personnel_email_unique on personnel (lower(email)) where email is not null;

-- security definer: los triggers sobre auth.users se ejecutan con el rol
-- interno de Supabase Auth, que no tiene permiso de escritura en
-- public.profiles/public.personnel por sí mismo.
create or replace function handle_new_auth_user() returns trigger as $$
begin
  insert into profiles (id, email) values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;

  if tg_op = 'INSERT' then
    insert into personnel (name, email)
    values (split_part(new.email, '@', 1), new.email)
    on conflict (lower(email)) where email is not null do nothing;
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_handle_new_auth_user on auth.users;
create trigger trg_handle_new_auth_user
  after insert or update of email on auth.users
  for each row execute function handle_new_auth_user();

-- Rellena profiles con los usuarios que ya existan hoy (no solo los que
-- se creen a partir de ahora).
insert into profiles (id, email, created_at)
select id, email, created_at from auth.users
on conflict (id) do update set email = excluded.email;

-- Y crea su ficha de personnel si todavía no existe ninguna con ese email.
insert into personnel (name, email)
select split_part(u.email, '@', 1), u.email
from auth.users u
where not exists (select 1 from personnel p where lower(p.email) = lower(u.email));

select pg_notify('pgrst', 'reload schema');
