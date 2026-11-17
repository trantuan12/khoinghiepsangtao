const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return (import.meta.env.VITE_API_URL as string).replace(/\/$/, '');
  }
  if (typeof window !== 'undefined') {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    // Trên domain thực tế (như www.carematch.io.vn) -> dùng URL tương đối '', tránh Chrome hỏi quyền truy cập thiết bị nội bộ
    if (!isLocal) {
      return '';
    }
  }
  return 'http://localhost:5000';
};

export const API_BASE_URL = getApiBaseUrl();
export const API = `${API_BASE_URL}/api`;

export const AUTH_TOKEN_KEY = 'carematch_token';

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token?: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (token) localStorage.setItem(AUTH_TOKEN_KEY, token);
    else localStorage.removeItem(AUTH_TOKEN_KEY);
  } catch { }
}

export function getAuthHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = getAuthToken();
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}
