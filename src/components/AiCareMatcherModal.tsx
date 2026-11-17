import React, { useState } from 'react';
import { Sparkles, X, Send, Star, MapPin, ChevronRight, MessageCircle, Loader2, ShieldCheck } from 'lucide-react';
import { API } from '@/lib/apiConfig';

interface AiRecommendation {
  caregiver_id: string;
  name: string;
  match_score: number;
  shift_rate?: number;
  district?: string;
  reasons?: string[];
}

interface AiCareMatcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onViewCaregiver: (id: string) => void;
  onMessageCaregiver: (id: string, name: string) => void;
  notify: (msg: string) => void;
}

const QUICK_PROMPTS = [
  'Bố tôi mới tai biến nhẹ ở Đống Đa, cần người biết phục hồi chức năng ca sáng',
  'Mẹ tôi 76 tuổi bị tiểu đường và huyết áp cao, cần người nấu ăn kiêng & nhắc thuốc',
  'Tìm chuyên viên trực ca đêm cẩn thận, hỗ trợ ông đi lại an toàn khu vực Cầu Giấy',
];

export function AiCareMatcherModal({
  isOpen,
  onClose,
  onViewCaregiver,
  onMessageCaregiver,
  notify,
}: AiCareMatcherModalProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    summary?: string;
    recommendations?: AiRecommendation[];
    care_advice?: string;
    model?: string;
  } | null>(null);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const getCurrentFamilyUserId = () => {
    try {
      const raw = localStorage.getItem('carematch_user');
      if (raw) {
        const u = JSON.parse(raw);
        if (u?.role === 'family' && u?.id) return Number(u.id);
      }
    } catch { }
    return undefined;
  };

  const handleAnalyze = async (customPrompt?: string) => {
    const text = (customPrompt ?? query).trim();
    if (!text) {
      notify('Vui lòng nhập nhu cầu chăm sóc người thân của gia đình.');
      return;
    }
    if (customPrompt) setQuery(customPrompt);
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/ai/match-caregiver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: text,
          familyUserId: getCurrentFamilyUserId(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Không thể kết nối CareMatchAI lúc này.');
      } else {
        setResult(data);
      }
    } catch {
      setError('Lỗi kết nối tới máy chủ CareMatchAI.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl bg-white border border-[#d6e4d0] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#233d22] to-[#345832] text-white rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center border border-white/20">
              <Sparkles size={20} className="text-[#f4d78b]" />
            </div>
            <div>
              <h3 className="font-display text-[18px] font-bold">
                CareMatchAI Tư Vấn & Gợi Ý Người Chăm Sóc
              </h3>
              <p className="text-[11.5px] text-emerald-100/85">
                Phân tích nhu cầu bệnh lý & ghép nối từ hồ sơ chuyên viên thực tế bằng CareMatchAI
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/15 transition cursor-pointer"
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Prompt Input */}
          <div>
            <label className="block text-[12px] font-bold text-[#2b422a] mb-1.5">
              Mô tả tình trạng sức khỏe & mong muốn của gia đình:
            </label>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <textarea
                rows={2}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ví dụ: Mẹ tôi 78 tuổi bị huyết áp cao, cần chuyên viên nấu ăn mềm và đo sinh hiệu ca sáng tại Đống Đa..."
                className="flex-1 rounded-2xl border border-[#cfdccc] bg-[#f8fbf7] p-3 text-[13px] text-gray-800 outline-none focus:border-[#3c653a] focus:bg-white transition"
              />
              <button
                type="button"
                disabled={loading}
                onClick={() => handleAnalyze()}
                className="sm:w-36 rounded-2xl bg-[#2f522d] hover:bg-[#234022] text-white font-bold text-[13px] px-4 py-3 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50 shrink-0"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} />}
                {loading ? 'Đang phân tích' : 'Gợi ý ngay'}
              </button>
            </div>

            {/* Quick suggestions */}
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {QUICK_PROMPTS.map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleAnalyze(q)}
                  disabled={loading}
                  className="text-left rounded-full bg-[#eef5ec] hover:bg-[#dfecd9] text-[#2c4a2a] border border-[#cde0c7] px-3 py-1 text-[11px] font-medium transition cursor-pointer"
                >
                  ✨ {q}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="rounded-2xl bg-rose-50 border border-rose-200 p-3.5 text-[12.5px] text-rose-800">
              {error}
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-4">
              {result.summary && (
                <div className="rounded-2xl bg-[#f2f7f0] border border-[#cbe0c5] p-4">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#2f572d] flex items-center gap-1.5">
                      <Sparkles size={13} /> Đánh giá từ CareMatchAI
                    </span>
                  </div>
                  <p className="text-[13px] text-gray-800 leading-relaxed">{result.summary}</p>
                </div>
              )}

              {Array.isArray(result.recommendations) && result.recommendations.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-[12.5px] font-bold uppercase tracking-wider text-gray-500">
                    Chuyên viên phù hợp nhất ({result.recommendations.length})
                  </h4>
                  {result.recommendations.map((rec, idx) => (
                    <div
                      key={rec.caregiver_id || idx}
                      className="rounded-2xl border border-[#d6e4d2] bg-white p-4 shadow-2xs hover:border-[#7ca477] transition"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#2f522d] text-white text-[11px] font-bold">
                              #{idx + 1}
                            </span>
                            <h5 className="font-display text-[17px] font-bold text-gray-900">
                              {rec.name}
                            </h5>
                            <span className="rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-0.5 text-[11px] font-bold flex items-center gap-1">
                              <Star size={11} fill="currentColor" /> Phù hợp {rec.match_score}%
                            </span>
                          </div>
                          <div className="mt-1.5 flex items-center gap-3 text-[11.5px] text-gray-600">
                            {rec.district && (
                              <span className="flex items-center gap-1">
                                <MapPin size={12} className="text-emerald-700" /> {rec.district}
                              </span>
                            )}
                            {rec.shift_rate && (
                              <span className="font-semibold text-[#2d5229]">
                                ☀️ {Number(rec.shift_rate).toLocaleString('vi-VN')} đ/ca
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              onMessageCaregiver(String(rec.caregiver_id), rec.name);
                              onClose();
                            }}
                            className="rounded-xl bg-[#edf4ea] hover:bg-[#dcebd6] text-[#2b4929] px-3 py-2 text-[12px] font-bold flex items-center gap-1.5 transition cursor-pointer"
                          >
                            <MessageCircle size={14} /> Nhắn tin
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onViewCaregiver(String(rec.caregiver_id));
                              onClose();
                            }}
                            className="rounded-xl bg-[#2f522d] hover:bg-[#234022] text-white px-3.5 py-2 text-[12px] font-bold flex items-center gap-1 transition cursor-pointer"
                          >
                            Xem & Đặt ca <ChevronRight size={14} />
                          </button>
                        </div>
                      </div>

                      {Array.isArray(rec.reasons) && rec.reasons.length > 0 && (
                        <ul className="mt-3 pt-2.5 border-t border-gray-100 space-y-1">
                          {rec.reasons.map((rs, rIdx) => (
                            <li key={rIdx} className="text-[12px] text-gray-700 flex items-start gap-1.5">
                              <ShieldCheck size={13} className="text-emerald-600 shrink-0 mt-0.5" />
                              <span>{rs}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {result.care_advice && (
                <div className="rounded-2xl bg-amber-50/70 border border-amber-200 p-3.5 text-[12px] text-amber-900">
                  <strong>💡 Lưu ý chăm sóc:</strong> {result.care_advice}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
