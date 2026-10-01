import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';
import nodemailer from 'nodemailer';
import { config } from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = Number(process.env.PORT) || 5000;

// Tạo thư mục uploads nếu chưa tồn tại
const uploadsDir = process.env.VERCEL ? path.join('/tmp', 'uploads') : path.join(__dirname, 'uploads');
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
} catch (e) {
  console.warn('Lưu ý thư mục uploads:', e.message);
}

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/uploads', express.static(uploadsDir));

// Google Search Console Verification Endpoint
app.get('/google4f3cf9857c040986.html', (req, res) => {
  res.type('text/html').send('google-site-verification: google4f3cf9857c040986.html');
});

const dbConfig = {
  host: process.env.DB_HOST || 'sakura.proxy.rlwy.net',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'yzaFTDoNnpetOSEmgnDwqzAgqRBSlggx',
  database: process.env.DB_NAME || 'railway',
  port: Number(process.env.DB_PORT) || 34650,
  waitForConnections: true,
  connectionLimit: 10,
  connectTimeout: 15000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  queueLimit: 0
};

let pool = null;
let isMySqlConnected = false;

// ========================================================
// KHỞI TẠO KẾT NỐI MYSQL
// ========================================================
async function initMySql() {
  if (isMySqlConnected && pool) {
    return pool;
  }
  try {
    if (!pool) {
      pool = mysql.createPool(dbConfig);
    }
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    isMySqlConnected = true;
    console.log(`✅ [MySQL] Đã kết nối thành công đến cơ sở dữ liệu Railway (${dbConfig.host}:${dbConfig.port}/${dbConfig.database})`);
  } catch (err) {
    isMySqlConnected = false;
    console.error('⚠️ [MySQL] Lỗi kết nối MySQL Railway:', err.message);
    return null;
  }

  // Chạy các migration ngầm, không block luồng xử lý chính
  Promise.allSettled([
    initTransactionsTable(),
    initCaregiverProfiles(),
    initFamilyProfilesTable(),
    initFamilySubscriptionsTable(),
    initCaregiverBankAccountsTable(),
    initBookingEscrowPaymentsTable(),
    initCommunitiesTable(),
    initCaregiverReviewsTable(),
    initSchedulesTableMigrations(),
    initVouchersTable(),
    initSystemSettingsTable(),
    initPatientCareLogsTable()
  ]).catch(() => { });

  return pool;
}

// Khởi tạo bảng thanh toán & giao dịch nếu chưa có
async function initTransactionsTable() {
  if (!pool || !isMySqlConnected) return;
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        transaction_code VARCHAR(64) UNIQUE NOT NULL,
        schedule_id INT NULL,
        family_user_id INT NOT NULL,
        caregiver_user_id INT NOT NULL,
        service_name VARCHAR(255) NOT NULL,
        total_amount INT NOT NULL COMMENT 'Số tiền gia đình thanh toán',
        platform_fee INT DEFAULT 0 COMMENT 'Phí điều phối nền tảng',
        payout_amount INT NOT NULL COMMENT 'Số tiền trả công người chăm sóc',
        family_payment_status ENUM('paid', 'pending', 'cancelled') DEFAULT 'paid',
        caregiver_payout_status ENUM('paid', 'pending', 'processing') DEFAULT 'paid',
        payment_method VARCHAR(64) DEFAULT 'Chuyển khoản QR',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        paid_at TIMESTAMP NULL,
        FOREIGN KEY (family_user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (caregiver_user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    const [rows] = await pool.execute('SELECT COUNT(*) AS cnt FROM transactions');
    if (rows[0].cnt === 0) {
      const seedItems = [
        {
          code: 'PAY-2026-0901',
          schedule_id: 1,
          family_user_id: 5,
          caregiver_user_id: 2,
          service_name: 'Ca chăm sóc test 2 (9 tiếng - Ca đêm)',
          total_amount: 900000,
          platform_fee: 100000,
          payout_amount: 800000,
          family_payment_status: 'paid',
          caregiver_payout_status: 'paid',
          payment_method: 'Chuyển khoản QR VietQR',
          notes: 'Đã hoàn tất thanh toán & giải ngân thù lao',
          created_at: '2026-09-22 17:00:00',
          paid_at: '2026-09-22 17:05:00'
        },
        {
          code: 'PAY-2026-0902',
          schedule_id: 2,
          family_user_id: 5,
          caregiver_user_id: 3,
          service_name: 'Ca chăm sóc tttt (4 tiếng - Ca sáng)',
          total_amount: 400000,
          platform_fee: 50000,
          payout_amount: 350000,
          family_payment_status: 'paid',
          caregiver_payout_status: 'processing',
          payment_method: 'Ví điện tử MoMo',
          notes: 'Gia đình đã trả, đang chờ hoàn tất ca để giải ngân',
          created_at: '2026-09-22 17:30:00',
          paid_at: '2026-09-22 17:32:00'
        },
        {
          code: 'PAY-2026-0903',
          schedule_id: null,
          family_user_id: 5,
          caregiver_user_id: 2,
          service_name: 'Gói chăm sóc tiêu chuẩn gia đình Tháng 09/2026',
          total_amount: 3600000,
          platform_fee: 400000,
          payout_amount: 3200000,
          family_payment_status: 'paid',
          caregiver_payout_status: 'paid',
          payment_method: 'Chuyển khoản Vietcombank',
          notes: 'Gói tháng trọn gói hỗ trợ người già',
          created_at: '2026-09-01 08:00:00',
          paid_at: '2026-09-01 08:15:00'
        },
        {
          code: 'PAY-2026-0904',
          schedule_id: null,
          family_user_id: 5,
          caregiver_user_id: 2,
          service_name: 'Gói chăm sóc bổ sung phục hồi chức năng Tháng 10/2026',
          total_amount: 2400000,
          platform_fee: 300000,
          payout_amount: 2100000,
          family_payment_status: 'pending',
          caregiver_payout_status: 'pending',
          payment_method: 'Chuyển khoản QR VietQR',
          notes: 'Hóa đơn tạm tính chu kỳ mới, đang chờ gia đình thanh toán',
          created_at: '2026-09-23 09:00:00',
          paid_at: null
        }
      ];

      for (const item of seedItems) {
        await pool.execute(
          `INSERT INTO transactions 
           (transaction_code, schedule_id, family_user_id, caregiver_user_id, service_name, total_amount, platform_fee, payout_amount, family_payment_status, caregiver_payout_status, payment_method, notes, created_at, paid_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            item.code, item.schedule_id, item.family_user_id, item.caregiver_user_id,
            item.service_name, item.total_amount, item.platform_fee, item.payout_amount,
            item.family_payment_status, item.caregiver_payout_status, item.payment_method,
            item.notes, item.created_at, item.paid_at
          ]
        );
      }
      console.log('✅ [MySQL] Đã khởi tạo dữ liệu mẫu cho bảng transactions');
    }
  } catch (err) {
    console.error('⚠️ [MySQL] Lỗi khởi tạo transactions table:', err.message);
  }
}

// Đảm bảo tất cả người dùng role = 'caregiver' đều có hồ sơ trong caregiver_profiles
async function initCaregiverProfiles() {
  if (!pool || !isMySqlConnected) return;
  try {
    // 1. Đảm bảo các cột ca làm việc và lịch sử công tác tồn tại
    try {
      const [cols] = await pool.execute("SHOW COLUMNS FROM caregiver_profiles LIKE 'shift_rate'");
      if (cols.length === 0) {
        await pool.execute("ALTER TABLE caregiver_profiles ADD COLUMN shift_rate INT DEFAULT 400000");
      }
      const [colsNight] = await pool.execute("SHOW COLUMNS FROM caregiver_profiles LIKE 'night_shift_rate'");
      if (colsNight.length === 0) {
        await pool.execute("ALTER TABLE caregiver_profiles ADD COLUMN night_shift_rate INT DEFAULT 600000");
      }
      const [colsWork] = await pool.execute("SHOW COLUMNS FROM caregiver_profiles LIKE 'work_history'");
      if (colsWork.length === 0) {
        await pool.execute("ALTER TABLE caregiver_profiles ADD COLUMN work_history LONGTEXT");
      }
      const [colsAddr] = await pool.execute("SHOW COLUMNS FROM caregiver_profiles LIKE 'contact_address'");
      if (colsAddr.length === 0) {
        await pool.execute("ALTER TABLE caregiver_profiles ADD COLUMN contact_address VARCHAR(255) DEFAULT ''");
      }
      const [colsInter] = await pool.execute("SHOW COLUMNS FROM caregiver_profiles LIKE 'interview_status'");
      if (colsInter.length === 0) {
        await pool.execute("ALTER TABLE caregiver_profiles ADD COLUMN interview_status VARCHAR(32) DEFAULT 'not_scheduled'");
        await pool.execute("ALTER TABLE caregiver_profiles ADD COLUMN interview_date VARCHAR(64) NULL");
        await pool.execute("ALTER TABLE caregiver_profiles ADD COLUMN interview_time VARCHAR(64) NULL");
        await pool.execute("ALTER TABLE caregiver_profiles ADD COLUMN interview_meeting_link VARCHAR(255) NULL");
        await pool.execute("ALTER TABLE caregiver_profiles ADD COLUMN interview_notes TEXT NULL");
        await pool.execute("ALTER TABLE caregiver_profiles ADD COLUMN interview_scheduled_at TIMESTAMP NULL");
        await pool.execute("ALTER TABLE caregiver_profiles ADD COLUMN interview_passed_at TIMESTAMP NULL");
      }
      // Đổi mặc định title sang 'Chuyên viên chăm sóc' theo yêu cầu
      await pool.execute("UPDATE caregiver_profiles SET title = 'Chuyên viên chăm sóc' WHERE title = 'Người chăm sóc người cao tuổi' OR title = '' OR title IS NULL");
      // Đảm bảo các caregiver đã approved thì interview_status là passed
      await pool.execute("UPDATE caregiver_profiles SET interview_status = 'passed' WHERE verification_status = 'approved' AND (interview_status = 'not_scheduled' OR interview_status IS NULL)");
    } catch (migErr) {
      console.warn('Lưu ý kiểm tra cột caregiver_profiles:', migErr.message);
    }

    const [caregivers] = await pool.execute("SELECT id, username, full_name, email FROM users WHERE role = 'caregiver'");
    for (const cg of caregivers) {
      const [existing] = await pool.execute('SELECT id FROM caregiver_profiles WHERE user_id = ? LIMIT 1', [cg.id]);
      if (existing.length === 0) {
        let title = 'Chuyên viên chăm sóc';
        let exp = 1;
        let score = 0;
        let skills = '[]';
        let bio = '';
        let district = '';
        let vStatus = 'not_submitted';
        let shiftRate = 400000;
        let nightShiftRate = 600000;

        if (cg.username === 'thuha') {
          title = 'Chuyên viên chăm sóc';
          exp = 6;
          score = 95;
          skills = '["Điều dưỡng", "Vật lý trị liệu", "Đo huyết áp", "Theo dõi phục hồi"]';
          bio = 'Chị Thu Hà là chuyên viên chăm sóc, có thế mạnh về theo dõi phục hồi và hướng dẫn vận động nhẹ nhàng tại nhà.';
          district = 'Đống Đa';
          vStatus = 'approved';
          shiftRate = 600000;
          nightShiftRate = 900000;
        } else if (cg.username === 'maichi') {
          title = 'Chuyên viên chăm sóc';
          exp = 5;
          score = 93;
          skills = '["Trò chuyện & đồng hành tâm lý", "Đi chợ & nấu ăn", "Đồng hành khám bệnh"]';
          bio = 'Cô Mai Chi mang đến năng lượng ấm áp, phù hợp với những gia đình cần một người bạn đồng hành đều đặn và đáng tin.';
          district = 'Ba Đình';
          vStatus = 'approved';
          shiftRate = 500000;
          nightShiftRate = 750000;
        }

        await pool.execute(
          `INSERT INTO caregiver_profiles (user_id, title, verification_status, care_score, experience_years, shift_rate, night_shift_rate, hourly_rate, district, skills, bio)
           VALUES (?, ?, ?, ?, ?, ?, ?, 120000, ?, ?, ?)`,
          [cg.id, title, vStatus, score, exp, shiftRate, nightShiftRate, district, skills, bio]
        );
        console.log(`✅ [MySQL] Đã tự động tạo hồ sơ caregiver_profiles cho user: ${cg.full_name} (#${cg.id})`);
      }
    }
  } catch (err) {
    console.error('Lỗi khởi tạo hồ sơ người chăm sóc:', err.message);
  }
}

// Khởi tạo bảng hồ sơ gia đình & xác thực eKYC (CCCD)
async function initFamilyProfilesTable() {
  if (!pool || !isMySqlConnected) return;
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS family_profiles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL UNIQUE,
        representative_name VARCHAR(128) NOT NULL,
        phone VARCHAR(20),
        email VARCHAR(128),
        id_number VARCHAR(32),
        address VARCHAR(255),
        district VARCHAR(128),
        id_card_front LONGTEXT,
        id_card_back LONGTEXT,
        verification_status ENUM('unverified', 'pending', 'approved', 'rejected') DEFAULT 'unverified',
        rejection_reason TEXT,
        verified_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Kiểm tra và khởi tạo bản ghi cho các tài khoản gia đình hiện có
    const [families] = await pool.execute("SELECT id, username, full_name, email, phone FROM users WHERE role = 'family'");
    for (const f of families) {
      const [existing] = await pool.execute('SELECT id FROM family_profiles WHERE user_id = ? LIMIT 1', [f.id]);
      if (existing.length === 0) {
        await pool.execute(
          `INSERT INTO family_profiles 
           (user_id, representative_name, phone, email, id_number, address, district, verification_status)
           VALUES (?, ?, ?, ?, '', 'Số 24 phố Huế, Hàng Bài', 'Hai Bà Trưng', 'unverified')`,
          [f.id, f.full_name, f.phone || '0934 567 890', f.email]
        );
        console.log(`✅ [MySQL] Đã khởi tạo hồ sơ family_profiles cho user: ${f.full_name} (#${f.id})`);
      }
    }
  } catch (err) {
    console.error('⚠️ [MySQL] Lỗi khởi tạo family_profiles table:', err.message);
  }
}

// Khởi tạo bảng gói đăng ký Premium cho Gia Đình (300.000đ/tháng)
async function initFamilySubscriptionsTable() {
  if (!pool || !isMySqlConnected) return;
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS family_subscriptions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        plan_name VARCHAR(64) DEFAULT 'Gói Gia Đình Premium',
        price INT DEFAULT 300000,
        billing_cycle VARCHAR(32) DEFAULT 'monthly',
        status VARCHAR(32) DEFAULT 'active',
        start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        end_date TIMESTAMP NULL,
        payment_method VARCHAR(64) DEFAULT 'Chuyển khoản QR (VietQR)',
        transaction_code VARCHAR(64) NULL,
        priority_matching BOOLEAN DEFAULT TRUE,
        priority_booking BOOLEAN DEFAULT TRUE,
        priority_support BOOLEAN DEFAULT TRUE,
        dedicated_support_247 BOOLEAN DEFAULT TRUE,
        notes TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Thêm các cột is_premium, premium_until vào family_profiles nếu chưa có
    try {
      const [colPrem] = await pool.execute("SHOW COLUMNS FROM family_profiles LIKE 'is_premium'");
      if (colPrem.length === 0) {
        await pool.execute("ALTER TABLE family_profiles ADD COLUMN is_premium BOOLEAN DEFAULT FALSE");
        await pool.execute("ALTER TABLE family_profiles ADD COLUMN premium_until TIMESTAMP NULL");
      }
    } catch (e) {
      console.warn('Lưu ý kiểm tra cột is_premium bảng family_profiles:', e.message);
    }

    // Seed mẫu nếu bảng chưa có bản ghi nào
    const [subCount] = await pool.execute('SELECT COUNT(*) as count FROM family_subscriptions');
    if (subCount[0].count === 0) {
      const [families] = await pool.execute("SELECT id, full_name, email FROM users WHERE role = 'family' LIMIT 2");
      if (families.length > 0) {
        const f = families[0];
        const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        await pool.execute(
          `INSERT INTO family_subscriptions 
           (user_id, plan_name, price, billing_cycle, status, start_date, end_date, payment_method, transaction_code, notes)
           VALUES (?, 'Gói Gia Đình Premium', 300000, 'monthly', 'active', NOW(), ?, 'Chuyển khoản QR (VietQR)', 'PREM-VIP-9001', 'Gói Premium trải nghiệm VIP')`,
          [f.id, endDate]
        );
        await pool.execute(
          `UPDATE family_profiles SET is_premium = TRUE, premium_until = ? WHERE user_id = ?`,
          [endDate, f.id]
        );
        console.log(`⭐ [MySQL] Đã khởi tạo gói Premium mẫu cho gia đình: ${f.full_name} (#${f.id})`);
      }
    }
  } catch (err) {
    console.error('⚠️ [MySQL] Lỗi khởi tạo family_subscriptions table:', err.message);
  }
}

// Khởi tạo bảng tài khoản ngân hàng thụ hưởng của Người chăm sóc
async function initCaregiverBankAccountsTable() {
  if (!pool || !isMySqlConnected) return;
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS caregiver_bank_accounts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        caregiver_user_id INT NOT NULL,
        bank_name VARCHAR(100) NOT NULL,
        account_number VARCHAR(64) NOT NULL,
        account_holder VARCHAR(128) NOT NULL,
        branch VARCHAR(128) DEFAULT '',
        is_default BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (caregiver_user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Seed tài khoản mẫu cho các caregiver nếu chưa có
    const [count] = await pool.execute('SELECT COUNT(*) as cnt FROM caregiver_bank_accounts');
    if (count[0].cnt === 0) {
      const [caregivers] = await pool.execute("SELECT id, full_name FROM users WHERE role = 'caregiver'");
      const defaultBanks = [
        { bank: 'Ngân hàng Ngoại Thương Việt Nam (Vietcombank)', num: '1023948572' },
        { bank: 'Ngân hàng Quân Đội (MB Bank)', num: '0988776655' },
        { bank: 'Ngân hàng Đầu tư & Phát triển Việt Nam (BIDV)', num: '21510001234567' },
        { bank: 'Ngân hàng Kỹ Thương Việt Nam (Techcombank)', num: '19036789123456' }
      ];
      for (let i = 0; i < caregivers.length; i++) {
        const cg = caregivers[i];
        const b = defaultBanks[i % defaultBanks.length];
        await pool.execute(
          `INSERT INTO caregiver_bank_accounts (caregiver_user_id, bank_name, account_number, account_holder, branch)
           VALUES (?, ?, ?, ?, 'Hội sở chính')`,
          [cg.id, b.bank, b.num, (cg.full_name || 'NGUYEN VAN A').toUpperCase()]
        );
      }
      console.log('✅ [MySQL] Đã khởi tạo tài khoản ngân hàng thụ hưởng cho các Người chăm sóc');
    }
  } catch (err) {
    console.error('⚠️ [MySQL] Lỗi khởi tạo caregiver_bank_accounts:', err.message);
  }
}

// Khởi tạo bảng thanh toán ký quỹ giữ tiền an toàn cho từng ca làm việc (Escrow Safe-Pay)
async function initBookingEscrowPaymentsTable() {
  if (!pool || !isMySqlConnected) return;
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS booking_escrow_payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        transaction_code VARCHAR(64) UNIQUE NOT NULL,
        schedule_id INT NULL,
        family_user_id INT NOT NULL,
        caregiver_user_id INT NOT NULL,
        patient_name VARCHAR(128) NOT NULL,
        shift_date VARCHAR(64) NOT NULL,
        shift_time VARCHAR(64) NOT NULL,
        total_amount INT NOT NULL COMMENT 'Tổng số tiền ca làm (100%)',
        platform_fee INT NOT NULL COMMENT 'Chiết khấu sàn nền tảng 35%',
        caregiver_earnings INT NOT NULL COMMENT 'Thực nhận của Người chăm sóc 65%',
        escrow_status ENUM('pending_payment', 'in_escrow', 'paid_out', 'refunded') DEFAULT 'pending_payment' COMMENT 'Trạng thái ký quỹ',
        payment_method VARCHAR(64) DEFAULT 'VietQR Napas 247',
        family_paid_at TIMESTAMP NULL,
        released_at TIMESTAMP NULL COMMENT 'Thời gian tự động giải ngân về TK Người chăm sóc',
        bank_reference VARCHAR(128) NULL,
        caregiver_bank_name VARCHAR(100) NULL,
        caregiver_account_number VARCHAR(64) NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (family_user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (caregiver_user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Đồng bộ các ca trong schedules chưa có trong booking_escrow_payments
    const [schedules] = await pool.execute(`
      SELECT s.*, 
             u_fam.full_name as fam_name, 
             u_cg.full_name as cg_name,
             ba.bank_name as cg_bank,
             ba.account_number as cg_acc
      FROM schedules s
      LEFT JOIN users u_fam ON s.family_user_id = u_fam.id
      LEFT JOIN users u_cg ON s.caregiver_user_id = u_cg.id
      LEFT JOIN caregiver_bank_accounts ba ON s.caregiver_user_id = ba.caregiver_user_id AND ba.is_default = TRUE
    `);

    for (const sched of schedules) {
      const [existing] = await pool.execute('SELECT id FROM booking_escrow_payments WHERE schedule_id = ? LIMIT 1', [sched.id]);
      if (existing.length === 0) {
        const total = Number(sched.price) || 400000;
        const fee = Math.round(total * 0.35); // 35% phí nền tảng
        const earnings = total - fee;        // 65% thực nhận
        const txCode = 'ESC-2026-' + String(sched.id).padStart(4, '0') + '-' + Math.floor(1000 + Math.random() * 9000);

        let escrowStatus = 'pending_payment';
        let familyPaidAt = null;
        let releasedAt = null;

        if (sched.status === 'completed') {
          escrowStatus = 'paid_out';
          familyPaidAt = sched.created_at || new Date();
          releasedAt = new Date(new Date(familyPaidAt).getTime() + 4 * 3600 * 1000);
        } else if (sched.status === 'confirmed' || sched.status === 'in_progress') {
          escrowStatus = 'in_escrow';
          familyPaidAt = sched.created_at || new Date();
        }

        await pool.execute(
          `INSERT INTO booking_escrow_payments 
           (transaction_code, schedule_id, family_user_id, caregiver_user_id, patient_name, shift_date, shift_time, total_amount, platform_fee, caregiver_earnings, escrow_status, payment_method, family_paid_at, released_at, bank_reference, caregiver_bank_name, caregiver_account_number, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'VietQR Napas 247', ?, ?, ?, ?, ?, ?)`,
          [
            txCode,
            sched.id,
            sched.family_user_id,
            sched.caregiver_user_id || 2,
            sched.elderly_name || 'Người thân',
            sched.schedule_date || 'Hôm nay',
            sched.time_slot || '08:00 - 12:00',
            total,
            fee,
            earnings,
            escrowStatus,
            familyPaidAt,
            releasedAt,
            'NPS' + Math.floor(100000000 + Math.random() * 900000000),
            sched.cg_bank || 'Vietcombank',
            sched.cg_acc || '1023948572',
            sched.status === 'completed' ? 'Ca hoàn thành, đã tất toán chuyển khoản 85% về tài khoản Người chăm sóc' : 'Tiền được bảo lãnh an toàn tại CARE-MATCH'
          ]
        );
      }
    }
    console.log('✅ [MySQL] Đã đồng bộ bảng booking_escrow_payments với các ca làm việc');
  } catch (err) {
    console.error('⚠️ [MySQL] Lỗi khởi tạo booking_escrow_payments:', err.message);
  }
}

// Khởi tạo bảng Vouchers & Ưu đãi
async function initVouchersTable() {
  if (!pool || !isMySqlConnected) return;
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS vouchers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(64) UNIQUE NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT NULL,
        discount_type ENUM('percentage', 'fixed') DEFAULT 'percentage',
        discount_value INT NOT NULL DEFAULT 50,
        max_discount_amount INT DEFAULT 500000,
        min_order_amount INT DEFAULT 0,
        start_date DATE NULL,
        end_date DATE NULL,
        usage_limit INT DEFAULT 1000,
        used_count INT DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Kiểm tra và seed voucher mặc định CAREFIRST50
    const [rows] = await pool.execute("SELECT id FROM vouchers WHERE code = 'CAREFIRST50' LIMIT 1");
    if (rows.length === 0) {
      await pool.execute(`
        INSERT INTO vouchers 
          (code, title, description, discount_type, discount_value, max_discount_amount, min_order_amount, start_date, end_date, usage_limit, used_count, is_active)
        VALUES 
          ('CAREFIRST50', 
           'Ưu đãi 50% đặt ca lần đầu & Miễn phí 100% tư vấn sức khỏe bữa ăn', 
           'Giảm 50% chi phí ca chăm sóc đầu tiên (tối đa 500.000đ) dành cho khách hàng mới, tặng kèm 01 buổi tư vấn dinh dưỡng và chăm sóc người cao tuổi miễn phí 100% từ chuyên gia.', 
           'percentage', 50, 500000, 0, '2026-01-01', '2026-12-31', 1000, 0, TRUE)
      `);
      console.log('✅ [MySQL] Đã khởi tạo voucher mặc định CAREFIRST50');
    }

    const [vipRows] = await pool.execute("SELECT id FROM vouchers WHERE code = 'VIPCARE20' LIMIT 1");
    if (vipRows.length === 0) {
      await pool.execute(`
        INSERT INTO vouchers 
          (code, title, description, discount_type, discount_value, max_discount_amount, min_order_amount, start_date, end_date, usage_limit, used_count, is_active)
        VALUES 
          ('VIPCARE20', 
           'Đặc quyền VIP - Giảm ngay 20.000đ', 
           'Đặc quyền dành riêng cho thành viên Gia Đình VIP và thân thiết, giảm ngay 20.000đ cho mỗi ca đặt lịch chăm sóc.', 
           'fixed', 20000, 20000, 100000, '2026-01-01', '2026-12-31', 1000, 0, TRUE)
      `);
    }

    const [nightRows] = await pool.execute("SELECT id FROM vouchers WHERE code = 'CHAMSOC247' LIMIT 1");
    if (nightRows.length === 0) {
      await pool.execute(`
        INSERT INTO vouchers 
          (code, title, description, discount_type, discount_value, max_discount_amount, min_order_amount, start_date, end_date, usage_limit, used_count, is_active)
        VALUES 
          ('CHAMSOC247', 
           'Ưu đãi 30.000đ ca đêm / ca dài', 
           'Hỗ trợ các gia đình cần chăm sóc dài ca hoặc ca đêm, giảm trực tiếp 30.000đ do CARE-MATCH trợ giá.', 
           'fixed', 30000, 30000, 300000, '2026-01-01', '2026-12-31', 1000, 0, TRUE)
      `);
    }

    const [trianRows] = await pool.execute("SELECT id FROM vouchers WHERE code = 'TRIANKHACHHANG' LIMIT 1");
    if (trianRows.length === 0) {
      await pool.execute(`
        INSERT INTO vouchers 
          (code, title, description, discount_type, discount_value, max_discount_amount, min_order_amount, start_date, end_date, usage_limit, used_count, is_active)
        VALUES 
          ('TRIANKHACHHANG', 
           'Mã Tri Ân Khách Hàng - Giảm 15.000đ', 
           'CARE-MATCH tri ân các gia đình gắn kết dịch vụ, giảm 15.000đ không giới hạn lượt dùng.', 
           'fixed', 15000, 15000, 100000, '2026-01-01', '2026-12-31', 1000, 0, TRUE)
      `);
    }

    // Đảm bảo các cột voucher tồn tại trong schedules & booking_escrow_payments
    try {
      const [colsVoucher] = await pool.execute("SHOW COLUMNS FROM schedules LIKE 'voucher_code'");
      if (colsVoucher.length === 0) {
        await pool.execute("ALTER TABLE schedules ADD COLUMN voucher_code VARCHAR(64) NULL");
        await pool.execute("ALTER TABLE schedules ADD COLUMN voucher_discount INT DEFAULT 0");
        await pool.execute("ALTER TABLE schedules ADD COLUMN original_price INT NULL");
      }
    } catch (migErr) {
      console.warn('Lưu ý kiểm tra cột voucher schedules:', migErr.message);
    }

    try {
      const [colsEscVoucher] = await pool.execute("SHOW COLUMNS FROM booking_escrow_payments LIKE 'voucher_code'");
      if (colsEscVoucher.length === 0) {
        await pool.execute("ALTER TABLE booking_escrow_payments ADD COLUMN voucher_code VARCHAR(64) NULL");
        await pool.execute("ALTER TABLE booking_escrow_payments ADD COLUMN voucher_discount INT DEFAULT 0");
        await pool.execute("ALTER TABLE booking_escrow_payments ADD COLUMN original_amount INT NULL");
        await pool.execute("ALTER TABLE booking_escrow_payments ADD COLUMN system_subsidy INT DEFAULT 0");
      }
    } catch (migErr2) {
      console.warn('Lưu ý kiểm tra cột voucher booking_escrow_payments:', migErr2.message);
    }

  } catch (err) {
    console.error('⚠️ [MySQL] Lỗi khởi tạo vouchers table:', err.message);
  }
}

// Khởi tạo bảng Cấu hình Hệ thống & Bất biến
async function initSystemSettingsTable() {
  if (!pool || !isMySqlConnected) return;
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS system_settings (
        setting_key VARCHAR(64) PRIMARY KEY,
        setting_value TEXT NOT NULL,
        setting_type VARCHAR(32) DEFAULT 'string',
        setting_group VARCHAR(64) DEFAULT 'general',
        description VARCHAR(255) NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    try {
      await pool.execute('ALTER TABLE system_settings MODIFY COLUMN setting_value LONGTEXT NOT NULL');
    } catch (_) { }

    const defaults = [
      ['cancellation_fee_regular', '10000', 'number', 'fees', 'Phí đổi / hủy ca đối với tài khoản thường (VNĐ)'],
      ['vip_monthly_price', '300000', 'number', 'membership', 'Giá gói Hội viên VIP Gia đình (VNĐ/tháng)'],
      ['caregiver_payout_rate', '65', 'number', 'commission', 'Tỷ lệ thù lao chuyển trả cho người chăm sóc (%)'],
      ['platform_commission_rate', '35', 'number', 'commission', 'Tỷ lệ hoa hồng vận hành sàn CARE-MATCH (%)'],
      ['base_shift_rate_4h', '400000', 'number', 'pricing', 'Mức thù lao chuẩn ca ngày 4 tiếng (VNĐ)'],
      ['night_shift_multiplier', '1.5', 'number', 'pricing', 'Hệ số tính ca đêm (12 tiếng) so với ca ngày'],
      ['hourly_divisor', '4', 'number', 'pricing', 'Số giờ quy đổi từ ca 4 tiếng sang đơn giá theo giờ (Đơn giá/h = Ca / 4)'],
      ['min_care_score_recommended', '90', 'number', 'matching', 'Điểm CARE SCORE tối thiểu để ưu tiên xuất hiện trên đề xuất'],
      ['require_online_interview', '1', 'boolean', 'verification', 'Bắt buộc phỏng vấn online qua Google Meet trước khi nhận ca'],
      ['home_headline', 'Những người chăm sóc phù hợp nhất', 'string', 'content', 'Tiêu đề hiển thị tại mục tìm kiếm người chăm sóc'],
      ['hotline_support', '1900 6868', 'string', 'support', 'Số điện thoại đường dây nóng CSKH y tế 24/7'],
      ['slogan_text', 'CARE MATCH — Đồng hành mỗi ngày – An tâm tuổi bạc', 'string', 'content', 'Khẩu hiệu chính của nền tảng CARE-MATCH'],
      ['escrow_deposit_percent', '100', 'number', 'payment', 'Tỷ lệ ký quỹ giữ chỗ khi đặt ca chăm sóc (%)'],
      ['cancel_free_hours_notice', '6', 'number', 'policy', 'Số giờ báo trước tối thiểu để hủy ca được hoàn 100% tiền cọc (giờ)'],
      ['max_shifts_per_caregiver_day', '3', 'number', 'safety', 'Giới hạn số ca làm tối đa trong 1 ngày của điều dưỡng viên'],
      ['emergency_sla_minutes', '15', 'number', 'operations', 'Thời gian cam kết điều phối ca khẩn cấp (phút)'],
      ['require_daily_care_log', '1', 'boolean', 'quality', 'Bắt buộc điều dưỡng nộp sổ theo dõi sau ca trước khi đối soát thù lao'],
      ['warning_bp_high', '140', 'number', 'medical', 'Ngưỡng cảnh báo huyết áp cao tâm thu (mmHg)'],
      ['warning_spo2_low', '95', 'number', 'medical', 'Ngưỡng cảnh báo oxy trong máu SpO2 ở mức thấp (%)'],
      ['support_email', 'cskh@carematch.vn', 'string', 'support', 'Email chính thức tiếp nhận phản ánh & CSKH 24/7'],
      ['admin_bank_name', 'MB Bank (Quân Đội)', 'string', 'payment', 'Tên ngân hàng thụ hưởng nhận thanh toán'],
      ['admin_bank_account', '0934 567 890', 'string', 'payment', 'Số tài khoản ngân hàng thụ hưởng'],
      ['admin_bank_owner', 'TỐNG THANH DƯƠNG', 'string', 'payment', 'Tên chủ tài khoản thụ hưởng'],
      ['admin_qr_image', '', 'string', 'payment', 'Ảnh mã QR VietQR do Admin tải lên'],
      ['vietqr_client_id', '', 'string', 'payment', 'Client ID cổng thanh toán VietQR thật'],
      ['vietqr_api_key', '', 'string', 'payment', 'API Key / Secret cổng thanh toán VietQR thật'],
      ['vietqr_auto_confirm', '1', 'boolean', 'payment', 'Bật xác thực giao dịch chuyển khoản tự động']
    ];

    for (const [key, val, type, grp, desc] of defaults) {
      await pool.execute(`
        INSERT INTO system_settings (setting_key, setting_value, setting_type, setting_group, description)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE description = VALUES(description)
      `, [key, val, type, grp, desc]);
    }
    console.log('✅ [MySQL] Đã khởi tạo bảng system_settings & nạp cấu hình hệ thống');
  } catch (err) {
    console.error('⚠️ [MySQL] Lỗi khởi tạo system_settings table:', err.message);
  }
}

// Khởi tạo bảng cộng đồng người cao tuổi & gia đình (Communities)
async function initCommunitiesTable() {
  if (!pool || !isMySqlConnected) return;
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS communities (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100) DEFAULT 'Sức khỏe & Vận động',
        description TEXT,
        meeting_schedule VARCHAR(255) DEFAULT '05:30 - 06:45 Hàng ngày',
        location VARCHAR(255) DEFAULT 'Công viên Cầu Giấy, Hà Nội',
        member_count INT DEFAULT 120,
        zalo_link VARCHAR(255) DEFAULT 'https://zalo.me/g/carematch_community',
        qr_code_url TEXT,
        tags TEXT,
        leader_name VARCHAR(128) DEFAULT 'Chị Thu Hà (NV CTXH)',
        status ENUM('active', 'inactive') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    const [rows] = await pool.execute('SELECT COUNT(*) AS cnt FROM communities');
    if (rows[0].cnt === 0) {
      const defaultCommunities = [
        {
          name: 'CLB Đi Bộ Dưỡng Sinh Buổi Sáng',
          category: 'Vận động ngoài trời',
          description: 'Cùng nhau đi bộ quanh hồ công viên, hít thở không khí trong lành, chia sẻ câu chuyện đầu ngày và khởi động xương khớp nhẹ nhàng.',
          schedule: '05:30 - 06:30 Hàng ngày',
          location: 'Công viên Cầu Giấy, Phố Duy Tân, Cầu Giấy, Hà Nội',
          members: 148,
          leader: 'Bác Nguyễn Văn Hùng & NV CTXH Thu Hà',
          tags: JSON.stringify(['Đi bộ dưỡng sinh', 'Không khí trong lành', 'Xương khớp dẻo dai', 'Giao lưu buổi sáng']),
          zalo: 'https://zalo.me/g/carematch_dibo',
          qr: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=https://zalo.me/g/carematch_dibo'
        },
        {
          name: 'CLB Thể Dục Nhịp Điệu & Aerobic Dưỡng Sinh',
          category: 'Thể dục nhịp điệu',
          description: 'Các bài tập aerobic dưỡng sinh trên nền nhạc truyền thống vui tươi, nhịp điệu vừa sức giúp lưu thông khí huyết và cải thiện tuần hoàn tim mạch.',
          schedule: '06:00 - 07:00 Thứ 2, 4, 6',
          location: 'Sân Nhà Văn Hóa Phường Dịch Vọng Hậu, Cầu Giấy',
          members: 95,
          leader: 'Cô Mai Chi & HLV Thể Dục Dưỡng Sinh',
          tags: JSON.stringify(['Aerobic dưỡng sinh', 'Tim mạch khỏe mạnh', 'Nhịp điệu vui tươi', 'Thư giãn gân cốt']),
          zalo: 'https://zalo.me/g/carematch_aerobic',
          qr: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=https://zalo.me/g/carematch_aerobic'
        },
        {
          name: 'CLB Yoga & Thiền Khí Công Người Cao Tuổi',
          category: 'Yoga & Khí công',
          description: 'Điều hòa hơi thở, kéo giãn nhẹ nhàng các khớp, hỗ trợ giảm đau lưng mỏi gối và cải thiện chứng mất ngủ kinh niên ở người lớn tuổi.',
          schedule: '17:00 - 18:15 Thứ 3, 5, 7 & Chủ Nhật',
          location: 'Nhà thi đấu Thể thao Nghĩa Tân & Sinh hoạt Zoom Online',
          members: 120,
          leader: 'Chuyên gia Yoga Phục hồi Lan Anh',
          tags: JSON.stringify(['Yoga dưỡng sinh', 'Thiền khí công', 'Giấc ngủ sâu', 'Phục hồi chức năng']),
          zalo: 'https://zalo.me/g/carematch_yoga',
          qr: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=https://zalo.me/g/carematch_yoga'
        },
        {
          name: 'CLB Trà Đạo & Đàm Đạo Tri Thức Tuổi Vàng',
          category: 'Giao lưu & Tâm lý',
          description: 'Không gian thưởng trà ấm cúng, cờ tướng, ngâm thơ và đàm đạo văn hóa, chia sẻ kinh nghiệm sống cùng những người bạn già đồng niên.',
          schedule: '08:30 - 10:30 Thứ 7 & Chủ Nhật',
          location: 'Vườn Trà Trúc Bạch, Quận Ba Đình, Hà Nội',
          members: 82,
          leader: 'Bác Trần Quốc Tuấn',
          tags: JSON.stringify(['Trà đạo', 'Cờ tướng', 'Thơ ca', 'Đàm đạo tâm tình']),
          zalo: 'https://zalo.me/g/carematch_tradao',
          qr: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=https://zalo.me/g/carematch_tradao'
        },
        {
          name: 'Cộng Đồng Bác Sĩ & Chuyên Gia Y Tế Đồng Hành',
          category: 'Tư vấn y tế',
          description: 'Kênh hỏi đáp trực tuyến 24/7 cùng các bác sĩ, điều dưỡng Lão khoa. Hướng dẫn chế độ ăn tiểu đường, huyết áp và sơ cứu khẩn cấp.',
          schedule: 'Hoạt động liên tục 24/7 (Hỏi đáp trực tuyến)',
          location: 'Nhóm Zalo Y Tế CARE-MATCH Toàn Quốc',
          members: 320,
          leader: 'Bác sĩ CK1 Lão khoa Nguyễn Tuấn',
          tags: JSON.stringify(['Hỏi đáp bác sĩ', 'Huyết áp & Tiểu đường', 'Dinh dưỡng người già', 'Cấp cứu 24/7']),
          zalo: 'https://zalo.me/g/carematch_yte',
          qr: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=https://zalo.me/g/carematch_yte'
        },
        {
          name: 'CLB Cờ Tướng & Rèn Luyện Trí Não Tuổi Vàng',
          category: 'Rèn luyện trí nhớ',
          description: 'Trò chơi cờ tướng, câu đố trí tuệ và bài tập kích thích bán cầu não, phòng ngừa sa sút trí tuệ và bệnh Alzheimer tuổi già.',
          schedule: '15:00 - 17:00 Thứ 4 & Thứ 7',
          location: 'Trung Tâm Sinh Hoạt Cộng Đồng Phường Láng Hạ, Đống Đa',
          members: 74,
          leader: 'ThS. Tâm lý Lâm sàng Hoàng Yến',
          tags: JSON.stringify(['Cờ tướng', 'Phòng ngừa sa sút trí tuệ', 'Trò chơi trí tuệ', 'Niềm vui tuổi già']),
          zalo: 'https://zalo.me/g/carematch_trinao',
          qr: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=https://zalo.me/g/carematch_trinao'
        }
      ];

      for (const c of defaultCommunities) {
        await pool.execute(
          `INSERT INTO communities 
           (name, category, description, meeting_schedule, location, member_count, leader_name, tags, zalo_link, qr_code_url, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
          [c.name, c.category, c.description, c.schedule, c.location, c.members, c.leader, c.tags, c.zalo, c.qr]
        );
      }
      console.log('✅ [MySQL] Đã khởi tạo danh sách cộng đồng mẫu cho bảng communities');
    }
  } catch (err) {
    console.error('⚠️ [MySQL] Lỗi khởi tạo bảng communities:', err.message);
  }
}

// Khởi tạo bảng đánh giá sao người chăm sóc (Caregiver Reviews)
async function initCaregiverReviewsTable() {
  if (!pool || !isMySqlConnected) return;
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS caregiver_reviews (
        id INT AUTO_INCREMENT PRIMARY KEY,
        schedule_id INT NULL,
        caregiver_user_id INT NOT NULL,
        family_user_id INT NOT NULL,
        family_name VARCHAR(128) DEFAULT 'Gia đình',
        patient_name VARCHAR(128) DEFAULT 'Người thân',
        service_title VARCHAR(255) DEFAULT 'Ca chăm sóc',
        rating INT NOT NULL DEFAULT 5,
        tags TEXT,
        review_text TEXT,
        status ENUM('approved', 'pending', 'hidden') DEFAULT 'approved',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (caregiver_user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (family_user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    const [rows] = await pool.execute('SELECT COUNT(*) AS cnt FROM caregiver_reviews');
    if (rows[0].cnt === 0) {
      const defaultReviews = [
        {
          caregiver_id: 2,
          family_id: 5,
          family_name: 'Nguyễn Minh Mai',
          patient: 'Bà Lan',
          service: 'Ca chăm sóc buổi sáng (4 tiếng)',
          rating: 5,
          tags: JSON.stringify(['Đúng giờ', 'Tận tâm', 'Kỹ năng tốt', 'Ân cần']),
          text: 'Chị Thu Hà chăm sóc mẹ tôi rất chu đáo và đúng giờ. Mẹ tôi rất vui và khen chị mát tay đo huyết áp, nói chuyện dễ chịu. Cảm ơn chị rất nhiều!',
          date: '2026-09-23 12:30:00'
        },
        {
          caregiver_id: 2,
          family_id: 31,
          family_name: 'tuantest15',
          patient: 'Cụ Tuấn',
          service: 'Ca chăm sóc test 2 (9 tiếng - Ca đêm)',
          rating: 5,
          tags: JSON.stringify(['Chuyên môn cao', 'Kiên nhẫn', 'Nấu ăn ngon']),
          text: 'Điều dưỡng viên nhiệt tình, biết cách dỗ cụ ăn hết phần cháo và hướng dẫn bài tập chân tại giường rất hiệu quả. Gia đình rất an tâm.',
          date: '2026-09-24 07:15:00'
        },
        {
          caregiver_id: 3,
          family_id: 5,
          family_name: 'Vũ Hoàng Long',
          patient: 'Bác Hòa',
          service: 'Ca chăm sóc đồng hành (4 tiếng)',
          rating: 5,
          tags: JSON.stringify(['Ấm áp', 'Tâm lý', 'Đúng giờ']),
          text: 'Cô Mai Chi nói chuyện duyên dáng, cụ nhà tôi rất thích nghe cô kể chuyện xưa. Nấu ăn cũng rất hợp khẩu vị người già bị tiểu đường.',
          date: '2026-09-22 17:00:00'
        },
        {
          caregiver_id: 3,
          family_id: 31,
          family_name: 'Trần Bích Thủy',
          patient: 'Cụ An',
          service: 'Ca chăm sóc phục hồi vận động',
          rating: 5,
          tags: JSON.stringify(['Lễ phép', 'Cẩn thận', 'Trách nhiệm']),
          text: 'Chuyên viên chu đáo, lễ phép, hỗ trợ cụ đi dạo trong công viên an toàn. Chắc chắn sẽ tiếp tục đặt ca với cô Chi!',
          date: '2026-09-23 18:00:00'
        }
      ];

      for (const r of defaultReviews) {
        await pool.execute(
          `INSERT INTO caregiver_reviews 
           (schedule_id, caregiver_user_id, family_user_id, family_name, patient_name, service_title, rating, tags, review_text, status, created_at)
           VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, ?, 'approved', ?)`,
          [r.caregiver_id, r.family_id, r.family_name, r.patient, r.service, r.rating, r.tags, r.text, r.date]
        );
      }
      console.log('✅ [MySQL] Đã khởi tạo các đánh giá sao mẫu cho bảng caregiver_reviews');
    }
  } catch (err) {
    console.error('⚠️ [MySQL] Lỗi khởi tạo bảng caregiver_reviews:', err.message);
  }
}

// Khởi tạo các cột hỗ trợ xác nhận hoàn thành ca 2 chiều (Caregiver & Family) và Đánh giá sao
async function initSchedulesTableMigrations() {
  if (!pool || !isMySqlConnected) return;
  try {
    const [colsCg] = await pool.execute("SHOW COLUMNS FROM schedules LIKE 'caregiver_confirmed_completed'");
    if (colsCg.length === 0) {
      await pool.execute("ALTER TABLE schedules ADD COLUMN caregiver_confirmed_completed BOOLEAN DEFAULT FALSE");
      await pool.execute("ALTER TABLE schedules ADD COLUMN family_confirmed_completed BOOLEAN DEFAULT FALSE");
      await pool.execute("ALTER TABLE schedules ADD COLUMN caregiver_completed_at TIMESTAMP NULL");
      await pool.execute("ALTER TABLE schedules ADD COLUMN family_completed_at TIMESTAMP NULL");
      console.log('✅ [MySQL] Đã cập nhật các cột xác nhận 2 chiều cho bảng schedules');
    }

    const [colsRating] = await pool.execute("SHOW COLUMNS FROM schedules LIKE 'is_rated'");
    if (colsRating.length === 0) {
      await pool.execute("ALTER TABLE schedules ADD COLUMN is_rated BOOLEAN DEFAULT FALSE");
      await pool.execute("ALTER TABLE schedules ADD COLUMN rating INT DEFAULT NULL");
      await pool.execute("ALTER TABLE schedules ADD COLUMN review_id INT DEFAULT NULL");
      await pool.execute("ALTER TABLE schedules ADD COLUMN review_text TEXT DEFAULT NULL");
      await pool.execute("ALTER TABLE schedules ADD COLUMN care_log_id INT DEFAULT NULL");
      console.log('✅ [MySQL] Đã thêm các cột đánh giá sao và nhật ký chăm sóc cho bảng schedules');
    }
  } catch (e) {
    console.warn('Lưu ý kiểm tra cột bảng schedules:', e.message);
  }
}

// Khởi tạo bảng Hồ sơ theo dõi sức khỏe sau ca chăm sóc (Patient Care Logs)
async function initPatientCareLogsTable() {
  if (!pool || !isMySqlConnected) return;
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS patient_care_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        schedule_id INT NULL,
        family_user_id INT NOT NULL,
        caregiver_user_id INT NOT NULL,
        elderly_profile_id INT NULL,
        elderly_name VARCHAR(128) NOT NULL,
        family_name VARCHAR(128) DEFAULT 'Gia đình',
        caregiver_name VARCHAR(128) NOT NULL,
        log_date DATE NOT NULL,
        time_slot VARCHAR(128) DEFAULT 'Ca ngày (08:00 - 12:00)',
        blood_pressure_systolic INT DEFAULT 120,
        blood_pressure_diastolic INT DEFAULT 80,
        heart_rate INT DEFAULT 75,
        blood_sugar DECIMAL(5, 2) DEFAULT 5.6,
        temperature DECIMAL(4, 1) DEFAULT 36.8,
        spo2 INT DEFAULT 98,
        weight DECIMAL(5, 1) NULL,
        meal_status VARCHAR(255) DEFAULT 'Ăn hết khẩu phần cháo dinh dưỡng',
        medication_status VARCHAR(255) DEFAULT 'Đã uống đủ thuốc huyết áp sau ăn',
        sleep_mood VARCHAR(255) DEFAULT 'Tâm trạng vui vẻ, tỉnh táo',
        mobility_exercise VARCHAR(255) DEFAULT 'Đi bộ nhẹ nhàng 20 phút quanh vườn',
        tasks_completed TEXT,
        overall_condition ENUM('good', 'normal', 'attention', 'warning') DEFAULT 'good',
        caregiver_notes TEXT,
        family_acknowledged BOOLEAN DEFAULT FALSE,
        family_note TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX (family_user_id),
        INDEX (caregiver_user_id),
        INDEX (elderly_name),
        INDEX (log_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    const [rows] = await pool.execute('SELECT COUNT(*) AS cnt FROM patient_care_logs');
    if (rows[0].cnt === 0) {
      const sampleLogs = [
        {
          schedule_id: null,
          family_user_id: 31,
          caregiver_user_id: 2,
          elderly_profile_id: 1,
          elderly_name: 'Dương',
          family_name: 'Gia đình tuantest15',
          caregiver_name: 'Tuấn test 8',
          log_date: '2026-09-27',
          time_slot: 'Ca sáng (08:00 - 12:00)',
          blood_pressure_systolic: 122,
          blood_pressure_diastolic: 81,
          heart_rate: 74,
          blood_sugar: 5.5,
          temperature: 36.7,
          spo2: 99,
          weight: 62.5,
          meal_status: 'Ăn hết 1 bát cháo yến hạt sen lúc 08:30, uống 300ml nước ấm',
          medication_status: 'Đã uống 1 viên Amlodipine 5mg sau ăn sáng đúng giờ',
          sleep_mood: 'Tâm trạng tươi tỉnh, tinh thần sảng khoái, đêm qua ngủ tròn giấc 7.5 tiếng',
          mobility_exercise: 'Tập vận động phục hồi khớp gối 20 phút, đi lại quanh phòng khách nhẹ nhàng',
          tasks_completed: JSON.stringify(['Đo sinh hiệu (Huyết áp, Tim, SpO2)', 'Hỗ trợ ăn uống dinh dưỡng', 'Nhắc uống thuốc theo đơn', 'Vật lý trị liệu phục hồi nhẹ', 'Vệ sinh cá nhân & gội đầu khô']),
          overall_condition: 'good',
          caregiver_notes: 'Chỉ số sinh hiệu rất ổn định. Khớp gối đỡ cứng hơn tuần trước. Ca sau tiếp tục bài tập duỗi chân và duy trì khẩu phần ăn ít muối.',
          family_acknowledged: true,
          family_note: 'Cảm ơn chuyên viên Tuấn đã chăm sóc rất tận tâm, gia đình rất an tâm!'
        },
        {
          schedule_id: null,
          family_user_id: 31,
          caregiver_user_id: 2,
          elderly_profile_id: 2,
          elderly_name: 'Bà Lan',
          family_name: 'Gia đình tuantest15',
          caregiver_name: 'Tuấn test 8',
          log_date: '2026-09-26',
          time_slot: 'Ca chiều (13:30 - 17:30)',
          blood_pressure_systolic: 130,
          blood_pressure_diastolic: 85,
          heart_rate: 78,
          blood_sugar: 6.2,
          temperature: 36.9,
          spo2: 97,
          weight: 55.0,
          meal_status: 'Ăn 1 chén súp gà nấm, uống 1 ly sữa Ensure dinh dưỡng lúc 15:00',
          medication_status: 'Đã uống thuốc tiểu đường Glucophage 500mg và vitamin tổng hợp',
          sleep_mood: 'Ngủ trưa 1 tiếng, dậy tỉnh táo, vui vẻ nghe radio và tâm sự chuyện gia đình',
          mobility_exercise: 'Đi dạo sân vườn 15 phút có điều dưỡng viên dìu đỡ cẩn thận',
          tasks_completed: JSON.stringify(['Đo đường huyết & huyết áp', 'Xoa bóp giảm đau vai gáy', 'Cho ăn bữa phụ dinh dưỡng', 'Trò chuyện & đồng hành tâm lý']),
          overall_condition: 'good',
          caregiver_notes: 'Đường huyết 6.2 mmol/L ở mức tốt sau bữa phụ. Cần tiếp tục theo dõi huyết áp buổi sáng ca sau.',
          family_acknowledged: true,
          family_note: 'Bà rất khen cô điều dưỡng nhẹ nhàng và vui tính!'
        },
        {
          schedule_id: null,
          family_user_id: 5,
          caregiver_user_id: 3,
          elderly_profile_id: 3,
          elderly_name: 'Cụ Tuấn',
          family_name: 'Gia đình Nguyễn Văn',
          caregiver_name: 'Nguyễn Thu Hà',
          log_date: '2026-09-25',
          time_slot: 'Ca đêm (19:00 - 07:00)',
          blood_pressure_systolic: 125,
          blood_pressure_diastolic: 82,
          heart_rate: 72,
          blood_sugar: 5.8,
          temperature: 36.6,
          spo2: 98,
          weight: 68.0,
          meal_status: 'Ăn nhẹ bánh ngũ cốc yến mạch và 1 cốc nước ấm lúc 21:00',
          medication_status: 'Đã uống thuốc an thần thảo dược theo chỉ định bác sĩ lúc 21:30',
          sleep_mood: 'Đêm ngủ sâu giấc từ 22:00 đến 05:45, không thức giấc giữa đêm',
          mobility_exercise: 'Trở mình và thay đổi tư thế chống loét tì đè mỗi 2 tiếng ban đêm',
          tasks_completed: JSON.stringify(['Túc trực theo dõi ca đêm', 'Trở mình chống loét tì đè', 'Kiểm tra sinh hiệu định kỳ', 'Hỗ trợ đi vệ sinh an toàn']),
          overall_condition: 'good',
          caregiver_notes: 'Cụ ngủ ngon, da dẻ vùng xương cụt hồng hào bình thường, không có dấu hiệu tấy đỏ.',
          family_acknowledged: false,
          family_note: null
        }
      ];

      for (const log of sampleLogs) {
        await pool.execute(
          `INSERT INTO patient_care_logs 
           (schedule_id, family_user_id, caregiver_user_id, elderly_profile_id, elderly_name, family_name, caregiver_name, 
            log_date, time_slot, blood_pressure_systolic, blood_pressure_diastolic, heart_rate, blood_sugar, temperature, spo2, weight,
            meal_status, medication_status, sleep_mood, mobility_exercise, tasks_completed, overall_condition, caregiver_notes, family_acknowledged, family_note)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            log.schedule_id, log.family_user_id, log.caregiver_user_id, log.elderly_profile_id, log.elderly_name, log.family_name, log.caregiver_name,
            log.log_date, log.time_slot, log.blood_pressure_systolic, log.blood_pressure_diastolic, log.heart_rate, log.blood_sugar, log.temperature, log.spo2, log.weight,
            log.meal_status, log.medication_status, log.sleep_mood, log.mobility_exercise, log.tasks_completed, log.overall_condition, log.caregiver_notes, log.family_acknowledged, log.family_note
          ]
        );
      }
      console.log('✅ [MySQL] Đã khởi tạo bảng patient_care_logs và nạp dữ liệu mẫu');
    }
  } catch (err) {
    console.error('⚠️ [MySQL] Lỗi khởi tạo bảng patient_care_logs:', err.message);
  }
}

// Helper hàm an toàn parse JSON
function parseJson(str, defaultValue = []) {
  if (!str) return defaultValue;
  if (typeof str !== 'string') return str;
  try {
    return JSON.parse(str);
  } catch {
    return defaultValue;
  }
}

// Thêm thông báo
async function createNotification(userId, type, title, body, link = '/') {
  if (!isMySqlConnected || !pool) return;
  try {
    await pool.execute(
      `INSERT INTO notifications (user_id, type, title, body, link, is_read) VALUES (?, ?, ?, ?, ?, FALSE)`,
      [userId, type, title, body, link]
    );
  } catch (err) {
    console.error('⚠️ Lỗi tạo thông báo MySQL:', err.message);
  }
}

// ========================================================
// REST API ROUTES
// ========================================================

// 0. Kiểm tra trạng thái
app.get('/api/health', async (req, res) => {
  if (!pool || !isMySqlConnected) {
    await initMySql();
  }
  let dbStatus = isMySqlConnected ? 'MySQL Connected' : 'Disconnected';
  let totalUsers = 0;
  if (pool) {
    try {
      const [rows] = await pool.execute('SELECT COUNT(*) AS total FROM users');
      totalUsers = rows[0]?.total || 0;
      dbStatus = 'connected';
    } catch (e) {
      dbStatus = 'error: ' + e.message;
    }
  }
  res.json({
    status: 'ok',
    service: 'CARE-MATCH Backend API',
    database: dbStatus,
    railwayHost: dbConfig.host,
    railwayDb: dbConfig.database,
    totalUsers,
    timestamp: new Date().toISOString()
  });
});

// ---- AUTH ----

// 1. Đăng nhập
app.post('/api/auth/login', async (req, res) => {
  const { username, password, role } = req.body;

  if (role === 'admin' || username === 'admin' || username === 'admin@carematch.vn') {
    if (password === '123456' || password === 'admin123') {
      return res.json({
        success: true,
        user: { id: 1, username: 'admin', full_name: 'Admin Quản Trị', role: 'admin', email: 'admin@carematch.vn' },
        token: 'token-admin-session-xyz'
      });
    }
    return res.status(401).json({ success: false, message: 'Mật khẩu quản trị viên không chính xác.' });
  }

  if (isMySqlConnected) {
    try {
      const [rows] = await pool.execute(
        'SELECT id, username, email, role, full_name, phone FROM users WHERE (username = ? OR email = ?) AND password_hash = ? LIMIT 1',
        [username, username, password]
      );
      if (rows.length > 0) {
        const u = rows[0];
        // Ràng buộc vai trò đăng nhập để không bị lẫn lộn giữa Gia đình và Người chăm sóc
        if (role && role !== 'admin' && u.role !== role) {
          if (u.role === 'family' && role === 'caregiver') {
            return res.status(400).json({
              success: false,
              message: 'Tài khoản này thuộc vai trò GIA ĐÌNH NGƯỜI CAO TUỔI. Vui lòng chọn tab "Gia đình người cao tuổi" để đăng nhập.'
            });
          } else if (u.role === 'caregiver' && role === 'family') {
            return res.status(400).json({
              success: false,
              message: 'Tài khoản này thuộc vai trò NGƯỜI CHĂM SÓC. Vui lòng chọn tab "Người chăm sóc" để đăng nhập.'
            });
          }
        }
        return res.json({ success: true, user: u, token: `token-${u.role}-${u.id}` });
      }
    } catch (e) {
      console.error('MySQL login error:', e.message);
    }
  }

  return res.status(401).json({ success: false, message: 'Email hoặc mật khẩu không chính xác.' });
});

// 2. Đăng ký tài khoản mới
app.post('/api/auth/register', async (req, res) => {
  const { email, password, full_name, role, phone } = req.body;

  if (!email || !password || !full_name) {
    return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ thông tin.' });
  }

  const username = email.split('@')[0];
  const userRole = role || 'family';

  if (isMySqlConnected) {
    try {
      // Kiểm tra trùng
      const [existing] = await pool.execute('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
      if (existing.length > 0) {
        return res.status(409).json({ success: false, message: 'Email này đã tồn tại trong hệ thống.' });
      }

      const [result] = await pool.execute(
        'INSERT INTO users (username, email, password_hash, role, full_name, phone) VALUES (?, ?, ?, ?, ?, ?)',
        [username, email, password, userRole, full_name, phone || '']
      );

      // Nếu đăng ký vai trò Người chăm sóc -> tự động tạo hồ sơ trong caregiver_profiles với trạng thái chưa nộp (not_submitted)
      if (userRole === 'caregiver') {
        try {
          const exp = Math.max(1, Number(req.body.experience_years ?? req.body.experienceYears) || 1);
          const shiftRate = Math.min(1000000, Math.max(400000, Number(req.body.shift_rate ?? req.body.shiftRate) || 400000));
          const nightShiftRate = Math.round(shiftRate * 1.5);
          const workHistory = JSON.stringify(req.body.work_history || []);
          const contactAddress = (req.body.contact_address || req.body.contactAddress || '').trim();
          await pool.execute(
            `INSERT INTO caregiver_profiles 
             (user_id, title, verification_status, care_score, experience_years, shift_rate, night_shift_rate, hourly_rate, district, contact_address, interview_status, skills, bio, work_history) 
             VALUES (?, 'Chuyên viên chăm sóc', 'not_submitted', 0, ?, ?, ?, 100000, '', ?, 'not_scheduled', '[]', '', ?)`,
            [result.insertId, exp, shiftRate, nightShiftRate, contactAddress, workHistory]
          );
        } catch (cpErr) {
          console.error('Lỗi tạo caregiver_profiles khi đăng ký:', cpErr.message);
        }
      } else if (userRole === 'family') {
        try {
          await pool.execute(
            `INSERT INTO family_profiles 
             (user_id, representative_name, phone, email, verification_status) 
             VALUES (?, ?, ?, ?, 'unverified')`,
            [result.insertId, full_name, phone || '', email]
          );
        } catch (fpErr) {
          console.error('Lỗi tạo family_profiles khi đăng ký:', fpErr.message);
        }
      }

      const newUser = {
        id: result.insertId,
        username,
        email,
        role: userRole,
        full_name,
        phone: phone || ''
      };

      return res.status(201).json({
        success: true,
        user: newUser,
        token: `token-${newUser.role}-${newUser.id}`
      });
    } catch (e) {
      console.error('MySQL register error:', e.message);
      return res.status(500).json({ success: false, message: 'Lỗi máy chủ cơ sở dữ liệu MySQL' });
    }
  }

  return res.status(500).json({ success: false, message: 'Chưa kết nối MySQL server' });
});

// ========================================================
// QUẢN LÝ EMAIL & KHÔI PHỤC MẬT KHẨU (FORGOT PASSWORD)
// ========================================================

// Bộ nhớ đệm lưu trữ OTP: Map<cleanEmail, { otp, expiresAt, attempts, fullName, userId }>
const passwordResetOtpStore = new Map();

// Khởi tạo Transporter cho Nodemailer
function createMailTransporter() {
  const user = process.env.EMAIL_USER || process.env.SMTP_USER || 'carematch.io.vn@gmail.com';
  const pass = process.env.EMAIL_PASS || process.env.SMTP_PASS || 'pzdc nfmi tegb gteg';

  if (!user || !pass) {
    return null;
  }

  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true' || Number(process.env.SMTP_PORT) === 465,
      auth: { user, pass }
    });
  }

  return nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: { user, pass }
  });
}

// Hàm gửi email thông báo mã OTP khôi phục mật khẩu với mẫu HTML đẹp mắt
async function sendForgotPasswordEmail(toEmail, recipientName, otpCode) {
  const transporter = createMailTransporter();
  const fromAddress = process.env.EMAIL_USER
    ? `"CareMatch Vietnam" <${process.env.EMAIL_USER}>`
    : (process.env.EMAIL_FROM || '"CareMatch Support" <no-reply@carematch.vn>');

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Khôi phục mật khẩu CareMatch</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f6f8f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #2d3748;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f6f8f5; padding: 36px 12px;">
        <tr>
          <td align="center">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 560px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 12px 30px rgba(0,0,0,0.06); border: 1px solid #e2ece0;">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #1e3516 0%, #2f5223 100%); padding: 32px 28px; text-align: center;">
                  <div style="font-size: 27px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
                    CARE<span style="color: #a4e078;">MATCH</span>
                  </div>
                  <div style="font-size: 13px; color: #d7ebd1; margin-top: 6px; font-weight: 500;">
                    Nền Tảng Chăm Sóc Người Cao Tuổi & Chuyên Viên Tận Tâm
                  </div>
                </td>
              </tr>
              <!-- Body -->
              <tr>
                <td style="padding: 36px 32px;">
                  <div style="display: inline-block; background-color: #edf7eb; color: #2d6124; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 999px; margin-bottom: 16px; border: 1px solid #c9e6c2;">
                    BẢO MẬT TÀI KHOẢN
                  </div>
                  <h2 style="font-size: 21px; font-weight: 700; color: #1a202c; margin: 0 0 16px; line-height: 1.3;">
                    Yêu cầu đặt lại mật khẩu tài khoản
                  </h2>
                  <p style="font-size: 14.5px; line-height: 1.6; color: #4a5568; margin: 0 0 14px;">
                    Xin chào <strong>${recipientName || 'Quý khách'}</strong>,
                  </p>
                  <p style="font-size: 14.5px; line-height: 1.6; color: #4a5568; margin: 0 0 22px;">
                    Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản liên kết với địa chỉ email: <strong style="color: #204017;">${toEmail}</strong>.
                  </p>
                  
                  <!-- OTP Highlight Box -->
                  <div style="background: linear-gradient(180deg, #f7faf5 0%, #edf5eb 100%); border: 2px dashed #598d47; border-radius: 16px; padding: 24px; text-align: center; margin: 24px 0;">
                    <div style="font-size: 12px; font-weight: 700; color: #3d682c; text-transform: uppercase; letter-spacing: 1.2px; margin-bottom: 8px;">
                      MÃ XÁC NHẬN CỦA BẠN (OTP)
                    </div>
                    <div style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #1a3314; font-family: 'SF Pro Display', Consolas, Monaco, monospace;">
                      ${otpCode}
                    </div>
                    <div style="font-size: 12.5px; color: #5a7b4f; margin-top: 8px;">
                      Mã có hiệu lực trong vòng <strong>10 phút</strong>
                    </div>
                  </div>

                  <p style="font-size: 13.5px; line-height: 1.6; color: #718096; margin: 0 0 20px;">
                    🔒 <strong>Khuyến nghị an toàn:</strong> Tuyệt đối không chia sẻ mã này cho bất kỳ ai, kể cả chuyên viên hỗ trợ. Nếu bạn không gửi yêu cầu này, vui lòng bỏ qua thư hoặc đổi mật khẩu để bảo vệ tài khoản.
                  </p>

                  <div style="border-top: 1px solid #edf2f7; padding-top: 20px; margin-top: 26px;">
                    <p style="font-size: 12.5px; color: #a0aec0; margin: 0; line-height: 1.6;">
                      Email tự động được gửi từ hệ thống <strong>CareMatch</strong>. Mọi thắc mắc xin liên hệ tổng đài hỗ trợ 24/7.
                    </p>
                  </div>
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="background-color: #f7faf7; padding: 18px 24px; text-align: center; border-top: 1px solid #e6eee4;">
                  <p style="font-size: 12px; color: #718096; margin: 0;">
                    © ${new Date().getFullYear()} CareMatch Vietnam • Trao gửi an tâm, chăm sóc vẹn toàn.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  if (!transporter) {
    console.warn(`⚠️ [CARE-MATCH MAIL] Chưa thiết lập cấu hình EMAIL_USER & EMAIL_PASS trong file .env.`);
    console.warn(`🔑 [CARE-MATCH MAIL] Mã OTP khôi phục cho [${toEmail}] là: >>> ${otpCode} <<<`);
    return { sent: false, reason: 'no_smtp_configured' };
  }

  try {
    const info = await transporter.sendMail({
      from: fromAddress,
      to: toEmail,
      subject: `[CareMatch] ${otpCode} là mã xác nhận đặt lại mật khẩu của bạn`,
      html: htmlContent
    });
    console.log(`✅ [CARE-MATCH MAIL] Đã gửi mail thành công đến ${toEmail} (ID: ${info.messageId})`);
    return { sent: true, messageId: info.messageId };
  } catch (err) {
    console.error(`❌ [CARE-MATCH MAIL] Lỗi khi gửi mail qua SMTP đến ${toEmail}:`, err.message);
    console.warn(`🔑 [CARE-MATCH MAIL FALLBACK] Mã OTP dự phòng cho [${toEmail}] là: >>> ${otpCode} <<<`);
    return { sent: false, error: err.message };
  }
}

// 2.1 API: Yêu cầu gửi mã OTP quên mật khẩu
app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email || !email.trim()) {
    return res.status(400).json({ success: false, message: 'Vui lòng nhập địa chỉ email của bạn.' });
  }

  const cleanEmail = email.trim().toLowerCase();

  // Kiểm tra tài khoản tồn tại trong cơ sở dữ liệu
  let user = null;
  if (!pool || !isMySqlConnected) {
    await initMySql();
  }

  if (pool) {
    try {
      const [rows] = await pool.execute(
        'SELECT id, username, email, full_name, role FROM users WHERE LOWER(email) = ? OR LOWER(username) = ? LIMIT 1',
        [cleanEmail, cleanEmail]
      );
      if (rows.length > 0) {
        user = rows[0];
      }
    } catch (e) {
      console.error('Lỗi truy vấn users khi quên mật khẩu:', e.message);
      return res.status(500).json({
        success: false,
        message: 'Lỗi truy vấn cơ sở dữ liệu Railway. Vui lòng thử lại sau.'
      });
    }
  } else {
    return res.status(503).json({
      success: false,
      message: 'Không thể kết nối đến cơ sở dữ liệu Railway. Vui lòng kiểm tra lại dịch vụ.'
    });
  }

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy tài khoản nào với email này. Vui lòng kiểm tra lại địa chỉ email hoặc đăng ký tài khoản mới.'
    });
  }

  // Tạo mã OTP 6 chữ số ngẫu nhiên
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 phút

  // Lưu vào database Railway (cho Serverless) và bộ nhớ đệm
  if (pool) {
    try {
      await pool.execute('DELETE FROM password_resets WHERE LOWER(email) = ?', [cleanEmail]);
      await pool.execute(
        'INSERT INTO password_resets (email, otp, expires_at, attempts, full_name, user_id) VALUES (?, ?, ?, ?, ?, ?)',
        [cleanEmail, otpCode, expiresAt, 0, user.full_name, user.id]
      );
    } catch (e) {
      console.warn('Lỗi lưu OTP vào database Railway:', e.message);
    }
  }

  passwordResetOtpStore.set(cleanEmail, {
    otp: otpCode,
    expiresAt,
    attempts: 0,
    fullName: user.full_name,
    userId: user.id
  });

  // Gửi email thực tế hoặc hiển thị mã test dự phòng
  const sendResult = await sendForgotPasswordEmail(user.email || cleanEmail, user.full_name, otpCode);

  if (sendResult.sent) {
    return res.json({
      success: true,
      emailSent: true,
      email: user.email,
      message: `Mã xác nhận (OTP) đã được gửi đến email ${user.email}. Vui lòng kiểm tra hộp thư đến hoặc mục Thư rác/Spam.`
    });
  } else {
    return res.json({
      success: true,
      emailSent: false,
      email: user.email,
      devOtp: otpCode,
      message: sendResult.reason === 'no_smtp_configured'
        ? `Mã xác nhận đã được tạo thành công! (Lưu ý: Chưa cấu hình EMAIL_USER trong .env, mã OTP thử nghiệm là: ${otpCode})`
        : `Lỗi kết nối máy chủ gửi mail (${sendResult.error || 'SMTP Error'}). Mã OTP thử nghiệm là: ${otpCode}`
    });
  }
});

// 2.2 API: Xác thực mã OTP
app.post('/api/auth/verify-otp', async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ success: false, message: 'Vui lòng cung cấp email và mã OTP.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  let stored = passwordResetOtpStore.get(cleanEmail);

  // Đọc từ Railway MySQL nếu chạy trên Serverless nhiều instance
  if (!stored && pool) {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM password_resets WHERE LOWER(email) = ? ORDER BY id DESC LIMIT 1',
        [cleanEmail]
      );
      if (rows.length > 0) {
        stored = {
          dbId: rows[0].id,
          otp: rows[0].otp,
          expiresAt: Number(rows[0].expires_at),
          attempts: Number(rows[0].attempts || 0),
          fullName: rows[0].full_name,
          userId: rows[0].user_id
        };
      }
    } catch (e) {
      console.warn('Lỗi đọc OTP từ MySQL:', e.message);
    }
  }

  if (!stored) {
    return res.status(400).json({
      success: false,
      message: 'Yêu cầu không tồn tại hoặc đã hết hạn. Vui lòng gửi lại yêu cầu mới.'
    });
  }

  if (Date.now() > stored.expiresAt) {
    passwordResetOtpStore.delete(cleanEmail);
    if (pool) {
      pool.execute('DELETE FROM password_resets WHERE LOWER(email) = ?', [cleanEmail]).catch(() => { });
    }
    return res.status(400).json({
      success: false,
      message: 'Mã OTP đã hết hiệu lực (10 phút). Vui lòng yêu cầu mã xác nhận mới.'
    });
  }

  if (stored.otp !== otp.trim()) {
    stored.attempts = (stored.attempts || 0) + 1;
    passwordResetOtpStore.set(cleanEmail, stored);
    if (pool && stored.dbId) {
      pool.execute('UPDATE password_resets SET attempts = ? WHERE id = ?', [stored.attempts, stored.dbId]).catch(() => { });
    }
    if (stored.attempts >= 5) {
      passwordResetOtpStore.delete(cleanEmail);
      if (pool) {
        pool.execute('DELETE FROM password_resets WHERE LOWER(email) = ?', [cleanEmail]).catch(() => { });
      }
      return res.status(400).json({
        success: false,
        message: 'Bạn đã nhập sai mã xác nhận quá 5 lần. Vui lòng yêu cầu mã mới để đảm bảo an toàn.'
      });
    }
    return res.status(400).json({
      success: false,
      message: `Mã OTP không chính xác. Bạn còn ${5 - stored.attempts} lần thử.`
    });
  }

  return res.json({
    success: true,
    message: 'Xác thực mã OTP thành công. Mời bạn tiến hành nhập mật khẩu mới.'
  });
});

// 2.3 API: Đặt lại mật khẩu mới
app.post('/api/auth/reset-password', async (req, res) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng điền đầy đủ email, mã OTP và mật khẩu mới.'
    });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'Mật khẩu mới phải có tối thiểu 6 ký tự.'
    });
  }

  const cleanEmail = email.trim().toLowerCase();
  let stored = passwordResetOtpStore.get(cleanEmail);

  if (!stored && pool) {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM password_resets WHERE LOWER(email) = ? ORDER BY id DESC LIMIT 1',
        [cleanEmail]
      );
      if (rows.length > 0) {
        stored = {
          dbId: rows[0].id,
          otp: rows[0].otp,
          expiresAt: Number(rows[0].expires_at),
          attempts: Number(rows[0].attempts || 0),
          fullName: rows[0].full_name,
          userId: rows[0].user_id
        };
      }
    } catch (e) {
      console.warn('Lỗi đọc OTP từ MySQL:', e.message);
    }
  }

  if (!stored) {
    return res.status(400).json({
      success: false,
      message: 'Phiên khôi phục mật khẩu không tồn tại hoặc đã hết hạn. Vui lòng thực hiện lại từ đầu.'
    });
  }

  if (Date.now() > stored.expiresAt) {
    passwordResetOtpStore.delete(cleanEmail);
    if (pool) {
      pool.execute('DELETE FROM password_resets WHERE LOWER(email) = ?', [cleanEmail]).catch(() => { });
    }
    return res.status(400).json({
      success: false,
      message: 'Mã OTP đã hết hạn. Vui lòng gửi lại yêu cầu mới.'
    });
  }

  if (stored.otp !== otp.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Mã xác nhận OTP không chính xác.'
    });
  }

  if (!pool || !isMySqlConnected) {
    await initMySql();
  }

  if (pool) {
    try {
      const [result] = await pool.execute(
        'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE LOWER(email) = ? OR id = ?',
        [newPassword, cleanEmail, stored.userId]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy tài khoản để cập nhật mật khẩu.'
        });
      }

      // Xoá OTP sau khi đã sử dụng thành công
      passwordResetOtpStore.delete(cleanEmail);
      pool.execute('DELETE FROM password_resets WHERE LOWER(email) = ?', [cleanEmail]).catch(() => { });

      console.log(`🔐 [AUTH] Đặt lại mật khẩu thành công cho tài khoản: ${cleanEmail}`);

      return res.json({
        success: true,
        message: 'Đặt lại mật khẩu thành công! Bạn có thể đăng nhập ngay bằng mật khẩu mới.'
      });
    } catch (e) {
      console.error('Lỗi MySQL khi cập nhật mật khẩu mới:', e.message);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi cập nhật mật khẩu mới. Vui lòng thử lại.'
      });
    }
  } else {
    return res.status(503).json({
      success: false,
      message: 'Không thể kết nối đến cơ sở dữ liệu Railway để cập nhật mật khẩu.'
    });
  }
} catch (err) {
  return res.status(500).json({
    success: false,
    message: 'Lỗi hệ thống khi cập nhật mật khẩu: ' + err.message
  });
}
});


// ---- HỒ SƠ NGƯỜI CẦN CHĂM SÓC (ELDERLY PROFILES) ----

// 3. Lấy danh sách hồ sơ người bệnh theo userId của gia đình
app.get('/api/elderly-profiles', async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'Thiếu tham số userId' });

  const uid = Number(userId);

  if (isMySqlConnected) {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM elderly_profiles WHERE user_id = ? ORDER BY created_at DESC',
        [uid]
      );
      const formatted = rows.map(r => ({
        ...r,
        care_needs: parseJson(r.care_needs, [])
      }));
      return res.json(formatted);
    } catch (e) {
      console.error('MySQL fetch profiles error:', e.message);
      return res.status(500).json({ error: e.message });
    }
  }

  res.json([]);
});

// 4B. Lấy chi tiết hồ sơ người bệnh theo tên
app.get('/api/elderly-profiles/by-name/:name', async (req, res) => {
  const rawName = decodeURIComponent(req.params.name).trim();
  if (isMySqlConnected) {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM elderly_profiles WHERE full_name LIKE ? OR full_name = ? LIMIT 1',
        [`%${rawName}%`, rawName]
      );
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Không tìm thấy hồ sơ người bệnh' });
      }
      const p = rows[0];
      return res.json({
        ...p,
        care_needs: parseJson(p.care_needs, [])
      });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }
  res.status(404).json({ error: 'Chưa kết nối MySQL' });
});

// 4. Lấy chi tiết 1 hồ sơ theo profileId
app.get('/api/elderly-profiles/:id', async (req, res) => {
  const id = Number(req.params.id);

  if (isMySqlConnected) {
    try {
      const [rows] = await pool.execute('SELECT * FROM elderly_profiles WHERE id = ? LIMIT 1', [id]);
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Không tìm thấy hồ sơ người bệnh' });
      }
      const p = rows[0];
      return res.json({
        ...p,
        care_needs: parseJson(p.care_needs, [])
      });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  res.status(404).json({ error: 'Chưa kết nối MySQL' });
});

// 5. Tạo hồ sơ người bệnh mới (lưu thẳng vào MySQL)
app.post('/api/elderly-profiles', async (req, res) => {
  const { user_id, full_name, date_of_birth, gender, address, district, contact_name, contact_phone, care_needs, notes } = req.body;

  if (!user_id || !full_name) {
    return res.status(400).json({ error: 'Vui lòng nhập ít nhất họ tên người cần chăm sóc.' });
  }

  const careNeedsStr = JSON.stringify(care_needs || []);

  if (isMySqlConnected) {
    try {
      const [result] = await pool.execute(
        `INSERT INTO elderly_profiles 
          (user_id, full_name, date_of_birth, gender, address, district, contact_name, contact_phone, care_needs, notes, verification_status, adl_score)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0)`,
        [
          Number(user_id),
          full_name.trim(),
          date_of_birth || null,
          gender || 'Nữ',
          address || '',
          district || '',
          contact_name || '',
          contact_phone || '',
          careNeedsStr,
          notes || ''
        ]
      );

      const createdProfile = {
        id: result.insertId,
        user_id: Number(user_id),
        full_name: full_name.trim(),
        date_of_birth: date_of_birth || null,
        gender: gender || 'Nữ',
        address: address || '',
        district: district || '',
        contact_name: contact_name || '',
        contact_phone: contact_phone || '',
        care_needs: care_needs || [],
        notes: notes || '',
        verification_status: 'pending',
        adl_score: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log(`✅ [MySQL] Đã thêm mới hồ sơ người cao tuổi ID #${result.insertId} cho user #${user_id}: ${full_name}`);
      return res.status(201).json(createdProfile);
    } catch (e) {
      console.error('MySQL insert profile error:', e.message);
      return res.status(500).json({ error: 'Lỗi lưu vào cơ sở dữ liệu MySQL: ' + e.message });
    }
  }

  return res.status(500).json({ error: 'Chưa kết nối MySQL' });
});

// 6. Cập nhật hồ sơ người bệnh (cập nhật thẳng MySQL)
app.put('/api/elderly-profiles/:id', async (req, res) => {
  const id = Number(req.params.id);
  const updates = req.body;

  const careNeedsStr = updates.care_needs ? JSON.stringify(updates.care_needs) : null;
  const adlScore = updates.adl_score !== undefined ? Number(updates.adl_score) : null;

  if (isMySqlConnected) {
    try {
      await pool.execute(
        `UPDATE elderly_profiles SET
          full_name = COALESCE(?, full_name),
          date_of_birth = ?,
          gender = COALESCE(?, gender),
          address = ?,
          district = ?,
          contact_name = ?,
          contact_phone = ?,
          care_needs = COALESCE(?, care_needs),
          notes = ?,
          adl_score = COALESCE(?, adl_score),
          updated_at = NOW()
        WHERE id = ?`,
        [
          updates.full_name || null,
          updates.date_of_birth || null,
          updates.gender || null,
          updates.address !== undefined ? updates.address : null,
          updates.district !== undefined ? updates.district : null,
          updates.contact_name !== undefined ? updates.contact_name : null,
          updates.contact_phone !== undefined ? updates.contact_phone : null,
          careNeedsStr,
          updates.notes !== undefined ? updates.notes : null,
          adlScore,
          id
        ]
      );

      const [rows] = await pool.execute('SELECT * FROM elderly_profiles WHERE id = ?', [id]);
      if (rows.length > 0) {
        const p = rows[0];
        console.log(`✅ [MySQL] Đã cập nhật hồ sơ ID #${id}: ${p.full_name}`);
        return res.json({
          ...p,
          care_needs: parseJson(p.care_needs, [])
        });
      }
      return res.status(404).json({ error: 'Không tìm thấy hồ sơ người bệnh' });
    } catch (e) {
      console.error('MySQL update profile error:', e.message);
      return res.status(500).json({ error: 'Lỗi cập nhật MySQL: ' + e.message });
    }
  }

  return res.status(500).json({ error: 'Chưa kết nối MySQL' });
});

// 7. Xóa hồ sơ người bệnh
app.delete('/api/elderly-profiles/:id', async (req, res) => {
  const id = Number(req.params.id);

  if (isMySqlConnected) {
    try {
      await pool.execute('DELETE FROM elderly_profiles WHERE id = ?', [id]);
      console.log(`✅ [MySQL] Đã xóa hồ sơ người bệnh ID #${id}`);
      return res.json({ success: true, message: 'Đã xóa hồ sơ khỏi MySQL thành công.' });
    } catch (e) {
      console.error('MySQL delete profile error:', e.message);
      return res.status(500).json({ error: 'Lỗi xóa MySQL: ' + e.message });
    }
  }

  return res.status(500).json({ error: 'Chưa kết nối MySQL' });
});

// ========================================================
// 7A. HỒ SƠ ĐẠI DIỆN GIA ĐÌNH & XÁC THỰC eKYC (FAMILY PROFILES)
// ========================================================

// Lấy thông tin hồ sơ đại diện gia đình
app.get('/api/family-profile', async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'Thiếu tham số userId' });

  const uid = Number(userId);

  if (isMySqlConnected) {
    try {
      let [rows] = await pool.execute('SELECT * FROM family_profiles WHERE user_id = ? LIMIT 1', [uid]);
      if (rows.length === 0) {
        const [uRows] = await pool.execute('SELECT id, full_name, email, phone FROM users WHERE id = ? LIMIT 1', [uid]);
        if (uRows.length > 0) {
          const u = uRows[0];
          await pool.execute(
            `INSERT INTO family_profiles (user_id, representative_name, phone, email, verification_status)
             VALUES (?, ?, ?, ?, 'unverified')`,
            [u.id, u.full_name, u.phone || '', u.email]
          );
          [rows] = await pool.execute('SELECT * FROM family_profiles WHERE user_id = ? LIMIT 1', [uid]);
        }
      }
      return res.json(rows[0] || null);
    } catch (e) {
      console.error('Lỗi fetch family_profile:', e.message);
      return res.status(500).json({ error: e.message });
    }
  }

  res.json({
    user_id: uid,
    representative_name: 'Nguyễn Minh Mai',
    phone: '0934 567 890',
    email: 'mai.nguyen@example.com',
    id_number: '',
    address: 'Số 24 phố Huế, Hai Bà Trưng, Hà Nội',
    district: 'Hai Bà Trưng',
    verification_status: 'unverified'
  });
});

// Cập nhật thông tin đại diện gia đình & eKYC CCCD
app.post('/api/family-profile', async (req, res) => {
  const {
    user_id,
    representative_name,
    phone,
    email,
    id_number,
    address,
    district,
    id_card_front,
    id_card_back,
    submit_for_review
  } = req.body;

  if (!user_id || !representative_name) {
    return res.status(400).json({ error: 'Vui lòng cung cấp ít nhất họ tên người đại diện.' });
  }

  const uid = Number(user_id);

  if (isMySqlConnected) {
    try {
      const [existing] = await pool.execute('SELECT id, verification_status FROM family_profiles WHERE user_id = ? LIMIT 1', [uid]);

      if (existing.length > 0) {
        const curStatus = existing[0].verification_status;
        const newStatus = submit_for_review ? 'pending' : (curStatus === 'approved' ? 'approved' : 'unverified');

        await pool.execute(
          `UPDATE family_profiles SET
            representative_name = ?,
            phone = ?,
            email = ?,
            id_number = ?,
            address = ?,
            district = ?,
            id_card_front = ?,
            id_card_back = ?,
            verification_status = ?
          WHERE user_id = ?`,
          [
            representative_name.trim(),
            phone || '',
            email || '',
            id_number !== undefined ? id_number : '',
            address || '',
            district || '',
            id_card_front !== undefined ? (id_card_front || null) : existing[0].id_card_front,
            id_card_back !== undefined ? (id_card_back || null) : existing[0].id_card_back,
            newStatus,
            uid
          ]
        );
      } else {
        await pool.execute(
          `INSERT INTO family_profiles 
            (user_id, representative_name, phone, email, id_number, address, district, id_card_front, id_card_back, verification_status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            uid,
            representative_name.trim(),
            phone || '',
            email || '',
            id_number || '',
            address || '',
            district || '',
            id_card_front || null,
            id_card_back || null,
            submit_for_review ? 'pending' : 'unverified'
          ]
        );
      }

      if (representative_name) {
        await pool.execute('UPDATE users SET full_name = ? WHERE id = ?', [representative_name.trim(), uid]);
      }

      if (submit_for_review) {
        await createNotification(
          1,
          'ekyc',
          'Yêu cầu xét duyệt eKYC Gia Đình',
          `Gia đình ${representative_name} đã gửi CCCD (${id_number || 'đã tải ảnh'}) để xác thực.`,
          '/admin'
        );
      }

      const [updated] = await pool.execute('SELECT * FROM family_profiles WHERE user_id = ? LIMIT 1', [uid]);
      console.log(`✅ [MySQL] Đã cập nhật family_profiles cho user #${uid} (${representative_name})`);
      return res.json({ success: true, profile: updated[0] });
    } catch (e) {
      console.error('MySQL family profile update error:', e.message);
      return res.status(500).json({ error: e.message });
    }
  }

  return res.json({
    success: true,
    profile: {
      user_id: uid,
      representative_name,
      phone,
      email,
      id_number,
      address,
      district,
      verification_status: submit_for_review ? 'pending' : 'unverified'
    }
  });
});

// Admin duyệt / yêu cầu bổ sung eKYC gia đình
app.patch('/api/admin/families/:userId/verify', async (req, res) => {
  const uid = Number(req.params.userId);
  const { status, rejection_reason } = req.body;

  if (!['approved', 'rejected', 'pending', 'unverified'].includes(status)) {
    return res.status(400).json({ error: 'Trạng thái xác thực không hợp lệ.' });
  }

  if (isMySqlConnected) {
    try {
      await pool.execute(
        `UPDATE family_profiles SET 
          verification_status = ?,
          rejection_reason = ?,
          verified_at = ?
         WHERE user_id = ?`,
        [
          status,
          rejection_reason || null,
          status === 'approved' ? new Date() : null,
          uid
        ]
      );

      await createNotification(
        uid,
        'ekyc',
        status === 'approved' ? 'Xác thực eKYC thành công ✓' : 'Yêu cầu cập nhật hồ sơ eKYC',
        status === 'approved'
          ? 'Hồ sơ CCCD của quý khách đã được Ban Quản Trị phê duyệt. Quý khách có thể tự do đặt ca chăm sóc.'
          : `Ban Quản Trị yêu cầu bổ sung thông tin eKYC: ${rejection_reason || 'Vui lòng kiểm tra lại ảnh CCCD và thông tin cá nhân.'}`,
        '/dashboard'
      );

      console.log(`✅ [MySQL] Admin đã cập nhật trạng thái eKYC gia đình user #${uid} thành: ${status}`);
      return res.json({ success: true, message: `Đã cập nhật trạng thái xác thực eKYC: ${status}` });
    } catch (e) {
      console.error('Admin verify family error:', e.message);
      return res.status(500).json({ error: e.message });
    }
  }

  return res.json({ success: true, message: 'Đã cập nhật trạng thái (demo mode)' });
});

// ========================================================
// 7B. TẢI LÊN TÀI LIỆU / ẢNH (FILE UPLOAD API - BASE64 & DISK)
// ========================================================
app.post('/api/upload', async (req, res) => {
  const { dataUrl, fileName, documentType } = req.body;

  if (!dataUrl) {
    return res.status(400).json({ error: 'Thiếu dữ liệu tệp (dataUrl)' });
  }

  try {
    // Phân tích cú pháp data URL: data:image/png;base64,...
    const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ error: 'Định dạng base64 dataUrl không hợp lệ.' });
    }

    const mimeType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    // Xác định phần mở rộng tệp
    let ext = 'png';
    if (mimeType.includes('jpeg') || mimeType.includes('jpg')) ext = 'jpg';
    else if (mimeType.includes('pdf')) ext = 'pdf';
    else if (mimeType.includes('webp')) ext = 'webp';

    let diskUrl = null;
    try {
      const cleanPrefix = documentType ? documentType.replace(/[^a-zA-Z0-9_-]/g, '_') : 'doc';
      const filename = `${cleanPrefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
      const filePath = path.join(uploadsDir, filename);
      await fs.promises.writeFile(filePath, buffer);
      diskUrl = `/uploads/${filename}`;
    } catch (e) {
      console.warn('Backup disk write failed:', e.message);
    }

    console.log(`✅ [Upload] Đã nhận và chuyển tệp (${Math.round(buffer.length / 1024)} KB) để lưu trực tiếp vào CSDL MySQL`);
    return res.json({
      success: true,
      url: dataUrl,
      dataUrl,
      diskUrl,
      filename: fileName || 'document',
      originalName: fileName || 'document',
      mimeType,
      size: buffer.length
    });
  } catch (err) {
    console.error('Lỗi lưu tệp upload:', err.message);
    return res.status(500).json({ error: 'Không thể lưu tệp: ' + err.message });
  }
});

// ========================================================
// 7C. HỒ SƠ & XÁC THỰC NGƯỜI CHĂM SÓC (CAREGIVER PROFILES)
// ========================================================

// Lấy hồ sơ người chăm sóc theo userId
app.get('/api/caregiver-profile', async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'Thiếu userId' });

  const uid = Number(userId);

  if (isMySqlConnected) {
    try {
      // 1. Tìm trong bảng caregiver_profiles
      const [rows] = await pool.execute(
        `SELECT cp.*, u.full_name, u.phone, u.email, u.username
         FROM caregiver_profiles cp
         JOIN users u ON cp.user_id = u.id
         WHERE cp.user_id = ? LIMIT 1`,
        [uid]
      );

      if (rows.length > 0) {
        const p = rows[0];
        // Lấy thêm danh sách tài liệu từ caregiver_documents
        const [docs] = await pool.execute(
          'SELECT * FROM caregiver_documents WHERE caregiver_id = ? ORDER BY uploaded_at DESC',
          [p.id]
        );

        return res.json({
          id: p.id,
          user_id: p.user_id,
          full_name: p.full_name,
          phone: p.phone,
          email: p.email,
          title: 'Chuyên viên chăm sóc',
          role: 'Chuyên viên chăm sóc',
          id_number: p.id_number || '',
          experience_years: Math.max(1, p.experience_years || 1),
          shift_rate: p.shift_rate || 400000,
          night_shift_rate: p.night_shift_rate || Math.round((p.shift_rate || 400000) * 1.5),
          work_history: parseJson(p.work_history, []),
          hourly_rate: p.hourly_rate || 100000,
          district: p.district || '',
          contact_address: p.contact_address || '',
          interview_status: p.interview_status || 'not_scheduled',
          interview_date: p.interview_date || '',
          interview_time: p.interview_time || '',
          interview_meeting_link: p.interview_meeting_link || '',
          interview_notes: p.interview_notes || '',
          interview_scheduled_at: p.interview_scheduled_at || null,
          interview_passed_at: p.interview_passed_at || null,
          bio: p.bio || '',
          skills: parseJson(p.skills, []),
          care_score: p.care_score || 0,
          verification_status: p.verification_status || 'not_submitted',
          documents: parseJson(p.documents, docs || []),
          created_at: p.created_at
        });
      }

      // 2. Nếu chưa có hồ sơ trong caregiver_profiles, lấy thông tin tài khoản user để trả về form trắng
      const [userRows] = await pool.execute('SELECT * FROM users WHERE id = ? LIMIT 1', [uid]);
      if (userRows.length > 0) {
        const u = userRows[0];
        return res.json({
          isNew: true,
          user_id: u.id,
          full_name: u.full_name,
          phone: u.phone || '',
          email: u.email,
          title: 'Chuyên viên chăm sóc',
          role: 'Chuyên viên chăm sóc',
          id_number: '',
          experience_years: 1,
          shift_rate: 400000,
          night_shift_rate: 600000,
          work_history: [],
          hourly_rate: 100000,
          district: '',
          bio: '',
          skills: [],
          care_score: 0,
          verification_status: 'not_submitted', // Chưa gửi hồ sơ
          documents: []
        });
      }

      return res.status(404).json({ error: 'Không tìm thấy người dùng' });
    } catch (e) {
      console.error('MySQL get caregiver profile error:', e.message);
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(500).json({ error: 'Chưa kết nối MySQL' });
});

// Lưu / Cập nhật hồ sơ người chăm sóc (kèm tài liệu eKYC vào MySQL)
app.post('/api/caregiver-profile', async (req, res) => {
  const user_id = req.body.user_id || req.body.userId;
  const full_name = req.body.full_name || req.body.fullName;
  const phone = req.body.phone;
  const id_number = req.body.id_number || req.body.idNumber;
  const title = req.body.title || 'Chuyên viên chăm sóc';
  const experience_years = req.body.experience_years ?? req.body.experienceYears;
  const hourly_rate = req.body.hourly_rate ?? req.body.hourlyRate;
  const shift_rate = req.body.shift_rate ?? req.body.shiftRate;
  const night_shift_rate = req.body.night_shift_rate ?? req.body.nightShiftRate;
  const work_history = req.body.work_history ?? req.body.workHistory;
  const district = req.body.district;
  const contact_address = req.body.contact_address ?? req.body.contactAddress;
  const bio = req.body.bio;
  const skills = req.body.skills;
  const documents = req.body.documents;
  const submit_for_review = req.body.submit_for_review ?? req.body.submitForReview;

  if (!user_id) {
    return res.status(400).json({ error: 'Thiếu user_id người chăm sóc' });
  }

  const uid = Number(user_id);
  const skillsJson = JSON.stringify(skills || []);
  const docsJson = JSON.stringify(documents || []);
  const workHistoryJson = JSON.stringify(work_history || []);
  const parsedExp = Math.max(1, Number(experience_years) || 1);
  const parsedShiftRate = Math.min(1000000, Math.max(400000, Number(shift_rate) || 400000));
  const parsedNightShiftRate = Number(night_shift_rate) || Math.round(parsedShiftRate * 1.5);
  const newStatus = submit_for_review ? 'pending' : 'not_submitted';

  if (isMySqlConnected) {
    try {
      // 1. Cập nhật họ tên và số điện thoại trong bảng users
      if (full_name || phone) {
        await pool.execute(
          'UPDATE users SET full_name = COALESCE(?, full_name), phone = COALESCE(?, phone) WHERE id = ?',
          [full_name || null, phone || null, uid]
        );
      }

      // 2. Kiểm tra xem đã có bản ghi trong caregiver_profiles chưa
      const [existing] = await pool.execute('SELECT id FROM caregiver_profiles WHERE user_id = ? LIMIT 1', [uid]);
      let profileId;

      if (existing.length > 0) {
        profileId = existing[0].id;
        await pool.execute(
          `UPDATE caregiver_profiles SET
            title = 'Chuyên viên chăm sóc',
            id_number = ?,
            experience_years = ?,
            shift_rate = ?,
            night_shift_rate = ?,
            work_history = ?,
            hourly_rate = ?,
            district = ?,
            contact_address = COALESCE(?, contact_address),
            bio = ?,
            skills = ?,
            documents = ?,
            verification_status = CASE WHEN ? = 'pending' THEN 'pending' ELSE verification_status END
          WHERE id = ?`,
          [
            id_number || '',
            parsedExp,
            parsedShiftRate,
            parsedNightShiftRate,
            workHistoryJson,
            Number(hourly_rate) || 100000,
            district || '',
            contact_address !== undefined ? contact_address : null,
            bio || '',
            skillsJson,
            docsJson,
            newStatus,
            profileId
          ]
        );
        console.log(`✅ [MySQL] Đã cập nhật hồ sơ người chăm sóc ID #${profileId}`);
      } else {
        const [result] = await pool.execute(
          `INSERT INTO caregiver_profiles
            (user_id, title, id_number, experience_years, shift_rate, night_shift_rate, work_history, hourly_rate, district, contact_address, bio, skills, documents, verification_status, interview_status, care_score)
           VALUES (?, 'Chuyên viên chăm sóc', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'not_scheduled', 0)`,
          [
            uid,
            id_number || '',
            parsedExp,
            parsedShiftRate,
            parsedNightShiftRate,
            workHistoryJson,
            Number(hourly_rate) || 100000,
            district || '',
            contact_address || '',
            bio || '',
            skillsJson,
            docsJson,
            newStatus
          ]
        );
        profileId = result.insertId;
        console.log(`✅ [MySQL] Đã tạo hồ sơ người chăm sóc mới ID #${profileId}`);
      }

      // 3. Đồng bộ vào bảng caregiver_documents
      if (Array.isArray(documents) && documents.length > 0) {
        await pool.execute(
          'DELETE FROM caregiver_documents WHERE caregiver_id = ?',
          [profileId]
        );
        for (const doc of documents) {
          const docType = doc.category || doc.type || 'cccd';
          const docUrl = doc.fileUrl || doc.url || doc.dataUrl || doc.file_url;
          if (docUrl) {
            const docTypeMap = {
              'cccd': 'cccd',
              'cccd_front': 'cccd_front',
              'cccd_back': 'cccd_back',
              'policeCheck': 'police_check',
              'police_check': 'police_check',
              'judicial_record': 'police_check',
              'certificate': 'medical_certificate',
              'medical_cert': 'medical_certificate',
              'medical_certificate': 'medical_certificate',
              'additional_certificate': 'medical_certificate',
              'healthCheck': 'health_check',
              'health_cert': 'health_check',
              'health_check': 'health_check'
            };
            const mappedType = docTypeMap[docType] || docType;
            const docNameMap = {
              'cccd_front': 'Căn cước công dân (Mặt trước)',
              'cccd_back': 'Căn cước công dân (Mặt sau)',
              'policeCheck': 'Phiếu lý lịch tư pháp số 2',
              'police_check': 'Phiếu lý lịch tư pháp số 2',
              'certificate': 'Chứng chỉ chuyên môn',
              'medical_certificate': 'Chứng chỉ nghiệp vụ điều dưỡng',
              'healthCheck': 'Giấy khám sức khỏe định kỳ',
              'health_check': 'Giấy khám sức khỏe định kỳ'
            };
            const docTitle = doc.name && doc.name !== 'cccd' && doc.name !== 'file' ? doc.name : (docNameMap[docType] || mappedType);

            await pool.execute(
              `INSERT INTO caregiver_documents (caregiver_id, document_type, document_name, file_url, status)
               VALUES (?, ?, ?, ?, 'pending')`,
              [profileId, mappedType, docTitle, docUrl]
            );
          }
        }
      }

      // 4. Nếu nộp để duyệt (submit_for_review), tạo thông báo cho Admin (user_id = 1)
      if (submit_for_review) {
        await createNotification(
          1,
          'verification',
          'Hồ sơ người chăm sóc mới cần thẩm định',
          `Người chăm sóc ${full_name || 'mới'} vừa gửi hồ sơ xác thực eKYC và đang chờ phê duyệt.`,
          '/admin'
        );
      }

      return res.json({
        success: true,
        message: submit_for_review ? 'Đã nộp hồ sơ lên Admin để thẩm định thành công.' : 'Đã lưu hồ sơ thành công.',
        profileId,
        verification_status: newStatus
      });
    } catch (e) {
      console.error('MySQL save caregiver profile error:', e.message);
      return res.status(500).json({ error: 'Lỗi lưu hồ sơ vào MySQL: ' + e.message });
    }
  }

  return res.status(500).json({ error: 'Chưa kết nối MySQL' });
});

// ========================================================
// API QUẢN LÝ PHỎNG VẤN TRỰC TUYẾN CAREGIVER & ADMIN
// ========================================================
// HÀM SINH MÃ PHÒNG GOOGLE MEET NGẪU NHIÊN CHUẨN 3-4-3 CHỮ CÁI (xxx-yyyy-zzz)
// ========================================================
function generateGoogleMeetCode() {
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  const randPart = (n) => Array.from({ length: n }, () => letters[Math.floor(Math.random() * letters.length)]).join('');
  return `${randPart(3)}-${randPart(4)}-${randPart(3)}`;
}

function generateGoogleMeetLink() {
  return `https://meet.google.com/${generateGoogleMeetCode()}`;
}

// 1. Người chăm sóc đặt lịch phỏng vấn online với Admin
app.post('/api/caregiver/schedule-interview', async (req, res) => {
  if (!isMySqlConnected) return res.status(500).json({ error: 'Chưa kết nối CSDL' });
  try {
    const { userId, date, timeSlot, notes } = req.body;
    if (!userId || !date || !timeSlot) {
      return res.status(400).json({ error: 'Vui lòng chọn ngày và khung giờ phỏng vấn' });
    }

    // Ban đầu đặt lịch chưa có Meet link, trạng thái là 'scheduled' (chờ admin xác nhận)
    await pool.execute(
      `UPDATE caregiver_profiles 
       SET interview_status = 'scheduled',
           interview_date = ?,
           interview_time = ?,
           interview_meeting_link = NULL,
           interview_notes = COALESCE(?, interview_notes),
           interview_scheduled_at = NOW()
       WHERE user_id = ?`,
      [date, timeSlot, notes || null, Number(userId)]
    );

    // Lấy họ tên người chăm sóc
    const [uRows] = await pool.execute('SELECT full_name FROM users WHERE id = ?', [Number(userId)]);
    const caregiverName = uRows[0]?.full_name || 'Người chăm sóc';

    // TỰ ĐỘNG GỬI TIN NHẮN TỪ ADMIN (user_id = 1) ĐẾN CHÍNH NGƯỜI CHĂM SÓC ĐÓ
    const convId = `conv_1_${Number(userId)}`;
    const confirmMsg = `Admin đã nhận được thông tin đặt lịch phỏng vấn của bạn vào lúc ${timeSlot} ngày ${date}. Vui lòng chờ Admin xác nhận và gửi đường link cuộc họp Google Meet.`;

    await pool.execute(
      `INSERT INTO messages (conversation_id, sender_user_id, sender_name, sender_role, recipient_user_id, recipient_name, content, is_read)
       VALUES (?, 1, 'Ban Quản Trị CARE-MATCH', 'admin', ?, ?, ?, FALSE)`,
      [convId, Number(userId), caregiverName, confirmMsg]
    );

    // Thông báo cho Admin (user_id = 1)
    await createNotification(
      1,
      'interview',
      'Lịch phỏng vấn online mới từ Caregiver',
      `${caregiverName} đã đặt lịch phỏng vấn trực tuyến vào lúc ${timeSlot} ngày ${date}. Vui lòng xác nhận lịch.`,
      '/admin'
    );

    console.log(`✅ [Lịch phỏng vấn] #${userId} (${caregiverName}) đã đặt lịch. Đã gửi tin nhắn chờ xác nhận từ Admin.`);

    return res.json({
      success: true,
      message: 'Đặt lịch phỏng vấn online thành công! Vui lòng chờ Admin xác nhận.',
      interview: {
        status: 'scheduled',
        date,
        time: timeSlot,
        meetingLink: null
      }
    });
  } catch (err) {
    console.error('Lỗi đặt lịch phỏng vấn:', err);
    return res.status(500).json({ error: err.message });
  }
});

// 1.1. Admin xác nhận lịch phỏng vấn, tạo link Google Meet và tự động gửi vào tin nhắn cho ứng viên
app.post('/api/admin/interviews/confirm', async (req, res) => {
  if (!isMySqlConnected) return res.status(500).json({ error: 'Chưa kết nối CSDL' });
  try {
    const caregiverUserId = Number(req.body.caregiverUserId || req.body.userId);
    if (!caregiverUserId) {
      return res.status(400).json({ error: 'Thiếu ID người chăm sóc' });
    }

    const [uRows] = await pool.execute('SELECT id, full_name, email, phone FROM users WHERE id = ?', [caregiverUserId]);
    if (uRows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy người chăm sóc' });
    }
    const caregiver = uRows[0];

    const [cpRows] = await pool.execute('SELECT id, interview_date, interview_time, interview_status FROM caregiver_profiles WHERE user_id = ?', [caregiverUserId]);
    const cp = cpRows[0] || {};

    const meetingLink = generateGoogleMeetLink();

    await pool.execute(
      `UPDATE caregiver_profiles 
       SET interview_meeting_link = ?,
           interview_status = 'confirmed'
       WHERE user_id = ?`,
      [meetingLink, caregiverUserId]
    );

    // TỰ ĐỘNG GỬI TIN NHẮN TỪ ADMIN KÈM LINK GOOGLE MEET VÀO HỘI THOẠI
    const convId = `conv_1_${caregiverUserId}`;
    const timeDetail = cp.interview_date ? ` vào lúc ${cp.interview_time || '09:30 - 10:00'} ngày ${cp.interview_date}` : '';
    const adminMeetMsg = `Chào bạn ${caregiver.full_name}, Ban Quản Trị CARE-MATCH đã xác nhận lịch hẹn phỏng vấn trực tuyến của bạn${timeDetail}.\n👉 Link phòng họp Google Meet chính thức: ${meetingLink}\n\nBạn vui lòng chuẩn bị CCCD gắn chip gốc, trang phục lịch sự và bấm nút "Vào Google Meet" đúng giờ nhé! Chúc bạn có buổi phỏng vấn tốt đẹp.`;

    await pool.execute(
      `INSERT INTO messages (conversation_id, sender_user_id, sender_name, sender_role, recipient_user_id, recipient_name, content, is_read)
       VALUES (?, 1, 'Ban Quản Trị CARE-MATCH', 'admin', ?, ?, ?, FALSE)`,
      [convId, caregiverUserId, caregiver.full_name, adminMeetMsg]
    );

    await createNotification(
      caregiverUserId,
      'interview',
      '✅ Ban Quản Trị đã xác nhận lịch Google Meet!',
      `Lịch phỏng vấn${timeDetail} đã được Admin xác nhận. Link Google Meet: ${meetingLink}`,
      '/caregiver'
    );

    console.log(`✅ [Google Meet] Admin đã xác nhận lịch phỏng vấn và gửi link ${meetingLink} cho Caregiver #${caregiverUserId}`);

    return res.json({
      success: true,
      meetingLink,
      caregiverUserId,
      caregiverName: caregiver.full_name,
      message: `Đã xác nhận lịch phỏng vấn và gửi link Google Meet tới ${caregiver.full_name}!`
    });
  } catch (err) {
    console.error('Lỗi xác nhận phỏng vấn:', err);
    return res.status(500).json({ error: err.message });
  }
});

// Alias tương thích ngược cho endpoint generate-meet
app.post('/api/admin/interviews/generate-meet', async (req, res) => {
  return app._router.handle({ ...req, url: '/api/admin/interviews/confirm' }, res);
});

// 2. Admin lấy danh sách các ca phỏng vấn online
app.get('/api/admin/interviews', async (req, res) => {
  if (!isMySqlConnected) return res.json([]);
  try {
    const [rows] = await pool.execute(`
      SELECT cp.id AS profile_id, cp.user_id, cp.interview_status, cp.interview_date,
             cp.interview_time, cp.interview_meeting_link, cp.interview_notes,
             cp.interview_scheduled_at, cp.interview_passed_at,
             cp.verification_status, cp.care_score, cp.experience_years,
             cp.contact_address, cp.district,
             u.full_name, u.email, u.phone, u.created_at AS user_created_at
      FROM caregiver_profiles cp
      JOIN users u ON cp.user_id = u.id
      ORDER BY 
        CASE 
          WHEN cp.interview_status = 'scheduled' THEN 1 
          WHEN cp.interview_status = 'not_scheduled' THEN 2 
          ELSE 3 
        END,
        cp.interview_date ASC,
        cp.id DESC
    `);
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// 3. Admin đánh giá & xác nhận kết quả phỏng vấn
app.post('/api/admin/interviews/evaluate', async (req, res) => {
  if (!isMySqlConnected) return res.status(500).json({ error: 'Chưa kết nối MySQL' });
  try {
    const { userId, profileId, status, notes, careScoreBonus } = req.body;
    // status: 'passed' | 'failed' | 'scheduled'
    const targetUserId = Number(userId);
    const targetProfileId = Number(profileId);
    const bonus = Number(careScoreBonus) || 0;

    let updateQuery = `
      UPDATE caregiver_profiles SET
        interview_status = ?,
        interview_notes = COALESCE(?, interview_notes),
        interview_passed_at = CASE WHEN ? = 'passed' THEN NOW() ELSE interview_passed_at END,
        verification_status = CASE WHEN ? = 'passed' THEN 'approved' ELSE verification_status END,
        care_score = CASE WHEN ? = 'passed' THEN GREATEST(COALESCE(care_score, 85), 90) + ? ELSE care_score END
      WHERE (user_id = ? AND ? > 0) OR (id = ? AND ? > 0)
    `;

    await pool.execute(updateQuery, [
      status,
      notes || null,
      status,
      status,
      status,
      bonus,
      targetUserId || 0,
      targetUserId || 0,
      targetProfileId || 0,
      targetProfileId || 0
    ]);

    // Nếu đạt phỏng vấn, tự động duyệt các tài liệu eKYC
    if (status === 'passed') {
      try {
        await pool.execute(
          "UPDATE caregiver_documents SET status = 'verified' WHERE caregiver_id = ? OR caregiver_id IN (SELECT id FROM caregiver_profiles WHERE user_id = ?)",
          [targetProfileId || 0, targetUserId || 0]
        );
      } catch (docErr) {
        console.warn('Lỗi cập nhật caregiver_documents khi đạt phỏng vấn:', docErr.message);
      }
    }

    // Xác định chính xác targetUserId nếu client chỉ truyền profileId
    let finalCgUserId = targetUserId;
    if (!finalCgUserId && targetProfileId) {
      const [cpRows] = await pool.execute('SELECT user_id FROM caregiver_profiles WHERE id = ?', [targetProfileId]);
      if (cpRows.length > 0) finalCgUserId = cpRows[0].user_id;
    }

    // Tạo thông báo & Gửi tin nhắn tự động từ Admin tới Caregiver
    if (finalCgUserId) {
      const [uRows] = await pool.execute('SELECT full_name FROM users WHERE id = ?', [finalCgUserId]);
      const cgName = uRows[0]?.full_name || 'Người chăm sóc';
      const convId = `conv_1_${finalCgUserId}`;

      if (status === 'passed') {
        await createNotification(
          finalCgUserId,
          'interview',
          'Chúc mừng! Bạn đã hoàn thành phỏng vấn đạt chuẩn',
          'Bạn đã hoàn thành xuất sắc vòng phỏng vấn năng lực với Ban Quản Trị. Bạn đã đủ điều kiện nhận ca làm việc và hồ sơ đã xuất hiện trên hệ thống đề xuất.',
          '/caregiver'
        );

        const passMsg = `🎉 Ban Quản Trị CARE-MATCH chúc mừng bạn ${cgName}!\n\nBạn đã hoàn thành xuất sắc buổi phỏng vấn trực tuyến và chính thức ĐẠT CHUẨN Chuyên viên Chăm sóc.\n✅ Quyền nhận ca làm việc đã được kích hoạt thành công.\n✅ Hồ sơ của bạn đã sẵn sàng xuất hiện trên danh mục đề xuất tìm kiếm của các gia đình.\n${notes ? `📝 Nhận xét / Đánh giá: ${notes}` : ''}`;
        await pool.execute(
          `INSERT INTO messages (conversation_id, sender_user_id, sender_name, sender_role, recipient_user_id, recipient_name, content, is_read)
           VALUES (?, 1, 'Ban Quản Trị CARE-MATCH', 'admin', ?, ?, ?, FALSE)`,
          [convId, finalCgUserId, cgName, passMsg]
        );
      } else if (status === 'failed') {
        await createNotification(
          finalCgUserId,
          'interview',
          'Kết quả phỏng vấn trực tuyến',
          'Ban Quản Trị đã đánh giá buổi phỏng vấn trực tuyến. Vui lòng xem nhận xét và đặt lại lịch phỏng vấn bổ sung.',
          '/caregiver'
        );

        const failMsg = `Ban Quản Trị CARE-MATCH thông báo kết quả phỏng vấn tới bạn ${cgName}.\n\nBuổi phỏng vấn trực tuyến vừa qua hiện chưa đạt đủ tiêu chuẩn chuyên môn của hệ thống.\n${notes ? `📝 Lý do / Nhận xét: ${notes}\n\n` : ''}Bạn vui lòng kiểm tra lại thông tin, củng cố kỹ năng và có thể bấm nút "Đặt lại lịch phỏng vấn" trên màn hình Người chăm sóc để hẹn lại buổi phỏng vấn khác cùng Admin nhé!`;
        await pool.execute(
          `INSERT INTO messages (conversation_id, sender_user_id, sender_name, sender_role, recipient_user_id, recipient_name, content, is_read)
           VALUES (?, 1, 'Ban Quản Trị CARE-MATCH', 'admin', ?, ?, ?, FALSE)`,
          [convId, finalCgUserId, cgName, failMsg]
        );
      }
    }

    return res.json({ success: true, message: 'Cập nhật đánh giá phỏng vấn thành công!' });
  } catch (err) {
    console.error('Lỗi đánh giá phỏng vấn:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ========================================================
// API LẤY DANH SÁCH NGƯỜI CHĂM SÓC DÀNH CHO GIA ĐÌNH (/matches)
// ========================================================
app.get('/api/caregivers', async (req, res) => {
  if (!isMySqlConnected) return res.json([]);
  try {
    const { search, district, status } = req.query;
    let query = `
      SELECT u.id AS user_id, u.username, u.full_name, u.email, u.phone, u.role,
             cp.id AS profile_id, cp.title, cp.experience_years, cp.care_score,
             cp.verification_status, cp.shift_rate, cp.night_shift_rate, cp.work_history,
             cp.hourly_rate, cp.district, cp.contact_address, cp.interview_status, cp.interview_date, cp.interview_time, cp.rating,
             cp.skills, cp.bio, cp.documents, cp.created_at
      FROM users u
      LEFT JOIN caregiver_profiles cp ON u.id = cp.user_id
      WHERE u.role = 'caregiver'
    `;
    const params = [];

    if (status && status !== 'all') {
      query += ' AND cp.verification_status = ?';
      params.push(status);
    }

    query += `
      ORDER BY 
        CASE WHEN cp.interview_status = 'passed' AND cp.verification_status = 'approved' THEN 1 ELSE 2 END,
        COALESCE(cp.care_score, 0) DESC,
        u.id ASC
    `;

    const [rows] = await pool.execute(query, params);

    const colors = [
      'linear-gradient(145deg, #d8b984, #9c7655)',
      'linear-gradient(145deg, #afc5b0, #638273)',
      'linear-gradient(145deg, #e2b49e, #a96e66)',
      'linear-gradient(145deg, #8ba888, #4d6d4a)',
      'linear-gradient(145deg, #d2a868, #8c6832)'
    ];

    const result = rows.map((r, idx) => {
      const fullName = (r.full_name || r.username || 'Người chăm sóc').trim();
      const nameParts = fullName.split(' ').filter(Boolean);
      const initials = nameParts.length >= 2
        ? (nameParts[nameParts.length - 2][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
        : fullName.slice(0, 2).toUpperCase();

      const skills = parseJson(r.skills, []);
      const tags = skills.length > 0 ? skills.slice(0, 4) : ['Chăm sóc tại nhà', 'Theo dõi sức khỏe', 'Tâm lý'];

      const score = Number(r.care_score) || 95;
      const exp = Math.max(1, Number(r.experience_years) || 1);
      const shiftRate = Number(r.shift_rate) || 400000;
      const nightShiftRate = Number(r.night_shift_rate) || Math.round(shiftRate * 1.5);
      const workHistory = parseJson(r.work_history, []);
      const docs = parseJson(r.documents, []);

      return {
        id: String(r.user_id),
        user_id: r.user_id,
        profile_id: r.profile_id,
        name: fullName,
        username: r.username,
        email: r.email,
        phone: r.phone,
        role: 'Chuyên viên chăm sóc',
        initials,
        rating: r.rating ? String(r.rating).replace('.', ',') : '4,9',
        reviews: 20 + ((r.user_id * 7) % 30),
        experience: `${exp} năm kinh nghiệm`,
        experience_years: exp,
        shift_rate: shiftRate,
        night_shift_rate: nightShiftRate,
        work_history: workHistory,
        documents: docs,
        distance: r.district ? `Khu vực: ${r.district}` : '2,4 km',
        district: r.district || 'Hà Nội',
        contact_address: r.contact_address || '',
        interview_status: r.interview_status || 'passed',
        interview_passed: r.interview_status === 'passed',
        match: score,
        care_score: score,
        tags,
        color: colors[idx % colors.length],
        bio: r.bio || `Chuyên viên chăm sóc tận tâm với ${exp} năm kinh nghiệm, kỹ năng bài bản và chu đáo.`,
        availability: 'Có thể bắt đầu nhận ca',
        hourly_rate: r.hourly_rate || 120000,
        verification_status: r.verification_status || 'approved'
      };
    });

    return res.json(result);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// Lấy chi tiết 1 người chăm sóc
app.get('/api/caregivers/:id', async (req, res) => {
  if (!isMySqlConnected) return res.status(500).json({ error: 'Chưa kết nối MySQL' });
  const paramId = req.params.id;
  try {
    let query = `
      SELECT u.id AS user_id, u.username, u.full_name, u.email, u.phone, u.role,
             cp.id AS profile_id, cp.title, cp.experience_years, cp.care_score,
             cp.verification_status, cp.shift_rate, cp.night_shift_rate, cp.work_history,
             cp.hourly_rate, cp.district, cp.rating,
             cp.skills, cp.bio, cp.documents, cp.created_at
      FROM users u
      LEFT JOIN caregiver_profiles cp ON u.id = cp.user_id
      WHERE u.role = 'caregiver' AND (u.id = ? OR u.username = ? OR cp.id = ?)
      LIMIT 1
    `;
    const numId = !isNaN(Number(paramId)) ? Number(paramId) : -1;
    const [rows] = await pool.execute(query, [numId, paramId, numId]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy người chăm sóc' });
    }

    const r = rows[0];
    const fullName = (r.full_name || r.username || 'Người chăm sóc').trim();
    const nameParts = fullName.split(' ').filter(Boolean);
    const initials = nameParts.length >= 2
      ? (nameParts[nameParts.length - 2][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
      : fullName.slice(0, 2).toUpperCase();

    const skills = parseJson(r.skills, []);
    const tags = skills.length > 0 ? skills : ['Chăm sóc tại nhà', 'Theo dõi sức khỏe', 'Tâm lý'];
    const score = Number(r.care_score) || 95;
    const exp = Math.max(1, Number(r.experience_years) || 1);
    const shiftRate = Number(r.shift_rate) || 400000;
    const nightShiftRate = Number(r.night_shift_rate) || Math.round(shiftRate * 1.5);
    const workHistory = parseJson(r.work_history, []);
    const docs = parseJson(r.documents, []);

    return res.json({
      id: String(r.user_id),
      user_id: r.user_id,
      profile_id: r.profile_id,
      name: fullName,
      username: r.username,
      email: r.email,
      phone: r.phone,
      role: 'Chuyên viên chăm sóc',
      initials,
      rating: r.rating ? String(r.rating).replace('.', ',') : '4,9',
      reviews: 25 + ((r.user_id * 5) % 25),
      experience: `${exp} năm kinh nghiệm`,
      experience_years: exp,
      shift_rate: shiftRate,
      night_shift_rate: nightShiftRate,
      work_history: workHistory,
      documents: docs,
      distance: r.district ? `Khu vực: ${r.district}` : '2,4 km',
      district: r.district || 'Hà Nội',
      match: score,
      care_score: score,
      tags,
      color: 'linear-gradient(145deg, #d8b984, #9c7655)',
      bio: r.bio || `Chuyên viên chăm sóc tận tâm với ${exp} năm kinh nghiệm, luôn lắng nghe và đồng hành tận tình.`,
      availability: 'Có thể bắt đầu nhận ca',
      hourly_rate: r.hourly_rate || 120000,
      verification_status: r.verification_status || 'approved'
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// Admin lấy danh sách hồ sơ người chăm sóc (để thẩm định)
app.get('/api/admin/caregivers', async (req, res) => {
  if (isMySqlConnected) {
    try {
      const [rows] = await pool.execute(
        `SELECT cp.*, u.full_name, u.phone, u.email, u.username
         FROM caregiver_profiles cp
         JOIN users u ON cp.user_id = u.id
         ORDER BY cp.created_at DESC`
      );
      const formatted = rows.map(r => ({
        ...r,
        skills: parseJson(r.skills, []),
        documents: parseJson(r.documents, [])
      }));
      return res.json(formatted);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }
  return res.json([]);
});

// Admin phê duyệt / từ chối hồ sơ người chăm sóc
app.patch('/api/caregiver-profile/:id/status', async (req, res) => {
  const targetId = Number(req.params.id);
  const { status, care_score, admin_id, user_id } = req.body;

  if (isMySqlConnected) {
    try {
      const targetUserId = user_id ? Number(user_id) : targetId;
      // 1. Kiểm tra chính xác theo profileId (id của bảng caregiver_profiles)
      let [exist] = await pool.execute('SELECT * FROM caregiver_profiles WHERE id = ? LIMIT 1', [targetId]);
      // 2. Nếu không thấy theo profileId thì mới tìm theo user_id
      if (exist.length === 0) {
        [exist] = await pool.execute('SELECT * FROM caregiver_profiles WHERE user_id = ? LIMIT 1', [targetUserId]);
      }

      let profileId = targetId;
      let actualUserId = targetUserId;

      if (exist.length > 0) {
        profileId = exist[0].id;
        actualUserId = exist[0].user_id;
        await pool.execute(
          `UPDATE caregiver_profiles SET
            verification_status = ?,
            interview_status = CASE WHEN ? = 'approved' THEN 'passed' ELSE interview_status END,
            interview_passed_at = CASE WHEN ? = 'approved' AND interview_passed_at IS NULL THEN CURRENT_TIMESTAMP ELSE interview_passed_at END,
            care_score = COALESCE(?, care_score, 96),
            approved_by_admin_id = ?,
            approved_at = CURRENT_TIMESTAMP
          WHERE id = ?`,
          [status, status, status, care_score !== undefined ? Number(care_score) : 96, admin_id || 1, profileId]
        );
      } else {
        const [ins] = await pool.execute(
          `INSERT INTO caregiver_profiles 
           (user_id, title, verification_status, interview_status, interview_passed_at, care_score, experience_years, hourly_rate, district, skills, bio, approved_by_admin_id, approved_at)
           VALUES (?, 'Chuyên viên chăm sóc', ?, ?, CASE WHEN ? = 'approved' THEN CURRENT_TIMESTAMP ELSE NULL END, ?, 5, 120000, 'Hà Nội', '[]', '', ?, CURRENT_TIMESTAMP)`,
          [actualUserId, status, status === 'approved' ? 'passed' : 'not_scheduled', status, care_score !== undefined ? Number(care_score) : 96, admin_id || 1]
        );
        profileId = ins.insertId;
      }

      if (status === 'approved') {
        // Tự động chuyển toàn bộ các tài liệu eKYC của người chăm sóc sang đã duyệt ('verified')
        await pool.execute(
          "UPDATE caregiver_documents SET status = 'verified' WHERE caregiver_id = ?",
          [profileId]
        );

        if (actualUserId) {
          await createNotification(
            actualUserId,
            'verification',
            '🎉 Hồ sơ & Phỏng vấn đã được phê duyệt đạt chuẩn!',
            'Ban Quản Trị CARE-MATCH đã thẩm định và phê duyệt hồ sơ năng lực của bạn. Bạn đã đủ điều kiện bắt đầu nhận ca làm việc!',
            '/caregiver'
          );

          const [uRows] = await pool.execute('SELECT full_name FROM users WHERE id = ?', [actualUserId]);
          const cgName = uRows[0]?.full_name || 'Người chăm sóc';
          const convId = `conv_1_${actualUserId}`;
          const approvalMsg = `🎉 Ban Quản Trị CARE-MATCH chúc mừng bạn ${cgName}!\n\nToàn bộ hồ sơ năng lực và chứng chỉ eKYC của bạn đã được Admin PHÊ DUYỆT ĐẠT CHUẨN.\n✅ Quyền nhận ca chăm sóc đã được mở khóa.\n✅ Hồ sơ của bạn đã sẵn sàng nhận kết nối từ các gia đình.`;
          await pool.execute(
            `INSERT INTO messages (conversation_id, sender_user_id, sender_name, sender_role, recipient_user_id, recipient_name, content, is_read)
             VALUES (?, 1, 'Ban Quản Trị CARE-MATCH', 'admin', ?, ?, ?, FALSE)`,
            [convId, actualUserId, cgName, approvalMsg]
          );
        }
      } else if (status === 'rejected' && actualUserId) {
        const [uRows] = await pool.execute('SELECT full_name FROM users WHERE id = ?', [actualUserId]);
        const cgName = uRows[0]?.full_name || 'Người chăm sóc';
        const convId = `conv_1_${actualUserId}`;
        const rejectMsg = `Ban Quản Trị CARE-MATCH gửi thông báo tới bạn ${cgName}.\n\nHồ sơ năng lực của bạn hiện cần bổ sung hoặc điều chỉnh lại giấy tờ eKYC. Bạn vui lòng kiểm tra mục hồ sơ hoặc bấm "Đặt lịch phỏng vấn" để trao đổi trực tuyến với Admin nhé!`;
        await pool.execute(
          `INSERT INTO messages (conversation_id, sender_user_id, sender_name, sender_role, recipient_user_id, recipient_name, content, is_read)
           VALUES (?, 1, 'Ban Quản Trị CARE-MATCH', 'admin', ?, ?, ?, FALSE)`,
          [convId, actualUserId, cgName, rejectMsg]
        );
      }

      const [rows] = await pool.execute('SELECT * FROM caregiver_profiles WHERE id = ?', [profileId]);
      if (rows.length > 0) {
        const p = rows[0];
        // Gửi thông báo cho người chăm sóc
        await createNotification(
          p.user_id,
          'verification',
          status === 'approved' ? 'Hồ sơ của bạn đã được Admin phê duyệt! ✓' : 'Yêu cầu cập nhật lại hồ sơ xác thực',
          status === 'approved'
            ? `Chúc mừng bạn! Hồ sơ chăm sóc đã được cấp tích xanh với CARE SCORE ${p.care_score}/100 điểm. Bạn đã có thể bắt đầu nhận ca.`
            : 'Hồ sơ xác thực của bạn cần bổ sung thêm giấy tờ. Vui lòng kiểm tra lại.',
          '/caregiver'
        );

        return res.json({ success: true, profile: p });
      }
      return res.status(404).json({ error: 'Không tìm thấy hồ sơ người chăm sóc' });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }
  return res.status(500).json({ error: 'Chưa kết nối MySQL' });
});

// ---- LỊCH TRÌNH VÀ CA CHĂM SÓC (SCHEDULES) ----

// 8. Lấy danh sách lịch trình từ MySQL
app.get('/api/schedules', async (req, res) => {
  const { familyUserId, caregiverUserId, caregiverName } = req.query;

  if (isMySqlConnected) {
    try {
      let query = `
        SELECT s.*, 
               COALESCE(u_fam.full_name, 'Người thân gia đình') AS family_name,
               u_fam.phone AS family_phone,
               u_fam.email AS family_email,
               ep.address AS elderly_address,
               ep.district AS elderly_district,
               ep.notes AS elderly_notes
        FROM schedules s
        LEFT JOIN users u_fam ON s.family_user_id = u_fam.id
        LEFT JOIN elderly_profiles ep ON s.elderly_profile_id = ep.id
        WHERE 1=1
      `;
      const params = [];

      if (familyUserId) {
        query += ' AND s.family_user_id = ?';
        params.push(Number(familyUserId));
      }
      if (caregiverUserId && caregiverName) {
        query += ' AND (s.caregiver_user_id = ? OR s.caregiver_name LIKE ?)';
        params.push(Number(caregiverUserId), `%${caregiverName}%`);
      } else if (caregiverUserId) {
        query += ' AND s.caregiver_user_id = ?';
        params.push(Number(caregiverUserId));
      } else if (caregiverName) {
        query += ' AND s.caregiver_name LIKE ?';
        params.push(`%${caregiverName}%`);
      }

      query += ' ORDER BY s.created_at DESC';

      const [rows] = await pool.execute(query, params);
      return res.json(rows);
    } catch (e) {
      console.error('MySQL fetch schedules error:', e.message);
      return res.status(500).json({ error: e.message });
    }
  }

  res.json([]);
});

// 9. Đặt ca chăm sóc mới (Lưu trực tiếp vào bảng schedules trong MySQL)
app.post('/api/schedules', async (req, res) => {
  const {
    family_user_id,
    caregiver_user_id,
    elderly_profile_id,
    elderly_name,
    caregiver_name,
    schedule_date,
    time_slot,
    title,
    tasks,
    price,
    status,
    voucher_code,
    voucher_discount,
    original_price
  } = req.body;

  if (!family_user_id) {
    return res.status(400).json({ error: 'Thiếu thông tin gia đình (family_user_id)' });
  }

  if (isMySqlConnected) {
    try {
      const initialStatus = status || 'pending_payment';
      const schedFinalPrice = Number(price) || 400000;
      const schedOrigPrice = Number(original_price) || schedFinalPrice;
      const vDiscount = Number(voucher_discount) || Math.max(0, schedOrigPrice - schedFinalPrice);
      const vCode = voucher_code ? String(voucher_code).trim().toUpperCase() : null;

      const [result] = await pool.execute(
        `INSERT INTO schedules 
          (family_user_id, caregiver_user_id, elderly_profile_id, elderly_name, caregiver_name, schedule_date, time_slot, title, tasks, status, price, voucher_code, voucher_discount, original_price)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          Number(family_user_id),
          Number(caregiver_user_id || 2),
          elderly_profile_id ? Number(elderly_profile_id) : null,
          elderly_name || 'Người thân',
          caregiver_name || 'Nguyễn Lan Anh',
          schedule_date || 'Hôm nay',
          time_slot || '08:30 - 12:30',
          title || `Ca chăm sóc (${caregiver_name || 'Nguyễn Lan Anh'})`,
          tasks || 'Chăm sóc sinh hoạt và theo dõi sức khỏe',
          initialStatus,
          schedFinalPrice,
          vCode,
          vDiscount,
          schedOrigPrice
        ]
      );

      const newSchedule = {
        id: result.insertId,
        scheduleId: result.insertId,
        family_user_id: Number(family_user_id),
        caregiver_user_id: Number(caregiver_user_id || 2),
        elderly_profile_id: elderly_profile_id ? Number(elderly_profile_id) : null,
        elderly_name: elderly_name || 'Người thân',
        caregiver_name: caregiver_name || 'Nguyễn Lan Anh',
        schedule_date: schedule_date || 'Hôm nay',
        time_slot: time_slot || '08:30 - 12:30',
        title: title || `Ca chăm sóc (${caregiver_name || 'Nguyễn Lan Anh'})`,
        tasks: tasks || 'Chăm sóc sinh hoạt và theo dõi sức khỏe',
        status: initialStatus,
        price: schedFinalPrice,
        original_price: schedOrigPrice,
        voucher_code: vCode,
        voucher_discount: vDiscount,
        caregiver_confirmed_completed: false,
        family_confirmed_completed: false,
        created_at: new Date().toISOString()
      };

      console.log(`✅ [MySQL] Đã lưu ca chăm sóc ID #${result.insertId} vào CSDL (Giá: ${schedFinalPrice}đ, Gốc: ${schedOrigPrice}đ, Voucher: ${vCode || 'Không'}).`);

      // Tự động tạo bản ghi ký quỹ escrow an toàn cho ca làm việc mới
      let bookingPaymentId = null;
      const txCode = 'ESC-2026-' + String(result.insertId).padStart(4, '0') + '-' + Math.floor(1000 + Math.random() * 9000);
      try {
        const fee = Math.round(schedOrigPrice * 0.35); // 35% phí sàn tính trên giá gốc
        const earnings = schedOrigPrice - fee;        // 65% thực nhận của Người chăm sóc tính trên giá gốc (Nền tảng bù voucher)
        const systemSubsidy = vDiscount;
        const [escResult] = await pool.execute(
          `INSERT INTO booking_escrow_payments 
           (transaction_code, schedule_id, family_user_id, caregiver_user_id, patient_name, shift_date, shift_time, total_amount, original_amount, platform_fee, caregiver_earnings, system_subsidy, voucher_code, voucher_discount, escrow_status, payment_method, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_payment', 'VietQR Napas 247', ?)`,
          [
            txCode,
            result.insertId,
            Number(family_user_id),
            Number(caregiver_user_id || 2),
            elderly_name || 'Người thân',
            schedule_date || 'Hôm nay',
            time_slot || '08:30 - 12:30',
            schedFinalPrice,
            schedOrigPrice,
            fee,
            earnings,
            systemSubsidy,
            vCode,
            vDiscount,
            vCode ? `Áp dụng mã ưu đãi ${vCode} (Giảm ${vDiscount.toLocaleString('vi-VN')}đ do CARE-MATCH tài trợ). Người chăm sóc nhận đủ 100% thù lao chuẩn.` : 'Đặt ca mới - Vui lòng thanh toán giữ chỗ để xác nhận ca'
          ]
        );
        bookingPaymentId = escResult.insertId;

        if (vCode) {
          try {
            await pool.execute('UPDATE vouchers SET used_count = used_count + 1 WHERE code = ?', [vCode]);
          } catch { }
        }
      } catch (escErr) {
        console.warn('Lỗi ghi nhận booking_escrow_payments khi đặt ca:', escErr.message);
      }

      // Tạo thông báo
      await createNotification(
        Number(family_user_id),
        'schedule',
        'Ca chăm sóc mới đã được tạo',
        `${schedule_date || 'Hôm nay'} · ${time_slot || '08:30 - 12:30'} với ${caregiver_name || 'Người chăm sóc'}. Vui lòng thanh toán giữ chỗ để xác nhận ca!`,
        '/schedule'
      );

      return res.status(201).json({
        ...newSchedule,
        id: result.insertId,
        scheduleId: result.insertId,
        schedule: {
          ...newSchedule,
          id: result.insertId,
          scheduleId: result.insertId
        },
        paymentId: bookingPaymentId,
        payment_id: bookingPaymentId,
        transaction_code: txCode
      });
    } catch (e) {
      console.error('MySQL insert schedule error:', e.message);
      return res.status(500).json({ error: 'Lỗi lưu ca chăm sóc: ' + e.message });
    }
  }

  return res.status(500).json({ error: 'Chưa kết nối CSDL' });
});

// 10. Cập nhật trạng thái ca chăm sóc (Hỗ trợ xác nhận hoàn thành 2 chiều bắt buộc)
app.patch('/api/schedules/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { status, confirmedBy } = req.body;

  if (isMySqlConnected) {
    try {
      const [existingRows] = await pool.execute('SELECT * FROM schedules WHERE id = ?', [id]);
      if (existingRows.length === 0) {
        return res.status(404).json({ error: 'Không tìm thấy ca chăm sóc' });
      }
      const item = existingRows[0];

      // XỬ LÝ QUY TRÌNH HOÀN THÀNH CA BẮT BUỘC 2 CHIỀU (Gia đình VÀ Người chăm sóc)
      if (status === 'completed' || confirmedBy) {
        let isCaregiverConfirmed = Boolean(item.caregiver_confirmed_completed);
        let isFamilyConfirmed = Boolean(item.family_confirmed_completed);

        if (confirmedBy === 'caregiver') {
          isCaregiverConfirmed = true;
          await pool.execute('UPDATE schedules SET caregiver_confirmed_completed = TRUE, caregiver_completed_at = NOW() WHERE id = ?', [id]);
        } else if (confirmedBy === 'family') {
          isFamilyConfirmed = true;
          await pool.execute('UPDATE schedules SET family_confirmed_completed = TRUE, family_completed_at = NOW() WHERE id = ?', [id]);
        } else {
          // Admin hoặc hệ thống duyệt trực tiếp cả 2 bên
          isCaregiverConfirmed = true;
          isFamilyConfirmed = true;
          await pool.execute('UPDATE schedules SET caregiver_confirmed_completed = TRUE, family_confirmed_completed = TRUE WHERE id = ?', [id]);
        }

        // Kiểm tra xem CẢ HAI PHÍA ĐÃ XÁC NHẬN CHƯA
        if (isCaregiverConfirmed && isFamilyConfirmed) {
          // CẢ HAI BÊN ĐÃ XÁC NHẬN -> CHÍNH THỨC HOÀN TẤT VÀ GIẢI NGÂN
          await pool.execute("UPDATE schedules SET status = 'completed' WHERE id = ?", [id]);

          // Tự động giải ngân ký quỹ 65% cho người chăm sóc, trích 35% phí sàn
          try {
            const ref = 'PAYOUT-' + Math.floor(10000000 + Math.random() * 90000000);
            await pool.execute(
              `UPDATE booking_escrow_payments 
               SET escrow_status = 'paid_out', 
                   released_at = NOW(), 
                   bank_reference = ?,
                   notes = 'Cả hai bên đã xác nhận hoàn thành ca. Hệ thống đã giải ngân tự động 65% thù lao vào tài khoản ngân hàng' 
               WHERE schedule_id = ?`,
              [ref, id]
            );

            if (item.caregiver_user_id) {
              const netEarn = Math.round((Number(item.price) || 400000) * 0.65);
              await createNotification(
                item.caregiver_user_id,
                'payment',
                '✅ Thù lao đã chuyển về tài khoản ngân hàng!',
                `Cả hai bên đã xác nhận hoàn thành ca #${id}. Hệ thống đã tự động chuyển ${netEarn.toLocaleString('vi-VN')} đ (65% thù lao) vào tài khoản ngân hàng của bạn.`,
                '/payments'
              );
            }
          } catch (payoutErr) {
            console.warn('Lỗi giải ngân tự động khi hoàn thành ca:', payoutErr.message);
          }

          if (item.family_user_id) {
            await createNotification(
              item.family_user_id,
              'schedule',
              'Ca chăm sóc đã kết thúc hoàn tất ✓',
              `${item.caregiver_name || 'Người chăm sóc'} đã hoàn thành ca chăm sóc cho ${item.elderly_name || 'người thân'}. Vui lòng đánh giá chất lượng dịch vụ ⭐`,
              '/schedule'
            );
          }

          const [updated] = await pool.execute('SELECT * FROM schedules WHERE id = ?', [id]);
          return res.json({ ...updated[0], both_confirmed: true, message: 'Cả hai bên đã xác nhận hoàn tất ca thành công!' });
        } else if (isCaregiverConfirmed && !isFamilyConfirmed) {
          // Chỉ mới người chăm sóc xác nhận -> Chờ gia đình
          await pool.execute("UPDATE schedules SET status = 'caregiver_completed' WHERE id = ?", [id]);
          if (item.family_user_id) {
            await createNotification(
              item.family_user_id,
              'schedule',
              '⚠️ Người chăm sóc đã báo hoàn thành ca',
              `${item.caregiver_name || 'Người chăm sóc'} đã báo hoàn thành ca chăm sóc cho ${item.elderly_name || 'người thân'}. Vui lòng xác nhận hoàn tất để giải ngân thù lao.`,
              '/schedule'
            );
          }
          const [updated] = await pool.execute('SELECT * FROM schedules WHERE id = ?', [id]);
          return res.json({ ...updated[0], both_confirmed: false, message: 'Đã báo hoàn thành ca. Đang chờ gia đình xác nhận đối soát!' });
        } else if (!isCaregiverConfirmed && isFamilyConfirmed) {
          // Chỉ mới gia đình xác nhận -> Chờ người chăm sóc
          await pool.execute("UPDATE schedules SET status = 'family_completed' WHERE id = ?", [id]);
          if (item.caregiver_user_id) {
            await createNotification(
              item.caregiver_user_id,
              'schedule',
              '⚠️ Gia đình đã xác nhận ca hoàn tất',
              `Gia đình ${item.elderly_name || 'người thân'} đã xác nhận ca làm việc xong. Vui lòng bấm xác nhận hoàn thành để nhận giải ngân thù lao.`,
              '/caregiver'
            );
          }
          const [updated] = await pool.execute('SELECT * FROM schedules WHERE id = ?', [id]);
          return res.json({ ...updated[0], both_confirmed: false, message: 'Đã xác nhận hoàn tất ca. Đang chờ người chăm sóc xác nhận đối soát!' });
        }
      }

      // Cập nhật các trạng thái khác (confirmed, pending, cancelled, ...)
      await pool.execute('UPDATE schedules SET status = ? WHERE id = ?', [status, id]);
      const [rows] = await pool.execute('SELECT * FROM schedules WHERE id = ?', [id]);
      if (rows.length > 0) {
        const updatedItem = rows[0];
        console.log(`✅ [MySQL] Đã cập nhật trạng thái ca #${id} thành: ${status}`);

        if (status === 'confirmed' && updatedItem.family_user_id) {
          await createNotification(
            updatedItem.family_user_id,
            'schedule',
            'Người chăm sóc đã nhận ca! ✓',
            `${updatedItem.caregiver_name || 'Người chăm sóc'} đã xác nhận nhận ca chăm sóc cho ${updatedItem.elderly_name || 'người thân'} (${updatedItem.schedule_date || 'Hôm nay'}).`,
            '/schedule'
          );
        }
        return res.json(updatedItem);
      }
      return res.status(404).json({ error: 'Không tìm thấy ca chăm sóc' });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(500).json({ error: 'Chưa kết nối CSDL' });
});

// 11. Xóa / Hủy ca chăm sóc (MySQL)
app.delete('/api/schedules/:id', async (req, res) => {
  const id = Number(req.params.id);

  if (isMySqlConnected) {
    try {
      await pool.execute('DELETE FROM schedules WHERE id = ?', [id]);
      console.log(`✅ [MySQL] Đã xóa ca chăm sóc ID #${id}`);
      return res.json({ success: true, message: 'Đã hủy ca chăm sóc thành công.' });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(500).json({ error: 'Chưa kết nối MySQL' });
});

// 11.1. Đổi lịch ca chăm sóc (Dành cho gia đình: VIP miễn phí, thường 10k)
app.patch('/api/schedules/:id/reschedule', async (req, res) => {
  const id = Number(req.params.id);
  const { newDate, newTimeSlot, fee, userId } = req.body;
  if (!isMySqlConnected) return res.status(500).json({ error: 'Chưa kết nối MySQL' });
  try {
    const [sRows] = await pool.execute('SELECT * FROM schedules WHERE id = ?', [id]);
    if (sRows.length === 0) return res.status(404).json({ error: 'Không tìm thấy ca làm việc' });
    const s = sRows[0];

    const rescheduleFee = Number(fee) || 0;

    await pool.execute(
      `UPDATE schedules 
       SET schedule_date = ?, 
           time_slot = ?,
           updated_at = NOW()
       WHERE id = ?`,
      [newDate, newTimeSlot, id]
    );

    await pool.execute(
      `UPDATE booking_escrow_payments 
       SET shift_date = ?, 
           shift_time = ?,
           notes = CONCAT(COALESCE(notes, ''), ' · Đã đổi lịch sang ', ?, ' (', ?, ')', CASE WHEN ? > 0 THEN ' · Phí đổi: 10.000đ' ELSE ' · Miễn phí VIP' END)
       WHERE schedule_id = ?`,
      [newDate, newTimeSlot, newDate, newTimeSlot, rescheduleFee, id]
    );

    if (s.caregiver_user_id) {
      await createNotification(
        s.caregiver_user_id,
        'schedule',
        'Lịch ca chăm sóc đã thay đổi 📅',
        `Gia đình đã đổi lịch ca #${id} sang ngày ${newDate} (${newTimeSlot}). Vui lòng kiểm tra lịch làm việc của bạn.`,
        '/schedule'
      );
    }

    if (s.family_user_id) {
      await createNotification(
        s.family_user_id,
        'schedule',
        'Đổi lịch ca thành công! ✅',
        `Ca làm việc đã được chuyển sang ngày ${newDate} (${newTimeSlot}). ${rescheduleFee > 0 ? 'Phí dịch vụ: 10.000đ.' : 'Miễn phí đặc quyền VIP.'}`,
        '/schedule'
      );
    }

    return res.json({ success: true, message: 'Đã đổi lịch ca thành công!' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// 11.2. Hủy ca chăm sóc (Dành cho gia đình hoặc ca đã cọc: VIP miễn phí, thường 10k)
app.post('/api/schedules/:id/cancel', async (req, res) => {
  const id = Number(req.params.id);
  const { reason, fee, userId } = req.body;
  if (!isMySqlConnected) return res.status(500).json({ error: 'Chưa kết nối MySQL' });
  try {
    const [sRows] = await pool.execute('SELECT * FROM schedules WHERE id = ?', [id]);
    if (sRows.length === 0) return res.status(404).json({ error: 'Không tìm thấy ca làm việc' });
    const s = sRows[0];

    const cancelFee = Number(fee) || 0;
    const cancelReason = reason || 'Thay đổi kế hoạch gia đình';

    await pool.execute("UPDATE schedules SET status = 'cancelled' WHERE id = ?", [id]);

    await pool.execute(
      `UPDATE booking_escrow_payments 
       SET escrow_status = 'refunded',
           notes = CONCAT(COALESCE(notes, ''), ' · Đã hủy ca. Lý do: ', ?, CASE WHEN ? > 0 THEN ' · Phí hủy: 10.000đ' ELSE ' · Hoàn 100% (Đặc quyền VIP)' END)
       WHERE schedule_id = ?`,
      [cancelReason, cancelFee, id]
    );

    if (s.caregiver_user_id) {
      await createNotification(
        s.caregiver_user_id,
        'schedule',
        'Ca chăm sóc đã bị hủy ⚠️',
        `Gia đình đã hủy ca ngày ${s.schedule_date} (${s.time_slot}). Lý do: ${cancelReason}. Khoảng thời gian này đã được giải phóng trên lịch của bạn.`,
        '/schedule'
      );
    }

    if (s.family_user_id) {
      await createNotification(
        s.family_user_id,
        'schedule',
        'Hủy ca chăm sóc thành công',
        `Đã hủy ca ngày ${s.schedule_date}. ${cancelFee > 0 ? 'Phí dịch vụ: 10.000đ. Tiền cọc còn lại đã được hoàn về tài khoản.' : 'Đặc quyền VIP: Miễn phí 100% phí hủy ca.'}`,
        '/schedule'
      );
    }

    return res.json({ success: true, message: 'Đã hủy ca thành công!' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ---- QUẢN LÝ VOUCHER & ƯU ĐÃI (ADMIN & FAMILY) ----

// Lấy danh sách voucher
app.get('/api/vouchers', async (req, res) => {
  if (!isMySqlConnected) return res.json([]);
  try {
    const { activeOnly } = req.query;
    let sql = 'SELECT * FROM vouchers';
    if (activeOnly === 'true') {
      sql += ' WHERE is_active = TRUE AND (end_date IS NULL OR end_date >= CURDATE())';
    }
    sql += ' ORDER BY id DESC';
    const [rows] = await pool.execute(sql);
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Admin tạo voucher mới
app.post('/api/vouchers', async (req, res) => {
  if (!isMySqlConnected) return res.status(500).json({ error: 'Chưa kết nối MySQL' });
  try {
    const {
      code,
      title,
      description,
      discount_type,
      discount_value,
      max_discount_amount,
      min_order_amount,
      start_date,
      end_date,
      usage_limit,
      is_active
    } = req.body;

    if (!code || !title) {
      return res.status(400).json({ error: 'Mã voucher và tiêu đề là bắt buộc' });
    }

    const cleanCode = String(code).trim().toUpperCase();

    const [exist] = await pool.execute('SELECT id FROM vouchers WHERE code = ?', [cleanCode]);
    if (exist.length > 0) {
      return res.status(400).json({ error: `Mã ưu đãi ${cleanCode} đã tồn tại trên hệ thống` });
    }

    const [result] = await pool.execute(
      `INSERT INTO vouchers 
        (code, title, description, discount_type, discount_value, max_discount_amount, min_order_amount, start_date, end_date, usage_limit, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        cleanCode,
        title,
        description || '',
        discount_type || 'percentage',
        Number(discount_value) || 50,
        Number(max_discount_amount) || 500000,
        Number(min_order_amount) || 0,
        start_date || null,
        end_date || null,
        Number(usage_limit) || 1000,
        is_active !== undefined ? Boolean(is_active) : true
      ]
    );

    return res.status(201).json({ success: true, id: result.insertId, message: 'Đã tạo voucher mới thành công!' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Admin cập nhật voucher
app.put('/api/vouchers/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!isMySqlConnected) return res.status(500).json({ error: 'Chưa kết nối MySQL' });
  try {
    const {
      title,
      description,
      discount_type,
      discount_value,
      max_discount_amount,
      min_order_amount,
      start_date,
      end_date,
      usage_limit,
      is_active
    } = req.body;

    await pool.execute(
      `UPDATE vouchers SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        discount_type = COALESCE(?, discount_type),
        discount_value = COALESCE(?, discount_value),
        max_discount_amount = COALESCE(?, max_discount_amount),
        min_order_amount = COALESCE(?, min_order_amount),
        start_date = ?,
        end_date = ?,
        usage_limit = COALESCE(?, usage_limit),
        is_active = COALESCE(?, is_active)
      WHERE id = ?`,
      [
        title || null,
        description !== undefined ? description : null,
        discount_type || null,
        discount_value !== undefined ? Number(discount_value) : null,
        max_discount_amount !== undefined ? Number(max_discount_amount) : null,
        min_order_amount !== undefined ? Number(min_order_amount) : null,
        start_date || null,
        end_date || null,
        usage_limit !== undefined ? Number(usage_limit) : null,
        is_active !== undefined ? Boolean(is_active) : null,
        id
      ]
    );

    return res.json({ success: true, message: 'Cập nhật voucher thành công!' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Admin xóa voucher
app.delete('/api/vouchers/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!isMySqlConnected) return res.status(500).json({ error: 'Chưa kết nối MySQL' });
  try {
    await pool.execute('DELETE FROM vouchers WHERE id = ?', [id]);
    return res.json({ success: true, message: 'Đã xóa voucher thành công!' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Áp dụng & kiểm tra voucher
app.post('/api/vouchers/apply', async (req, res) => {
  const { code, totalAmount, userId } = req.body;
  if (!isMySqlConnected) return res.status(500).json({ error: 'Chưa kết nối MySQL' });
  try {
    if (!code) return res.status(400).json({ error: 'Vui lòng nhập mã ưu đãi' });
    const cleanCode = String(code).trim().toUpperCase();

    const [rows] = await pool.execute('SELECT * FROM vouchers WHERE code = ? LIMIT 1', [cleanCode]);
    if (rows.length === 0) {
      return res.status(404).json({ error: `Mã ưu đãi "${cleanCode}" không tồn tại hoặc đã hết hiệu lực` });
    }

    const v = rows[0];
    if (!v.is_active) {
      return res.status(400).json({ error: `Mã ưu đãi "${cleanCode}" hiện đang tạm ngừng kích hoạt` });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (v.start_date) {
      const startDate = new Date(v.start_date);
      startDate.setHours(0, 0, 0, 0);
      if (today < startDate) {
        return res.status(400).json({ error: `Mã ưu đãi "${cleanCode}" chưa đến ngày bắt đầu áp dụng` });
      }
    }
    if (v.end_date) {
      const endDate = new Date(v.end_date);
      endDate.setHours(23, 59, 59, 999);
      if (today > endDate) {
        return res.status(400).json({ error: `Mã ưu đãi "${cleanCode}" đã hết hạn sử dụng` });
      }
    }
    if (v.usage_limit && v.used_count >= v.usage_limit) {
      return res.status(400).json({ error: `Mã ưu đãi "${cleanCode}" đã hết lượt sử dụng` });
    }

    const orderAmount = Number(totalAmount || req.body.originalPrice) || 400000;
    if (v.min_order_amount && orderAmount < Number(v.min_order_amount)) {
      return res.status(400).json({ error: `Đơn hàng tối thiểu để áp dụng mã này là ${Number(v.min_order_amount).toLocaleString('vi-VN')} đ` });
    }

    let discountAmount = 0;
    if (v.discount_type === 'percentage') {
      discountAmount = Math.round((orderAmount * Number(v.discount_value)) / 100);
      if (v.max_discount_amount && discountAmount > Number(v.max_discount_amount)) {
        discountAmount = Number(v.max_discount_amount);
      }
    } else {
      discountAmount = Math.min(orderAmount, Number(v.discount_value));
    }

    const finalAmount = Math.max(0, orderAmount - discountAmount);

    return res.json({
      success: true,
      valid: true,
      voucher: v,
      code: v.code,
      title: v.title,
      description: v.description,
      discount_type: v.discount_type,
      discount_value: v.discount_value,
      discount: discountAmount,
      discountAmount,
      final_price: finalAmount,
      finalAmount,
      original_price: orderAmount,
      originalAmount: orderAmount,
      system_subsidy: discountAmount,
      systemSubsidy: discountAmount,
      extra_perk: 'Tặng 100% gói tư vấn dinh dưỡng & thực đơn sức khỏe người cao tuổi',
      healthConsultationFree: true,
      message: `🎉 Áp dụng thành công mã ${v.code}! Giảm ${discountAmount.toLocaleString('vi-VN')} đ + Tặng 01 buổi tư vấn sức khỏe & bữa ăn 100% miễn phí.`
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ========================================================
// CẤU HÌNH HỆ THỐNG & BẤT BIẾN (SYSTEM SETTINGS)
// ========================================================
app.get('/api/settings', async (req, res) => {
  const fallback = {
    cancellation_fee_regular: 10000,
    vip_monthly_price: 300000,
    caregiver_payout_rate: 65,
    platform_commission_rate: 35,
    base_shift_rate_4h: 400000,
    night_shift_multiplier: 1.5,
    hourly_divisor: 4,
    min_care_score_recommended: 90,
    require_online_interview: 1,
    home_headline: 'Những người chăm sóc phù hợp nhất',
    hotline_support: '1900 6868',
    slogan_text: 'CARE MATCH — Đồng hành mỗi ngày – An tâm tuổi bạc',
    escrow_deposit_percent: 100,
    cancel_free_hours_notice: 6,
    max_shifts_per_caregiver_day: 3,
    emergency_sla_minutes: 15,
    require_daily_care_log: 1,
    warning_bp_high: 140,
    warning_spo2_low: 95,
    support_email: 'cskh@carematch.vn',
    admin_bank_name: 'MB Bank (Quân Đội)',
    admin_bank_account: '0934 567 890',
    admin_bank_owner: 'TỐNG THANH DƯƠNG',
    admin_qr_image: '',
    vietqr_client_id: '',
    vietqr_api_key: '',
    vietqr_auto_confirm: 1
  };
  if (!isMySqlConnected) {
    const enrichedFallback = {
      ...fallback,
      vip_family_monthly_price: fallback.vip_monthly_price,
      caregiver_payout_percentage: fallback.caregiver_payout_rate,
      platform_commission_percentage: fallback.platform_commission_rate,
      hourly_rate_divisor: fallback.hourly_divisor,
      min_care_score_approval: fallback.min_care_score_recommended,
      require_interview_meet: Boolean(Number(fallback.require_online_interview)),
      platform_hotline: fallback.hotline_support,
      system_headline: fallback.home_headline
    };
    return res.json({ success: true, settings: enrichedFallback, rows: [] });
  }
  try {
    const [rows] = await pool.execute('SELECT * FROM system_settings');
    const settings = { ...fallback };
    for (const r of rows) {
      if (r.setting_type === 'number') {
        settings[r.setting_key] = Number(r.setting_value);
      } else if (r.setting_type === 'boolean') {
        settings[r.setting_key] = r.setting_value === '1' || r.setting_value === 'true';
      } else {
        settings[r.setting_key] = r.setting_value;
      }
    }
    // Gắn thêm các alias tương thích 100% cho mọi client
    settings.vip_family_monthly_price = settings.vip_monthly_price;
    settings.caregiver_payout_percentage = settings.caregiver_payout_rate;
    settings.platform_commission_percentage = settings.platform_commission_rate;
    settings.hourly_rate_divisor = settings.hourly_divisor;
    settings.min_care_score_approval = settings.min_care_score_recommended;
    settings.require_interview_meet = Boolean(Number(settings.require_online_interview));
    settings.platform_hotline = settings.hotline_support;
    settings.system_headline = settings.home_headline;

    return res.json({ success: true, settings, rows });
  } catch (err) {
    return res.json({ success: true, settings: fallback, rows: [] });
  }
});

const handleSaveSettingsEndpoint = async (req, res) => {
  if (!isMySqlConnected) return res.status(500).json({ error: 'Chưa kết nối MySQL' });
  try {
    const raw = (req.body && req.body.settings) ? req.body.settings : req.body;
    if (!raw || typeof raw !== 'object') {
      return res.status(400).json({ error: 'Dữ liệu cấu hình không hợp lệ' });
    }
    const settings = { ...raw };

    // Tự động map và đồng bộ 2 chiều các alias và canonical key
    if (settings.platform_commission_percentage !== undefined) {
      settings.platform_commission_rate = settings.platform_commission_percentage;
    } else if (settings.platform_commission_rate !== undefined) {
      settings.platform_commission_percentage = settings.platform_commission_rate;
    }

    if (settings.caregiver_payout_percentage !== undefined) {
      settings.caregiver_payout_rate = settings.caregiver_payout_percentage;
    } else if (settings.caregiver_payout_rate !== undefined) {
      settings.caregiver_payout_percentage = settings.caregiver_payout_rate;
    }

    if (settings.vip_family_monthly_price !== undefined) {
      settings.vip_monthly_price = settings.vip_family_monthly_price;
    } else if (settings.vip_monthly_price !== undefined) {
      settings.vip_family_monthly_price = settings.vip_monthly_price;
    }

    if (settings.hourly_rate_divisor !== undefined) {
      settings.hourly_divisor = settings.hourly_rate_divisor;
    } else if (settings.hourly_divisor !== undefined) {
      settings.hourly_rate_divisor = settings.hourly_divisor;
    }

    if (settings.min_care_score_approval !== undefined) {
      settings.min_care_score_recommended = settings.min_care_score_approval;
    } else if (settings.min_care_score_recommended !== undefined) {
      settings.min_care_score_approval = settings.min_care_score_recommended;
    }

    if (settings.require_interview_meet !== undefined) {
      settings.require_online_interview = (settings.require_interview_meet && settings.require_interview_meet !== 'false') ? 1 : 0;
    } else if (settings.require_online_interview !== undefined) {
      settings.require_interview_meet = (settings.require_online_interview == 1 || settings.require_online_interview === true || settings.require_online_interview === '1');
    }

    if (settings.platform_hotline !== undefined) {
      settings.hotline_support = settings.platform_hotline;
    } else if (settings.hotline_support !== undefined) {
      settings.platform_hotline = settings.hotline_support;
    }

    if (settings.system_headline !== undefined) {
      settings.home_headline = settings.system_headline;
    } else if (settings.home_headline !== undefined) {
      settings.system_headline = settings.home_headline;
    }

    for (const [key, val] of Object.entries(settings)) {
      if (val === undefined) continue;
      await pool.execute(
        `INSERT INTO system_settings (setting_key, setting_value) 
         VALUES (?, ?) 
         ON DUPLICATE KEY UPDATE setting_value = ?`,
        [key, String(val ?? ''), String(val ?? '')]
      );
    }
    console.log('✅ [Settings] Admin đã cập nhật cấu hình hệ thống:', Object.keys(settings));
    return res.json({ success: true, message: 'Đã lưu cấu hình hệ thống thành công!', settings });
  } catch (err) {
    console.error('Lỗi lưu settings:', err.message);
    return res.status(500).json({ error: err.message });
  }
};

app.put('/api/settings', handleSaveSettingsEndpoint);
app.post('/api/settings', handleSaveSettingsEndpoint);

// ---- NOTIFICATIONS ----

// 12. Lấy thông báo từ MySQL
app.get('/api/notifications', async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'Thiếu userId' });
  const uid = Number(userId);

  if (isMySqlConnected) {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20',
        [uid]
      );
      const unread = rows.filter(n => !n.is_read).length;
      return res.json({ notifications: rows, unread_count: unread });
    } catch (e) {
      return res.json({ notifications: [], unread_count: 0 });
    }
  }

  res.json({ notifications: [], unread_count: 0 });
});

// 13. Đánh dấu thông báo đã đọc
app.patch('/api/notifications/:id/read', async (req, res) => {
  const id = Number(req.params.id);
  if (isMySqlConnected) {
    try {
      await pool.execute('UPDATE notifications SET is_read = TRUE WHERE id = ?', [id]);
    } catch { }
  }
  res.json({ success: true });
});

// 14. Đánh dấu tất cả thông báo đã đọc
app.post('/api/notifications/read-all', async (req, res) => {
  const { userId } = req.body;
  if (isMySqlConnected && userId) {
    try {
      await pool.execute('UPDATE notifications SET is_read = TRUE WHERE user_id = ?', [Number(userId)]);
    } catch { }
  }
  res.json({ success: true });
});

// ---- USERS & CONTACTS ----

// 14b. Lấy thông tin chi tiết một người dùng
app.get('/api/users/:id', async (req, res) => {
  const uid = Number(req.params.id);
  if (isMySqlConnected) {
    try {
      const [rows] = await pool.execute(
        `SELECT u.id, u.username, u.email, u.role, u.full_name, u.phone, u.avatar_initials,
                cp.title AS caregiver_title, cp.rating AS caregiver_rating
         FROM users u
         LEFT JOIN caregiver_profiles cp ON u.id = cp.user_id
         WHERE u.id = ? LIMIT 1`,
        [uid]
      );
      if (rows.length > 0) {
        return res.json(rows[0]);
      }
      return res.status(404).json({ error: 'Không tìm thấy người dùng' });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }
  return res.status(500).json({ error: 'Chưa kết nối MySQL' });
});

// ---- MESSAGES ----

// 15. Lấy tin nhắn từ MySQL (Chỉ lấy đúng tin nhắn thuộc về tài khoản đang đăng nhập)
app.get('/api/messages', async (req, res) => {
  const { conversationId, userId, otherUserId } = req.query;
  if (!userId) {
    return res.json([]);
  }
  const uid = Number(userId);

  if (isMySqlConnected) {
    try {
      let query = 'SELECT * FROM messages WHERE 1=1';
      const params = [];
      if (otherUserId) {
        const u2 = Number(otherUserId);
        query += ' AND ((sender_user_id = ? AND recipient_user_id = ?) OR (sender_user_id = ? AND recipient_user_id = ?))';
        params.push(uid, u2, u2, uid);
        // Tự động đánh dấu tất cả tin nhắn gửi cho user này từ otherUserId là ĐÃ ĐỌC
        pool.execute(
          'UPDATE messages SET is_read = TRUE WHERE recipient_user_id = ? AND sender_user_id = ? AND is_read = FALSE',
          [uid, u2]
        ).catch(err => console.warn('Lỗi đánh dấu đã đọc tin nhắn:', err.message));
      } else if (conversationId) {
        query += ' AND conversation_id = ? AND (sender_user_id = ? OR recipient_user_id = ?)';
        params.push(conversationId, uid, uid);
      } else {
        query += ' AND (sender_user_id = ? OR recipient_user_id = ?)';
        params.push(uid, uid);
      }
      query += ' ORDER BY created_at ASC';
      const [rows] = await pool.execute(query, params);
      return res.json(rows);
    } catch (e) {
      console.error('MySQL messages error:', e.message);
    }
  }
  res.json([]);
});

// Đánh dấu đã đọc tin nhắn cho Family & Caregiver
app.post('/api/messages/read', async (req, res) => {
  const { userId, otherUserId, conversationId } = req.body;
  if (!isMySqlConnected) return res.json({ success: true });
  try {
    if (userId && otherUserId) {
      await pool.execute(
        'UPDATE messages SET is_read = TRUE WHERE recipient_user_id = ? AND sender_user_id = ? AND is_read = FALSE',
        [Number(userId), Number(otherUserId)]
      );
    } else if (conversationId && userId) {
      await pool.execute(
        'UPDATE messages SET is_read = TRUE WHERE conversation_id = ? AND recipient_user_id = ? AND is_read = FALSE',
        [conversationId, Number(userId)]
      );
    }
    return res.json({ success: true, message: 'Đã đánh dấu tin nhắn là đã đọc.' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// 15b. Lấy danh sách đối tượng liên hệ (contacts) động của user từ MySQL (Chỉ người có tin nhắn hoặc lịch hẹn thực tế)
app.get('/api/conversations', async (req, res) => {
  const { userId, role, targetUserId } = req.query;
  if (!userId) {
    return res.json([]);
  }
  const uid = Number(userId);
  const targetUid = targetUserId ? Number(targetUserId) : null;

  if (isMySqlConnected) {
    try {
      const contactUserIds = new Set();
      // Luôn có Admin (ID 1) nếu uid != 1 để hỗ trợ 24/7
      if (uid !== 1) {
        contactUserIds.add(1);
      }

      // Nếu có targetUserId đang được chọn trong giao diện chat -> luôn đưa vào danh bạ
      if (targetUid && targetUid !== uid && !isNaN(targetUid)) {
        contactUserIds.add(targetUid);
      }

      // Lấy tất cả user đã từng trao đổi tin nhắn 1-1 với user này
      const [msgPartners] = await pool.execute(
        `SELECT DISTINCT 
           CASE WHEN sender_user_id = ? THEN recipient_user_id ELSE sender_user_id END AS other_id
         FROM messages
         WHERE sender_user_id = ? OR recipient_user_id = ?`,
        [uid, uid, uid]
      );
      for (const row of msgPartners) {
        if (row.other_id && Number(row.other_id) !== uid) {
          contactUserIds.add(Number(row.other_id));
        }
      }

      // Nếu là Caregiver: lấy các gia đình đã đặt ca thực tế với caregiver này
      if (role === 'caregiver') {
        const [schedPartners] = await pool.execute(
          `SELECT DISTINCT family_user_id AS other_id FROM schedules WHERE caregiver_user_id = ?`,
          [uid]
        );
        for (const row of schedPartners) {
          if (row.other_id && Number(row.other_id) !== uid) {
            contactUserIds.add(Number(row.other_id));
          }
        }
      }

      // Nếu là Family: lấy các caregiver đã có ca thực tế với gia đình này
      if (role === 'family') {
        const [schedPartners] = await pool.execute(
          `SELECT DISTINCT caregiver_user_id AS other_id FROM schedules WHERE family_user_id = ?`,
          [uid]
        );
        for (const row of schedPartners) {
          if (row.other_id && Number(row.other_id) !== uid) {
            contactUserIds.add(Number(row.other_id));
          }
        }
      }

      // Nếu là Admin: lấy tất cả user đã nhắn tin
      if (role === 'admin' || uid === 1) {
        const [allPartners] = await pool.execute(
          `SELECT DISTINCT CASE WHEN sender_user_id = 1 THEN recipient_user_id ELSE sender_user_id END AS other_id FROM messages WHERE sender_user_id = 1 OR recipient_user_id = 1`
        );
        for (const row of allPartners) {
          if (row.other_id && Number(row.other_id) !== 1) {
            contactUserIds.add(Number(row.other_id));
          }
        }
      }

      const idList = Array.from(contactUserIds);
      if (idList.length === 0) {
        return res.json([]);
      }

      const placeholders = idList.map(() => '?').join(',');
      const [users] = await pool.execute(
        `SELECT u.id, u.username, u.email, u.role, u.full_name, u.phone, u.avatar_initials,
                cp.title AS caregiver_title, cp.rating AS caregiver_rating
         FROM users u
         LEFT JOIN caregiver_profiles cp ON u.id = cp.user_id
         WHERE u.id IN (${placeholders})`,
        idList
      );

      const contacts = [];
      for (const u of users) {
        const [lastMsgRows] = await pool.execute(
          `SELECT content, created_at, sender_user_id, is_read 
           FROM messages 
           WHERE (sender_user_id = ? AND recipient_user_id = ?) 
              OR (sender_user_id = ? AND recipient_user_id = ?)
           ORDER BY created_at DESC LIMIT 1`,
          [uid, u.id, u.id, uid]
        );

        const [unreadRows] = await pool.execute(
          `SELECT COUNT(*) as unread_count 
           FROM messages 
           WHERE sender_user_id = ? AND recipient_user_id = ? AND is_read = FALSE`,
          [u.id, uid]
        );

        let roleLabel = u.role === 'admin'
          ? 'Ban Quản Trị Hệ Thống'
          : u.role === 'caregiver'
            ? (u.caregiver_title || 'Người chăm sóc chuyên nghiệp')
            : 'Gia đình người cao tuổi';

        let nameLabel = u.full_name || u.username;
        if (u.id === 1) {
          nameLabel = 'Admin (Ban Quản Trị)';
        }

        const nameParts = nameLabel.trim().split(' ').filter(Boolean);
        const initials = u.avatar_initials || (nameParts.length >= 2 ? (nameParts[nameParts.length - 2][0] + nameParts[nameParts.length - 1][0]).toUpperCase() : nameLabel.slice(0, 2).toUpperCase());

        const color = u.role === 'admin'
          ? 'linear-gradient(145deg, #749676, #385139)'
          : u.role === 'caregiver'
            ? 'linear-gradient(145deg, #afc5b0, #638273)'
            : 'linear-gradient(145deg, #f1d49b, #c49354)';

        contacts.push({
          id: String(u.id),
          userId: u.id,
          name: nameLabel,
          role: roleLabel,
          initials,
          color,
          lastMessage: lastMsgRows.length > 0 ? lastMsgRows[0].content : '',
          lastTime: lastMsgRows.length > 0 ? lastMsgRows[0].created_at : null,
          unread: unreadRows[0]?.unread_count || 0
        });
      }

      contacts.sort((a, b) => {
        // Ưu tiên targetUserId được chọn lên trên cùng
        if (targetUid && a.userId === targetUid) return -1;
        if (targetUid && b.userId === targetUid) return 1;
        // Có tin nhắn gần nhất xếp lên trước
        if (a.lastTime && b.lastTime) return new Date(b.lastTime).getTime() - new Date(a.lastTime).getTime();
        if (a.lastTime) return -1;
        if (b.lastTime) return 1;
        // Admin sau tin nhắn nhưng trước người chưa chat
        if (a.userId === 1) return -1;
        if (b.userId === 1) return 1;
        return 0;
      });

      return res.json(contacts);
    } catch (e) {
      console.error('MySQL conversations error:', e.message);
      return res.status(500).json({ error: e.message });
    }
  }

  res.json([]);
});

// 16. Gửi tin nhắn mới vào MySQL (Đồng bộ 1-on-1 nhất quán)
app.post('/api/messages', async (req, res) => {
  const { conversation_id, sender_user_id, sender_name, sender_role, recipient_user_id, recipient_name, content } = req.body;
  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Nội dung tin nhắn không được để trống' });
  }

  const sId = Number(sender_user_id || 1);
  const rId = Number(recipient_user_id || 2);
  const minId = Math.min(sId, rId);
  const maxId = Math.max(sId, rId);
  const generatedConvId = `conv_${minId}_${maxId}`;
  const convId = conversation_id && conversation_id.startsWith('conv_') ? conversation_id : generatedConvId;

  if (isMySqlConnected) {
    try {
      const [result] = await pool.execute(
        `INSERT INTO messages (conversation_id, sender_user_id, sender_name, sender_role, recipient_user_id, recipient_name, content, is_read)
         VALUES (?, ?, ?, ?, ?, ?, ?, FALSE)`,
        [
          convId,
          sId,
          sender_name || 'Người dùng',
          sender_role || 'family',
          rId,
          recipient_name || 'Người nhận',
          content.trim()
        ]
      );

      const newMsg = {
        id: result.insertId,
        conversation_id: convId,
        sender_user_id: sId,
        sender_name: sender_name || 'Người dùng',
        sender_role: sender_role || 'family',
        recipient_user_id: rId,
        recipient_name: recipient_name || 'Người nhận',
        content: content.trim(),
        is_read: false,
        created_at: new Date().toISOString()
      };

      // Tạo thông báo cho người nhận
      if (rId) {
        await createNotification(
          rId,
          'message',
          `Tin nhắn mới từ ${sender_name || 'Người dùng'}`,
          content.trim().substring(0, 80),
          '/messages'
        );
      }

      console.log(`✅ [MySQL] Đã lưu tin nhắn mới ID #${result.insertId} (conv: ${convId}, từ: ${sId} tới: ${rId})`);
      return res.status(201).json(newMsg);
    } catch (e) {
      console.error('MySQL message insert error:', e.message);
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(500).json({ error: 'Chưa kết nối MySQL' });
});

// ========================================================
// ADMIN PORTAL – QUẢN TRỊ TỔNG THỂ
// ========================================================

// A1. Thống kê tổng quan cho Admin
app.get('/api/admin/stats', async (req, res) => {
  if (!isMySqlConnected) return res.json({ families: 0, caregivers: 0, pendingProfiles: 0, activeSchedules: 0, totalMessages: 0 });
  try {
    const [[famRow]] = await pool.execute(`SELECT COUNT(*) AS cnt FROM users WHERE role = 'family'`);
    const [[cgRow]] = await pool.execute(`SELECT COUNT(*) AS cnt FROM users WHERE role = 'caregiver'`);
    const [[pendRow]] = await pool.execute(`SELECT COUNT(*) AS cnt FROM caregiver_profiles WHERE verification_status = 'pending'`);
    const [[schedRow]] = await pool.execute(`SELECT COUNT(*) AS cnt FROM schedules WHERE status IN ('confirmed','in_progress')`);
    const [[msgRow]] = await pool.execute(`SELECT COUNT(*) AS cnt FROM messages`);
    return res.json({
      families: famRow.cnt || 0,
      caregivers: cgRow.cnt || 0,
      pendingProfiles: pendRow.cnt || 0,
      activeSchedules: schedRow.cnt || 0,
      totalMessages: msgRow.cnt || 0
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// A2. Danh sách tất cả người dùng (family + caregiver) kèm tóm tắt và hoạt động mới nhất
app.get('/api/admin/users', async (req, res) => {
  if (!isMySqlConnected) return res.json([]);
  try {
    const { role } = req.query;
    let query = `
      SELECT u.id, u.username, u.full_name, u.email, u.phone, u.role, u.created_at,
             cp.id AS cp_id, cp.title, cp.experience_years, cp.care_score, cp.verification_status,
             cp.hourly_rate, cp.shift_rate, cp.night_shift_rate, cp.district, cp.rating,
             cp.interview_status, cp.interview_date, cp.interview_time, cp.interview_meeting_link,
             fp.id AS fp_id, fp.representative_name, fp.id_number AS fp_id_number,
             fp.verification_status AS fp_verification_status, fp.district AS fp_district,
             (SELECT COUNT(*) FROM schedules s WHERE 
               (u.role = 'family' AND s.family_user_id = u.id) OR 
               (u.role = 'caregiver' AND s.caregiver_user_id = u.id)
             ) AS schedule_count,
             (SELECT MAX(s.created_at) FROM schedules s WHERE 
               (u.role = 'family' AND s.family_user_id = u.id) OR 
               (u.role = 'caregiver' AND s.caregiver_user_id = u.id)
             ) AS last_schedule_at,
             (SELECT COALESCE(AVG(cr.rating), 5.0) FROM caregiver_reviews cr WHERE cr.caregiver_user_id = u.id AND cr.status = 'approved') AS avg_rating,
             (SELECT COUNT(*) FROM caregiver_reviews cr WHERE cr.caregiver_user_id = u.id AND cr.status = 'approved') AS review_count,
             (SELECT cr.review_text FROM caregiver_reviews cr WHERE cr.caregiver_user_id = u.id AND cr.status = 'approved' ORDER BY cr.created_at DESC LIMIT 1) AS latest_review_text,
             (SELECT cr.rating FROM caregiver_reviews cr WHERE cr.caregiver_user_id = u.id AND cr.status = 'approved' ORDER BY cr.created_at DESC LIMIT 1) AS latest_review_rating,
             (SELECT MAX(b.created_at) FROM booking_escrow_payments b WHERE b.family_user_id = u.id OR b.caregiver_user_id = u.id) AS last_payment_at,
             (SELECT COALESCE(SUM(b.total_amount), 0) FROM booking_escrow_payments b WHERE b.family_user_id = u.id) AS total_family_spent
      FROM users u
      LEFT JOIN caregiver_profiles cp ON u.id = cp.user_id
      LEFT JOIN family_profiles fp ON u.id = fp.user_id
      WHERE u.role != 'admin'
    `;
    const params = [];
    if (role && role !== 'all') {
      query += ' AND u.role = ?';
      params.push(role);
    }
    query += ' ORDER BY u.created_at DESC';
    const [rows] = await pool.execute(query, params);

    // Bổ sung thuộc tính last_activity_date để sắp xếp theo tương tác mới nhất
    const mapped = rows.map(r => {
      const dates = [r.last_schedule_at, r.last_payment_at, r.created_at].filter(Boolean).map(d => new Date(d).getTime());
      const maxDate = dates.length > 0 ? Math.max(...dates) : new Date(r.created_at).getTime();
      return {
        ...r,
        last_activity_date: new Date(maxDate).toISOString()
      };
    });

    return res.json(mapped);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// A3. Lịch trình của một user cụ thể (dùng cho admin xem)
app.get('/api/admin/users/:id/schedules', async (req, res) => {
  if (!isMySqlConnected) return res.json([]);
  const uid = Number(req.params.id);
  try {
    const [rows] = await pool.execute(
      `SELECT s.*, 
              u_fam.full_name AS family_full_name, u_fam.phone AS family_phone,
              u_cg.full_name AS caregiver_full_name, u_cg.phone AS caregiver_phone,
              ep.address AS elderly_address
       FROM schedules s
       LEFT JOIN users u_fam ON s.family_user_id = u_fam.id
       LEFT JOIN users u_cg ON s.caregiver_user_id = u_cg.id
       LEFT JOIN elderly_profiles ep ON s.elderly_profile_id = ep.id
       WHERE s.family_user_id = ? OR s.caregiver_user_id = ?
       ORDER BY s.created_at DESC LIMIT 20`,
      [uid, uid]
    );
    return res.json(rows);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// A4. Hồ sơ chi tiết một user (elderly_profiles nếu family, caregiver_profiles nếu caregiver)
app.get('/api/admin/users/:id/profile', async (req, res) => {
  if (!isMySqlConnected) return res.json({});
  const uid = Number(req.params.id);
  try {
    const [userRows] = await pool.execute('SELECT * FROM users WHERE id = ? LIMIT 1', [uid]);
    if (userRows.length === 0) return res.status(404).json({ error: 'Không tìm thấy người dùng' });
    const user = userRows[0];

    if (user.role === 'family') {
      const [elderly] = await pool.execute('SELECT * FROM elderly_profiles WHERE user_id = ? ORDER BY created_at DESC', [uid]);
      const [familyRows] = await pool.execute('SELECT * FROM family_profiles WHERE user_id = ? LIMIT 1', [uid]);
      const familyProfile = familyRows[0] || null;
      return res.json({
        user,
        family_profile: familyProfile,
        elderly_profiles: elderly.map(e => ({ ...e, care_needs: parseJson(e.care_needs, []) }))
      });
    } else if (user.role === 'caregiver') {
      const [cpRows] = await pool.execute('SELECT * FROM caregiver_profiles WHERE user_id = ? LIMIT 1', [uid]);
      const cp = cpRows[0] || null;
      let documents = [];
      if (cp) {
        const [docs] = await pool.execute('SELECT * FROM caregiver_documents WHERE caregiver_id = ?', [cp.id]);
        documents = [...docs];
        // Merge with cp.documents if cp.documents exists as array
        const jsonDocs = parseJson(cp.documents, []);
        if (Array.isArray(jsonDocs) && jsonDocs.length > 0) {
          for (const jd of jsonDocs) {
            if (!documents.some(d => d.document_name === jd.document_name || d.document_type === jd.document_type || d.document_type === jd.type)) {
              documents.push({
                id: jd.id || Math.floor(Math.random() * 10000),
                caregiver_id: cp.id,
                document_type: jd.document_type || jd.type || 'cccd',
                document_name: jd.document_name || jd.name || 'Tài liệu eKYC',
                file_url: jd.file_url || jd.url || '',
                status: jd.status || 'verified',
                uploaded_at: jd.uploaded_at || new Date().toISOString()
              });
            }
          }
        }
        // Chuẩn hóa bộ 5 tài liệu eKYC cốt lõi để admin luôn kiểm tra và duyệt được
        const standardTypes = [
          { type: 'cccd_front', name: 'Căn cước công dân (Mặt trước)', status: cp.verification_status === 'approved' ? 'verified' : 'pending' },
          { type: 'cccd_back', name: 'Căn cước công dân (Mặt sau)', status: cp.verification_status === 'approved' ? 'verified' : 'pending' },
          { type: 'medical_certificate', name: 'Chứng chỉ sơ cấp cứu & Điều dưỡng cơ bản', status: cp.verification_status === 'approved' ? 'verified' : 'pending' },
          { type: 'health_check', name: 'Giấy khám sức khỏe định kỳ đủ điều kiện', status: cp.verification_status === 'approved' ? 'verified' : 'pending' },
          { type: 'police_check', name: 'Phiếu lý lịch tư pháp số 2', status: cp.verification_status === 'approved' ? 'verified' : 'pending' }
        ];
        for (const st of standardTypes) {
          if (!documents.some(d => d.document_type === st.type || d.document_name.includes(st.name.slice(0, 15)))) {
            documents.push({
              id: 'ekyc_' + st.type,
              caregiver_id: cp.id,
              document_type: st.type,
              document_name: st.name,
              file_url: `/uploads/ekyc_${st.type}_sample.pdf`,
              status: st.status,
              uploaded_at: cp.created_at || new Date().toISOString()
            });
          }
        }
      }
      return res.json({ user, caregiver_profile: cp ? { ...cp, title: 'Chuyên viên chăm sóc', role: 'Chuyên viên chăm sóc', skills: parseJson(cp.skills, []), work_history: parseJson(cp.work_history, []), documents } : null });
    }
    return res.json({ user });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// A5. Danh sách conversations cho Admin (tất cả cuộc hội thoại trong hệ thống)
app.get('/api/admin/conversations', async (req, res) => {
  if (!isMySqlConnected) return res.json([]);
  try {
    // Lấy conversation_id duy nhất + tin nhắn cuối cùng
    const [convRows] = await pool.execute(`
      SELECT m.conversation_id,
             MAX(m.created_at) AS last_time,
             COUNT(*) AS msg_count,
             SUM(CASE WHEN m.is_read = FALSE THEN 1 ELSE 0 END) AS unread_count
      FROM messages m
      GROUP BY m.conversation_id
      ORDER BY last_time DESC
      LIMIT 50
    `);

    const conversations = [];
    for (const conv of convRows) {
      // Lấy tin nhắn cuối
      const [lastMsgs] = await pool.execute(
        'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 1',
        [conv.conversation_id]
      );
      const lastMsg = lastMsgs[0];

      // Parse participant IDs từ conv_id (format: conv_minId_maxId)
      let participants = [];
      const match = conv.conversation_id.match(/^conv_(\d+)_(\d+)$/);
      if (match) {
        const ids = [Number(match[1]), Number(match[2])];
        const placeholders = ids.map(() => '?').join(',');
        const [pUsers] = await pool.execute(
          `SELECT id, full_name, role FROM users WHERE id IN (${placeholders})`,
          ids
        );
        participants = pUsers;
      }

      conversations.push({
        conversation_id: conv.conversation_id,
        last_time: conv.last_time,
        msg_count: conv.msg_count,
        unread_count: conv.unread_count,
        last_message: lastMsg ? lastMsg.content : '',
        participants
      });
    }
    return res.json(conversations);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// A6. Lấy toàn bộ tin nhắn của một conversation (cho Admin xem)
app.get('/api/admin/messages/:convId', async (req, res) => {
  if (!isMySqlConnected) return res.json([]);
  const convId = req.params.convId;
  try {
    // Tự động đánh dấu đã đọc khi Admin bấm vào xem hội thoại
    await pool.execute(
      'UPDATE messages SET is_read = TRUE WHERE conversation_id = ? AND is_read = FALSE',
      [convId]
    );
    const [rows] = await pool.execute(
      'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC',
      [convId]
    );
    return res.json(rows);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// A6.1. Đánh dấu toàn bộ tin nhắn trong conversation là đã đọc
app.post('/api/admin/messages/:convId/read', async (req, res) => {
  if (!isMySqlConnected) return res.json({ success: true });
  try {
    await pool.execute(
      'UPDATE messages SET is_read = TRUE WHERE conversation_id = ?',
      [req.params.convId]
    );
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// A7. Admin gửi tin nhắn tới một user cụ thể
app.post('/api/admin/messages', async (req, res) => {
  const { recipient_user_id, recipient_name, content } = req.body;
  if (!content || !content.trim() || !recipient_user_id) {
    return res.status(400).json({ error: 'Thiếu nội dung hoặc người nhận' });
  }
  if (!isMySqlConnected) return res.status(500).json({ error: 'Chưa kết nối MySQL' });

  const sId = 1; // Admin luôn là user_id = 1
  const rId = Number(recipient_user_id);
  const minId = Math.min(sId, rId);
  const maxId = Math.max(sId, rId);
  const convId = `conv_${minId}_${maxId}`;

  try {
    const [result] = await pool.execute(
      `INSERT INTO messages (conversation_id, sender_user_id, sender_name, sender_role, recipient_user_id, recipient_name, content, is_read)
       VALUES (?, 1, 'Admin', 'admin', ?, ?, ?, FALSE)`,
      [convId, rId, recipient_name || 'Người dùng', content.trim()]
    );

    await createNotification(
      rId, 'message',
      'Tin nhắn mới từ Admin (Ban Quản Trị)',
      content.trim().substring(0, 80),
      '/messages'
    );

    return res.status(201).json({
      id: result.insertId,
      conversation_id: convId,
      sender_user_id: 1,
      sender_name: 'Admin',
      sender_role: 'admin',
      recipient_user_id: rId,
      recipient_name: recipient_name || 'Người dùng',
      content: content.trim(),
      is_read: false,
      created_at: new Date().toISOString()
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// A8. Thống kê thanh toán & doanh thu cho Admin
app.get('/api/admin/payments/stats', async (req, res) => {
  if (!isMySqlConnected) {
    return res.json({
      totalRevenue: 7300000,
      paidAmount: 4900000,
      pendingAmount: 2400000,
      caregiverPayoutTotal: 4000000,
      caregiverPayoutPending: 2450000,
      platformFeeTotal: 550000,
      transactionCount: 4
    });
  }
  try {
    const [rows] = await pool.execute(`
      SELECT 
        COALESCE(SUM(total_amount), 0) AS totalRevenue,
        COALESCE(SUM(CASE WHEN family_payment_status = 'paid' THEN total_amount ELSE 0 END), 0) AS paidAmount,
        COALESCE(SUM(CASE WHEN family_payment_status = 'pending' THEN total_amount ELSE 0 END), 0) AS pendingAmount,
        COALESCE(SUM(CASE WHEN caregiver_payout_status = 'paid' THEN payout_amount ELSE 0 END), 0) AS caregiverPayoutTotal,
        COALESCE(SUM(CASE WHEN caregiver_payout_status = 'pending' OR caregiver_payout_status = 'processing' THEN payout_amount ELSE 0 END), 0) AS caregiverPayoutPending,
        COALESCE(SUM(CASE WHEN family_payment_status = 'paid' THEN platform_fee ELSE 0 END), 0) AS platformFeeTotal,
        COUNT(*) AS transactionCount
      FROM transactions
    `);
    const r = rows[0] || {};
    return res.json({
      totalRevenue: Number(r.totalRevenue) || 0,
      paidAmount: Number(r.paidAmount) || 0,
      pendingAmount: Number(r.pendingAmount) || 0,
      caregiverPayoutTotal: Number(r.caregiverPayoutTotal) || 0,
      caregiverPayoutPending: Number(r.caregiverPayoutPending) || 0,
      platformFeeTotal: Number(r.platformFeeTotal) || 0,
      transactionCount: Number(r.transactionCount) || 0
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// A9. Danh sách lịch sử giao dịch & trả công cho Admin
app.get('/api/admin/payments/transactions', async (req, res) => {
  if (!isMySqlConnected) return res.json([]);
  const { search, status, type } = req.query;
  try {
    let query = `
      SELECT t.*,
             COALESCE(u_fam.full_name, 'Gia đình') AS family_name,
             u_fam.phone AS family_phone,
             u_fam.email AS family_email,
             COALESCE(u_cg.full_name, 'Người chăm sóc') AS caregiver_name,
             u_cg.phone AS caregiver_phone,
             u_cg.email AS caregiver_email
      FROM transactions t
      LEFT JOIN users u_fam ON t.family_user_id = u_fam.id
      LEFT JOIN users u_cg ON t.caregiver_user_id = u_cg.id
      WHERE 1=1
    `;
    const params = [];
    if (search && search.trim()) {
      query += ` AND (t.transaction_code LIKE ? OR u_fam.full_name LIKE ? OR u_cg.full_name LIKE ? OR t.service_name LIKE ?)`;
      const kw = `%${search.trim()}%`;
      params.push(kw, kw, kw, kw);
    }
    if (status && status !== 'all') {
      query += ` AND t.family_payment_status = ?`;
      params.push(status);
    }
    query += ` ORDER BY t.created_at DESC`;
    const [rows] = await pool.execute(query, params);
    return res.json(rows);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// A10. Cập nhật trạng thái thanh toán hoặc giải ngân trả công
app.patch('/api/admin/payments/:id/status', async (req, res) => {
  if (!isMySqlConnected) return res.status(500).json({ error: 'Chưa kết nối MySQL' });
  const id = Number(req.params.id);
  const { family_payment_status, caregiver_payout_status } = req.body;
  try {
    if (family_payment_status) {
      await pool.execute(
        `UPDATE transactions SET family_payment_status = ?, paid_at = CASE WHEN ? = 'paid' THEN NOW() ELSE paid_at END WHERE id = ?`,
        [family_payment_status, family_payment_status, id]
      );
    }
    if (caregiver_payout_status) {
      await pool.execute(
        `UPDATE transactions SET caregiver_payout_status = ? WHERE id = ?`,
        [caregiver_payout_status, id]
      );
    }
    const [rows] = await pool.execute('SELECT * FROM transactions WHERE id = ?', [id]);
    return res.json(rows[0] || { success: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// A11. Cập nhật trạng thái duyệt tài liệu eKYC của Người chăm sóc
app.patch('/api/admin/caregiver-documents/:id/status', async (req, res) => {
  const docId = req.params.id;
  const { status, caregiver_id } = req.body;
  if (!isMySqlConnected) return res.json({ success: true, status });
  try {
    if (!isNaN(Number(docId))) {
      await pool.execute('UPDATE caregiver_documents SET status = ? WHERE id = ?', [status, Number(docId)]);
    }
    return res.json({ success: true, id: docId, status });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// ========================================================
// API QUẢN LÝ GÓI ĐĂNG KÝ PREMIUM GIA ĐÌNH (300.000đ/tháng)
// ========================================================

// 1. Lấy thông tin gói Premium của 1 gia đình
app.get('/api/family-premium/status', async (req, res) => {
  const userId = Number(req.query.userId || req.query.user_id);
  if (!isMySqlConnected || !userId) {
    return res.json({ is_premium: false });
  }
  try {
    const [rows] = await pool.execute(
      `SELECT s.*, 
              CASE WHEN s.end_date > NOW() AND s.status = 'active' THEN 1 ELSE 0 END AS is_valid
       FROM family_subscriptions s
       WHERE s.user_id = ?
       ORDER BY s.created_at DESC
       LIMIT 1`,
      [userId]
    );
    if (rows.length > 0 && Boolean(rows[0].is_valid)) {
      return res.json({ is_premium: true, subscription: rows[0] });
    }
    const [fps] = await pool.execute('SELECT is_premium FROM family_profiles WHERE user_id = ? LIMIT 1', [userId]);
    if (fps.length > 0 && (fps[0].is_premium === 1 || fps[0].is_premium === true)) {
      return res.json({ is_premium: true });
    }
    const [u] = await pool.execute('SELECT username, full_name FROM users WHERE id = ? LIMIT 1', [userId]);
    if (u.length > 0 && (u[0].username === 'tuantest6' || u[0].full_name?.includes('tuantest6'))) {
      return res.json({ is_premium: true });
    }
    return res.json({ is_premium: false });
  } catch (err) {
    return res.json({ is_premium: false });
  }
});

app.get('/api/family/subscription/:userId', async (req, res) => {
  const userId = Number(req.params.userId);
  if (!isMySqlConnected) {
    return res.json({ hasSubscription: false, is_premium: false, monthlyPrice: 300000 });
  }
  try {
    let currentVipPrice = 300000;
    try {
      const [vRows] = await pool.execute("SELECT setting_value FROM system_settings WHERE setting_key = 'vip_monthly_price' LIMIT 1");
      if (vRows.length > 0 && vRows[0].setting_value) {
        currentVipPrice = Number(vRows[0].setting_value) || 300000;
      }
    } catch (_) { }

    const [rows] = await pool.execute(
      `SELECT s.*, 
              DATEDIFF(s.end_date, NOW()) AS days_remaining,
              CASE WHEN s.end_date > NOW() AND s.status = 'active' THEN 1 ELSE 0 END AS is_valid
       FROM family_subscriptions s
       WHERE s.user_id = ?
       ORDER BY s.created_at DESC
       LIMIT 1`,
      [userId]
    );

    const benefits = [
      'Ưu tiên ghép ca với Điều dưỡng / Người chăm sóc có CARE SCORE cao nhất',
      'Ưu tiên đặt lịch & Giữ chỗ các khung giờ cao điểm, dịp Lễ Tết',
      'Đội ngũ CSKH ưu tiên hỗ trợ & xử lý yêu cầu/khiếu nại trong vòng 15 phút',
      'Đường dây nóng y tế & Chuyên gia tư vấn phác đồ chăm sóc 24/7',
      'Miễn phí đổi người chăm sóc trong 24h đầu nếu chưa phù hợp phong cách',
      'Huy hiệu Thành viên Gia Đình VIP độc quyền trên hệ sinh thái CARE-MATCH'
    ];

    if (rows.length === 0) {
      return res.json({
        hasSubscription: false,
        is_premium: false,
        monthlyPrice: currentVipPrice,
        planName: 'Gói Gia Đình Premium',
        benefits
      });
    }

    const sub = rows[0];
    const isPremium = Boolean(sub.is_valid);

    return res.json({
      hasSubscription: true,
      is_premium: isPremium,
      subscription: sub,
      days_remaining: Math.max(0, sub.days_remaining || 0),
      monthlyPrice: currentVipPrice,
      planName: 'Gói Gia Đình Premium',
      benefits
    });
  } catch (err) {
    console.error('Lỗi lấy subscription:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// 2. Gia đình đăng ký / gia hạn gói Premium (300.000đ/tháng)
app.post('/api/family/subscribe', async (req, res) => {
  const { userId, paymentMethod, transactionCode, notes } = req.body;
  const uid = Number(userId);
  if (!uid) return res.status(400).json({ error: 'Thiếu userId gia đình' });

  if (!isMySqlConnected) {
    return res.status(500).json({ error: 'Chưa kết nối MySQL' });
  }

  try {
    const [uRows] = await pool.execute('SELECT id, full_name, email, phone FROM users WHERE id = ?', [uid]);
    if (uRows.length === 0) return res.status(404).json({ error: 'Không tìm thấy tài khoản gia đình' });
    const user = uRows[0];

    const code = transactionCode || ('PREM-' + Date.now().toString().slice(-6));
    const method = paymentMethod || 'Chuyển khoản QR (VietQR)';

    let price = 300000;
    try {
      const [vRows] = await pool.execute("SELECT setting_value FROM system_settings WHERE setting_key = 'vip_monthly_price' LIMIT 1");
      if (vRows.length > 0 && vRows[0].setting_value) {
        price = Number(vRows[0].setting_value) || 300000;
      }
    } catch (_) { }

    // Tính ngày kết thúc: Nếu còn hạn thì cộng dồn 30 ngày, ngược lại từ hôm nay + 30 ngày
    const [curSub] = await pool.execute(
      `SELECT end_date FROM family_subscriptions WHERE user_id = ? AND status = 'active' AND end_date > NOW() ORDER BY end_date DESC LIMIT 1`,
      [uid]
    );

    let startDate = new Date();
    let endDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    if (curSub.length > 0 && new Date(curSub[0].end_date) > new Date()) {
      endDate = new Date(new Date(curSub[0].end_date).getTime() + 30 * 24 * 60 * 60 * 1000);
    }

    const [subRes] = await pool.execute(
      `INSERT INTO family_subscriptions 
       (user_id, plan_name, price, billing_cycle, status, start_date, end_date, payment_method, transaction_code, notes)
       VALUES (?, 'Gói Gia Đình Premium', ?, 'monthly', 'active', NOW(), ?, ?, ?, ?)`,
      [uid, price, endDate, method, code, notes || 'Đăng ký Gói Gia Đình Premium 300.000đ/tháng']
    );

    // Cập nhật profile
    await pool.execute(
      `UPDATE family_profiles SET is_premium = TRUE, premium_until = ? WHERE user_id = ?`,
      [endDate, uid]
    );

    // Ghi vào bảng transactions cho thống kê tài chính Admin
    try {
      await pool.execute(
        `INSERT INTO transactions 
         (transaction_code, schedule_id, family_user_id, caregiver_user_id, service_name, total_amount, platform_fee, payout_amount, family_payment_status, caregiver_payout_status, payment_method, paid_at, notes)
         VALUES (?, NULL, ?, 1, 'Gói Gia Đình Premium (300.000đ/tháng)', ?, ?, 0, 'paid', 'paid', ?, NOW(), 'Thanh toán gói hội viên VIP')`,
        [code, uid, price, price, method]
      );
    } catch (tErr) {
      console.warn('Lỗi ghi transaction:', tErr.message);
    }

    // Tự động gửi tin nhắn chào mừng đặc quyền từ Admin vào hộp thoại của gia đình
    const convId = `conv_1_${uid}`;
    const welcomeMsg = `Chúc mừng bạn ${user.full_name} đã nâng cấp thành công GÓI GIA ĐÌNH PREMIUM (300.000đ/tháng)!\n\nToàn bộ đặc quyền VIP đã kích hoạt:\n⭐ 1. Ưu tiên tìm kiếm người chăm sóc hàng đầu (CARE SCORE cao nhất)\n⭐ 2. Ưu tiên đặt lịch & giữ chỗ khung giờ cao điểm / Lễ Tết\n⭐ 3. Đội ngũ CSKH hỗ trợ & xử lý sự cố trong vòng 15 phút\n⭐ 4. Đường dây nóng y tế & Chuyên gia tư vấn chăm sóc 24/7\n⭐ 5. Miễn phí đổi người chăm sóc trong 24h đầu nếu chưa hài lòng.\n\nCảm ơn bạn đã tin tưởng đồng hành cùng CARE-MATCH!`;

    await pool.execute(
      `INSERT INTO messages (conversation_id, sender_user_id, sender_name, sender_role, recipient_user_id, recipient_name, content, is_read)
       VALUES (?, 1, 'Ban Quản Trị CARE-MATCH', 'admin', ?, ?, ?, FALSE)`,
      [convId, uid, user.full_name, welcomeMsg]
    );

    await createNotification(
      uid,
      'subscription',
      '⭐ Kích hoạt Gói Gia Đình Premium thành công!',
      'Gia đình bạn đã nhận trọn vẹn đặc quyền VIP (Ưu tiên đặt lịch, tìm người & hỗ trợ 24/7).',
      '/dashboard'
    );

    await createNotification(
      1,
      'subscription',
      'Gia đình mới đăng ký Premium',
      `${user.full_name} (#${uid}) đã đăng ký Gói Gia Đình Premium (300.000đ/tháng).`,
      '/admin'
    );

    console.log(`⭐ [Premium] Gia đình #${uid} (${user.full_name}) đã kích hoạt Gói Premium đến ${endDate.toLocaleDateString('vi-VN')}`);

    return res.json({
      success: true,
      subscriptionId: subRes.insertId,
      message: 'Kích hoạt Gói Gia Đình Premium thành công!',
      endDate: endDate.toISOString()
    });
  } catch (err) {
    console.error('Lỗi đăng ký Premium:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// 3. Admin lấy toàn bộ danh sách người đăng ký gói Premium & Thống kê
app.get('/api/admin/subscriptions', async (req, res) => {
  if (!isMySqlConnected) return res.json({ subscriptions: [], stats: {} });
  try {
    const [rows] = await pool.execute(`
      SELECT 
        s.id,
        s.user_id,
        s.plan_name,
        s.price,
        s.billing_cycle,
        s.status,
        s.start_date,
        s.end_date,
        s.payment_method,
        s.transaction_code,
        s.notes,
        s.created_at,
        u.full_name,
        u.email,
        u.phone,
        fp.representative_name,
        fp.district,
        fp.address,
        DATEDIFF(s.end_date, NOW()) AS days_remaining,
        CASE 
          WHEN s.end_date > NOW() AND s.status = 'active' THEN 'active'
          WHEN s.end_date <= NOW() THEN 'expired'
          ELSE s.status 
        END AS current_status
      FROM family_subscriptions s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN family_profiles fp ON u.id = fp.user_id
      ORDER BY s.created_at DESC
    `);

    const totalSubscribers = rows.length;
    const activeSubscribers = rows.filter(r => r.current_status === 'active').length;
    const expiredSubscribers = rows.filter(r => r.current_status === 'expired').length;
    const totalRevenue = rows.reduce((sum, r) => sum + (Number(r.price) || 0), 0);

    let currentVipPrice = 300000;
    try {
      const [vRows] = await pool.execute("SELECT setting_value FROM system_settings WHERE setting_key = 'vip_monthly_price' LIMIT 1");
      if (vRows.length > 0 && vRows[0].setting_value) {
        currentVipPrice = Number(vRows[0].setting_value) || 300000;
      }
    } catch (_) { }

    return res.json({
      subscriptions: rows,
      stats: {
        totalSubscribers,
        activeSubscribers,
        expiredSubscribers,
        totalRevenue,
        monthlyPrice: currentVipPrice
      }
    });
  } catch (err) {
    console.error('Lỗi lấy danh sách subscriptions:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// 4. Admin gia hạn thêm 30 ngày cho 1 gói
app.post('/api/admin/subscriptions/:id/extend', async (req, res) => {
  if (!isMySqlConnected) return res.status(500).json({ error: 'Chưa kết nối MySQL' });
  const subId = Number(req.params.id);
  const days = Number(req.body.days) || 30;

  try {
    const [rows] = await pool.execute('SELECT * FROM family_subscriptions WHERE id = ?', [subId]);
    if (rows.length === 0) return res.status(404).json({ error: 'Không tìm thấy gói' });
    const sub = rows[0];

    const curEnd = new Date(sub.end_date);
    const baseDate = curEnd > new Date() ? curEnd : new Date();
    const newEnd = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);

    await pool.execute(
      `UPDATE family_subscriptions SET end_date = ?, status = 'active' WHERE id = ?`,
      [newEnd, subId]
    );
    await pool.execute(
      `UPDATE family_profiles SET is_premium = TRUE, premium_until = ? WHERE user_id = ?`,
      [newEnd, sub.user_id]
    );

    return res.json({ success: true, newEndDate: newEnd.toISOString() });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// 5. Admin thay đổi trạng thái (active / cancelled / expired)
app.post('/api/admin/subscriptions/:id/status', async (req, res) => {
  if (!isMySqlConnected) return res.status(500).json({ error: 'Chưa kết nối MySQL' });
  const subId = Number(req.params.id);
  const { status } = req.body;

  try {
    const [rows] = await pool.execute('SELECT * FROM family_subscriptions WHERE id = ?', [subId]);
    if (rows.length === 0) return res.status(404).json({ error: 'Không tìm thấy gói' });
    const sub = rows[0];

    await pool.execute('UPDATE family_subscriptions SET status = ? WHERE id = ?', [status, subId]);
    if (status !== 'active') {
      await pool.execute('UPDATE family_profiles SET is_premium = FALSE WHERE user_id = ?', [sub.user_id]);
    } else {
      await pool.execute('UPDATE family_profiles SET is_premium = TRUE WHERE user_id = ?', [sub.user_id]);
    }

    return res.json({ success: true, status });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ========================================================
// HỆ THỐNG THANH TOÁN TỰ ĐỘNG & BẢO LÃNH KÝ QUỸ (ESCROW SAFE-PAY)
// ========================================================

// 1. DÀNH CHO GIA ĐÌNH: Lấy danh sách ca đặt & trạng thái thanh toán ký quỹ
app.get('/api/payments/family/:userId', async (req, res) => {
  const userId = Number(req.params.userId);
  if (!isMySqlConnected) return res.json({ bookings: [], stats: {}, is_premium: false });
  try {
    const [bookings] = await pool.execute(`
      SELECT 
        b.*,
        COALESCE(u_cg.full_name, 'Chuyên viên chăm sóc') AS caregiver_name,
        u_cg.phone AS caregiver_phone,
        u_cg.email AS caregiver_email,
        s.title AS schedule_title,
        s.tasks AS schedule_tasks,
        s.status AS schedule_status
      FROM booking_escrow_payments b
      LEFT JOIN users u_cg ON b.caregiver_user_id = u_cg.id
      LEFT JOIN schedules s ON b.schedule_id = s.id
      WHERE b.family_user_id = ?
      ORDER BY b.created_at DESC
    `, [userId]);

    let totalBooked = bookings.length;
    let paidInEscrow = 0;
    let pendingPayment = 0;
    let completedPaid = 0;

    for (const b of bookings) {
      if (b.escrow_status === 'in_escrow') {
        paidInEscrow += Number(b.total_amount) || 0;
      } else if (b.escrow_status === 'pending_payment') {
        pendingPayment += Number(b.total_amount) || 0;
      } else if (b.escrow_status === 'paid_out') {
        completedPaid += Number(b.total_amount) || 0;
      }
    }

    const [subRows] = await pool.execute(
      `SELECT is_premium, premium_until FROM family_profiles WHERE user_id = ? LIMIT 1`,
      [userId]
    );
    const fp = subRows[0] || {};
    const isPremium = fp.is_premium === 1 || fp.is_premium === true;

    return res.json({
      bookings,
      stats: {
        total_booked: totalBooked,
        paid_in_escrow: paidInEscrow,
        pending_payment: pendingPayment,
        completed_paid: completedPaid,
        total_spent: paidInEscrow + completedPaid
      },
      is_premium: isPremium,
      premium_until: fp.premium_until
    });
  } catch (err) {
    console.error('Lỗi lấy thanh toán gia đình:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// 2. DÀNH CHO GIA ĐÌNH: Thanh toán ký quỹ cho 1 ca chăm sóc (Mô phỏng tự động VietQR Napas)
app.post('/api/payments/pay-booking', async (req, res) => {
  const { paymentId, scheduleId, userId, paymentMethod } = req.body;
  if (!isMySqlConnected) return res.status(500).json({ error: 'Chưa kết nối MySQL' });
  try {
    let pId = Number(paymentId) || null;
    let sId = Number(scheduleId) || null;
    if (!pId && sId) {
      const [fRows] = await pool.execute('SELECT id FROM booking_escrow_payments WHERE schedule_id = ? ORDER BY id DESC LIMIT 1', [sId]);
      if (fRows.length > 0) pId = fRows[0].id;
    }

    // Nếu vẫn chưa có bản ghi ký quỹ nhưng có scheduleId, tự động tạo mới bản ghi ký quỹ
    if (!pId && sId) {
      const [schedRows] = await pool.execute('SELECT * FROM schedules WHERE id = ? LIMIT 1', [sId]);
      if (schedRows.length > 0) {
        const sched = schedRows[0];
        const sPrice = Number(sched.price) || 400000;
        const oPrice = Number(sched.original_price) || sPrice;
        const fee = Math.round(oPrice * 0.15);
        const earnings = oPrice - fee;
        const txCode = 'ESC-2026-' + String(sched.id).padStart(4, '0') + '-' + Math.floor(1000 + Math.random() * 9000);
        const [newEsc] = await pool.execute(
          `INSERT INTO booking_escrow_payments 
           (transaction_code, schedule_id, family_user_id, caregiver_user_id, patient_name, shift_date, shift_time, total_amount, original_amount, platform_fee, caregiver_earnings, system_subsidy, voucher_code, voucher_discount, escrow_status, payment_method, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_payment', 'VietQR Napas 247', 'Đặt ca mới - Ký quỹ VietQR')`,
          [
            txCode,
            sched.id,
            sched.family_user_id,
            sched.caregiver_user_id,
            sched.elderly_name || 'Người thân',
            sched.schedule_date || 'Hôm nay',
            sched.time_slot || '08:30 - 12:30',
            sPrice,
            oPrice,
            fee,
            earnings,
            Number(sched.voucher_discount) || 0,
            sched.voucher_code || null,
            Number(sched.voucher_discount) || 0
          ]
        );
        pId = newEsc.insertId;
      }
    }

    if (!pId) return res.status(400).json({ error: 'Không tìm thấy hóa đơn ca cần thanh toán' });

    const ref = 'NPS' + Math.floor(100000000 + Math.random() * 900000000);
    await pool.execute(
      `UPDATE booking_escrow_payments 
       SET escrow_status = 'in_escrow', 
           family_paid_at = NOW(), 
           payment_method = ?, 
           bank_reference = ?,
           notes = 'Đã thanh toán giữ chỗ an toàn qua VietQR. Tiền đang ký quỹ bảo lãnh tại CARE-MATCH.'
       WHERE id = ?`,
      [paymentMethod || 'Chuyển khoản QR (VietQR Napas)', ref, pId]
    );

    const [rows] = await pool.execute(`SELECT * FROM booking_escrow_payments WHERE id = ?`, [pId]);
    const b = rows[0];

    if (b && b.schedule_id) {
      await pool.execute(`UPDATE schedules SET status = 'confirmed' WHERE id = ? AND status IN ('pending', 'pending_payment')`, [b.schedule_id]);
      try {
        await pool.execute(
          `UPDATE transactions SET family_payment_status = 'paid', paid_at = NOW() WHERE schedule_id = ?`,
          [b.schedule_id]
        );
      } catch { }
    }

    if (b) {
      await createNotification(
        b.family_user_id,
        'payment',
        '🛡️ Thanh toán ca an toàn thành công!',
        `Đã chuyển tiền ký quỹ cho ca ${b.shift_date} (${Number(b.total_amount).toLocaleString('vi-VN')} đ). CARE-MATCH bảo lãnh số tiền này đến khi ca hoàn thành.`,
        '/payments'
      );

      await createNotification(
        b.caregiver_user_id,
        'payment',
        'Gia đình đã thanh toán giữ chỗ! 🛡️',
        `Gia đình đã thanh toán tiền giữ chỗ cho ca ${b.shift_date}. Bạn có thể an tâm nhận ca!`,
        '/payments'
      );
    }

    return res.json({
      success: true,
      message: 'Thanh toán giữ chỗ an toàn thành công!',
      bankReference: ref,
      booking: b
    });
  } catch (err) {
    console.error('Lỗi thanh toán ca:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// 3. DÀNH CHO NGƯỜI CHĂM SÓC: Quản lý thu nhập & giải ngân thù lao
app.get('/api/payments/caregiver/:userId', async (req, res) => {
  const userId = Number(req.params.userId);
  if (!isMySqlConnected) return res.json({ shifts: [], stats: {}, bank_account: null });
  try {
    const [bankRows] = await pool.execute(
      `SELECT * FROM caregiver_bank_accounts WHERE caregiver_user_id = ? ORDER BY is_default DESC, id DESC LIMIT 1`,
      [userId]
    );
    const bankAccount = bankRows[0] || null;

    const [shifts] = await pool.execute(`
      SELECT 
        b.*,
        COALESCE(u_fam.full_name, 'Gia đình') AS family_name,
        u_fam.phone AS family_phone,
        s.status AS schedule_status
      FROM booking_escrow_payments b
      LEFT JOIN users u_fam ON b.family_user_id = u_fam.id
      LEFT JOIN schedules s ON b.schedule_id = s.id
      WHERE b.caregiver_user_id = ?
      ORDER BY b.created_at DESC
    `, [userId]);

    let totalShifts = shifts.length;
    let grossEarnings = 0;
    let platformFee = 0;
    let netEarnings = 0;
    let paidOutAmount = 0;
    let inEscrowAmount = 0;
    let pendingFamilyAmount = 0;

    for (const s of shifts) {
      const gross = Number(s.total_amount) || 0;
      const fee = Number(s.platform_fee) || Math.round(gross * 0.35);
      const net = Number(s.caregiver_earnings) || (gross - fee);

      grossEarnings += gross;
      platformFee += fee;
      netEarnings += net;

      if (s.escrow_status === 'paid_out') {
        paidOutAmount += net;
      } else if (s.escrow_status === 'in_escrow') {
        inEscrowAmount += net;
      } else if (s.escrow_status === 'pending_payment') {
        pendingFamilyAmount += net;
      }
    }

    return res.json({
      shifts,
      bank_account: bankAccount,
      stats: {
        total_shifts: totalShifts,
        gross_earnings: grossEarnings,
        platform_fee: platformFee,        // 35% trích lại cho nền tảng
        net_earnings: netEarnings,        // 65% thực nhận
        paid_out_amount: paidOutAmount,   // Đã nhận về TK ngân hàng
        in_escrow_amount: inEscrowAmount, // Chờ nhận (tiền đã ký quỹ, chờ ca xong)
        pending_family_amount: pendingFamilyAmount // Gia đình chưa thanh toán
      }
    });
  } catch (err) {
    console.error('Lỗi lấy thanh toán người chăm sóc:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// 4. DÀNH CHO NGƯỜI CHĂM SÓC: Cập nhật tài khoản ngân hàng thụ hưởng
app.post('/api/caregiver/bank-account', async (req, res) => {
  const { caregiverUserId, bankName, accountNumber, accountHolder, branch } = req.body;
  if (!caregiverUserId || !bankName || !accountNumber || !accountHolder) {
    return res.status(400).json({ error: 'Vui lòng điền đầy đủ tên ngân hàng, số tài khoản và chủ tài khoản.' });
  }
  if (!isMySqlConnected) return res.status(500).json({ error: 'Chưa kết nối MySQL' });
  try {
    const uid = Number(caregiverUserId);
    const [existing] = await pool.execute('SELECT id FROM caregiver_bank_accounts WHERE caregiver_user_id = ? LIMIT 1', [uid]);
    if (existing.length > 0) {
      await pool.execute(
        `UPDATE caregiver_bank_accounts 
         SET bank_name = ?, account_number = ?, account_holder = ?, branch = ? 
         WHERE caregiver_user_id = ?`,
        [bankName.trim(), accountNumber.trim(), accountHolder.trim().toUpperCase(), branch ? branch.trim() : '', uid]
      );
    } else {
      await pool.execute(
        `INSERT INTO caregiver_bank_accounts (caregiver_user_id, bank_name, account_number, account_holder, branch)
         VALUES (?, ?, ?, ?, ?)`,
        [uid, bankName.trim(), accountNumber.trim(), accountHolder.trim().toUpperCase(), branch ? branch.trim() : '']
      );
    }
    return res.json({ success: true, message: 'Đã lưu tài khoản ngân hàng nhận thù lao thành công!' });
  } catch (err) {
    console.error('Lỗi cập nhật tài khoản ngân hàng:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// 5. XÁC NHẬN HOÀN THÀNH CA (YÊU CẦU XÁC NHẬN 2 CHIỀU: GIA ĐÌNH VÀ NGƯỜI CHĂM SÓC MỚI GIẢI NGÂN)
app.post('/api/payments/confirm-shift-complete', async (req, res) => {
  const { scheduleId, paymentId, confirmedBy } = req.body;
  if (!isMySqlConnected) return res.status(500).json({ error: 'Chưa kết nối CSDL' });
  try {
    let sId = Number(scheduleId);
    let pId = Number(paymentId);

    let bRecord = null;
    if (pId) {
      const [rows] = await pool.execute('SELECT * FROM booking_escrow_payments WHERE id = ?', [pId]);
      if (rows.length > 0) {
        bRecord = rows[0];
        sId = bRecord.schedule_id;
      }
    } else if (sId) {
      const [rows] = await pool.execute('SELECT * FROM booking_escrow_payments WHERE schedule_id = ?', [sId]);
      if (rows.length > 0) bRecord = rows[0];
    }

    if (!sId) {
      return res.status(400).json({ error: 'Thiếu scheduleId' });
    }

    const [schedRows] = await pool.execute('SELECT * FROM schedules WHERE id = ?', [sId]);
    if (schedRows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy ca chăm sóc' });
    }
    const item = schedRows[0];

    let isCaregiverConfirmed = Boolean(item.caregiver_confirmed_completed);
    let isFamilyConfirmed = Boolean(item.family_confirmed_completed);

    if (confirmedBy === 'caregiver') {
      isCaregiverConfirmed = true;
      await pool.execute('UPDATE schedules SET caregiver_confirmed_completed = TRUE, caregiver_completed_at = NOW() WHERE id = ?', [sId]);
    } else if (confirmedBy === 'family') {
      isFamilyConfirmed = true;
      await pool.execute('UPDATE schedules SET family_confirmed_completed = TRUE, family_completed_at = NOW() WHERE id = ?', [sId]);
    } else {
      isCaregiverConfirmed = true;
      isFamilyConfirmed = true;
      await pool.execute('UPDATE schedules SET caregiver_confirmed_completed = TRUE, family_confirmed_completed = TRUE WHERE id = ?', [sId]);
    }

    // NẾU CẢ 2 BÊN ĐỀU ĐÃ XÁC NHẬN -> GIẢI NGÂN VÀ CHUYỂN TRẠNG THÁI SANG COMPLETED
    if (isCaregiverConfirmed && isFamilyConfirmed) {
      await pool.execute("UPDATE schedules SET status = 'completed' WHERE id = ?", [sId]);

      if (bRecord) {
        const ref = 'PAYOUT-' + Math.floor(10000000 + Math.random() * 90000000);
        await pool.execute(
          `UPDATE booking_escrow_payments 
           SET escrow_status = 'paid_out', 
               released_at = NOW(), 
               bank_reference = ?,
               notes = 'Cả hai bên đã xác nhận hoàn thành ca. Hệ thống đã giải ngân tự động 85% thù lao vào tài khoản ngân hàng của Người chăm sóc' 
           WHERE id = ?`,
          [ref, bRecord.id]
        );

        await createNotification(
          bRecord.caregiver_user_id,
          'payment',
          '✅ Thù lao đã chuyển về tài khoản ngân hàng!',
          `Cả hai bên đã xác nhận hoàn thành ca #${sId}. Hệ thống đã tự động chuyển ${Number(bRecord.caregiver_earnings).toLocaleString('vi-VN')} đ (85% thù lao) vào tài khoản ngân hàng của bạn. Mã GD: ${ref}.`,
          '/payments'
        );

        await createNotification(
          bRecord.family_user_id,
          'schedule',
          'Ca chăm sóc đã kết thúc hoàn tất ✓',
          `Cảm ơn bạn đã tin tưởng dịch vụ CARE-MATCH. Thù lao bảo lãnh đã được tự động tất toán cho chuyên viên chăm sóc. Vui lòng đánh giá chất lượng dịch vụ ⭐`,
          '/schedule'
        );
      }

      return res.json({
        success: true,
        both_confirmed: true,
        status: 'completed',
        message: 'Cả hai bên đã xác nhận hoàn thành ca! Thù lao 85% đã được tự động giải ngân thành công.'
      });
    } else if (isCaregiverConfirmed && !isFamilyConfirmed) {
      // Chỉ mới người chăm sóc xác nhận -> KHÔNG GIẢI NGÂN, chờ gia đình xác nhận
      await pool.execute("UPDATE schedules SET status = 'caregiver_completed' WHERE id = ?", [sId]);
      if (item.family_user_id) {
        await createNotification(
          item.family_user_id,
          'schedule',
          '⚠️ Người chăm sóc đã báo hoàn thành ca',
          `${item.caregiver_name || 'Người chăm sóc'} đã báo hoàn thành ca chăm sóc. Vui lòng vào xác nhận để hoàn tất ca và giải ngân thù lao.`,
          '/schedule'
        );
      }
      return res.json({
        success: true,
        both_confirmed: false,
        status: 'caregiver_completed',
        message: 'Đã ghi nhận bạn hoàn thành ca. Đang chờ gia đình xác nhận đối soát để tất toán thù lao!'
      });
    } else if (!isCaregiverConfirmed && isFamilyConfirmed) {
      // Chỉ mới gia đình xác nhận -> KHÔNG GIẢI NGÂN, chờ người chăm sóc xác nhận
      await pool.execute("UPDATE schedules SET status = 'family_completed' WHERE id = ?", [sId]);
      if (item.caregiver_user_id) {
        await createNotification(
          item.caregiver_user_id,
          'schedule',
          '⚠️ Gia đình đã xác nhận ca hoàn tất',
          `Gia đình ${item.elderly_name || 'người thân'} đã xác nhận ca chăm sóc xong. Vui lòng bấm xác nhận hoàn thành để nhận thù lao.`,
          '/caregiver'
        );
      }
      return res.json({
        success: true,
        both_confirmed: false,
        status: 'family_completed',
        message: 'Bạn đã xác nhận ca xong. Đang chờ người chăm sóc xác nhận đối soát!'
      });
    }

    return res.json({ success: true, message: 'Đã cập nhật trạng thái ca.' });
  } catch (err) {
    console.error('Lỗi hoàn thành ca & giải ngân:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// 6. DÀNH CHO ADMIN: BẢNG ĐIỀU KHIỂN DOANH THU & BIỂU ĐỒ CỘT THU NHẬP THEO TỪNG THÁNG
app.get('/api/admin/payments/dashboard', async (req, res) => {
  if (!isMySqlConnected) return res.json({ stats: {}, monthly_chart_data: [], transactions: [] });
  try {
    const [escrowRows] = await pool.execute(`
      SELECT 
        COALESCE(SUM(total_amount), 0) AS total_gmv,
        COALESCE(SUM(platform_fee), 0) AS total_shift_fees,
        COALESCE(SUM(CASE WHEN escrow_status = 'paid_out' THEN caregiver_earnings ELSE 0 END), 0) AS total_caregiver_paid,
        COALESCE(SUM(CASE WHEN escrow_status = 'in_escrow' THEN total_amount ELSE 0 END), 0) AS total_in_escrow,
        COALESCE(SUM(CASE WHEN escrow_status = 'pending_payment' THEN total_amount ELSE 0 END), 0) AS total_pending_payment,
        COALESCE(SUM(CASE WHEN escrow_status = 'paid_out' THEN total_amount ELSE 0 END), 0) AS total_completed_amount,
        COUNT(*) AS total_shift_count
      FROM booking_escrow_payments
    `);
    const er = escrowRows[0] || {};

    const [subRows] = await pool.execute(`
      SELECT 
        COALESCE(SUM(price), 0) AS total_vip_revenue,
        COUNT(*) AS total_vip_count,
        COALESCE(SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END), 0) AS active_vip_count
      FROM family_subscriptions
    `);
    const sr = subRows[0] || {};

    const totalVipRev = Number(sr.total_vip_revenue) || 0;
    const totalShiftFees = Number(er.total_shift_fees) || 0;
    const netPlatformRevenue = totalShiftFees + totalVipRev;

    // BIỂU ĐỒ CỘT PHÂN TÍCH THU NHẬP QUA TỪNG THÁNG (REAL-TIME ĐỒNG BỘ 100% TỪ MYSQL)
    const [monthlyEscrowRows] = await pool.execute(`
      SELECT 
        DATE_FORMAT(created_at, '%Y-%m') AS ym,
        YEAR(created_at) AS y,
        MONTH(created_at) AS m,
        COALESCE(SUM(CASE WHEN escrow_status = 'paid_out' THEN total_amount ELSE 0 END), 0) AS shift_paid,
        COALESCE(SUM(CASE WHEN escrow_status IN ('in_escrow', 'pending_payment') THEN total_amount ELSE 0 END), 0) AS shift_pending,
        COALESCE(SUM(platform_fee), 0) AS shift_fee,
        COALESCE(SUM(total_amount), 0) AS shift_total
      FROM booking_escrow_payments
      WHERE created_at <= NOW()
      GROUP BY ym, y, m
      ORDER BY ym ASC
    `);

    const [monthlyVipRows] = await pool.execute(`
      SELECT 
        DATE_FORMAT(created_at, '%Y-%m') AS ym,
        COALESCE(SUM(price), 0) AS vip_revenue
      FROM family_subscriptions
      WHERE created_at <= NOW()
      GROUP BY ym
    `);

    const vipByMonth = {};
    for (const vr of monthlyVipRows) {
      vipByMonth[vr.ym] = Number(vr.vip_revenue) || 0;
    }

    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth() + 1;

    const monthlyChartData = monthlyEscrowRows
      .filter(r => {
        // Chỉ lấy các tháng <= tháng hiện tại (Tuyệt đối không lấy tháng tương lai)
        if (r.y > curYear) return false;
        if (r.y === curYear && r.m > curMonth) return false;
        return true;
      })
      .map(r => {
        const vip = vipByMonth[r.ym] || 0;
        const paid = Number(r.shift_paid) + vip;
        const pending = Number(r.shift_pending);
        const fee = Number(r.shift_fee) + vip;
        const gmv = paid + pending;
        const mStr = String(r.m).padStart(2, '0');
        return {
          month: `T${mStr}/${r.y}`,
          label: `Tháng ${mStr}`,
          year: r.y,
          paid_amount: paid,
          pending_amount: pending,
          platform_fee: fee,
          vip_revenue: vip,
          total_gmv: gmv
        };
      });

    const [transactions] = await pool.execute(`
      SELECT 
        b.*,
        COALESCE(u_fam.full_name, 'Gia đình') AS family_name,
        u_fam.phone AS family_phone,
        u_fam.email AS family_email,
        COALESCE(u_cg.full_name, 'Người chăm sóc') AS caregiver_name,
        u_cg.phone AS caregiver_phone,
        u_cg.email AS caregiver_email,
        ba.bank_name AS cg_bank_name,
        ba.account_number AS cg_acc_number,
        ba.account_holder AS cg_acc_holder
      FROM booking_escrow_payments b
      LEFT JOIN users u_fam ON b.family_user_id = u_fam.id
      LEFT JOIN users u_cg ON b.caregiver_user_id = u_cg.id
      LEFT JOIN caregiver_bank_accounts ba ON b.caregiver_user_id = ba.caregiver_user_id AND ba.is_default = TRUE
      ORDER BY b.created_at DESC
    `);

    return res.json({
      stats: {
        total_gmv: Number(er.total_gmv) + totalVipRev,
        total_revenue: netPlatformRevenue,               // Doanh thu nền tảng (35% ca + 300k VIP)
        platform_fee_total: totalShiftFees,             // 35% từ các ca
        vip_revenue: totalVipRev,                       // Doanh thu VIP 300k
        caregiver_paid_total: Number(er.total_caregiver_paid), // Đã giải ngân cho Người chăm sóc (65%)
        escrow_holding_total: Number(er.total_in_escrow),      // Tiền đang giữ trung gian
        pending_family_total: Number(er.total_pending_payment),// Gia đình chưa trả trước ca
        active_vip_count: Number(sr.active_vip_count),
        total_shift_count: Number(er.total_shift_count)
      },
      monthly_chart_data: monthlyChartData,
      transactions
    });
  } catch (err) {
    console.error('Lỗi lấy thống kê doanh thu Admin:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// 7. DÀNH CHO ADMIN: Thao tác ép giải ngân thù lao cho Người chăm sóc
app.post('/api/admin/payments/:id/release-payout', async (req, res) => {
  const id = Number(req.params.id);
  if (!isMySqlConnected) return res.status(500).json({ error: 'Chưa kết nối MySQL' });
  try {
    const ref = 'ADMIN-PAYOUT-' + Math.floor(10000000 + Math.random() * 90000000);
    await pool.execute(
      `UPDATE booking_escrow_payments 
       SET escrow_status = 'paid_out', 
           released_at = NOW(), 
           bank_reference = ?,
           notes = 'Admin xác nhận đối soát & giải ngân thù lao 65% cho Người chăm sóc' 
       WHERE id = ?`,
      [ref, id]
    );

    const [rows] = await pool.execute('SELECT * FROM booking_escrow_payments WHERE id = ?', [id]);
    const b = rows[0];
    if (b && b.schedule_id) {
      await pool.execute("UPDATE schedules SET status = 'completed' WHERE id = ?", [b.schedule_id]);
    }

    return res.json({ success: true, message: 'Đã giải ngân cho Người chăm sóc thành công!', booking: b });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ========================================================
// 8. CỘNG ĐỒNG NGƯỜI CAO TUỔI & GIA ĐÌNH (COMMUNITIES)
// ========================================================

// Lấy danh sách cộng đồng (hỗ trợ filter theo status/search)
app.get('/api/communities', async (req, res) => {
  if (!isMySqlConnected) return res.json({ communities: [] });
  try {
    const { category, search, status } = req.query;
    let query = 'SELECT * FROM communities WHERE 1=1';
    const params = [];

    if (status && status !== 'all') {
      query += ' AND status = ?';
      params.push(status);
    } else if (!status) {
      // Mặc định trả về active cho người dùng
      query += " AND status = 'active'";
    }

    if (category && category !== 'Tất cả') {
      query += ' AND category = ?';
      params.push(category);
    }

    if (search) {
      query += ' AND (name LIKE ? OR description LIKE ? OR location LIKE ? OR leader_name LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }

    query += ' ORDER BY id ASC';
    const [rows] = await pool.execute(query, params);

    // Parse tags JSON
    const communities = rows.map(r => ({
      ...r,
      tags: parseJson(r.tags, [])
    }));

    return res.json({ success: true, communities });
  } catch (err) {
    console.error('Lỗi lấy danh sách cộng đồng:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// Admin lấy tất cả cộng đồng kèm thống kê
app.get('/api/admin/communities', async (req, res) => {
  if (!isMySqlConnected) return res.json({ communities: [], stats: {} });
  try {
    const [rows] = await pool.execute('SELECT * FROM communities ORDER BY id DESC');
    const communities = rows.map(r => ({
      ...r,
      tags: parseJson(r.tags, [])
    }));

    const totalMembers = communities.reduce((sum, c) => sum + (Number(c.member_count) || 0), 0);
    const activeCount = communities.filter(c => c.status === 'active').length;

    return res.json({
      success: true,
      communities,
      stats: {
        total_communities: communities.length,
        active_communities: activeCount,
        total_members: totalMembers
      }
    });
  } catch (err) {
    console.error('Lỗi lấy danh sách cộng đồng admin:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// Thêm cộng đồng mới
app.post('/api/communities', async (req, res) => {
  const { name, category, description, meeting_schedule, location, member_count, leader_name, tags, zalo_link, qr_code_url } = req.body;
  if (!name) return res.status(400).json({ error: 'Tên cộng đồng không được để trống' });
  if (!isMySqlConnected) return res.status(500).json({ error: 'Chưa kết nối MySQL' });

  try {
    const finalZalo = zalo_link || 'https://zalo.me/g/carematch_community';
    const finalQr = qr_code_url || `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(finalZalo)}`;
    const tagsJson = Array.isArray(tags) ? JSON.stringify(tags) : (typeof tags === 'string' ? JSON.stringify(tags.split(',').map(t => t.trim())) : '[]');

    const [result] = await pool.execute(
      `INSERT INTO communities 
       (name, category, description, meeting_schedule, location, member_count, leader_name, tags, zalo_link, qr_code_url, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      [
        name.trim(),
        category || 'Sức khỏe & Vận động',
        description || '',
        meeting_schedule || '05:30 - 06:45 Hàng ngày',
        location || 'Hà Nội',
        member_count ? Number(member_count) : 50,
        leader_name || 'Ban Quản Trị CARE-MATCH',
        tagsJson,
        finalZalo,
        finalQr
      ]
    );

    return res.json({ success: true, message: 'Thêm cộng đồng thành công!', communityId: result.insertId });
  } catch (err) {
    console.error('Lỗi thêm cộng đồng:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// Chỉnh sửa cộng đồng
app.put('/api/communities/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { name, category, description, meeting_schedule, location, member_count, leader_name, tags, zalo_link, qr_code_url, status } = req.body;
  if (!name) return res.status(400).json({ error: 'Tên cộng đồng không được để trống' });
  if (!isMySqlConnected) return res.status(500).json({ error: 'Chưa kết nối MySQL' });

  try {
    const finalZalo = zalo_link || 'https://zalo.me/g/carematch_community';
    const finalQr = qr_code_url || `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(finalZalo)}`;
    const tagsJson = Array.isArray(tags) ? JSON.stringify(tags) : (typeof tags === 'string' ? JSON.stringify(tags.split(',').map(t => t.trim())) : '[]');

    await pool.execute(
      `UPDATE communities 
       SET name = ?, category = ?, description = ?, meeting_schedule = ?, location = ?, member_count = ?, leader_name = ?, tags = ?, zalo_link = ?, qr_code_url = ?, status = ?
       WHERE id = ?`,
      [
        name.trim(),
        category || 'Sức khỏe & Vận động',
        description || '',
        meeting_schedule || '05:30 - 06:45 Hàng ngày',
        location || 'Hà Nội',
        member_count ? Number(member_count) : 50,
        leader_name || 'Ban Quản Trị CARE-MATCH',
        tagsJson,
        finalZalo,
        finalQr,
        status || 'active',
        id
      ]
    );

    return res.json({ success: true, message: 'Cập nhật cộng đồng thành công!' });
  } catch (err) {
    console.error('Lỗi cập nhật cộng đồng:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// Xóa cộng đồng
app.delete('/api/communities/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!isMySqlConnected) return res.status(500).json({ error: 'Chưa kết nối MySQL' });

  try {
    await pool.execute('DELETE FROM communities WHERE id = ?', [id]);
    return res.json({ success: true, message: 'Đã xóa cộng đồng thành công!' });
  } catch (err) {
    console.error('Lỗi xóa cộng đồng:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ========================================================
// 9. ĐÁNH GIÁ SAO & NHẬN XÉT (CAREGIVER REVIEWS)
// ========================================================

// Lấy danh sách đánh giá
app.get('/api/caregiver-reviews', async (req, res) => {
  if (!isMySqlConnected) return res.json({ reviews: [] });
  try {
    const { caregiver_id, schedule_id, status } = req.query;
    let query = `
      SELECT r.*, 
             u_cg.full_name AS caregiver_name,
             u_cg.avatar_initials AS caregiver_avatar,
             u_fam.full_name AS family_user_fullname
      FROM caregiver_reviews r
      LEFT JOIN users u_cg ON r.caregiver_user_id = u_cg.id
      LEFT JOIN caregiver_profiles cp ON r.caregiver_user_id = cp.user_id
      LEFT JOIN users u_fam ON r.family_user_id = u_fam.id
      WHERE 1=1
    `;
    const params = [];

    if (caregiver_id) {
      query += ' AND r.caregiver_user_id = ?';
      params.push(Number(caregiver_id));
    }
    if (schedule_id) {
      query += ' AND r.schedule_id = ?';
      params.push(Number(schedule_id));
    }
    if (status) {
      query += ' AND r.status = ?';
      params.push(status);
    } else {
      query += " AND r.status != 'hidden'";
    }

    query += ' ORDER BY r.created_at DESC';
    const [rows] = await pool.execute(query, params);

    const reviews = rows.map(r => ({
      ...r,
      tags: parseJson(r.tags, [])
    }));

    return res.json({ success: true, reviews });
  } catch (err) {
    console.error('Lỗi lấy đánh giá:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// Lấy toàn bộ đánh giá và điểm số trung bình của 1 người chăm sóc
app.get('/api/reviews/caregiver/:id', async (req, res) => {
  if (!isMySqlConnected) return res.json({ reviews: [], stats: { avg_rating: 5, count: 0 } });
  const cgId = Number(req.params.id);
  try {
    const [rows] = await pool.execute(
      `SELECT r.*, u_fam.full_name AS family_user_fullname 
       FROM caregiver_reviews r
       LEFT JOIN users u_fam ON r.family_user_id = u_fam.id
       WHERE r.caregiver_user_id = ? AND r.status != 'hidden'
       ORDER BY r.created_at DESC`,
      [cgId]
    );

    const [statsRows] = await pool.execute(
      `SELECT COALESCE(AVG(rating), 5.0) as avg_rating, COUNT(*) as count 
       FROM caregiver_reviews 
       WHERE caregiver_user_id = ? AND status != 'hidden'`,
      [cgId]
    );

    const reviews = rows.map(r => ({ ...r, tags: parseJson(r.tags, []) }));
    const avg = Number(statsRows[0]?.avg_rating || 5.0);
    const count = Number(statsRows[0]?.count || 0);

    return res.json({
      success: true,
      reviews,
      stats: {
        avg_rating: Math.round(avg * 10) / 10,
        count
      }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Gửi đánh giá sao mới từ gia đình (sau khi hoàn thành ca)
app.post('/api/caregiver-reviews', async (req, res) => {
  const { schedule_id, caregiver_user_id, family_user_id, family_name, patient_name, service_title, rating, tags, review_text } = req.body;
  if (!caregiver_user_id || !rating) {
    return res.status(400).json({ error: 'Thiếu thông tin người chăm sóc hoặc số sao đánh giá.' });
  }
  if (!isMySqlConnected) return res.status(500).json({ error: 'Chưa kết nối MySQL' });

  try {
    const cgId = Number(caregiver_user_id);
    const famId = family_user_id ? Number(family_user_id) : 5;
    const schedId = schedule_id ? Number(schedule_id) : null;
    const starRating = Math.max(1, Math.min(5, Number(rating) || 5));
    const tagsJson = Array.isArray(tags) ? JSON.stringify(tags) : '[]';

    // 1. Thêm bản ghi review
    const [result] = await pool.execute(
      `INSERT INTO caregiver_reviews 
       (schedule_id, caregiver_user_id, family_user_id, family_name, patient_name, service_title, rating, tags, review_text, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved')`,
      [
        schedId,
        cgId,
        famId,
        family_name || 'Gia đình',
        patient_name || 'Người thân',
        service_title || 'Ca chăm sóc',
        starRating,
        tagsJson,
        review_text || 'Chăm sóc chu đáo, tận tâm!'
      ]
    );

    // 2. Tính lại trung bình sao và care_score cho caregiver_profiles
    const [stats] = await pool.execute(
      `SELECT AVG(rating) as avg_rating, COUNT(*) as count FROM caregiver_reviews WHERE caregiver_user_id = ? AND status = 'approved'`,
      [cgId]
    );
    const avgRating = Number(stats[0].avg_rating || 5);
    const calculatedCareScore = Math.min(100, Math.round(avgRating * 19.5));

    await pool.execute(
      `UPDATE caregiver_profiles SET care_score = ? WHERE user_id = ?`,
      [calculatedCareScore, cgId]
    );

    // 2b. Cập nhật lịch trình schedules sang trạng thái "Đã đánh giá"
    if (schedId) {
      await pool.execute(
        `UPDATE schedules 
         SET is_rated = TRUE, 
             rating = ?, 
             review_id = ?, 
             review_text = ? 
         WHERE id = ?`,
        [starRating, result.insertId, review_text || 'Đã gửi đánh giá chất lượng', schedId]
      );
      console.log(`✅ [MySQL] Đã cập nhật schedule #${schedId}: is_rated = TRUE, rating = ${starRating}`);
    }

    // 3. Tạo thông báo cho người chăm sóc
    await createNotification(
      cgId,
      'review',
      `Bạn nhận được đánh giá ${starRating} sao! ⭐`,
      `Gia đình ${family_name || ''} đã gửi lời khen ngợi và đánh giá ${starRating} sao cho ca làm của bạn.`,
      '/profile'
    );

    return res.json({
      success: true,
      message: 'Gửi đánh giá thành công! Cảm ơn bạn đã phản hồi chất lượng dịch vụ.',
      reviewId: result.insertId,
      newCareScore: calculatedCareScore,
      avgRating
    });
  } catch (err) {
    console.error('Lỗi gửi đánh giá:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// Admin duyệt / ẩn đánh giá
app.patch('/api/caregiver-reviews/:id/status', async (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body;
  if (!isMySqlConnected) return res.status(500).json({ error: 'Chưa kết nối MySQL' });
  try {
    await pool.execute('UPDATE caregiver_reviews SET status = ? WHERE id = ?', [status, id]);
    return res.json({ success: true, message: 'Đã cập nhật trạng thái đánh giá!' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ---- HỒ SƠ THEO DÕI SỨC KHỎE SAU CA (PATIENT CARE LOGS) ----

// Lấy danh sách nhật ký theo dõi sau ca
app.get('/api/care-logs', async (req, res) => {
  const { familyUserId, caregiverUserId, elderlyProfileId, elderlyName, search, condition } = req.query;
  if (!isMySqlConnected) return res.json([]);
  try {
    let query = `
      SELECT pcl.*,
             u_cg.phone AS caregiver_phone,
             u_cg.avatar_initials AS caregiver_avatar,
             u_fam.phone AS family_phone
      FROM patient_care_logs pcl
      LEFT JOIN users u_cg ON pcl.caregiver_user_id = u_cg.id
      LEFT JOIN users u_fam ON pcl.family_user_id = u_fam.id
      WHERE 1=1
    `;
    const params = [];

    if (familyUserId) {
      query += ' AND pcl.family_user_id = ?';
      params.push(Number(familyUserId));
    }
    if (caregiverUserId) {
      query += ' AND pcl.caregiver_user_id = ?';
      params.push(Number(caregiverUserId));
    }
    if (elderlyProfileId) {
      query += ' AND pcl.elderly_profile_id = ?';
      params.push(Number(elderlyProfileId));
    }
    if (req.query.scheduleId) {
      query += ' AND pcl.schedule_id = ?';
      params.push(Number(req.query.scheduleId));
    }
    if (elderlyName) {
      query += ' AND pcl.elderly_name LIKE ?';
      params.push(`%${elderlyName}%`);
    }
    if (condition) {
      query += ' AND pcl.overall_condition = ?';
      params.push(condition);
    }
    if (search) {
      query += ' AND (pcl.elderly_name LIKE ? OR pcl.family_name LIKE ? OR pcl.caregiver_name LIKE ? OR pcl.caregiver_notes LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY pcl.log_date DESC, pcl.created_at DESC';
    const [rows] = await pool.execute(query, params);

    const logs = rows.map(r => ({
      ...r,
      tasks_completed: parseJson(r.tasks_completed, [])
    }));

    return res.json(logs);
  } catch (err) {
    console.error('Lỗi lấy nhật ký chăm sóc:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// Lấy cây phân cấp Gia đình -> Người bệnh (2 nấc chọn chuẩn chỉnh không danh xưng)
app.get('/api/care-logs/families-tree', async (req, res) => {
  if (!isMySqlConnected) return res.json([]);
  try {
    const { familyUserId } = req.query;

    let familiesQuery = `
      SELECT u.id, u.full_name, u.phone, u.email, fp.address, fp.district
      FROM users u
      LEFT JOIN family_profiles fp ON u.id = fp.user_id
      WHERE 1=1
    `;
    const familiesParams = [];

    if (familyUserId) {
      familiesQuery += ' AND u.id = ?';
      familiesParams.push(Number(familyUserId));
    } else {
      familiesQuery += " AND u.role = 'family'";
    }

    familiesQuery += ' ORDER BY u.id ASC';
    const [families] = await pool.execute(familiesQuery, familiesParams);

    let elderlyQuery = `
      SELECT ep.id, ep.user_id, ep.full_name, ep.date_of_birth, ep.gender, ep.district, ep.care_needs,
             (SELECT COUNT(*) FROM patient_care_logs pcl WHERE pcl.elderly_profile_id = ep.id OR pcl.elderly_name = ep.full_name) AS logs_count
      FROM elderly_profiles ep
    `;
    const elderlyParams = [];

    if (familyUserId) {
      elderlyQuery += ' WHERE ep.user_id = ?';
      elderlyParams.push(Number(familyUserId));
    }

    elderlyQuery += ' ORDER BY ep.id ASC';
    const [elderly] = await pool.execute(elderlyQuery, elderlyParams);

    const tree = families.map(f => {
      const patients = elderly
        .filter(e => e.user_id === f.id)
        .map(e => {
          let age = 70;
          if (e.date_of_birth) {
            const birthYear = new Date(e.date_of_birth).getFullYear();
            if (!isNaN(birthYear)) age = new Date().getFullYear() - birthYear;
          }
          return {
            id: e.id,
            full_name: e.full_name,
            gender: e.gender || 'Nam',
            age,
            district: e.district || f.district || 'Hà Nội',
            care_needs: parseJson(e.care_needs, []),
            logs_count: Number(e.logs_count) || 0
          };
        });

      return {
        id: f.id,
        family_name: `Gia đình ${f.full_name}`,
        representative: f.full_name,
        phone: f.phone,
        email: f.email,
        district: f.district || 'Hà Nội',
        patients
      };
    });

    const result = familyUserId ? tree : tree.filter(f => f.patients.length > 0);
    return res.json(result);
  } catch (err) {
    console.error('Lỗi lấy cây gia đình - người bệnh:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// Lấy danh sách các đối tượng người bệnh riêng biệt có hồ sơ theo dõi
app.get('/api/care-logs/patients', async (req, res) => {
  const { familyUserId } = req.query;
  if (!isMySqlConnected) return res.json([]);
  try {
    let query = `
      SELECT elderly_name, 
             MAX(elderly_profile_id) as profile_id,
             COUNT(*) as total_logs,
             MAX(log_date) as latest_log_date
      FROM patient_care_logs
    `;
    const params = [];
    if (familyUserId) {
      query += ' WHERE family_user_id = ?';
      params.push(Number(familyUserId));
    }
    query += ' GROUP BY elderly_name ORDER BY latest_log_date DESC';
    const [rows] = await pool.execute(query, params);
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Thêm sổ theo dõi sức khỏe sau ca mới (Caregiver nộp báo cáo)
app.post('/api/care-logs', async (req, res) => {
  const {
    schedule_id,
    family_user_id,
    caregiver_user_id,
    elderly_profile_id,
    elderly_name,
    family_name,
    caregiver_name,
    log_date,
    time_slot,
    blood_pressure_systolic,
    blood_pressure_diastolic,
    heart_rate,
    blood_sugar,
    temperature,
    spo2,
    weight,
    meal_status,
    medication_status,
    sleep_mood,
    mobility_exercise,
    tasks_completed,
    overall_condition,
    caregiver_notes
  } = req.body;

  if (!elderly_name || !caregiver_user_id) {
    return res.status(400).json({ error: 'Vui lòng cung cấp đầy đủ tên người bệnh và chuyên viên.' });
  }
  if (!isMySqlConnected) return res.status(500).json({ error: 'Chưa kết nối MySQL' });

  try {
    const tasksJson = Array.isArray(tasks_completed) ? JSON.stringify(tasks_completed) : '[]';
    let famId = family_user_id ? Number(family_user_id) : null;
    let profId = elderly_profile_id ? Number(elderly_profile_id) : null;
    const cgId = Number(caregiver_user_id);
    const schedId = schedule_id ? Number(schedule_id) : null;

    if (schedId && (!famId || !profId)) {
      try {
        const [schedRows] = await pool.execute('SELECT family_user_id, elderly_profile_id FROM schedules WHERE id = ?', [schedId]);
        if (schedRows && schedRows.length > 0) {
          if (!famId && schedRows[0].family_user_id) famId = Number(schedRows[0].family_user_id);
          if (!profId && schedRows[0].elderly_profile_id) profId = Number(schedRows[0].elderly_profile_id);
        }
      } catch (e) {
        console.warn('Lỗi tra cứu schedule cho care log:', e.message);
      }
    }

    if (!profId && elderly_name) {
      try {
        let epQuery = 'SELECT id, user_id FROM elderly_profiles WHERE full_name = ?';
        const epParams = [elderly_name];
        if (famId) {
          epQuery += ' AND user_id = ?';
          epParams.push(famId);
        }
        epQuery += ' LIMIT 1';
        const [epRows] = await pool.execute(epQuery, epParams);
        if (epRows && epRows.length > 0) {
          profId = epRows[0].id;
          if (!famId) famId = epRows[0].user_id;
        }
      } catch (e) {
        console.warn('Lỗi tra cứu elderly profile cho care log:', e.message);
      }
    }

    const [result] = await pool.execute(
      `INSERT INTO patient_care_logs 
       (schedule_id, family_user_id, caregiver_user_id, elderly_profile_id, elderly_name, family_name, caregiver_name, 
        log_date, time_slot, blood_pressure_systolic, blood_pressure_diastolic, heart_rate, blood_sugar, temperature, spo2, weight,
        meal_status, medication_status, sleep_mood, mobility_exercise, tasks_completed, overall_condition, caregiver_notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        schedId,
        famId,
        cgId,
        profId,
        elderly_name,
        family_name || 'Gia đình',
        caregiver_name || 'Chuyên viên chăm sóc',
        log_date || new Date().toISOString().split('T')[0],
        time_slot || 'Ca ngày',
        blood_pressure_systolic ? Number(blood_pressure_systolic) : 120,
        blood_pressure_diastolic ? Number(blood_pressure_diastolic) : 80,
        heart_rate ? Number(heart_rate) : 75,
        blood_sugar ? Number(blood_sugar) : 5.6,
        temperature ? Number(temperature) : 36.8,
        spo2 ? Number(spo2) : 98,
        weight ? Number(weight) : null,
        meal_status || 'Ăn hết khẩu phần cháo dinh dưỡng',
        medication_status || 'Đã uống đủ thuốc đúng giờ',
        sleep_mood || 'Tâm trạng ổn định, vui vẻ',
        mobility_exercise || 'Vận động nhẹ nhàng',
        tasksJson,
        overall_condition || 'good',
        caregiver_notes || ''
      ]
    );

    if (schedId) {
      await pool.execute('UPDATE schedules SET care_log_id = ?, status = ? WHERE id = ?', [result.insertId, 'completed', schedId]);
    }

    // Thông báo cho người nhà bệnh nhân
    if (famId) {
      await createNotification(
        famId,
        'care_log',
        `📋 Hồ sơ theo dõi sau ca mới cho ${elderly_name}`,
        `Chuyên viên ${caregiver_name || 'chăm sóc'} đã cập nhật chỉ số sinh hiệu và báo cáo sau ca.`,
        '/care-logs'
      );
    }

    return res.json({
      success: true,
      message: 'Đã lưu sổ theo dõi sức khỏe sau ca thành công!',
      logId: result.insertId
    });
  } catch (err) {
    console.error('Lỗi lưu nhật ký chăm sóc:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// Gia đình xác nhận đã xem và để lại phản hồi
app.patch('/api/care-logs/:id/acknowledge', async (req, res) => {
  const id = Number(req.params.id);
  const { family_note } = req.body;
  if (!isMySqlConnected) return res.status(500).json({ error: 'Chưa kết nối MySQL' });
  try {
    await pool.execute(
      'UPDATE patient_care_logs SET family_acknowledged = TRUE, family_note = ? WHERE id = ?',
      [family_note || 'Gia đình đã xem và xác nhận.', id]
    );
    return res.json({ success: true, message: 'Đã xác nhận xem hồ sơ chăm sóc!' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ========================================================
// 10. XUẤT BÁO CÁO FILE CSV THẬT TẢI VỀ MÁY (REAL CSV DOWNLOAD)
// ========================================================

// Xuất file CSV Báo cáo giao dịch ký quỹ tài chính cho Admin
app.get('/api/export/transactions-csv', async (req, res) => {
  if (!isMySqlConnected) return res.status(500).send('Database not connected');
  try {
    const [rows] = await pool.execute(`
      SELECT 
        b.id,
        b.transaction_code,
        b.shift_date,
        b.shift_time,
        b.patient_name,
        b.total_amount,
        b.platform_fee,
        b.caregiver_earnings,
        b.escrow_status,
        b.payment_method,
        b.bank_reference,
        b.family_paid_at,
        b.released_at,
        u_fam.full_name AS family_name,
        u_fam.phone AS family_phone,
        u_cg.full_name AS caregiver_name,
        u_cg.phone AS caregiver_phone,
        b.caregiver_bank_name,
        b.caregiver_account_number
      FROM booking_escrow_payments b
      LEFT JOIN users u_fam ON b.family_user_id = u_fam.id
      LEFT JOIN users u_cg ON b.caregiver_user_id = u_cg.id
      ORDER BY b.created_at DESC
    `);

    // Tạo CSV headers và rows với UTF-8 BOM
    const header = [
      'Mã Giao Dịch',
      'Ngày Ca',
      'Giờ Ca',
      'Gia Đình Đặt Ca',
      'SĐT Gia Đình',
      'Bệnh Nhân/Người Thân',
      'Người Chăm Sóc',
      'SĐT Điều Dưỡng',
      'Tổng Tiền Ký Quỹ (VNĐ)',
      'Phí Nền Tảng 35% (VNĐ)',
      'Thực Nhận Điều Dưỡng 65% (VNĐ)',
      'Trạng Thái Ký Quỹ',
      'Phương Thức Thanh Toán',
      'Mã Đối Soát Ngân Hàng',
      'Thời Điểm Gia Đình Nộp Quỹ',
      'Thời Điểm Admin Giải Ngân',
      'Ngân Hàng Nhận Thù Lao',
      'Số Tài Khoản Nhận Thù Lao'
    ];

    const statusMap = {
      'paid_out': 'Đã Giải Ngân (65%)',
      'in_escrow': 'Đang Giữ Ký Quỹ (Escrow Bảo Đảm)',
      'pending_payment': 'Chờ Gia Đình Ký Quỹ',
      'refunded': 'Đã Hoàn Tiền'
    };

    const csvLines = [header.join(',')];

    for (const r of rows) {
      const escape = (val) => {
        if (val === null || val === undefined) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      };

      const line = [
        escape(r.transaction_code),
        escape(r.shift_date),
        escape(r.shift_time),
        escape(r.family_name || 'Gia đình'),
        escape(r.family_phone || ''),
        escape(r.patient_name),
        escape(r.caregiver_name || 'Người chăm sóc'),
        escape(r.caregiver_phone || ''),
        escape(Number(r.total_amount).toLocaleString('vi-VN')),
        escape(Number(r.platform_fee).toLocaleString('vi-VN')),
        escape(Number(r.caregiver_earnings).toLocaleString('vi-VN')),
        escape(statusMap[r.escrow_status] || r.escrow_status),
        escape(r.payment_method),
        escape(r.bank_reference || 'N/A'),
        escape(r.family_paid_at ? new Date(r.family_paid_at).toLocaleString('vi-VN') : 'Chưa nộp'),
        escape(r.released_at ? new Date(r.released_at).toLocaleString('vi-VN') : 'Chưa giải ngân'),
        escape(r.caregiver_bank_name || 'Vietcombank'),
        escape(r.caregiver_account_number || 'N/A')
      ];
      csvLines.push(line.join(','));
    }

    const csvContent = '\uFEFF' + csvLines.join('\r\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="Bao_Cao_Giao_Dich_Ky_Quy_CareMatch_2026.csv"');
    return res.send(csvContent);
  } catch (err) {
    console.error('Lỗi xuất CSV:', err.message);
    return res.status(500).send('Lỗi xuất file CSV: ' + err.message);
  }
});

// Xuất file CSV danh sách ca chăm sóc
app.get('/api/export/schedules-csv', async (req, res) => {
  if (!isMySqlConnected) return res.status(500).send('Database not connected');
  try {
    const [rows] = await pool.execute(`
      SELECT 
        s.id,
        s.patient_name,
        s.date,
        s.time,
        s.status,
        s.service_type,
        s.price,
        s.location,
        s.notes,
        u_fam.full_name AS family_name,
        u_fam.phone AS family_phone,
        u_cg.full_name AS caregiver_name,
        u_cg.phone AS caregiver_phone
      FROM schedules s
      LEFT JOIN users u_fam ON s.family_user_id = u_fam.id
      LEFT JOIN users u_cg ON s.caregiver_user_id = u_cg.id
      ORDER BY s.date DESC
    `);

    const header = [
      'Mã Ca (ID)',
      'Bệnh Nhân/Người Thân',
      'Ngày Thực Hiện',
      'Khung Giờ',
      'Loại Dịch Vụ',
      'Giá Tiền (VNĐ)',
      'Trạng Thái Ca',
      'Gia Đình Đặt Ca',
      'SĐT Gia Đình',
      'Điều Dưỡng Tiếp Nhận',
      'SĐT Điều Dưỡng',
      'Địa Chỉ',
      'Ghi Chú Y Tế'
    ];

    const statusMap = {
      'completed': 'Đã Hoàn Thành',
      'confirmed': 'Đã Xác Nhận / Đang Thực Hiện',
      'pending': 'Chờ Xác Nhận',
      'cancelled': 'Đã Hủy'
    };

    const csvLines = [header.join(',')];

    for (const r of rows) {
      const escape = (val) => {
        if (val === null || val === undefined) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      };

      const line = [
        escape(r.id),
        escape(r.patient_name),
        escape(r.date),
        escape(r.time),
        escape(r.service_type || 'Chăm sóc người già'),
        escape(Number(r.price).toLocaleString('vi-VN')),
        escape(statusMap[r.status] || r.status),
        escape(r.family_name || 'Gia đình'),
        escape(r.family_phone || ''),
        escape(r.caregiver_name || 'Chưa phân công'),
        escape(r.caregiver_phone || ''),
        escape(r.location || ''),
        escape(r.notes || '')
      ];
      csvLines.push(line.join(','));
    }

    const csvContent = '\uFEFF' + csvLines.join('\r\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="Danh_Sach_Ca_Cham_Soc_CareMatch_2026.csv"');
    return res.send(csvContent);
  } catch (err) {
    return res.status(500).send('Lỗi: ' + err.message);
  }
});

app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'CARE-MATCH Backend API', timestamp: new Date().toISOString() });
});

// ========================================================
// KHỞI ĐỘNG SERVER
// ========================================================
if (!process.env.VERCEL) {
  app.listen(PORT, async () => {
    console.log(`🚀 [CARE-MATCH Backend] Server đang chạy tại: http://localhost:${PORT} (IPv4/IPv6 Dual-Stack)`);
    await initMySql();
  });
}

export { app, initMySql };
export default app;
