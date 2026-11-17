/**
 * BỘ CÔNG CỤ TRUY XUẤT DỮ LIỆU LIVE (FUNCTION CALLING + KNOWLEDGE BASE) CHO CAREMATCHAI
 * Cho phép chatbot tra cứu dữ liệu thật từ Supabase PostgreSQL theo đúng vai trò & quyền hạn người dùng.
 */

import { semanticSearchKnowledge } from './rag.js';

function parseJsonSafe(val, fallback) {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'object') return val;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

export const CAREMATCH_CHAT_TOOL_DECLARATIONS = [
  {
    name: 'search_caregivers',
    description:
      'Tìm kiếm và lọc danh sách chuyên viên chăm sóc người cao tuổi có thật trên hệ thống theo quận/khu vực, từ khóa kỹ năng/chức danh, hoặc mức giá ca tối đa.',
    parameters: {
      type: 'OBJECT',
      properties: {
        district: { type: 'STRING', description: 'Tên quận/huyện hoặc khu vực, ví dụ: Đống Đa, Ba Đình, Cầu Giấy, Hoàn Kiếm' },
        keyword: { type: 'STRING', description: 'Từ khóa kỹ năng hoặc chuyên môn, ví dụ: tai biến, alzheimer, phục hồi chức năng, đo huyết áp' },
        max_shift_rate: { type: 'NUMBER', description: 'Mức giá tối đa cho một ca ngày (VNĐ), ví dụ 500000' },
        verified_only: { type: 'BOOLEAN', description: 'Chỉ lọc chuyên viên đã duyệt eKYC (mặc định true)' },
      },
    },
  },
  {
    name: 'get_caregiver_detail',
    description: 'Xem chi tiết tiểu sử, kỹ năng, mức giá, CARE SCORE và đánh giá từ các gia đình của một chuyên viên cụ thể.',
    parameters: {
      type: 'OBJECT',
      properties: {
        name_or_id: { type: 'STRING', description: 'Tên hoặc ID của chuyên viên chăm sóc cần tra cứu' },
      },
      required: ['name_or_id'],
    },
  },
  {
    name: 'get_my_elderly_profiles',
    description: 'Truy xuất danh sách hồ sơ người cao tuổi thuộc quyền quản lý của tài khoản gia đình đang đăng nhập (hoặc toàn bộ nếu là Admin).',
    parameters: {
      type: 'OBJECT',
      properties: {
        patient_name: { type: 'STRING', description: 'Tên người cao tuổi muốn lọc (không bắt buộc)' },
      },
    },
  },
  {
    name: 'get_my_schedules',
    description: 'Truy xuất lịch đặt ca chăm sóc thật của người dùng đang đăng nhập (theo gia đình, theo chuyên viên hoặc toàn hệ thống đối với Admin).',
    parameters: {
      type: 'OBJECT',
      properties: {
        status: { type: 'STRING', description: 'Trạng thái ca cần lọc: pending, confirmed, in_progress, completed, cancelled' },
        limit: { type: 'NUMBER', description: 'Số lượng ca gần nhất cần lấy (mặc định 6, tối đa 15)' },
      },
    },
  },
  {
    name: 'get_patient_care_logs',
    description: 'Tra cứu nhật ký theo dõi sức khỏe & chỉ số sinh hiệu mới nhất (huyết áp, nhịp tim, đường huyết, nhiệt độ, SpO2, bữa ăn, thuốc) của người bệnh.',
    parameters: {
      type: 'OBJECT',
      properties: {
        patient_name: { type: 'STRING', description: 'Tên bệnh nhân / người cao tuổi cần xem nhật ký (không bắt buộc)' },
        limit: { type: 'NUMBER', description: 'Số nhật ký gần nhất cần lấy (mặc định 5, tối đa 10)' },
      },
    },
  },
  {
    name: 'get_my_payments',
    description: 'Tra cứu lịch sử giao dịch thanh toán, thu nhập ca làm và trạng thái thanh toán của tài khoản hiện tại.',
    parameters: {
      type: 'OBJECT',
      properties: {
        limit: { type: 'NUMBER', description: 'Số giao dịch gần nhất (mặc định 6, tối đa 15)' },
      },
    },
  },
  {
    name: 'get_platform_info',
    description: 'Lấy thông tin cấu hình chính sách của CARE-MATCH (hotline, phí nền tảng, gói VIP, thống kê chuyên viên, tổng quan vận hành nếu là Admin).',
    parameters: {
      type: 'OBJECT',
      properties: {},
    },
  },
  {
    name: 'search_knowledge_base',
    description:
      'Tìm kiếm ngữ nghĩa (Vector Semantic RAG) trong cẩm nang chăm sóc người cao tuổi (tai biến, đột quỵ, Alzheimer, tiểu đường, huyết áp) và quy trình/chính sách của CARE-MATCH.',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: { type: 'STRING', description: 'Câu hỏi hoặc chủ đề cần tìm trong cẩm nang chăm sóc & chính sách' },
      },
      required: ['query'],
    },
  },
];

export async function executeCareMatchTool(toolName, args = {}, context = {}, { pool, isDbConnected }) {
  if (!isDbConnected || !pool) {
    return { error: 'Cơ sở dữ liệu hiện chưa sẵn sàng để tra cứu trực tiếp.' };
  }

  const userRole = context.userRole || 'guest';
  const userId = Number(context.userId || 0);

  try {
    if (toolName === 'search_caregivers') {
      const district = String(args?.district || '').trim();
      const keyword = String(args?.keyword || '').trim();
      const maxRate = Number(args?.max_shift_rate || 0);
      const verifiedOnly = args?.verified_only !== false;

      let sql = `
        SELECT u.id AS caregiver_user_id, u.full_name, cp.title, cp.district, cp.experience_years,
               cp.hourly_rate, cp.shift_rate, cp.night_shift_rate, cp.care_score, cp.rating,
               cp.reviews_count, cp.skills, cp.bio, cp.verification_status
        FROM caregiver_profiles cp
        JOIN users u ON cp.user_id = u.id
        WHERE u.role = 'caregiver'
      `;
      const params = [];

      if (verifiedOnly) {
        sql += ` AND cp.verification_status = 'approved'`;
      }
      if (district) {
        sql += ` AND LOWER(COALESCE(cp.district, '')) LIKE ?`;
        params.push(`%${district.toLowerCase()}%`);
      }
      if (maxRate > 0) {
        sql += ` AND COALESCE(cp.shift_rate, 400000) <= ?`;
        params.push(maxRate);
      }
      if (keyword) {
        const kw = `%${keyword.toLowerCase()}%`;
        sql += ` AND (LOWER(COALESCE(cp.title, '')) LIKE ? OR LOWER(COALESCE(cp.bio, '')) LIKE ? OR LOWER(COALESCE(cp.skills::text, '')) LIKE ? OR LOWER(COALESCE(u.full_name, '')) LIKE ?)`;
        params.push(kw, kw, kw, kw);
      }

      sql += ` ORDER BY COALESCE(cp.care_score, 0) DESC, COALESCE(cp.rating, 0) DESC LIMIT 8`;
      const [rows] = await pool.execute(sql, params);

      // Hybrid Semantic RAG: nếu tìm theo từ khóa bệnh lý/kỹ năng (hoặc SQL LIKE ít kết quả), tìm thêm bằng pgvector cosine similarity
      let mergedRows = [...rows];
      const semanticHits =
        keyword || rows.length === 0
          ? await semanticSearchKnowledge(pool, isDbConnected, `${district} ${keyword}`.trim(), {
              sourceTypes: ['caregiver'],
              limit: 6,
              minSimilarity: 0.42,
            })
          : [];

      const simMap = new Map();
      for (const hit of semanticHits) {
        const cid = Number(hit.metadata?.caregiver_user_id || hit.source_id);
        if (cid) simMap.set(cid, Number(Number(hit.similarity || 0).toFixed(3)));
      }

      if (semanticHits.length > 0 && rows.length < 5) {
        const missingIds = [...simMap.keys()].filter((cid) => !mergedRows.some((r) => Number(r.caregiver_user_id) === cid));
        if (missingIds.length > 0) {
          const placeholders = missingIds.map(() => '?').join(',');
          let extraSql = `
            SELECT u.id AS caregiver_user_id, u.full_name, cp.title, cp.district, cp.experience_years,
                   cp.hourly_rate, cp.shift_rate, cp.night_shift_rate, cp.care_score, cp.rating,
                   cp.reviews_count, cp.skills, cp.bio, cp.verification_status
            FROM caregiver_profiles cp
            JOIN users u ON cp.user_id = u.id
            WHERE u.id IN (${placeholders})
          `;
          const extraParams = [...missingIds];
          if (verifiedOnly) extraSql += ` AND cp.verification_status = 'approved'`;
          if (district) {
            extraSql += ` AND LOWER(COALESCE(cp.district, '')) LIKE ?`;
            extraParams.push(`%${district.toLowerCase()}%`);
          }
          if (maxRate > 0) {
            extraSql += ` AND COALESCE(cp.shift_rate, 400000) <= ?`;
            extraParams.push(maxRate);
          }
          const [extraRows] = await pool.execute(extraSql, extraParams);
          mergedRows = [...mergedRows, ...extraRows];
        }
      }

      mergedRows.sort((a, b) => {
        const sa = simMap.get(Number(a.caregiver_user_id)) || 0;
        const sb = simMap.get(Number(b.caregiver_user_id)) || 0;
        if (sb !== sa) return sb - sa;
        return Number(b.care_score || 0) - Number(a.care_score || 0);
      });

      return {
        search_mode: semanticHits.length > 0 ? 'hybrid_pgvector_sql' : 'sql_filter',
        total_found: mergedRows.length,
        caregivers: mergedRows.slice(0, 8).map((r) => ({
          id: r.caregiver_user_id,
          name: r.full_name,
          title: r.title,
          district: r.district || 'Hà Nội',
          experience_years: Number(r.experience_years || 1),
          hourly_rate: Number(r.hourly_rate || 100000),
          shift_rate: Number(r.shift_rate || 400000),
          night_shift_rate: Number(r.night_shift_rate || 600000),
          care_score: Number(r.care_score || 90),
          rating: Number(r.rating || 4.8),
          reviews_count: Number(r.reviews_count || 0),
          skills: parseJsonSafe(r.skills, []),
          verified: r.verification_status === 'approved',
          semantic_similarity: simMap.get(Number(r.caregiver_user_id)) || null,
        })),
      };
    }

    if (toolName === 'get_caregiver_detail') {
      const q = String(args?.name_or_id || '').trim();
      const isNum = /^\d+$/.test(q);
      const [rows] = await pool.execute(
        isNum
          ? `SELECT u.id AS caregiver_user_id, u.full_name, cp.title, cp.district, cp.experience_years,
                    cp.hourly_rate, cp.shift_rate, cp.night_shift_rate, cp.care_score, cp.rating,
                    cp.reviews_count, cp.skills, cp.bio, cp.verification_status
             FROM caregiver_profiles cp
             JOIN users u ON cp.user_id = u.id
             WHERE u.id = ? OR cp.id = ? LIMIT 1`
          : `SELECT u.id AS caregiver_user_id, u.full_name, cp.title, cp.district, cp.experience_years,
                    cp.hourly_rate, cp.shift_rate, cp.night_shift_rate, cp.care_score, cp.rating,
                    cp.reviews_count, cp.skills, cp.bio, cp.verification_status
             FROM caregiver_profiles cp
             JOIN users u ON cp.user_id = u.id
             WHERE u.role = 'caregiver' AND LOWER(u.full_name) LIKE ?
             ORDER BY COALESCE(cp.care_score, 0) DESC LIMIT 1`,
        isNum ? [Number(q), Number(q)] : [`%${q.toLowerCase()}%`]
      );

      if (!rows.length) {
        return { found: false, message: `Không tìm thấy chuyên viên khớp với "${q}".` };
      }

      const cg = rows[0];
      const [reviews] = await pool.execute(
        `SELECT family_name, patient_name, service_title, rating, review_text, created_at
         FROM caregiver_reviews
         WHERE caregiver_user_id = ? AND COALESCE(status, 'approved') != 'hidden'
         ORDER BY created_at DESC LIMIT 5`,
        [cg.caregiver_user_id]
      );

      return {
        found: true,
        caregiver: {
          id: cg.caregiver_user_id,
          name: cg.full_name,
          title: cg.title,
          district: cg.district,
          experience_years: Number(cg.experience_years || 1),
          hourly_rate: Number(cg.hourly_rate || 100000),
          shift_rate: Number(cg.shift_rate || 400000),
          night_shift_rate: Number(cg.night_shift_rate || 600000),
          care_score: Number(cg.care_score || 90),
          rating: Number(cg.rating || 4.8),
          reviews_count: Number(cg.reviews_count || 0),
          skills: parseJsonSafe(cg.skills, []),
          bio: cg.bio || '',
          verified: cg.verification_status === 'approved',
        },
        recent_reviews: reviews,
      };
    }

    if (toolName === 'get_my_elderly_profiles') {
      if (userRole === 'guest' || !userId) {
        return { requires_login: true, message: 'Người dùng cần đăng nhập tài khoản Gia đình hoặc Quản trị viên để xem hồ sơ người cao tuổi.' };
      }
      if (userRole === 'caregiver') {
        const [rows] = await pool.execute(
          `SELECT DISTINCT ep.id, ep.full_name, ep.date_of_birth, ep.gender, ep.district, ep.care_needs, ep.adl_score
           FROM schedules s
           JOIN elderly_profiles ep ON s.elderly_profile_id = ep.id
           WHERE s.caregiver_user_id = ? LIMIT 10`,
          [userId]
        );
        return { profiles: rows };
      }

      const patientName = String(args?.patient_name || '').trim();
      let sql = `SELECT id, full_name, date_of_birth, gender, district, care_needs, notes, verification_status, adl_score FROM elderly_profiles WHERE 1=1`;
      const params = [];
      if (userRole !== 'admin') {
        sql += ` AND user_id = ?`;
        params.push(userId);
      }
      if (patientName) {
        sql += ` AND LOWER(full_name) LIKE ?`;
        params.push(`%${patientName.toLowerCase()}%`);
      }
      sql += ` ORDER BY created_at DESC LIMIT 10`;
      const [rows] = await pool.execute(sql, params);
      return { profiles: rows };
    }

    if (toolName === 'get_my_schedules') {
      if (userRole === 'guest' || !userId) {
        return { requires_login: true, message: 'Người dùng cần đăng nhập để tra cứu lịch chăm sóc cá nhân.' };
      }
      const status = String(args?.status || '').trim();
      const limit = Math.min(Math.max(Number(args?.limit || 6), 1), 15);

      let sql = `SELECT id, elderly_name, caregiver_name, schedule_date, time_slot, title, status, price, is_rated, rating FROM schedules WHERE 1=1`;
      const params = [];

      if (userRole === 'family') {
        sql += ` AND family_user_id = ?`;
        params.push(userId);
      } else if (userRole === 'caregiver') {
        sql += ` AND caregiver_user_id = ?`;
        params.push(userId);
      }
      if (status) {
        sql += ` AND status = ?`;
        params.push(status);
      }
      sql += ` ORDER BY schedule_date DESC, id DESC LIMIT ${limit}`;

      const [rows] = await pool.execute(sql, params);
      return { count: rows.length, schedules: rows };
    }

    if (toolName === 'get_patient_care_logs') {
      if (userRole === 'guest' || !userId) {
        return { requires_login: true, message: 'Người dùng cần đăng nhập để xem nhật ký sinh hiệu bệnh nhân.' };
      }
      const patientName = String(args?.patient_name || '').trim();
      const limit = Math.min(Math.max(Number(args?.limit || 5), 1), 10);

      let sql = `
        SELECT id, elderly_name, caregiver_name, log_date, time_slot,
               blood_pressure_systolic, blood_pressure_diastolic, heart_rate,
               blood_sugar, temperature, spo2, meal_status, medication_status,
               sleep_mood, overall_condition, caregiver_notes
        FROM patient_care_logs
        WHERE 1=1
      `;
      const params = [];

      if (userRole === 'family') {
        sql += ` AND family_user_id = ?`;
        params.push(userId);
      } else if (userRole === 'caregiver') {
        sql += ` AND caregiver_user_id = ?`;
        params.push(userId);
      }
      if (patientName) {
        sql += ` AND LOWER(COALESCE(elderly_name, '')) LIKE ?`;
        params.push(`%${patientName.toLowerCase()}%`);
      }
      sql += ` ORDER BY log_date DESC, id DESC LIMIT ${limit}`;

      const [rows] = await pool.execute(sql, params);
      return { count: rows.length, logs: rows };
    }

    if (toolName === 'get_my_payments') {
      if (userRole === 'guest' || !userId) {
        return { requires_login: true, message: 'Người dùng cần đăng nhập để tra cứu lịch sử thanh toán.' };
      }
      const limit = Math.min(Math.max(Number(args?.limit || 6), 1), 15);
      let sql = `
        SELECT transaction_code, service_name, total_amount, platform_fee, payout_amount,
               family_payment_status, caregiver_payout_status, payment_method, created_at
        FROM transactions
        WHERE 1=1
      `;
      const params = [];
      if (userRole === 'family') {
        sql += ` AND family_user_id = ?`;
        params.push(userId);
      } else if (userRole === 'caregiver') {
        sql += ` AND caregiver_user_id = ?`;
        params.push(userId);
      }
      sql += ` ORDER BY created_at DESC LIMIT ${limit}`;
      const [rows] = await pool.execute(sql, params);
      return { count: rows.length, transactions: rows };
    }

    if (toolName === 'get_platform_info') {
      const [settingRows] = await pool.execute(
        "SELECT setting_key, setting_value, description FROM system_settings WHERE setting_key != 'carematchai_custom_rules' LIMIT 25"
      );
      const settings = {};
      for (const s of settingRows) {
        settings[s.setting_key] = s.setting_value;
      }

      const [cgStats] = await pool.execute(
        "SELECT COUNT(*)::int AS total_caregivers, COUNT(*) FILTER (WHERE verification_status = 'approved')::int AS approved_caregivers FROM caregiver_profiles"
      );

      const result = {
        settings,
        caregiver_stats: cgStats[0] || {},
      };

      if (userRole === 'admin') {
        const [pendingCg] = await pool.execute(
          "SELECT COUNT(*)::int AS cnt FROM caregiver_profiles WHERE verification_status = 'pending'"
        );
        const [pendingElderly] = await pool.execute(
          "SELECT COUNT(*)::int AS cnt FROM elderly_profiles WHERE verification_status = 'pending'"
        );
        const [schedStats] = await pool.execute(
          'SELECT COUNT(*)::int AS total_schedules FROM schedules'
        );
        const [revStats] = await pool.execute(
          "SELECT COALESCE(SUM(total_amount), 0)::bigint AS total_revenue, COALESCE(SUM(platform_fee), 0)::bigint AS total_platform_fee FROM transactions WHERE family_payment_status = 'paid'"
        );
        result.admin_overview = {
          pending_caregiver_ekyc: pendingCg[0]?.cnt || 0,
          pending_elderly_ekyc: pendingElderly[0]?.cnt || 0,
          total_schedules: schedStats[0]?.total_schedules || 0,
          paid_revenue_vnd: Number(revStats[0]?.total_revenue || 0),
          platform_fee_vnd: Number(revStats[0]?.total_platform_fee || 0),
        };
      }

      return result;
    }

    if (toolName === 'search_knowledge_base') {
      const q = String(args?.query || '').trim();
      const hits = await semanticSearchKnowledge(pool, isDbConnected, q, {
        sourceTypes: ['policy', 'medical_guide'],
        limit: 4,
        minSimilarity: 0.38,
      });
      return {
        search_mode: 'pgvector_cosine_rag',
        matches: hits.map((h) => ({
          title: h.title,
          category: h.source_type,
          similarity: Number(Number(h.similarity || 0).toFixed(3)),
          content: h.content,
        })),
      };
    }

    return { error: `Không hỗ trợ công cụ ${toolName}` };
  } catch (err) {
    console.warn(`⚠️ [CareMatchAI Tool ${toolName}]`, err.message);
    return { error: 'Không thể truy xuất mục dữ liệu này lúc này.' };
  }
}

/**
 * Nạp kiến thức tùy chỉnh do Admin cấu hình + các mẫu Hỏi-Đáp đã chuẩn hóa từ ai_training_logs
 * để làm Grounding & Few-shot Prompting tức thì cho CareMatchAI.
 */
export async function loadAiGroundingKnowledge(pool, isDbConnected) {
  if (!isDbConnected || !pool) return { customRules: '', faqExamples: [] };
  try {
    const [ruleRows] = await pool.execute(
      "SELECT setting_value FROM system_settings WHERE setting_key = 'carematchai_custom_rules' LIMIT 1"
    );
    const customRules = String(ruleRows[0]?.setting_value || '').trim();

    const [faqRows] = await pool.execute(
      `SELECT user_input, edited_output, model_output
       FROM ai_training_logs
       WHERE is_approved = TRUE
         AND (task_type = 'chatbot_faq' OR edited_output IS NOT NULL)
       ORDER BY id DESC
       LIMIT 6`
    );

    const faqExamples = faqRows
      .map((r) => {
        let q = r.user_input;
        try {
          const parsedIn = JSON.parse(r.user_input);
          if (parsedIn?.message) q = parsedIn.message;
        } catch { }

        let a = r.edited_output || r.model_output;
        try {
          const parsedOut = JSON.parse(a);
          if (parsedOut?.reply) a = parsedOut.reply;
        } catch { }

        return { question: String(q || '').trim(), answer: String(a || '').trim() };
      })
      .filter((x) => x.question && x.answer);

    return { customRules, faqExamples };
  } catch (err) {
    console.warn('⚠️ Không thể đọc knowledge base CareMatchAI:', err.message);
    return { customRules: '', faqExamples: [] };
  }
}
