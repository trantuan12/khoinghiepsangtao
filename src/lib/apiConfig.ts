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

