// Importa el export de HubSpot "todos-contactos.csv" a la tabla contacts
// de Divisual. Upsert por hubspot_id, así que se puede volver a ejecutar
// sin duplicar. Si el contacto no tiene ni Nombre ni Apellidos, usa la
// parte del correo antes de la @ como nombre. Vincula con companies por
// coincidencia exacta de nombre (case-insensitive) cuando hay "Nombre de
// la empresa"; el cargo se guarda en contacts_companies.role.
//
// Uso:
//   node scripts/import-contacts-csv.mjs "<ruta al csv>"
//   (usa .env.divisual para la conexión)

import { Client } from "pg";
import { config } from "dotenv";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import Papa from "papaparse";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, "..", ".env.divisual") });

const { DIVISUAL_DB_HOST, DIVISUAL_DB_PORT, DIVISUAL_DB_NAME, DIVISUAL_DB_USER, DIVISUAL_DB_PASSWORD } = process.env;
if (!DIVISUAL_DB_HOST || !DIVISUAL_DB_USER || !DIVISUAL_DB_PASSWORD) {
  console.error("Faltan variables de conexión en .env.divisual.");
  process.exit(1);
}

const csvPath = process.argv[2];
if (!csvPath) {
  console.error("Uso: node scripts/import-contacts-csv.mjs <ruta-al-csv>");
  process.exit(1);
}

const nn = (v) => { const t = (v || "").trim(); return t === "" ? null : t; };
const nnum = (v) => { const t = (v || "").trim(); if (t === "") return null; const n = parseFloat(t); return Number.isNaN(n) ? null : n; };

console.log("Leyendo CSV...");
const content = readFileSync(csvPath, "utf-8");
const parsed = Papa.parse(content, { header: true });
console.log(`${parsed.data.length} filas leídas.`);

const contactsRaw = parsed.data.map((r) => {
  const nombre = nn(r["Nombre"]);
  const apellidos = nn(r["Apellidos"]);
  const email = nn(r["Correo"]);
  let name = [nombre, apellidos].filter(Boolean).join(" ").trim();
  if (!name) name = email ? email.split("@")[0] : null;
  return {
    hubspot_id: nnum(r["ID de registro"]),
    name,
    last_name: apellidos,
    email,
    phone: nn(r["Número de teléfono"]),
    mobile_phone: nn(r["Número de móvil"]),
    lead_status: "Lead",
    companyName: nn(r["Nombre de la empresa"]),
    role: nn(r["Cargo"]),
  };
});
const contacts = contactsRaw.filter((c) => c.name);
console.log(`${contacts.length} filas con nombre a importar (${contactsRaw.length - contacts.length} sin nombre ni correo, saltadas).`);

const COLUMNS = ["hubspot_id", "name", "last_name", "email", "phone", "mobile_phone", "lead_status"];
const BATCH_SIZE = 500;

const client = new Client({
  host: DIVISUAL_DB_HOST, port: Number(DIVISUAL_DB_PORT || 5432), database: DIVISUAL_DB_NAME || "postgres",
  user: DIVISUAL_DB_USER, password: DIVISUAL_DB_PASSWORD, ssl: { rejectUnauthorized: false },
});

function buildUpsert(batch) {
  const values = [];
  const placeholders = batch.map((row, i) => {
    const base = i * COLUMNS.length;
    COLUMNS.forEach((col) => values.push(row[col] ?? null));
    return `(${COLUMNS.map((_, j) => `$${base + j + 1}`).join(", ")})`;
  });
  const setClause = COLUMNS.filter((c) => c !== "hubspot_id").map((c) => `${c} = excluded.${c}`).join(", ");
  const sql = `
    insert into contacts (${COLUMNS.join(", ")})
    values ${placeholders.join(", ")}
    on conflict (hubspot_id) do update set ${setClause}
    returning id, hubspot_id;
  `;
  return { sql, values };
}

try {
  await client.connect();

  console.log("Cargando empresas para vincular por nombre...");
  const { rows: companyRows } = await client.query("select id, name from companies");
  const companyByName = new Map(companyRows.map((c) => [c.name.trim().toLowerCase(), c.id]));
  console.log(`${companyByName.size} empresas cargadas.`);

  let done = 0;
  const links = [];
  for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
    const batch = contacts.slice(i, i + BATCH_SIZE);
    const { sql, values } = buildUpsert(batch);
    const { rows: inserted } = await client.query(sql, values);
    const idByHubspotId = new Map(inserted.map((r) => [String(r.hubspot_id), r.id]));
    for (const c of batch) {
      if (!c.companyName) continue;
      const companyId = companyByName.get(c.companyName.trim().toLowerCase());
      if (!companyId) continue;
      const contactId = idByHubspotId.get(String(c.hubspot_id));
      if (!contactId) continue;
      links.push({ contact_id: contactId, company_id: companyId, role: c.role });
    }
    done += batch.length;
    console.log(`${done}/${contacts.length} contactos importados...`);
  }
  console.log(`Listo: ${done} contactos importados/actualizados.`);

  console.log(`Vinculando ${links.length} contactos a su empresa...`);
  let linked = 0;
  for (let i = 0; i < links.length; i += BATCH_SIZE) {
    const batch = links.slice(i, i + BATCH_SIZE);
    const values = [];
    const placeholders = batch.map((row, j) => {
      values.push(row.contact_id, row.company_id, row.role);
      return `($${j * 3 + 1}, $${j * 3 + 2}, $${j * 3 + 3})`;
    });
    await client.query(
      `insert into contacts_companies (contact_id, company_id, role) values ${placeholders.join(", ")} on conflict (contact_id, company_id) do update set role = excluded.role;`,
      values,
    );
    linked += batch.length;
    console.log(`${linked}/${links.length} vínculos creados...`);
  }
  console.log(`Listo: ${linked} vínculos contacto-empresa creados/actualizados.`);
} catch (e) {
  console.error("Error al importar en Divisual:", e.message);
  process.exit(1);
} finally {
  await client.end();
}
