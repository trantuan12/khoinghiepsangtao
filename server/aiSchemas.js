/**
 * BỘ KIỂM TRA CẤU TRÚC ĐẦU RA AI & GEMINI STRUCTURED OUTPUT SCHEMAS
 * - Cung cấp JSON Schema chính thức cho Gemini generationConfig.responseSchema
 * - Kiểm tra kiểu dữ liệu, enum, giới hạn số & đối chiếu ID/giá/khu vực từ DB thực tế
 */

export class AiOutputValidationError extends Error {
  constructor(message = 'CareMatchAI trả về dữ liệu chưa đúng cấu trúc, vui lòng thử lại.') {
    super(message);
    this.name = 'AiOutputValidationError';
    this.statusCode = 502;
    this.code = 'INVALID_AI_OUTPUT';
  }
}

export function isPlainObject(v) {
  return Boolean(v && typeof v === 'object' && !Array.isArray(v));
}

function toStringArray(v) {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x ?? '').trim()).filter(Boolean);
}

// ========================================================
// OFFICIAL GEMINI RESPONSE SCHEMAS
// ========================================================
export const CARE_MATCHER_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  required: ['summary', 'recommendations', 'care_advice'],
  properties: {
    summary: { type: 'STRING' },
    care_advice: { type: 'STRING' },
    recommendations: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        required: ['caregiver_id', 'name', 'match_score', 'reasons'],
        properties: {
          caregiver_id: { type: 'STRING' },
          name: { type: 'STRING' },
          match_score: { type: 'INTEGER' },
          shift_rate: { type: 'NUMBER' },
          district: { type: 'STRING' },
          reasons: { type: 'ARRAY', items: { type: 'STRING' } },
        },
      },
    },
  },
};

export const CARE_LOG_SUMMARY_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  required: [
    'overall_status',
    'headline',
    'summary',
    'vital_trends',
    'alerts',
    'recommendations_for_family',
    'recommendations_for_next_shift',
  ],
  properties: {
    overall_status: { type: 'STRING', enum: ['stable', 'attention', 'warning'] },
    headline: { type: 'STRING' },
    summary: { type: 'STRING' },
    vital_trends: {
      type: 'OBJECT',
      required: ['blood_pressure', 'heart_rate_temp', 'nutrition_sleep'],
      properties: {
        blood_pressure: { type: 'STRING' },
        heart_rate_temp: { type: 'STRING' },
        nutrition_sleep: { type: 'STRING' },
      },
    },
    alerts: { type: 'ARRAY', items: { type: 'STRING' } },
    recommendations_for_family: { type: 'ARRAY', items: { type: 'STRING' } },
    recommendations_for_next_shift: { type: 'ARRAY', items: { type: 'STRING' } },
  },
};

export const SHIFT_REPORT_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  required: ['draft_notes'],
  properties: {
    draft_notes: { type: 'STRING' },
    suggested_condition: { type: 'STRING', enum: ['good', 'normal', 'attention', 'warning'] },
  },
};

export const VERIFY_DOC_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  required: ['is_valid_image', 'matches_expected_type', 'clarity', 'detected_type', 'id_number', 'full_name', 'warnings', 'summary'],
  properties: {
    is_valid_image: { type: 'BOOLEAN' },
    matches_expected_type: { type: 'BOOLEAN' },
    clarity: { type: 'STRING', enum: ['clear', 'blurry', 'cropped'] },
    detected_type: { type: 'STRING' },
    id_number: { type: 'STRING' },
    full_name: { type: 'STRING' },
    warnings: { type: 'ARRAY', items: { type: 'STRING' } },
    summary: { type: 'STRING' },
  },
};

/**
 * Kiểm tra output cho tính năng AI Care Matcher.
 * Chấp nhận Map<caregiver_id, dbCaregiver> hoặc Set<caregiver_id>:
 * - Nếu DB trống (size === 0), luôn trả về recommendations = [] (chặn tuyệt đối ID bịa đặt).
 * - Ghi đè name, shift_rate, district trực tiếp từ dữ liệu DB chuẩn xác.
 */
export function validateCareMatcherOutput(obj, allowedCaregivers = null) {
  if (!isPlainObject(obj) || typeof obj.summary !== 'string' || !obj.summary.trim() || !Array.isArray(obj.recommendations)) {
    throw new AiOutputValidationError('CareMatchAI chưa trả về danh sách gợi ý chuyên viên đúng định dạng.');
  }

  const isMap = allowedCaregivers instanceof Map;
  const isSet = allowedCaregivers instanceof Set;

  if ((isMap || isSet) && allowedCaregivers.size === 0) {
    return {
      summary: obj.summary.trim(),
      recommendations: [],
      care_advice: String(obj.care_advice || '').trim(),
    };
  }

  const seenIds = new Set();
  const normalizedRecs = [];
  for (const item of obj.recommendations) {
    if (!isPlainObject(item)) continue;
    const rawId = item.caregiver_id !== undefined && item.caregiver_id !== null ? String(item.caregiver_id).trim() : '';
    if (!rawId || seenIds.has(rawId)) continue;

    if (isMap) {
      if (!allowedCaregivers.has(rawId)) continue;
      const dbCg = allowedCaregivers.get(rawId);
      seenIds.add(rawId);
      normalizedRecs.push({
        caregiver_id: rawId,
        name: String(dbCg.name),
        match_score: Math.min(100, Math.max(0, Math.round(Number(item.match_score) || 85))),
        shift_rate: Number(dbCg.shift_rate_vnd || dbCg.shift_rate || 400000),
        district: String(dbCg.district || 'Hà Nội').trim(),
        reasons: toStringArray(item.reasons).slice(0, 5),
      });
    } else if (isSet) {
      if (!allowedCaregivers.has(rawId)) continue;
      const name = typeof item.name === 'string' ? item.name.trim() : '';
      if (!name) continue;
      seenIds.add(rawId);
      normalizedRecs.push({
        caregiver_id: rawId,
        name,
        match_score: Math.min(100, Math.max(0, Math.round(Number(item.match_score) || 85))),
        shift_rate: Math.min(5_000_000, Math.max(50_000, Number(item.shift_rate) || 400000)),
        district: String(item.district || 'Hà Nội').trim(),
        reasons: toStringArray(item.reasons).slice(0, 5),
      });
    } else {
      const name = typeof item.name === 'string' ? item.name.trim() : '';
      if (!name) continue;
      seenIds.add(rawId);
      normalizedRecs.push({
        caregiver_id: rawId,
        name,
        match_score: Math.min(100, Math.max(0, Math.round(Number(item.match_score) || 85))),
        shift_rate: Math.min(5_000_000, Math.max(50_000, Number(item.shift_rate) || 400000)),
        district: String(item.district || 'Hà Nội').trim(),
        reasons: toStringArray(item.reasons).slice(0, 5),
      });
    }
  }

  if (obj.recommendations.length > 0 && normalizedRecs.length === 0) {
    throw new AiOutputValidationError('Danh sách gợi ý từ CareMatchAI không khớp với hồ sơ chuyên viên hiện có.');
  }

  return {
    summary: obj.summary.trim(),
    recommendations: normalizedRecs.slice(0, 5),
    care_advice: String(obj.care_advice || '').trim(),
  };
}

export function validateCareLogSummaryOutput(obj) {
  const validStatuses = new Set(['stable', 'attention', 'warning']);
  if (
    !isPlainObject(obj) ||
    !validStatuses.has(obj.overall_status) ||
    typeof obj.headline !== 'string' ||
    !obj.headline.trim() ||
    typeof obj.summary !== 'string' ||
    !obj.summary.trim() ||
    !isPlainObject(obj.vital_trends) ||
    typeof obj.vital_trends.blood_pressure !== 'string' ||
    !obj.vital_trends.blood_pressure.trim() ||
    typeof obj.vital_trends.heart_rate_temp !== 'string' ||
    !obj.vital_trends.heart_rate_temp.trim() ||
    typeof obj.vital_trends.nutrition_sleep !== 'string' ||
    !obj.vital_trends.nutrition_sleep.trim()
  ) {
    throw new AiOutputValidationError('CareMatchAI chưa trả về đầy đủ báo cáo phân tích sinh hiệu.');
  }

  return {
    overall_status: obj.overall_status,
    headline: obj.headline.trim(),
    summary: obj.summary.trim(),
    vital_trends: {
      blood_pressure: obj.vital_trends.blood_pressure.trim(),
      heart_rate_temp: obj.vital_trends.heart_rate_temp.trim(),
      nutrition_sleep: obj.vital_trends.nutrition_sleep.trim(),
    },
    alerts: toStringArray(obj.alerts),
    recommendations_for_family: toStringArray(obj.recommendations_for_family),
    recommendations_for_next_shift: toStringArray(obj.recommendations_for_next_shift),
  };
}

export function validateShiftReportDraftOutput(obj) {
  if (!isPlainObject(obj) || typeof obj.draft_notes !== 'string' || obj.draft_notes.trim().length < 10) {
    throw new AiOutputValidationError('CareMatchAI chưa tạo được nội dung báo cáo ca hợp lệ.');
  }

  const validFlags = new Set(['good', 'normal', 'attention', 'warning']);
  const suggestedCondition = validFlags.has(obj.suggested_condition) ? obj.suggested_condition : null;

  return {
    draft_notes: obj.draft_notes.trim(),
    ...(suggestedCondition ? { suggested_condition: suggestedCondition } : {}),
  };
}

export function validateVerifyDocumentOutput(obj) {
  const validClarity = new Set(['clear', 'blurry', 'cropped']);
  if (
    !isPlainObject(obj) ||
    typeof obj.is_valid_image !== 'boolean' ||
    typeof obj.matches_expected_type !== 'boolean' ||
    !validClarity.has(obj.clarity) ||
    typeof obj.summary !== 'string' ||
    !obj.summary.trim()
  ) {
    throw new AiOutputValidationError('CareMatchAI chưa đọc được đầy đủ kết quả kiểm tra tài liệu eKYC.');
  }

  const digits = String(obj.id_number || '').replace(/\D/g, '');
  const validId = digits.length === 12 || digits.length === 9 ? digits : '';

  return {
    is_valid_image: obj.is_valid_image,
    matches_expected_type: obj.matches_expected_type,
    clarity: obj.clarity,
    detected_type: String(obj.detected_type || '').trim(),
    id_number: validId,
    full_name: String(obj.full_name || '').trim(),
    warnings: toStringArray(obj.warnings),
    summary: obj.summary.trim(),
  };
}

export function validateChatOutput(parsed, rawText) {
  if (isPlainObject(parsed) && typeof parsed.reply === 'string' && parsed.reply.trim()) {
    return {
      reply: parsed.reply.trim(),
      quick_replies: toStringArray(parsed.quick_replies).slice(0, 3),
    };
  }

  const rawTrim = typeof rawText === 'string' ? rawText.trim() : '';
  if (rawTrim && !rawTrim.startsWith('{') && !rawTrim.startsWith('[')) {
    return {
      reply: rawTrim,
      quick_replies: [],
    };
  }

  throw new AiOutputValidationError('CareMatchAI trả về cấu trúc phản hồi không hợp lệ, vui lòng thử lại.');
}
