/**
 * CÔNG BỐ & THỰC THI CÁC GIỚI HẠN HỆ THỐNG CARE-MATCH (SYSTEM LIMITS SPECIFICATION)
 * Tương ứng với Mục 7 trong tài liệu Kế hoạch nâng cấp kiến trúc & kiểm thử.
 */

export const SYSTEM_LIMITS = Object.freeze({
  request: {
    maxJsonBodyKb: 1536, // 1.5 MB cho JSON API thông thường
    maxUploadBodyKb: 6144, // 6 MB cho endpoint tải ảnh eKYC
    maxStringLength: 10_000, // Độ dài tối đa cho 1 trường văn bản thông thường
    maxArrayItems: 100, // Số phần tử tối đa trong 1 mảng gửi từ client
    maxJsonDepth: 6, // Độ sâu lồng nhau tối đa của JSON payload
  },
  upload: {
    maxFileSizeBytes: 4 * 1024 * 1024, // 4 MB cho hồ sơ eKYC
    maxAiVisionBytes: 3 * 1024 * 1024, // 3 MB cho AI Vision đọc ảnh
    maxImageDimensionPx: 6000,
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'],
    allowedAiVisionMimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
  },
  ai: {
    maxRequestsPerMinute: 18,
    maxConcurrentRequestsPerIdentity: 3,
    maxDailyTokensPerIdentity: 150_000,
    maxChatMessageChars: 4000,
    maxChatHistoryTurns: 6,
    maxChatHistoryTotalChars: 2400,
    requestTimeoutMs: 18_000,
    maxToolCallingRounds: 3,
  },
  database: {
    defaultPageSize: 50,
    maxPageSize: 100,
    maxPoolConnectionsServerless: 5,
    maxPoolConnectionsStandard: 10,
  },
  auth: {
    maxFailedLoginAttempts: 5,
    accountLockoutMinutes: 15,
    maxOtpVerifyAttempts: 5,
    otpTtlMinutes: 10,
    adminMfaOtpTtlMinutes: 5,
    accessTokenTtlSeconds: 15 * 60, // 15 phút
    refreshTokenTtlSeconds: 7 * 24 * 3600, // 7 ngày
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
  retentionDays: {
    auditLogs: 90,
    aiMetricsLogs: 60,
    unapprovedAiTrainingLogs: 30,
    revokedAuthSessions: 7,
    expiredPasswordResetsHours: 24,
  },
});
