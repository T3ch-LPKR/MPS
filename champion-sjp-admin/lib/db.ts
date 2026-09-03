import { Pool } from "pg";

// Pool tunggal (reuse antar request). Schema di-set via search_path.
const SCHEMA = process.env.SJP_SCHEMA || "MPS_SJP";

declare global {
  // eslint-disable-next-line no-var
  var _sjpPool: Pool | undefined;
}

function makePool() {
  const pool = new Pool({
    host: process.env.PGHOST,
    port: Number(process.env.PGPORT || 5432),
    database: process.env.PGDATABASE,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    ssl: process.env.PGSSL ? { rejectUnauthorized: false } : undefined,
    max: 5,
    idleTimeoutMillis: 30000,
    // search_path + timezone via STARTUP OPTION -> terpasang di backend saat koneksi dibuka.
    // Andal di Transaction Pooler Supabase (SET session tidak selalu ikut per-transaksi).
    // timezone=Asia/Jakarta: semua to_char(timestamptz) & CURRENT_DATE otomatis WIB.
    options: `-c search_path="${SCHEMA}",public,extensions -c timezone=Asia/Jakarta`,
  });
  // cadangan (bila 'options' tak diteruskan): set lagi tiap koneksi baru
  pool.on("connect", (client) => {
    client.query(`SET search_path TO "${SCHEMA}", public, extensions`).catch(() => {});
    client.query(`SET timezone TO 'Asia/Jakarta'`).catch(() => {});
  });
  return pool;
}

export const pool: Pool = global._sjpPool || makePool();
if (process.env.NODE_ENV !== "production") global._sjpPool = pool;

export async function q<T = any>(text: string, params?: any[]): Promise<T[]> {
  const res = await pool.query(text, params);
  return res.rows as T[];
}

export async function q1<T = any>(text: string, params?: any[]): Promise<T | null> {
  const rows = await q<T>(text, params);
  return rows[0] ?? null;
}
