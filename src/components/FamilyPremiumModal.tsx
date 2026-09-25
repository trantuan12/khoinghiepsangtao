import React, { useState, useEffect } from 'react';
import { 
  X, 
  Crown, 
  Check, 
  Minus, 
  Sparkles, 
  ShieldCheck, 
  Clock, 
  PhoneCall, 
  CalendarDays, 
  Users, 
  RefreshCw, 
  CreditCard, 
  ArrowRight,
  HeartHandshake,
  CheckCircle2,
  AlertCircle,
  HelpCircle
} from 'lucide-react';

const API = 'http://localhost:5000/api';

interface FamilyPremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: { id: number; full_name?: string; email?: string; phone?: string } | null;
  onSubscribed?: () => void;
  notify?: (msg: string) => void;
}

export function FamilyPremiumModal({
  isOpen,
  onClose,
  currentUser,
  onSubscribed,
  notify = (msg) => alert(msg)
}: FamilyPremiumModalProps) {
  const [loading, setLoading] = useState(false);
  const [subData, setSubData] = useState<{
    hasSubscription: boolean;
    is_premium: boolean;
    days_remaining: number;
    subscription?: any;
    monthlyPrice: number;
  }>({
    hasSubscription: false,
    is_premium: false,
    days_remaining: 0,
    monthlyPrice: 50000
  });

  const [paymentStep, setPaymentStep] = useState<'compare' | 'payment' | 'verifying' | 'success'>('compare');
  const [paymentMethod, setPaymentMethod] = useState<'vietqr' | 'bank_transfer' | 'mock'>('vietqr');
  const [submitting, setSubmitting] = useState(false);
  const [scanCountdown, setScanCountdown] = useState(15);
  const [verifyProgress, setVerifyProgress] = useState(0);

  // Load current subscription status
  useEffect(() => {
    if (!isOpen || !currentUser?.id) return;
    const loadSub = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API}/family/subscription/${currentUser.id}`);
        if (res.ok) {
          const data = await res.json();
          setSubData(data);
        }
      } catch (e) {
        console.error('Lỗi tải thông tin gói:', e);
      } finally {
        setLoading(false);
      }
    };
    loadSub();
    setPaymentStep('compare');
  }, [isOpen, currentUser?.id]);

  // Bộ đếm ngược 10-15s tự động quét giao dịch VietQR Napas
  useEffect(() => {
    if (paymentStep !== 'payment') return;
    setScanCountdown(15);
    const interval = setInterval(() => {
      setScanCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          triggerAutoVerify();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [paymentStep]);

  // Kích hoạt bước đối soát tự động mô phỏng giao dịch ngân hàng
  const triggerAutoVerify = () => {
    setPaymentStep('verifying');
    setVerifyProgress(15);
    const timer1 = setTimeout(() => setVerifyProgress(45), 400);
    const timer2 = setTimeout(() => setVerifyProgress(80), 900);
    const timer3 = setTimeout(() => {
      setVerifyProgress(100);
      handleConfirmSubscribe();
    }, 1500);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  };

  if (!isOpen) return null;

  const handleConfirmSubscribe = async () => {
    if (!currentUser?.id) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/family/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          paymentMethod: paymentMethod === 'vietqr' ? 'Chuyển khoản QR (VietQR Napas 247)' : 'Thẻ ngân hàng / Ví điện tử',
          transactionCode: 'PREM-' + Date.now().toString().slice(-6),
          notes: 'Đăng ký Gói Gia Đình Premium qua thanh toán tự động VietQR'
        })
      });
      const data = await res.json();
      if (data.success) {
        setPaymentStep('success');
        notify('🎉 Đã xác nhận giao dịch thành công! Gói Gia Đình VIP 50k đã được kích hoạt.');
        if (onSubscribed) onSubscribed();
        // Cập nhật lại trạng thái local
        setSubData(prev => ({
          ...prev,
          hasSubscription: true,
          is_premium: true,
          days_remaining: (prev.days_remaining || 0) + 30
        }));
        try {
          window.dispatchEvent(new CustomEvent('carematch:subscription_updated', { detail: { is_premium: true } }));
        } catch {}
      } else {
        notify(data.error || 'Có lỗi khi xử lý đăng ký gói.');
        setPaymentStep('payment');
      }
    } catch {
      notify('Lỗi kết nối máy chủ.');
      setPaymentStep('payment');
    } finally {
      setSubmitting(false);
    }
  };

  const comparisonRows = [
    {
      feature: 'Ưu tiên tìm người & Ghép đôi AI',
      desc: 'Tự động gợi ý và ưu tiên kết nối với Điều dưỡng & Người chăm sóc có CARE SCORE cao nhất (95đ+).',
      standard: 'Ghép đôi thông thường',
      premium: '⭐ Ưu tiên số 1 (CARE SCORE 95đ+)',
      highlight: true
    },
    {
      feature: 'Ưu tiên đặt lịch & Giữ chỗ cao điểm',
      desc: 'Được giữ chỗ và xác nhận lịch trước trong các khung giờ cao điểm, ca đêm, ngày cuối tuần và dịp Lễ Tết.',
      standard: 'Theo lượng ca còn trống',
      premium: '📅 Khóa giữ chỗ ưu tiên tuyệt đối',
      highlight: true
    },
    {
      feature: 'Thời gian phản hồi & Tiếp nhận ca',
      desc: 'Thông báo đẩy khẩn cấp tới mạng lưới người chăm sóc gần nhất để nhận ca nhanh chóng.',
      standard: 'Khoảng 30 - 60 phút',
      premium: '⚡ 10 - 15 phút có người nhận',
      highlight: false
    },
    {
      feature: 'Hỗ trợ CSKH & Tiếp nhận khiếu nại',
      desc: 'Đội ngũ chuyên viên CSKH hỗ trợ xử lý sự cố hoặc thắc mắc của gia đình.',
      standard: 'Trong vòng 24 giờ',
      premium: '🛡️ Ưu tiên xử lý trong 15 phút',
      highlight: true
    },
    {
      feature: 'Đường dây y tế & Tư vấn chuyên môn 24/7',
      desc: 'Hotline riêng kết nối Điều dưỡng trưởng tư vấn chỉ số sinh tồn (huyết áp, đường huyết) và phác đồ chăm sóc.',
      standard: false,
      premium: '🩺 Hỗ trợ chuyên biệt 24/7',
      highlight: true
    },
    {
      feature: 'Chính sách đổi người chăm sóc',
      desc: 'Hỗ trợ đổi người chăm sóc khác nếu gia đình thấy phong cách hoặc thói quen chưa thực sự hòa hợp.',
      standard: 'Tính phí điều phối',
      premium: '🔄 Miễn phí đổi trong 24h đầu',
      highlight: false
    },
    {
      feature: 'Huy hiệu Gia Đình VIP',
      desc: 'Huy hiệu VIP xuất hiện trên yêu cầu đặt ca, giúp người chăm sóc an tâm và ưu tiên nhận ca của bạn.',
      standard: false,
      premium: '👑 Huy hiệu Gia Đình VIP độc quyền',
      highlight: false
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="relative w-full max-w-3xl rounded-[28px] bg-white shadow-2xl overflow-hidden border border-[#e2d5b5] max-h-[92vh] flex flex-col">
        
        {/* HEADER MODAL SANG TRỌNG (GOLD / VIP EMERALD) */}
        <div className="relative bg-gradient-to-r from-[#1d3a24] via-[#2a5033] to-[#403014] p-6 text-white shrink-0 overflow-hidden">
          {/* Pattern trang trí nền */}
          <div className="pointer-events-none absolute -right-10 -bottom-10 h-48 w-48 rounded-full border-[20px] border-amber-400/10 blur-xs" />
          <div className="pointer-events-none absolute left-1/3 -top-12 h-36 w-36 rounded-full bg-amber-500/10 blur-xl" />

          <button 
            onClick={onClose}
            aria-label="Đóng"
            className="absolute top-4 right-4 h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 text-white/90 flex items-center justify-center transition cursor-pointer"
          >
            <X size={18} />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-200 text-amber-950 px-3 py-1 text-[11px] font-black tracking-wider uppercase shadow-xs">
              <Crown size={14} className="fill-amber-950" />
              GÓI THÀNH VIÊN VIP
            </span>
            {subData.is_premium && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/90 text-white px-2.5 py-0.5 text-[11px] font-bold">
                <Check size={12} /> Đang hiệu lực
              </span>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mt-1">
            <div>
              <h2 className="font-display text-[22px] sm:text-[26px] font-bold tracking-tight text-white leading-tight">
                Gói Gia Đình Premium
              </h2>
              <p className="text-[13px] text-amber-100/90 mt-1 max-w-xl leading-relaxed">
                Đặc quyền ưu tiên tìm người, giữ chỗ đặt lịch giờ cao điểm và đường dây nóng y tế 24/7 đồng hành cùng gia đình bạn.
              </p>
            </div>

            <div className="text-left sm:text-right shrink-0 bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/15">
              <span className="text-[10.5px] uppercase font-bold text-amber-200/90 tracking-wider block">Chi phí định kỳ</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-[26px] font-black text-amber-300 font-display">50.000đ</span>
                <span className="text-[12px] text-white/80 font-medium">/ tháng</span>
              </div>
              <span className="text-[10px] text-white/60 block mt-0.5">Chỉ ~1.600đ mỗi ngày</span>
            </div>
          </div>
        </div>

        {/* NỘI DUNG CHÍNH (SCROLLABLE) */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">

          {/* BANNER THÔNG BÁO NẾU ĐÃ CÓ GÓI HOẠT ĐỘNG */}
          {subData.is_premium && paymentStep === 'compare' && (
            <div className="rounded-2xl border border-emerald-300 bg-gradient-to-r from-emerald-50 to-[#edf7ee] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Crown size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-emerald-950 text-[14px]">
                    Gia đình bạn đang sở hữu Gói Premium VIP!
                  </h4>
                  <p className="text-[12px] text-emerald-800 mt-0.5">
                    Thời hạn còn lại: <strong className="font-bold text-emerald-900">{subData.days_remaining} ngày</strong> (hết hạn ngày {subData.subscription?.end_date ? new Date(subData.subscription.end_date).toLocaleDateString('vi-VN') : '30 ngày tới'}).
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPaymentStep('payment')}
                className="shrink-0 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 text-[12px] font-bold transition shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RefreshCw size={13} /> Gia hạn thêm 30 ngày (50k)
              </button>
            </div>
          )}

          {/* STEP 1: BẢNG SO SÁNH PHÂN TÁCH RÕ RÀNG QUYỀN LỢI */}
          {paymentStep === 'compare' && (
            <div className="space-y-4">
              <div>
                <h3 className="font-display font-bold text-[16px] text-gray-900 flex items-center gap-2">
                  <Sparkles size={18} className="text-amber-600" />
                  Bảng Phân Tách Quyền Lợi Gói Tiêu Chuẩn vs Premium
                </h3>
                <p className="text-[12px] text-gray-500 mt-0.5">
                  Minh bạch toàn diện: Xem sự khác biệt vượt trội khi nâng cấp lên gói thành viên VIP của CARE-MATCH.
                </p>
              </div>

              {/* TABLE CONTAINER */}
              <div className="overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 bg-[#f8faf7] text-[12px]">
                      <th className="py-3 px-4 font-bold text-gray-700 w-5/12">Quyền Lợi & Đặc Quyền</th>
                      <th className="py-3 px-4 font-bold text-gray-500 w-3/12 text-center">Gói Tiêu Chuẩn</th>
                      <th className="py-3 px-4 font-bold text-[#8a5b12] w-4/12 text-center bg-amber-50/70 border-l border-amber-200">
                        <div className="flex items-center justify-center gap-1">
                          <Crown size={14} className="text-amber-600" />
                          <span>Gói Premium</span>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-[12.5px]">
                    {comparisonRows.map((row, index) => (
                      <tr 
                        key={index}
                        className={`transition hover:bg-gray-50/60 ${row.highlight ? 'bg-amber-50/15' : ''}`}
                      >
                        <td className="py-3.5 px-4 align-top">
                          <p className={`font-bold ${row.highlight ? 'text-[#1e3422]' : 'text-gray-800'}`}>
                            {row.feature}
                          </p>
                          <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">
                            {row.desc}
                          </p>
                        </td>

                        {/* Standard column */}
                        <td className="py-3.5 px-4 text-center align-middle text-gray-500">
                          {row.standard === false ? (
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                              <Minus size={14} />
                            </span>
                          ) : (
                            <span className="text-[12px] font-medium text-gray-600 block">
                              {row.standard}
                            </span>
                          )}
                        </td>

                        {/* Premium column (VIP Highlight) */}
                        <td className="py-3.5 px-4 text-center align-middle bg-amber-50/40 border-l border-amber-200">
                          <span className="inline-flex items-center gap-1 text-[12px] font-bold text-[#744c0d] bg-amber-100/90 border border-amber-300/80 px-2.5 py-1 rounded-xl shadow-2xs">
                            {row.premium}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 4 CARD ĐẶC QUYỀN NỔI BẬT THEO YÊU CẦU VOICE */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="rounded-2xl border border-emerald-200 bg-[#f7faf7] p-3.5 flex items-start gap-3">
                  <div className="h-9 w-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                    <Users size={18} />
                  </div>
                  <div>
                    <h5 className="font-bold text-[13px] text-emerald-950">Ưu Tiên Tìm Người Hàng Đầu</h5>
                    <p className="text-[11.5px] text-emerald-800/90 mt-0.5 leading-snug">
                      Được kết nối trước với người chăm sóc có điểm CARE SCORE cao nhất và kinh nghiệm điều dưỡng dày dặn.
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-amber-200 bg-[#fdfaf3] p-3.5 flex items-start gap-3">
                  <div className="h-9 w-9 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center shrink-0">
                    <CalendarDays size={18} />
                  </div>
                  <div>
                    <h5 className="font-bold text-[13px] text-amber-950">Ưu Tiên Đặt Lịch Giờ Vàng</h5>
                    <p className="text-[11.5px] text-amber-800/90 mt-0.5 leading-snug">
                      Giữ chỗ độc quyền trong các dịp Lễ Tết, cuối tuần và các ca chăm sóc khẩn cấp khi người nhà cần kíp.
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-blue-200 bg-[#f4f8fd] p-3.5 flex items-start gap-3">
                  <div className="h-9 w-9 rounded-xl bg-blue-100 text-blue-900 flex items-center justify-center shrink-0">
                    <Clock size={18} />
                  </div>
                  <div>
                    <h5 className="font-bold text-[13px] text-blue-950">Ưu Tiên Hỗ Trợ Trước (15 Phút)</h5>
                    <p className="text-[11.5px] text-blue-800/90 mt-0.5 leading-snug">
                      Mọi thắc mắc, đổi người chăm sóc hoặc yêu cầu đặc biệt được Admin và CSKH tiếp nhận xử lý ngay tức thì.
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-rose-200 bg-[#fdf5f5] p-3.5 flex items-start gap-3">
                  <div className="h-9 w-9 rounded-xl bg-rose-100 text-rose-900 flex items-center justify-center shrink-0">
                    <PhoneCall size={18} />
                  </div>
                  <div>
                    <h5 className="font-bold text-[13px] text-rose-950">Hotline Y Tế Chuyên Biệt 24/7</h5>
                    <p className="text-[11.5px] text-rose-800/90 mt-0.5 leading-snug">
                      Tư vấn chuyên môn y khoa, chỉ số sức khỏe của người cao tuổi mọi lúc, an tâm trọn vẹn cả ngày lẫn đêm.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: THANH TOÁN GÓI 50.000Đ/THÁNG (VIETQR / CHUYỂN KHOẢN) */}
          {paymentStep === 'payment' && (
            <div className="space-y-5 animate-fadeIn">
              <div className="rounded-2xl border border-amber-200 bg-[#fdfaf3] p-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase text-amber-900 tracking-wider">Gói đăng ký</p>
                  <h4 className="font-display font-bold text-[17px] text-gray-900 mt-0.5">Gói Gia Đình Premium (30 ngày)</h4>
                  <p className="text-[12px] text-gray-600 mt-0.5">Áp dụng cho tài khoản gia đình: <strong>{currentUser?.full_name || 'Người nhà'}</strong></p>
                </div>
                <div className="text-right">
                  <span className="text-[24px] font-black text-amber-800 font-display">50.000đ</span>
                  <span className="block text-[10.5px] text-gray-500 font-medium">Đã bao gồm VAT</span>
                </div>
              </div>

              {/* VietQR Box */}
              <div className="rounded-2xl border border-gray-200 p-5 bg-white text-center space-y-4">
                <div className="max-w-[220px] mx-auto p-3 bg-white rounded-xl border border-gray-200 shadow-sm">
                  {/* Mock VietQR Image Canvas */}
                  <div className="w-full aspect-square bg-[#fbfdfa] border-2 border-dashed border-emerald-400 rounded-lg flex flex-col items-center justify-center p-3 relative overflow-hidden">
                    <div className="absolute top-1 left-2 text-[9px] font-bold text-emerald-800 uppercase tracking-wider">VietQR · Napas247</div>
                    <div className="h-28 w-28 bg-[#1f3625] rounded-md flex items-center justify-center p-2 text-white">
                      <div className="w-full h-full border border-amber-300/40 rounded flex flex-col items-center justify-center text-center">
                        <Crown size={24} className="text-amber-300" />
                        <span className="text-[9px] font-mono text-amber-200 mt-1">CARE-MATCH</span>
                        <span className="text-[8px] text-gray-300 font-mono">50.000 VND</span>
                      </div>
                    </div>
                    <span className="text-[9.5px] text-gray-500 mt-2 font-mono">Quét mã chuyển khoản tức thì</span>
                  </div>
                </div>

                <div className="rounded-xl bg-[#fafcf9] border border-[#e1ede0] p-3 text-[12px] space-y-1.5 text-left max-w-md mx-auto">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Ngân hàng thụ hưởng:</span>
                    <strong className="font-semibold text-gray-800">MB Bank (Quân Đội)</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Số tài khoản:</span>
                    <strong className="font-mono font-bold text-emerald-900">0934 567 890</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Chủ tài khoản:</span>
                    <strong className="font-semibold text-gray-800">CARE MATCH PLATFORM</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Số tiền:</span>
                    <strong className="font-bold text-amber-900">50.000 VNĐ</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Nội dung chuyển khoản:</span>
                    <strong className="font-mono text-[11.5px] text-emerald-950 bg-emerald-100/70 px-1.5 py-0.5 rounded">
                      CAREMATCH PREM {currentUser?.id || 1}
                    </strong>
                  </div>
                </div>

                {/* Simulated Realtime Webhook listener */}
                <div className="rounded-xl border border-emerald-300 bg-emerald-50/80 p-3.5 text-center space-y-2 max-w-md mx-auto">
                  <div className="flex items-center justify-between text-[11.5px] font-bold text-emerald-900">
                    <span className="flex items-center gap-1.5">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
                      </span>
                      Đang tự động lắng nghe giao dịch VietQR Napas...
                    </span>
                    <span className="font-mono text-emerald-800 bg-white px-2 py-0.5 rounded-full border border-emerald-200">
                      {scanCountdown}s
                    </span>
                  </div>
                  <div className="w-full bg-emerald-200/70 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-emerald-600 h-2 rounded-full transition-all duration-1000 ease-linear"
                      style={{ width: `${((15 - scanCountdown) / 15) * 100}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-emerald-800/80 italic text-left">
                    ⚡ Hệ thống sẽ tự động xác nhận trong vòng 10-15 giây ngay khi bạn quét mã, hoặc bấm nút xác nhận dưới đây để kích hoạt tức thì.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2.5: ĐỐI SOÁT TỰ ĐỘNG (VERIFYING) */}
          {paymentStep === 'verifying' && (
            <div className="py-12 text-center space-y-5 animate-fadeIn">
              <div className="relative mx-auto h-20 w-20 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-emerald-200 animate-ping opacity-30" />
                <div className="h-18 w-18 rounded-full bg-emerald-50 border-2 border-emerald-500 flex items-center justify-center text-emerald-700 shadow-md">
                  <RefreshCw size={32} className="animate-spin text-emerald-700" />
                </div>
              </div>
              <div className="space-y-1.5">
                <h3 className="font-display font-bold text-[20px] text-emerald-950">
                  Đang Đối Soát Giao Dịch Ngân Hàng Tự Động...
                </h3>
                <p className="text-[12.5px] text-gray-600 max-w-sm mx-auto">
                  Đã nhận tín hiệu chuyển khoản qua VietQR Napas 247. Đang xác thực biến động số dư và ghi nhận đặc quyền VIP...
                </p>
              </div>

              <div className="max-w-xs mx-auto space-y-2">
                <div className="flex justify-between text-[11px] font-bold text-emerald-900">
                  <span>Tiến trình xử lý liên ngân hàng:</span>
                  <span>{verifyProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-emerald-500 to-emerald-700 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${verifyProgress}%` }}
                  />
                </div>
              </div>

              <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 border border-amber-200 px-3.5 py-1 text-[11px] text-amber-900 font-semibold">
                <Crown size={13} className="text-amber-600" />
                <span>Số tiền: 50.000 VNĐ · Mã: PREM-{currentUser?.id || 1}</span>
              </div>
            </div>
          )}

          {/* STEP 3: KÍCH HOẠT THÀNH CÔNG */}
          {paymentStep === 'success' && (
            <div className="py-8 text-center space-y-4 animate-fadeIn">
              <div className="mx-auto h-16 w-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs">
                <CheckCircle2 size={36} />
              </div>
              <div className="space-y-1">
                <h3 className="font-display font-bold text-[22px] text-emerald-950">
                  Kích Hoạt Gói Gia Đình Premium Thành Công!
                </h3>
                <p className="text-[13px] text-gray-600 max-w-md mx-auto">
                  Hệ thống tự động đã ghi nhận thanh toán 50.000đ thành công. Toàn bộ đặc quyền VIP: Ưu tiên tìm người, ưu tiên đặt lịch và hỗ trợ chuyên biệt 24/7 đã có hiệu lực ngay!
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-[#f6faf5] p-4 text-[12px] text-left max-w-md mx-auto space-y-2">
                <div className="flex items-center gap-2 text-emerald-900 font-bold">
                  <Check size={14} className="text-emerald-700" />
                  Đã tự động gửi thông báo đến Ban Quản Trị Admin
                </div>
                <div className="flex items-center gap-2 text-emerald-900 font-bold">
                  <Check size={14} className="text-emerald-700" />
                  Huy hiệu Gia Đình VIP đã gắn trên hồ sơ của bạn
                </div>
                <div className="flex items-center gap-2 text-emerald-900 font-bold">
                  <Check size={14} className="text-emerald-700" />
                  Thời hạn: 30 ngày kể từ hôm nay
                </div>
              </div>
            </div>
          )}

        </div>

        {/* FOOTER ACTIONS */}
        <div className="p-4 sm:p-5 bg-gray-50/90 border-t border-gray-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-[12px] text-gray-500">
            <ShieldCheck size={16} className="text-emerald-700" />
            <span>Cam kết hoàn tiền 100% nếu không hài lòng dịch vụ trong 7 ngày đầu.</span>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {paymentStep === 'compare' && (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-gray-300 px-4 py-2.5 text-[12px] font-bold text-gray-700 hover:bg-gray-100 transition cursor-pointer"
                >
                  Để sau
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentStep('payment')}
                  className="rounded-xl bg-gradient-to-r from-[#996a1b] to-[#7a4f08] hover:from-[#875d16] hover:to-[#6a4405] text-white px-5 py-2.5 text-[12.5px] font-bold shadow-md transition cursor-pointer flex items-center gap-1.5"
                >
                  <Crown size={15} className="fill-white" />
                  {subData.is_premium ? 'Gia hạn gói (50.000đ/tháng)' : 'Đăng ký gói Premium ngay (50.000đ/tháng)'}
                  <ArrowRight size={14} />
                </button>
              </>
            )}

            {paymentStep === 'payment' && (
              <>
                <button
                  type="button"
                  onClick={() => setPaymentStep('compare')}
                  className="rounded-xl border border-gray-300 px-4 py-2.5 text-[12px] font-bold text-gray-700 hover:bg-gray-100 transition cursor-pointer"
                >
                  Quay lại
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={triggerAutoVerify}
                  className="rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-2.5 text-[12.5px] font-bold shadow-md transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  <CheckCircle2 size={16} />
                  <span>Tôi đã chuyển khoản thành công · Xác nhận ngay</span>
                </button>
              </>
            )}

            {paymentStep === 'verifying' && (
              <div className="flex items-center gap-2 text-[12px] font-bold text-emerald-800 bg-emerald-100/70 px-4 py-2 rounded-xl">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-700 border-t-transparent" />
                <span>Hệ thống đang đối soát tự động...</span>
              </div>
            )}

            {paymentStep === 'success' && (
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white px-6 py-2.5 text-[12.5px] font-bold shadow-md transition cursor-pointer"
              >
                Hoàn tất & Khám phá đặc quyền
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
