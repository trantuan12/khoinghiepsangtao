import React, { useEffect, useState } from 'react';
import { Check, Download, Plus, RefreshCw, Sparkles } from 'lucide-react';
import { API } from '@/lib/apiConfig';

interface FaqSample {
  id: number;
  task_type: string;
  user_input: string;
  model_output: string;
  edited_output?: string | null;
  created_at?: string;
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
  const [loading, setLoading] = useState(false);
  const [savingRules, setSavingRules] = useState(false);

  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');
  const [addingFaq, setAddingFaq] = useState(false);

  const loadKnowledge = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/ai/knowledge`);
      if (res.ok) {
        const data = await res.json();
        setCustomRules(data.customRules || '');
        setFaqSamples(Array.isArray(data.faqSamples) ? data.faqSamples : []);
        setTotalLogs(Number(data.totalTrainingLogs || 0));
      }
    } catch { }
    setLoading(false);
  };

  useEffect(() => {
    loadKnowledge();
  }, []);

  const handleSaveRules = async () => {
    setSavingRules(true);
    try {
      const res = await fetch(`${API}/ai/knowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  const handleAddFaq = async () => {
    if (!newQuestion.trim() || !newAnswer.trim()) {
      notify('Vui lòng nhập đầy đủ câu hỏi và câu trả lời chuẩn.');
      return;
    }
    setAddingFaq(true);
    try {
      const res = await fetch(`${API}/ai/training-logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: newQuestion.trim(), answer: newAnswer.trim() }),
      });
      if (res.ok) {
        setNewQuestion('');
        setNewAnswer('');
        notify('Đã thêm mẫu Hỏi–Đáp chuẩn! CareMatchAI sẽ áp dụng ngay và đưa vào tập dữ liệu huấn luyện.');
        loadKnowledge();
      } else {
        notify('Không thể thêm mẫu Hỏi–Đáp.');
      }
    } catch {
      notify('Lỗi kết nối máy chủ.');
    } finally {
      setAddingFaq(false);
    }
  };

  return (
    <div className="rounded-2xl bg-gradient-to-br from-[#f2f7f0] via-white to-[#faf7ef] border border-[#c8dcc2] p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Sparkles size={16} className="text-emerald-700" />
            <h4 className="font-display font-bold text-[15px] text-gray-900">
              Trung Tâm Tri Thức & Huấn Luyện CareMatchAI
            </h4>
            <span className="rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 text-[10.5px] font-bold">
              {totalLogs} mẫu log đã lưu
            </span>
          </div>
          <p className="text-[12px] text-gray-600">
            CareMatchAI tự động tra cứu trực tiếp dữ liệu thật trên Supabase (chuyên viên, lịch ca, sinh hiệu, giao dịch) và học theo các quy tắc / mẫu Hỏi–Đáp chuẩn do bạn cấu hình tại đây ngay lập tức.
          </p>
        </div>

        <a
          href={`${API}/ai/export-finetune-jsonl`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#294927] hover:bg-[#1f391e] text-white px-4 py-2.5 text-[12px] font-bold transition shrink-0 shadow-xs"
        >
          <Download size={14} /> Tải Dataset (.JSONL)
        </a>
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
          <div className="pt-1 space-y-1.5 max-h-40 overflow-y-auto">
            {faqSamples.slice(0, 6).map((s) => (
              <div key={s.id} className="rounded-lg bg-[#f7faf6] border border-[#e3ede0] px-3 py-2 text-[11.5px]">
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
