/**
 * BỘ NHỚ ĐỆM PHẢN HỒI CHATBOT (RESPONSE CACHE)
 * Chỉ cache các câu hỏi thông tin công khai (khách hoặc truy vấn không phụ thuộc dữ liệu riêng tư theo userId)
 * để tiết kiệm quota & tăng tốc độ phản hồi (<30ms khi Cache Hit).
 */

const DEFAULT_TTL_MS = 10 * 60 * 1000; // 10 phút
const MAX_ENTRIES = 120;
const cacheStore = new Map();

const PRIVATE_TOOLS = new Set([
  'get_my_elderly_profiles',
  'get_my_schedules',
  'get_patient_care_logs',
  'get_my_payments',
]);

function normalizeKey(message, userRole) {
  const clean = String(message || '')
    .toLowerCase()
    .replace(/[?!.,;:"'()]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return `${userRole || 'guest'}::${clean}`;
}

export function getCachedChatResponse(message, userRole, historyLength = 0) {
  // Chỉ áp dụng cache cho câu hỏi độc lập hoặc lượt đầu không phụ thuộc hội thoại riêng dài
  if (historyLength > 1) return null;
  const key = normalizeKey(message, userRole);
  const entry = cacheStore.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cacheStore.delete(key);
    return null;
  }
  return entry.value;
}

export function setCachedChatResponse(message, userRole, historyLength, toolsUsed, value) {
  if (historyLength > 1) return;
  const usedPrivateTool = Array.isArray(toolsUsed) && toolsUsed.some((t) => PRIVATE_TOOLS.has(t));
  if (usedPrivateTool || userRole === 'admin') return;

  if (cacheStore.size >= MAX_ENTRIES) {
    const oldestKey = cacheStore.keys().next().value;
    if (oldestKey) cacheStore.delete(oldestKey);
  }

  const key = normalizeKey(message, userRole);
  cacheStore.set(key, {
    value,
    expiresAt: Date.now() + DEFAULT_TTL_MS,
  });
}

export function clearAiChatCache() {
  cacheStore.clear();
}
