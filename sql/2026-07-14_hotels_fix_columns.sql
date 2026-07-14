-- =====================================================================
-- Ajuste de columnas de hotels para que coincida con lo que se usa en
-- el código, tras comparar con la tabla real (información_schema).
-- =====================================================================

-- Ya no se usan en el modelo de Hotel (decisión: quitarlas del todo).
alter table hotels drop column if exists website_url;
alter table hotels drop column if exists annual_revenue;
alter table hotels drop column if exists timezone;

-- Ya existían en la tabla real pero no estaban en el código — se
-- incorporan al formulario de Hotel. Esta línea es solo red de
-- seguridad por si se ejecuta este script en otro entorno donde no
-- existan todavía.
alter table hotels add column if not exists income_current_month numeric;
alter table hotels add column if not exists income_next_month numeric;
