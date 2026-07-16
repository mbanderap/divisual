// Diagnóstico de solo lectura: cuenta filas de events/events_personnel y
// muestra las últimas creadas, para comprobar si de verdad no se están
// guardando o si es un problema de visualización.
//
// Uso: node scripts/check-events.mjs

import { Client } from "pg";
import { config } from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, "..", ".env.divisual") });

const { DIVISUAL_DB_HOST, DIVISUAL_DB_PORT, DIVISUAL_DB_NAME, DIVISUAL_DB_USER, DIVISUAL_DB_PASSWORD } = process.env;

if (!DIVISUAL_DB_HOST || !DIVISUAL_DB_USER || !DIVISUAL_DB_PASSWORD) {
  console.error("Faltan variables de conexión. Crea .env.divisual con DIVISUAL_DB_HOST, DIVISUAL_DB_PORT, DIVISUAL_DB_NAME, DIVISUAL_DB_USER, DIVISUAL_DB_PASSWORD.");
  process.exit(1);
}

const client = new Client({
  host: DIVISUAL_DB_HOST,
  port: Number(DIVISUAL_DB_PORT || 5432),
  database: DIVISUAL_DB_NAME,
  user: DIVISUAL_DB_USER,
  password: DIVISUAL_DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
});

await client.connect();

const cols = await client.query(`select column_name, data_type from information_schema.columns where table_name = 'events' order by ordinal_position`);
console.log("Columnas de events:");
console.table(cols.rows);

const count = await client.query(`select count(*) from events`);
console.log("Total filas en events:", count.rows[0].count);

const recent = await client.query(`select id, title, category, start_date, end_date, recurrence, created_by, created_at from events order by created_at desc limit 10`);
console.log("Últimos 10 eventos creados:");
console.table(recent.rows);

const linkCount = await client.query(`select count(*) from events_personnel`);
console.log("Total filas en events_personnel:", linkCount.rows[0].count);

await client.end();
