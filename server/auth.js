/**
 * MODULE XÁC THỰC HMAC TOKEN (STATELESS HS256 JWT) CHO CARE-MATCH
 * Ký và xác thực phiên đăng nhập bằng node:crypto, chống giả mạo userRole / userId từ client.
 */

import crypto from 'node:crypto';

const VALID_ROLES = new Set(['family', 'caregiver', 'admin']);

function getAuthSecret() {
  const configured = (process.env.AUTH_SECRET || '').trim();
  if (configured) return configured;
  return crypto
    .createHash('sha256')
    .update(`carematch-hmac-v1::${process.env.DATABASE_URL || ''}::${process.env.GEMINI_API_KEY || 'local-dev'}`)
    .digest('hex');
}

function toBase64Url(input) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(JSON.stringify(input), 'utf8');
  return buf.toString('base64url');
}

function fromBase64Url(segment) {
  return Buffer.from(String(segment || ''), 'base64url').toString('utf8');
}

/**
 * Ký token HS256 chứa sub (userId), role, name và exp
 */
export function signAuthToken(user, ttlSeconds = 7 * 24 * 3600) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    sub: Number(user?.id),
    role: String(user?.role || 'family'),
    name: String(user?.full_name || user?.username || ''),
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };

  const signingInput = `${toBase64Url(header)}.${toBase64Url(payload)}`;
  const signature = crypto.createHmac('sha256', getAuthSecret()).update(signingInput).digest('base64url');
  return `${signingInput}.${signature}`;
}

/**
 * Xác thực token HS256 từ header Authorization
 */
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

    return {
      authenticated: true,
      userId: payload.sub,
      userRole: payload.role,
      userName: String(payload.name || ''),
    };
  } catch {
    return null;
  }
}

/**
 * Trích xuất ngữ cảnh xác thực từ req.headers.authorization; mặc định trả về guest nếu không có hoặc token sai
 */
export function extractAuthContext(req) {
  const header = String(req?.headers?.authorization || '').trim();
  if (header.toLowerCase().startsWith('bearer ')) {
    const token = header.slice(7).trim();
    const verified = verifyAuthToken(token);
    if (verified) return verified;
  }
  return {
    authenticated: false,
    userId: null,
    userRole: 'guest',
    userName: '',
  };
}

/**
 * Middleware bắt buộc đăng nhập và kiểm tra vai trò hợp lệ
 */
export function requireAuth(allowedRoles = null) {
  return (req, res, next) => {
    const ctx = extractAuthContext(req);
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
