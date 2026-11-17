/**
 * SCRIPT NẠP DỮ LIỆU MẪU CHUẨN CHO POSTGRESQL / SUPABASE (TƯƠNG ĐƯƠNG reseed_database.cjs BÊN MYSQL)
 * Chạy: node server/reseed_postgres.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPgPool } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function reseed() {
  const pool = getPgPool();
  console.log('🔄 Bắt đầu chuẩn hóa schema và nạp đầy đủ dữ liệu CARE-MATCH lên Supabase PostgreSQL...');

  // Đảm bảo schema 18 bảng tồn tại
  const schemaPath = path.join(__dirname, 'schema_postgres.sql');
  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    await pool.query(schemaSql);
  }

  // Dọn dữ liệu cũ (theo thứ tự khóa ngoại)
  const tablesToTruncate = [
    'booking_escrow_payments',
    'transactions',
    'family_subscriptions',
    'patient_care_logs',
    'schedules',
    'caregiver_reviews',
    'caregiver_documents',
    'caregiver_bank_accounts',
    'caregiver_profiles',
    'elderly_profiles',
    'family_profiles',
    'messages',
    'notifications',
    'password_resets',
    'users'
  ];
  await pool.query(`TRUNCATE TABLE ${tablesToTruncate.join(', ')} RESTART IDENTITY CASCADE`);
  console.log('  ✓ Đã làm sạch các bảng giao dịch & hồ sơ cũ');

  // 1. NẠP USERS (giữ nguyên toàn bộ user từ reseed_database.cjs + 3 caregiver cơ bản 2,3,4)
  const users = [
    { id: 1, username: 'admin', email: 'admin@carematch.vn', role: 'admin', full_name: 'Admin Quản Trị', phone: '0901234567' },
    { id: 2, username: 'lananh', email: 'lananh.care@example.com', role: 'caregiver', full_name: 'Nguyễn Lan Anh', phone: '0912345678' },
    { id: 3, username: 'thuha', email: 'thuha.care@example.com', role: 'caregiver', full_name: 'Trần Thu Hà', phone: '0988765432' },
    { id: 4, username: 'maichi', email: 'maichi.care@example.com', role: 'caregiver', full_name: 'Lê Mai Chi', phone: '0903112233' },
    { id: 5, username: 'mai', email: 'mai@carematch.vn', role: 'family', full_name: 'Nguyễn Thị Mai', phone: '0956789012' },
    { id: 10, username: 'hung_nguyen', email: 'hung.nguyen@carematch.vn', role: 'family', full_name: 'Nguyễn Văn Hùng', phone: '0912345678' },
    { id: 11, username: 'trong_tran', email: 'trong.tran@carematch.vn', role: 'family', full_name: 'Trần Đình Trọng', phone: '0923456789' },
    { id: 12, username: 'long_le', email: 'long.le@carematch.vn', role: 'family', full_name: 'Lê Hoàng Long', phone: '0934567890' },
    { id: 13, username: 'quan_do', email: 'quan.do@carematch.vn', role: 'family', full_name: 'Đỗ Minh Quân', phone: '0945678901' },
    { id: 20, username: 'thao_nguyen', email: 'thao.nguyen@carematch.vn', role: 'caregiver', full_name: 'Nguyễn Phương Thảo', phone: '0981112233' },
    { id: 21, username: 'tuan_tran', email: 'tuan.tran@carematch.vn', role: 'caregiver', full_name: 'Trần Văn Tuấn', phone: '0982223344' },
    { id: 22, username: 'hong_le', email: 'hong.le@carematch.vn', role: 'caregiver', full_name: 'Lê Thị Hồng', phone: '0983334455' },
    { id: 23, username: 'huy_pham', email: 'huy.pham@carematch.vn', role: 'caregiver', full_name: 'Phạm Đức Huy', phone: '0984445566' },
    { id: 24, username: 'trang_hoang', email: 'trang.hoang@carematch.vn', role: 'caregiver', full_name: 'Hoàng Thu Trang', phone: '0985556677' },
    { id: 25, username: 'bao_vu', email: 'bao.vu@carematch.vn', role: 'caregiver', full_name: 'Vũ Quốc Bảo', phone: '0986667788' },
    { id: 26, username: 'anh_do', email: 'anh.do@carematch.vn', role: 'caregiver', full_name: 'Đỗ Ngọc Ánh', phone: '0987778899' },
    { id: 27, username: 'tri_bui', email: 'tri.bui@carematch.vn', role: 'caregiver', full_name: 'Bùi Minh Trí', phone: '0988889900' },
    { id: 31, username: 'tuantest15', email: 'tuantest15@carematch.vn', role: 'family', full_name: 'Trần Anh Tuấn', phone: '0967890123' },
    { id: 44, username: 'test', email: 'test@carematch.vn', role: 'family', full_name: 'Lê Văn An', phone: '0978901234' },
  ];

  for (const u of users) {
    const initials = u.full_name.split(' ').map((w) => w[0]).join('').slice(-2).toUpperCase();
    await pool.query(
      `INSERT INTO users (id, username, email, password_hash, role, full_name, phone, avatar_initials)
       VALUES ($1, $2, $3, '123456', $4, $5, $6, $7)`,
      [u.id, u.username, u.email, u.role, u.full_name, u.phone, initials]
    );
  }
  console.log(`  ✓ Đã nạp ${users.length} tài khoản người dùng`);

  // 2. NẠP HỒ SƠ GIA ĐÌNH (family_profiles)
  const familyProfiles = [
    { user_id: 10, representative_name: 'Nguyễn Văn Hùng', phone: '0912345678', email: 'hung.nguyen@carematch.vn', address: 'Số 15 phố Tôn Thất Tùng', district: 'Đống Đa', is_premium: true },
    { user_id: 11, representative_name: 'Trần Đình Trọng', phone: '0923456789', email: 'trong.tran@carematch.vn', address: 'Số 42 đường Cầu Giấy', district: 'Cầu Giấy', is_premium: false },
    { user_id: 12, representative_name: 'Lê Hoàng Long', phone: '0934567890', email: 'long.le@carematch.vn', address: 'Số 88 phố Kim Mã', district: 'Ba Đình', is_premium: false },
    { user_id: 13, representative_name: 'Đỗ Minh Quân', phone: '0945678901', email: 'quan.do@carematch.vn', address: 'Số 102 phố Bạch Mai', district: 'Hai Bà Trưng', is_premium: false },
    { user_id: 5, representative_name: 'Nguyễn Thị Mai', phone: '0956789012', email: 'mai@carematch.vn', address: 'Số 26 phố Hoàng Cầu', district: 'Đống Đa', is_premium: false },
    { user_id: 31, representative_name: 'Trần Anh Tuấn', phone: '0967890123', email: 'tuantest15@carematch.vn', address: 'Số 74 phố Duy Tân', district: 'Cầu Giấy', is_premium: false },
    { user_id: 44, representative_name: 'Lê Văn An', phone: '0978901234', email: 'test@carematch.vn', address: 'Số 12 phố Trần Phú', district: 'Ba Đình', is_premium: false },
  ];

  for (const fp of familyProfiles) {
    await pool.query(
      `INSERT INTO family_profiles (user_id, representative_name, phone, email, id_number, address, district, verification_status, is_premium)
       VALUES ($1, $2, $3, $4, '001099887766', $5, $6, 'approved', $7)`,
      [fp.user_id, fp.representative_name, fp.phone, fp.email, fp.address, fp.district, fp.is_premium]
    );
  }
  console.log('  ✓ Đã nạp 7 hồ sơ gia đình');

  // 3. NẠP 8 HỒ SƠ NGƯỜI CAO TUỔI (elderly_profiles)
  const elderlyList = [
    { id: 1, user_id: 10, full_name: 'Nguyễn Đỗ Tiến Danh', dob: '1954-04-12', gender: 'Nam', address: 'Số 15 phố Tôn Thất Tùng', district: 'Đống Đa', contact_name: 'Nguyễn Văn Hùng', contact_phone: '0912345678', care_needs: JSON.stringify(['Hỗ trợ phục hồi sau tai biến nhẹ', 'Đo sinh hiệu mỗi sáng']) },
    { id: 2, user_id: 10, full_name: 'Trần Thị Mai', dob: '1958-09-20', gender: 'Nữ', address: 'Số 15 phố Tôn Thất Tùng', district: 'Đống Đa', contact_name: 'Nguyễn Văn Hùng', contact_phone: '0912345678', care_needs: JSON.stringify(['Chế độ dinh dưỡng ăn kiêng huyết áp', 'Nhắc uống thuốc tim mạch']) },
    { id: 3, user_id: 11, full_name: 'Trần Anh Tuấn', dob: '1951-11-05', gender: 'Nam', address: 'Số 42 đường Cầu Giấy', district: 'Cầu Giấy', contact_name: 'Trần Đình Trọng', contact_phone: '0923456789', care_needs: JSON.stringify(['Tập vận động khớp gối nhẹ nhàng', 'Theo dõi thân nhiệt']) },
    { id: 4, user_id: 11, full_name: 'Phạm Hoàng Nam', dob: '1956-02-18', gender: 'Nam', address: 'Số 42 đường Cầu Giấy', district: 'Cầu Giấy', contact_name: 'Trần Đình Trọng', contact_phone: '0923456789', care_needs: JSON.stringify(['Hỗ trợ sinh hoạt hàng ngày', 'Xoa bóp cơ gối hồi phục']) },
    { id: 5, user_id: 12, full_name: 'Lê Văn An', dob: '1946-08-10', gender: 'Nam', address: 'Số 88 phố Kim Mã', district: 'Ba Đình', contact_name: 'Lê Hoàng Long', contact_phone: '0934567890', care_needs: JSON.stringify(['Hỗ trợ đi lại an toàn', 'Đo huyết áp và thân nhiệt 2 lần/ngày']) },
    { id: 6, user_id: 12, full_name: 'Vũ Minh Đức', dob: '1952-06-25', gender: 'Nam', address: 'Số 88 phố Kim Mã', district: 'Ba Đình', contact_name: 'Lê Hoàng Long', contact_phone: '0934567890', care_needs: JSON.stringify(['Xoa bóp cơ gối', 'Theo dõi giấc ngủ và tâm trạng']) },
    { id: 7, user_id: 13, full_name: 'Đỗ Thị Cúc', dob: '1957-12-01', gender: 'Nữ', address: 'Số 102 phố Bạch Mai', district: 'Hai Bà Trưng', contact_name: 'Đỗ Minh Quân', contact_phone: '0945678901', care_needs: JSON.stringify(['Hỗ trợ vệ sinh cá nhân', 'Nhắc uống thuốc sau ăn', 'Theo dõi đường huyết']) },
    { id: 8, user_id: 13, full_name: 'Đặng Kim Ngân', dob: '1955-03-14', gender: 'Nữ', address: 'Số 102 phố Bạch Mai', district: 'Hai Bà Trưng', contact_name: 'Đỗ Minh Quân', contact_phone: '0945678901', care_needs: JSON.stringify(['Đi dạo nhẹ nhàng', 'Bữa ăn mềm dinh dưỡng']) },
    { id: 9, user_id: 5, full_name: 'Nguyễn Thị Lan', dob: '1946-05-15', gender: 'Nữ', address: 'Số 26 phố Hoàng Cầu', district: 'Đống Đa', contact_name: 'Nguyễn Thị Mai', contact_phone: '0956789012', care_needs: JSON.stringify(['Theo dõi huyết áp', 'Nấu ăn mềm ít muối', 'Hỗ trợ vận động']) },
  ];

  for (const el of elderlyList) {
    await pool.query(
      `INSERT INTO elderly_profiles (id, user_id, full_name, date_of_birth, gender, address, district, contact_name, contact_phone, care_needs, verification_status, adl_score)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'verified', 85)`,
      [el.id, el.user_id, el.full_name, el.dob, el.gender, el.address, el.district, el.contact_name, el.contact_phone, el.care_needs]
    );
  }
  console.log('  ✓ Đã nạp 9 hồ sơ người cần chăm sóc');

  // 4. NẠP 11 HỒ SƠ CHUYÊN VIÊN CHĂM SÓC (caregiver_profiles) + TÀI KHOẢN NGÂN HÀNG
  const caregiverProfiles = [
    { user_id: 2, title: 'Chuyên viên chăm sóc & Điều dưỡng sơ cấp', exp: 8, rate: 100000, shift_rate: 450000, district: 'Cầu Giấy & Hai Bà Trưng', rating: 4.9, reviews: 38, care_score: 96, skills: ['Theo dõi huyết áp', 'Nấu ăn mềm', 'Phục hồi vận động', 'Chăm sóc sau tai biến'], bio: '8 năm kinh nghiệm chăm sóc người cao tuổi sau điều trị, tận tâm và chu đáo.' },
    { user_id: 3, title: 'Chuyên viên chăm sóc & Vật lý trị liệu', exp: 6, rate: 110000, shift_rate: 500000, district: 'Đống Đa', rating: 4.8, reviews: 24, care_score: 95, skills: ['Điều dưỡng', 'Vật lý trị liệu', 'Đo huyết áp', 'Theo dõi phục hồi'], bio: 'Thế mạnh theo dõi phục hồi và hướng dẫn vận động nhẹ nhàng tại nhà.' },
    { user_id: 4, title: 'Chuyên viên đồng hành người cao tuổi', exp: 5, rate: 90000, shift_rate: 400000, district: 'Ba Đình', rating: 4.7, reviews: 19, care_score: 93, skills: ['Trò chuyện & đồng hành tâm lý', 'Đi chợ & nấu ăn', 'Đồng hành khám bệnh'], bio: 'Năng lượng ấm áp, phù hợp đồng hành cùng ông bà hàng ngày.' },
    { user_id: 20, title: 'Chuyên viên phục hồi chức năng & Sinh hiệu', exp: 5, rate: 90000, shift_rate: 400000, district: 'Đống Đa', rating: 4.9, reviews: 45, care_score: 96, skills: ['Phục hồi sau tai biến', 'Đo sinh hiệu', 'Chăm sóc hậu phẫu'], bio: '5 năm kinh nghiệm chăm sóc chuyên biệt cho người cao tuổi sau phẫu thuật và đột quỵ.' },
    { user_id: 21, title: 'Chuyên viên chăm sóc dinh dưỡng & Sinh hoạt', exp: 3, rate: 80000, shift_rate: 350000, district: 'Cầu Giấy', rating: 4.8, reviews: 32, care_score: 92, skills: ['Nấu cháo dinh dưỡng', 'Chế độ ăn tiểu đường', 'Sinh hoạt hàng ngày'], bio: '3 năm gắn bó với người cao tuổi, chế biến thức ăn kiêng cho người tiểu đường và huyết áp.' },
    { user_id: 22, title: 'Chuyên viên chăm sóc toàn diện cao cấp', exp: 6, rate: 110000, shift_rate: 500000, district: 'Ba Đình', rating: 5.0, reviews: 68, care_score: 99, skills: ['Điều dưỡng đa khoa', 'Sa sút trí tuệ', 'Chăm sóc toàn diện'], bio: '6 năm kinh nghiệm túc trực người cao tuổi sa sút trí nhớ. Kiên nhẫn, điềm tĩnh và tâm lý.' },
    { user_id: 23, title: 'Chuyên viên vật lý trị liệu & Xoa bóp bấm huyệt', exp: 4, rate: 90000, shift_rate: 400000, district: 'Hai Bà Trưng', rating: 4.7, reviews: 28, care_score: 90, skills: ['Vật lý trị liệu', 'Xoa bóp bấm huyệt', 'Phục hồi khớp gối'], bio: 'Chuyên các bài tập phục hồi khớp gối, vai gáy và hỗ trợ người già đi lại an toàn.' },
    { user_id: 24, title: 'Chuyên viên đồng hành & Trò chuyện tâm lý', exp: 7, rate: 100000, shift_rate: 450000, district: 'Tây Hồ', rating: 4.9, reviews: 82, care_score: 97, skills: ['Tâm lý tuổi già', 'Đồng hành đi dạo', 'Đọc sách báo'], bio: '7 năm kinh nghiệm chăm sóc tinh thần người cao tuổi, giúp ông bà vui vẻ và ngủ sâu giấc.' },
    { user_id: 25, title: 'Chuyên viên túc trực đêm & Hỗ trợ di chuyển', exp: 2, rate: 75000, shift_rate: 300000, district: 'Thanh Xuân', rating: 4.6, reviews: 19, care_score: 88, skills: ['Trực ca đêm', 'Phòng chống té ngã', 'Hỗ trợ di chuyển'], bio: 'Có kinh nghiệm trực đêm, hỗ trợ người già đi vệ sinh ban đêm an toàn chống trượt ngã.' },
    { user_id: 26, title: 'Chuyên viên theo dõi bệnh lý mạn tính', exp: 8, rate: 120000, shift_rate: 550000, district: 'Hoàn Kiếm', rating: 5.0, reviews: 94, care_score: 100, skills: ['Huyết áp & Tim mạch', 'Đường huyết', 'Quản lý đơn thuốc'], bio: '8 năm kinh nghiệm chuyên sâu về quản lý sinh hiệu, theo dõi bệnh nhân huyết áp cao và tiểu đường.' },
    { user_id: 27, title: 'Chuyên viên vận động & Dưỡng sinh tuổi già', exp: 4, rate: 85000, shift_rate: 380000, district: 'Nam Từ Liêm', rating: 4.8, reviews: 41, care_score: 94, skills: ['Bài tập thở dưỡng sinh', 'Vận động nhẹ', 'Tăng sức đề kháng'], bio: 'Hướng dẫn các bài tập thở dưỡng sinh, vận động nhẹ nhàng giúp khí huyết lưu thông.' },
  ];

  for (const cp of caregiverProfiles) {
    const cgUser = users.find((u) => u.id === cp.user_id);
    await pool.query(
      `INSERT INTO caregiver_profiles (
        user_id, title, id_number, experience_years, hourly_rate, shift_rate, night_shift_rate, district, bio, skills, care_score, verification_status, interview_status, rating, reviews_count
      ) VALUES ($1, $2, '001099112233', $3, $4, $5, $6, $7, $8, $9, $10, 'approved', 'passed', $11, $12)`,
      [cp.user_id, cp.title, cp.exp, cp.rate, cp.shift_rate, Math.round(cp.shift_rate * 1.5), cp.district, cp.bio, JSON.stringify(cp.skills), cp.care_score, cp.rating, cp.reviews]
    );
    await pool.query(
      `INSERT INTO caregiver_bank_accounts (caregiver_user_id, bank_name, account_number, account_holder, branch, is_default)
       VALUES ($1, 'Vietcombank', $2, $3, 'Hà Nội', TRUE)`,
      [cp.user_id, `10293847${String(cp.user_id).padStart(2, '0')}`, cgUser.full_name.toUpperCase()]
    );
  }
  console.log('  ✓ Đã nạp 11 hồ sơ người chăm sóc & tài khoản ngân hàng');

  // 5. GÓI VIP GIA ĐÌNH + 5 CA CHĂM SÓC + ESCROW + TRANSACTIONS
  await pool.query(
    `INSERT INTO family_subscriptions (
      user_id, plan_name, price, billing_cycle, status, start_date, end_date, payment_method, transaction_code, priority_matching, priority_booking, priority_support, dedicated_support_247, notes, created_at
    ) VALUES (
      10, 'Gói Gia Đình VIP', 300000, 'monthly', 'active', '2026-09-01', '2026-12-31', 'Chuyển khoản QR', 'VIP-20260901-001', TRUE, TRUE, TRUE, TRUE, 'Đăng ký nâng cấp gói VIP gia đình', '2026-09-20 09:15:00'
    )`
  );

  const shiftsData = [
    { code: 'ESC-20260927-001', fam_id: 10, cg_id: 21, cg_name: 'Trần Văn Tuấn', elderly_id: 1, patient_name: 'Nguyễn Đỗ Tiến Danh', shift_date: '2026-09-27', shift_time: '08:00 - 12:00', total_amount: 400000, platform_fee: 140000, caregiver_earnings: 260000, escrow_status: 'paid_out', created_at: '2026-09-27 08:00:00' },
    { code: 'ESC-20260925-002', fam_id: 10, cg_id: 22, cg_name: 'Lê Thị Hồng', elderly_id: 2, patient_name: 'Trần Thị Mai', shift_date: '2026-09-25', shift_time: '13:00 - 17:00', total_amount: 500000, platform_fee: 175000, caregiver_earnings: 325000, escrow_status: 'paid_out', created_at: '2026-09-25 13:00:00' },
    { code: 'ESC-20260924-003', fam_id: 11, cg_id: 20, cg_name: 'Nguyễn Phương Thảo', elderly_id: 3, patient_name: 'Trần Anh Tuấn', shift_date: '2026-09-24', shift_time: '08:00 - 12:00', total_amount: 450000, platform_fee: 157500, caregiver_earnings: 292500, escrow_status: 'paid_out', created_at: '2026-09-24 08:00:00' },
    { code: 'ESC-20260922-004', fam_id: 12, cg_id: 23, cg_name: 'Phạm Đức Huy', elderly_id: 5, patient_name: 'Lê Văn An', shift_date: '2026-09-22', shift_time: '14:00 - 18:00', total_amount: 400000, platform_fee: 140000, caregiver_earnings: 260000, escrow_status: 'in_escrow', created_at: '2026-09-22 14:00:00' },
    { code: 'ESC-20260919-005', fam_id: 13, cg_id: 24, cg_name: 'Hoàng Thu Trang', elderly_id: 7, patient_name: 'Đỗ Thị Cúc', shift_date: '2026-09-19', shift_time: '08:00 - 12:00', total_amount: 350000, platform_fee: 122500, caregiver_earnings: 227500, escrow_status: 'in_escrow', created_at: '2026-09-19 08:00:00' },
    { code: 'ESC-20261117-006', fam_id: 5, cg_id: 2, cg_name: 'Nguyễn Lan Anh', elderly_id: 9, patient_name: 'Nguyễn Thị Lan', shift_date: '2026-11-18', shift_time: '08:30 - 12:30', total_amount: 450000, platform_fee: 157500, caregiver_earnings: 292500, escrow_status: 'in_escrow', created_at: '2026-11-17 09:00:00' },
  ];

  for (const s of shiftsData) {
    const schedRes = await pool.query(
      `INSERT INTO schedules (
        family_user_id, caregiver_user_id, elderly_profile_id, elderly_name, caregiver_name, schedule_date, time_slot, title, tasks, status, price, is_rated, rating, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Đo sinh hiệu, hỗ trợ vận động, nhắc thuốc đúng giờ', $9, $10, $11, $12, $13) RETURNING id`,
      [s.fam_id, s.cg_id, s.elderly_id, s.patient_name, s.cg_name, `Ngày ${s.shift_date}`, s.shift_time, `Ca chăm sóc cho ${s.patient_name}`, s.escrow_status === 'paid_out' ? 'completed' : 'confirmed', s.total_amount, s.escrow_status === 'paid_out', s.escrow_status === 'paid_out' ? 5 : null, s.created_at]
    );
    const scheduleId = schedRes.rows[0].id;

    await pool.query(
      `INSERT INTO booking_escrow_payments (
        transaction_code, schedule_id, family_user_id, caregiver_user_id, patient_name, shift_date, shift_time, total_amount, platform_fee, caregiver_earnings, escrow_status, payment_method, family_paid_at, released_at, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'Chuyển khoản QR', $12, $13, $14)`,
      [s.code, scheduleId, s.fam_id, s.cg_id, s.patient_name, s.shift_date, s.shift_time, s.total_amount, s.platform_fee, s.caregiver_earnings, s.escrow_status, s.created_at, s.escrow_status === 'paid_out' ? s.created_at : null, s.created_at]
    );

    await pool.query(
      `INSERT INTO transactions (
        transaction_code, schedule_id, family_user_id, caregiver_user_id, service_name, total_amount, platform_fee, payout_amount, family_payment_status, caregiver_payout_status, payment_method, created_at, paid_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'paid', $9, 'Chuyển khoản QR', $10, $11)`,
      [s.code, scheduleId, s.fam_id, s.cg_id, `Ca chăm sóc cho ${s.patient_name}`, s.total_amount, s.platform_fee, s.caregiver_earnings, s.escrow_status === 'paid_out' ? 'paid' : 'pending', s.created_at, s.created_at]
    );
  }
  console.log('  ✓ Đã nạp 6 ca chăm sóc, ký quỹ Escrow & giao dịch');

  // 6. NẠP 8 SỔ THEO DÕI Y TẾ (patient_care_logs)
  const careLogs = [
    { fam_id: 10, cg_id: 21, elderly_id: 1, elderly_name: 'Nguyễn Đỗ Tiến Danh', family_name: 'Gia đình Nguyễn Văn Hùng', cg_name: 'Trần Văn Tuấn', log_date: '2026-09-27', time_slot: 'Ca sáng (08:00 - 12:00)', sys: 122, dia: 80, hr: 74, temp: 36.6, spo2: 98, sugar: 5.6, weight: 64.5, cond: 'good', notes: 'Bệnh nhân hồi phục cử động tay phải rất khả quan. Ăn hết khẩu phần cháo hạt sen, tinh thần vui vẻ.' },
    { fam_id: 10, cg_id: 22, elderly_id: 2, elderly_name: 'Trần Thị Mai', family_name: 'Gia đình Nguyễn Văn Hùng', cg_name: 'Lê Thị Hồng', log_date: '2026-09-25', time_slot: 'Ca chiều (13:00 - 17:00)', sys: 120, dia: 78, hr: 76, temp: 36.8, spo2: null, sugar: null, weight: 56.0, cond: 'good', notes: 'Huyết áp ổn định, đã nhắc uống thuốc hạ áp sau bữa ăn nhẹ lúc 14:00.' },
    { fam_id: 11, cg_id: 20, elderly_id: 3, elderly_name: 'Trần Anh Tuấn', family_name: 'Gia đình Trần Đình Trọng', cg_name: 'Nguyễn Phương Thảo', log_date: '2026-09-24', time_slot: 'Ca sáng (08:00 - 12:00)', sys: 135, dia: 85, hr: 82, temp: 37.1, spo2: 97, sugar: null, weight: 68.0, cond: 'attention', notes: 'Huyết áp hơi cao nhẹ do đêm trước ngủ muộn. Đã nghỉ ngơi 30 phút, chỉ số giảm về 125/82.' },
    { fam_id: 11, cg_id: 23, elderly_id: 4, elderly_name: 'Phạm Hoàng Nam', family_name: 'Gia đình Trần Đình Trọng', cg_name: 'Phạm Đức Huy', log_date: '2026-09-23', time_slot: 'Ca sáng (08:00 - 12:00)', sys: 118, dia: 76, hr: 72, temp: 36.5, spo2: null, sugar: null, weight: 62.0, cond: 'good', notes: 'Tập bài tập co duỗi khớp gối 20 phút. Bệnh nhân đi lại vững vàng hơn.' },
    { fam_id: 12, cg_id: 23, elderly_id: 5, elderly_name: 'Lê Văn An', family_name: 'Gia đình Lê Hoàng Long', cg_name: 'Phạm Đức Huy', log_date: '2026-09-22', time_slot: 'Ca chiều (14:00 - 18:00)', sys: 126, dia: 82, hr: 75, temp: 36.7, spo2: 99, sugar: 5.4, weight: 59.5, cond: 'good', notes: 'Thân nhiệt và huyết áp hoàn toàn bình thường.' },
    { fam_id: 12, cg_id: 25, elderly_id: 6, elderly_name: 'Vũ Minh Đức', family_name: 'Gia đình Lê Hoàng Long', cg_name: 'Vũ Quốc Bảo', log_date: '2026-09-21', time_slot: 'Ca sáng (08:00 - 12:00)', sys: 124, dia: 80, hr: 78, temp: 36.8, spo2: null, sugar: null, weight: 65.0, cond: 'good', notes: 'Tâm trạng thoải mái, tinh thần lạc quan. Đi dạo trong vườn.' },
    { fam_id: 13, cg_id: 24, elderly_id: 7, elderly_name: 'Đỗ Thị Cúc', family_name: 'Gia đình Đỗ Minh Quân', cg_name: 'Hoàng Thu Trang', log_date: '2026-09-19', time_slot: 'Ca sáng (08:00 - 12:00)', sys: 128, dia: 82, hr: 76, temp: 36.7, spo2: 98, sugar: 6.1, weight: 54.5, cond: 'good', notes: 'Đường huyết sau ăn 2 tiếng đạt 6.1 mmol/L trong ngưỡng kiểm soát an toàn.' },
    { fam_id: 5, cg_id: 2, elderly_id: 9, elderly_name: 'Nguyễn Thị Lan', family_name: 'Gia đình Nguyễn Thị Mai', cg_name: 'Nguyễn Lan Anh', log_date: '2026-11-16', time_slot: 'Ca sáng (08:30 - 12:30)', sys: 120, dia: 78, hr: 72, temp: 36.6, spo2: 98, sugar: 5.5, weight: 52.0, cond: 'good', notes: 'Bà ăn hết phần cháo, uống thuốc huyết áp đúng giờ và đi bộ nhẹ 15 phút.' },
  ];

  const defaultTasks = JSON.stringify(['Đo sinh hiệu (Huyết áp, Nhịp tim, Thân nhiệt)', 'Hỗ trợ vệ sinh cá nhân & vận động', 'Nhắc uống thuốc theo đơn đúng giờ']);
  for (const cl of careLogs) {
    await pool.query(
      `INSERT INTO patient_care_logs (
        family_user_id, caregiver_user_id, elderly_profile_id, elderly_name, family_name, caregiver_name, log_date, time_slot,
        blood_pressure_systolic, blood_pressure_diastolic, heart_rate, blood_sugar, temperature, spo2, weight,
        meal_status, medication_status, sleep_mood, mobility_exercise, tasks_completed, overall_condition, caregiver_notes,
        family_acknowledged, family_note
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'Ăn uống ngon miệng, đúng khẩu phần dinh dưỡng', 'Đã uống thuốc theo đơn sau bữa ăn', 'Tinh thần tỉnh táo, ngủ sâu giấc', 'Vận động nhẹ nhàng 20 phút', $16, $17, $18, TRUE, 'Gia đình đã xem và rất yên tâm!')`,
      [cl.fam_id, cl.cg_id, cl.elderly_id, cl.elderly_name, cl.family_name, cl.cg_name, cl.log_date, cl.time_slot, cl.sys, cl.dia, cl.hr, cl.sugar, cl.temp, cl.spo2, cl.weight, defaultTasks, cl.cond, cl.notes]
    );
  }
  console.log('  ✓ Đã nạp 8 sổ theo dõi sức khỏe sau ca');

  // 7. NẠP TIN NHẮN MẪU GIỮA 3 ĐỐI TƯỢNG (Gia đình - Người chăm sóc - Admin)
  const sampleMessages = [
    { conv: 'conv_2_5', sId: 5, sName: 'Nguyễn Thị Mai', sRole: 'family', rId: 2, rName: 'Nguyễn Lan Anh', content: 'Chào chị Lan Anh, ngày mai chị đến lúc 8h30 chăm sóc mẹ Lan nhé ạ.', isRead: true },
    { conv: 'conv_2_5', sId: 2, sName: 'Nguyễn Lan Anh', sRole: 'caregiver', rId: 5, rName: 'Nguyễn Thị Mai', content: 'Dạ vâng chị Mai, 8h30 sáng mai em có mặt đúng giờ để đo huyết áp cho mẹ ạ!', isRead: true },
    { conv: 'conv_1_5', sId: 5, sName: 'Nguyễn Thị Mai', sRole: 'family', rId: 1, rName: 'Admin Quản Trị', content: 'Chào Admin, gia đình tôi muốn hỏi về thủ tục đổi lịch ca chăm sóc.', isRead: true },
    { conv: 'conv_1_5', sId: 1, sName: 'Admin Quản Trị', sRole: 'admin', rId: 5, rName: 'Nguyễn Thị Mai', content: 'Chào chị Mai! Chị có thể đổi lịch ca trực tiếp trên mục Lịch trình trước giờ làm nhé ạ.', isRead: true },
    { conv: 'conv_1_2', sId: 2, sName: 'Nguyễn Lan Anh', sRole: 'caregiver', rId: 1, rName: 'Admin Quản Trị', content: 'Chào Admin, em đã cập nhật chứng chỉ điều dưỡng mới trên hồ sơ ạ.', isRead: true },
    { conv: 'conv_1_2', sId: 1, sName: 'Admin Quản Trị', sRole: 'admin', rId: 2, rName: 'Nguyễn Lan Anh', content: 'Cảm ơn Lan Anh! Admin đã kiểm tra và xác thực chứng chỉ của bạn thành công.', isRead: true },
  ];

  for (const m of sampleMessages) {
    await pool.query(
      `INSERT INTO messages (conversation_id, sender_user_id, sender_name, sender_role, recipient_user_id, recipient_name, content, is_read)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [m.conv, m.sId, m.sName, m.sRole, m.rId, m.rName, m.content, m.isRead]
    );
  }
  console.log('  ✓ Đã nạp tin nhắn mẫu giữa 3 vai trò (Gia đình - Người chăm sóc - Admin)');

  // 8. ĐÁNH GIÁ MẪU (caregiver_reviews)
  const reviews = [
    { cg_id: 2, fam_id: 5, fam_name: 'Nguyễn Thị Mai', patient: 'Nguyễn Thị Lan', service: 'Ca chăm sóc buổi sáng (4 tiếng)', rating: 5, tags: ['Đúng giờ', 'Tận tâm', 'Kỹ năng tốt'], text: 'Chị Lan Anh chăm sóc mẹ tôi rất chu đáo và đúng giờ.' },
    { cg_id: 3, fam_id: 10, fam_name: 'Nguyễn Văn Hùng', patient: 'Nguyễn Đỗ Tiến Danh', service: 'Ca chăm sóc phục hồi chức năng', rating: 5, tags: ['Chuyên môn cao', 'Kiên nhẫn'], text: 'Chuyên viên hướng dẫn tập vận động rất bài bản, gia đình rất an tâm.' },
  ];
  for (const rv of reviews) {
    await pool.query(
      `INSERT INTO caregiver_reviews (schedule_id, caregiver_user_id, family_user_id, family_name, patient_name, service_title, rating, tags, review_text, status)
       VALUES (NULL, $1, $2, $3, $4, $5, $6, $7, $8, 'approved')`,
      [rv.cg_id, rv.fam_id, rv.fam_name, rv.patient, rv.service, rv.rating, JSON.stringify(rv.tags), rv.text]
    );
  }

  // Đồng bộ lại toàn bộ SERIAL sequences
  const seqTables = [
    'users', 'password_resets', 'elderly_profiles', 'family_profiles', 'family_subscriptions',
    'caregiver_profiles', 'caregiver_documents', 'caregiver_bank_accounts', 'schedules',
    'booking_escrow_payments', 'transactions', 'vouchers', 'messages', 'notifications',
    'communities', 'caregiver_reviews', 'patient_care_logs'
  ];
  for (const tbl of seqTables) {
    await pool.query(
      `SELECT setval(pg_get_serial_sequence($1, 'id'), COALESCE((SELECT MAX(id) FROM "${tbl}"), 1), COALESCE((SELECT MAX(id) FROM "${tbl}"), 0) > 0)`,
      [tbl]
    );
  }
  console.log('🎉 ĐÃ HOÀN TẤT NẠP TOÀN BỘ DỮ LIỆU CHUẨN LÊN SUPABASE POSTGRESQL!');
  await pool.end();
}

reseed().catch((err) => {
  console.error('❌ Lỗi reseed:', err);
  process.exit(1);
});
