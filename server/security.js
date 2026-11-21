/**
 * MODULE BẢO MẬT HẠ TẦNG, CORS, RATE LIMIT, KIỂM TRA MAGIC BYTES ẢNH, MÃ HÓA PII & AUDIT LOG
 * Đáp ứng các tiêu chuẩn bảo mật OWASP cho dữ liệu y tế & hệ thống AI.
 */

import crypto from 'node:crypto';

// ========================================================
// 1. SECURITY HEADERS (TƯƠNG ĐƯƠNG HELMET)
// ========================================================
export function securityHeadersMiddleware(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; img-src 'self' data: blob: https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; script-src 'self' 'unsafe-inline'; connect-src 'self' https: http://localhost:5000 http://127.0.0.1:5000; frame-ancestors 'none'; base-uri 'self';"
  );

  if (process.env.NODE_ENV === 'production' || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  next();
}

// ========================================================
// 2. STRICT CORS ALLOWLIST
// ========================================================
export function createCorsOptions({ onBlockedOrigin } = {}) {
  const isProd = process.env.NODE_ENV === 'production' && Boolean(process.env.VERCEL);
  const configuredOrigins = String(process.env.CLIENT_URL || '')
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean);

  const allowedSet = new Set([
    ...configuredOrigins,
    'https://www.carematch.io.vn',
    'https://carematch.io.vn',
    ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
    ...(!isProd
      ? [
          'http://localhost:3000',
          'http://localhost:5173',
          'http://localhost:5000',
          'http://127.0.0.1:3000',
          'http://127.0.0.1:5173',
          'http://127.0.0.1:5000',
        ]
      : []),
  ]);

  return {
    origin(origin, callback) {
      // Request cùng origin (server-to-server, curl, same-origin fetch không gửi Origin header)
      if (!origin) return callback(null, true);
      const clean = String(origin).replace(/\/$/, '');
      if (allowedSet.has(clean)) {
        return callback(null, true);
      }
      if (typeof onBlockedOrigin === 'function') {
        onBlockedOrigin(clean);
      }
      const err = new Error('Origin không nằm trong danh sách cho phép của CARE-MATCH.');
      err.statusCode = 403;
      return callback(err, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    maxAge: 600,
  };
}

// ========================================================
// 3. SLIDING-WINDOW RATE LIMITER & AI CONCURRENCY / QUOTA
// ========================================================
export function getClientIp(req) {
  const trustProxyEnabled = Boolean(
    process.env.VERCEL ||
      process.env.TRUST_PROXY === 'true' ||
      (typeof req?.app?.get === 'function' && req.app.get('trust proxy'))
  );
  if (trustProxyEnabled) {
    if (req?.ip) return String(req.ip).replace(/^::ffff:/, '');
    const xff = String(req?.headers?.['x-forwarded-for'] || '')
      .split(',')[0]
      .trim();
    if (xff) return xff.replace(/^::ffff:/, '');
  }
  const directIp = req?.socket?.remoteAddress || '127.0.0.1';
  return String(directIp).replace(/^::ffff:/, '');
}

export function createRateLimiter({ windowMs = 60_000, max = 20, keyPrefix = 'rl', onBlocked = null } = {}) {
  const buckets = new Map();

  return (req, res, next) => {
    const now = Date.now();
    const userIdPart = req.auth?.authenticated && req.auth?.userId ? `u:${req.auth.userId}` : `ip:${getClientIp(req)}`;
    const key = `${keyPrefix}:${userIdPart}`;

    let timestamps = buckets.get(key) || [];
    timestamps = timestamps.filter((t) => now - t < windowMs);

    if (timestamps.length >= max) {
      if (typeof onBlocked === 'function') onBlocked(req, key);
      const retryAfterSec = Math.max(1, Math.ceil((windowMs - (now - timestamps[0])) / 1000));
      res.setHeader('Retry-After', String(retryAfterSec));
      return res.status(429).json({
        error: 'Bạn gửi quá nhiều yêu cầu trong thời gian ngắn. Vui lòng đợi ít giây rồi thử lại.',
        retryAfterSec,
      });
    }

    timestamps.push(now);
    buckets.set(key, timestamps);

    if (buckets.size > 2000) {
      for (const [k, arr] of buckets.entries()) {
        if (arr.every((t) => now - t >= windowMs)) buckets.delete(k);
      }
    }
    return next();
  };
}

const activeAiRequests = new Map();
const dailyAiTokens = new Map();

export function acquireAiConcurrencySlot(identityKey, maxConcurrent = 3) {
  const current = activeAiRequests.get(identityKey) || 0;
  if (current >= maxConcurrent) return null;
  activeAiRequests.set(identityKey, current + 1);
  let released = false;
  return () => {
    if (released) return;
    released = true;
    const next = (activeAiRequests.get(identityKey) || 1) - 1;
    if (next <= 0) activeAiRequests.delete(identityKey);
    else activeAiRequests.set(identityKey, next);
  };
}

export function checkDailyTokenBudget(identityKey, maxDailyTokens = 150_000) {
  const day = new Date().toISOString().slice(0, 10);
  const key = `${day}::${identityKey}`;
  const used = dailyAiTokens.get(key) || 0;
  return { allowed: used < maxDailyTokens, used, remaining: Math.max(0, maxDailyTokens - used) };
}

export function recordDailyTokenUsage(identityKey, tokensUsed = 0) {
  const n = Number(tokensUsed || 0);
  if (n <= 0) return;
  const day = new Date().toISOString().slice(0, 10);
  const key = `${day}::${identityKey}`;
  dailyAiTokens.set(key, (dailyAiTokens.get(key) || 0) + n);
}

// ========================================================
// 4. MAGIC-BYTE IMAGE / DOCUMENT VALIDATION
// ========================================================
function detectBinaryMime(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 8) return null;

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    let width = null;
    let height = null;
    if (buf.length >= 24) {
      width = buf.readUInt32BE(16);
      height = buf.readUInt32BE(20);
    }
    return { mimeType: 'image/png', ext: 'png', width, height };
  }

  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { mimeType: 'image/jpeg', ext: 'jpg', width: null, height: null };
  }

  // WEBP: RIFF....WEBP
  if (
    buf.length >= 12 &&
    buf.toString('ascii', 0, 4) === 'RIFF' &&
    buf.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return { mimeType: 'image/webp', ext: 'webp', width: null, height: null };
  }

  // PDF: %PDF-
  if (buf.toString('ascii', 0, 5) === '%PDF-') {
    return { mimeType: 'application/pdf', ext: 'pdf', width: null, height: null };
  }

  return null;
}

/**
 * Kiểm tra định dạng dataUrl, dung lượng tối đa, magic bytes thực tế & kích thước ảnh
 */
export function validateUploadDataUrl(dataUrl, { maxBytes = 4 * 1024 * 1024, allowPdf = false, maxDimension = 6000 } = {}) {
  if (!dataUrl || typeof dataUrl !== 'string') {
    return { valid: false, error: 'Thiếu dữ liệu tệp tải lên.' };
  }
  const match = dataUrl.match(/^data:([A-Za-z0-9/+.-]+);base64,([A-Za-z0-9+/=\s]+)$/);
  if (!match) {
    return { valid: false, error: 'Định dạng dataUrl (base64) không hợp lệ.' };
  }

  const declaredMime = match[1].toLowerCase().trim();
  const base64Clean = match[2].replace(/\s+/g, '');
  const buffer = Buffer.from(base64Clean, 'base64');

  if (!buffer.length) {
    return { valid: false, error: 'Tệp tải lên rỗng.' };
  }
  if (buffer.length > maxBytes) {
    return {
      valid: false,
      statusCode: 413,
      error: `Dung lượng tệp vượt quá giới hạn cho phép (${Math.round(maxBytes / (1024 * 1024))}MB).`,
    };
  }

  const detected = detectBinaryMime(buffer);
  if (!detected) {
    return {
      valid: false,
      error: 'Nội dung tệp không phải định dạng ảnh hợp lệ (JPEG/PNG/WEBP). Đã từ chối theo kiểm tra chữ ký nhị phân (magic bytes).',
    };
  }

  if (detected.mimeType === 'application/pdf' && !allowPdf) {
    return { valid: false, error: 'Tính năng này chỉ chấp nhận tệp hình ảnh (JPEG, PNG, WEBP).' };
  }

  // Không cho giả mạo MIME (ví dụ gửi PDF hoặc text nhưng gắn nhãn image/png)
  const normalizedDeclared = declaredMime === 'image/jpg' ? 'image/jpeg' : declaredMime;
  if (normalizedDeclared !== detected.mimeType) {
    return {
      valid: false,
      error: `Định dạng khai báo (${declaredMime}) không khớp với dữ liệu thực tế (${detected.mimeType}).`,
    };
  }

  if ((detected.width && detected.width > maxDimension) || (detected.height && detected.height > maxDimension)) {
    return {
      valid: false,
      error: `Độ phân giải ảnh vượt quá giới hạn an toàn (${maxDimension}px).`,
    };
  }

  return {
    valid: true,
    buffer,
    base64Data: base64Clean,
    mimeType: detected.mimeType,
    ext: detected.ext,
    size: buffer.length,
  };
}

// ========================================================
// 5. MÃ HÓA DỮ LIỆU NHẠY CẢM AT-REST (AES-256-GCM + KEY ROTATION)
// ========================================================
function deriveAesKey(rawSecret) {
  return crypto.createHash('sha256').update(`aes256gcm::${rawSecret}`).digest();
}

function getFieldEncryptionKey() {
  const rawSecret = (process.env.FIELD_ENCRYPTION_KEY || process.env.AUTH_SECRET || '').trim();
  const isProdRuntime = process.env.NODE_ENV === 'production' && Boolean(process.env.VERCEL);
  if (isProdRuntime && rawSecret.length < 32) {
    throw new Error('Cấu hình bảo mật nghiêm trọng: Thiếu FIELD_ENCRYPTION_KEY hoặc AUTH_SECRET (>= 32 ký tự) trên Production!');
  }
  const seed = rawSecret || 'carematch-dev-only-field-key-do-not-use-in-prod';
  return deriveAesKey(seed);
}

function getCandidateDecryptionKeys() {
  const keys = [getFieldEncryptionKey()];
  const oldKey = (process.env.FIELD_ENCRYPTION_KEY_OLD || '').trim();
  if (oldKey) {
    keys.push(deriveAesKey(oldKey));
  }
  const authSecret = (process.env.AUTH_SECRET || '').trim();
  if (authSecret) {
    keys.push(deriveAesKey(authSecret));
  }
  return keys;
}

export function encryptSensitiveField(plainText, { forceReencrypt = false } = {}) {
  const clean = String(plainText ?? '').trim();
  if (!clean) return '';
  if (clean.startsWith('enc:v1:') && !forceReencrypt) return clean;
  const actualPlain = clean.startsWith('enc:v1:') ? decryptSensitiveField(clean) : clean;
  if (!actualPlain) return '';

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getFieldEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(actualPlain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `enc:v1:${iv.toString('base64url')}:${tag.toString('base64url')}:${encrypted.toString('base64url')}`;
}

export function decryptSensitiveField(storedValue) {
  const raw = String(storedValue ?? '').trim();
  if (!raw) return '';
  if (!raw.startsWith('enc:v1:')) return raw;

  const parts = raw.split(':');
  if (parts.length !== 5) return '';
  const iv = Buffer.from(parts[2], 'base64url');
  const tag = Buffer.from(parts[3], 'base64url');
  const data = Buffer.from(parts[4], 'base64url');

  for (const key of getCandidateDecryptionKeys()) {
    try {
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(tag);
      return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
    } catch {
      // Thử tiếp khóa cũ trong trường hợp đang xoay khóa (key rotation)
    }
  }
  return '';
}

export function maskIdNumber(idNum) {
  const plain = decryptSensitiveField(idNum);
  if (!plain || plain.length < 6) return plain;
  return `${plain.slice(0, 3)}******${plain.slice(-3)}`;
}

// ========================================================
// 6. AUDIT LOGGING & ANOMALY TRACKING
// ========================================================
export async function ensureSecurityTables(pool, isDbConnected) {
  if (!pool || !isDbConnected) return;
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS auth_sessions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      refresh_token_hash VARCHAR(128) NOT NULL UNIQUE,
      expires_at TIMESTAMP NOT NULL,
      revoked_at TIMESTAMP DEFAULT NULL,
      ip_address VARCHAR(64) DEFAULT NULL,
      user_agent TEXT DEFAULT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await pool.execute('CREATE INDEX IF NOT EXISTS idx_auth_sessions_user ON auth_sessions (user_id)');

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id SERIAL PRIMARY KEY,
      actor_user_id INTEGER DEFAULT NULL,
      actor_role VARCHAR(24) DEFAULT 'guest',
      action VARCHAR(80) NOT NULL,
      resource_type VARCHAR(64) DEFAULT NULL,
      resource_id VARCHAR(64) DEFAULT NULL,
      ip_address VARCHAR(64) DEFAULT NULL,
      user_agent TEXT DEFAULT NULL,
      status VARCHAR(24) DEFAULT 'ok',
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await pool.execute('CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs (action)');
  await pool.execute('CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs (created_at)');
}

export async function writeAuditLog(
  pool,
  isDbConnected,
  req,
  { actorUserId = null, actorRole = null, action, resourceType = null, resourceId = null, status = 'ok', metadata = {} }
) {
  if (!pool || !isDbConnected || !action) return;
  try {
    const uid = actorUserId ?? req?.auth?.userId ?? null;
    const role = actorRole ?? req?.auth?.userRole ?? 'guest';
    const ip = req ? getClientIp(req) : null;
    const ua = req?.headers?.['user-agent'] ? String(req.headers['user-agent']).slice(0, 300) : null;
    await pool.execute(
      `INSERT INTO audit_logs
        (actor_user_id, actor_role, action, resource_type, resource_id, ip_address, user_agent, status, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?::jsonb)`,
      [
        uid ? Number(uid) : null,
        String(role || 'guest'),
        String(action),
        resourceType ? String(resourceType) : null,
        resourceId !== null && resourceId !== undefined ? String(resourceId) : null,
        ip,
        ua,
        String(status || 'ok'),
        JSON.stringify(metadata || {}),
      ]
    );
  } catch (err) {
    console.warn('⚠️ Không thể ghi audit_logs:', err.message);
  }
}
