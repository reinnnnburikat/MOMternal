import pg from 'pg';

const { Pool } = pg;

// Server-side database pool using direct PostgreSQL connection to Supabase
const pool = new Pool({
  connectionString: process.env.DATABASE_URL ||
    'postgresql://postgres.qvdxbhjpophjiycjxmxn:qf%23j%26%263yptpJyk%3F@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

/**
 * Run a raw SQL query and return rows.
 * Uses snake_case column names from PostgreSQL.
 */
export async function query<T = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<{ rows: T[]; count?: number }> {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return { rows: result.rows as T[] };
  } finally {
    client.release();
  }
}

/**
 * Run a query and return a single row (or null).
 */
export async function queryOne<T = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<T | null> {
  const { rows } = await query<T>(text, params);
  return rows[0] ?? null;
}

/**
 * Run a count query.
 */
export async function count(
  table: string,
  whereClause?: string,
  params?: unknown[]
): Promise<number> {
  const sql = whereClause
    ? `SELECT COUNT(*)::int as total FROM "${table}" WHERE ${whereClause}`
    : `SELECT COUNT(*)::int as total FROM "${table}"`;
  const result = await queryOne<{ total: number }>(sql, params);
  return result?.total ?? 0;
}

export { pool };
