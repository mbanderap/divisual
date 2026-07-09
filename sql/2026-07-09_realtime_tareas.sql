-- =====================================================================
-- Divisual — Activar Realtime en tasks_personnel (para notificar cuando
-- te asignan una tarea). La tabla `messages` ya lo tiene activado (el Chat
-- ya lo usa); esto añade la pieza que falta.
-- Ejecutar en Supabase → SQL Editor → New query → Run.
-- =====================================================================

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'tasks_personnel'
  ) then
    alter publication supabase_realtime add table tasks_personnel;
  end if;
end $$;
