// Lee scripts/output/hoteles-jaippy.json (generado por fetch-hoteles-jaippy.mjs)
// y hace upsert de todos los hoteles en la tabla hotels de Divisual,
// emparejando por jaippy_id. Se puede volver a ejecutar sin duplicar.
//
// Uso:
//   1. Crea un archivo .env.divisual en la raíz del proyecto (nunca se
//      sube a git) con: DIVISUAL_DB_HOST, DIVISUAL_DB_PORT,
//      DIVISUAL_DB_NAME, DIVISUAL_DB_USER, DIVISUAL_DB_PASSWORD
//   2. npm run import:hoteles

import { Client } from "pg";
import { config } from "dotenv";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, "..", ".env.divisual") });

const { DIVISUAL_DB_HOST, DIVISUAL_DB_PORT, DIVISUAL_DB_NAME, DIVISUAL_DB_USER, DIVISUAL_DB_PASSWORD } = process.env;

if (!DIVISUAL_DB_HOST || !DIVISUAL_DB_USER || !DIVISUAL_DB_PASSWORD) {
  console.error("Faltan variables de conexión. Crea .env.divisual con DIVISUAL_DB_HOST, DIVISUAL_DB_PORT, DIVISUAL_DB_NAME, DIVISUAL_DB_USER, DIVISUAL_DB_PASSWORD.");
  process.exit(1);
}

const inputFile = path.join(__dirname, "output", "hoteles-jaippy.json");
const hoteles = JSON.parse(readFileSync(inputFile, "utf-8"));
console.log(`${hoteles.length} hoteles a importar desde ${inputFile}`);

const COLUMNS = ["jaippy_id", "name", "tau", "is_client", "current_ij", "booking_url", "pms", "category", "stars", "city", "postal_code", "address", "description"];
const BATCH_SIZE = 500;

const client = new Client({
  host: DIVISUAL_DB_HOST,
  port: Number(DIVISUAL_DB_PORT || 5432),
  database: DIVISUAL_DB_NAME || "postgres",
  user: DIVISUAL_DB_USER,
  password: DIVISUAL_DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
});

function buildUpsert(batch) {
  const values = [];
  const placeholders = batch.map((row, i) => {
    const base = i * COLUMNS.length;
    COLUMNS.forEach((col) => values.push(row[col] ?? null));
    return `(${COLUMNS.map((_, j) => `$${base + j + 1}`).join(", ")}, now())`;
  });
  const setClause = COLUMNS.filter((c) => c !== "jaippy_id").map((c) => `${c} = excluded.${c}`).join(", ");
  const sql = `
    insert into hotels (${COLUMNS.join(", ")}, updated_at)
    values ${placeholders.join(", ")}
    on conflict (jaippy_id) do update set ${setClause}, updated_at = now();
  `;
  return { sql, values };
}

try {
  await client.connect();

  // hotels.name tenía un UNIQUE (de cuando solo se emparejaba por nombre).
  // Con 12.807 hoteles reales hay 230 nombres repetidos (hoteles distintos
  // con el mismo nombre) — ya no hace falta esa restricción porque ahora
  // se empareja por jaippy_id, así que se quita antes de importar.
  const { rows: constraints } = await client.query(`
    select conname from pg_constraint
    where conrelid = 'hotels'::regclass and contype = 'u'
      and conkey = (select array_agg(attnum) from pg_attribute where attrelid = 'hotels'::regclass and attname = 'name')
  `);
  for (const { conname } of constraints) {
    console.log(`Quitando restricción única ${conname} de hotels.name...`);
    await client.query(`alter table hotels drop constraint ${client.escapeIdentifier(conname)};`);
  }

  let done = 0;
  for (let i = 0; i < hoteles.length; i += BATCH_SIZE) {
    const batch = hoteles.slice(i, i + BATCH_SIZE);
    const { sql, values } = buildUpsert(batch);
    await client.query(sql, values);
    done += batch.length;
    console.log(`${done}/${hoteles.length} hoteles importados...`);
  }
  console.log(`Listo: ${done} hoteles importados/actualizados en Divisual.`);
} catch (e) {
  console.error("Error al importar en Divisual:", e.message);
  process.exit(1);
} finally {
  await client.end();
}
