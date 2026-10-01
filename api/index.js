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
      await initMySql();
    } catch (err) {
      console.warn('Lỗi khởi tạo MySQL trên Serverless:', err.message);
    }
    isDbInitialized = true;
  }
  return app(req, res);
}
