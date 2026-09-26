import { useState } from 'react';
import { Star, X, Check, Heart, Sparkles, MessageSquare, ThumbsUp } from 'lucide-react';
import { API } from '@/lib/apiConfig';

interface RatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  scheduleId?: number | null;
  caregiverUserId: number;
  caregiverName: string;
  familyUserId?: number | null;
  familyName?: string;
  patientName?: string;
  serviceTitle?: string;
  shiftDate?: string;
  onSuccess?: () => void;
  notify?: (msg: string) => void;
}

const COMPLIMENT_TAGS = [
  'Đúng giờ',
  'Tận tâm',
  'Chuyên môn cao',
  'Ân cần chu đáo',
  'Kiên nhẫn',
  'Nấu ăn hợp khẩu vị',
  'Giao tiếp ấm áp',
  'Lễ phép cẩn thận',
  'Huyết áp đo chuẩn',
  'Sẽ đặt lại'
];

export function CaregiverRatingModal({
  isOpen,
  onClose,
  scheduleId,
  caregiverUserId,
  caregiverName,
  familyUserId,
  familyName = 'Gia đình',
  patientName = 'Người thân',
  serviceTitle = 'Ca chăm sóc',
  shiftDate,
  onSuccess,
  notify = (_msg: string) => {}
}: RatingModalProps) {
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [selectedTags, setSelectedTags] = useState<string[]>(['Đúng giờ', 'Tận tâm']);
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const getRatingDescription = (stars: number) => {
    switch (stars) {
      case 5:
        return '⭐⭐⭐⭐⭐ Tuyệt vời! Rất hài lòng và an tâm tuyệt đối.';
      case 4:
        return '⭐⭐⭐⭐ Hài lòng! Điều dưỡng viên hoàn thành tốt công việc.';
      case 3:
        return '⭐⭐⭐ Bình thường. Đáp ứng cơ bản yêu cầu của gia đình.';
      case 2:
        return '⭐⭐ Cần cải thiện. Có một vài điểm chưa hài lòng.';
      case 1:
        return '⭐ Không hài lòng. Dịch vụ cần được hỗ trợ xử lý.';
      default:
        return 'Chọn số sao để đánh giá';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating) {
      notify('Vui lòng chọn số sao đánh giá!');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(`${API}/caregiver-reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schedule_id: scheduleId || null,
          caregiver_user_id: caregiverUserId,
          family_user_id: familyUserId || 5,
          family_name: familyName || 'Gia đình',
          patient_name: patientName,
          service_title: serviceTitle,
          rating: rating,
          tags: selectedTags,
          review_text: reviewText.trim() || 'Chuyên viên chăm sóc chu đáo, nhẹ nhàng và đúng giờ!'
        })
      });

      if (res.ok) {
        notify('Cảm ơn bạn đã gửi đánh giá! Đánh giá đã được ghi nhận vào hồ sơ điều dưỡng.');
        if (onSuccess) onSuccess();
        onClose();
      } else {
        notify('Không thể gửi đánh giá, vui lòng thử lại.');
      }
    } catch (err) {
      console.error('Lỗi gửi đánh giá:', err);
      notify('Có lỗi xảy ra khi gửi đánh giá.');
    } finally {
      setSubmitting(false);
    }
  };

  const activeStarCount = hoverRating || rating;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fadeIn">
      <div className="relative w-full max-w-lg rounded-[28px] bg-white p-7 text-stone-800 shadow-2xl animate-scaleUp">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 rounded-full p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-colors"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#c79750]/15 text-[#b07d32]">
            <Sparkles size={24} />
          </div>
          <h2 className="mt-3 font-display text-[22px] font-bold text-stone-900">
            Đánh Giá Chất Lượng Ca Chăm Sóc
          </h2>
          <p className="mt-1 text-[13px] text-stone-500">
            Ca chăm sóc cho <span className="font-semibold text-stone-700">{patientName}</span> với chuyên viên <span className="font-semibold text-[#2f4b36]">{caregiverName}</span>
            {shiftDate && ` · Ngày ${shiftDate}`}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {/* Hệ thống chọn sao */}
          <div className="flex flex-col items-center justify-center rounded-2xl bg-amber-50/50 p-4 border border-amber-100">
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                  className="p-1 transition-transform hover:scale-125 focus:outline-none"
                >
                  <Star
                    size={36}
                    className={`transition-colors ${
                      star <= activeStarCount
                        ? 'fill-amber-400 text-amber-400 drop-shadow-sm'
                        : 'text-stone-300'
                    }`}
                  />
                </button>
              ))}
            </div>
            <p className="mt-3 text-[13px] font-bold text-amber-900">
              {getRatingDescription(activeStarCount)}
            </p>
          </div>

          {/* Các điểm hài lòng nổi bật (Tags) */}
          <div>
            <label className="block text-[12px] font-bold text-stone-700 mb-2">
              Điểm bạn hài lòng nhất về điều dưỡng viên:
            </label>
            <div className="flex flex-wrap gap-2">
              {COMPLIMENT_TAGS.map((tag) => {
                const active = selectedTags.includes(tag);
                return (
                  <button
                    type="button"
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition-all ${
                      active
                        ? 'bg-[#3a5d44] text-white shadow-xs'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200/80'
                    }`}
                  >
                    {active && <Check size={12} className="inline mr-1 -mt-0.5" />}
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Lời nhắn / Nhận xét chi tiết */}
          <div>
            <label className="block text-[12px] font-bold text-stone-700 mb-1">
              Nhận xét hoặc lời nhắn gửi đến chuyên viên (Tùy chọn):
            </label>
            <textarea
              rows={3}
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Chia sẻ cảm nhận của gia đình hoặc tình trạng của cụ sau ca chăm sóc..."
              className="w-full rounded-xl border border-stone-200 p-3 text-[13px] text-stone-800 placeholder-stone-400 focus:border-[#3a5d44] focus:outline-none"
            />
          </div>

          {/* Nút hành động */}
          <div className="flex items-center gap-3 pt-3 border-t border-stone-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-stone-200 py-2.5 text-[13px] font-bold text-stone-600 hover:bg-stone-50"
            >
              Để sau
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-[2] rounded-xl bg-gradient-to-r from-[#3a5d44] to-[#2f4b36] py-2.5 text-[13px] font-bold text-white shadow-xs hover:brightness-105 active:scale-98 transition-all disabled:opacity-50"
            >
              {submitting ? 'Đang gửi đánh giá...' : 'Gửi Đánh Giá ⭐'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
