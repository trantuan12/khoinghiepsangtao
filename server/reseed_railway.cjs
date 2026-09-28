/**
 * SCRIPT NẠP DATA MẪU LÊN RAILWAY MYSQL
 * Chạy: node server/reseed_railway.cjs
 */

const RAILWAY_HOST = 'sakura.proxy.rlwy.net';
const RAILWAY_PORT = 34650;
const RAILWAY_PASSWORD = 'yzaFTDoNnpetOSEmgnDwqzAgqRBSlggx';
const RAILWAY_DB = 'railway';

process.env.DB_HOST = RAILWAY_HOST;
process.env.DB_PORT = String(RAILWAY_PORT);
process.env.DB_PASSWORD = RAILWAY_PASSWORD;
process.env.DB_NAME = RAILWAY_DB;
process.env.DB_USER = 'root';

console.log(`🚂 Đang nạp data mẫu mới nhất lên Railway MySQL (${RAILWAY_HOST}:${RAILWAY_PORT})...\n`);

require('./reseed_database.cjs');
