/**
 * BỘ NHỚ ĐỆM PHẢN HỒI CHATBOT (RESPONSE CACHE)
 * Cô lập tuyệt đối theo tài khoản (userRole + userId), chỉ cache truy vấn công khai
 * không chứa PII và hoàn toàn tắt cache khi có lịch sử hội thoại (historyLength > 0).
 */

const DEFAULT_TTL_MS = 10 * 60 * 1000; // 10 phút
const MAX_ENTRIES = 120;
const cacheStore = new Map();

const ALLOWED_PUBLIC_TOOLS = new Set([
  'search_caregivers',
  'get_caregiver_detail',
  'get_platform_info',
  'search_knowledge_base',
]);

const PII_LIKE_REGEX = /(\b0\d{8,10}\b|\b\d{9,12}\b|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/;

function buildCacheKey(message, authContext) {
  const clean = String(message || '')
    .toLowerCase()
    .replace(/[?!.,;:"'()]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!clean || PII_LIKE_REGEX.test(String(message || ''))) return null;

  if (authContext?.authenticated && Number(authContext?.userId) > 0) {
    if (authContext.userRole === 'admin') return null;
    return `user:${authContext.userRole}:${Number(authContext.userId)}::${clean}`;
  }

  return `guest::${clean}`;
}

export function getCachedChatResponse(message, authContext, historyLength = 0) {
  if (Number(historyLength) !== 0) return null;
  const key = buildCacheKey(message, authContext);
  if (!key) return null;

  const entry = cacheStore.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cacheStore.delete(key);
    return null;
  }

  return {
    ...entry.value,
    quick_replies: Array.isArray(entry.value?.quick_replies) ? [...entry.value.quick_replies] : [],
    tools_used: Array.isArray(entry.value?.tools_used) ? [...entry.value.tools_used] : [],
  };
}

export function setCachedChatResponse(message, authContext, historyLength, toolsUsed, value) {
  if (Number(historyLength) !== 0) return;
  if (authContext?.userRole === 'admin') return;
  if (Array.isArray(toolsUsed) && toolsUsed.some((t) => !ALLOWED_PUBLIC_TOOLS.has(t))) return;

  const key = buildCacheKey(message, authContext);
  if (!key) return;

  if (cacheStore.size >= MAX_ENTRIES) {
    const oldestKey = cacheStore.keys().next().value;
    if (oldestKey) cacheStore.delete(oldestKey);
  }

  cacheStore.set(key, {
    value: {
      ...value,
      quick_replies: Array.isArray(value?.quick_replies) ? [...value.quick_replies] : [],
      tools_used: Array.isArray(value?.tools_used) ? [...value.tools_used] : [],
    },
    expiresAt: Date.now() + DEFAULT_TTL_MS,
  });
}

export function clearAiChatCache() {
  cacheStore.clear();
}
