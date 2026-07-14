-- =====================================================================
-- Reset total — borra los datos de TODAS las tablas de la app para
-- empezar completamente limpio. No borra ni toca las cuentas de login
-- de Supabase Auth (auth.users) — eso no se puede hacer desde aquí, y
-- de todas formas hace falta para poder seguir entrando a la app.
--
-- Comprueba cada tabla antes de tocarla (algunas de la lista podrían no
-- existir todavía en tu base real, como ya pasó con "profiles") — si no
-- existe, simplemente se salta, no rompe el resto del script.
-- =====================================================================

do $$
declare
  t text;
begin
  foreach t in array array[
    'personnel', 'companies', 'contacts', 'tags', 'billing_models', 'hotels',
    'stories', 'sprints', 'labels', 'events',
    'contacts_companies', 'contacts_historial', 'personnel_historial',
    'tags_contacts', 'hotels_personnel', 'hotels_contacts', 'events_personnel',
    'deals', 'deals_hotels', 'tickets', 'tickets_contacts',
    'tasks', 'tasks_personnel', 'task_comments', 'task_subitems', 'task_attachments', 'tasks_labels',
    'messages', 'profiles'
  ]
  loop
    if to_regclass('public.' || t) is not null then
      execute format('truncate table %I restart identity cascade;', t);
    end if;
  end loop;
end $$;

-- profiles se rellena sola por un trigger cada vez que alguien inicia
-- sesión o cambia su email en auth.users — pero si nadie hace login /
-- cambia su email justo después del reset, se queda vacía mientras
-- tanto. Esto la repuebla al momento desde auth.users (que sigue
-- intacta), para que Usuarios/Chat/Calendario no se queden sin nadie
-- (solo si la tabla profiles existe de verdad en tu base):
do $$
begin
  if to_regclass('public.profiles') is not null then
    insert into profiles (id, email, created_at)
    select id, email, created_at from auth.users
    on conflict (id) do update set email = excluded.email;
  end if;
end $$;

-- Nota: esto no borra archivos ya subidos al bucket de Storage
-- "deal-attachments" (los adjuntos de ofertas de Negocio) — si quieres
-- vaciar también esos archivos, dímelo y te doy cómo hacerlo desde el
-- Dashboard de Supabase (Storage → deal-attachments → seleccionar todo → eliminar).
-- =====================================================================
