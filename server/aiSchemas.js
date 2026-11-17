/**
 * BỘ KIỂM TRA CẤU TRÚC ĐẦU RA AI (OUTPUT SCHEMA VALIDATION)
 * Đảm bảo mọi phản hồi JSON từ CareMatchAI khớp đúng schema frontend yêu cầu,
 * từ chối các phản hồi thiếu trường bắt buộc hoặc bịa đặt ID ngoài hệ thống.
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

/**
 * Kiểm tra output cho tính năng AI Care Matcher
 */
export function validateCareMatcherOutput(obj, allowedCaregiverIds = null) {
  if (!isPlainObject(obj) || typeof obj.summary !== 'string' || !obj.summary.trim() || !Array.isArray(obj.recommendations)) {
    throw new AiOutputValidationError('CareMatchAI chưa trả về danh sách gợi ý chuyên viên đúng định dạng.');
  }

  const normalizedRecs = [];
  for (const item of obj.recommendations) {
    if (!isPlainObject(item)) continue;
    const rawId = item.caregiver_id !== undefined && item.caregiver_id !== null ? String(item.caregiver_id).trim() : '';
    const name = typeof item.name === 'string' ? item.name.trim() : '';
    if (!rawId || !name) continue;

    if (allowedCaregiverIds instanceof Set && allowedCaregiverIds.size > 0 && !allowedCaregiverIds.has(rawId)) {
      continue;
    }

    normalizedRecs.push({
      caregiver_id: rawId,
      name,
      match_score: Math.min(100, Math.max(0, Math.round(Number(item.match_score) || 85))),
      shift_rate: Number(item.shift_rate) || 400000,
      district: String(item.district || 'Hà Nội').trim(),
      reasons: toStringArray(item.reasons),
    });
  }

  if (obj.recommendations.length > 0 && normalizedRecs.length === 0) {
    throw new AiOutputValidationError('Danh sách gợi ý từ CareMatchAI không khớp với hồ sơ chuyên viên hiện có.');
  }

  return {
    summary: obj.summary.trim(),
    recommendations: normalizedRecs,
    care_advice: String(obj.care_advice || '').trim(),
  };
}

/**
 * Kiểm tra output cho tính năng Phân tích xu hướng sinh hiệu
 */
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

/**
 * Kiểm tra output cho tính năng Chuẩn hóa báo cáo sau ca
 */
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

/**
 * Kiểm tra output cho tính năng eKYC Vision
 */
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

/**
 * Kiểm tra output cho Chatbot hội thoại CareMatchAI
 */
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
