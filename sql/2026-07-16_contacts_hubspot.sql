-- =====================================================================
-- Contacto: soporte para el import de HubSpot (todos-contactos.csv)
-- =====================================================================
alter table contacts add column if not exists hubspot_id bigint;
create unique index if not exists idx_contacts_hubspot_id on contacts(hubspot_id);

-- Para poder volver a ejecutar el import sin duplicar vínculos contacto-empresa.
create unique index if not exists idx_contacts_companies_unique on contacts_companies(contact_id, company_id);
