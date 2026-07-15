-- =====================================================================
-- Hotel ya no usa el concepto de "plan" (deviation_days, deviation_pct,
-- plan_end_date venían de la tabla "planes", que ya no se consulta).
-- Se quitan del todo, tanto de la pantalla como de la tabla.
-- =====================================================================
alter table hotels drop column if exists deviation_days;
alter table hotels drop column if exists deviation_pct;
alter table hotels drop column if exists plan_end_date;
