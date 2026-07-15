// Se conecta SOLO a la base de datos operativa (Jaippy) en modo lectura,
// trae los hoteles ya mapeados a los campos que usa Divisual, y los deja
// en scripts/output/hoteles-jaippy.json para revisar antes de aplicarlos.
// No escribe nada en la base de datos de Jaippy ni en la de Divisual.
//
// Uso:
//   1. Crea un archivo .env.jaippy en la raíz del proyecto (nunca se sube
//      a git) con: JAIPPY_DB_HOST, JAIPPY_DB_PORT, JAIPPY_DB_NAME,
//      JAIPPY_DB_USER, JAIPPY_DB_PASSWORD
//   2. npm run fetch:hoteles

import { Client } from "pg";
import { config } from "dotenv";
import { writeFileSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, "..", ".env.jaippy") });

const { JAIPPY_DB_HOST, JAIPPY_DB_PORT, JAIPPY_DB_NAME, JAIPPY_DB_USER, JAIPPY_DB_PASSWORD } = process.env;

if (!JAIPPY_DB_HOST || !JAIPPY_DB_USER || !JAIPPY_DB_PASSWORD) {
  console.error("Faltan variables de conexión. Crea .env.jaippy con JAIPPY_DB_HOST, JAIPPY_DB_PORT, JAIPPY_DB_NAME, JAIPPY_DB_USER, JAIPPY_DB_PASSWORD.");
  process.exit(1);
}

const client = new Client({
  host: JAIPPY_DB_HOST,
  port: Number(JAIPPY_DB_PORT || 5432),
  database: JAIPPY_DB_NAME || "postgres",
  user: JAIPPY_DB_USER,
  password: JAIPPY_DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
});

// Ya no se usa "planes"/"metricas_plan" para nada (ni objective, ni
// deviation_days, ni plan_end_date, ni deviation_pct calculado a partir
// de ellos) — se dejan sin fuente por ahora. is_client sale de
// hoteles.cliente. current_ij sigue viniendo de metricas.ij.
const QUERY = `
  select
    h.id as jaippy_id,
    h.nombre as name,
    h.tau,
    h.cliente as is_client,
    (select m.ij from metricas m where m.hotel = h.id order by m.fecha desc, m.plataforma asc limit 1) as current_ij,
    h.url_booking as booking_url,
    h.pms,
    h.tipo as category,
    coalesce(bc.estrellas, h.categoria) as stars,
    bc.ciudad as city,
    bc.codigo_postal as postal_code,
    bc.direccion as address,
    bc.descripcion as description
  from hoteles h
  left join raw.hoteles_booking_collisio bc on bc.id = h.id_collisio
  order by h.nombre;
`;

try {
  await client.connect();
  const { rows } = await client.query(QUERY);
  const outDir = path.join(__dirname, "output");
  mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, "hoteles-jaippy.json");
  writeFileSync(outFile, JSON.stringify(rows, null, 2));
  console.log(`${rows.length} hoteles leídos de Jaippy. Guardado en ${outFile}\n`);
  console.table(rows.slice(0, 20).map((r) => ({
    id: r.jaippy_id, name: r.name, cliente: r.is_client, tau: r.tau, ij: r.current_ij,
    stars: r.stars, category: r.category, city: r.city,
  })));
  if (rows.length > 20) console.log(`... y ${rows.length - 20} más (ver el JSON completo).`);
} catch (e) {
  console.error("Error al leer de Jaippy:", e.message);
  process.exit(1);
} finally {
  await client.end();
}
