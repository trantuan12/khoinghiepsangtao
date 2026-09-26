/**
 * SCRIPT IMPORT DATABASE LÊN RAILWAY MYSQL
 * 
 * Cách dùng:
 *   1. Sửa 3 dòng HOST, PORT, PASSWORD bên dưới theo thông tin Railway
 *   2. Chạy: node server/import_to_railway.cjs
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// ========== SỬA 3 DÒNG NÀY THEO RAILWAY CỦA BẠN ==========
const RAILWAY_HOST = 'sakura.proxy.rlwy.net';
const RAILWAY_PORT = 34650;  
const RAILWAY_PASSWORD = 'yzaFTDoNnpetOSEmgnDwqzAgqRBSlggx';
// ===========================================================

const RAILWAY_USER = 'root';
const RAILWAY_DB = 'railway';

async function importSchema() {
  console.log('🚂 Đang kết nối Railway MySQL...');
  console.log(`   Host: ${RAILWAY_HOST}:${RAILWAY_PORT}`);
  console.log(`   Database: ${RAILWAY_DB}`);
  
  const conn = await mysql.createConnection({
    host: RAILWAY_HOST,
    port: RAILWAY_PORT,
    user: RAILWAY_USER,
    password: RAILWAY_PASSWORD,
    database: RAILWAY_DB,
    multipleStatements: true,
    connectTimeout: 30000
  });

  console.log('✅ Kết nối thành công!\n');

  // 1. Import Schema
  console.log('📦 Đang import schema (17 bảng)...');
  const schemaSQL = fs.readFileSync(path.join(__dirname, 'schema_full.sql'), 'utf8');
  await conn.query(schemaSQL);
  console.log('✅ Import schema thành công!\n');

  // 2. Verify
  const [tables] = await conn.execute('SHOW TABLES');
  console.log(`📊 Database hiện có ${tables.length} bảng:`);
  tables.forEach(t => {
    console.log(`   ✓ ${Object.values(t)[0]}`);
  });

  console.log('\n🎉 Hoàn tất import schema!');
  console.log('👉 Bước tiếp theo: chạy "node server/reseed_railway.cjs" để nạp data mẫu');
  
  await conn.end();
}

importSchema().catch(err => {
  console.error('❌ Lỗi:', err.message);
  if (err.message.includes('connect')) {
    console.error('💡 Kiểm tra lại HOST, PORT, PASSWORD và đảm bảo đã bật Public Networking trên Railway');
  }
  process.exit(1);
});
