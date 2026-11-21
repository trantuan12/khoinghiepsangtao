/**
 * REQUEST BOUNDS & PAGINATION VALIDATOR MIDDLEWARE
 * - Kiểm tra độ dài chuỗi, số lượng phần tử mảng, độ sâu JSON và phạm vi số trong request body
 * - Chuẩn hóa tham số phân trang (page, limit, offset) để không có truy vấn danh sách không giới hạn
 */

import { SYSTEM_LIMITS } from '../config/limits.js';

const LARGE_BASE64_KEYS = new Set([
  'dataUrl',
  'id_card_front',
  'id_card_back',
  'fileUrl',
  'url',
  'file_url',
  'qr_code_url',
]);

function inspectPayloadBounds(value, depth = 0, parentKey = '') {
  if (depth > SYSTEM_LIMITS.request.maxJsonDepth) {
    return `Cấu trúc dữ liệu JSON lồng nhau vượt quá độ sâu tối đa (${SYSTEM_LIMITS.request.maxJsonDepth}).`;
  }

  if (typeof value === 'string') {
    if (LARGE_BASE64_KEYS.has(parentKey)) {
      if (value.length > 6 * 1024 * 1024) {
        return `Trường tệp "${parentKey}" vượt quá dung lượng cho phép.`;
      }
      return null;
    }
    if (value.length > SYSTEM_LIMITS.request.maxStringLength) {
      return `Trường "${parentKey || 'text'}" vượt quá độ dài tối đa (${SYSTEM_LIMITS.request.maxStringLength} ký tự).`;
    }
    return null;
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      return `Trường số "${parentKey}" không hợp lệ.`;
    }
    return null;
  }

  if (Array.isArray(value)) {
    if (value.length > SYSTEM_LIMITS.request.maxArrayItems) {
      return `Mảng "${parentKey || 'items'}" vượt quá số phần tử tối đa (${SYSTEM_LIMITS.request.maxArrayItems}).`;
    }
    for (let i = 0; i < value.length; i++) {
      const err = inspectPayloadBounds(value[i], depth + 1, parentKey);
      if (err) return err;
    }
    return null;
  }

  if (value && typeof value === 'object') {
    const keys = Object.keys(value);
    if (keys.length > 80) {
      return 'Số lượng trường trong một đối tượng JSON vượt quá giới hạn an toàn (80).';
    }
    for (const k of keys) {
      const err = inspectPayloadBounds(value[k], depth + 1, k);
      if (err) return err;
    }
  }

  return null;
}

const NUMERIC_RANGE_RULES = {
  rating: { min: 1, max: 5 },
  experience_years: { min: 0, max: 60 },
  experienceYears: { min: 0, max: 60 },
  price: { min: 0, max: 50_000_000 },
  shift_rate: { min: 100_000, max: 10_000_000 },
  shiftRate: { min: 100_000, max: 10_000_000 },
  hourly_rate: { min: 20_000, max: 2_000_000 },
  hourlyRate: { min: 20_000, max: 2_000_000 },
  blood_pressure_systolic: { min: 40, max: 280 },
  blood_pressure_diastolic: { min: 25, max: 190 },
  heart_rate: { min: 25, max: 240 },
  temperature: { min: 33, max: 43.5 },
  spo2: { min: 40, max: 100 },
  blood_sugar: { min: 0.5, max: 45 },
};

export function requestBoundsValidatorMiddleware(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    const boundErr = inspectPayloadBounds(req.body, 0, '');
    if (boundErr) {
      return res.status(400).json({ error: boundErr });
    }

    if (!Array.isArray(req.body)) {
      for (const [field, rule] of Object.entries(NUMERIC_RANGE_RULES)) {
        const rawVal = req.body[field];
        if (rawVal !== undefined && rawVal !== null && rawVal !== '') {
          const num = Number(rawVal);
          if (!Number.isFinite(num) || num < rule.min || num > rule.max) {
            return res.status(400).json({
              error: `Giá trị "${field}" phải nằm trong khoảng từ ${rule.min} đến ${rule.max}.`,
            });
          }
        }
      }
    }
  }
  return next();
}

export function parsePagination(query = {}, { defaultLimit = SYSTEM_LIMITS.database.defaultPageSize, maxLimit = SYSTEM_LIMITS.database.maxPageSize } = {}) {
  const rawLimit = Number(query?.limit);
  const rawPage = Number(query?.page);
  const rawOffset = Number(query?.offset);

  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(maxLimit, Math.floor(rawLimit)) : defaultLimit;
  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.min(10_000, Math.floor(rawPage)) : 1;
  const offset =
    Number.isFinite(rawOffset) && rawOffset >= 0 ? Math.min(100_000, Math.floor(rawOffset)) : (page - 1) * limit;

  return { limit, page, offset };
}

export function attachPaginationHeaders(res, { limit, page, offset }) {
  res.setHeader('X-Pagination-Limit', String(limit));
  res.setHeader('X-Pagination-Page', String(page));
  res.setHeader('X-Pagination-Offset', String(offset));
}
