-- =========================================================
-- HỆ THỐNG CƠ SỞ DỮ LIỆU CARE-MATCH (MySQL 8.0+)
-- Phiên bản: 2.0 — Hỗ trợ nhiều người bệnh, thông báo real-time
-- =========================================================

CREATE DATABASE IF NOT EXISTS care_match_db
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE care_match_db;

-- 1. BẢNG NGƯỜI DÙNG (USERS)
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

-- 2. BẢNG HỒ SƠ NGƯỜI CẦN CHĂM SÓC (ELDERLY PROFILES)
-- Mỗi user Gia đình có thể có NHIỀU người bệnh
CREATE TABLE IF NOT EXISTS elderly_profiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  full_name VARCHAR(128) NOT NULL,
  date_of_birth DATE,
  gender VARCHAR(10) DEFAULT 'Nữ',
  address VARCHAR(255),
  district VARCHAR(64),
  contact_name VARCHAR(128),
  contact_phone VARCHAR(20),
  care_needs JSON COMMENT 'Mảng JSON các nhu cầu chăm sóc',
  notes TEXT,
  verification_status ENUM('pending', 'verified') DEFAULT 'pending',
  adl_score INT DEFAULT 0 COMMENT 'Điểm đánh giá mức độ tự lập (0-100)',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. BẢNG HỒ SƠ NGƯỜI CHĂM SÓC (CAREGIVER PROFILES)
CREATE TABLE IF NOT EXISTS caregiver_profiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  title VARCHAR(128) DEFAULT 'Chăm sóc người cao tuổi tận tâm',
  experience_years INT DEFAULT 5,
  hourly_rate INT DEFAULT 100000,
  district VARCHAR(128) DEFAULT 'Hà Nội',
  bio TEXT,
  skills JSON,
  care_score INT DEFAULT 85,
  verification_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  approved_by_admin_id INT NULL,
  approved_at TIMESTAMP NULL,
  rating DECIMAL(2,1) DEFAULT 4.9,
  reviews_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. BẢNG TÀI LIỆU XÁC THỰC (eKYC)
CREATE TABLE IF NOT EXISTS caregiver_documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  caregiver_id INT NOT NULL,
  document_type ENUM('cccd', 'police_check', 'medical_certificate', 'health_check') NOT NULL,
  document_name VARCHAR(255) NOT NULL,
  file_url VARCHAR(512),
  status ENUM('pending', 'verified', 'rejected') DEFAULT 'pending',
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (caregiver_id) REFERENCES caregiver_profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. BẢNG LỊCH TRÌNH VÀ CA CHĂM SÓC (SCHEDULES)
CREATE TABLE IF NOT EXISTS schedules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  family_user_id INT NOT NULL,
  caregiver_user_id INT NOT NULL,
  elderly_profile_id INT NULL,
  elderly_name VARCHAR(128),
  caregiver_name VARCHAR(128),
  schedule_date VARCHAR(64),
  time_slot VARCHAR(64),
  title VARCHAR(255) NOT NULL,
  tasks TEXT,
  status ENUM('pending', 'confirmed', 'in_progress', 'completed', 'cancelled') DEFAULT 'pending',
  price INT DEFAULT 400000,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (family_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (caregiver_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. BẢNG TIN NHẮN (MESSAGES)
CREATE TABLE IF NOT EXISTS messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  conversation_id VARCHAR(64) NOT NULL,
  sender_user_id INT NOT NULL,
  sender_name VARCHAR(128) NOT NULL,
  sender_role ENUM('family', 'caregiver', 'admin') NOT NULL,
  recipient_user_id INT NOT NULL,
  recipient_name VARCHAR(128) NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_conversation (conversation_id),
  INDEX idx_sender (sender_user_id),
  INDEX idx_recipient (recipient_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. BẢNG THÔNG BÁO (NOTIFICATIONS)
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type ENUM('message', 'schedule', 'verification', 'system') NOT NULL DEFAULT 'system',
  title VARCHAR(255) NOT NULL,
  body TEXT,
  link VARCHAR(255) DEFAULT '/',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_unread (user_id, is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. BẢNG THANH TOÁN VÀ DOANH THU (PAYMENTS & TRANSACTIONS)
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
  FOREIGN KEY (caregiver_user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_family (family_user_id),
  INDEX idx_caregiver (caregiver_user_id),
  INDEX idx_status (family_payment_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
