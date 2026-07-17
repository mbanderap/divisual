// Importa el export de HubSpot "todos-tickets.csv" a la tabla tickets de
// Divisual. Inserción simple (sin upsert ni hubspot_id guardado: fue una
// importación única al migrar desde HubSpot). Solo se importan los
// tickets del pipeline "Pipeline CS" (Customer Success, que es el que
// gestiona la pantalla Tickets) — el pipeline "Control de bugs" no
// encaja en este modelo y se descarta.
//
// La etapa de HubSpot se traduce a las 5 etapas de Divisual:
//   Seguimiento activo    -> Seguimiento activo
//   Consolidación         -> Consolidación
//   Décima ya consolidada -> Décima alcanzada
//   Mantenimiento         -> Décima alcanzada
//   Churn / no renueva    -> Cierre de ciclo
//
// Se vincula con hotels por "ID Jaippy" (hotels.jaippy_id), con companies
// por el primer "Associated Company IDs" (companies.hubspot_id), con
// personnel por nombre exacto (case-insensitive) en "Propietario del
// ticket", y con contacts (tickets_contacts) por "Associated Contact IDs".
//
// Uso:
//   node scripts/import-tickets-csv.mjs "<ruta al csv>"
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
  console.error("Uso: node scripts/import-tickets-csv.mjs <ruta-al-csv>");
  process.exit(1);
}

const nn = (v) => { const t = (v || "").trim(); return t === "" ? null : t; };
const ndate = (v) => { const t = (v || "").trim(); if (t === "") return null; return t.slice(0, 10); };
const nint = (v) => { const t = (v || "").trim(); if (t === "") return null; const n = parseInt(t, 10); return Number.isNaN(n) ? null : n; };
const firstId = (v) => nn(v)?.split(";")[0]?.trim() || null;

const STAGE_MAP = {
  "Seguimiento activo": "Seguimiento activo",
  "Consolidación": "Consolidación",
  "Décima ya consolidada": "Décima alcanzada",
  "Mantenimiento": "Décima alcanzada",
  "Churn / no renueva": "Cierre de ciclo",
};

console.log("Leyendo CSV...");
const content = readFileSync(csvPath, "utf-8");
const parsed = Papa.parse(content, { header: true });
console.log(`${parsed.data.length} filas leídas.`);

const allRows = parsed.data.filter((r) => nn(r["Ticket ID"]) && nn(r["Nombre del ticket"]));
const csRows = allRows.filter((r) => r["Pipeline"] === "Pipeline CS");
console.log(`${allRows.length} filas totales, ${csRows.length} del pipeline Customer Success (resto descartado).`);

const ticketsRaw = csRows.map((r) => {
  const stageRaw = nn(r["Estado del ticket"]);
  return {
    title: nn(r["Nombre del ticket"]),
    status: stageRaw ? (STAGE_MAP[stageRaw] ?? null) : null,
    stageRaw,
    plan_end_date: ndate(r["Jaippy - Fecha fin plan"]) ?? ndate(r["Fecha fin del plan"]),
    jaippyId: nint(r["ID Jaippy"]),
    companyHubspotId: firstId(r["Associated Company IDs"]),
    contactHubspotIds: nn(r["Associated Contact IDs"])?.split(";").map((x) => x.trim()).filter(Boolean) ?? [],
    ownerName: nn(r["Propietario del ticket"]),
  };
});
const unmapped = [...new Set(ticketsRaw.filter((t) => t.stageRaw && !t.status).map((t) => t.stageRaw))];
if (unmapped.length) console.log("Aviso: etapas sin traducción (se dejan sin estado):", unmapped);
console.log(`${ticketsRaw.length} tickets a importar.`);

const COLUMNS = ["title", "status", "plan_end_date", "company_id", "owner_id", "hotel_id"];
const BATCH_SIZE = 500;

const client = new Client({
  host: DIVISUAL_DB_HOST, port: Number(DIVISUAL_DB_PORT || 5432), database: DIVISUAL_DB_NAME || "postgres",
  user: DIVISUAL_DB_USER, password: DIVISUAL_DB_PASSWORD, ssl: { rejectUnauthorized: false },
});

function buildInsert(batch) {
  const values = [];
  const placeholders = batch.map((row, i) => {
    const base = i * COLUMNS.length;
    COLUMNS.forEach((col) => values.push(row[col] ?? null));
    return `(${COLUMNS.map((_, j) => `$${base + j + 1}`).join(", ")})`;
  });
  const sql = `insert into tickets (${COLUMNS.join(", ")}) values ${placeholders.join(", ")} returning id;`;
  return { sql, values };
}

try {
  await client.connect();

  console.log("Cargando hoteles, empresas, contactos y personal para vincular...");
  const { rows: hotelRows } = await client.query("select id, jaippy_id from hotels where jaippy_id is not null");
  const hotelByJaippyId = new Map(hotelRows.map((h) => [h.jaippy_id, h.id]));
  const { rows: companyRows } = await client.query("select id, hubspot_id from companies where hubspot_id is not null");
  const companyByHubspotId = new Map(companyRows.map((c) => [c.hubspot_id, c.id]));
  const { rows: contactRows } = await client.query("select id, hubspot_id from contacts where hubspot_id is not null");
  const contactByHubspotId = new Map(contactRows.map((c) => [c.hubspot_id, c.id]));
  const { rows: personnelRows } = await client.query("select id, name from personnel");
  const personnelByName = new Map(personnelRows.map((p) => [p.name.trim().toLowerCase(), p.id]));
  console.log(`${hotelByJaippyId.size} hoteles, ${companyByHubspotId.size} empresas, ${contactByHubspotId.size} contactos, ${personnelByName.size} personal.`);

  const tickets = ticketsRaw.map((t) => ({
    ...t,
    hotel_id: t.jaippyId != null ? (hotelByJaippyId.get(t.jaippyId) ?? null) : null,
    company_id: t.companyHubspotId ? (companyByHubspotId.get(t.companyHubspotId) ?? null) : null,
    owner_id: t.ownerName ? (personnelByName.get(t.ownerName.toLowerCase()) ?? null) : null,
  }));

  let done = 0;
  const allInsertedIds = [];
  for (let i = 0; i < tickets.length; i += BATCH_SIZE) {
    const batch = tickets.slice(i, i + BATCH_SIZE);
    const { sql, values } = buildInsert(batch);
    const { rows: inserted } = await client.query(sql, values);
    inserted.forEach((r, j) => allInsertedIds.push({ id: r.id, ticket: batch[j] }));
    done += batch.length;
    console.log(`${done}/${tickets.length} tickets importados...`);
  }
  console.log(`Listo: ${done} tickets importados.`);
  console.log(`${tickets.filter((t) => t.hotel_id).length} de ${tickets.length} vinculados a un hotel.`);
  console.log(`${tickets.filter((t) => t.company_id).length} de ${tickets.length} vinculados a una empresa.`);
  console.log(`${tickets.filter((t) => t.owner_id).length} de ${tickets.length} vinculados a un propietario (personal).`);

  const links = [];
  for (const { id, ticket } of allInsertedIds) {
    for (const hid of ticket.contactHubspotIds) {
      const contactId = contactByHubspotId.get(hid);
      if (contactId) links.push({ ticket_id: id, contact_id: contactId });
    }
  }
  console.log(`Vinculando ${links.length} contactos a sus tickets...`);
  for (let i = 0; i < links.length; i += BATCH_SIZE) {
    const batch = links.slice(i, i + BATCH_SIZE);
    const values = [];
    const placeholders = batch.map((row, j) => {
      values.push(row.ticket_id, row.contact_id);
      return `($${j * 2 + 1}, $${j * 2 + 2})`;
    });
    await client.query(
      `insert into tickets_contacts (ticket_id, contact_id) values ${placeholders.join(", ")} on conflict do nothing;`,
      values,
    );
  }
  console.log(`Listo: ${links.length} vínculos ticket-contacto creados.`);
} catch (e) {
  console.error("Error al importar en Divisual:", e.message);
  process.exit(1);
} finally {
  await client.end();
}
