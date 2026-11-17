import app, { initMySql } from '../server/server.js';

let isDbInitialized = false;

export const config = {
  api: {
    bodyParser: false,
  },
};

function normalizeVercelApiUrl(req) {
  if (!req.url) return;
  try {
    const urlObj = new URL(req.url, 'http://localhost');
    if ((urlObj.pathname === '/api' || urlObj.pathname === '/') && urlObj.searchParams.has('match')) {
      const matchParts = urlObj.searchParams.getAll('match').filter(Boolean);
      urlObj.searchParams.delete('match');
      const qs = urlObj.searchParams.toString();
      req.url = '/api/' + matchParts.join('/') + (qs ? `?${qs}` : '');
    } else if (!urlObj.pathname.startsWith('/api')) {
      req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
    }
  } catch {
    if (!req.url.startsWith('/api')) {
      req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
    }
  }
}

export default async function handler(req, res) {
  if (!isDbInitialized) {
    try {
      const connectedPool = await initMySql();
      if (connectedPool) {
        isDbInitialized = true;
      }
    } catch (err) {
      console.warn('Lỗi kết nối PostgreSQL/Supabase trên Serverless:', err.message);
    }
  }

  normalizeVercelApiUrl(req);
  return app(req, res);
}
