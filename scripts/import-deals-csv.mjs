// Importa el export de HubSpot "todos-negocios.csv" a la tabla deals de
// Divisual. Inserción simple (sin upsert): fue una importación única al
// migrar desde HubSpot, deals no guarda ningún id de HubSpot. Si hace
// falta reimportar, hay que borrar antes las filas ya importadas para no
// duplicar. La etapa de HubSpot se traduce a las 6 etapas de Divisual:
//   Interesados            -> Prospecto
//   Pendiente de respuesta -> Contactado
//   Reunión programada     -> Propuesta
//   Pendiente de Renovación-> Negociación
//   Cierre ganado          -> Ganado
//   Cierre perdido         -> Perdido
// Se vincula con contacts por el primer "Associated Contact IDs" que
// coincida con contacts.hubspot_id. No se vincula con hoteles/empresas:
// el export no trae "ID Jaippy" ni relación clara, así que deals_hotels
// se deja para hacerlo a mano o en una importación aparte.
//
// Uso:
//   node scripts/import-deals-csv.mjs "<ruta al csv>"
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
  console.error("Uso: node scripts/import-deals-csv.mjs <ruta-al-csv>");
  process.exit(1);
}

const nn = (v) => { const t = (v || "").trim(); return t === "" ? null : t; };
const nnum = (v) => { const t = (v || "").trim(); if (t === "") return null; const n = parseFloat(t); return Number.isNaN(n) ? null : n; };
const ndate = (v) => { const t = (v || "").trim(); if (t === "") return null; return t.slice(0, 10); };

const STAGE_MAP = {
  "Interesados": "Prospecto",
  "Pendiente de respuesta": "Contactado",
  "Reunión programada": "Propuesta",
  "Pendiente de Renovación": "Negociación",
  "Cierre ganado": "Ganado",
  "Cierre perdido": "Perdido",
};

console.log("Leyendo CSV...");
const content = readFileSync(csvPath, "utf-8");
const parsed = Papa.parse(content, { header: true });
console.log(`${parsed.data.length} filas leídas.`);

const dealsRaw = parsed.data
  .filter((r) => nn(r["ID de registro"]) && nn(r["Nombre del negocio"]))
  .map((r) => {
    const stageRaw = nn(r["Etapa del negocio"]);
    const contactHubspotId = nn(r["Associated Contact IDs"])?.split(";")[0]?.trim() || null;
    return {
      name: nn(r["Nombre del negocio"]),
      status: stageRaw ? (STAGE_MAP[stageRaw] ?? null) : null,
      stageRaw,
      value: nnum(r["Valor"]),
      closing_date: ndate(r["Fecha de cierre"]),
      start_date: ndate(r["Fecha de inicio de contrato"]),
      end_date: ndate(r["Fecha de fin de contrato"]),
      contactHubspotId,
    };
  });
const unmapped = [...new Set(dealsRaw.filter((d) => d.stageRaw && !d.status).map((d) => d.stageRaw))];
if (unmapped.length) console.log("Aviso: etapas sin traducción (se dejan sin estado):", unmapped);
console.log(`${dealsRaw.length} negocios a importar.`);

const COLUMNS = ["name", "status", "value", "closing_date", "start_date", "end_date", "contact_id"];
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
  const sql = `insert into deals (${COLUMNS.join(", ")}) values ${placeholders.join(", ")};`;
  return { sql, values };
}

try {
  await client.connect();

  console.log("Cargando contactos para vincular por hubspot_id...");
  const { rows: contactRows } = await client.query("select id, hubspot_id from contacts where hubspot_id is not null");
  const contactByHubspotId = new Map(contactRows.map((c) => [c.hubspot_id, c.id]));
  console.log(`${contactByHubspotId.size} contactos cargados.`);

  const deals = dealsRaw.map((d) => ({
    ...d,
    contact_id: d.contactHubspotId ? (contactByHubspotId.get(d.contactHubspotId) ?? null) : null,
  }));

  let done = 0;
  for (let i = 0; i < deals.length; i += BATCH_SIZE) {
    const batch = deals.slice(i, i + BATCH_SIZE);
    const { sql, values } = buildInsert(batch);
    await client.query(sql, values);
    done += batch.length;
    console.log(`${done}/${deals.length} negocios importados...`);
  }
  console.log(`Listo: ${done} negocios importados.`);
  console.log(`${deals.filter((d) => d.contact_id).length} de ${deals.length} vinculados a un contacto.`);
} catch (e) {
  console.error("Error al importar en Divisual:", e.message);
  process.exit(1);
} finally {
  await client.end();
}
