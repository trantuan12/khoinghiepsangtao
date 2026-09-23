import mysql from 'mysql2/promise';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.join(__dirname, '.env') });

async function runMigration() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'care_match_db',
    port: Number(process.env.DB_PORT) || 3306,
    multipleStatements: true
  });

  console.log('✅ Đã kết nối MySQL, bắt đầu chuẩn hóa bảng dữ liệu...');

  // 1. Tắt kiểm tra khóa ngoại tạm thời
  await connection.query('SET FOREIGN_KEY_CHECKS = 0;');

  // 2. Tạo bảng users nếu chưa có
  await connection.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(64) UNIQUE NOT NULL,
      email VARCHAR(128) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role ENUM('family', 'caregiver', 'admin') NOT NULL DEFAULT 'family',
      full_name VARCHAR(128) NOT NULL,
      phone VARCHAR(20),
      avatar_initials VARCHAR(8) DEFAULT 'CM',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 3. Chuẩn hóa bảng elderly_profiles
  // Xóa bảng cũ và tạo lại bảng chuẩn hoàn toàn
  await connection.query(`DROP TABLE IF EXISTS elderly_profiles;`);
  await connection.query(`
    CREATE TABLE elderly_profiles (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      full_name VARCHAR(128) NOT NULL,
      date_of_birth DATE NULL,
      gender VARCHAR(10) DEFAULT 'Nữ',
      address VARCHAR(255) NULL,
      district VARCHAR(64) NULL,
      contact_name VARCHAR(128) NULL,
      contact_phone VARCHAR(20) NULL,
      care_needs JSON NULL,
      notes TEXT NULL,
      verification_status ENUM('pending', 'verified') DEFAULT 'pending',
      adl_score INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_user_id (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log('✅ Bảng elderly_profiles đã được tái cấu trúc chuẩn.');

  // 4. Chuẩn hóa bảng schedules
  await connection.query(`DROP TABLE IF EXISTS schedules;`);
  await connection.query(`
    CREATE TABLE schedules (
      id INT AUTO_INCREMENT PRIMARY KEY,
      family_user_id INT NOT NULL,
      caregiver_user_id INT NOT NULL,
      elderly_profile_id INT NULL,
      elderly_name VARCHAR(128) NULL,
      caregiver_name VARCHAR(128) NULL,
      schedule_date VARCHAR(64) NOT NULL,
      time_slot VARCHAR(64) NOT NULL,
      title VARCHAR(255) NOT NULL,
      tasks TEXT NULL,
      status ENUM('pending', 'confirmed', 'in_progress', 'completed', 'cancelled') DEFAULT 'pending',
      price INT DEFAULT 400000,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (family_user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (caregiver_user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_family (family_user_id),
      INDEX idx_caregiver (caregiver_user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log('✅ Bảng schedules đã được tái cấu trúc chuẩn.');

  // 5. Chuẩn hóa bảng notifications
  await connection.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      type ENUM('message', 'schedule', 'verification', 'system') NOT NULL DEFAULT 'system',
      title VARCHAR(255) NOT NULL,
      body TEXT NULL,
      link VARCHAR(255) DEFAULT '/',
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_user_unread (user_id, is_read)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log('✅ Bảng notifications đã sẵn sàng.');

  // 6. Bật lại kiểm tra khóa ngoại
  await connection.query('SET FOREIGN_KEY_CHECKS = 1;');

  // 7. Đảm bảo có sẵn 5 tài khoản users cơ bản
  await connection.query(`
    INSERT IGNORE INTO users (id, username, email, password_hash, role, full_name, phone, avatar_initials) VALUES
    (1, 'admin', 'admin@carematch.vn', '123456', 'admin', 'Admin Quản Trị', '0988 000 999', 'AD'),
    (2, 'lananh', 'lananh.care@example.com', '123456', 'caregiver', 'Nguyễn Lan Anh', '0912 345 678', 'LA'),
    (3, 'thuha', 'thuha.care@example.com', '123456', 'caregiver', 'Trần Thu Hà', '0988 765 432', 'TH'),
    (4, 'maichi', 'maichi.care@example.com', '123456', 'caregiver', 'Lê Mai Chi', '0903 112 233', 'MC'),
    (5, 'mai', 'mai.nguyen@example.com', '123456', 'family', 'Nguyễn Minh Mai', '0934 567 890', 'ML');
  `);

  console.log('🎉 Hoàn thành chuẩn hóa MySQL Database thành công!');
  await connection.end();
}

runMigration().catch(err => {
  console.error('❌ Lỗi khi chạy migration:', err);
  process.exit(1);
});
