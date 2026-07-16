-- Se deja de usar HubSpot como plataforma, así que deals no necesita
-- guardar su id de HubSpot (solo servía para poder reimportar sin
-- duplicar). Contacts y Companies SÍ conservan su hubspot_id.
drop index if exists idx_deals_hubspot_id;
alter table deals drop column if exists hubspot_id;
