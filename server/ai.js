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

function tryParseJsonText(rawText) {
  const cleaned = String(rawText || '')
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

async function requestGeminiGenerate(basePayload, preferredModel = null) {
  const { configured, apiKey, model } = getGeminiConfig();
  if (!configured) {
    const err = new Error('CareMatchAI hiện chưa được kích hoạt trên hệ thống.');
    err.code = 'MISSING_GEMINI_KEY';
    err.statusCode = 503;
    throw err;
  }

  const startModel = preferredModel || model;
  const modelChain = [startModel, ...FALLBACK_MODELS.filter((m) => m !== startModel)];

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
        const msg = data?.error?.message || `CareMatchAI trả về lỗi HTTP ${res.status}`;
        console.warn(`⚠️ [AI ${candidateModel}] HTTP ${res.status}:`, msg);
        const err = new Error('CareMatchAI đang quá tải hoặc tạm gián đoạn, vui lòng thử lại sau.');
        err.statusCode = res.status >= 400 && res.status < 600 ? res.status : 502;
        lastError = err;
        if (res.status === 503 || res.status === 429 || res.status === 404) {
          continue;
        }
        throw err;
      }

      const candidateContent = data?.candidates?.[0]?.content;
      const parts = Array.isArray(candidateContent?.parts) ? candidateContent.parts : [];
      if (parts.length === 0) {
        lastError = new Error('CareMatchAI không trả về nội dung phản hồi.');
        lastError.statusCode = 502;
        continue;
      }

      return { model: candidateModel, content: candidateContent, parts };
    } catch (err) {
      lastError = err;
      if (err.name === 'AbortError') {
        lastError = new Error('CareMatchAI phản hồi quá lâu, vui lòng thử lại.');
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

  throw lastError || new Error('Không thể kết nối tới CareMatchAI.');
}

/**
 * Gọi Google Gemini generateContent API (hỗ trợ single-turn parts, multi-turn contents, multimodal inlineData, JSON output và fallback model)
 */
export async function callGemini({ systemInstruction, parts, contents, responseSchemaJson = true, temperature = 0.4 }) {
  const normalizedContents =
    Array.isArray(contents) && contents.length > 0
      ? contents
      : [
          {
            role: 'user',
            parts: Array.isArray(parts) ? parts : [{ text: String(parts || '') }],
          },
        ];

  const basePayload = {
    contents: normalizedContents,
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

  const res = await requestGeminiGenerate(basePayload);
  const rawText = res.parts
    .map((p) => p.text || '')
    .join('')
    .trim();

  if (!rawText) {
    const err = new Error('CareMatchAI không trả về nội dung phản hồi.');
    err.statusCode = 502;
    throw err;
  }

  let parsed = rawText;
  if (responseSchemaJson) {
    parsed = tryParseJsonText(rawText) ?? { raw: rawText };
  }

  return { model: res.model, rawText, parsed };
}

/**
 * Gọi CareMatchAI có hỗ trợ Function Calling (truy xuất dữ liệu live nhiều bước từ CSDL)
 */
export async function callGeminiWithTools({
  systemInstruction,
  contents,
  functionDeclarations = [],
  executeTool,
  temperature = 0.35,
  maxToolRounds = 3,
}) {
  const conversation = Array.isArray(contents) ? [...contents] : [];
  const toolsUsed = [];
  let lockedModel = null;

  for (let round = 0; round <= maxToolRounds; round++) {
    const isFinalFallbackRound = round === maxToolRounds;
    const payload = {
      contents: conversation,
      generationConfig: {
        temperature,
      },
      ...(systemInstruction ? { systemInstruction: { parts: [{ text: systemInstruction }] } } : {}),
      ...(!isFinalFallbackRound && functionDeclarations.length > 0
        ? { tools: [{ functionDeclarations }] }
        : {}),
    };

    const res = await requestGeminiGenerate(payload, lockedModel);
    lockedModel = res.model;

    const functionCalls = res.parts.filter((p) => p.functionCall && p.functionCall.name);
    if (functionCalls.length === 0 || isFinalFallbackRound || typeof executeTool !== 'function') {
      const rawText = res.parts
        .map((p) => p.text || '')
        .join('')
        .trim();
      const parsed = tryParseJsonText(rawText);
      return {
        model: res.model,
        rawText,
        parsed: parsed || { reply: rawText },
        toolsUsed: [...new Set(toolsUsed)],
      };
    }

    // Giữ nguyên model turn (bao gồm functionCall + thoughtSignature bắt buộc cho Gemini 3.x)
    conversation.push({
      role: 'model',
      parts: res.parts,
    });

    const functionResponseParts = [];
    for (const part of functionCalls) {
      const { name, args } = part.functionCall;
      toolsUsed.push(name);
      const toolResult = await executeTool(name, args || {});
      functionResponseParts.push({
        functionResponse: {
          name,
          response: { result: toolResult },
        },
      });
    }

    conversation.push({
      role: 'user',
      parts: functionResponseParts,
    });
  }

  throw new Error('Không thể hoàn tất tra cứu dữ liệu CareMatchAI.');
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
