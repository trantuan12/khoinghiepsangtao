/**
 * HYBRID SEMANTIC RAG MODULE (PGVECTOR + GEMINI EMBEDDING 001)
 * - Tạo vector 768 chiều cho hồ sơ chuyên viên & cẩm nang/chính sách CARE-MATCH
 * - Lưu trữ & tìm kiếm cosine similarity trên Supabase pgvector (ai_knowledge_chunks)
 */

import crypto from 'node:crypto';

const EMBED_MODEL = 'models/gemini-embedding-001';
const EMBED_DIM = 768;

function computeContentHash(text) {
  return crypto.createHash('sha256').update(String(text || '').trim(), 'utf8').digest('hex').slice(0, 32);
}

// Cẩm nang chăm sóc người cao tuổi & chính sách chuẩn CARE-MATCH để làm Knowledge Base ngữ nghĩa
const CARE_MATCH_GUIDES = [
  {
    source_type: 'policy',
    source_id: 'guide_pricing_booking',
    title: 'Bảng giá & Quy trình đặt lịch chăm sóc tại CARE-MATCH',
    content:
      'CARE-MATCH cung cấp gói chăm sóc theo giờ (100.000đ - 180.000đ/giờ), theo ca ngày 4-8 tiếng (350.000đ - 550.000đ/ca) và ca đêm (550.000đ - 750.000đ/ca). Gia đình tìm chuyên viên tại mục Tìm người chăm sóc, chọn ca phù hợp và thanh toán giữ chỗ an toàn qua hệ thống (escrow). Sau mỗi ca, chuyên viên gửi báo cáo sinh hiệu chi tiết trước khi hệ thống giải ngân.',
  },
  {
    source_type: 'policy',
    source_id: 'guide_ekyc_carescore',
    title: 'Thẩm định eKYC & Hệ thống điểm uy tín CARE SCORE',
    content:
      'Mọi chuyên viên trên CARE-MATCH đều phải trải qua 3 vòng thẩm định: xác thực CCCD gắn chip eKYC, kiểm tra chứng chỉ hành nghề/bằng cấp điều dưỡng và phỏng vấn chuyên môn cùng Admin. Điểm CARE SCORE (thang 100) tổng hợp từ bằng cấp, số ca hoàn thành đúng hạn, độ đầy đủ của nhật ký sinh hiệu và đánh giá thực tế từ gia đình.',
  },
  {
    source_type: 'medical_guide',
    source_id: 'guide_stroke_rehab',
    title: 'Chăm sóc người cao tuổi sau tai biến mạch máu não / đột quỵ / liệt nửa người',
    content:
      'Với người bệnh sau tai biến hoặc đột quỵ yếu liệt vận động, cần chuyên viên có kỹ năng phục hồi chức năng, vật lý trị liệu tại giường, xoay trở phòng ngừa loét tì đè 2 giờ/lần, tập nuốt an toàn tránh sặc khi ăn và theo dõi sát huyết áp, nhịp tim, SpO2 mỗi ca.',
  },
  {
    source_type: 'medical_guide',
    source_id: 'guide_dementia_alzheimer',
    title: 'Chăm sóc người cao tuổi sa sút trí tuệ, Alzheimer, lẫn nhớ',
    content:
      'Người cao tuổi bị Alzheimer hoặc suy giảm trí nhớ cần người chăm sóc kiên nhẫn, giao tiếp nhẹ nhàng, nhắc uống thuốc đúng cữ, duy trì nếp sinh hoạt cố định, phòng ngừa té ngã hoặc đi lạc, và ghi chép trạng thái giấc ngủ/tâm lý sau mỗi buổi.',
  },
  {
    source_type: 'medical_guide',
    source_id: 'guide_chronic_diabetes_hypertension',
    title: 'Theo dõi bệnh mạn tính: Tăng huyết áp, Tiểu đường, Tim mạch',
    content:
      'Chuyên viên hỗ trợ đo huyết áp, nhịp tim, đường huyết mao mạch định kỳ, chuẩn bị thực đơn ít muối ít đường theo chỉ định bác sĩ và cảnh báo sớm khi huyết áp >= 160/100 mmHg, SpO2 < 94% hoặc người bệnh mệt mỏi bất thường.',
  },
  {
    source_type: 'policy',
    source_id: 'guide_vip_careplus',
    title: 'Đặc quyền gói CareMatch Care+ VIP cho Gia đình',
    content:
      'Thành viên CareMatch Care+ VIP (~10.000đ/ngày) được ưu tiên ghép nối với chuyên viên top CARE SCORE 95đ+, ưu tiên giữ lịch vào ngày Lễ Tết hoặc giờ cao điểm, hỗ trợ CSKH trong 15 phút và giảm phí dịch vụ khi đặt lịch định kỳ.',
  },
];

export function formatPgVectorLiteral(values) {
  if (!Array.isArray(values) || values.length === 0) return null;
  return `[${values.map((v) => Number(v).toFixed(6)).join(',')}]`;
}

export async function generateEmbedding(text, { taskType = 'RETRIEVAL_DOCUMENT' } = {}) {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  const cleanText = String(text || '').trim();
  if (!apiKey || !cleanText) return null;

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/${EMBED_MODEL}:embedContent?key=${encodeURIComponent(apiKey)}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: EMBED_MODEL,
        content: { parts: [{ text: cleanText.slice(0, 4000) }] },
        taskType,
        outputDimensionality: EMBED_DIM,
      }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.warn(`⚠️ [Embedding] HTTP ${res.status}:`, errText.slice(0, 200));
      return null;
    }
    const data = await res.json();
    const values = data?.embedding?.values;
    return Array.isArray(values) && values.length === EMBED_DIM ? values : null;
  } catch (err) {
    console.warn('⚠️ [Embedding] Lỗi:', err.message);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function ensureVectorTable(pool, isDbConnected) {
  if (!pool || !isDbConnected) return false;
  try {
    await pool.execute('CREATE EXTENSION IF NOT EXISTS vector');
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS ai_knowledge_chunks (
        id SERIAL PRIMARY KEY,
        source_type VARCHAR(40) NOT NULL,
        source_id VARCHAR(80) NOT NULL,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        metadata JSONB DEFAULT '{}'::jsonb,
        embedding vector(768),
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (source_type, source_id)
      )
    `);
    await pool.execute('CREATE INDEX IF NOT EXISTS idx_ai_knowledge_source ON ai_knowledge_chunks (source_type)');
    await pool.execute('CREATE INDEX IF NOT EXISTS idx_ai_knowledge_embedding ON ai_knowledge_chunks USING hnsw (embedding vector_cosine_ops)');
    return true;
  } catch (err) {
    console.warn('⚠️ Không thể khởi tạo pgvector table:', err.message);
    return false;
  }
}

/**
 * Đồng bộ toàn bộ hồ sơ chuyên viên + cẩm nang CARE-MATCH thành vector 768d trên Supabase
 */
export async function syncCareMatchKnowledgeVectors(pool, isDbConnected, { forceReembed = false } = {}) {
  const ok = await ensureVectorTable(pool, isDbConnected);
  if (!ok) return { indexed: 0, error: 'Không khởi tạo được pgvector.' };

  const items = [];

  for (const g of CARE_MATCH_GUIDES) {
    items.push({
      source_type: g.source_type,
      source_id: g.source_id,
      title: g.title,
      content: `${g.title}. ${g.content}`,
      metadata: { category: g.source_type },
    });
  }

  const [cgRows] = await pool.execute(`
    SELECT u.id AS user_id, u.full_name, cp.title, cp.district, cp.experience_years,
           cp.hourly_rate, cp.shift_rate, cp.night_shift_rate, cp.care_score,
           cp.rating, cp.reviews_count, cp.skills, cp.bio, cp.verification_status
    FROM caregiver_profiles cp
    JOIN users u ON cp.user_id = u.id
    WHERE u.role = 'caregiver'
  `);

  for (const cg of cgRows) {
    let skillsText = '';
    try {
      const parsed = typeof cg.skills === 'string' ? JSON.parse(cg.skills) : cg.skills;
      skillsText = Array.isArray(parsed) ? parsed.join(', ') : '';
    } catch {
      skillsText = String(cg.skills || '');
    }

    const content = [
      `Chuyên viên chăm sóc: ${cg.full_name}`,
      cg.title ? `Chức danh: ${cg.title}` : '',
      cg.district ? `Khu vực hoạt động: ${cg.district}` : '',
      `Kinh nghiệm: ${cg.experience_years || 1} năm`,
      `CARE SCORE: ${cg.care_score || 90}, Đánh giá: ${cg.rating || 4.8} sao`,
      `Giá ca ngày: ${Number(cg.shift_rate || 400000).toLocaleString('vi-VN')}đ`,
      skillsText ? `Kỹ năng chuyên môn: ${skillsText}` : '',
      cg.bio ? `Mô tả kinh nghiệm: ${cg.bio}` : '',
    ]
      .filter(Boolean)
      .join('. ');

    items.push({
      source_type: 'caregiver',
      source_id: String(cg.user_id),
      title: `${cg.full_name} (${cg.district || 'Hà Nội'})`,
      content,
      metadata: {
        caregiver_user_id: Number(cg.user_id),
        name: cg.full_name,
        district: cg.district || 'Hà Nội',
        shift_rate: Number(cg.shift_rate || 400000),
        care_score: Number(cg.care_score || 90),
        rating: Number(cg.rating || 4.8),
        verified: cg.verification_status === 'approved',
      },
    });
  }

  // Đọc danh sách content_hash hiện có để KHÔNG gọi lại Gemini Embedding API nếu nội dung chưa thay đổi (Giai đoạn 3)
  const existingHashes = new Map();
  if (!forceReembed) {
    try {
      const [existingRows] = await pool.execute(
        "SELECT source_type, source_id, metadata->>'content_hash' AS content_hash, (embedding IS NOT NULL) AS has_vec FROM ai_knowledge_chunks"
      );
      for (const r of existingRows) {
        if (r.has_vec && r.content_hash) {
          existingHashes.set(`${r.source_type}::${r.source_id}`, String(r.content_hash));
        }
      }
    } catch { }
  }

  let indexed = 0;
  let skippedUnchanged = 0;
  for (const item of items) {
    const contentHash = computeContentHash(`${item.title} || ${item.content}`);
    const key = `${item.source_type}::${item.source_id}`;
    if (!forceReembed && existingHashes.get(key) === contentHash) {
      skippedUnchanged++;
      continue;
    }

    const vec = await generateEmbedding(item.content, { taskType: 'RETRIEVAL_DOCUMENT' });
    if (!vec) continue;
    const vecLiteral = formatPgVectorLiteral(vec);
    const metaWithHash = { ...(item.metadata || {}), content_hash: contentHash };
    await pool.execute(
      `INSERT INTO ai_knowledge_chunks (source_type, source_id, title, content, metadata, embedding, updated_at)
       VALUES (?, ?, ?, ?, ?::jsonb, ?::vector, CURRENT_TIMESTAMP)
       ON CONFLICT (source_type, source_id)
       DO UPDATE SET
         title = EXCLUDED.title,
         content = EXCLUDED.content,
         metadata = EXCLUDED.metadata,
         embedding = EXCLUDED.embedding,
         updated_at = CURRENT_TIMESTAMP`,
      [item.source_type, item.source_id, item.title, item.content, JSON.stringify(metaWithHash), vecLiteral]
    );
    indexed++;
  }

  return { totalCandidates: items.length, indexed, skippedUnchanged };
}

/**
 * Tìm kiếm ngữ nghĩa bằng pgvector cosine similarity
 */
export async function semanticSearchKnowledge(pool, isDbConnected, query, { sourceTypes = null, limit = 5, minSimilarity = 0.35 } = {}) {
  if (!pool || !isDbConnected || !String(query || '').trim()) return [];
  const qVec = await generateEmbedding(query, { taskType: 'RETRIEVAL_QUERY' });
  if (!qVec) return [];

  const vecLiteral = formatPgVectorLiteral(qVec);
  const safeLimit = Math.min(Math.max(Number(limit || 5), 1), 15);

  let sql = `
    SELECT source_type, source_id, title, content, metadata,
           (1 - (embedding <=> ?::vector))::float AS similarity
    FROM ai_knowledge_chunks
    WHERE embedding IS NOT NULL
  `;
  const params = [vecLiteral];

  if (Array.isArray(sourceTypes) && sourceTypes.length > 0) {
    const placeholders = sourceTypes.map(() => '?').join(',');
    sql += ` AND source_type IN (${placeholders})`;
    params.push(...sourceTypes);
  }

  sql += ` ORDER BY embedding <=> ?::vector ASC LIMIT ?`;
  params.push(vecLiteral, safeLimit);

  try {
    const [rows] = await pool.execute(sql, params);
    return rows.filter((r) => Number(r.similarity || 0) >= minSimilarity);
  } catch (err) {
    console.warn('⚠️ [pgvector search] Lỗi:', err.message);
    return [];
  }
}
