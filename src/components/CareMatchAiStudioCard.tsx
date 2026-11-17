import React, { useEffect, useState } from 'react';
import { Activity, Check, Database, Download, Plus, RefreshCw, ShieldAlert, Sparkles, Trash2, Zap } from 'lucide-react';
import { API, getAuthHeaders } from '@/lib/apiConfig';

interface FaqSample {
  id: number;
  task_type: string;
  user_input: string;
  model_output: string;
  edited_output?: string | null;
  is_approved?: boolean;
  created_at?: string;
}

interface AiMetricsSummary {
  totalRequests: number;
  avgLatencyMs: number;
  totalTokens: number;
  totalCostUsd: number;
  cacheHits: number;
  guardrailBlocks: number;
  vectorChunksCount: number;
}

function parsePreviewText(raw: string, key: 'message' | 'reply'): string {
  if (!raw) return '';
  try {
    const obj = JSON.parse(raw);
    if (obj && typeof obj === 'object' && obj[key]) return String(obj[key]);
  } catch { }
  return raw;
}

export function CareMatchAiStudioCard({ notify }: { notify: (msg: string) => void }) {
  const [customRules, setCustomRules] = useState('');
  const [faqSamples, setFaqSamples] = useState<FaqSample[]>([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [metrics, setMetrics] = useState<AiMetricsSummary>({
    totalRequests: 0,
    avgLatencyMs: 0,
    totalTokens: 0,
    totalCostUsd: 0,
    cacheHits: 0,
    guardrailBlocks: 0,
    vectorChunksCount: 0,
  });

  const [loading, setLoading] = useState(false);
  const [savingRules, setSavingRules] = useState(false);
  const [reindexing, setReindexing] = useState(false);

  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');
  const [addingFaq, setAddingFaq] = useState(false);

  const loadKnowledgeAndMetrics = async () => {
    setLoading(true);
    try {
      const [kRes, mRes] = await Promise.all([
        fetch(`${API}/ai/knowledge`, { headers: getAuthHeaders() }),
        fetch(`${API}/ai/metrics`, { headers: getAuthHeaders() }),
      ]);
      if (kRes.ok) {
        const data = await kRes.json();
        setCustomRules(data.customRules || '');
        setFaqSamples(Array.isArray(data.faqSamples) ? data.faqSamples : []);
        setTotalLogs(Number(data.totalTrainingLogs || 0));
      }
      if (mRes.ok) {
        const m = await mRes.json();
        setMetrics({
          totalRequests: Number(m.totalRequests || 0),
          avgLatencyMs: Number(m.avgLatencyMs || 0),
          totalTokens: Number(m.totalTokens || 0),
          totalCostUsd: Number(m.totalCostUsd || 0),
          cacheHits: Number(m.cacheHits || 0),
          guardrailBlocks: Number(m.guardrailBlocks || 0),
          vectorChunksCount: Number(m.vectorChunksCount || 0),
        });
      }
    } catch { }
    setLoading(false);
  };

  useEffect(() => {
    loadKnowledgeAndMetrics();
  }, []);

  const handleSaveRules = async () => {
    setSavingRules(true);
    try {
      const res = await fetch(`${API}/ai/knowledge`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ customRules }),
      });
      if (res.ok) {
        notify('Đã cập nhật tri thức & quy tắc trả lời cho CareMatchAI (áp dụng ngay tức thì)!');
      } else {
        notify('Không thể lưu quy tắc CareMatchAI.');
      }
    } catch {
      notify('Lỗi kết nối khi lưu tri thức CareMatchAI.');
    } finally {
      setSavingRules(false);
    }
  };

  const handleReindexVector = async () => {
    setReindexing(true);
    try {
      const res = await fetch(`${API}/ai/rag/reindex`, { method: 'POST', headers: getAuthHeaders() });
      const data = await res.json();
      if (res.ok) {
        notify(`Đã đồng bộ ${data.indexed || 0} vector kiến thức & hồ sơ chuyên viên cho CareMatchAI!`);
        loadKnowledgeAndMetrics();
      } else {
        notify(data.error || 'Không thể đồng bộ Vector RAG lúc này.');
      }
    } catch {
      notify('Lỗi kết nối khi đồng bộ Vector RAG.');
    } finally {
      setReindexing(false);
    }
  };

  const handleAddFaq = async () => {
    if (!newQuestion.trim() || !newAnswer.trim()) {
      notify('Vui lòng nhập đầy đủ câu hỏi và câu trả lời chuẩn.');
      return;
    }
    setAddingFaq(true);
    try {
      const res = await fetch(`${API}/ai/training-logs`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ question: newQuestion.trim(), answer: newAnswer.trim() }),
      });
      if (res.ok) {
        setNewQuestion('');
        setNewAnswer('');
        notify('Đã thêm mẫu Hỏi–Đáp chuẩn! CareMatchAI sẽ áp dụng ngay và đưa vào tập dữ liệu huấn luyện.');
        loadKnowledgeAndMetrics();
      } else {
        notify('Không thể thêm mẫu Hỏi–Đáp.');
      }
    } catch {
      notify('Lỗi kết nối máy chủ.');
    } finally {
      setAddingFaq(false);
    }
  };

  const handleToggleApprove = async (sampleId: number, currentApproved: boolean) => {
    try {
      const res = await fetch(`${API}/ai/training-logs/${sampleId}`, {
        method: 'PATCH',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ is_approved: !currentApproved }),
      });
      if (res.ok) {
        notify(!currentApproved ? 'Đã duyệt mẫu vào tập dữ liệu huấn luyện!' : 'Đã bỏ duyệt mẫu khỏi tập dữ liệu.');
        loadKnowledgeAndMetrics();
      } else {
        notify('Không thể cập nhật trạng thái duyệt mẫu.');
      }
    } catch {
      notify('Lỗi kết nối máy chủ.');
    }
  };

  const handleDeleteSample = async (sampleId: number) => {
    try {
      const res = await fetch(`${API}/ai/training-logs/${sampleId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        notify('Đã xóa vĩnh viễn mẫu khỏi kho huấn luyện.');
        loadKnowledgeAndMetrics();
      } else {
        notify('Không thể xóa mẫu huấn luyện.');
      }
    } catch {
      notify('Lỗi kết nối máy chủ.');
    }
  };

  const handleDownloadDataset = async () => {
    try {
      const res = await fetch(`${API}/ai/export-finetune-jsonl`, { headers: getAuthHeaders() });
      if (!res.ok) {
        notify('Bạn cần đăng nhập quyền Quản trị viên để tải dataset.');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'carematchai_finetune_dataset.jsonl';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      notify('Lỗi tải xuống dataset.');
    }
  };

  return (
    <div className="rounded-2xl bg-gradient-to-br from-[#f2f7f0] via-white to-[#faf7ef] border border-[#c8dcc2] p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Sparkles size={16} className="text-emerald-700" />
            <h4 className="font-display font-bold text-[15px] text-gray-900">
              Trung Tâm Tri Thức, Vector RAG & Giám Sát CareMatchAI
            </h4>
            <span className="rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 text-[10.5px] font-bold">
              {totalLogs} mẫu log
            </span>
          </div>
          <p className="text-[12px] text-gray-600">
            CareMatchAI kết hợp tìm kiếm ngữ nghĩa Vector trên Supabase, tra cứu dữ liệu thật theo phân quyền, Guardrail bảo vệ dữ liệu y tế và ghi nhận hiệu năng theo thời gian thực.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            type="button"
            onClick={handleReindexVector}
            disabled={reindexing}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#294927] bg-white hover:bg-[#edf5eb] text-[#294927] px-3.5 py-2 text-[12px] font-bold transition cursor-pointer disabled:opacity-50"
          >
            <Database size={14} className={reindexing ? 'animate-pulse' : ''} />
            {reindexing ? 'Đang đồng bộ Vector...' : 'Đồng bộ Kho Vector'}
          </button>
          <button
            type="button"
            onClick={handleDownloadDataset}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#294927] hover:bg-[#1f391e] text-white px-4 py-2 text-[12px] font-bold transition shadow-xs cursor-pointer"
          >
            <Download size={14} /> Tải Dataset (.JSONL)
          </button>
        </div>
      </div>

      {/* Dải KPI Observability */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="rounded-xl bg-white border border-[#dce8d8] p-3">
          <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase text-gray-500">
            <Activity size={12} className="text-emerald-700" /> Truy vấn & Độ trễ TB
          </div>
          <div className="mt-1 text-[16px] font-bold text-[#223922]">
            {metrics.totalRequests} lượt <span className="text-[11.5px] font-medium text-gray-500">· {metrics.avgLatencyMs}ms</span>
          </div>
        </div>
        <div className="rounded-xl bg-white border border-[#dce8d8] p-3">
          <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase text-gray-500">
            <Zap size={12} className="text-amber-600" /> Token & Chi phí
          </div>
          <div className="mt-1 text-[16px] font-bold text-[#223922]">
            {metrics.totalTokens.toLocaleString('vi-VN')} <span className="text-[11px] font-medium text-gray-500">(${metrics.totalCostUsd.toFixed(4)})</span>
          </div>
        </div>
        <div className="rounded-xl bg-white border border-[#dce8d8] p-3">
          <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase text-gray-500">
            <Database size={12} className="text-emerald-700" /> Vector Chunks & Cache
          </div>
          <div className="mt-1 text-[16px] font-bold text-[#223922]">
            {metrics.vectorChunksCount} vector <span className="text-[11.5px] font-medium text-gray-500">· {metrics.cacheHits} cache</span>
          </div>
        </div>
        <div className="rounded-xl bg-white border border-[#dce8d8] p-3">
          <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase text-gray-500">
            <ShieldAlert size={12} className="text-rose-600" /> Guardrail Chặn An Toàn
          </div>
          <div className="mt-1 text-[16px] font-bold text-[#223922]">
            {metrics.guardrailBlocks} <span className="text-[11.5px] font-medium text-gray-500">lượt chặn rủi ro</span>
          </div>
        </div>
      </div>

      {/* 1. Kiến thức & quy tắc nghiệp vụ riêng áp dụng tức thì */}
      <div className="rounded-xl bg-white border border-[#dce8d8] p-3.5 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <label className="text-[12px] font-bold text-[#244123]">
            1. Quy tắc, chính sách & kiến thức riêng nạp trực tiếp cho CareMatchAI
          </label>
          <button
            type="button"
            onClick={handleSaveRules}
            disabled={savingRules}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1.5 text-[11.5px] font-bold transition cursor-pointer disabled:opacity-50"
          >
            {savingRules ? <RefreshCw size={12} className="animate-spin" /> : <Check size={12} />}
            {savingRules ? 'Đang lưu...' : 'Lưu tri thức'}
          </button>
        </div>
        <textarea
          rows={3}
          value={customRules}
          onChange={(e) => setCustomRules(e.target.value)}
          placeholder="Ví dụ: Hotline hỗ trợ khẩn cấp 1900-xxxx; Giảm 10% cho gia đình đặt gói tuần từ 5 ca trở lên; Khi khách hỏi khu vực chưa có chuyên viên thì hướng dẫn để lại SĐT..."
          className="w-full rounded-xl border border-gray-200 bg-[#fafcf9] p-2.5 text-[12px] text-gray-800 outline-none focus:border-emerald-600 focus:bg-white transition"
        />
      </div>

      {/* 2. Thêm nhanh cặp Hỏi-Đáp chuẩn mực */}
      <div className="rounded-xl bg-white border border-[#dce8d8] p-3.5 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[12px] font-bold text-[#244123]">
            2. Bổ sung cặp Hỏi–Đáp chuẩn (Áp dụng ngay + lưu vào tập huấn luyện .JSONL)
          </span>
          {loading && <RefreshCw size={13} className="animate-spin text-gray-400" />}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          <input
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            placeholder="Câu hỏi mẫu của khách / chuyên viên..."
            className="rounded-xl border border-gray-200 bg-[#fafcf9] px-3 py-2 text-[12px] outline-none focus:border-emerald-600 focus:bg-white"
          />
          <div className="flex gap-2">
            <input
              value={newAnswer}
              onChange={(e) => setNewAnswer(e.target.value)}
              placeholder="Câu trả lời chuẩn CareMatchAI cần học theo..."
              className="flex-1 min-w-0 rounded-xl border border-gray-200 bg-[#fafcf9] px-3 py-2 text-[12px] outline-none focus:border-emerald-600 focus:bg-white"
            />
            <button
              type="button"
              onClick={handleAddFaq}
              disabled={addingFaq}
              className="inline-flex items-center gap-1 rounded-xl bg-[#2f522d] hover:bg-[#234022] text-white px-3.5 py-2 text-[12px] font-bold transition cursor-pointer disabled:opacity-50 shrink-0"
            >
              <Plus size={14} /> Thêm mẫu
            </button>
          </div>
        </div>

        {faqSamples.length > 0 && (
          <div className="pt-1 space-y-1.5 max-h-48 overflow-y-auto">
            {faqSamples.slice(0, 8).map((s) => (
              <div key={s.id} className="rounded-lg bg-[#f7faf6] border border-[#e3ede0] px-3 py-2 text-[11.5px] flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-[#233d22] truncate">
                    <span className="text-[10px] uppercase tracking-wider text-emerald-700 mr-1.5">
                      [{s.task_type === 'chatbot_faq' ? 'Mẫu chuẩn' : 'Hội thoại'}]
                    </span>
                    Hỏi: {parsePreviewText(s.user_input, 'message')}
                  </div>
                  <div className="text-gray-600 truncate mt-0.5">
                    Đáp: {parsePreviewText(s.edited_output || s.model_output, 'reply')}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggleApprove(s.id, Boolean(s.is_approved))}
                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold border transition cursor-pointer ${
                      s.is_approved
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200'
                        : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200'
                    }`}
                  >
                    {s.is_approved ? '✓ Đã duyệt' : 'Chờ duyệt'}
                  </button>
                  <button
                    type="button"
                    title="Xóa mẫu nhạy cảm hoặc không phù hợp"
                    onClick={() => handleDeleteSample(s.id)}
                    className="rounded-full p-1 text-gray-400 hover:text-rose-700 hover:bg-rose-50 transition cursor-pointer"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
