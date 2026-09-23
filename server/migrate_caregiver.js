import mysql from 'mysql2/promise';

async function migrate() {
  const c = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'care_match_db',
    port: 3306
  });

  console.log('Connected to MySQL...');

  const [cols] = await c.query('DESCRIBE caregiver_profiles');
  const colNames = cols.map(x => x.Field);

  if (!colNames.includes('id_number')) {
    await c.query('ALTER TABLE caregiver_profiles ADD COLUMN id_number VARCHAR(32) NULL AFTER title');
    console.log('Added id_number to caregiver_profiles');
  }

  if (!colNames.includes('documents')) {
    await c.query('ALTER TABLE caregiver_profiles ADD COLUMN documents JSON NULL AFTER skills');
    console.log('Added documents to caregiver_profiles');
  }

  await c.query('ALTER TABLE caregiver_documents MODIFY COLUMN file_url LONGTEXT NULL');
  console.log('caregiver_documents updated');

  // Insert default profile for Lan Anh (id = 2) if not exists
  const [lanAnh] = await c.query('SELECT * FROM caregiver_profiles WHERE user_id = 2');
  if (lanAnh.length === 0) {
    await c.query(
      `INSERT INTO caregiver_profiles 
        (user_id, title, id_number, experience_years, hourly_rate, district, bio, skills, care_score, verification_status, rating, reviews_count)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        2,
        'Chăm sóc người cao tuổi · Phục hồi chức năng',
        '001198002345',
        8,
        100000,
        'Quận Cầu Giấy & Quận Hai Bà Trưng, Hà Nội',
        'Tôi có 8 năm kinh nghiệm chăm sóc người cao tuổi, có chứng chỉ điều dưỡng sơ cấp và kỹ năng lắng nghe, thấu cảm tâm lý người già.',
        JSON.stringify(['Theo dõi huyết áp', 'Nấu ăn mềm cho người già', 'Hỗ trợ phục hồi vận động', 'Xoa bóp cổ vai gáy', 'Chăm sóc sau tai biến']),
        96,
        'approved',
        4.9,
        38
      ]
    );
    console.log('Inserted Lan Anh pre-approved profile');
  }

  console.log('Migration finished successfully!');
  await c.end();
}

migrate().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
