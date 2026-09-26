/**
 * SCRIPT NẠP DATA MẪU LÊN RAILWAY MYSQL
 * Chạy: node server/reseed_railway.cjs
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const RAILWAY_HOST = 'sakura.proxy.rlwy.net';
const RAILWAY_PORT = 34650;
const RAILWAY_PASSWORD = 'yzaFTDoNnpetOSEmgnDwqzAgqRBSlggx';
const RAILWAY_DB = 'railway';

// Ghi đè file .env tạm thời để reseed_database.cjs đọc đúng Railway
const envPath = path.join(__dirname, '.env');
const envBackup = fs.readFileSync(envPath, 'utf8');

const railwayEnv = `PORT=5000
NODE_ENV=production
DB_HOST=${RAILWAY_HOST}
DB_USER=root
DB_PASSWORD=${RAILWAY_PASSWORD}
DB_NAME=${RAILWAY_DB}
DB_PORT=${RAILWAY_PORT}
CLIENT_URL=*
`;

// Tạm ghi đè .env
fs.writeFileSync(envPath, railwayEnv, 'utf8');
process.env.DB_HOST = RAILWAY_HOST;
process.env.DB_PORT = String(RAILWAY_PORT);
process.env.DB_PASSWORD = RAILWAY_PASSWORD;
process.env.DB_NAME = RAILWAY_DB;
process.env.DB_USER = 'root';

console.log(`🚂 Đang nạp data mẫu lên Railway MySQL (${RAILWAY_HOST}:${RAILWAY_PORT})...\n`);

// Chạy reseed
require('./reseed_database.cjs');

// Đợi 1 chút rồi khôi phục .env gốc
setTimeout(() => {
  fs.writeFileSync(envPath, envBackup, 'utf8');
  console.log('\n✅ Đã khôi phục file .env gốc (localhost)');
}, 30000);
