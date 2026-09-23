-- =========================================================
-- DỮ LIỆU KHỞI TẠO MẪU (SEED DATA) CHO CARE-MATCH
-- =========================================================

USE care_match_db;

-- Xóa dữ liệu cũ nếu muốn reset (theo thứ tự khóa ngoại)
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE messages;
TRUNCATE TABLE schedules;
TRUNCATE TABLE caregiver_documents;
TRUNCATE TABLE caregiver_profiles;
TRUNCATE TABLE elderly_profiles;
TRUNCATE TABLE users;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. CHÈN TÀI KHOẢN NGƯỜI DÙNG (ADMIN MẬT KHẨU: 123456)
INSERT INTO users (id, username, email, password_hash, role, full_name, phone, avatar_initials) VALUES
(1, 'admin', 'admin@carematch.vn', '123456', 'admin', 'Admin', '0988 000 999', 'AD'),
(2, 'lananh', 'lananh.care@example.com', '123456', 'caregiver', 'Nguyễn Lan Anh', '0912 345 678', 'LA'),
(3, 'thuha', 'thuha.care@example.com', '123456', 'caregiver', 'Trần Thu Hà', '0988 765 432', 'TH'),
(4, 'maichi', 'maichi.care@example.com', '123456', 'caregiver', 'Lê Mai Chi', '0903 112 233', 'MC'),
(5, 'mai', 'mai.nguyen@example.com', '123456', 'family', 'Nguyễn Minh Mai', '0934 567 890', 'ML');

-- 2. CHÈN HỒ SƠ NGƯỜI CAO TUỔI (MẸ LAN CỦA GIA ĐÌNH CHỊ MAI)
INSERT INTO elderly_profiles (id, family_user_id, full_name, birth_year, gender, address, district, city, adl_score, health_conditions, care_notes, emergency_contact_name, emergency_contact_phone) VALUES
(1, 5, 'Nguyễn Thị Lan', 1946, 'female', 'Số 24 Phố Huế, P. Hàng Bài', 'Hai Bà Trưng', 'Hà Nội', 92, 
 'Tăng huyết áp vô căn, thoái hóa khớp gối nhẹ, giảm thính lực nhẹ tai phải', 
 'Mẹ thích nghe nhạc cổ điển và cải lương lúc 15h. Cần ăn nhạt ít muối, thức ăn mềm dễ nhai nuốt. Uống thuốc huyết áp đều đặn lúc 8h sáng.', 
 'Nguyễn Minh Mai', '0934 567 890');

-- 3. CHÈN HỒ SƠ NGƯỜI CHĂM SÓC
INSERT INTO caregiver_profiles (id, user_id, title, experience_years, hourly_rate, district, bio, skills, care_score, verification_status, approved_by_admin_id, approved_at, rating, reviews_count) VALUES
(1, 2, 'Chuyên viên chăm sóc người cao tuổi & Điều dưỡng sơ cấp', 8, 100000, 'Quận Hai Bà Trưng, Cầu Giấy, Hà Nội',
 'Tôi có 8 năm kinh nghiệm chăm sóc người cao tuổi, có chứng chỉ điều dưỡng sơ cấp và kỹ năng lắng nghe, thấu cảm tâm lý người già.',
 '["Theo dõi huyết áp", "Nấu ăn mềm cho người già", "Hỗ trợ phục hồi vận động", "Xoa bóp cổ vai gáy", "Chăm sóc sau tai biến"]',
 96, 'approved', 1, NOW(), 4.9, 38),

(2, 3, 'Cử nhân Điều dưỡng phục hồi chức năng', 6, 110000, 'Quận Đống Đa, Ba Đình, Hà Nội',
 'Tốt nghiệp Cao đẳng Y tế, 6 năm phụ trách phục hồi chức năng vận động và chăm sóc người lớn tuổi sau phẫu thuật.',
 '["Vật lý trị liệu", "Đo sinh hiệu huyết áp", "Thay băng rửa vết thương", "Tập vận động khớp"]',
 91, 'approved', 1, NOW(), 4.8, 24),

(3, 4, 'Bạn đồng hành & Chăm sóc người cao tuổi tận tâm', 5, 85000, 'Quận Ba Đình, Hoàn Kiếm, Hà Nội',
 'Tính tình hòa nhã, cẩn thận, yêu quý người già. Thế mạnh trò chuyện, đi dạo, hỗ trợ sinh hoạt hàng ngày.',
 '["Trò chuyện tâm lý", "Hỗ trợ vệ sinh cá nhân", "Đưa đi khám bệnh", "Chuẩn bị bữa ăn"]',
 87, 'pending', NULL, NULL, 4.7, 19);

-- 4. CHÈN TÀI LIỆU MINH CHỨNG eKYC CỦA CHỊ LAN ANH
INSERT INTO caregiver_documents (caregiver_id, document_type, document_name, file_url, status) VALUES
(1, 'cccd', 'Căn cước công dân gắn chip 001198002345 (2 mặt)', '/uploads/cccd_lananh.pdf', 'verified'),
(1, 'police_check', 'Phiếu lý lịch tư pháp số 2 (Số 1824/LLTP-HN)', '/uploads/lltp2_lananh.pdf', 'verified'),
(1, 'medical_certificate', 'Chứng chỉ Điều dưỡng Sơ cấp - CĐ Y Tế Hà Nội', '/uploads/bang_dieuduong.pdf', 'verified'),
(1, 'health_check', 'Giấy khám sức khỏe định kỳ BV Bạch Mai', '/uploads/kham_sk.pdf', 'verified');

-- 5. CHÈN LỊCH CA CHĂM SÓC
INSERT INTO schedules (family_user_id, caregiver_user_id, elderly_id, schedule_date, start_time, end_time, title, tasks, status, price) VALUES
(5, 2, 1, CURDATE(), '08:30:00', '12:30:00', 'Ca sáng: Đo huyết áp & Hỗ trợ vận động Mẹ Lan', 'Đo huyết áp, nhắc uống thuốc buổi sáng, xoa bóp cổ vai gáy và hỗ trợ đi bộ nhẹ quanh sân.', 'confirmed', 400000),
(5, 2, 1, DATE_ADD(CURDATE(), INTERVAL 2 DAY), '14:00:00', '18:00:00', 'Ca chiều: Hỗ trợ tập phục hồi & Nấu bữa tối', 'Hướng dẫn tập giãn cơ khớp gối, nấu cháo yến mạch và trò chuyện cùng mẹ.', 'pending', 400000);

-- 6. CHÈN TIN NHẮN MẪU GIỮA GIA ĐÌNH, NGƯỜI CHĂM SÓC VÀ ADMIN
INSERT INTO messages (conversation_id, sender_user_id, sender_name, sender_role, recipient_user_id, recipient_name, content, is_read) VALUES
('conv_family_caregiver', 5, 'Chị Mai', 'family', 2, 'Nguyễn Lan Anh', 'Chào chị Lan Anh, ngày mai chị đến lúc 8h30 như đã hẹn nhé ạ.', TRUE),
('conv_family_caregiver', 2, 'Nguyễn Lan Anh', 'caregiver', 5, 'Chị Mai', 'Dạ vâng chị Mai, 8h30 sáng mai em có mặt đúng giờ để đo huyết áp cho mẹ ạ!', TRUE),
('conv_family_admin', 5, 'Chị Mai', 'family', 1, 'Admin', 'Chào Admin, gia đình tôi muốn hỏi về thủ tục đổi ca trong gói tháng.', TRUE),
('conv_family_admin', 1, 'Admin', 'admin', 5, 'Chị Mai', 'Chào chị Mai! Với gói tháng, chị được đổi ca miễn phí chỉ cần báo trước 24 giờ trên hệ thống ạ.', TRUE);
