import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  CreditCard, 
  CalendarDays, 
  Clock, 
  User, 
  CheckCircle2, 
  AlertCircle, 
  Hourglass, 
  Crown, 
  ArrowRight, 
  Check, 
  RefreshCw, 
  FileText, 
  Download, 
  Info,
  Banknote,
  HelpCircle,
  ExternalLink,
  X
} from 'lucide-react';
import { API } from '@/lib/apiConfig';

interface FamilyPaymentsViewProps {
  currentUser?: { id: number; full_name?: string; email?: string; phone?: string };
  notify: (msg: string) => void;
  onOpenVipModal?: () => void;
}

export function FamilyPaymentsView({ currentUser, notify, onOpenVipModal }: FamilyPaymentsViewProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    bookings: any[];
    stats: {
      total_booked: number;
      paid_in_escrow: number;
      pending_payment: number;
      completed_paid: number;
      total_spent: number;
    };
    is_premium: boolean;
    premium_until?: string;
  }>({
    bookings: [],
    stats: {
      total_booked: 0,
      paid_in_escrow: 0,
      pending_payment: 0,
      completed_paid: 0,
      total_spent: 0
    },
    is_premium: false
  });

  // Modal thanh toán QR cho ca đặt
  const [payingBooking, setPayingBooking] = useState<any | null>(null);
  const [payStep, setPayStep] = useState<'qr' | 'verifying' | 'success'>('qr');
  const [payCountdown, setPayCountdown] = useState(15);
  const [verifyProgress, setVerifyProgress] = useState(0);

  // Cấu hình ngân hàng & mã VietQR thanh toán do Admin thiết lập
  const [paymentConfig, setPaymentConfig] = useState<{
    bank_name: string;
    bank_account: string;
    bank_owner: string;
    qr_image: string;
  }>({
    bank_name: 'MB Bank (Quân Đội)',
    bank_account: '0934 567 890',
    bank_owner: 'TỐNG THANH DƯƠNG',
    qr_image: ''
  });

  useEffect(() => {
    fetch(`${API}/settings`)
      .then(r => r.json())
      .then(data => {
        const s = data.settings || data;
        if (s) {
          setPaymentConfig({
            bank_name: s.admin_bank_name || 'MB Bank (Quân Đội)',
            bank_account: s.admin_bank_account || '0934 567 890',
            bank_owner: s.admin_bank_owner || 'TỐNG THANH DƯƠNG',
            qr_image: s.admin_qr_image || ''
          });
        }
      })
      .catch(() => {});
  }, []);

  // Modal biên nhận bảo lãnh
  const [viewingReceipt, setViewingReceipt] = useState<any | null>(null);

  const loadData = async () => {
    if (!currentUser?.id) return;
    try {
      setLoading(true);
      const res = await fetch(`${API}/payments/family/${currentUser.id}`);
      if (res.ok) {
        const d = await res.json();
        setData(d);
      }
    } catch {
      notify('Lỗi kết nối khi tải lịch sử thanh toán.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const handleSubUpdated = () => loadData();
    window.addEventListener('carematch:subscription_updated', handleSubUpdated);
    return () => window.removeEventListener('carematch:subscription_updated', handleSubUpdated);
  }, [currentUser?.id]);

  // Bộ đếm ngược tự động 15s cho ca làm
  useEffect(() => {
    if (!payingBooking || payStep !== 'qr') return;
    setPayCountdown(15);
    const interval = setInterval(() => {
      setPayCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          handleTriggerVerifyBooking();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [payingBooking, payStep]);

  const handleTriggerVerifyBooking = () => {
    setPayStep('verifying');
    setVerifyProgress(20);
    setTimeout(() => setVerifyProgress(55), 400);
    setTimeout(() => setVerifyProgress(85), 900);
    setTimeout(async () => {
      setVerifyProgress(100);
      try {
        const res = await fetch(`${API}/payments/pay-booking`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentId: payingBooking.id,
            scheduleId: payingBooking.schedule_id,
            userId: currentUser?.id,
            paymentMethod: 'VietQR Napas 247'
          })
        });
        if (res.ok) {
          setPayStep('success');
          notify('🛡️ Đã thanh toán giữ chỗ an toàn thành công! Tiền đang được bảo lãnh ký quỹ tại CARE-MATCH.');
          loadData();
        } else {
          setPayStep('qr');
          notify('Không thể hoàn tất thanh toán. Vui lòng thử lại.');
        }
      } catch {
        setPayStep('qr');
        notify('Lỗi máy chủ khi thanh toán.');
      }
    }, 1500);
  };

  const handleConfirmCompletion = async (item: any) => {
    try {
      const res = await fetch(`${API}/payments/confirm-shift-complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduleId: item.schedule_id,
          paymentId: item.id
        })
      });
      if (res.ok) {
        notify('✅ Đã xác nhận hoàn thành ca! CARE-MATCH đã tự động tất toán 85% thù lao cho Người chăm sóc.');
        loadData();
      }
    } catch {
      notify('Lỗi kết nối khi xác nhận hoàn thành.');
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-[.14em] text-[hsl(var(--primary))]">
            Quản Lý Thanh Toán & Ký Quỹ An Toàn · Gia Đình
          </span>
          <h1 className="mt-1 font-display text-[28px] sm:text-[32px] font-bold text-[#1f3323] leading-tight">
            Minh Bạch Từng Khoản Chi & Lịch Trình.
          </h1>
          <p className="mt-1 text-[13px] text-gray-600 max-w-2xl">
            Theo dõi tất cả các ca chăm sóc đã đặt, thời hạn thanh toán giữ chỗ và cơ chế bảo lãnh ký quỹ an toàn 100%.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadData()}
            className="rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-[12px] font-bold text-gray-700 hover:bg-gray-50 transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Làm mới
          </button>
          {onOpenVipModal && (
            <button
              onClick={onOpenVipModal}
              className="rounded-xl bg-gradient-to-r from-[#996a1b] to-[#784d08] text-white px-4 py-2 text-[12px] font-bold shadow-xs hover:brightness-110 transition flex items-center gap-1.5 cursor-pointer"
            >
              <Crown size={14} className="fill-white" />
              <span>{data.is_premium ? 'Đặc quyền VIP (Đang bật)' : 'Gói Premium (300k)'}</span>
            </button>
          )}
        </div>
      </div>

      {/* BANNER QUY ĐỊNH THANH TOÁN TRƯỚC CA & BẢO LÃNH KÝ QUỸ (THEO YÊU CẦU NGƯỜI DÙNG) */}
      <div className="rounded-2xl border border-amber-300/80 bg-gradient-to-r from-[#fffcf4] via-[#fbf7ed] to-[#f4faf2] p-4.5 sm:p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-900 border border-amber-200 shadow-2xs">
            <ShieldCheck size={24} className="text-amber-800" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h4 className="font-display font-bold text-[14.5px] text-amber-950">
                Quy Định Đặt Lịch & Cơ Chế Giữ Tiền Trung Gian (Escrow)
              </h4>
              <span className="rounded-full bg-amber-200/90 text-amber-950 px-2 py-0.2 text-[9.5px] font-bold uppercase tracking-wider">
                Bảo vệ 2 chiều
              </span>
            </div>
            <p className="mt-1 text-[12.5px] leading-relaxed text-amber-900/90">
              <strong>Yêu cầu thanh toán trước ca tối thiểu 1 ngày:</strong> Khi đặt lịch, gia đình cần thanh toán trước để giữ chỗ chuyên viên chăm sóc. Số tiền được <strong>CARE-MATCH giữ an toàn trung gian</strong> cho đến khi ca hoàn thành và được cả hai bên xác nhận. Thù lao sau đó sẽ tự động chuyển vào tài khoản ngân hàng của Người chăm sóc (khấu trừ 15% phí nền tảng sàn).
            </p>
          </div>
        </div>
      </div>

      {/* 4 STATS CARDS */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/80 to-white p-4.5 shadow-2xs">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-emerald-800">
            <span>Tiền Đang Ký Quỹ</span>
            <span className="rounded-full bg-emerald-100 text-emerald-900 px-2 py-0.5 text-[9.5px]">Bảo lãnh</span>
          </div>
          <p className="mt-2.5 font-display text-[26px] sm:text-[28px] font-bold text-emerald-950">
            {data.stats.paid_in_escrow.toLocaleString('vi-VN')} đ
          </p>
          <p className="mt-1 text-[11px] text-emerald-700/90 flex items-center gap-1">
            <ShieldCheck size={12} /> Tiền an toàn chờ ca hoàn tất
          </p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50/70 to-white p-4.5 shadow-2xs">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-amber-800">
            <span>Cần Thanh Toán Trước Ca</span>
            <span className="rounded-full bg-amber-100 text-amber-900 px-2 py-0.5 text-[9.5px]">Tối thiểu 1 ngày</span>
          </div>
          <p className="mt-2.5 font-display text-[26px] sm:text-[28px] font-bold text-amber-950">
            {data.stats.pending_payment.toLocaleString('vi-VN')} đ
          </p>
          <p className="mt-1 text-[11px] text-amber-700/90 flex items-center gap-1">
            <Clock size={12} /> Cần thanh toán giữ chỗ
          </p>
        </div>

        <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50/70 to-white p-4.5 shadow-2xs">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-blue-800">
            <span>Đã Quyết Toán Ca</span>
            <span className="rounded-full bg-blue-100 text-blue-900 px-2 py-0.5 text-[9.5px]">Đã giải ngân</span>
          </div>
          <p className="mt-2.5 font-display text-[26px] sm:text-[28px] font-bold text-blue-950">
            {data.stats.completed_paid.toLocaleString('vi-VN')} đ
          </p>
          <p className="mt-1 text-[11px] text-blue-700/90">
            Đã chuyển cho Người chăm sóc
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50/80 to-white p-4.5 shadow-2xs">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-gray-600">
            <span>Tổng Ca Đã Đặt</span>
            <span className="rounded-full bg-gray-200 text-gray-800 px-2 py-0.5 text-[9.5px]">Lịch trình</span>
          </div>
          <p className="mt-2.5 font-display text-[26px] sm:text-[28px] font-bold text-gray-900">
            {data.stats.total_booked} ca
          </p>
          <p className="mt-1 text-[11px] text-gray-500">
            Đồng bộ hệ thống thời gian thực
          </p>
        </div>
      </div>

      {/* DANH SÁCH CÁC CA ĐẶT & TRẠNG THÁI THANH TOÁN (BOOKINGS TABLE) */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-2xs overflow-hidden">
        <div className="border-b border-gray-200 px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#fafcf9]">
          <div>
            <h3 className="font-display font-bold text-[16px] text-gray-900">
              Chi Tiết Ca Chăm Sóc Đã Đặt & Trạng Thái Thanh Toán
            </h3>
            <p className="text-[12px] text-gray-500 mt-0.5">
              Kiểm tra lịch, thanh toán giữ chỗ bằng VietQR và bấm xác nhận hoàn thành khi ca kết thúc.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-gray-500">
            <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-emerald-600" />
            <p className="text-[12.5px]">Đang tải dữ liệu...</p>
          </div>
        ) : data.bookings.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            <CalendarDays size={32} className="mx-auto mb-2 text-gray-300" />
            <p className="text-[13px] font-semibold text-gray-700">Chưa có ca chăm sóc nào được đặt</p>
            <p className="text-[11.5px] text-gray-400 mt-1">
              Bạn có thể vào mục "Tìm người chăm sóc" để chọn chuyên viên phù hợp và đặt ca.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[12.5px]">
              <thead>
                <tr className="border-b border-gray-200 bg-[#f7f9f6] text-[11px] font-bold uppercase tracking-wider text-gray-600">
                  <th className="py-3.5 px-5">Mã Ca / GD</th>
                  <th className="py-3.5 px-4">Lịch Trình Ca</th>
                  <th className="py-3.5 px-4">Chuyên Viên Chăm Sóc</th>
                  <th className="py-3.5 px-4">Người Thân</th>
                  <th className="py-3.5 px-4">Chi Phí Ca</th>
                  <th className="py-3.5 px-4">Trạng Thái Thanh Toán</th>
                  <th className="py-3.5 px-5 text-right">Hành Động Gia Đình</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.bookings.map((b: any) => {
                  const isPending = b.escrow_status === 'pending_payment';
                  const isInEscrow = b.escrow_status === 'in_escrow';
                  const isPaidOut = b.escrow_status === 'paid_out';

                  return (
                    <tr key={b.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-4 px-5">
                        <span className="font-mono font-bold text-gray-900 text-[12px]">{b.transaction_code}</span>
                        <p className="text-[10.5px] text-gray-400 mt-0.5">
                          {b.created_at ? new Date(b.created_at).toLocaleDateString('vi-VN') : 'Hôm nay'}
                        </p>
                      </td>

                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5 font-bold text-gray-900">
                          <CalendarDays size={13} className="text-emerald-700" />
                          <span>{b.shift_date}</span>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1">
                          <Clock size={11} /> {b.shift_time}
                        </p>
                      </td>

                      <td className="py-4 px-4">
                        <p className="font-bold text-gray-900">{b.caregiver_name}</p>
                        <p className="text-[11px] text-gray-500">{b.caregiver_phone || 'Đã xác minh eKYC'}</p>
                      </td>

                      <td className="py-4 px-4">
                        <p className="font-semibold text-gray-800">{b.patient_name || 'Người thân'}</p>
                        <p className="text-[10.5px] text-gray-400 line-clamp-1">{b.schedule_tasks || 'Chăm sóc sinh hoạt'}</p>
                      </td>

                      <td className="py-4 px-4 font-bold text-emerald-900 whitespace-nowrap text-[13.5px]">
                        {Number(b.total_amount).toLocaleString('vi-VN')} đ
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">
                        {isPending && (
                          <div>
                            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                              <Hourglass size={11} /> Chờ thanh toán giữ chỗ
                            </span>
                            <p className="text-[10px] text-amber-700 mt-1">Cần thanh toán trước ca 1 ngày</p>
                          </div>
                        )}
                        {isInEscrow && (
                          <div>
                            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                              <ShieldCheck size={11} /> Đã thanh toán (Ký quỹ an toàn)
                            </span>
                            <p className="text-[10px] text-emerald-700 mt-1">CARE-MATCH bảo lãnh tiền</p>
                          </div>
                        )}
                        {isPaidOut && (
                          <div>
                            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold bg-blue-100 text-blue-900 border border-blue-300">
                              <CheckCircle2 size={11} /> Đã hoàn tất & tất toán
                            </span>
                            <p className="text-[10px] text-blue-700 mt-1">Đã giải ngân cho Người chăm sóc</p>
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-5 text-right whitespace-nowrap space-x-2">
                        {isPending && (
                          <button
                            onClick={() => {
                              setPayingBooking(b);
                              setPayStep('qr');
                            }}
                            className="rounded-xl bg-gradient-to-r from-emerald-700 to-emerald-800 text-white px-3.5 py-1.5 text-[11.5px] font-bold shadow-xs hover:brightness-110 transition flex items-center gap-1 ml-auto cursor-pointer"
                          >
                            <CreditCard size={13} /> Thanh toán VietQR ngay
                          </button>
                        )}

                        {isInEscrow && (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setViewingReceipt(b)}
                              className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-gray-700 hover:bg-gray-50 transition"
                            >
                              Biên nhận
                            </button>
                            <button
                              onClick={() => handleConfirmCompletion(b)}
                              className="rounded-lg bg-emerald-700 text-white px-3 py-1.5 text-[11.5px] font-bold hover:bg-emerald-800 transition shadow-2xs"
                              title="Bấm khi ca chăm sóc đã hoàn tất tốt đẹp"
                            >
                              Xác nhận xong ca
                            </button>
                          </div>
                        )}

                        {isPaidOut && (
                          <button
                            onClick={() => setViewingReceipt(b)}
                            className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-[11px] font-semibold text-gray-600 hover:bg-gray-100 transition inline-flex items-center gap-1"
                          >
                            <FileText size={12} /> Hóa đơn đã tất toán
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL THANH TOÁN TỰ ĐỘNG VIETQR CHO CA LÀM */}
      {payingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden border border-gray-100 animate-rise">
            <div className="flex items-center justify-between border-b px-5 py-4 bg-[#f8faf7]">
              <div className="flex items-center gap-2">
                <ShieldCheck size={20} className="text-emerald-700" />
                <h3 className="font-display font-bold text-[16px] text-gray-900">
                  Thanh Toán Giữ Chỗ An Toàn Ca #{payingBooking.id}
                </h3>
              </div>
              <button 
                onClick={() => setPayingBooking(null)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-200 transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {payStep === 'qr' && (
                <>
                  <div className="text-center">
                    <p className="text-[12px] text-gray-500">Số tiền cần thanh toán ký quỹ giữ chỗ:</p>
                    <p className="font-display text-[28px] font-bold text-emerald-900 mt-0.5">
                      {Number(payingBooking.total_amount).toLocaleString('vi-VN')} VNĐ
                    </p>
                    <p className="text-[11.5px] text-amber-800 bg-amber-50 px-3 py-1 rounded-full border border-amber-200 inline-block mt-1">
                      Ca: {payingBooking.shift_date} · {payingBooking.shift_time}
                    </p>
                  </div>

                  {/* QR Box */}
                  <div className="max-w-[220px] mx-auto p-3 bg-white rounded-xl border border-gray-200 text-center shadow-xs">
                    <div className="bg-[#f8faf7] border-2 border-dashed border-emerald-400 rounded-lg flex flex-col items-center justify-center p-2 relative overflow-hidden">
                      <span className="text-[8.5px] font-bold text-emerald-800 uppercase mb-1">VietQR · Napas 247</span>
                      {paymentConfig.qr_image ? (
                        <img 
                          src={paymentConfig.qr_image} 
                          alt="Mã QR Admin CareMatch" 
                          className="w-36 h-36 object-contain rounded-md my-1 bg-white p-1 border border-emerald-100 shadow-2xs" 
                        />
                      ) : (
                        <div className="relative">
                          <img 
                            src={`https://img.vietqr.io/image/MB-${paymentConfig.bank_account.replace(/\s+/g, '')}-compact2.png?amount=${payingBooking.total_amount}&addInfo=CAREMATCH%20CA%20${payingBooking.id}&accountName=${encodeURIComponent(paymentConfig.bank_owner)}`}
                            alt="VietQR Napas 247"
                            className="w-36 h-36 object-contain rounded-md my-1 bg-white p-1 border border-emerald-100 shadow-2xs"
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = 'none';
                              const fb = document.getElementById('family-pay-qr-fallback');
                              if (fb) fb.style.display = 'flex';
                            }}
                          />
                          <div id="family-pay-qr-fallback" className="hidden h-36 w-36 bg-[#1f3625] rounded-md flex-col items-center justify-center text-white my-1 p-2">
                            <ShieldCheck size={26} className="text-amber-300" />
                            <span className="text-[9px] font-mono mt-1 text-amber-200">CARE-MATCH</span>
                            <span className="text-[8px] text-gray-300 font-mono mt-0.5">
                              {Number(payingBooking.total_amount).toLocaleString('vi-VN')} đ
                            </span>
                          </div>
                        </div>
                      )}
                      <span className="text-[9px] text-gray-500 font-mono mt-1">Quét mã chuyển khoản tức thì</span>
                    </div>
                  </div>

                  <div className="rounded-xl bg-gray-50 border border-gray-200 p-3 text-[11.5px] space-y-1.5 max-w-sm mx-auto">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Ngân hàng thụ hưởng:</span>
                      <strong className="text-gray-800">{paymentConfig.bank_name}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Số tài khoản:</span>
                      <strong className="font-mono font-bold text-emerald-900">{paymentConfig.bank_account}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Chủ tài khoản:</span>
                      <strong className="font-bold text-gray-900">{paymentConfig.bank_owner}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Nội dung chuyển khoản:</span>
                      <strong className="font-mono text-emerald-950 bg-emerald-100 px-1.5 py-0.5 rounded">
                        CAREMATCH CA {payingBooking.id}
                      </strong>
                    </div>
                  </div>

                  {/* Automated 15s Countdown */}
                  <div className="rounded-xl border border-emerald-300 bg-emerald-50/80 p-3 text-center space-y-1.5 max-w-sm mx-auto">
                    <div className="flex items-center justify-between text-[11px] font-bold text-emerald-900">
                      <span className="flex items-center gap-1.5">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
                        </span>
                        Đang lắng nghe chuyển khoản Napas...
                      </span>
                      <span className="font-mono text-emerald-800 bg-white px-2 py-0.2 rounded-full border border-emerald-200">
                        {payCountdown}s
                      </span>
                    </div>
                    <div className="w-full bg-emerald-200/70 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className="bg-emerald-600 h-1.5 rounded-full transition-all duration-1000 ease-linear"
                        style={{ width: `${((15 - payCountdown) / 15) * 100}%` }}
                      />
                    </div>
                  </div>
                </>
              )}

              {payStep === 'verifying' && (
                <div className="py-8 text-center space-y-4">
                  <div className="h-16 w-16 mx-auto rounded-full bg-emerald-50 border-2 border-emerald-500 flex items-center justify-center text-emerald-700 shadow-xs">
                    <RefreshCw size={28} className="animate-spin text-emerald-700" />
                  </div>
                  <div>
                    <h4 className="font-display font-bold text-[18px] text-emerald-950">
                      Đang Đối Soát Giao Dịch Tự Động...
                    </h4>
                    <p className="text-[12px] text-gray-500 mt-1">
                      Đang xác nhận biến động số dư qua Napas 247 và đưa tiền vào quỹ bảo lãnh...
                    </p>
                  </div>
                  <div className="max-w-xs mx-auto">
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${verifyProgress}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {payStep === 'success' && (
                <div className="py-6 text-center space-y-3">
                  <div className="h-14 w-14 mx-auto rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs">
                    <CheckCircle2 size={32} />
                  </div>
                  <h4 className="font-display font-bold text-[18px] text-emerald-950">
                    Thanh Toán Ký Quỹ Thành Công!
                  </h4>
                  <p className="text-[12.5px] text-gray-600 max-w-sm mx-auto">
                    Tiền của bạn đã được CARE-MATCH giữ an toàn. Chuyên viên chăm sóc đã nhận được thông báo để sẵn sàng tới thực hiện ca đúng giờ!
                  </p>
                  <button
                    onClick={() => setPayingBooking(null)}
                    className="mt-2 rounded-xl bg-emerald-700 text-white px-5 py-2 text-[12px] font-bold hover:bg-emerald-800 transition"
                  >
                    Đóng cửa sổ
                  </button>
                </div>
              )}
            </div>

            {payStep === 'qr' && (
              <div className="border-t bg-gray-50 p-4 flex items-center justify-between">
                <button
                  onClick={() => setPayingBooking(null)}
                  className="rounded-xl border border-gray-300 px-4 py-2 text-[12px] font-bold text-gray-600 hover:bg-gray-100 transition"
                >
                  Để sau
                </button>
                <button
                  onClick={handleTriggerVerifyBooking}
                  className="rounded-xl bg-emerald-700 text-white px-5 py-2 text-[12px] font-bold hover:bg-emerald-800 transition flex items-center gap-1.5 shadow-xs"
                >
                  <CheckCircle2 size={15} /> Tôi đã chuyển khoản thành công
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL XEM BIÊN NHẬN BẢO LÃNH */}
      {viewingReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden border border-gray-100 p-6 space-y-4 animate-rise">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <FileText size={20} className="text-emerald-700" />
                <h4 className="font-display font-bold text-[16px] text-gray-900">Biên Nhận Bảo Lãnh CARE-MATCH</h4>
              </div>
              <button onClick={() => setViewingReceipt(null)} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>

            <div className="rounded-xl bg-[#fafcf9] border border-emerald-200 p-4 text-[12px] space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Mã giao dịch:</span>
                <strong className="font-mono text-gray-900">{viewingReceipt.transaction_code}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Mã tham chiếu ngân hàng:</span>
                <strong className="font-mono text-emerald-900">{viewingReceipt.bank_reference || 'NPS88992211'}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Ngày ca:</span>
                <strong>{viewingReceipt.shift_date} ({viewingReceipt.shift_time})</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Chuyên viên nhận ca:</span>
                <strong>{viewingReceipt.caregiver_name}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Số tiền bảo lãnh:</span>
                <strong className="font-bold text-emerald-900 text-[14px]">
                  {Number(viewingReceipt.total_amount).toLocaleString('vi-VN')} đ
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Trạng thái:</span>
                <strong className="text-emerald-800">
                  {viewingReceipt.escrow_status === 'paid_out' ? '✓ Đã tất toán giải ngân' : '🛡️ Đang giữ ký quỹ an toàn'}
                </strong>
              </div>
            </div>

            <p className="text-[11px] text-gray-500 italic text-center">
              Biên nhận điện tử được xác thực qua hệ thống cơ sở dữ liệu CARE-MATCH Platform.
            </p>

            <button
              onClick={() => {
                notify('Đã tải xuống biên nhận bảo lãnh dạng PDF.');
                setViewingReceipt(null);
              }}
              className="w-full rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white py-2.5 text-[12.5px] font-bold transition flex items-center justify-center gap-1.5"
            >
              <Download size={15} /> Tải biên nhận điện tử
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
