-- =========================================================
-- CARE-MATCH DATABASE - POSTGRESQL / SUPABASE SCHEMA
-- Toàn bộ 18 bảng chuẩn PostgreSQL tương thích Supabase
-- =========================================================

-- Trigger tự động cập nhật cột updated_at khi UPDATE (thay thế ON UPDATE CURRENT_TIMESTAMP của MySQL)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. Bảng người dùng (users)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(64) NOT NULL UNIQUE,
  email VARCHAR(128) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'family' CHECK (role IN ('family', 'caregiver', 'admin')),
  full_name VARCHAR(128) NOT NULL,
  phone VARCHAR(20) DEFAULT NULL,
  avatar_initials VARCHAR(8) DEFAULT 'CM',
  token_version INTEGER NOT NULL DEFAULT 1,
  failed_login_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMP DEFAULT NULL,
  must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
  mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Bảng khôi phục mật khẩu OTP (password_resets)
CREATE TABLE IF NOT EXISTS password_resets (
  id SERIAL PRIMARY KEY,
  email VARCHAR(128) NOT NULL,
  otp VARCHAR(16) NOT NULL,
  expires_at BIGINT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  full_name VARCHAR(128) DEFAULT NULL,
  user_id INTEGER DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_password_resets_email ON password_resets (LOWER(email));

-- 3. Bảng hồ sơ người cao tuổi (elderly_profiles)
CREATE TABLE IF NOT EXISTS elderly_profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  full_name VARCHAR(128) NOT NULL,
  date_of_birth DATE DEFAULT NULL,
  gender VARCHAR(10) DEFAULT 'Nữ',
  address VARCHAR(255) DEFAULT NULL,
  district VARCHAR(64) DEFAULT NULL,
  contact_name VARCHAR(128) DEFAULT NULL,
  contact_phone VARCHAR(20) DEFAULT NULL,
  care_needs TEXT DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified')),
  adl_score INTEGER DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_elderly_profiles_user_id ON elderly_profiles (user_id);

-- 4. Bảng hồ sơ gia đình (family_profiles)
CREATE TABLE IF NOT EXISTS family_profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  representative_name VARCHAR(128) NOT NULL,
  phone VARCHAR(20) DEFAULT NULL,
  email VARCHAR(128) DEFAULT NULL,
  id_number VARCHAR(255) DEFAULT NULL,
  address VARCHAR(255) DEFAULT NULL,
  district VARCHAR(128) DEFAULT NULL,
  id_card_front TEXT DEFAULT NULL,
  id_card_back TEXT DEFAULT NULL,
  verification_status VARCHAR(20) DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'pending', 'approved', 'rejected')),
  rejection_reason TEXT DEFAULT NULL,
  verified_at TIMESTAMP NULL DEFAULT NULL,
  is_premium BOOLEAN DEFAULT FALSE,
  premium_until TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. Bảng gói VIP Gia Đình (family_subscriptions)
CREATE TABLE IF NOT EXISTS family_subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_name VARCHAR(64) DEFAULT 'Gói Gia Đình Premium',
  price INTEGER DEFAULT 300000,
  billing_cycle VARCHAR(32) DEFAULT 'monthly',
  status VARCHAR(32) DEFAULT 'active',
  start_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  end_date TIMESTAMP NULL DEFAULT NULL,
  payment_method VARCHAR(64) DEFAULT 'Chuyển khoản QR (VietQR)',
  transaction_code VARCHAR(64) DEFAULT NULL,
  priority_matching BOOLEAN DEFAULT TRUE,
  priority_booking BOOLEAN DEFAULT TRUE,
  priority_support BOOLEAN DEFAULT TRUE,
  dedicated_support_247 BOOLEAN DEFAULT TRUE,
  notes TEXT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_family_subscriptions_user_id ON family_subscriptions (user_id);

-- 6. Bảng hồ sơ người chăm sóc (caregiver_profiles)
CREATE TABLE IF NOT EXISTS caregiver_profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(128) DEFAULT 'Chuyên viên chăm sóc',
  id_number VARCHAR(255) DEFAULT NULL,
  experience_years INTEGER DEFAULT 0,
  hourly_rate INTEGER DEFAULT 100000,
  shift_rate INTEGER DEFAULT 400000,
  night_shift_rate INTEGER DEFAULT 600000,
  district VARCHAR(128) DEFAULT '',
  contact_address VARCHAR(255) DEFAULT '',
  bio TEXT DEFAULT NULL,
  skills TEXT DEFAULT NULL,
  documents TEXT DEFAULT NULL,
  work_history TEXT DEFAULT NULL,
  care_score INTEGER DEFAULT 0,
  verification_status VARCHAR(32) DEFAULT 'not_submitted' CHECK (verification_status IN ('not_submitted', 'pending', 'approved', 'rejected', 'more_info_needed')),
  approved_by_admin_id INTEGER DEFAULT NULL,
  approved_at TIMESTAMP NULL DEFAULT NULL,
  rating NUMERIC(3,1) DEFAULT 4.9,
  reviews_count INTEGER DEFAULT 38,
  interview_status VARCHAR(32) DEFAULT 'not_scheduled',
  interview_date VARCHAR(64) DEFAULT NULL,
  interview_time VARCHAR(64) DEFAULT NULL,
  interview_meeting_link VARCHAR(255) DEFAULT NULL,
  interview_notes TEXT DEFAULT NULL,
  interview_scheduled_at TIMESTAMP NULL DEFAULT NULL,
  interview_passed_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 7. Bảng tài liệu xác thực eKYC của điều dưỡng (caregiver_documents)
CREATE TABLE IF NOT EXISTS caregiver_documents (
  id SERIAL PRIMARY KEY,
  caregiver_id INTEGER NOT NULL REFERENCES caregiver_profiles(id) ON DELETE CASCADE,
  document_type VARCHAR(64) NOT NULL,
  document_name VARCHAR(255) NOT NULL,
  file_url TEXT DEFAULT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_caregiver_documents_caregiver_id ON caregiver_documents (caregiver_id);

-- 8. Bảng tài khoản ngân hàng của người chăm sóc (caregiver_bank_accounts)
CREATE TABLE IF NOT EXISTS caregiver_bank_accounts (
  id SERIAL PRIMARY KEY,
  caregiver_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bank_name VARCHAR(100) NOT NULL,
  account_number VARCHAR(64) NOT NULL,
  account_holder VARCHAR(128) NOT NULL,
  branch VARCHAR(128) DEFAULT '',
  is_default BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_caregiver_bank_accounts_user_id ON caregiver_bank_accounts (caregiver_user_id);

-- 9. Bảng lịch trình & ca chăm sóc (schedules)
CREATE TABLE IF NOT EXISTS schedules (
  id SERIAL PRIMARY KEY,
  family_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  caregiver_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  elderly_profile_id INTEGER DEFAULT NULL,
  elderly_name VARCHAR(128) DEFAULT NULL,
  caregiver_name VARCHAR(128) DEFAULT NULL,
  schedule_date VARCHAR(64) NOT NULL,
  time_slot VARCHAR(64) NOT NULL,
  title VARCHAR(255) NOT NULL,
  tasks TEXT DEFAULT NULL,
  status VARCHAR(32) DEFAULT 'pending',
  price INTEGER DEFAULT 400000,
  caregiver_confirmed_completed BOOLEAN DEFAULT FALSE,
  family_confirmed_completed BOOLEAN DEFAULT FALSE,
  caregiver_completed_at TIMESTAMP NULL DEFAULT NULL,
  family_completed_at TIMESTAMP NULL DEFAULT NULL,
  voucher_code VARCHAR(64) DEFAULT NULL,
  voucher_discount INTEGER DEFAULT 0,
  original_price INTEGER DEFAULT NULL,
  is_rated BOOLEAN DEFAULT FALSE,
  rating INTEGER DEFAULT NULL,
  review_id INTEGER DEFAULT NULL,
  review_text TEXT DEFAULT NULL,
  care_log_id INTEGER DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_schedules_family ON schedules (family_user_id);
CREATE INDEX IF NOT EXISTS idx_schedules_caregiver ON schedules (caregiver_user_id);

-- 10. Bảng thanh toán ký quỹ ca làm (booking_escrow_payments)
CREATE TABLE IF NOT EXISTS booking_escrow_payments (
  id SERIAL PRIMARY KEY,
  transaction_code VARCHAR(64) NOT NULL UNIQUE,
  schedule_id INTEGER DEFAULT NULL,
  family_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  caregiver_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  patient_name VARCHAR(128) NOT NULL,
  shift_date VARCHAR(64) NOT NULL,
  shift_time VARCHAR(64) NOT NULL,
  total_amount INTEGER NOT NULL,
  platform_fee INTEGER NOT NULL,
  caregiver_earnings INTEGER NOT NULL,
  escrow_status VARCHAR(32) DEFAULT 'pending_payment' CHECK (escrow_status IN ('pending_payment', 'in_escrow', 'paid_out', 'refunded')),
  payment_method VARCHAR(64) DEFAULT 'VietQR Napas 247',
  family_paid_at TIMESTAMP NULL DEFAULT NULL,
  released_at TIMESTAMP NULL DEFAULT NULL,
  bank_reference VARCHAR(128) DEFAULT NULL,
  caregiver_bank_name VARCHAR(100) DEFAULT NULL,
  caregiver_account_number VARCHAR(64) DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  voucher_code VARCHAR(64) DEFAULT NULL,
  voucher_discount INTEGER DEFAULT 0,
  original_amount INTEGER DEFAULT NULL,
  system_subsidy INTEGER DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_escrow_family ON booking_escrow_payments (family_user_id);
CREATE INDEX IF NOT EXISTS idx_escrow_caregiver ON booking_escrow_payments (caregiver_user_id);

-- 11. Bảng giao dịch tổng hợp (transactions)
CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  transaction_code VARCHAR(64) NOT NULL UNIQUE,
  schedule_id INTEGER DEFAULT NULL,
  family_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  caregiver_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service_name VARCHAR(255) NOT NULL,
  total_amount INTEGER NOT NULL,
  platform_fee INTEGER DEFAULT 0,
  payout_amount INTEGER NOT NULL,
  family_payment_status VARCHAR(20) DEFAULT 'paid' CHECK (family_payment_status IN ('paid', 'pending', 'cancelled')),
  caregiver_payout_status VARCHAR(20) DEFAULT 'paid' CHECK (caregiver_payout_status IN ('paid', 'pending', 'processing')),
  payment_method VARCHAR(64) DEFAULT 'Chuyển khoản QR',
  notes TEXT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  paid_at TIMESTAMP NULL DEFAULT NULL
);
CREATE INDEX IF NOT EXISTS idx_transactions_family ON transactions (family_user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_caregiver ON transactions (caregiver_user_id);

-- 12. Bảng mã giảm giá / ưu đãi (vouchers)
CREATE TABLE IF NOT EXISTS vouchers (
  id SERIAL PRIMARY KEY,
  code VARCHAR(64) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  description TEXT DEFAULT NULL,
  discount_type VARCHAR(20) DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value INTEGER NOT NULL DEFAULT 50,
  max_discount_amount INTEGER DEFAULT 500000,
  min_order_amount INTEGER DEFAULT 0,
  start_date DATE DEFAULT NULL,
  end_date DATE DEFAULT NULL,
  usage_limit INTEGER DEFAULT 1000,
  used_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 13. Bảng cấu hình hệ thống (system_settings)
CREATE TABLE IF NOT EXISTS system_settings (
  setting_key VARCHAR(64) PRIMARY KEY,
  setting_value TEXT NOT NULL,
  setting_type VARCHAR(32) DEFAULT 'string',
  setting_group VARCHAR(64) DEFAULT 'general',
  description VARCHAR(255) DEFAULT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 14. Bảng tin nhắn (messages)
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  conversation_id VARCHAR(64) NOT NULL,
  sender_user_id INTEGER NOT NULL,
  sender_name VARCHAR(128) NOT NULL,
  sender_role VARCHAR(20) NOT NULL CHECK (sender_role IN ('family', 'caregiver', 'admin')),
  recipient_user_id INTEGER NOT NULL,
  recipient_name VARCHAR(128) NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages (conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages (sender_user_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages (recipient_user_id);

-- 15. Bảng thông báo (notifications)
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(32) NOT NULL DEFAULT 'system',
  title VARCHAR(255) NOT NULL,
  body TEXT DEFAULT NULL,
  link VARCHAR(255) DEFAULT '/',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications (user_id, is_read);

-- 16. Bảng cộng đồng người cao tuổi (communities)
CREATE TABLE IF NOT EXISTS communities (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) DEFAULT 'Sức khỏe & Vận động',
  description TEXT DEFAULT NULL,
  meeting_schedule VARCHAR(255) DEFAULT '05:30 - 06:45 Hàng ngày',
  location VARCHAR(255) DEFAULT 'Công viên Cầu Giấy, Hà Nội',
  member_count INTEGER DEFAULT 120,
  zalo_link VARCHAR(255) DEFAULT 'https://zalo.me/g/carematch_community',
  qr_code_url TEXT DEFAULT NULL,
  tags TEXT DEFAULT NULL,
  leader_name VARCHAR(128) DEFAULT 'Chị Thu Hà (NV CTXH)',
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 17. Bảng đánh giá sao người chăm sóc (caregiver_reviews)
CREATE TABLE IF NOT EXISTS caregiver_reviews (
  id SERIAL PRIMARY KEY,
  schedule_id INTEGER DEFAULT NULL,
  caregiver_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  family_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  family_name VARCHAR(128) DEFAULT 'Gia đình',
  patient_name VARCHAR(128) DEFAULT 'Người thân',
  service_title VARCHAR(255) DEFAULT 'Ca chăm sóc',
  rating INTEGER NOT NULL DEFAULT 5,
  tags TEXT DEFAULT NULL,
  review_text TEXT DEFAULT NULL,
  status VARCHAR(20) DEFAULT 'approved' CHECK (status IN ('approved', 'pending', 'hidden')),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_caregiver_reviews_cg ON caregiver_reviews (caregiver_user_id);
CREATE INDEX IF NOT EXISTS idx_caregiver_reviews_fam ON caregiver_reviews (family_user_id);

-- 18. Bảng nhật ký chăm sóc & sinh hiệu (patient_care_logs)
CREATE TABLE IF NOT EXISTS patient_care_logs (
  id SERIAL PRIMARY KEY,
  schedule_id INTEGER DEFAULT NULL,
  family_user_id INTEGER NOT NULL,
  caregiver_user_id INTEGER NOT NULL,
  elderly_profile_id INTEGER DEFAULT NULL,
  elderly_name VARCHAR(128) NOT NULL,
  family_name VARCHAR(128) DEFAULT 'Gia đình',
  caregiver_name VARCHAR(128) NOT NULL,
  log_date DATE NOT NULL,
  time_slot VARCHAR(128) DEFAULT 'Ca ngày (08:00 - 12:00)',
  blood_pressure_systolic INTEGER DEFAULT NULL,
  blood_pressure_diastolic INTEGER DEFAULT NULL,
  heart_rate INTEGER DEFAULT NULL,
  blood_sugar NUMERIC(5,2) DEFAULT NULL,
  temperature NUMERIC(4,1) DEFAULT NULL,
  spo2 INTEGER DEFAULT NULL,
  weight NUMERIC(5,1) DEFAULT NULL,
  meal_status VARCHAR(255) DEFAULT 'Ăn hết khẩu phần cháo dinh dưỡng',
  medication_status VARCHAR(255) DEFAULT 'Đã uống đủ thuốc huyết áp sau ăn',
  sleep_mood VARCHAR(255) DEFAULT 'Tâm trạng vui vẻ, tỉnh táo',
  mobility_exercise VARCHAR(255) DEFAULT 'Đi bộ nhẹ nhàng 20 phút quanh vườn',
  tasks_completed TEXT DEFAULT NULL,
  overall_condition VARCHAR(20) DEFAULT 'good' CHECK (overall_condition IN ('good', 'normal', 'attention', 'warning')),
  caregiver_notes TEXT DEFAULT NULL,
  family_acknowledged BOOLEAN DEFAULT FALSE,
  family_note TEXT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_care_logs_family ON patient_care_logs (family_user_id);
CREATE INDEX IF NOT EXISTS idx_care_logs_caregiver ON patient_care_logs (caregiver_user_id);
CREATE INDEX IF NOT EXISTS idx_care_logs_elderly ON patient_care_logs (elderly_name);
CREATE INDEX IF NOT EXISTS idx_care_logs_date ON patient_care_logs (log_date);

-- 19. Bảng lưu dữ liệu AI phục vụ Fine-tune Vertex AI (ai_training_logs)
CREATE TABLE IF NOT EXISTS ai_training_logs (
  id SERIAL PRIMARY KEY,
  task_type VARCHAR(64) NOT NULL,
  system_instruction TEXT NOT NULL,
  user_input TEXT NOT NULL,
  model_output TEXT NOT NULL,
  edited_output TEXT DEFAULT NULL,
  rating INTEGER DEFAULT NULL,
  is_approved BOOLEAN DEFAULT FALSE,
  model_used VARCHAR(128) DEFAULT 'gemini-3.1-flash-lite',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_ai_training_task ON ai_training_logs (task_type);

-- 20. Vector Store (pgvector) cho Hybrid Semantic RAG (ai_knowledge_chunks)
CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE IF NOT EXISTS ai_knowledge_chunks (
  id SERIAL PRIMARY KEY,
  source_type VARCHAR(40) NOT NULL,
  source_id VARCHAR(80) NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  embedding vector(768),
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (source_type, source_id)
);
CREATE INDEX IF NOT EXISTS idx_ai_knowledge_source ON ai_knowledge_chunks (source_type);
CREATE INDEX IF NOT EXISTS idx_ai_knowledge_embedding ON ai_knowledge_chunks USING hnsw (embedding vector_cosine_ops);

-- 21. Bảng AI Observability & Guardrail Metrics (ai_metrics_logs)
CREATE TABLE IF NOT EXISTS ai_metrics_logs (
  id SERIAL PRIMARY KEY,
  endpoint VARCHAR(80) NOT NULL,
  model_used VARCHAR(128) DEFAULT NULL,
  prompt_tokens INTEGER DEFAULT 0,
  candidates_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  estimated_cost_usd DOUBLE PRECISION DEFAULT 0,
  latency_ms INTEGER DEFAULT 0,
  tools_used TEXT DEFAULT NULL,
  cache_hit BOOLEAN DEFAULT FALSE,
  guardrail_triggered VARCHAR(64) DEFAULT NULL,
  status VARCHAR(24) DEFAULT 'ok',
  error_message TEXT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_ai_metrics_created ON ai_metrics_logs (created_at);
CREATE INDEX IF NOT EXISTS idx_ai_metrics_endpoint ON ai_metrics_logs (endpoint);

-- 22. Bảng quản lý phiên Refresh Token & Revocation (auth_sessions)
CREATE TABLE IF NOT EXISTS auth_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token_hash VARCHAR(128) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  revoked_at TIMESTAMP DEFAULT NULL,
  ip_address VARCHAR(64) DEFAULT NULL,
  user_agent TEXT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_user ON auth_sessions (user_id);

-- 23. Bảng Audit Log an ninh & truy cập hồ sơ y tế (audit_logs)
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  actor_user_id INTEGER DEFAULT NULL,
  actor_role VARCHAR(24) DEFAULT 'guest',
  action VARCHAR(80) NOT NULL,
  resource_type VARCHAR(64) DEFAULT NULL,
  resource_id VARCHAR(64) DEFAULT NULL,
  ip_address VARCHAR(64) DEFAULT NULL,
  user_agent TEXT DEFAULT NULL,
  status VARCHAR(24) DEFAULT 'ok',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs (created_at);

-- Triggers tự động cập nhật updated_at
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users', 'elderly_profiles', 'family_profiles', 'family_subscriptions',
    'caregiver_bank_accounts', 'booking_escrow_payments', 'vouchers',
    'system_settings', 'communities', 'caregiver_reviews', 'patient_care_logs'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated_at ON %I', t, t);
    EXECUTE format('CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at()', t, t);
  END LOOP;
END $$;
