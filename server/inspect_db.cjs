const mysql = require('mysql2/promise');
require('dotenv').config({ path: 'server/.env' });

async function checkDb() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'care_match_db'
  });
  
  const [tables] = await conn.execute('SHOW TABLES');
  for (const t of tables) {
    const tableName = Object.values(t)[0];
    const [cols] = await conn.execute(`DESCRIBE ${tableName}`);
    const [[{ cnt }]] = await conn.execute(`SELECT COUNT(*) AS cnt FROM ${tableName}`);
    console.log(`=== ${tableName} (${cnt} rows) ===`);
    console.log(cols.map(c => c.Field).join(', '));
  }
  await conn.end();
}

checkDb().catch(console.error);
