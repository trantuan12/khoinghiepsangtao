/**
 * HỆ THỐNG MIGRATION VERSION HÓA & INDEX TỐI ƯU HIỆU NĂNG POSTGRESQL (GIAI ĐOẠN 3)
 * - Quản lý lịch sử migration qua bảng schema_migrations
 * - Tạo đầy đủ index cho các bảng truy vấn tần suất cao (users, elderly_profiles, schedules,
 *   patient_care_logs, transactions, booking_escrow_payments, messages, notifications)
 * - Có thể chạy độc lập bằng lệnh: node server/db/migrations.js
 */

import { fileURLToPath } from 'node:url';
import { pool, getPgPool } from '../db.js';
import { ensureSecurityTables } from '../security.js';
import { ensureAuthSchemaAndMigrateUsers } from '../auth.js';

export const CURRENT_MIGRATION_VERSION = '20261119_01_indexes_and_security_hardening';

const PERFORMANCE_INDEX_STATEMENTS = [
  'CREATE INDEX IF NOT EXISTS idx_users_lower_email ON users (LOWER(email))',
  'CREATE INDEX IF NOT EXISTS idx_users_role_created ON users (role, created_at DESC)',
  'CREATE INDEX IF NOT EXISTS idx_elderly_profiles_user_created ON elderly_profiles (user_id, created_at DESC)',
  'CREATE INDEX IF NOT EXISTS idx_caregiver_profiles_user ON caregiver_profiles (user_id)',
  'CREATE INDEX IF NOT EXISTS idx_caregiver_profiles_score ON caregiver_profiles (care_score DESC)',
  'CREATE INDEX IF NOT EXISTS idx_family_profiles_user ON family_profiles (user_id)',
  'CREATE INDEX IF NOT EXISTS idx_schedules_family_created ON schedules (family_user_id, created_at DESC)',
  'CREATE INDEX IF NOT EXISTS idx_schedules_caregiver_created ON schedules (caregiver_user_id, created_at DESC)',
  'CREATE INDEX IF NOT EXISTS idx_schedules_status_date ON schedules (status, schedule_date)',
  'CREATE INDEX IF NOT EXISTS idx_care_logs_family_date ON patient_care_logs (family_user_id, log_date DESC, created_at DESC)',
  'CREATE INDEX IF NOT EXISTS idx_care_logs_caregiver_date ON patient_care_logs (caregiver_user_id, log_date DESC, created_at DESC)',
  'CREATE INDEX IF NOT EXISTS idx_care_logs_elderly_profile ON patient_care_logs (elderly_profile_id)',
  'CREATE INDEX IF NOT EXISTS idx_transactions_family_created ON transactions (family_user_id, created_at DESC)',
  'CREATE INDEX IF NOT EXISTS idx_transactions_caregiver_created ON transactions (caregiver_user_id, created_at DESC)',
  'CREATE INDEX IF NOT EXISTS idx_escrow_family_created ON booking_escrow_payments (family_user_id, created_at DESC)',
  'CREATE INDEX IF NOT EXISTS idx_escrow_caregiver_created ON booking_escrow_payments (caregiver_user_id, created_at DESC)',
  'CREATE INDEX IF NOT EXISTS idx_escrow_status ON booking_escrow_payments (escrow_status)',
  'CREATE INDEX IF NOT EXISTS idx_messages_conv_created ON messages (conversation_id, created_at ASC)',
  'CREATE INDEX IF NOT EXISTS idx_messages_recipient_unread ON messages (recipient_user_id, is_read)',
  'CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created ON notifications (user_id, is_read, created_at DESC)',
];

export async function runVersionedMigrations(dbPool = pool, isDbConnected = true) {
  if (!dbPool || !isDbConnected) return { applied: false, version: CURRENT_MIGRATION_VERSION };

  await dbPool.execute(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(96) PRIMARY KEY,
      description TEXT DEFAULT NULL,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await ensureSecurityTables(dbPool, isDbConnected);
  await ensureAuthSchemaAndMigrateUsers(dbPool, isDbConnected);

  const [existing] = await dbPool.execute(
    'SELECT version FROM schema_migrations WHERE version = ? LIMIT 1',
    [CURRENT_MIGRATION_VERSION]
  );
  if (existing.length > 0) {
    return { applied: false, alreadyUpToDate: true, version: CURRENT_MIGRATION_VERSION };
  }

  let indexesCreated = 0;
  for (const sql of PERFORMANCE_INDEX_STATEMENTS) {
    try {
      await dbPool.execute(sql);
      indexesCreated++;
    } catch {
      // Bảng có thể chưa được tạo ở lần khởi động đầu tiên trên DB rỗng
    }
  }

  await dbPool.execute(
    `INSERT INTO schema_migrations (version, description)
     VALUES (?, ?)
     ON CONFLICT (version) DO NOTHING`,
    [
      CURRENT_MIGRATION_VERSION,
      `Created ${indexesCreated} composite/FK indexes & verified auth/security schema`,
    ]
  );

  return { applied: true, indexesCreated, version: CURRENT_MIGRATION_VERSION };
}

// Cho phép chạy trực tiếp từ CLI: node server/db/migrations.js
const isDirectCli = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isDirectCli) {
  runVersionedMigrations(pool, true)
    .then((res) => {
      console.log('✅ [DB Migrations]', JSON.stringify(res));
      return getPgPool().end();
    })
    .catch((err) => {
      console.error('❌ [DB Migrations Error]', err.message);
      process.exit(1);
    });
}
