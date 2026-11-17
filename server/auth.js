/**
 * MODULE XÁC THỰC & QUẢN LÝ PHIÊN ĐĂNG NHẬP AN TOÀN CHO CARE-MATCH
 * - Bắt buộc AUTH_SECRET mạnh trên production (không dùng fallback yếu)
 * - Băm mật khẩu bằng bcryptjs + tự động nâng cấp mật khẩu cũ từ DB
 * - Chính sách mật khẩu tối thiểu + chống mật khẩu phổ biến + khóa tài khoản tạm thời khi sai nhiều lần
 * - Access Token ngắn hạn (15 phút, gắn token_version + jti) + Refresh Token Rotation & Revocation
 * - Hỗ trợ HttpOnly, SameSite=Lax, Secure cookie chống đánh cắp qua XSS
 */

import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { getClientIp } from './security.js';

const VALID_ROLES = new Set(['family', 'caregiver', 'admin']);
const ACCESS_TTL_SEC = 15 * 60; // 15 phút
const REFRESH_TTL_SEC = 7 * 24 * 3600; // 7 ngày

const COMMON_WEAK_PASSWORDS = new Set([
  '123456',
  '12345678',
  '123456789',
  '1234567890',
  'password',
  'password1',
  'password123',
  'admin123',
  'admin1234',
  'qwerty123',
  '11111111',
  '00000000',
  'abc12345',
  'carematch',
  'carematch123',
]);

// Lưu JTI đã thu hồi (logout) trong bộ nhớ cho đến khi hết hạn 15 phút
const revokedJtis = new Map();
// Cache ngắn 5 giây cho kiểm tra token_version tránh nghẽn DB khi tải trang song song
const tokenVersionCache = new Map();

export function getAuthSecret() {
  const configured = (process.env.AUTH_SECRET || '').trim();
  if (configured.length >= 32) return configured;

  const isProdRuntime = process.env.NODE_ENV === 'production' && Boolean(process.env.VERCEL);
  if (isProdRuntime) {
    throw new Error('Cấu hình bảo mật nghiêm trọng: Thiếu AUTH_SECRET (>= 32 ký tự) trên môi trường Production!');
  }
  if (configured) {
    return crypto.createHash('sha256').update(`carematch-pad::${configured}`).digest('hex');
  }
  // Chỉ dùng cho môi trường dev/test nội bộ khi chưa đặt AUTH_SECRET
  return 'carematch-local-dev-only-secret-key-please-set-auth-secret-in-env-64chars';
}

function toBase64Url(input) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(JSON.stringify(input), 'utf8');
  return buf.toString('base64url');
}

function fromBase64Url(segment) {
  return Buffer.from(String(segment || ''), 'base64url').toString('utf8');
}

export function hashRefreshToken(rawToken) {
  return crypto.createHash('sha256').update(String(rawToken || '')).digest('hex');
}

export async function hashPassword(plainPassword, rounds = 12) {
  return bcrypt.hash(String(plainPassword), rounds);
}

export async function verifyPassword(plainPassword, storedHash) {
  if (!plainPassword || !storedHash || typeof storedHash !== 'string') return false;
  if (!storedHash.startsWith('$2')) return false;
  return bcrypt.compare(String(plainPassword), storedHash);
}

export function validatePasswordStrength(password) {
  const pw = String(password || '');
  if (pw.length < 8) {
    return { valid: false, message: 'Mật khẩu phải có tối thiểu 8 ký tự.' };
  }
  if (pw.length > 128) {
    return { valid: false, message: 'Mật khẩu không được vượt quá 128 ký tự.' };
  }
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) {
    return { valid: false, message: 'Mật khẩu phải bao gồm cả chữ cái và chữ số.' };
  }
  if (COMMON_WEAK_PASSWORDS.has(pw.toLowerCase())) {
    return { valid: false, message: 'Mật khẩu này quá phổ biến và dễ đoán, vui lòng chọn mật khẩu an toàn hơn.' };
  }
  return { valid: true };
}

/**
 * Ký Access Token ngắn hạn (mặc định 15 phút) gắn kèm tv (token_version) và jti
 */
export function signAuthToken(user, ttlSeconds = ACCESS_TTL_SEC) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    sub: Number(user?.id),
    role: String(user?.role || 'family'),
    name: String(user?.full_name || user?.username || ''),
    tv: Number(user?.token_version || 1),
    jti: crypto.randomUUID(),
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };

  const signingInput = `${toBase64Url(header)}.${toBase64Url(payload)}`;
  const signature = crypto.createHmac('sha256', getAuthSecret()).update(signingInput).digest('base64url');
  return `${signingInput}.${signature}`;
}

export function revokeAccessTokenJti(jti, expEpochSec) {
  if (!jti) return;
  const expMs = (Number(expEpochSec) || Math.floor(Date.now() / 1000) + ACCESS_TTL_SEC) * 1000;
  revokedJtis.set(jti, expMs);
  const now = Date.now();
  if (revokedJtis.size > 1000) {
    for (const [k, exp] of revokedJtis.entries()) {
      if (exp <= now) revokedJtis.delete(k);
    }
  }
}

export function invalidateUserTokenCache(userId) {
  tokenVersionCache.delete(Number(userId));
}

export function verifyAuthToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.trim().split('.');
  if (parts.length !== 3) return null;

  const [headerB64, payloadB64, sigB64] = parts;
  if (!headerB64 || !payloadB64 || !sigB64) return null;

  try {
    const signingInput = `${headerB64}.${payloadB64}`;
    const expectedSig = crypto.createHmac('sha256', getAuthSecret()).update(signingInput).digest();
    const actualSig = Buffer.from(sigB64, 'base64url');
    if (actualSig.length !== expectedSig.length || !crypto.timingSafeEqual(actualSig, expectedSig)) {
      return null;
    }

    const payload = JSON.parse(fromBase64Url(payloadB64));
    const nowSec = Math.floor(Date.now() / 1000);
    if (!payload || typeof payload !== 'object') return null;
    if (!Number.isFinite(payload.exp) || payload.exp <= nowSec) return null;
    if (!Number.isInteger(payload.sub) || payload.sub <= 0) return null;
    if (!VALID_ROLES.has(payload.role)) return null;

    if (payload.jti && revokedJtis.has(payload.jti)) {
      const expMs = revokedJtis.get(payload.jti);
      if (expMs > Date.now()) return null;
      revokedJtis.delete(payload.jti);
    }

    return {
      authenticated: true,
      userId: payload.sub,
      userRole: payload.role,
      userName: String(payload.name || ''),
      tokenVersion: Number(payload.tv || 1),
      jti: payload.jti || null,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}

export function parseCookies(req) {
  const raw = String(req?.headers?.cookie || '');
  const out = {};
  if (!raw) return out;
  for (const pair of raw.split(';')) {
    const idx = pair.indexOf('=');
    if (idx <= 0) continue;
    const k = pair.slice(0, idx).trim();
    const v = pair.slice(idx + 1).trim();
    if (k) {
      try {
        out[k] = decodeURIComponent(v);
      } catch {
        out[k] = v;
      }
    }
  }
  return out;
}

function isSecureRequest(req) {
  return Boolean(
    process.env.VERCEL ||
      req?.secure ||
      String(req?.headers?.['x-forwarded-proto'] || '').toLowerCase() === 'https'
  );
}

export function setAuthCookies(req, res, accessToken, refreshToken) {
  const secureFlag = isSecureRequest(req) ? '; Secure' : '';
  const cookies = [
    `cm_access=${encodeURIComponent(accessToken)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${ACCESS_TTL_SEC}${secureFlag}`,
  ];
  if (refreshToken) {
    cookies.push(
      `cm_refresh=${encodeURIComponent(refreshToken)}; HttpOnly; Path=/api/auth; SameSite=Lax; Max-Age=${REFRESH_TTL_SEC}${secureFlag}`
    );
  }
  res.setHeader('Set-Cookie', cookies);
}

export function clearAuthCookies(req, res) {
  const secureFlag = isSecureRequest(req) ? '; Secure' : '';
  res.setHeader('Set-Cookie', [
    `cm_access=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${secureFlag}`,
    `cm_refresh=; HttpOnly; Path=/api/auth; SameSite=Lax; Max-Age=0${secureFlag}`,
  ]);
}

/**
 * Đọc ngữ cảnh xác thực từ HttpOnly cookie `cm_access` hoặc header `Authorization: Bearer`
 */
export function extractAuthContext(req) {
  if (req?.auth && typeof req.auth.authenticated === 'boolean') {
    return req.auth;
  }

  const header = String(req?.headers?.authorization || '').trim();
  if (header.toLowerCase().startsWith('bearer ')) {
    const verified = verifyAuthToken(header.slice(7).trim());
    if (verified) return verified;
  }

  const cookies = parseCookies(req);
  if (cookies.cm_access) {
    const verified = verifyAuthToken(cookies.cm_access);
    if (verified) return verified;
  }

  return {
    authenticated: false,
    userId: null,
    userRole: 'guest',
    userName: '',
    tokenVersion: 0,
    jti: null,
    exp: null,
  };
}

/**
 * Xác thực đầy đủ token_version & trạng thái khóa tài khoản đối chiếu Database
 */
export async function resolveVerifiedAuthContext(req, pool, isDbConnected) {
  const ctx = extractAuthContext(req);
  if (!ctx.authenticated || !pool || !isDbConnected) {
    return ctx;
  }

  const now = Date.now();
  const cached = tokenVersionCache.get(ctx.userId);
  if (cached && cached.expiresAt > now) {
    if (cached.locked || cached.tokenVersion !== ctx.tokenVersion || cached.role !== ctx.userRole) {
      return { authenticated: false, userId: null, userRole: 'guest', userName: '', tokenVersion: 0, jti: null, exp: null };
    }
    return { ...ctx, userName: cached.fullName || ctx.userName };
  }

  try {
    const [rows] = await pool.execute(
      'SELECT id, role, full_name, COALESCE(token_version, 1) AS token_version, locked_until FROM users WHERE id = ? LIMIT 1',
      [ctx.userId]
    );
    if (!rows.length) {
      return { authenticated: false, userId: null, userRole: 'guest', userName: '', tokenVersion: 0, jti: null, exp: null };
    }
    const u = rows[0];
    const isLocked = Boolean(u.locked_until && new Date(u.locked_until).getTime() > now);
    const dbTv = Number(u.token_version || 1);

    tokenVersionCache.set(ctx.userId, {
      role: u.role,
      fullName: u.full_name,
      tokenVersion: dbTv,
      locked: isLocked,
      expiresAt: now + 5000,
    });

    if (isLocked || dbTv !== ctx.tokenVersion || u.role !== ctx.userRole) {
      return { authenticated: false, userId: null, userRole: 'guest', userName: '', tokenVersion: 0, jti: null, exp: null };
    }
    return { ...ctx, userName: u.full_name || ctx.userName };
  } catch {
    return ctx;
  }
}

export async function issueSessionTokens(req, res, pool, isDbConnected, user) {
  const accessToken = signAuthToken(user);
  let refreshToken = null;

  if (pool && isDbConnected && user?.id) {
    refreshToken = crypto.randomBytes(32).toString('base64url');
    const refreshHash = hashRefreshToken(refreshToken);
    const expiresAt = new Date(Date.now() + REFRESH_TTL_SEC * 1000);
    const ip = getClientIp(req);
    const ua = req?.headers?.['user-agent'] ? String(req.headers['user-agent']).slice(0, 300) : null;
    await pool.execute(
      `INSERT INTO auth_sessions (user_id, refresh_token_hash, expires_at, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?)`,
      [Number(user.id), refreshHash, expiresAt, ip, ua]
    );
  }

  setAuthCookies(req, res, accessToken, refreshToken);
  return { accessToken, refreshToken };
}

export async function rotateRefreshSession(req, res, pool, isDbConnected) {
  if (!pool || !isDbConnected) return null;
  const cookies = parseCookies(req);
  const rawRefresh = cookies.cm_refresh || req?.body?.refreshToken || '';
  if (!rawRefresh) return null;

  const refreshHash = hashRefreshToken(rawRefresh);
  const [rows] = await pool.execute(
    `SELECT s.id AS session_id, s.user_id, s.expires_at, s.revoked_at,
            u.id, u.username, u.email, u.role, u.full_name, u.phone,
            COALESCE(u.token_version, 1) AS token_version, u.locked_until, u.must_change_password
     FROM auth_sessions s
     JOIN users u ON s.user_id = u.id
     WHERE s.refresh_token_hash = ?
     LIMIT 1`,
    [refreshHash]
  );

  if (!rows.length) return null;
  const rec = rows[0];
  if (rec.revoked_at || new Date(rec.expires_at).getTime() <= Date.now()) {
    return null;
  }
  if (rec.locked_until && new Date(rec.locked_until).getTime() > Date.now()) {
    return null;
  }

  // Rotation: thu hồi refresh token cũ ngay lập tức trước khi cấp cặp mới
  await pool.execute('UPDATE auth_sessions SET revoked_at = NOW() WHERE id = ?', [rec.session_id]);

  const user = {
    id: rec.id,
    username: rec.username,
    email: rec.email,
    role: rec.role,
    full_name: rec.full_name,
    phone: rec.phone,
    token_version: Number(rec.token_version || 1),
    must_change_password: Boolean(rec.must_change_password),
  };

  const tokens = await issueSessionTokens(req, res, pool, isDbConnected, user);
  return { user, ...tokens };
}

export async function revokeCurrentSession(req, res, pool, isDbConnected) {
  const ctx = extractAuthContext(req);
  if (ctx.jti) {
    revokeAccessTokenJti(ctx.jti, ctx.exp);
  }
  const cookies = parseCookies(req);
  if (pool && isDbConnected && cookies.cm_refresh) {
    const refreshHash = hashRefreshToken(cookies.cm_refresh);
    await pool.execute('UPDATE auth_sessions SET revoked_at = NOW() WHERE refresh_token_hash = ?', [refreshHash]).catch(() => {});
  }
  clearAuthCookies(req, res);
}

export function requireAuth(allowedRoles = null) {
  return (req, res, next) => {
    const ctx = req.auth || extractAuthContext(req);
    if (!ctx.authenticated) {
      return res.status(401).json({ error: 'Vui lòng đăng nhập để sử dụng tính năng này.' });
    }
    if (Array.isArray(allowedRoles) && allowedRoles.length > 0 && !allowedRoles.includes(ctx.userRole)) {
      return res.status(403).json({ error: 'Bạn không có quyền truy cập chức năng này.' });
    }
    req.auth = ctx;
    return next();
  };
}

/**
 * Khởi tạo cột bảo mật trên bảng users & băm bcrypt toàn bộ mật khẩu plain-text cũ trong DB
 */
export async function ensureAuthSchemaAndMigrateUsers(pool, isDbConnected) {
  if (!pool || !isDbConnected) return;

  await pool.execute('ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 1').catch(() => {});
  await pool.execute('ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER NOT NULL DEFAULT 0').catch(() => {});
  await pool.execute('ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP DEFAULT NULL').catch(() => {});
  await pool.execute('ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE').catch(() => {});
  await pool.execute('ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE').catch(() => {});

  // Mở rộng cột id_number để chứa chuỗi mã hóa AES-256-GCM
  await pool.execute('ALTER TABLE family_profiles ALTER COLUMN id_number TYPE VARCHAR(255)').catch(() => {});
  await pool.execute('ALTER TABLE caregiver_profiles ALTER COLUMN id_number TYPE VARCHAR(255)').catch(() => {});

  // Xóa các giá trị mặc định sinh hiệu giả trong schema DB cũ
  await pool.execute('ALTER TABLE patient_care_logs ALTER COLUMN blood_pressure_systolic DROP DEFAULT').catch(() => {});
  await pool.execute('ALTER TABLE patient_care_logs ALTER COLUMN blood_pressure_diastolic DROP DEFAULT').catch(() => {});
  await pool.execute('ALTER TABLE patient_care_logs ALTER COLUMN heart_rate DROP DEFAULT').catch(() => {});
  await pool.execute('ALTER TABLE patient_care_logs ALTER COLUMN temperature DROP DEFAULT').catch(() => {});
  await pool.execute('ALTER TABLE patient_care_logs ALTER COLUMN spo2 DROP DEFAULT').catch(() => {});
  await pool.execute('ALTER TABLE patient_care_logs ALTER COLUMN blood_sugar DROP DEFAULT').catch(() => {});

  // Tự động băm bcrypt cho tất cả tài khoản đang lưu mật khẩu plain-text cũ
  const [plainUsers] = await pool.execute(
    "SELECT id, role, password_hash FROM users WHERE password_hash NOT LIKE '$2%'"
  );
  for (const u of plainUsers) {
    const rawPw = String(u.password_hash || '');
    if (!rawPw) continue;
    const hashed = await bcrypt.hash(rawPw, 10);
    const weakDefault = u.role === 'admin' && (rawPw === '123456' || rawPw === 'admin123');
    await pool.execute(
      'UPDATE users SET password_hash = ?, must_change_password = CASE WHEN ? THEN TRUE ELSE must_change_password END WHERE id = ?',
      [hashed, weakDefault, u.id]
    );
  }
}
