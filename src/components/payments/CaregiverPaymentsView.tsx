import React, { useState, useEffect } from 'react';
import { 
  Wallet, 
  Building2, 
  CreditCard, 
  CalendarDays, 
  Clock, 
  CheckCircle2, 
  Hourglass, 
  RefreshCw, 
  Edit3, 
  ArrowUpRight, 
  ShieldCheck, 
  Banknote, 
  Check, 
  AlertCircle,
  X,
  Sparkles,
  Info
} from 'lucide-react';

const API = 'http://localhost:5000/api';

interface CaregiverPaymentsViewProps {
  currentUser?: { id: number; full_name?: string; email?: string; phone?: string };
  notify: (msg: string) => void;
}

export function CaregiverPaymentsView({ currentUser, notify }: CaregiverPaymentsViewProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    shifts: any[];
    bank_account: {
      bank_name: string;
      account_number: string;
      account_holder: string;
      branch?: string;
    } | null;
    stats: {
      total_shifts: number;
      gross_earnings: number;
      platform_fee: number;
      net_earnings: number;
      paid_out_amount: number;
      in_escrow_amount: number;
      pending_family_amount: number;
    };
  }>({
    shifts: [],
    bank_account: null,
    stats: {
      total_shifts: 0,
      gross_earnings: 0,
      platform_fee: 0,
      net_earnings: 0,
      paid_out_amount: 0,
      in_escrow_amount: 0,
      pending_family_amount: 0
    }
  });

  // Modal cập nhật tài khoản ngân hàng
  const [showBankModal, setShowBankModal] = useState(false);
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [savingBank, setSavingBank] = useState(false);

  // Modal thông báo chi tiết giải ngân
  const [viewingPayout, setViewingPayout] = useState<any | null>(null);

  const loadData = async () => {
    if (!currentUser?.id) return;
    try {
      setLoading(true);
      const res = await fetch(`${API}/payments/caregiver/${currentUser.id}`);
      if (res.ok) {
        const d = await res.json();
        setData(d);
        if (d.bank_account) {
          setBankName(d.bank_account.bank_name);
          setAccountNumber(d.bank_account.account_number);
          setAccountHolder(d.bank_account.account_holder);
        } else {
          setBankName('Ngân hàng Ngoại Thương Việt Nam (Vietcombank)');
          setAccountHolder((currentUser.full_name || 'NGUYEN VAN A').toUpperCase());
        }
      }
    } catch {
      notify('Lỗi tải dữ liệu thu nhập.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser?.id]);

  const handleSaveBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankName.trim() || !accountNumber.trim() || !accountHolder.trim()) {
      notify('Vui lòng điền đầy đủ thông tin ngân hàng.');
      return;
    }
    setSavingBank(true);
    try {
      const res = await fetch(`${API}/caregiver/bank-account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caregiverUserId: currentUser?.id,
          bankName,
          accountNumber,
          accountHolder: accountHolder.toUpperCase()
        })
      });
      if (res.ok) {
        notify('✅ Đã lưu tài khoản ngân hàng nhận thù lao tự động!');
        setShowBankModal(false);
        loadData();
      } else {
        notify('Lỗi khi lưu tài khoản ngân hàng.');
      }
    } catch {
      notify('Lỗi kết nối máy chủ.');
    } finally {
      setSavingBank(false);
    }
  };

  const handleCompleteShift = async (shift: any) => {
    try {
      const res = await fetch(`${API}/payments/confirm-shift-complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduleId: shift.schedule_id,
          paymentId: shift.id
        })
      });
      if (res.ok) {
        notify(`🎉 Ca hoàn thành! Hệ thống đã tự động chuyển ${Number(shift.caregiver_earnings).toLocaleString('vi-VN')} đ (85%) vào tài khoản ${data.bank_account?.bank_name || 'ngân hàng'}.`);
        loadData();
      }
    } catch {
      notify('Lỗi kết nối máy chủ.');
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-[.14em] text-[hsl(var(--primary))]">
            Quản Lý Thù Lao & Thu Nhập · Người Chăm Sóc
          </span>
          <h1 className="mt-1 font-display text-[28px] sm:text-[32px] font-bold text-[#1f3323] leading-tight">
            Thu Nhập Tự Động & Minh Bạch.
          </h1>
          <p className="mt-1 text-[13px] text-gray-600 max-w-2xl">
            Theo dõi chi tiết số ca đã làm, thù lao thực nhận (85%), phí nền tảng (15%) và tài khoản ngân hàng nhận chuyển khoản tự động.
          </p>
        </div>

        <button
          onClick={() => loadData()}
          className="rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-[12px] font-bold text-gray-700 hover:bg-gray-50 transition shadow-2xs flex items-center gap-1.5 self-start md:self-auto cursor-pointer"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Làm mới
        </button>
      </div>

      {/* THÔNG TIN TÀI KHOẢN NGÂN HÀNG THỤ HƯỞNG (GIẢI NGÂN TỰ ĐỘNG) */}
      <div className="rounded-2xl border border-emerald-300 bg-gradient-to-r from-[#1b3422] to-[#25462e] p-5 sm:p-6 text-white shadow-md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-emerald-300 border border-white/15">
              <Building2 size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-emerald-400/20 text-emerald-200 border border-emerald-400/30 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                  Tài khoản nhận tiền tự động
                </span>
                <span className="text-[11px] text-emerald-300/80 flex items-center gap-1">
                  <ShieldCheck size={12} /> Đã kết nối Napas 247
                </span>
              </div>
              <h3 className="font-display font-bold text-[18px] text-white mt-1">
                {data.bank_account ? data.bank_account.bank_name : 'Chưa liên kết tài khoản ngân hàng'}
              </h3>
              <div className="mt-1 flex flex-wrap items-center gap-4 text-[12.5px] text-[#c5ddc2]">
                <span>STK: <strong className="font-mono text-white text-[13.5px]">{data.bank_account?.account_number || '1023948572'}</strong></span>
                <span>Chủ TK: <strong className="text-white uppercase">{data.bank_account?.account_holder || currentUser?.full_name || 'NGUYỄN LAN ANH'}</strong></span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowBankModal(true)}
            className="rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 text-white px-4 py-2 text-[12px] font-bold transition flex items-center gap-1.5 self-start md:self-auto cursor-pointer"
          >
            <Edit3 size={14} /> Chỉnh sửa tài khoản
          </button>
        </div>

        <div className="mt-4 pt-3.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-[11.5px] text-emerald-200/90">
          <span>⚡ <strong>Cơ chế tự động:</strong> Khi ca chăm sóc hoàn thành và được 2 bên xác nhận, hệ thống tự động giải ngân 85% vào tài khoản này trong vòng 1-3 phút.</span>
          <span className="text-[#deb87a] font-semibold">Khấu trừ 15% phí nền tảng vận hành & bảo hiểm ca</span>
        </div>
      </div>

      {/* 4 FINANCIAL KPI CARDS THÁNG NÀY */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {/* THỰC NHẬN CỦA NGƯỜI CHĂM SÓC (85%) */}
        <div className="rounded-2xl border border-emerald-300 bg-gradient-to-br from-emerald-50/90 to-white p-5 shadow-2xs">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-emerald-800">
            <span>Tổng Thực Nhận (85%)</span>
            <span className="rounded-full bg-emerald-200 text-emerald-950 px-2 py-0.5 text-[9.5px]">Sau trừ 15%</span>
          </div>
          <p className="mt-3 font-display text-[26px] sm:text-[30px] font-bold text-emerald-950">
            {data.stats.net_earnings.toLocaleString('vi-VN')} đ
          </p>
          <div className="mt-2 text-[11px] text-emerald-700/90 flex items-center justify-between border-t border-emerald-200/60 pt-1.5">
            <span>Tổng giá trị ca (100%):</span>
            <strong>{data.stats.gross_earnings.toLocaleString('vi-VN')} đ</strong>
          </div>
        </div>

        {/* ĐÃ NHẬN VỀ TÀI KHOẢN (ĐÃ GIẢI NGÂN) */}
        <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50/80 to-white p-5 shadow-2xs">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-blue-800">
            <span>Đã Nhận Về TK Ngân Hàng</span>
            <span className="rounded-full bg-blue-100 text-blue-900 px-2 py-0.5 text-[9.5px]">Hoàn tất</span>
          </div>
          <p className="mt-3 font-display text-[26px] sm:text-[30px] font-bold text-blue-950">
            {data.stats.paid_out_amount.toLocaleString('vi-VN')} đ
          </p>
          <p className="mt-2 text-[11px] text-blue-700/90 flex items-center gap-1 border-t border-blue-200/60 pt-1.5">
            <CheckCircle2 size={12} /> Tiền đã về tài khoản ngân hàng
          </p>
        </div>

        {/* ĐANG CHỜ NHẬN (TIỀN GIỮ KÝ QUỸ) */}
        <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50/80 to-white p-5 shadow-2xs">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-amber-800">
            <span>Chờ Nhận (Ký Quỹ)</span>
            <span className="rounded-full bg-amber-100 text-amber-900 px-2 py-0.5 text-[9.5px]">Gia đình đã nộp</span>
          </div>
          <p className="mt-3 font-display text-[26px] sm:text-[30px] font-bold text-amber-950">
            {data.stats.in_escrow_amount.toLocaleString('vi-VN')} đ
          </p>
          <p className="mt-2 text-[11px] text-amber-700/90 flex items-center gap-1 border-t border-amber-200/60 pt-1.5">
            <Hourglass size={12} /> Sẽ tự động giải ngân khi xong ca
          </p>
        </div>

        {/* SỐ CA & CHIẾT KHẤU SÀN 15% */}
        <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50/80 to-white p-5 shadow-2xs">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-gray-600">
            <span>Ca Tháng Này & Phí Sàn</span>
            <span className="rounded-full bg-gray-200 text-gray-800 px-2 py-0.5 text-[9.5px]">15% Sàn</span>
          </div>
          <p className="mt-3 font-display text-[26px] sm:text-[30px] font-bold text-gray-900">
            {data.stats.total_shifts} ca
          </p>
          <div className="mt-2 text-[11px] text-gray-600 flex items-center justify-between border-t border-gray-200 pt-1.5">
            <span>Phí sàn điều phối (15%):</span>
            <strong className="text-amber-900">{data.stats.platform_fee.toLocaleString('vi-VN')} đ</strong>
          </div>
        </div>
      </div>

      {/* BẢNG KÊ CHI TIẾT TỪNG CA LÀM VIỆC & THÙ LAO */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-2xs overflow-hidden">
        <div className="border-b border-gray-200 px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#fafcf9]">
          <div>
            <h3 className="font-display font-bold text-[16px] text-gray-900">
              Bảng Kê Chi Tiết Thù Lao Từng Ca Làm Việc
            </h3>
            <p className="text-[12px] text-gray-500 mt-0.5">
              Phân tích từng ca: Giá ca gộp (100%), Phí nền tảng (15%), Thực nhận (85%) và Trạng thái giải ngân về số tài khoản.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-gray-500">
            <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-emerald-600" />
            <p className="text-[12.5px]">Đang tải chi tiết thù lao...</p>
          </div>
        ) : data.shifts.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            <CalendarDays size={32} className="mx-auto mb-2 text-gray-300" />
            <p className="text-[13px] font-semibold text-gray-700">Chưa có ca làm việc nào được ghi nhận</p>
            <p className="text-[11.5px] text-gray-400 mt-1">
              Khi gia đình đặt ca và chọn bạn, các ca làm sẽ hiển thị chi tiết tại đây.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[12.5px]">
              <thead>
                <tr className="border-b border-gray-200 bg-[#f7f9f6] text-[11px] font-bold uppercase tracking-wider text-gray-600">
                  <th className="py-3.5 px-5">Mã Giao Dịch</th>
                  <th className="py-3.5 px-4">Lịch Trình Ca</th>
                  <th className="py-3.5 px-4">Gia Đình Thuê</th>
                  <th className="py-3.5 px-4">Giá Ca (100%)</th>
                  <th className="py-3.5 px-4">Phí Sàn (15%)</th>
                  <th className="py-3.5 px-4">Thực Nhận (85%)</th>
                  <th className="py-3.5 px-4">Trạng Thái Giải Ngân</th>
                  <th className="py-3.5 px-5 text-right">Hành Động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.shifts.map((s: any) => {
                  const isPaidOut = s.escrow_status === 'paid_out';
                  const isInEscrow = s.escrow_status === 'in_escrow';
                  const isPending = s.escrow_status === 'pending_payment';

                  return (
                    <tr key={s.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-4 px-5">
                        <span className="font-mono font-bold text-gray-900 text-[12px]">{s.transaction_code}</span>
                        <p className="text-[10.5px] text-gray-400 mt-0.5">
                          {s.created_at ? new Date(s.created_at).toLocaleDateString('vi-VN') : 'Hôm nay'}
                        </p>
                      </td>

                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5 font-bold text-gray-900">
                          <CalendarDays size={13} className="text-emerald-700" />
                          <span>{s.shift_date}</span>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1">
                          <Clock size={11} /> {s.shift_time}
                        </p>
                      </td>

                      <td className="py-4 px-4">
                        <p className="font-bold text-gray-900">{s.family_name || 'Gia đình'}</p>
                        <p className="text-[11px] text-gray-500">Chăm sóc: {s.patient_name || 'Người thân'}</p>
                      </td>

                      <td className="py-4 px-4 text-gray-600 font-semibold whitespace-nowrap">
                        {Number(s.total_amount).toLocaleString('vi-VN')} đ
                      </td>

                      <td className="py-4 px-4 text-amber-800 font-medium whitespace-nowrap text-[12px]">
                        -{Number(s.platform_fee).toLocaleString('vi-VN')} đ
                      </td>

                      <td className="py-4 px-4 font-bold text-emerald-900 whitespace-nowrap text-[14px]">
                        +{Number(s.caregiver_earnings).toLocaleString('vi-VN')} đ
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">
                        {isPaidOut && (
                          <div>
                            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold bg-blue-100 text-blue-900 border border-blue-300">
                              <CheckCircle2 size={11} /> Đã nhận về TK ngân hàng
                            </span>
                            <p className="text-[10px] text-blue-700 font-mono mt-0.5">Mã GD: {s.bank_reference || 'NPS192847'}</p>
                          </div>
                        )}
                        {isInEscrow && (
                          <div>
                            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                              <ShieldCheck size={11} /> Đang giữ ký quỹ (An toàn)
                            </span>
                            <p className="text-[10px] text-emerald-700 mt-0.5">Tự động chuyển khi xong ca</p>
                          </div>
                        )}
                        {isPending && (
                          <div>
                            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                              <Hourglass size={11} /> Chờ gia đình thanh toán
                            </span>
                            <p className="text-[10px] text-amber-700 mt-0.5">Yêu cầu trước ca 1 ngày</p>
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-5 text-right whitespace-nowrap">
                        {isInEscrow && (
                          <button
                            onClick={() => handleCompleteShift(s)}
                            className="rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1.5 text-[11.5px] font-bold shadow-2xs transition cursor-pointer"
                          >
                            Xong ca & Nhận tiền
                          </button>
                        )}
                        {isPaidOut && (
                          <button
                            onClick={() => setViewingPayout(s)}
                            className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-gray-700 hover:bg-gray-50 transition cursor-pointer"
                          >
                            Xem sao kê
                          </button>
                        )}
                        {isPending && (
                          <span className="text-[11px] text-gray-400 italic">Chờ xác nhận</span>
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

      {/* MODAL CẬP NHẬT TÀI KHOẢN NGÂN HÀNG */}
      {showBankModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden border border-gray-100 p-6 space-y-4 animate-rise">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Building2 size={20} className="text-emerald-700" />
                <h4 className="font-display font-bold text-[16px] text-gray-900">Cập Nhật Tài Khoản Ngân Hàng</h4>
              </div>
              <button onClick={() => setShowBankModal(false)} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveBank} className="space-y-4">
              <div>
                <label className="block text-[12px] font-bold text-gray-700 mb-1">
                  Tên ngân hàng thụ hưởng *
                </label>
                <select
                  value={bankName}
                  onChange={e => setBankName(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 p-2.5 text-[13px] outline-none focus:border-emerald-600 bg-white"
                >
                  <option value="Ngân hàng Ngoại Thương Việt Nam (Vietcombank)">Vietcombank (Ngoại thương)</option>
                  <option value="Ngân hàng Quân Đội (MB Bank)">MB Bank (Quân Đội)</option>
                  <option value="Ngân hàng Kỹ Thương Việt Nam (Techcombank)">Techcombank (Kỹ thương)</option>
                  <option value="Ngân hàng Đầu tư & Phát triển Việt Nam (BIDV)">BIDV</option>
                  <option value="Ngân hàng Nông nghiệp & Phát triển Nông thôn (Agribank)">Agribank</option>
                  <option value="Ngân hàng Công Thương Việt Nam (VietinBank)">VietinBank</option>
                  <option value="Ngân hàng Á Châu (ACB)">ACB</option>
                  <option value="Ngân hàng Tiên Phong (TPBank)">TPBank</option>
                  <option value="Ngân hàng Việt Nam Thịnh Vượng (VPBank)">VPBank</option>
                </select>
              </div>

              <div>
                <label className="block text-[12px] font-bold text-gray-700 mb-1">
                  Số tài khoản ngân hàng *
                </label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={e => setAccountNumber(e.target.value)}
                  placeholder="Nhập số tài khoản ngân hàng của bạn"
                  className="w-full rounded-xl border border-gray-300 p-2.5 text-[13px] font-mono outline-none focus:border-emerald-600"
                  required
                />
              </div>

              <div>
                <label className="block text-[12px] font-bold text-gray-700 mb-1">
                  Họ và tên chủ tài khoản (Không dấu) *
                </label>
                <input
                  type="text"
                  value={accountHolder}
                  onChange={e => setAccountHolder(e.target.value.toUpperCase())}
                  placeholder="VD: NGUYEN VAN A"
                  className="w-full rounded-xl border border-gray-300 p-2.5 text-[13px] uppercase outline-none focus:border-emerald-600 font-semibold"
                  required
                />
                <p className="text-[10.5px] text-gray-500 mt-1">
                  Tên chủ tài khoản phải trùng khớp với Căn cước công dân (eKYC) của bạn.
                </p>
              </div>

              <div className="border-t pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowBankModal(false)}
                  className="rounded-xl border border-gray-300 px-4 py-2 text-[12px] font-bold text-gray-600 hover:bg-gray-100 transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={savingBank}
                  className="rounded-xl bg-emerald-700 text-white px-5 py-2 text-[12px] font-bold hover:bg-emerald-800 transition flex items-center gap-1.5"
                >
                  {savingBank ? <RefreshCw size={14} className="animate-spin" /> : <Check size={15} />}
                  Lưu tài khoản
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL XEM SAO KÊ CHI TIẾT */}
      {viewingPayout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden border border-gray-100 p-6 space-y-4 animate-rise">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={20} className="text-blue-600" />
                <h4 className="font-display font-bold text-[16px] text-gray-900">Sao Kê Giải Ngân Thù Lao</h4>
              </div>
              <button onClick={() => setViewingPayout(null)} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>

            <div className="rounded-xl bg-blue-50/50 border border-blue-200 p-4 text-[12px] space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Mã giao dịch giải ngân:</span>
                <strong className="font-mono text-blue-900">{viewingPayout.bank_reference || 'NPS192847'}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Mã ca chăm sóc:</span>
                <strong className="font-mono text-gray-800">{viewingPayout.transaction_code}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Ngày ca:</span>
                <strong>{viewingPayout.shift_date} ({viewingPayout.shift_time})</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Tổng thù lao ca:</span>
                <strong>{Number(viewingPayout.total_amount).toLocaleString('vi-VN')} đ</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Phí sàn CARE-MATCH (15%):</span>
                <strong className="text-amber-800">-{Number(viewingPayout.platform_fee).toLocaleString('vi-VN')} đ</strong>
              </div>
              <div className="flex justify-between border-t border-blue-200 pt-2 text-[13.5px]">
                <span className="font-bold text-gray-800">Thực nhận về tài khoản:</span>
                <strong className="font-bold text-emerald-900">
                  +{Number(viewingPayout.caregiver_earnings).toLocaleString('vi-VN')} đ
                </strong>
              </div>
            </div>

            <div className="rounded-xl bg-gray-50 p-3 text-[11.5px] space-y-1">
              <p className="text-gray-500">Chuyển vào tài khoản:</p>
              <p className="font-semibold text-gray-900">{data.bank_account?.bank_name || 'Vietcombank'}</p>
              <p className="font-mono text-gray-700">{data.bank_account?.account_number || '1023948572'} · {data.bank_account?.account_holder || currentUser?.full_name}</p>
            </div>

            <button
              onClick={() => setViewingPayout(null)}
              className="w-full rounded-xl bg-blue-700 hover:bg-blue-800 text-white py-2 text-[12px] font-bold transition"
            >
              Đóng cửa sổ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
