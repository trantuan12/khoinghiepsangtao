/**
 * SCRIPT CHUYỂN TOÀN BỘ DỮ LIỆU TỪ RAILWAY MYSQL -> SUPABASE POSTGRESQL
 *
 * Cách dùng:
 *   1. Chạy file server/schema_postgres.sql trong Supabase SQL Editor (hoặc để server tự tạo bảng).
 *   2. Đảm bảo trong server/.env có DATABASE_URL (hoặc SUPABASE_DB_URL) trỏ tới Supabase,
 *      và MYSQL_URL hoặc các biến MYSQL_HOST / MYSQL_PORT / MYSQL_USER / MYSQL_PASSWORD / MYSQL_DB
 *      (mặc định đọc từ DB_HOST/DB_USER/DB_PASSWORD/DB_NAME nếu bạn giữ cấu hình MySQL cũ).
 *   3. Chạy: node server/migrate_mysql_to_supabase.mjs
 */

import mysql from 'mysql2/promise';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.join(__dirname, '.env') });

const { Pool } = pg;

// Thứ tự bảng tôn trọng khóa ngoại (bảng cha trước, bảng con sau)
const TABLES_IN_ORDER = [
  'users',
  'password_resets',
  'elderly_profiles',
  'family_profiles',
  'family_subscriptions',
  'caregiver_profiles',
  'caregiver_documents',
  'caregiver_bank_accounts',
  'schedules',
  'booking_escrow_payments',
  'transactions',
  'vouchers',
  'system_settings',
  'messages',
  'notifications',
  'communities',
  'caregiver_reviews',
  'patient_care_logs',
];

const SERIAL_ID_TABLES = TABLES_IN_ORDER.filter((t) => t !== 'system_settings');

async function migrate() {
  const pgUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
  if (!pgUrl) {
    console.error('❌ Thiếu DATABASE_URL hoặc SUPABASE_DB_URL trỏ tới Supabase trong server/.env');
    process.exit(1);
  }

  const mysqlConfig = process.env.MYSQL_URL
    ? process.env.MYSQL_URL
    : {
        host: process.env.MYSQL_HOST || process.env.DB_HOST,
        port: Number(process.env.MYSQL_PORT || process.env.DB_PORT) || 3306,
        user: process.env.MYSQL_USER || process.env.DB_USER || 'root',
        password: process.env.MYSQL_PASSWORD ?? process.env.DB_PASSWORD ?? '',
        database: process.env.MYSQL_DB || process.env.DB_NAME || 'railway',
      };

  if (typeof mysqlConfig === 'object' && !mysqlConfig.host) {
    console.error('❌ Thiếu thông tin kết nối MySQL nguồn (MYSQL_URL hoặc MYSQL_HOST / DB_HOST).');
    process.exit(1);
  }

  console.log('🔌 Đang kết nối MySQL nguồn và Supabase PostgreSQL...');
  const myConn = await mysql.createConnection(mysqlConfig);
  const pgPool = new Pool({
    connectionString: pgUrl,
    ssl: pgUrl.includes('localhost') || pgUrl.includes('127.0.0.1') ? false : { rejectUnauthorized: false },
  });

  try {
    // Tạo schema trên Supabase nếu chưa có
    const schemaPath = path.join(__dirname, 'schema_postgres.sql');
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      await pgPool.query(schemaSql);
      console.log('✅ Đã đảm bảo schema 18 bảng trên Supabase.');
    }

    // Lấy danh sách cột Boolean trên PostgreSQL để ép kiểu 0/1 -> false/true
    const boolColsRes = await pgPool.query(`
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND data_type = 'boolean'
    `);
    const boolColsByTable = new Map();
    for (const r of boolColsRes.rows) {
      if (!boolColsByTable.has(r.table_name)) boolColsByTable.set(r.table_name, new Set());
      boolColsByTable.get(r.table_name).add(r.column_name);
    }

    // Lấy danh sách cột hiện có trên PostgreSQL cho từng bảng
    const pgColsRes = await pgPool.query(`
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
    `);
    const pgColsByTable = new Map();
    for (const r of pgColsRes.rows) {
      if (!pgColsByTable.has(r.table_name)) pgColsByTable.set(r.table_name, new Set());
      pgColsByTable.get(r.table_name).add(r.column_name);
    }

    for (const table of TABLES_IN_ORDER) {
      let rows = [];
      try {
        const [myRows] = await myConn.query(`SELECT * FROM \`${table}\``);
        rows = myRows;
      } catch (err) {
        console.log(`⚠️ Bỏ qua bảng ${table} (không tồn tại ở MySQL nguồn): ${err.message}`);
        continue;
      }

      if (rows.length === 0) {
        console.log(`ℹ️ Bảng ${table}: 0 dòng`);
        continue;
      }

      const validPgCols = pgColsByTable.get(table) || new Set();
      const boolSet = boolColsByTable.get(table) || new Set();
      const cols = Object.keys(rows[0]).filter((c) => validPgCols.has(c));

      if (cols.length === 0) {
        console.log(`⚠️ Bảng ${table}: không tìm thấy cột khớp trên Supabase`);
        continue;
      }

      const colList = cols.map((c) => `"${c}"`).join(', ');
      const placeholders = cols.map((_, idx) => `$${idx + 1}`).join(', ');
      const conflictTarget = table === 'system_settings' ? '(setting_key)' : '(id)';
      const sql = `INSERT INTO "${table}" (${colList}) VALUES (${placeholders}) ON CONFLICT ${conflictTarget} DO NOTHING`;

      let inserted = 0;
      for (const row of rows) {
        const values = cols.map((c) => {
          let val = row[c];
          if (val === undefined) return null;
          if (boolSet.has(c) && val !== null) {
            return Boolean(val === 1 || val === true || val === '1' || val === 'true');
          }
          if (typeof val === 'object' && val !== null && !(val instanceof Date) && !Buffer.isBuffer(val)) {
            return JSON.stringify(val);
          }
          return val;
        });
        const res = await pgPool.query(sql, values);
        inserted += res.rowCount || 0;
      }
      console.log(`✅ Bảng ${table}: đọc ${rows.length} dòng → đã chèn ${inserted} dòng vào Supabase`);
    }

    // Cập nhật lại SERIAL sequence cho toàn bộ bảng có id tự tăng
    for (const table of SERIAL_ID_TABLES) {
      await pgPool.query(
        `SELECT setval(pg_get_serial_sequence($1, 'id'), COALESCE((SELECT MAX(id) FROM "${table}"), 1))`,
        [table]
      );
    }
    console.log('🎉 Đã đồng bộ xong toàn bộ dữ liệu và sequence từ MySQL sang Supabase PostgreSQL!');
  } finally {
    await myConn.end();
    await pgPool.end();
  }
}

migrate().catch((err) => {
  console.error('❌ Lỗi migration:', err);
  process.exit(1);
});
