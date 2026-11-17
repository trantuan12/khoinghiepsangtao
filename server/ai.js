/**
 * MODULE TÍCH HỢP GOOGLE GEMINI API CHO CARE-MATCH
 * Mặc định sử dụng gemini-3.1-flash-lite (tiết kiệm nhất, quota cao nhất ~500 req/ngày ở gói miễn phí,
 * hỗ trợ cả text JSON lẫn đọc ảnh đa phương thức) kèm cơ chế tự động fallback khi model quá tải.
 */

const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
const FALLBACK_MODELS = ['gemini-3.1-flash-lite', 'gemini-flash-lite-latest', 'gemini-3.5-flash-lite'];

export function getGeminiConfig() {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  const model = (process.env.GEMINI_TUNED_MODEL || process.env.GEMINI_MODEL || DEFAULT_MODEL).trim();
  return {
    configured: Boolean(apiKey),
    apiKey,
    model,
    tunedModel: (process.env.GEMINI_TUNED_MODEL || '').trim() || null,
  };
}

/**
 * Gọi Google Gemini generateContent API (hỗ trợ text, multimodal inlineData, JSON output và fallback model)
 */
export async function callGemini({ systemInstruction, parts, responseSchemaJson = true, temperature = 0.4 }) {
  const { configured, apiKey, model } = getGeminiConfig();
  if (!configured) {
    const err = new Error('Trợ lý AI hiện chưa được kích hoạt trên hệ thống.');
    err.code = 'MISSING_GEMINI_KEY';
    err.statusCode = 503;
    throw err;
  }

  const modelChain = [model, ...FALLBACK_MODELS.filter((m) => m !== model)];

  const basePayload = {
    contents: [
      {
        role: 'user',
        parts: Array.isArray(parts) ? parts : [{ text: String(parts || '') }],
      },
    ],
    generationConfig: {
      temperature,
      ...(responseSchemaJson ? { responseMimeType: 'application/json' } : {}),
    },
  };

  if (systemInstruction) {
    basePayload.systemInstruction = {
      parts: [{ text: systemInstruction }],
    };
  }

  let lastError = null;
  for (const candidateModel of modelChain) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(candidateModel)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 18000);

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        signal: ctrl.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(basePayload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.error?.message || `Hệ thống AI trả về lỗi HTTP ${res.status}`;
        console.warn(`⚠️ [AI ${candidateModel}] HTTP ${res.status}:`, msg);
        const err = new Error('Hệ thống AI đang quá tải hoặc tạm gián đoạn, vui lòng thử lại sau.');
        err.statusCode = res.status >= 400 && res.status < 600 ? res.status : 502;
        lastError = err;
        // Nếu quá tải tạm thời (503/429) hoặc model không khả dụng (404), thử model dự phòng tiếp theo
        if (res.status === 503 || res.status === 429 || res.status === 404) {
          continue;
        }
        throw err;
      }

      const rawText =
        data?.candidates?.[0]?.content?.parts
          ?.map((p) => p.text || '')
          .join('')
          .trim() || '';

      if (!rawText) {
        lastError = new Error('Hệ thống AI không trả về nội dung phản hồi.');
        lastError.statusCode = 502;
        continue;
      }

      let parsed = rawText;
      if (responseSchemaJson) {
        const cleaned = rawText
          .replace(/^```json\s*/i, '')
          .replace(/^```\s*/i, '')
          .replace(/```$/i, '')
          .trim();
        try {
          parsed = JSON.parse(cleaned);
        } catch {
          parsed = { raw: rawText };
        }
      }

      return { model: candidateModel, rawText, parsed };
    } catch (err) {
      lastError = err;
      if (err.name === 'AbortError') {
        lastError = new Error('Hệ thống AI phản hồi quá lâu, vui lòng thử lại.');
        lastError.statusCode = 504;
        continue;
      }
      if (err.statusCode && err.statusCode !== 503 && err.statusCode !== 429 && err.statusCode !== 404) {
        throw err;
      }
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError || new Error('Không thể kết nối tới dịch vụ AI.');
}

/**
 * Lưu lại cặp prompt/output vào bảng ai_training_logs để chuẩn bị dữ liệu Fine-tune (Vertex AI JSONL)
 */
export async function logAiTrainingSample(pool, isDbConnected, { taskType, systemInstruction, userInput, modelOutput, modelUsed }) {
  if (!pool || !isDbConnected) return null;
  try {
    const outputStr = typeof modelOutput === 'string' ? modelOutput : JSON.stringify(modelOutput);
    const inputStr = typeof userInput === 'string' ? userInput : JSON.stringify(userInput);
    const [res] = await pool.execute(
      `INSERT INTO ai_training_logs (task_type, system_instruction, user_input, model_output, model_used, is_approved)
       VALUES (?, ?, ?, ?, ?, TRUE) RETURNING id`,
      [taskType, systemInstruction || '', inputStr, outputStr, modelUsed || DEFAULT_MODEL]
    );
    return res.insertId || null;
  } catch (err) {
    console.warn('⚠️ Không thể ghi ai_training_logs:', err.message);
    return null;
  }
}

/**
 * Chuyển đổi dataUrl (data:image/jpeg;base64,...) thành part inlineData cho Gemini Vision
 */
export function parseDataUrlToGeminiPart(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  const match = dataUrl.match(/^data:([A-Za-z0-9/+.-]+);base64,(.+)$/);
  if (!match) return null;
  return {
    inlineData: {
      mimeType: match[1],
      data: match[2],
    },
  };
}
