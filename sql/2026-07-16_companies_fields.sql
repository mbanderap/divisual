-- =====================================================================
-- Empresa: campos nuevos para el import de HubSpot (todos-empresas.csv)
-- =====================================================================
alter table companies add column if not exists hubspot_id bigint;
create unique index if not exists idx_companies_hubspot_id on companies(hubspot_id);

alter table companies add column if not exists tax_id text; -- NIF
alter table companies add column if not exists legal_name text; -- Razón social
alter table companies add column if not exists address text; -- Domicilio social / Dirección
alter table companies add column if not exists city text;
alter table companies add column if not exists postal_code text;
alter table companies add column if not exists province text;
alter table companies add column if not exists country text;
alter table companies add column if not exists website_url text;
alter table companies add column if not exists description text;
