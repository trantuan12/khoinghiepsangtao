const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');

const envPath = fs.existsSync(path.join(__dirname, '.env')) 
  ? path.join(__dirname, '.env') 
  : path.join(process.cwd(), 'server', '.env');
require('dotenv').config({ path: envPath });

async function reseed() {
  console.log('Connecting to:', process.env.DB_HOST, process.env.DB_PORT, process.env.DB_USER, process.env.DB_NAME);
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'care_match_db'
  });

  console.log('🔄 Bắt đầu dọn dẹp và nạp lại cơ sở dữ liệu CARE-MATCH chuẩn chỉnh...');

  // Tắt kiểm tra foreign key tạm thời để truncate/clear dữ liệu cũ
  await conn.execute('SET FOREIGN_KEY_CHECKS = 0');

  const tablesToClear = [
    'booking_escrow_payments',
    'transactions',
    'family_subscriptions',
    'patient_care_logs',
    'schedules',
    'caregiver_reviews',
    'elderly_profiles',
    'family_profiles',
    'caregiver_profiles',
    'caregiver_bank_accounts',
    'caregiver_documents',
    'users'
  ];

  for (const tbl of tablesToClear) {
    try {
      await conn.execute(`TRUNCATE TABLE ${tbl}`);
      console.log(`  ✓ Đã làm sạch bảng ${tbl}`);
    } catch (e) {
      console.warn(`  ⚠️ Truncate ${tbl}:`, e.message);
    }
  }

  // 1. NẠP USERS: 1 Admin + 4 Gia đình + 8 Người chăm sóc + Giữ lại các user test cho session
  const users = [
    // Admin
    { id: 1, username: 'admin', email: 'admin@carematch.vn', role: 'admin', full_name: 'Admin Quản Trị', phone: '0901234567' },

    // 4 Gia Đình (Không danh xưng)
    { id: 10, username: 'hung_nguyen', email: 'hung.nguyen@carematch.vn', role: 'family', full_name: 'Nguyễn Văn Hùng', phone: '0912345678' },
    { id: 11, username: 'trong_tran', email: 'trong.tran@carematch.vn', role: 'family', full_name: 'Trần Đình Trọng', phone: '0923456789' },
    { id: 12, username: 'long_le', email: 'long.le@carematch.vn', role: 'family', full_name: 'Lê Hoàng Long', phone: '0934567890' },
    { id: 13, username: 'quan_do', email: 'quan.do@carematch.vn', role: 'family', full_name: 'Đỗ Minh Quân', phone: '0945678901' },

    // Các tài khoản test cho session hiện tại
    { id: 5, username: 'mai', email: 'mai@carematch.vn', role: 'family', full_name: 'Nguyễn Thị Mai', phone: '0956789012' },
    { id: 31, username: 'tuantest15', email: 'tuantest15@carematch.vn', role: 'family', full_name: 'Trần Anh Tuấn', phone: '0967890123' },
    { id: 44, username: 'test', email: 'test@carematch.vn', role: 'family', full_name: 'Lê Văn An', phone: '0978901234' },

    // 8 Người Chăm Sóc (KHÔNG danh xưng Bác sĩ hay Điều dưỡng, chỉ họ và tên)
    { id: 20, username: 'thao_nguyen', email: 'thao.nguyen@carematch.vn', role: 'caregiver', full_name: 'Nguyễn Phương Thảo', phone: '0981112233' },
    { id: 21, username: 'tuan_tran', email: 'tuan.tran@carematch.vn', role: 'caregiver', full_name: 'Trần Văn Tuấn', phone: '0982223344' },
    { id: 22, username: 'hong_le', email: 'hong.le@carematch.vn', role: 'caregiver', full_name: 'Lê Thị Hồng', phone: '0983334455' },
    { id: 23, username: 'huy_pham', email: 'huy.pham@carematch.vn', role: 'caregiver', full_name: 'Phạm Đức Huy', phone: '0984445566' },
    { id: 24, username: 'trang_hoang', email: 'trang.hoang@carematch.vn', role: 'caregiver', full_name: 'Hoàng Thu Trang', phone: '0985556677' },
    { id: 25, username: 'bao_vu', email: 'bao.vu@carematch.vn', role: 'caregiver', full_name: 'Vũ Quốc Bảo', phone: '0986667788' },
    { id: 26, username: 'anh_do', email: 'anh.do@carematch.vn', role: 'caregiver', full_name: 'Đỗ Ngọc Ánh', phone: '0987778899' },
    { id: 27, username: 'tri_bui', email: 'tri.bui@carematch.vn', role: 'caregiver', full_name: 'Bùi Minh Trí', phone: '0988889900' }
  ];

  for (const u of users) {
    const initials = u.full_name.split(' ').map(w => w[0]).join('').slice(-2).toUpperCase();
    await conn.execute(
      `INSERT INTO users (id, username, email, password_hash, role, full_name, phone, avatar_initials)
       VALUES (?, ?, ?, '123456', ?, ?, ?, ?)`,
      [u.id, u.username, u.email, u.role, u.full_name, u.phone, initials]
    );
  }
  console.log(`  ✓ Đã nạp ${users.length} tài khoản người dùng`);

  // 2. NẠP HỒ SƠ 4 GIA ĐÌNH (family_profiles)
  const familyProfiles = [
    { user_id: 10, representative_name: 'Nguyễn Văn Hùng', phone: '0912345678', email: 'hung.nguyen@carematch.vn', address: 'Số 15 phố Tôn Thất Tùng', district: 'Đống Đa', is_premium: 1 },
    { user_id: 11, representative_name: 'Trần Đình Trọng', phone: '0923456789', email: 'trong.tran@carematch.vn', address: 'Số 42 đường Cầu Giấy', district: 'Cầu Giấy', is_premium: 0 },
    { user_id: 12, representative_name: 'Lê Hoàng Long', phone: '0934567890', email: 'long.le@carematch.vn', address: 'Số 88 phố Kim Mã', district: 'Ba Đình', is_premium: 0 },
    { user_id: 13, representative_name: 'Đỗ Minh Quân', phone: '0945678901', email: 'quan.do@carematch.vn', address: 'Số 102 phố Bạch Mai', district: 'Hai Bà Trưng', is_premium: 0 },
    { user_id: 5, representative_name: 'Nguyễn Thị Mai', phone: '0956789012', email: 'mai@carematch.vn', address: 'Số 26 phố Hoàng Cầu', district: 'Đống Đa', is_premium: 0 },
    { user_id: 31, representative_name: 'Trần Anh Tuấn', phone: '0967890123', email: 'tuantest15@carematch.vn', address: 'Số 74 phố Duy Tân', district: 'Cầu Giấy', is_premium: 0 },
    { user_id: 44, representative_name: 'Lê Văn An', phone: '0978901234', email: 'test@carematch.vn', address: 'Số 12 phố Trần Phú', district: 'Ba Đình', is_premium: 0 }
  ];

  for (const fp of familyProfiles) {
    await conn.execute(
      `INSERT INTO family_profiles (user_id, representative_name, phone, email, id_number, address, district, verification_status, is_premium)
       VALUES (?, ?, ?, ?, '001099887766', ?, ?, 'approved', ?)
       ON DUPLICATE KEY UPDATE
         representative_name = VALUES(representative_name),
         phone = VALUES(phone),
         email = VALUES(email),
         address = VALUES(address),
         district = VALUES(district),
         verification_status = 'approved',
         is_premium = VALUES(is_premium)`,
      [fp.user_id, fp.representative_name, fp.phone, fp.email, fp.address, fp.district, fp.is_premium]
    );
  }
  console.log('  ✓ Đã nạp hồ sơ gia đình');

  // 3. NẠP 8 HỒ SƠ NGƯỜI CẦN CHĂM SÓC (elderly_profiles)
  // Lưu ý: Tuyệt đối KHÔNG có danh xưng Ông, Bà, Cụ, Bác, Cô đằng trước tên!
  const elderlyList = [
    // Gia đình Nguyễn Văn Hùng (user_id 10)
    { id: 1, user_id: 10, full_name: 'Nguyễn Đỗ Tiến Danh', dob: '1954-04-12', gender: 'Nam', address: 'Số 15 phố Tôn Thất Tùng', district: 'Đống Đa', contact_name: 'Nguyễn Văn Hùng', contact_phone: '0912345678', care_needs: JSON.stringify(['Hỗ trợ phục hồi sau tai biến nhẹ', 'Đo sinh hiệu mỗi sáng']) },
    { id: 2, user_id: 10, full_name: 'Trần Thị Mai', dob: '1958-09-20', gender: 'Nữ', address: 'Số 15 phố Tôn Thất Tùng', district: 'Đống Đa', contact_name: 'Nguyễn Văn Hùng', contact_phone: '0912345678', care_needs: JSON.stringify(['Chế độ dinh dưỡng ăn kiêng huyết áp', 'Nhắc uống thuốc tim mạch']) },

    // Gia đình Trần Đình Trọng (user_id 11)
    { id: 3, user_id: 11, full_name: 'Trần Anh Tuấn', dob: '1951-11-05', gender: 'Nam', address: 'Số 42 đường Cầu Giấy', district: 'Cầu Giấy', contact_name: 'Trần Đình Trọng', contact_phone: '0923456789', care_needs: JSON.stringify(['Tập vận động khớp gối nhẹ nhàng', 'Theo dõi thân nhiệt']) },
    { id: 4, user_id: 11, full_name: 'Phạm Hoàng Nam', dob: '1956-02-18', gender: 'Nam', address: 'Số 42 đường Cầu Giấy', district: 'Cầu Giấy', contact_name: 'Trần Đình Trọng', contact_phone: '0923456789', care_needs: JSON.stringify(['Hỗ trợ sinh hoạt hàng ngày', 'Xoa bóp cơ gối hồi phục']) },

    // Gia đình Lê Hoàng Long (user_id 12)
    { id: 5, user_id: 12, full_name: 'Lê Văn An', dob: '1946-08-10', gender: 'Nam', address: 'Số 88 phố Kim Mã', district: 'Ba Đình', contact_name: 'Lê Hoàng Long', contact_phone: '0934567890', care_needs: JSON.stringify(['Hỗ trợ đi lại an toàn', 'Đo huyết áp và thân nhiệt 2 lần/ngày']) },
    { id: 6, user_id: 12, full_name: 'Vũ Minh Đức', dob: '1952-06-25', gender: 'Nam', address: 'Số 88 phố Kim Mã', district: 'Ba Đình', contact_name: 'Lê Hoàng Long', contact_phone: '0934567890', care_needs: JSON.stringify(['Xoa bóp cơ gối', 'Theo dõi giấc ngủ và tâm trạng']) },

    // Gia đình Đỗ Minh Quân (user_id 13)
    { id: 7, user_id: 13, full_name: 'Đỗ Thị Cúc', dob: '1957-12-01', gender: 'Nữ', address: 'Số 102 phố Bạch Mai', district: 'Hai Bà Trưng', contact_name: 'Đỗ Minh Quân', contact_phone: '0945678901', care_needs: JSON.stringify(['Hỗ trợ vệ sinh cá nhân', 'Nhắc uống thuốc sau ăn', 'Theo dõi đường huyết']) },
    { id: 8, user_id: 13, full_name: 'Đặng Kim Ngân', dob: '1955-03-14', gender: 'Nữ', address: 'Số 102 phố Bạch Mai', district: 'Hai Bà Trưng', contact_name: 'Đỗ Minh Quân', contact_phone: '0945678901', care_needs: JSON.stringify(['Đi dạo nhẹ nhàng', 'Bữa ăn mềm dinh dưỡng']) }
  ];

  for (const el of elderlyList) {
    await conn.execute(
      `INSERT INTO elderly_profiles (id, user_id, full_name, date_of_birth, gender, address, district, contact_name, contact_phone, care_needs, verification_status, adl_score)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'verified', 85)`,
      [el.id, el.user_id, el.full_name, el.dob, el.gender, el.address, el.district, el.contact_name, el.contact_phone, el.care_needs]
    );
  }
  console.log('  ✓ Đã nạp 8 hồ sơ người cần chăm sóc (Không danh xưng)');

  // 4. NẠP 8 HỒ SƠ NGƯỜI CHĂM SÓC KHÁC BIỆT HOÀN TOÀN (caregiver_profiles)
  // KHÔNG danh xưng Bác sĩ hay Điều dưỡng, chỉ họ tên và chức danh chuyên môn chuẩn
  const caregiverProfiles = [
    {
      user_id: 20,
      title: 'Chuyên viên phục hồi chức năng & Sinh hiệu',
      exp: 5,
      rate: 90000,
      shift_rate: 400000,
      district: 'Đống Đa',
      rating: 4.9,
      reviews: 45,
      care_score: 96,
      bio: '5 năm kinh nghiệm chăm sóc chuyên biệt cho người cao tuổi sau phẫu thuật và đột quỵ. Tận tâm, chu đáo và đo chỉ số sinh tồn chính xác.'
    },
    {
      user_id: 21,
      title: 'Chuyên viên chăm sóc dinh dưỡng & Sinh hoạt',
      exp: 3,
      rate: 80000,
      shift_rate: 350000,
      district: 'Cầu Giấy',
      rating: 4.8,
      reviews: 32,
      care_score: 92,
      bio: '3 năm gắn bó với người cao tuổi, có kỹ năng nấu cháo dinh dưỡng, chế biến thức ăn kiêng cho người tiểu đường và huyết áp.'
    },
    {
      user_id: 22,
      title: 'Chuyên viên chăm sóc toàn diện cao cấp',
      exp: 6,
      rate: 110000,
      shift_rate: 500000,
      district: 'Ba Đình',
      rating: 5.0,
      reviews: 68,
      care_score: 99,
      bio: 'Tốt nghiệp chuyên ngành điều dưỡng đa khoa, có 6 năm kinh nghiệm túc trực người cao tuổi sa sút trí nhớ. Kiên nhẫn, điềm tĩnh và tâm lý.'
    },
    {
      user_id: 23,
      title: 'Chuyên viên vật lý trị liệu & Xoa bóp bấm huyệt',
      exp: 4,
      rate: 90000,
      shift_rate: 400000,
      district: 'Hai Bà Trưng',
      rating: 4.7,
      reviews: 28,
      care_score: 90,
      bio: 'Chứng chỉ phục hồi chức năng vận động. Chuyên các bài tập phục hồi khớp gối, vai gáy và hỗ trợ người già đi lại an toàn.'
    },
    {
      user_id: 24,
      title: 'Chuyên viên đồng hành & Trò chuyện tâm lý',
      exp: 7,
      rate: 100000,
      shift_rate: 450000,
      district: 'Tây Hồ',
      rating: 4.9,
      reviews: 82,
      care_score: 97,
      bio: '7 năm kinh nghiệm chăm sóc tinh thần người cao tuổi, giúp ông bà vui vẻ, ăn ngon miệng và ngủ sâu giấc hơn.'
    },
    {
      user_id: 25,
      title: 'Chuyên viên túc trực đêm & Hỗ trợ di chuyển',
      exp: 2,
      rate: 75000,
      shift_rate: 300000,
      district: 'Thanh Xuân',
      rating: 4.6,
      reviews: 19,
      care_score: 88,
      bio: 'Sức khỏe tốt, chăm chỉ và cẩn trọng. Có kinh nghiệm trực đêm, hỗ trợ người già đi vệ sinh ban đêm an toàn chống trượt ngã.'
    },
    {
      user_id: 26,
      title: 'Chuyên viên theo dõi bệnh lý mạn tính',
      exp: 8,
      rate: 120000,
      shift_rate: 550000,
      district: 'Hoàn Kiếm',
      rating: 5.0,
      reviews: 94,
      care_score: 100,
      bio: '8 năm kinh nghiệm chuyên sâu về quản lý sinh hiệu, theo dõi bệnh nhân huyết áp cao, tim mạch và tiểu đường tại nhà.'
    },
    {
      user_id: 27,
      title: 'Chuyên viên vận động & Dưỡng sinh tuổi già',
      exp: 4,
      rate: 85000,
      shift_rate: 380000,
      district: 'Nam Từ Liêm',
      rating: 4.8,
      reviews: 41,
      care_score: 94,
      bio: 'Hướng dẫn các bài tập thở dưỡng sinh, vận động nhẹ nhàng giúp khí huyết lưu thông và tăng cường sức đề kháng.'
    }
  ];

  for (const cp of caregiverProfiles) {
    await conn.execute(
      `INSERT INTO caregiver_profiles (
        user_id, title, id_number, experience_years, hourly_rate, shift_rate, district, bio, care_score, verification_status, rating, reviews_count
      ) VALUES (?, ?, '001099112233', ?, ?, ?, ?, ?, ?, 'approved', ?, ?)
      ON DUPLICATE KEY UPDATE
        title = VALUES(title),
        experience_years = VALUES(experience_years),
        hourly_rate = VALUES(hourly_rate),
        shift_rate = VALUES(shift_rate),
        district = VALUES(district),
        bio = VALUES(bio),
        care_score = VALUES(care_score),
        verification_status = 'approved',
        rating = VALUES(rating),
        reviews_count = VALUES(reviews_count)`,
      [cp.user_id, cp.title, cp.exp, cp.rate, cp.shift_rate, cp.district, cp.bio, cp.care_score, cp.rating, cp.reviews]
    );

    // Thêm tài khoản ngân hàng nhận lương cho từng caregiver
    await conn.execute(
      `INSERT INTO caregiver_bank_accounts (caregiver_user_id, bank_name, account_number, account_holder, branch, is_default)
       VALUES (?, 'Vietcombank', '1029384756', ?, 'Hà Nội', 1)`,
      [cp.user_id, users.find(u => u.id === cp.user_id).full_name.toUpperCase()]
    );
  }
  console.log('  ✓ Đã nạp 8 hồ sơ người chăm sóc khác biệt & tài khoản ngân hàng');

  // 5. TÀI CHÍNH & DOANH THU ĐỒNG BỘ: TỔNG DOANH THU = 2.150.000 đ
  // Yêu cầu:
  // - 1 người đăng ký VIP = 50.000 đ
  // - 5 ca chăm sóc = 400k + 500k + 450k + 400k + 350k = 2.100.000 đ
  // - Tổng cộng: 2.150.000 đ
  // - Tất cả phát sinh trong Tháng 9/2026. Tháng 5, 6, 7, 8 hoàn toàn TRỐNG (0 đ)!

  // 1 VIP Subscription = 50.000 đ
  await conn.execute(
    `INSERT INTO family_subscriptions (
      user_id, plan_name, price, billing_cycle, status, start_date, end_date, payment_method, transaction_code, priority_matching, priority_booking, priority_support, dedicated_support_247, notes, created_at
    ) VALUES (
      10, 'Gói Gia Đình VIP', 50000, 'monthly', 'active', '2026-09-01', '2026-10-01', 'Chuyển khoản QR', 'VIP-20260901-001', 1, 1, 1, 1, 'Đăng ký nâng cấp gói VIP gia đình', '2026-09-20 09:15:00'
    )`
  );
  console.log('  ✓ Đã nạp 1 gói VIP: 50.000 đ');

  // 5 ca chăm sóc: Tổng tiền ca = 2.100.000 đ
  // 3 ca đã hoàn tất & giải ngân (paid_out), 2 ca đang ký quỹ (in_escrow)
  const shiftsData = [
    {
      code: 'ESC-20260927-001',
      fam_id: 10,
      fam_name: 'Nguyễn Văn Hùng',
      cg_id: 21,
      cg_name: 'Trần Văn Tuấn',
      elderly_id: 1,
      patient_name: 'Nguyễn Đỗ Tiến Danh',
      shift_date: '2026-09-27',
      shift_time: '08:00 - 12:00',
      total_amount: 400000,
      platform_fee: 60000,      // 15%
      caregiver_earnings: 340000, // 85%
      escrow_status: 'paid_out',
      created_at: '2026-09-27 08:00:00'
    },
    {
      code: 'ESC-20260925-002',
      fam_id: 10,
      fam_name: 'Nguyễn Văn Hùng',
      cg_id: 22,
      cg_name: 'Lê Thị Hồng',
      elderly_id: 2,
      patient_name: 'Trần Thị Mai',
      shift_date: '2026-09-25',
      shift_time: '13:00 - 17:00',
      total_amount: 500000,
      platform_fee: 75000,
      caregiver_earnings: 425000,
      escrow_status: 'paid_out',
      created_at: '2026-09-25 13:00:00'
    },
    {
      code: 'ESC-20260924-003',
      fam_id: 11,
      fam_name: 'Trần Đình Trọng',
      cg_id: 20,
      cg_name: 'Nguyễn Phương Thảo',
      elderly_id: 3,
      patient_name: 'Trần Anh Tuấn',
      shift_date: '2026-09-24',
      shift_time: '08:00 - 12:00',
      total_amount: 450000,
      platform_fee: 67500,
      caregiver_earnings: 382500,
      escrow_status: 'paid_out',
      created_at: '2026-09-24 08:00:00'
    },
    {
      code: 'ESC-20260922-004',
      fam_id: 12,
      fam_name: 'Lê Hoàng Long',
      cg_id: 23,
      cg_name: 'Phạm Đức Huy',
      elderly_id: 5,
      patient_name: 'Lê Văn An',
      shift_date: '2026-09-22',
      shift_time: '14:00 - 18:00',
      total_amount: 400000,
      platform_fee: 60000,
      caregiver_earnings: 340000,
      escrow_status: 'in_escrow',
      created_at: '2026-09-22 14:00:00'
    },
    {
      code: 'ESC-20260919-005',
      fam_id: 13,
      fam_name: 'Đỗ Minh Quân',
      cg_id: 24,
      cg_name: 'Hoàng Thu Trang',
      elderly_id: 7,
      patient_name: 'Đỗ Thị Cúc',
      shift_date: '2026-09-19',
      shift_time: '08:00 - 12:00',
      total_amount: 350000,
      platform_fee: 52500,
      caregiver_earnings: 297500,
      escrow_status: 'in_escrow',
      created_at: '2026-09-19 08:00:00'
    }
  ];

  for (let i = 0; i < shiftsData.length; i++) {
    const s = shiftsData[i];

    // Thêm vào bảng schedules
    const [schedRes] = await conn.execute(
      `INSERT INTO schedules (
        family_user_id, caregiver_user_id, elderly_profile_id, elderly_name, caregiver_name, schedule_date, time_slot, title, tasks, status, price, is_rated, rating, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Đo sinh hiệu, hỗ trợ vận động, nhắc thuốc đúng giờ', ?, ?, ?, ?, ?)`,
      [
        s.fam_id,
        s.cg_id,
        s.elderly_id,
        s.patient_name,
        s.cg_name,
        `Ngày ${s.shift_date}`,
        s.shift_time,
        `Ca chăm sóc cho ${s.patient_name}`,
        s.escrow_status === 'paid_out' ? 'completed' : 'confirmed',
        s.total_amount,
        s.escrow_status === 'paid_out' ? 1 : 0,
        s.escrow_status === 'paid_out' ? 5 : null,
        s.created_at
      ]
    );
    const scheduleId = schedRes.insertId;

    // Thêm vào booking_escrow_payments
    await conn.execute(
      `INSERT INTO booking_escrow_payments (
        transaction_code, schedule_id, family_user_id, caregiver_user_id, patient_name, shift_date, shift_time, total_amount, platform_fee, caregiver_earnings, escrow_status, payment_method, family_paid_at, released_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Chuyển khoản QR', ?, ?, ?)`,
      [
        s.code,
        scheduleId,
        s.fam_id,
        s.cg_id,
        s.patient_name,
        s.shift_date,
        s.shift_time,
        s.total_amount,
        s.platform_fee,
        s.caregiver_earnings,
        s.escrow_status,
        s.created_at,
        s.escrow_status === 'paid_out' ? s.created_at : null,
        s.created_at
      ]
    );

    // Thêm vào transactions (đồng bộ doanh thu)
    await conn.execute(
      `INSERT INTO transactions (
        transaction_code, schedule_id, family_user_id, caregiver_user_id, service_name, total_amount, platform_fee, payout_amount, family_payment_status, caregiver_payout_status, payment_method, created_at, paid_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'paid', ?, 'Chuyển khoản QR', ?, ?)`,
      [
        s.code,
        scheduleId,
        s.fam_id,
        s.cg_id,
        `Ca chăm sóc cho ${s.patient_name}`,
        s.total_amount,
        s.platform_fee,
        s.caregiver_earnings,
        s.escrow_status === 'paid_out' ? 'paid' : 'pending',
        s.created_at,
        s.created_at
      ]
    );
  }
  console.log('  ✓ Đã nạp 5 ca chăm sóc: 2.100.000 đ (Tổng GMV = 2.150.000 đ)');

  // 6. NẠP HỒ SƠ THEO DÕI SỨC KHỎE SAU CA (patient_care_logs)
  // Quy chuẩn sinh hiệu:
  // - Huyết áp, Nhịp tim, Thân nhiệt: BẮT BUỘC
  // - SpO2, Đường huyết: TÙY CHỌN (một số ca có ghi, một số ca NULL)
  const careLogs = [
    {
      fam_id: 10,
      cg_id: 21,
      elderly_id: 1,
      elderly_name: 'Nguyễn Đỗ Tiến Danh',
      family_name: 'Gia đình Nguyễn Văn Hùng',
      cg_name: 'Trần Văn Tuấn',
      log_date: '2026-09-27',
      time_slot: 'Ca sáng (08:00 - 12:00)',
      sys: 122,
      dia: 80,
      hr: 74,
      temp: 36.6,
      spo2: 98,        // Có đo
      sugar: 5.6,      // Có đo
      weight: 64.5,
      cond: 'good',
      notes: 'Bệnh nhân hồi phục cử động tay phải rất khả quan. Ăn hết khẩu phần cháo hạt sen, tinh thần vui vẻ.'
    },
    {
      fam_id: 10,
      cg_id: 22,
      elderly_id: 2,
      elderly_name: 'Trần Thị Mai',
      family_name: 'Gia đình Nguyễn Văn Hùng',
      cg_name: 'Lê Thị Hồng',
      log_date: '2026-09-25',
      time_slot: 'Ca chiều (13:00 - 17:00)',
      sys: 120,
      dia: 78,
      hr: 76,
      temp: 36.8,
      spo2: null,      // Tùy chọn: Không đo oxy trong ca này
      sugar: null,     // Tùy chọn: Không đo đường huyết trong ca này
      weight: 56.0,
      cond: 'good',
      notes: 'Huyết áp ổn định, đã nhắc uống thuốc hạ áp sau bữa ăn nhẹ lúc 14:00. Uống đủ 1 lít nước ấm.'
    },
    {
      fam_id: 11,
      cg_id: 20,
      elderly_id: 3,
      elderly_name: 'Trần Anh Tuấn',
      family_name: 'Gia đình Trần Đình Trọng',
      cg_name: 'Nguyễn Phương Thảo',
      log_date: '2026-09-24',
      time_slot: 'Ca sáng (08:00 - 12:00)',
      sys: 135,
      dia: 85,
      hr: 82,
      temp: 37.1,
      spo2: 97,        // Có đo
      sugar: null,     // Không đo
      weight: 68.0,
      cond: 'attention',
      notes: 'Huyết áp hơi cao nhẹ do đêm trước ngủ muộn. Đã xoa bóp vùng thái dương và nghỉ ngơi 30 phút, chỉ số giảm về 125/82.'
    },
    {
      fam_id: 11,
      cg_id: 23,
      elderly_id: 4,
      elderly_name: 'Phạm Hoàng Nam',
      family_name: 'Gia đình Trần Đình Trọng',
      cg_name: 'Phạm Đức Huy',
      log_date: '2026-09-23',
      time_slot: 'Ca sáng (08:00 - 12:00)',
      sys: 118,
      dia: 76,
      hr: 72,
      temp: 36.5,
      spo2: null,      // Không đo
      sugar: null,     // Không đo
      weight: 62.0,
      cond: 'good',
      notes: 'Tập bài tập co duỗi khớp gối 20 phút. Bệnh nhân đi lại vững vàng hơn trong phòng khách.'
    },
    {
      fam_id: 12,
      cg_id: 23,
      elderly_id: 5,
      elderly_name: 'Lê Văn An',
      family_name: 'Gia đình Lê Hoàng Long',
      cg_name: 'Phạm Đức Huy',
      log_date: '2026-09-22',
      time_slot: 'Ca chiều (14:00 - 18:00)',
      sys: 126,
      dia: 82,
      hr: 75,
      temp: 36.7,
      spo2: 99,        // Có đo
      sugar: 5.4,      // Có đo
      weight: 59.5,
      cond: 'good',
      notes: 'Thân nhiệt và huyết áp hoàn toàn bình thường. Đã hỗ trợ vệ sinh cá nhân và cắt móng tay chân.'
    },
    {
      fam_id: 12,
      cg_id: 25,
      elderly_id: 6,
      elderly_name: 'Vũ Minh Đức',
      family_name: 'Gia đình Lê Hoàng Long',
      cg_name: 'Vũ Quốc Bảo',
      log_date: '2026-09-21',
      time_slot: 'Ca sáng (08:00 - 12:00)',
      sys: 124,
      dia: 80,
      hr: 78,
      temp: 36.8,
      spo2: null,      // Không đo
      sugar: null,     // Không đo
      weight: 65.0,
      cond: 'good',
      notes: 'Tâm trạng thoải mái, tinh thần lạc quan. Đã cùng trò chuyện đọc báo sáng và đi dạo trong vườn.'
    },
    {
      fam_id: 13,
      cg_id: 24,
      elderly_id: 7,
      elderly_name: 'Đỗ Thị Cúc',
      family_name: 'Gia đình Đỗ Minh Quân',
      cg_name: 'Hoàng Thu Trang',
      log_date: '2026-09-19',
      time_slot: 'Ca sáng (08:00 - 12:00)',
      sys: 128,
      dia: 82,
      hr: 76,
      temp: 36.7,
      spo2: 98,        // Có đo
      sugar: 6.1,      // Có đo đường huyết
      weight: 54.5,
      cond: 'good',
      notes: 'Đường huyết sau ăn 2 tiếng đạt 6.1 mmol/L trong ngưỡng kiểm soát an toàn. Đã hướng dẫn gia đình chế độ ăn buổi tối.'
    },
    {
      fam_id: 13,
      cg_id: 27,
      elderly_id: 8,
      elderly_name: 'Đặng Kim Ngân',
      family_name: 'Gia đình Đỗ Minh Quân',
      cg_name: 'Bùi Minh Trí',
      log_date: '2026-09-18',
      time_slot: 'Ca chiều (13:00 - 17:00)',
      sys: 119,
      dia: 77,
      hr: 70,
      temp: 36.5,
      spo2: null,      // Không đo
      sugar: null,     // Không đo
      weight: 58.0,
      cond: 'good',
      notes: 'Sinh hiệu tốt, không có dấu hiệu mệt mỏi. Uống sữa bổ sung canxi và tập hít thở dưỡng sinh.'
    }
  ];

  for (const cl of careLogs) {
    const tasks = JSON.stringify([
      'Đo sinh hiệu (Huyết áp, Nhịp tim, Thân nhiệt)',
      'Hỗ trợ vệ sinh cá nhân & vận động',
      'Nhắc uống thuốc theo đơn đúng giờ'
    ]);

    await conn.execute(
      `INSERT INTO patient_care_logs (
        family_user_id, caregiver_user_id, elderly_profile_id, elderly_name, family_name, caregiver_name, log_date, time_slot,
        blood_pressure_systolic, blood_pressure_diastolic, heart_rate, blood_sugar, temperature, spo2, weight,
        meal_status, medication_status, sleep_mood, mobility_exercise, tasks_completed, overall_condition, caregiver_notes,
        family_acknowledged, family_note
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Ăn uống ngon miệng, đúng khẩu phần dinh dưỡng', 'Đã uống thuốc theo đơn sau bữa ăn', 'Tinh thần tỉnh táo, ngủ sâu giấc', 'Vận động nhẹ nhàng 20 phút', ?, ?, ?, 1, 'Gia đình đã xem và rất yên tâm!')`,
      [
        cl.fam_id,
        cl.cg_id,
        cl.elderly_id,
        cl.elderly_name,
        cl.family_name,
        cl.cg_name,
        cl.log_date,
        cl.time_slot,
        cl.sys,
        cl.dia,
        cl.hr,
        cl.sugar,
        cl.temp,
        cl.spo2,
        cl.weight,
        tasks,
        cl.cond,
        cl.notes
      ]
    );
  }
  console.log('  ✓ Đã nạp 8 sổ theo dõi y tế cho 8 bệnh nhân (Có ca đo SpO2/Đường huyết, có ca để trống)');

  // Bật lại kiểm tra foreign key
  await conn.execute('SET FOREIGN_KEY_CHECKS = 1');
  console.log('🎉 ĐÃ HOÀN TẤT NẠP TOÀN BỘ CƠ SỞ DỮ LIỆU ĐỒNG BỘ 100%!');
  await conn.end();
}

reseed().catch(err => {
  console.error('❌ Lỗi khi reseed:', err);
  process.exit(1);
});
