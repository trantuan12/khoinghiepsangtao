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
  /(drop|truncate|delete\s+from|alter)\s+table/i,
  /(lấy|xem|xuất|dump)\s*(toàn\s*bộ\s*)?(mật\s*khẩu|password|cccd|api\s*key|secret|database)/i,
];

/**
 * Che PII (SĐT, số CCCD 12 số, email) trước khi lưu dữ liệu log huấn luyện
 */
export function redactPii(input) {
  if (input === null || input === undefined) return '';
  const text = typeof input === 'string' ? input : JSON.stringify(input);
  return text
    .replace(/\b0\d{9,10}\b/g, '[PHONE_REDACTED]')
    .replace(/\b\d{12}\b/g, '[CCCD_REDACTED]')
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[EMAIL_REDACTED]');
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
