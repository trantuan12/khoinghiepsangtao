import app, { initMySql } from '../server/server.js';

let isDbInitialized = false;

export const config = {
  api: {
    bodyParser: false,
  },
};

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

  // Đảm bảo URL bắt đầu bằng /api cho Express Router
  if (req.url && !req.url.startsWith('/api')) {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }

  return app(req, res);
}
