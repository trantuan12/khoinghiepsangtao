import pg from 'pg';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.join(__dirname, '.env') });

const { Pool, types } = pg;

// Parse PostgreSQL BIGINT (OID 20) as JS number so COUNT(*) === 0 / > 0 works identically to MySQL
types.setTypeParser(20, (val) => (val === null ? null : parseInt(val, 10)));
// Parse PostgreSQL NUMERIC/DECIMAL (OID 1700) as JS float
types.setTypeParser(1700, (val) => (val === null ? null : parseFloat(val)));

/**
 * Convert MySQL-style `?` placeholders to PostgreSQL `$1, $2, ...`
 * while ignoring `?` inside string literals, quoted identifiers, or comments.
 */
export function convertPlaceholders(sql) {
  if (!sql || !sql.includes('?')) return sql;

  let out = '';
  let paramIndex = 1;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    const next = sql[i + 1];

    if (inLineComment) {
      out += ch;
      if (ch === '\n') inLineComment = false;
      continue;
    }

    if (inBlockComment) {
      out += ch;
      if (ch === '*' && next === '/') {
        out += '/';
        i++;
        inBlockComment = false;
      }
      continue;
    }

    if (inSingleQuote) {
      out += ch;
      if (ch === '\\' && next !== undefined) {
        out += next;
        i++;
      } else if (ch === "'" && next === "'") {
        out += "'";
        i++;
      } else if (ch === "'") {
        inSingleQuote = false;
      }
      continue;
    }

    if (inDoubleQuote) {
      out += ch;
      if (ch === '"' && next === '"') {
        out += '"';
        i++;
      } else if (ch === '"') {
        inDoubleQuote = false;
      }
      continue;
    }

    if (ch === '-' && next === '-') {
      inLineComment = true;
      out += '--';
      i++;
      continue;
    }

    if (ch === '/' && next === '*') {
      inBlockComment = true;
      out += '/*';
      i++;
      continue;
    }

    if (ch === "'") {
      inSingleQuote = true;
      out += ch;
      continue;
    }

    if (ch === '"') {
      inDoubleQuote = true;
      out += ch;
      continue;
    }

    if (ch === '?') {
      out += `$${paramIndex++}`;
      continue;
    }

    out += ch;
  }

  return out;
}

function buildPgPoolConfig() {
  const connectionString =
    process.env.DATABASE_URL ||
    process.env.SUPABASE_DB_URL ||
    process.env.POSTGRES_URL ||
    '';

  const isLocalHost = (h) => !h || h === 'localhost' || h === '127.0.0.1';
  const explicitSsl = process.env.DB_SSL;

  if (connectionString) {
    const useSsl =
      explicitSsl === 'false'
        ? false
        : !connectionString.includes('localhost') && !connectionString.includes('127.0.0.1');
    return {
      connectionString,
      ssl: useSsl ? { rejectUnauthorized: false } : false,
      max: Number(process.env.PG_POOL_MAX) || (process.env.VERCEL ? 5 : 10),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 15000,
    };
  }

  const host = process.env.PG_HOST || process.env.DB_HOST || 'localhost';
  const port = Number(process.env.PG_PORT || process.env.DB_PORT) || 5432;
  const user = process.env.PG_USER || process.env.DB_USER || 'postgres';
  const password = process.env.PG_PASSWORD || process.env.DB_PASSWORD || '';
  const database = process.env.PG_DATABASE || process.env.DB_NAME || 'postgres';

  const useSsl =
    explicitSsl === 'true'
      ? true
      : explicitSsl === 'false'
      ? false
      : !isLocalHost(host);

  return {
    host,
    port,
    user,
    password,
    database,
    ssl: useSsl ? { rejectUnauthorized: false } : false,
    max: Number(process.env.PG_POOL_MAX) || (process.env.VERCEL ? 5 : 10),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 15000,
  };
}

export const pgConfig = buildPgPoolConfig();

let pgPool = null;

export function getPgPool() {
  if (!pgPool) {
    pgPool = new Pool(pgConfig);
    pgPool.on('error', (err) => {
      console.error('⚠️ [PostgreSQL Pool] Unexpected idle client error:', err.message);
    });
  }
  return pgPool;
}

function formatPgResult(res) {
  if (res.command === 'SELECT' || res.command === 'SHOW') {
    return [res.rows, res];
  }
  const meta = {
    insertId: res.rows?.[0]?.id ?? null,
    affectedRows: res.rowCount ?? 0,
    rowCount: res.rowCount ?? 0,
    rows: res.rows ?? [],
  };
  return [meta, res];
}

function normalizeParams(params) {
  if (!Array.isArray(params)) return [];
  return params.map((p) => (p === undefined ? null : p));
}

/**
 * mysql2-compatible pool adapter backed by pg.Pool
 */
export const pool = {
  async execute(sql, params = []) {
    const p = getPgPool();
    const pgSql = convertPlaceholders(sql);
    const res = await p.query(pgSql, normalizeParams(params));
    return formatPgResult(res);
  },

  async query(sql, params = []) {
    const p = getPgPool();
    const pgSql = convertPlaceholders(sql);
    const res = await p.query(pgSql, normalizeParams(params));
    return formatPgResult(res);
  },

  async getConnection() {
    const client = await getPgPool().connect();
    return {
      async ping() {
        await client.query('SELECT 1');
      },
      async execute(sql, params = []) {
        const pgSql = convertPlaceholders(sql);
        const res = await client.query(pgSql, normalizeParams(params));
        return formatPgResult(res);
      },
      async query(sql, params = []) {
        const pgSql = convertPlaceholders(sql);
        const res = await client.query(pgSql, normalizeParams(params));
        return formatPgResult(res);
      },
      async beginTransaction() {
        await client.query('BEGIN');
      },
      async commit() {
        await client.query('COMMIT');
      },
      async rollback() {
        await client.query('ROLLBACK');
      },
      release() {
        client.release();
      },
    };
  },
};

export function getDbSummary() {
  if (pgConfig.connectionString) {
    try {
      const parsed = new URL(pgConfig.connectionString);
      return {
        host: parsed.hostname,
        port: parsed.port || '5432',
        database: parsed.pathname.replace(/^\//, '') || 'postgres',
      };
    } catch {
      return { host: 'supabase', port: '5432', database: 'postgres' };
    }
  }
  return {
    host: pgConfig.host,
    port: String(pgConfig.port),
    database: pgConfig.database,
  };
}
