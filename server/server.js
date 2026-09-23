import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';
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
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/uploads', express.static(uploadsDir));

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'care_match_db',
  port: Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

let pool = null;
let isMySqlConnected = false;

// ========================================================
// KHỞI TẠO KẾT NỐI MYSQL
// ========================================================
async function initMySql() {
  try {
    pool = mysql.createPool(dbConfig);
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    isMySqlConnected = true;
    console.log('✅ [MySQL] Đã kết nối thành công đến cơ sở dữ liệu: care_match_db');
    await initTransactionsTable();
    await initCaregiverProfiles();
  } catch (err) {
    isMySqlConnected = false;
    console.error('⚠️ [MySQL] Lỗi kết nối MySQL:', err.message);
  }
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
    const [caregivers] = await pool.execute("SELECT id, username, full_name, email FROM users WHERE role = 'caregiver'");
    for (const cg of caregivers) {
      const [existing] = await pool.execute('SELECT id FROM caregiver_profiles WHERE user_id = ? LIMIT 1', [cg.id]);
      if (existing.length === 0) {
        let title = 'Người chăm sóc người cao tuổi';
        let exp = 0;
        let score = 0;
        let skills = '[]';
        let bio = '';
        let district = '';
        let vStatus = 'not_submitted';

        if (cg.username === 'thuha') {
          title = 'Điều dưỡng chăm sóc tại nhà';
          exp = 6;
          score = 95;
          skills = '["Điều dưỡng", "Vật lý trị liệu", "Đo huyết áp", "Theo dõi phục hồi"]';
          bio = 'Chị Thu Hà là điều dưỡng, có thế mạnh về theo dõi phục hồi và hướng dẫn vận động nhẹ nhàng tại nhà.';
          district = 'Đống Đa';
          vStatus = 'approved';
        } else if (cg.username === 'maichi') {
          title = 'Bạn đồng hành người cao tuổi';
          exp = 5;
          score = 93;
          skills = '["Trò chuyện & đồng hành tâm lý", "Đi chợ & nấu ăn", "Đồng hành khám bệnh"]';
          bio = 'Cô Mai Chi mang đến năng lượng ấm áp, phù hợp với những gia đình cần một người bạn đồng hành đều đặn và đáng tin.';
          district = 'Ba Đình';
          vStatus = 'approved';
        }

        await pool.execute(
          `INSERT INTO caregiver_profiles (user_id, title, verification_status, care_score, experience_years, hourly_rate, district, skills, bio)
           VALUES (?, ?, ?, ?, ?, 120000, ?, ?, ?)`,
          [cg.id, title, vStatus, score, exp, district, skills, bio]
        );
        console.log(`✅ [MySQL] Đã tự động tạo hồ sơ caregiver_profiles cho user: ${cg.full_name} (#${cg.id})`);
      }
    }
  } catch (err) {
    console.error('Lỗi khởi tạo hồ sơ người chăm sóc:', err.message);
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
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    database: isMySqlConnected ? 'MySQL Connected' : 'Disconnected',
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
          await pool.execute(
            `INSERT INTO caregiver_profiles 
             (user_id, title, verification_status, care_score, experience_years, hourly_rate, district, skills, bio) 
             VALUES (?, 'Người chăm sóc người cao tuổi', 'not_submitted', 0, 0, 100000, '', '[]', '')`,
            [result.insertId]
          );
        } catch (cpErr) {
          console.error('Lỗi tạo caregiver_profiles khi đăng ký:', cpErr.message);
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

    const cleanPrefix = documentType ? documentType.replace(/[^a-zA-Z0-9_-]/g, '_') : 'doc';
    const filename = `${cleanPrefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
    const filePath = path.join(uploadsDir, filename);

    await fs.promises.writeFile(filePath, buffer);
    const fileUrl = `/uploads/${filename}`;

    console.log(`✅ [Upload] Đã lưu tệp ${filename} vào thư mục uploads/`);
    return res.json({
      success: true,
      url: fileUrl,
      filename,
      originalName: fileName || filename,
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
          title: p.title || 'Người chăm sóc người cao tuổi',
          id_number: p.id_number || '',
          experience_years: p.experience_years || 0,
          hourly_rate: p.hourly_rate || 100000,
          district: p.district || '',
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
          title: 'Người chăm sóc người cao tuổi',
          id_number: '',
          experience_years: 0,
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
  const title = req.body.title;
  const experience_years = req.body.experience_years ?? req.body.experienceYears;
  const hourly_rate = req.body.hourly_rate ?? req.body.hourlyRate;
  const district = req.body.district;
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
            title = ?,
            id_number = ?,
            experience_years = ?,
            hourly_rate = ?,
            district = ?,
            bio = ?,
            skills = ?,
            documents = ?,
            verification_status = CASE WHEN ? = 'pending' THEN 'pending' ELSE verification_status END
          WHERE id = ?`,
          [
            title || 'Người chăm sóc người cao tuổi',
            id_number || '',
            Number(experience_years) || 0,
            Number(hourly_rate) || 100000,
            district || '',
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
            (user_id, title, id_number, experience_years, hourly_rate, district, bio, skills, documents, verification_status, care_score)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
          [
            uid,
            title || 'Người chăm sóc người cao tuổi',
            id_number || '',
            Number(experience_years) || 0,
            Number(hourly_rate) || 100000,
            district || '',
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
        for (const doc of documents) {
          const docType = doc.category || doc.type || 'cccd';
          const docUrl = doc.fileUrl || doc.url;
          if (docUrl) {
            const docTypeMap = {
              'cccd': 'cccd',
              'cccd_front': 'cccd',
              'cccd_back': 'cccd',
              'policeCheck': 'police_check',
              'police_check': 'police_check',
              'judicial_record': 'police_check',
              'certificate': 'medical_certificate',
              'medical_cert': 'medical_certificate',
              'medical_certificate': 'medical_certificate',
              'healthCheck': 'health_check',
              'health_cert': 'health_check',
              'health_check': 'health_check'
            };
            const mappedType = docTypeMap[docType] || 'cccd';

            await pool.execute(
              'DELETE FROM caregiver_documents WHERE caregiver_id = ? AND document_type = ?',
              [profileId, mappedType]
            );
            await pool.execute(
              `INSERT INTO caregiver_documents (caregiver_id, document_type, document_name, file_url, status)
               VALUES (?, ?, ?, ?, 'pending')`,
              [profileId, mappedType, doc.name || mappedType, docUrl]
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
// API LẤY DANH SÁCH NGƯỜI CHĂM SÓC DÀNH CHO GIA ĐÌNH (/matches)
// ========================================================
app.get('/api/caregivers', async (req, res) => {
  if (!isMySqlConnected) return res.json([]);
  try {
    const { search, district, status } = req.query;
    let query = `
      SELECT u.id AS user_id, u.username, u.full_name, u.email, u.phone, u.role,
             cp.id AS profile_id, cp.title, cp.experience_years, cp.care_score,
             cp.verification_status, cp.hourly_rate, cp.district, cp.rating,
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
        CASE WHEN cp.verification_status = 'approved' THEN 1 ELSE 2 END,
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
      const exp = Number(r.experience_years) || 5;

      return {
        id: String(r.user_id),
        user_id: r.user_id,
        profile_id: r.profile_id,
        name: fullName,
        username: r.username,
        email: r.email,
        phone: r.phone,
        role: r.title || 'Chăm sóc người cao tuổi',
        initials,
        rating: r.rating ? String(r.rating).replace('.', ',') : '4,9',
        reviews: 20 + ((r.user_id * 7) % 30),
        experience: `${exp} năm kinh nghiệm`,
        experience_years: exp,
        distance: r.district ? `Khu vực: ${r.district}` : '2,4 km',
        district: r.district || 'Hà Nội',
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
             cp.verification_status, cp.hourly_rate, cp.district, cp.rating,
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
    const exp = Number(r.experience_years) || 5;

    return res.json({
      id: String(r.user_id),
      user_id: r.user_id,
      profile_id: r.profile_id,
      name: fullName,
      username: r.username,
      email: r.email,
      phone: r.phone,
      role: r.title || 'Chăm sóc người cao tuổi',
      initials,
      rating: r.rating ? String(r.rating).replace('.', ',') : '4,9',
      reviews: 25 + ((r.user_id * 5) % 25),
      experience: `${exp} năm kinh nghiệm`,
      experience_years: exp,
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
            care_score = COALESCE(?, care_score, 96),
            approved_by_admin_id = ?,
            approved_at = CURRENT_TIMESTAMP
          WHERE id = ?`,
          [status, care_score !== undefined ? Number(care_score) : 96, admin_id || 1, profileId]
        );
      } else {
        const [ins] = await pool.execute(
          `INSERT INTO caregiver_profiles 
           (user_id, title, verification_status, care_score, experience_years, hourly_rate, district, skills, bio, approved_by_admin_id, approved_at)
           VALUES (?, 'Người chăm sóc người cao tuổi', ?, ?, 5, 120000, 'Hà Nội', '[]', '', ?, CURRENT_TIMESTAMP)`,
          [actualUserId, status, care_score !== undefined ? Number(care_score) : 96, admin_id || 1]
        );
        profileId = ins.insertId;
      }

      if (status === 'approved') {
        // Tự động chuyển toàn bộ các tài liệu eKYC của người chăm sóc sang đã duyệt ('verified')
        await pool.execute(
          "UPDATE caregiver_documents SET status = 'verified' WHERE caregiver_id = ?",
          [profileId]
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
    status
  } = req.body;

  if (!family_user_id) {
    return res.status(400).json({ error: 'Thiếu thông tin gia đình (family_user_id)' });
  }

  if (isMySqlConnected) {
    try {
      const [result] = await pool.execute(
        `INSERT INTO schedules 
          (family_user_id, caregiver_user_id, elderly_profile_id, elderly_name, caregiver_name, schedule_date, time_slot, title, tasks, status, price)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
          status || 'confirmed',
          price || 400000
        ]
      );

      const newSchedule = {
        id: result.insertId,
        family_user_id: Number(family_user_id),
        caregiver_user_id: Number(caregiver_user_id || 2),
        elderly_profile_id: elderly_profile_id ? Number(elderly_profile_id) : null,
        elderly_name: elderly_name || 'Người thân',
        caregiver_name: caregiver_name || 'Nguyễn Lan Anh',
        schedule_date: schedule_date || 'Hôm nay',
        time_slot: time_slot || '08:30 - 12:30',
        title: title || `Ca chăm sóc (${caregiver_name || 'Nguyễn Lan Anh'})`,
        tasks: tasks || 'Chăm sóc sinh hoạt và theo dõi sức khỏe',
        status: status || 'confirmed',
        price: price || 400000,
        created_at: new Date().toISOString()
      };

      console.log(`✅ [MySQL] Đã lưu ca chăm sóc ID #${result.insertId} vào MySQL.`);

      // Tạo thông báo vào MySQL
      await createNotification(
        Number(family_user_id),
        'schedule',
        'Ca chăm sóc mới đã được tạo',
        `${schedule_date || 'Hôm nay'} · ${time_slot || '08:30 - 12:30'} với ${caregiver_name || 'Người chăm sóc'}`,
        '/schedule'
      );

      return res.status(201).json(newSchedule);
    } catch (e) {
      console.error('MySQL insert schedule error:', e.message);
      return res.status(500).json({ error: 'Lỗi lưu ca chăm sóc vào MySQL: ' + e.message });
    }
  }

  return res.status(500).json({ error: 'Chưa kết nối MySQL' });
});

// 10. Cập nhật trạng thái ca chăm sóc (MySQL)
app.patch('/api/schedules/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body;

  if (isMySqlConnected) {
    try {
      await pool.execute('UPDATE schedules SET status = ? WHERE id = ?', [status, id]);
      const [rows] = await pool.execute('SELECT * FROM schedules WHERE id = ?', [id]);
      if (rows.length > 0) {
        const item = rows[0];
        console.log(`✅ [MySQL] Đã cập nhật trạng thái ca #${id} thành: ${status}`);
        if (status === 'confirmed' && item.family_user_id) {
          await createNotification(
            item.family_user_id,
            'schedule',
            'Người chăm sóc đã nhận ca! ✓',
            `${item.caregiver_name || 'Người chăm sóc'} đã xác nhận nhận ca chăm sóc cho ${item.elderly_name || 'người thân'} (${item.schedule_date || 'Hôm nay'}).`,
            '/schedule'
          );
        } else if (status === 'completed' && item.family_user_id) {
          await createNotification(
            item.family_user_id,
            'schedule',
            'Ca chăm sóc đã hoàn thành ✓',
            `${item.caregiver_name || 'Người chăm sóc'} đã hoàn thành ca chăm sóc cho ${item.elderly_name || 'người thân'}.`,
            '/schedule'
          );
        }
        return res.json(item);
      }
      return res.status(404).json({ error: 'Không tìm thấy ca chăm sóc' });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(500).json({ error: 'Chưa kết nối MySQL' });
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

// A2. Danh sách tất cả người dùng (family + caregiver) kèm tóm tắt
app.get('/api/admin/users', async (req, res) => {
  if (!isMySqlConnected) return res.json([]);
  try {
    const { role } = req.query;
    let query = `
      SELECT u.id, u.username, u.full_name, u.email, u.phone, u.role, u.created_at,
             cp.id AS cp_id, cp.title, cp.experience_years, cp.care_score, cp.verification_status,
             cp.hourly_rate, cp.district, cp.rating,
             (SELECT COUNT(*) FROM schedules s WHERE 
               (u.role = 'family' AND s.family_user_id = u.id) OR 
               (u.role = 'caregiver' AND s.caregiver_user_id = u.id)
             ) AS schedule_count
      FROM users u
      LEFT JOIN caregiver_profiles cp ON u.id = cp.user_id
      WHERE u.role != 'admin'
    `;
    const params = [];
    if (role && role !== 'all') {
      query += ' AND u.role = ?';
      params.push(role);
    }
    query += ' ORDER BY u.created_at DESC';
    const [rows] = await pool.execute(query, params);
    return res.json(rows);
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
      return res.json({ user, elderly_profiles: elderly.map(e => ({ ...e, care_needs: parseJson(e.care_needs, []) })) });
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
      return res.json({ user, caregiver_profile: cp ? { ...cp, skills: parseJson(cp.skills, []), documents } : null });
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
    const [rows] = await pool.execute(
      'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC',
      [convId]
    );
    return res.json(rows);
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
// KHỞI ĐỘNG SERVER
// ========================================================
app.listen(PORT, async () => {
  console.log(`🚀 [CARE-MATCH Backend] Server đang chạy tại: http://localhost:${PORT}`);
  await initMySql();
});
