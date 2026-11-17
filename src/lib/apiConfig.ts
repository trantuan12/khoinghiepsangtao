const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return (import.meta.env.VITE_API_URL as string).replace(/\/$/, '');
  }
  if (typeof window !== 'undefined') {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isLocal) {
      return '';
    }
  }
  return 'http://localhost:5000';
};

export const API_BASE_URL = getApiBaseUrl();
export const API = `${API_BASE_URL}/api`;

export const AUTH_TOKEN_KEY = 'carematch_token';

// Chỉ lưu Access Token ngắn hạn trong bộ nhớ RAM (kết hợp HttpOnly Cookie cm_access / cm_refresh),
// tuyệt đối không lưu JWT vào localStorage để chống đánh cắp phiên khi có XSS.
let inMemoryAccessToken: string | null = null;
let fetchInterceptorInstalled = false;
let pendingRefreshPromise: Promise<string | null> | null = null;

if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  } catch { }
}

export function getAuthToken(): string | null {
  return inMemoryAccessToken;
}

export function setAuthToken(token?: string | null): void {
  inMemoryAccessToken = token || null;
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(AUTH_TOKEN_KEY);
    } catch { }
  }
}

export function getAuthHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = getAuthToken();
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

function isCareMatchApiUrl(rawUrl: string): boolean {
  if (!rawUrl) return false;
  if (rawUrl.startsWith('/api/') || rawUrl === '/api') return true;
  if (API_BASE_URL && rawUrl.startsWith(API_BASE_URL)) return true;
  if (typeof window !== 'undefined' && rawUrl.startsWith(`${window.location.origin}/api`)) return true;
  return false;
}

function isAuthBypassRefreshUrl(rawUrl: string): boolean {
  return (
    rawUrl.includes('/auth/login') ||
    rawUrl.includes('/auth/register') ||
    rawUrl.includes('/auth/refresh') ||
    rawUrl.includes('/auth/logout') ||
    rawUrl.includes('/auth/admin/verify-mfa') ||
    rawUrl.includes('/auth/forgot-password') ||
    rawUrl.includes('/auth/verify-otp') ||
    rawUrl.includes('/auth/reset-password')
  );
}

export function installSecureApiFetch(): void {
  if (typeof window === 'undefined' || fetchInterceptorInstalled) return;
  fetchInterceptorInstalled = true;

  const nativeFetch = window.fetch.bind(window);

  const tryRefreshToken = async (): Promise<string | null> => {
    if (pendingRefreshPromise) return pendingRefreshPromise;
    pendingRefreshPromise = (async () => {
      try {
        const res = await nativeFetch(`${API}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!res.ok) {
          inMemoryAccessToken = null;
          return null;
        }
        const data = await res.json();
        if (data?.token) {
          inMemoryAccessToken = data.token;
          return data.token as string;
        }
        return null;
      } catch {
        return null;
      } finally {
        pendingRefreshPromise = null;
      }
    })();
    return pendingRefreshPromise;
  };

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    if (!isCareMatchApiUrl(urlStr)) {
      return nativeFetch(input, init);
    }

    const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
    if (inMemoryAccessToken && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${inMemoryAccessToken}`);
    }

    const nextInit: RequestInit = {
      ...init,
      headers,
      credentials: init?.credentials || 'include',
    };

    const response = await nativeFetch(input, nextInit);
    if (response.status === 401 && !isAuthBypassRefreshUrl(urlStr)) {
      const newToken = await tryRefreshToken();
      if (newToken) {
        const retryHeaders = new Headers(nextInit.headers);
        retryHeaders.set('Authorization', `Bearer ${newToken}`);
        return nativeFetch(input, { ...nextInit, headers: retryHeaders });
      }
    }
    return response;
  };
}
