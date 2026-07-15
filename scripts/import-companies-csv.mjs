// Importa el export de HubSpot "todos-empresas.csv" a la tabla companies
// de Divisual. Upsert por hubspot_id (columna "ID de registro"), así que
// se puede volver a ejecutar sin duplicar. Salta filas sin nombre.
//
// Uso:
//   node scripts/import-companies-csv.mjs "<ruta al csv>"
//   (usa .env.divisual para la conexión, igual que el import de hoteles)

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
  console.error("Uso: node scripts/import-companies-csv.mjs <ruta-al-csv>");
  process.exit(1);
}

const nn = (v) => { const t = (v || "").trim(); return t === "" ? null : t; };
const nnum = (v) => { const t = (v || "").trim(); if (t === "") return null; const n = parseFloat(t); return Number.isNaN(n) ? null : n; };

console.log("Leyendo CSV...");
const content = readFileSync(csvPath, "utf-8");
const parsed = Papa.parse(content, { header: true });
console.log(`${parsed.data.length} filas leídas.`);

const companies = parsed.data
  .filter((r) => nn(r["Nombre de la empresa"]))
  .map((r) => ({
    hubspot_id: nnum(r["ID de registro"]),
    name: r["Nombre de la empresa"].trim(),
    phone: nn(r["Número de teléfono"]),
    category: nn(r["Categoría"]),
    client: (r["Jaippy - Es cliente"] || "").trim().toLowerCase() === "true",
    tax_id: nn(r["NIF"]),
    legal_name: nn(r["Razón social"]),
    address: nn(r["Dirección"]) ?? nn(r["Domicilio social"]),
    city: nn(r["Ciudad"]) ?? nn(r["Municipio"]),
    postal_code: nn(r["Código postal"]),
    province: nn(r["Provincia"]) ?? nn(r["CCAA"]) ?? nn(r["Estado o región"]),
    country: nn(r["País/región"]),
    website_url: nn(r["URL del sitio web"]),
    description: nn(r["Descripción"]),
  }));
console.log(`${companies.length} filas con nombre a importar (${parsed.data.length - companies.length} sin nombre, saltadas).`);

const COLUMNS = ["hubspot_id", "name", "phone", "category", "client", "tax_id", "legal_name", "address", "city", "postal_code", "province", "country", "website_url", "description"];
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
    insert into companies (${COLUMNS.join(", ")})
    values ${placeholders.join(", ")}
    on conflict (hubspot_id) do update set ${setClause};
  `;
  return { sql, values };
}

try {
  await client.connect();
  let done = 0;
  for (let i = 0; i < companies.length; i += BATCH_SIZE) {
    const batch = companies.slice(i, i + BATCH_SIZE);
    const { sql, values } = buildUpsert(batch);
    await client.query(sql, values);
    done += batch.length;
    console.log(`${done}/${companies.length} empresas importadas...`);
  }
  console.log(`Listo: ${done} empresas importadas/actualizadas en Divisual.`);
} catch (e) {
  console.error("Error al importar en Divisual:", e.message);
  process.exit(1);
} finally {
  await client.end();
}
