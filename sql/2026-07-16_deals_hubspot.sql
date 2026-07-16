-- Permite importar/reimportar negocios desde HubSpot de forma idempotente.
alter table deals add column if not exists hubspot_id bigint;
create unique index if not exists idx_deals_hubspot_id on deals (hubspot_id);
