/**
 * RETENTION POLICY & ENCRYPTION KEY ROTATION JOBS (GIAI ĐOẠN 2 & 6)
 * - Tự động xóa / dọn dẹp dữ liệu hết hạn:
 *   + auth_sessions đã thu hồi hoặc hết hạn quá 7 ngày
 *   + password_resets đã hết hạn quá 24 giờ
 *   + audit_logs quá 90 ngày
 *   + ai_metrics_logs quá 60 ngày
 *   + ai_training_logs chưa duyệt (is_approved = FALSE) quá 30 ngày
 * - Hỗ trợ xoay khóa mã hóa AES-256-GCM (Key Rotation) cho cột id_number
 */

import { SYSTEM_LIMITS } from '../config/limits.js';
import { decryptSensitiveField, encryptSensitiveField } from '../security.js';

export async function runDataRetentionCleanup(pool, isDbConnected) {
  if (!pool || !isDbConnected) {
    return { executed: false, reason: 'db_disconnected' };
  }

  const r = SYSTEM_LIMITS.retentionDays;
  const expiredResetCutoffMs = Date.now() - r.expiredPasswordResetsHours * 3600 * 1000;

  const [sRes] = await pool
    .execute(
      `DELETE FROM auth_sessions
       WHERE (expires_at < NOW() - INTERVAL '${Number(r.revokedAuthSessions)} days')
          OR (revoked_at IS NOT NULL AND revoked_at < NOW() - INTERVAL '${Number(r.revokedAuthSessions)} days')`
    )
    .catch(() => [{ affectedRows: 0 }]);

  const [pRes] = await pool
    .execute('DELETE FROM password_resets WHERE expires_at < ?', [expiredResetCutoffMs])
    .catch(() => [{ affectedRows: 0 }]);

  const [aRes] = await pool
    .execute(`DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '${Number(r.auditLogs)} days'`)
    .catch(() => [{ affectedRows: 0 }]);

  const [mRes] = await pool
    .execute(`DELETE FROM ai_metrics_logs WHERE created_at < NOW() - INTERVAL '${Number(r.aiMetricsLogs)} days'`)
    .catch(() => [{ affectedRows: 0 }]);

  const [tRes] = await pool
    .execute(
      `DELETE FROM ai_training_logs
       WHERE is_approved = FALSE
         AND created_at < NOW() - INTERVAL '${Number(r.unapprovedAiTrainingLogs)} days'`
    )
    .catch(() => [{ affectedRows: 0 }]);

  return {
    executed: true,
    deleted: {
      expiredSessions: Number(sRes?.affectedRows || 0),
      expiredOtpResets: Number(pRes?.affectedRows || 0),
      oldAuditLogs: Number(aRes?.affectedRows || 0),
      oldAiMetrics: Number(mRes?.affectedRows || 0),
      staleUnapprovedTrainingLogs: Number(tRes?.affectedRows || 0),
    },
    retentionPolicyDays: r,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Xoay khóa mã hóa (Key Rotation) cho seluruh số CCCD trong family_profiles & caregiver_profiles:
 * Giải mã bằng khóa hiện tại hoặc FIELD_ENCRYPTION_KEY_OLD rồi mã hóa lại bằng khóa mới.
 */
export async function reencryptAllSensitiveFields(pool, isDbConnected) {
  if (!pool || !isDbConnected) return { rotated: 0 };
  let rotated = 0;

  for (const table of ['family_profiles', 'caregiver_profiles']) {
    const [rows] = await pool.execute(`SELECT id, id_number FROM ${table} WHERE id_number IS NOT NULL AND id_number != ''`);
    for (const row of rows) {
      const plain = decryptSensitiveField(row.id_number);
      if (!plain) continue;
      const freshCipher = encryptSensitiveField(plain, { forceReencrypt: true });
      await pool.execute(`UPDATE ${table} SET id_number = ? WHERE id = ?`, [freshCipher, row.id]);
      rotated++;
    }
  }

  return { rotated, timestamp: new Date().toISOString() };
}
