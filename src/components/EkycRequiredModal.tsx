import React from 'react';
import { ShieldAlert, CreditCard, MessageCircle, X, ArrowRight, ShieldCheck } from 'lucide-react';

interface EkycRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenEkycModal: () => void;
  onOpenMessages?: () => void;
}

export function EkycRequiredModal({
  isOpen,
  onClose,
  onOpenEkycModal,
  onOpenMessages
}: EkycRequiredModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fadeIn" data-testid="modal-ekyc-required">
      <div className="relative w-full max-w-lg rounded-[26px] bg-white p-6 sm:p-7 shadow-2xl border border-[hsl(var(--border))] animate-rise">
        <button 
          onClick={onClose} 
          className="absolute right-4 top-4 rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
          data-testid="button-close-ekyc-required"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3.5 border-b border-gray-100 pb-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 shadow-xs">
            <ShieldAlert size={26} />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Quy Định An Toàn Đặt Ca</span>
            <h3 className="font-display text-[19px] font-bold text-gray-900 leading-tight mt-0.5">
              Yêu Cầu Cung Cấp CCCD Trước Khi Đặt Ca
            </h3>
          </div>
        </div>

        <div className="py-5 space-y-3.5 text-[13px] leading-relaxed text-gray-600">
          <p>
            Để đảm bảo an toàn và quyền lợi tuyệt đối cho cả <strong>gia đình</strong> lẫn <strong>người chăm sóc</strong> khi đến làm việc trực tiếp tại nhà, CARE-MATCH yêu cầu người đại diện cung cấp số <strong>Căn cước công dân (CCCD) gắn chip</strong> để Ban Quản Trị đối soát và xác thực.
          </p>

          <div className="rounded-2xl bg-[#f4f8f3] border border-[#d6e7d4] p-3.5 text-[12px] text-[#2d5631] flex items-start gap-2.5">
            <MessageCircle size={17} className="text-[#3b6b3e] shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold text-[#1f3f22]">Tư vấn & Nhắn tin hoàn toàn tự do:</strong>
              <p className="mt-0.5">Quý khách vẫn có thể trò chuyện, trao đổi chi tiết và nhận tư vấn chuyên môn từ người chăm sóc hoàn toàn miễn phí mà không bị bất kỳ giới hạn nào.</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2.5 text-[12.5px] font-bold transition"
            data-testid="button-cancel-ekyc-required"
          >
            Để sau
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenEkycModal();
            }}
            className="w-full sm:w-auto rounded-xl bg-gradient-to-r from-[#3e5f41] to-[#4c734f] hover:from-[#355237] hover:to-[#416343] text-white px-5 py-2.5 text-[12.5px] font-bold shadow-md transition flex items-center justify-center gap-1.5"
            data-testid="button-provide-ekyc-now"
          >
            <CreditCard size={15} />
            Cung cấp CCCD & Xác thực ngay <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
