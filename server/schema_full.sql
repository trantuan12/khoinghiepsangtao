-- =========================================================
-- CARE-MATCH DATABASE - FULL SCHEMA EXPORT
-- Exported: 2026-09-26T15:25:40.525Z
-- Dùng cho Railway MySQL (database mặc định: railway)
-- =========================================================

-- Nếu dùng local XAMPP: bỏ comment 2 dòng dưới
-- CREATE DATABASE IF NOT EXISTS care_match_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- USE care_match_db;

SET FOREIGN_KEY_CHECKS = 0;

-- Table: booking_escrow_payments
DROP TABLE IF EXISTS `booking_escrow_payments`;
CREATE TABLE `booking_escrow_payments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `transaction_code` varchar(64) NOT NULL,
  `schedule_id` int(11) DEFAULT NULL,
  `family_user_id` int(11) NOT NULL,
  `caregiver_user_id` int(11) NOT NULL,
  `patient_name` varchar(128) NOT NULL,
  `shift_date` varchar(64) NOT NULL,
  `shift_time` varchar(64) NOT NULL,
  `total_amount` int(11) NOT NULL COMMENT 'Tổng số tiền ca làm (100%)',
  `platform_fee` int(11) NOT NULL COMMENT 'Chiết khấu sàn nền tảng 40%',
  `caregiver_earnings` int(11) NOT NULL COMMENT 'Thực nhận của Người chăm sóc 60%',
  `escrow_status` enum('pending_payment','in_escrow','paid_out','refunded') DEFAULT 'pending_payment' COMMENT 'Trạng thái ký quỹ',
  `payment_method` varchar(64) DEFAULT 'VietQR Napas 247',
  `family_paid_at` timestamp NULL DEFAULT NULL,
  `released_at` timestamp NULL DEFAULT NULL COMMENT 'Thời gian tự động giải ngân về TK Người chăm sóc',
  `bank_reference` varchar(128) DEFAULT NULL,
  `caregiver_bank_name` varchar(100) DEFAULT NULL,
  `caregiver_account_number` varchar(64) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `voucher_code` varchar(64) DEFAULT NULL,
  `voucher_discount` int(11) DEFAULT 0,
  `original_amount` int(11) DEFAULT NULL,
  `system_subsidy` int(11) DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `transaction_code` (`transaction_code`),
  KEY `family_user_id` (`family_user_id`),
  KEY `caregiver_user_id` (`caregiver_user_id`),
  CONSTRAINT `booking_escrow_payments_ibfk_1` FOREIGN KEY (`family_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `booking_escrow_payments_ibfk_2` FOREIGN KEY (`caregiver_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: caregiver_bank_accounts
DROP TABLE IF EXISTS `caregiver_bank_accounts`;
CREATE TABLE `caregiver_bank_accounts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `caregiver_user_id` int(11) NOT NULL,
  `bank_name` varchar(100) NOT NULL,
  `account_number` varchar(64) NOT NULL,
  `account_holder` varchar(128) NOT NULL,
  `branch` varchar(128) DEFAULT '',
  `is_default` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `caregiver_user_id` (`caregiver_user_id`),
  CONSTRAINT `caregiver_bank_accounts_ibfk_1` FOREIGN KEY (`caregiver_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: caregiver_documents
DROP TABLE IF EXISTS `caregiver_documents`;
CREATE TABLE `caregiver_documents` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `caregiver_id` int(11) NOT NULL,
  `document_type` enum('cccd','police_check','medical_certificate','health_check') NOT NULL,
  `document_name` varchar(255) NOT NULL,
  `file_url` longtext DEFAULT NULL,
  `status` enum('pending','verified','rejected') DEFAULT 'pending',
  `uploaded_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `caregiver_id` (`caregiver_id`),
  CONSTRAINT `caregiver_documents_ibfk_1` FOREIGN KEY (`caregiver_id`) REFERENCES `caregiver_profiles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: caregiver_profiles
DROP TABLE IF EXISTS `caregiver_profiles`;
CREATE TABLE `caregiver_profiles` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `title` varchar(128) DEFAULT 'Chăm sóc người cao tuổi tận tâm',
  `id_number` varchar(32) DEFAULT NULL,
  `experience_years` int(11) DEFAULT 0,
  `hourly_rate` int(11) DEFAULT 100000,
  `district` varchar(128) DEFAULT '',
  `bio` text DEFAULT NULL,
  `skills` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`skills`)),
  `documents` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`documents`)),
  `care_score` int(11) DEFAULT 0,
  `verification_status` enum('not_submitted','pending','approved','rejected','more_info_needed') DEFAULT 'not_submitted',
  `approved_by_admin_id` int(11) DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `rating` decimal(2,1) DEFAULT 4.9,
  `reviews_count` int(11) DEFAULT 38,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `shift_rate` int(11) DEFAULT 400000,
  `night_shift_rate` int(11) DEFAULT 600000,
  `work_history` longtext DEFAULT NULL,
  `contact_address` varchar(255) DEFAULT '',
  `interview_status` varchar(32) DEFAULT 'not_scheduled',
  `interview_date` varchar(64) DEFAULT NULL,
  `interview_time` varchar(64) DEFAULT NULL,
  `interview_meeting_link` varchar(255) DEFAULT NULL,
  `interview_notes` text DEFAULT NULL,
  `interview_scheduled_at` timestamp NULL DEFAULT NULL,
  `interview_passed_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`),
  CONSTRAINT `caregiver_profiles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: caregiver_reviews
DROP TABLE IF EXISTS `caregiver_reviews`;
CREATE TABLE `caregiver_reviews` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `schedule_id` int(11) DEFAULT NULL,
  `caregiver_user_id` int(11) NOT NULL,
  `family_user_id` int(11) NOT NULL,
  `family_name` varchar(128) DEFAULT 'Gia đình',
  `patient_name` varchar(128) DEFAULT 'Người thân',
  `service_title` varchar(255) DEFAULT 'Ca chăm sóc',
  `rating` int(11) NOT NULL DEFAULT 5,
  `tags` text DEFAULT NULL,
  `review_text` text DEFAULT NULL,
  `status` enum('approved','pending','hidden') DEFAULT 'approved',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `caregiver_user_id` (`caregiver_user_id`),
  KEY `family_user_id` (`family_user_id`),
  CONSTRAINT `caregiver_reviews_ibfk_1` FOREIGN KEY (`caregiver_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `caregiver_reviews_ibfk_2` FOREIGN KEY (`family_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: communities
DROP TABLE IF EXISTS `communities`;
CREATE TABLE `communities` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `category` varchar(100) DEFAULT 'Sức khỏe & Vận động',
  `description` text DEFAULT NULL,
  `meeting_schedule` varchar(255) DEFAULT '05:30 - 06:45 Hàng ngày',
  `location` varchar(255) DEFAULT 'Công viên Cầu Giấy, Hà Nội',
  `member_count` int(11) DEFAULT 120,
  `zalo_link` varchar(255) DEFAULT 'https://zalo.me/g/carematch_community',
  `qr_code_url` text DEFAULT NULL,
  `tags` text DEFAULT NULL,
  `leader_name` varchar(128) DEFAULT 'Chị Thu Hà (NV CTXH)',
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: elderly_profiles
DROP TABLE IF EXISTS `elderly_profiles`;
CREATE TABLE `elderly_profiles` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `full_name` varchar(128) NOT NULL,
  `date_of_birth` date DEFAULT NULL,
  `gender` varchar(10) DEFAULT 'Nữ',
  `address` varchar(255) DEFAULT NULL,
  `district` varchar(64) DEFAULT NULL,
  `contact_name` varchar(128) DEFAULT NULL,
  `contact_phone` varchar(20) DEFAULT NULL,
  `care_needs` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`care_needs`)),
  `notes` text DEFAULT NULL,
  `verification_status` enum('pending','verified') DEFAULT 'pending',
  `adl_score` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  CONSTRAINT `elderly_profiles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: family_profiles
DROP TABLE IF EXISTS `family_profiles`;
CREATE TABLE `family_profiles` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `representative_name` varchar(128) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `email` varchar(128) DEFAULT NULL,
  `id_number` varchar(32) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `district` varchar(128) DEFAULT NULL,
  `id_card_front` longtext DEFAULT NULL,
  `id_card_back` longtext DEFAULT NULL,
  `verification_status` enum('unverified','pending','approved','rejected') DEFAULT 'unverified',
  `rejection_reason` text DEFAULT NULL,
  `verified_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `is_premium` tinyint(1) DEFAULT 0,
  `premium_until` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`),
  CONSTRAINT `family_profiles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: family_subscriptions
DROP TABLE IF EXISTS `family_subscriptions`;
CREATE TABLE `family_subscriptions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `plan_name` varchar(64) DEFAULT 'Gói Gia Đình Premium',
  `price` int(11) DEFAULT 300000,
  `billing_cycle` varchar(32) DEFAULT 'monthly',
  `status` varchar(32) DEFAULT 'active',
  `start_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `end_date` timestamp NULL DEFAULT NULL,
  `payment_method` varchar(64) DEFAULT 'Chuyển khoản QR (VietQR)',
  `transaction_code` varchar(64) DEFAULT NULL,
  `priority_matching` tinyint(1) DEFAULT 1,
  `priority_booking` tinyint(1) DEFAULT 1,
  `priority_support` tinyint(1) DEFAULT 1,
  `dedicated_support_247` tinyint(1) DEFAULT 1,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `family_subscriptions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: messages
DROP TABLE IF EXISTS `messages`;
CREATE TABLE `messages` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `conversation_id` varchar(64) NOT NULL,
  `sender_user_id` int(11) NOT NULL,
  `sender_name` varchar(128) NOT NULL,
  `sender_role` enum('family','caregiver','admin') NOT NULL,
  `recipient_user_id` int(11) NOT NULL,
  `recipient_name` varchar(128) NOT NULL,
  `content` text NOT NULL,
  `is_read` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_conversation` (`conversation_id`),
  KEY `idx_sender` (`sender_user_id`),
  KEY `idx_recipient` (`recipient_user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=82 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: notifications
DROP TABLE IF EXISTS `notifications`;
CREATE TABLE `notifications` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `type` enum('message','schedule','verification','system') NOT NULL DEFAULT 'system',
  `title` varchar(255) NOT NULL,
  `body` text DEFAULT NULL,
  `link` varchar(255) DEFAULT '/',
  `is_read` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_user_unread` (`user_id`,`is_read`),
  CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=224 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: patient_care_logs
DROP TABLE IF EXISTS `patient_care_logs`;
CREATE TABLE `patient_care_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `schedule_id` int(11) DEFAULT NULL,
  `family_user_id` int(11) NOT NULL,
  `caregiver_user_id` int(11) NOT NULL,
  `elderly_profile_id` int(11) DEFAULT NULL,
  `elderly_name` varchar(128) NOT NULL,
  `family_name` varchar(128) DEFAULT 'Gia đình',
  `caregiver_name` varchar(128) NOT NULL,
  `log_date` date NOT NULL,
  `time_slot` varchar(128) DEFAULT 'Ca ngày (08:00 - 12:00)',
  `blood_pressure_systolic` int(11) DEFAULT 120,
  `blood_pressure_diastolic` int(11) DEFAULT 80,
  `heart_rate` int(11) DEFAULT 75,
  `blood_sugar` decimal(5,2) DEFAULT 5.60,
  `temperature` decimal(4,1) DEFAULT 36.8,
  `spo2` int(11) DEFAULT 98,
  `weight` decimal(5,1) DEFAULT NULL,
  `meal_status` varchar(255) DEFAULT 'Ăn hết khẩu phần cháo dinh dưỡng',
  `medication_status` varchar(255) DEFAULT 'Đã uống đủ thuốc huyết áp sau ăn',
  `sleep_mood` varchar(255) DEFAULT 'Tâm trạng vui vẻ, tỉnh táo',
  `mobility_exercise` varchar(255) DEFAULT 'Đi bộ nhẹ nhàng 20 phút quanh vườn',
  `tasks_completed` text DEFAULT NULL,
  `overall_condition` enum('good','normal','attention','warning') DEFAULT 'good',
  `caregiver_notes` text DEFAULT NULL,
  `family_acknowledged` tinyint(1) DEFAULT 0,
  `family_note` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `family_user_id` (`family_user_id`),
  KEY `caregiver_user_id` (`caregiver_user_id`),
  KEY `elderly_name` (`elderly_name`),
  KEY `log_date` (`log_date`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: schedules
DROP TABLE IF EXISTS `schedules`;
CREATE TABLE `schedules` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `family_user_id` int(11) NOT NULL,
  `caregiver_user_id` int(11) NOT NULL,
  `elderly_profile_id` int(11) DEFAULT NULL,
  `elderly_name` varchar(128) DEFAULT NULL,
  `caregiver_name` varchar(128) DEFAULT NULL,
  `schedule_date` varchar(64) NOT NULL,
  `time_slot` varchar(64) NOT NULL,
  `title` varchar(255) NOT NULL,
  `tasks` text DEFAULT NULL,
  `status` enum('pending','confirmed','in_progress','completed','cancelled') DEFAULT 'pending',
  `price` int(11) DEFAULT 400000,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `caregiver_confirmed_completed` tinyint(1) DEFAULT 0,
  `family_confirmed_completed` tinyint(1) DEFAULT 0,
  `caregiver_completed_at` timestamp NULL DEFAULT NULL,
  `family_completed_at` timestamp NULL DEFAULT NULL,
  `voucher_code` varchar(64) DEFAULT NULL,
  `voucher_discount` int(11) DEFAULT 0,
  `original_price` int(11) DEFAULT NULL,
  `is_rated` tinyint(1) DEFAULT 0,
  `rating` int(11) DEFAULT NULL,
  `review_id` int(11) DEFAULT NULL,
  `review_text` text DEFAULT NULL,
  `care_log_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_family` (`family_user_id`),
  KEY `idx_caregiver` (`caregiver_user_id`),
  CONSTRAINT `schedules_ibfk_1` FOREIGN KEY (`family_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `schedules_ibfk_2` FOREIGN KEY (`caregiver_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: system_settings
DROP TABLE IF EXISTS `system_settings`;
CREATE TABLE `system_settings` (
  `setting_key` varchar(64) NOT NULL,
  `setting_value` text NOT NULL,
  `setting_type` varchar(32) DEFAULT 'string',
  `setting_group` varchar(64) DEFAULT 'general',
  `description` varchar(255) DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: transactions
DROP TABLE IF EXISTS `transactions`;
CREATE TABLE `transactions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `transaction_code` varchar(64) NOT NULL,
  `schedule_id` int(11) DEFAULT NULL,
  `family_user_id` int(11) NOT NULL,
  `caregiver_user_id` int(11) NOT NULL,
  `service_name` varchar(255) NOT NULL,
  `total_amount` int(11) NOT NULL COMMENT 'Số tiền gia đình thanh toán',
  `platform_fee` int(11) DEFAULT 0 COMMENT 'Phí điều phối nền tảng',
  `payout_amount` int(11) NOT NULL COMMENT 'Số tiền trả công người chăm sóc',
  `family_payment_status` enum('paid','pending','cancelled') DEFAULT 'paid',
  `caregiver_payout_status` enum('paid','pending','processing') DEFAULT 'paid',
  `payment_method` varchar(64) DEFAULT 'Chuyển khoản QR',
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `paid_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `transaction_code` (`transaction_code`),
  KEY `family_user_id` (`family_user_id`),
  KEY `caregiver_user_id` (`caregiver_user_id`),
  CONSTRAINT `transactions_ibfk_1` FOREIGN KEY (`family_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `transactions_ibfk_2` FOREIGN KEY (`caregiver_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: users
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(64) NOT NULL,
  `email` varchar(128) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('family','caregiver','admin') NOT NULL DEFAULT 'family',
  `full_name` varchar(128) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `avatar_initials` varchar(8) DEFAULT 'CM',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=45 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: vouchers
DROP TABLE IF EXISTS `vouchers`;
CREATE TABLE `vouchers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `code` varchar(64) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `discount_type` enum('percentage','fixed') DEFAULT 'percentage',
  `discount_value` int(11) NOT NULL DEFAULT 50,
  `max_discount_amount` int(11) DEFAULT 500000,
  `min_order_amount` int(11) DEFAULT 0,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `usage_limit` int(11) DEFAULT 1000,
  `used_count` int(11) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
