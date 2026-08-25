import sql from 'mssql';

// Azure SQL Database connection pool.
//
// Required environment variables (see .env.example):
//   AZURE_SQL_SERVER    e.g. ced-direct-sql.database.windows.net
//   AZURE_SQL_DATABASE  e.g. ced-direct
//   AZURE_SQL_USER      SQL authentication login (skip if using Azure AD/managed identity auth)
//   AZURE_SQL_PASSWORD  SQL authentication password
//
// The pool is created once per server process and reused across requests/route handlers.
// Run database_schema.sql against the target database before first use.

const requiredEnv = ['AZURE_SQL_SERVER', 'AZURE_SQL_DATABASE'] as const;
for (const key of requiredEnv) {
  if (!process.env[key]) {
    // Don't throw at import time in build contexts; surface a clear error on first real query instead.
    console.warn(`[db] Missing environment variable ${key}. Set it in .env.local or your hosting environment.`);
  }
}

const config: sql.config = {
  server: process.env.AZURE_SQL_SERVER || '',
  database: process.env.AZURE_SQL_DATABASE || '',
  user: process.env.AZURE_SQL_USER,
  password: process.env.AZURE_SQL_PASSWORD,
  port: process.env.AZURE_SQL_PORT ? parseInt(process.env.AZURE_SQL_PORT, 10) : 1433,
  options: {
    // Azure SQL requires encrypt=true with a real cert. A local SQL Server
    // Express instance uses a self-signed cert, so for local set
    // AZURE_SQL_ENCRYPT=false (simplest) or AZURE_SQL_TRUST_CERT=true.
    encrypt: (process.env.AZURE_SQL_ENCRYPT ?? 'true') !== 'false',
    trustServerCertificate: process.env.AZURE_SQL_TRUST_CERT === 'true',
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

let poolPromise: Promise<sql.ConnectionPool> | null = null;

export function getPool(): Promise<sql.ConnectionPool> {
  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool(config).connect().catch((err) => {
      poolPromise = null; // allow retry on next call instead of caching a rejected pool forever
      throw err;
    });
  }
  return poolPromise;
}

type Params = Record<string, unknown>;

/** Run a parameterized query and return all rows. Use named params: `WHERE id = @id`, `{ id: 5 }`. */
export async function query<T = Record<string, unknown>>(text: string, params: Params = {}): Promise<T[]> {
  const pool = await getPool();
  const request = pool.request();
  for (const [key, value] of Object.entries(params)) {
    request.input(key, value as sql.ISqlType | string | number | boolean | Date | Buffer | null | undefined);
  }
  const result = await request.query(text);
  return result.recordset as unknown as T[];
}

/** Run a parameterized query and return the first row, or undefined if none matched. */
export async function queryOne<T = Record<string, unknown>>(
  text: string,
  params: Params = {}
): Promise<T | undefined> {
  const rows = await query<T>(text, params);
  return rows[0];
}

/** Run an INSERT/UPDATE/DELETE and return rowsAffected + (for statements using OUTPUT) the recordset. */
export async function execute(
  text: string,
  params: Params = {}
): Promise<{ rowsAffected: number[]; recordset: Record<string, unknown>[] }> {
  const pool = await getPool();
  const request = pool.request();
  for (const [key, value] of Object.entries(params)) {
    request.input(key, value as sql.ISqlType | string | number | boolean | Date | Buffer | null | undefined);
  }
  const result = await request.query(text);
  return { rowsAffected: result.rowsAffected, recordset: (result.recordset as unknown as Record<string, unknown>[]) ?? [] };
}

export { sql };
