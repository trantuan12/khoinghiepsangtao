/**
 * AI GUARDRAILS, PII REDACTION & OBSERVABILITY METRICS CHO CAREMATCHAI
 * - Che thông tin nhạy cảm (CCCD 12 số, SĐT, email) trước khi lưu training logs
 * - Chặn các mẫu Prompt Injection / yêu cầu vượt quyền CSDL
 * - Ghi nhận token usage, chi phí ước tính, độ trễ & cache hit vào ai_metrics_logs
 */

const MODEL_PRICING_PER_1M = {
  'gemini-3.1-flash-lite': { input: 0.25, output: 1.5 },
  'gemini-flash-lite-latest': { input: 0.25, output: 1.5 },
  'gemini-3.5-flash-lite': { input: 0.3, output: 1.8 },
};

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions?/i,
  /bỏ\s*qua\s*(tất\s*cả\s*)?(chỉ\s*thị|hướng\s*dẫn|quy\s*tắc)\s*(trước|ở\s*trên)/i,
  /system\s+prompt|developer\s+message|reveal\s+your\s+instructions/i,
  /\b(drop|truncate|alter)\s+table\b|\bdelete\s+from\s+[a-z0-9_]+/i,
  /(lấy|xem|xuất|dump)\s*(toàn\s*bộ\s*)?(mật\s*khẩu|password|cccd|api\s*key|secret|database)/i,
  /(liệt\s*kê|cho\s*biết|in\s*ra|show|list|print|repeat|output)\s*(tất\s*cả\s*)?(các\s*)?(công\s*cụ|hàm|function|tool|schema|prompt|chỉ\s*thị|quy\s*tắc\s*nội\s*bộ)/i,
  /(bạn\s+là|đóng\s+vai|giả\s+sử|act\s+as|pretend\s+to\s+be|roleplay).*(admin|quản\s*trị|developer|kiểm\s*thử|audit|hacker|root|pentester)/i,
  /\b(booking_escrow_payments|ai_training_logs|password_hash|vietqr_api_key|vietqr_client_id|auth_secret|field_encryption_key)\b/i,
  /(xem|lấy|truy\s*cập|đọc)\s*(dữ\s*liệu|hồ\s*sơ|lịch|bệnh\s*án|giao\s*dịch)\s*(của\s*)?(người\s*khác|tài\s*khoản\s*khác|toàn\s*hệ\s*thống)/i,
];

const OUTPUT_SECRET_PATTERNS = [
  /AIza[0-9A-Za-z_-]{20,}/,
  /\bsk-[A-Za-z0-9]{20,}\b/,
  /\b(password_hash|token_version|refresh_token_hash|auth_sessions|ai_training_logs|booking_escrow_payments|ai_metrics_logs|vietqr_api_key|vietqr_client_id|AUTH_SECRET|FIELD_ENCRYPTION_KEY)\b/,
  /\b(get_my_elderly_profiles|get_my_schedules|get_patient_care_logs|get_my_payments|search_caregivers|get_caregiver_detail|get_platform_info|search_knowledge_base|CAREMATCH_CHAT_TOOL_DECLARATIONS)\b/,
  /\bsystemInstruction\b/i,
];

export function inspectOutputSafety(replyText) {
  const text = String(replyText || '');
  for (const rx of OUTPUT_SECRET_PATTERNS) {
    if (rx.test(text)) {
      return {
        safe: false,
        reason: 'output_leak_guard',
        safeReply:
          'CareMatchAI chỉ hỗ trợ tư vấn chăm sóc người cao tuổi và thông tin dịch vụ thuộc phạm vi cho phép trên CARE-MATCH. Vui lòng đặt câu hỏi về tìm chuyên viên, bảng giá hoặc chăm sóc sức khỏe.',
      };
    }
  }
  return { safe: true, reason: null, safeReply: text };
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Che PII (SĐT, số CCCD/CMND, email, mã tài khoản & tên riêng truyền vào) trước khi lưu hoặc xuất dataset
 */
export function redactPii(input, options = {}) {
  if (input === null || input === undefined) return '';
  let text = typeof input === 'string' ? input : JSON.stringify(input);
  text = text
    .replace(/\b\d{12}\b/g, '[ID_REDACTED]')
    .replace(/(?:\+84|\b84|\b0)\d{8,9}\b/g, '[PHONE_REDACTED]')
    .replace(/\b\d{9}\b/g, '[ID_REDACTED]')
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[EMAIL_REDACTED]')
    .replace(/Mã tài khoản:\s*#\d+/gi, 'Mã tài khoản: #[ACCOUNT_REDACTED]');

  const extraSecrets = Array.isArray(options?.extraSecrets) ? options.extraSecrets : [];
  for (const rawSecret of extraSecrets) {
    const s = String(rawSecret ?? '').trim();
    if (s.length < 2) continue;
    text = text.replace(new RegExp(escapeRegExp(s), 'gi'), '[REDACTED]');
  }

  return text;
}

/**
 * Phát hiện nhanh Prompt Injection / trích xuất dữ liệu trái phép
 */
export function inspectInputSafety(text) {
  const clean = String(text || '').trim();
  if (!clean) return { safe: true, reason: null };

  if (clean.length > 4000) {
    return {
      safe: false,
      reason: 'input_too_long',
      message: 'Tin nhắn quá dài (tối đa 4.000 ký tự). Vui lòng rút gọn nội dung để CareMatchAI hỗ trợ tốt nhất.',
    };
  }

  for (const rx of INJECTION_PATTERNS) {
    if (rx.test(clean)) {
      return {
        safe: false,
        reason: 'prompt_injection',
        message:
          'CareMatchAI chỉ hỗ trợ tư vấn chăm sóc người cao tuổi và tra cứu thông tin thuộc quyền tài khoản của bạn trên CARE-MATCH. Vui lòng đặt câu hỏi phù hợp.',
      };
    }
  }

  return { safe: true, reason: null };
}

// ========================================================
// RULE ENGINE Y KHOA CỐ ĐỊNH (CHẠY TRƯỚC AI - ƯU TIÊN CẤP CỨU 115)
// ========================================================
const EMERGENCY_SYMPTOM_RULES = [
  { id: 'chest_pain', label: 'Đau tức ngực dữ dội', rx: /đau\s*(tức\s*)?ngực|tức\s*ngực\s*dữ\s*dội/i },
  { id: 'dyspnea', label: 'Khó thở / Ngừng thở / Tím tái', rx: /khó\s*thở|ngừng\s*thở|thở\s*gấp|tím\s*tái/i },
  {
    id: 'stroke_fast',
    label: 'Dấu hiệu nghi ngờ đột quỵ cấp (méo miệng / yếu liệt đột ngột / nói đớ)',
    rx: /méo\s*miệng|(đột\s*ngột\s*(yếu|liệt|tê))|nói\s*(ngọng|đớ|khó)|đột\s*quỵ\s*cấp/i,
  },
  { id: 'unconscious', label: 'Bất tỉnh / Hôn mê / Co giật', rx: /bất\s*tỉnh|hôn\s*mê|ngất\s*xỉu|co\s*giật|lơ\s*mơ\s*không\s*đáp\s*ứng/i },
];

export function evaluateMedicalEmergencyRules({ text = '', vitals = null } = {}) {
  const cleanText = String(text || '').trim();
  const triggers = [];

  for (const rule of EMERGENCY_SYMPTOM_RULES) {
    if (rule.rx.test(cleanText)) {
      triggers.push(rule.label);
    }
  }

  // Phát hiện số SpO2 được nhắc trực tiếp trong câu chat (vd: "SpO2 tụt xuống 85%")
  const spo2Match = cleanText.match(/spo2[^0-9]{0,15}(\d{2})\s*%?/i);
  if (spo2Match) {
    const val = Number(spo2Match[1]);
    if (val > 0 && val < 92) {
      triggers.push(`SpO2 thấp nguy hiểm (${val}% < 92%)`);
    }
  }

  if (vitals && typeof vitals === 'object') {
    const sys = Number(vitals.bpSys ?? vitals.blood_pressure_systolic ?? 0);
    const dia = Number(vitals.bpDia ?? vitals.blood_pressure_diastolic ?? 0);
    const hr = Number(vitals.heartRate ?? vitals.heart_rate ?? 0);
    const spo2 = Number(vitals.spo2 ?? 0);
    const temp = Number(vitals.temp ?? vitals.temperature ?? 0);
    const sugar = Number(vitals.bloodSugar ?? vitals.blood_sugar ?? 0);

    if (spo2 > 0 && spo2 < 92) triggers.push(`SpO2 giảm thấp nguy kịch (${spo2}%)`);
    if (sys >= 180 || dia >= 120) triggers.push(`Cơn tăng huyết áp khẩn cấp (${sys}/${dia} mmHg)`);
    else if (sys > 0 && sys < 85) triggers.push(`Huyết áp tụt thấp nguy hiểm (${sys}/${dia || '?'} mmHg)`);
    if (hr >= 130 || (hr > 0 && hr < 45)) triggers.push(`Nhịp tim bất thường nghiêm trọng (${hr} bpm)`);
    if (temp >= 39.5 || (temp > 0 && temp < 35.0)) triggers.push(`Thân nhiệt nguy hiểm (${temp} °C)`);
    if (sugar > 0 && sugar < 3.5) triggers.push(`Hạ đường huyết nguy hiểm (${sugar} mmol/L)`);
    else if (sugar >= 16.7 && sugar < 45) triggers.push(`Tăng đường huyết rất cao (${sugar} mmol/L)`);
  }

  if (triggers.length === 0) {
    return { isEmergency: false, triggers: [], alertMessage: null };
  }

  const uniqueTriggers = [...new Set(triggers)];
  return {
    isEmergency: true,
    triggers: uniqueTriggers,
    alertMessage:
      `🚨 CẢNH BÁO Y KHOA KHẨN CẤP: Phát hiện dấu hiệu nguy hiểm (${uniqueTriggers.join('; ')}). ` +
      `Vui lòng GỌI NGAY CẤP CỨU 115 hoặc đưa người bệnh đến cơ sở y tế/bệnh viện gần nhất ngay lập tức! ` +
      `Trong lúc chờ cấp cứu: để người bệnh nằm nghỉ ở tư thế an toàn, nới lỏng quần áo, tuyệt đối không tự ý cho ăn uống nếu lơ mơ/khó thở và theo dõi sát nhịp thở.`,
  };
}

export function calculateEstimatedCostUsd(model, promptTokens = 0, candidatesTokens = 0) {
  const pricing = MODEL_PRICING_PER_1M[model] || MODEL_PRICING_PER_1M['gemini-3.1-flash-lite'];
  const cost = (Number(promptTokens) * pricing.input + Number(candidatesTokens) * pricing.output) / 1_000_000;
  return Number(cost.toFixed(7));
}

export async function recordAiMetric(
  pool,
  isDbConnected,
  {
    endpoint,
    modelUsed = null,
    promptTokens = 0,
    candidatesTokens = 0,
    totalTokens = 0,
    latencyMs = 0,
    toolsUsed = [],
    cacheHit = false,
    guardrailTriggered = null,
    status = 'ok',
    errorMessage = null,
  }
) {
  if (!pool || !isDbConnected) return;
  try {
    const cost = calculateEstimatedCostUsd(modelUsed, promptTokens, candidatesTokens);
    const toolsStr = Array.isArray(toolsUsed) && toolsUsed.length ? toolsUsed.join(',') : null;
    await pool.execute(
      `INSERT INTO ai_metrics_logs
        (endpoint, model_used, prompt_tokens, candidates_tokens, total_tokens, estimated_cost_usd, latency_ms, tools_used, cache_hit, guardrail_triggered, status, error_message)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        String(endpoint || '/api/ai'),
        modelUsed,
        Number(promptTokens || 0),
        Number(candidatesTokens || 0),
        Number(totalTokens || 0),
        cost,
        Math.max(0, Math.round(Number(latencyMs || 0))),
        toolsStr,
        Boolean(cacheHit),
        guardrailTriggered,
        status,
        errorMessage ? String(errorMessage).slice(0, 500) : null,
      ]
    );
  } catch (err) {
    console.warn('⚠️ Không thể ghi ai_metrics_logs:', err.message);
  }
}
