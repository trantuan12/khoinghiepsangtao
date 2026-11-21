/**
 * SYSTEM, LIMITS, HEALTH-DETAILED & MAINTENANCE ROUTES (GIAI ĐOẠN 4 & 6)
 */

import express from 'express';
import { SYSTEM_LIMITS } from '../config/limits.js';
import { requireAuth } from '../auth.js';
import { writeAuditLog } from '../security.js';
import { runDataRetentionCleanup, reencryptAllSensitiveFields } from '../jobs/retentionJob.js';
import { CURRENT_MIGRATION_VERSION } from '../db/migrations.js';
import { getGeminiConfig } from '../ai.js';

export function createSystemRouter({ pool, getIsDbConnected }) {
  const router = express.Router();

  // Công bố công khai các giới hạn kỹ thuật của hệ thống (Mục 7 kế hoạch)
  router.get('/system/limits', (req, res) => {
    return res.json({
      service: 'CARE-MATCH API',
      migrationVersion: CURRENT_MIGRATION_VERSION,
      limits: SYSTEM_LIMITS,
    });
  });

  // Health-check chi tiết cho vận hành & monitoring (Giai đoạn 6.3)
  router.get('/system/health-detailed', async (req, res) => {
    const isDbConnected = Boolean(getIsDbConnected());
    const startMs = Date.now();
    let dbPingMs = null;
    let dbOk = false;

    if (isDbConnected && pool) {
      try {
        await pool.execute('SELECT 1');
        dbPingMs = Date.now() - startMs;
        dbOk = true;
      } catch {
        dbOk = false;
      }
    }

    const aiCfg = getGeminiConfig();
    const mem = process.memoryUsage();

    return res.status(dbOk ? 200 : 503).json({
      status: dbOk ? 'healthy' : 'degraded',
      migrationVersion: CURRENT_MIGRATION_VERSION,
      checks: {
        database: { ok: dbOk, latencyMs: dbPingMs },
        careMatchAi: { configured: aiCfg.configured },
        memoryRssMb: Number((mem.rss / (1024 * 1024)).toFixed(2)),
        heapUsedMb: Number((mem.heapUsed / (1024 * 1024)).toFixed(2)),
      },
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  });

  // Admin kích hoạt dọn dẹp dữ liệu hết hạn theo Retention Policy
  router.post('/admin/maintenance/run-retention', requireAuth(['admin']), async (req, res) => {
    const isDbConnected = Boolean(getIsDbConnected());
    const result = await runDataRetentionCleanup(pool, isDbConnected);
    await writeAuditLog(pool, isDbConnected, req, {
      action: 'admin.maintenance.retention_cleanup',
      resourceType: 'system_retention',
      status: 'ok',
      metadata: result.deleted || {},
    });
    return res.json({ success: true, ...result });
  });

  // Admin kích hoạt xoay khóa mã hóa AES-256-GCM (Key Rotation)
  router.post('/admin/maintenance/rotate-encryption-key', requireAuth(['admin']), async (req, res) => {
    const isDbConnected = Boolean(getIsDbConnected());
    const result = await reencryptAllSensitiveFields(pool, isDbConnected);
    await writeAuditLog(pool, isDbConnected, req, {
      action: 'admin.maintenance.key_rotation',
      resourceType: 'field_encryption',
      status: 'ok',
      metadata: result,
    });
    return res.json({ success: true, ...result });
  });

  return router;
}
