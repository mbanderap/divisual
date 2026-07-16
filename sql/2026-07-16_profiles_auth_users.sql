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

-- security definer: los triggers sobre auth.users se ejecutan con el rol
-- interno de Supabase Auth, que no tiene permiso de escritura en
-- public.profiles por sí mismo.
create or replace function handle_new_auth_user() returns trigger as $$
begin
  insert into profiles (id, email) values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;
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

select pg_notify('pgrst', 'reload schema');
