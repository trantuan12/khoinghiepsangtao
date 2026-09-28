import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  CheckCircle2, 
  Hourglass, 
  Building2, 
  CreditCard, 
  Crown, 
  RefreshCw, 
  Search, 
  Filter, 
  ArrowUpRight, 
  ShieldCheck, 
  CalendarDays, 
  Clock, 
  User, 
  Info,
  Check,
  X,
  Download
} from 'lucide-react';
import { API } from '@/lib/apiConfig';

interface AdminPaymentsViewProps {
  notify: (msg: string) => void;
}

export function AdminPaymentsView({ notify }: AdminPaymentsViewProps) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total_gmv: 0,
    total_revenue: 0,
    platform_fee_total: 0,
    vip_revenue: 0,
    caregiver_paid_total: 0,
    escrow_holding_total: 0,
    pending_family_total: 0,
    active_vip_count: 0,
    total_shift_count: 0
  });

  const [monthlyChartData, setMonthlyChartData] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid_out' | 'in_escrow' | 'pending_payment'>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [lastSync, setLastSync] = useState('');

  const loadData = async (isManual = false) => {
    try {
      if (isManual) setLoading(true);
      const res = await fetch(`${API}/admin/payments/dashboard`);
      if (res.ok) {
        const d = await res.json();
        setStats(d.stats || {});
        setMonthlyChartData(d.monthly_chart_data || []);
        setTransactions(d.transactions || []);
        setLastSync(new Date().toLocaleTimeString('vi-VN'));
        if (isManual) notify('Đã cập nhật doanh thu & biểu đồ cột thành công!');
      }
    } catch {
      if (isManual) notify('Lỗi khi tải dữ liệu thanh toán.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(false), 5000);
    const onScheduleUpdated = () => loadData(false);
    const onPaymentUpdated = () => loadData(false);
    window.addEventListener('schedule-updated', onScheduleUpdated);
    window.addEventListener('payment-updated', onPaymentUpdated);
    window.addEventListener('vip-updated', onPaymentUpdated);
    window.addEventListener('storage', onPaymentUpdated);
    return () => {
      clearInterval(interval);
      window.removeEventListener('schedule-updated', onScheduleUpdated);
      window.removeEventListener('payment-updated', onPaymentUpdated);
      window.removeEventListener('vip-updated', onPaymentUpdated);
      window.removeEventListener('storage', onPaymentUpdated);
    };
  }, []);

  const handleManualRelease = async (id: number) => {
    try {
      const res = await fetch(`${API}/admin/payments/${id}/release-payout`, {
        method: 'POST'
      });
      if (res.ok) {
        notify('✅ Đã giải ngân thù lao cho Người chăm sóc thành công!');
        loadData();
      } else {
        notify('Không thể giải ngân khoản này.');
      }
    } catch {
      notify('Lỗi máy chủ khi giải ngân.');
    }
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const kw = searchTerm.toLowerCase().trim();
      const matchSearch = !kw ||
        (t.transaction_code && t.transaction_code.toLowerCase().includes(kw)) ||
        (t.family_name && t.family_name.toLowerCase().includes(kw)) ||
        (t.caregiver_name && t.caregiver_name.toLowerCase().includes(kw)) ||
        (t.patient_name && t.patient_name.toLowerCase().includes(kw));

      const matchStatus = statusFilter === 'all' || t.escrow_status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [transactions, searchTerm, statusFilter]);

  // Tìm giá trị max trong biểu đồ cột để tính tỷ lệ % chiều cao
  const maxChartValue = useMemo(() => {
    if (!monthlyChartData.length) return 10000000;
    const maxVal = Math.max(...monthlyChartData.map(m => Math.max(Number(m.paid_amount) || 0, Number(m.pending_amount) || 0)));
    return Math.max(maxVal * 1.15, 10000000);
  }, [monthlyChartData]);

  // Xuất file CSV Báo cáo giao dịch ký quỹ tài chính thực tế tải về máy tính
  const handleExportCsv = async () => {
    try {
      notify('Đang tải file Báo cáo giao dịch ký quỹ về máy tính...');
      const res = await fetch(`${API}/export/transactions-csv`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'Bao_Cao_Giao_Dich_Ky_Quy_CareMatch_2026.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        notify('✅ Đã tải file Báo cáo giao dịch tài chính về máy thành công!');
        return;
      }
    } catch {
      // Fallback nếu server fetch trục trặc
    }

    // Client-side fallback CSV download
    if (transactions.length === 0) {
      notify('Chưa có dữ liệu để xuất file CSV.');
      return;
    }

    const header = [
      'Mã Giao Dịch',
      'Ngày Ca',
      'Gia Đình Đặt Ca',
      'Người Chăm Sóc',
      'Bệnh Nhân/Người Thân',
      'Tổng Tiền Ký Quỹ (VNĐ)',
      'Phí Nền Tảng 15% (VNĐ)',
      'Thực Nhận Điều Dưỡng 85% (VNĐ)',
      'Trạng Thái Ký Quỹ',
      'Phương Thức',
      'Mã Đối Soát'
    ];

    const escape = (val: any) => `"${String(val ?? '').replace(/"/g, '""')}"`;
    const csvLines = [header.join(',')];

    for (const t of transactions) {
      const line = [
        escape(t.transaction_code),
        escape(t.shift_date || ''),
        escape(t.family_name || 'Gia đình'),
        escape(t.caregiver_name || 'Người chăm sóc'),
        escape(t.patient_name || ''),
        escape(Number(t.total_amount).toLocaleString('vi-VN')),
        escape(Number(t.platform_fee).toLocaleString('vi-VN')),
        escape(Number(t.caregiver_earnings).toLocaleString('vi-VN')),
        escape(t.escrow_status === 'paid_out' ? 'Đã giải ngân' : t.escrow_status === 'in_escrow' ? 'Đang giữ ký quỹ' : 'Chờ nộp quỹ'),
        escape(t.payment_method || 'Chuyển khoản'),
        escape(t.bank_reference || 'N/A')
      ];
      csvLines.push(line.join(','));
    }

    const csvContent = '\uFEFF' + csvLines.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'Bao_Cao_Giao_Dich_Ky_Quy_CareMatch_2026.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    notify('✅ Đã tải file Báo cáo giao dịch tài chính về máy thành công!');
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-[.14em] text-[hsl(var(--primary))]">
            Trung Tâm Tài Chính & Dòng Tiền Nền Tảng · Admin Portal
          </span>
          <h1 className="mt-1 font-display text-[28px] sm:text-[32px] font-bold text-[#1f3323] leading-tight">
            Quản Lý Doanh Thu & Ký Quỹ Toàn Hệ Thống.
          </h1>
          <p className="mt-1 text-[13px] text-gray-600 max-w-2xl">
            Biểu đồ cột phân tích thu nhập qua từng tháng: thể hiện rõ khoản đã thanh toán và khoản chưa thanh toán / đang giữ ký quỹ an toàn.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-800 shadow-2xs">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
            Đồng bộ hệ thống {lastSync ? `· ${lastSync}` : 'Tự động'}
          </span>
          <button
            onClick={handleExportCsv}
            className="rounded-xl border border-emerald-700 bg-emerald-800 hover:bg-emerald-900 text-white px-3.5 py-1.5 text-[12px] font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
            title="Tải file CSV báo cáo tài chính về máy tính"
          >
            <Download size={14} /> Xuất file CSV
          </button>
          <button
            onClick={() => loadData(true)}
            className="rounded-xl border border-gray-200 bg-white px-3.5 py-1.5 text-[12px] font-bold text-gray-700 hover:bg-gray-50 transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Làm mới
          </button>
        </div>
      </div>

      {/* 5 FINANCIAL KPI CARDS */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {/* TỔNG GIÁ TRỊ GIAO DỊCH GMV */}
        <div className="rounded-2xl bg-gradient-to-br from-[#1c3322] to-[#2a4d33] p-5 text-white shadow-md">
          <div className="flex items-center justify-between opacity-80 text-[10.5px] font-bold uppercase tracking-wider">
            <span>Tổng Giá Trị Giao Dịch</span>
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-[9px]">GMV</span>
          </div>
          <p className="mt-2.5 font-display text-[24px] sm:text-[26px] font-bold text-white tracking-tight">
            {stats.total_gmv.toLocaleString('vi-VN')} đ
          </p>
          <div className="mt-2 text-[10.5px] text-[#c3dec0] border-t border-white/15 pt-1.5 flex justify-between">
            <span>Doanh thu nền tảng:</span>
            <strong className="text-white">{stats.total_revenue.toLocaleString('vi-VN')} đ</strong>
          </div>
        </div>

        {/* DOANH THU SÀN (15% PHÍ + VIP) */}
        <div className="rounded-2xl border border-emerald-300 bg-gradient-to-br from-emerald-50/90 to-white p-5 shadow-2xs">
          <div className="flex items-center justify-between text-[10.5px] font-bold uppercase tracking-wider text-emerald-800">
            <span>Lợi Nhuận Nền Tảng</span>
            <span className="rounded-full bg-emerald-200 text-emerald-950 px-2 py-0.5 text-[9px] font-bold">Thực thu sàn</span>
          </div>
          <p className="mt-2.5 font-display text-[24px] sm:text-[26px] font-bold text-emerald-950">
            {stats.total_revenue.toLocaleString('vi-VN')} đ
          </p>
          <div className="mt-2 text-[10.5px] text-emerald-700 flex justify-between border-t border-emerald-200/60 pt-1.5">
            <span>15% Phí ca: {stats.platform_fee_total.toLocaleString('vi-VN')} đ</span>
            <span>VIP: {stats.vip_revenue.toLocaleString('vi-VN')} đ</span>
          </div>
        </div>

        {/* TIỀN ĐÃ GIẢI NGÂN CHO NGƯỜI CHĂM SÓC (85%) */}
        <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50/80 to-white p-5 shadow-2xs">
          <div className="flex items-center justify-between text-[10.5px] font-bold uppercase tracking-wider text-blue-800">
            <span>Đã Giải Ngân Cho Caregiver</span>
            <span className="rounded-full bg-blue-100 text-blue-900 px-2 py-0.5 text-[9px]">85% Thù lao</span>
          </div>
          <p className="mt-2.5 font-display text-[24px] sm:text-[26px] font-bold text-blue-950">
            {stats.caregiver_paid_total.toLocaleString('vi-VN')} đ
          </p>
          <p className="mt-2 text-[10.5px] text-blue-700 border-t border-blue-200/60 pt-1.5">
            Đã chuyển khoản ngân hàng tự động
          </p>
        </div>

        {/* TIỀN ĐANG GIỮ KÝ QUỸ AN TOÀN (ESCROW) */}
        <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50/80 to-white p-5 shadow-2xs">
          <div className="flex items-center justify-between text-[10.5px] font-bold uppercase tracking-wider text-amber-800">
            <span>Đang Giữ Ký Quỹ</span>
            <span className="rounded-full bg-amber-100 text-amber-900 px-2 py-0.5 text-[9px]">Bảo lãnh</span>
          </div>
          <p className="mt-2.5 font-display text-[24px] sm:text-[26px] font-bold text-amber-950">
            {stats.escrow_holding_total.toLocaleString('vi-VN')} đ
          </p>
          <p className="mt-2 text-[10.5px] text-amber-700 border-t border-amber-200/60 pt-1.5 flex items-center gap-1">
            <ShieldCheck size={11} /> Giữ an toàn chờ hoàn thành ca
          </p>
        </div>

        {/* GIA ĐÌNH CHƯA THANH TOÁN (CẦN THU TRƯỚC CA 1 NGÀY) */}
        <div className="rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50/70 to-white p-5 shadow-2xs">
          <div className="flex items-center justify-between text-[10.5px] font-bold uppercase tracking-wider text-rose-800">
            <span>Chưa Thanh Toán</span>
            <span className="rounded-full bg-rose-100 text-rose-900 px-2 py-0.5 text-[9px]">Cần thu trước ca</span>
          </div>
          <p className="mt-2.5 font-display text-[24px] sm:text-[26px] font-bold text-rose-950">
            {stats.pending_family_total.toLocaleString('vi-VN')} đ
          </p>
          <p className="mt-2 text-[10.5px] text-rose-700 border-t border-rose-200/60 pt-1.5 flex items-center gap-1">
            <Clock size={11} /> Ca sắp tới chưa nộp giữ chỗ
          </p>
        </div>
      </div>

      {/* ======================================================== */}
      {/* BIỂU ĐỒ CỘT THU NHẬP THEO TỪNG THÁNG (YÊU CẦU ĐẶC BIỆT CỦA USER) */}
      {/* ======================================================== */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-2xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 size={20} className="text-emerald-700" />
              <h3 className="font-display font-bold text-[18px] text-gray-900">
                Biểu Đồ Cột Phân Tích Thu Nhập Qua Từng Tháng
              </h3>
            </div>
            <p className="text-[12.5px] text-gray-500 mt-0.5">
              So sánh trực quan giữa <strong>Khoản Đã Thanh Toán</strong> (Đã thu & giải ngân) và <strong>Khoản Chưa Thanh Toán / Đang Giữ Ký Quỹ</strong>.
            </p>
          </div>

          {/* CHÚ THÍCH BIỂU ĐỒ (LEGEND) */}
          <div className="flex items-center gap-4 text-[12px] bg-gray-50 px-3.5 py-1.5 rounded-xl border border-gray-200">
            <div className="flex items-center gap-1.5">
              <span className="h-3.5 w-3.5 rounded bg-emerald-600 shadow-2xs" />
              <span className="font-semibold text-gray-800">Khoản Đã Thanh Toán</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3.5 w-3.5 rounded bg-amber-500 shadow-2xs" />
              <span className="font-semibold text-gray-800">Khoản Chưa Thanh Toán / Ký Quỹ</span>
            </div>
          </div>
        </div>

        {/* KHUNG BIỂU ĐỒ CỘT (CSS & SVG RICH COLUMN CHART) */}
        <div className="pt-4 pb-2">
          <div className="h-[280px] w-full flex items-end justify-between gap-3 sm:gap-6 px-2 sm:px-6 border-b border-gray-200">
            {monthlyChartData.map((item, idx) => {
              const paidHeight = Math.max(12, Math.round((item.paid_amount / maxChartValue) * 230));
              const pendingHeight = Math.max(12, Math.round((item.pending_amount / maxChartValue) * 230));

              return (
                <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                  {/* CẶP 2 CỘT CHO MỖI THÁNG */}
                  <div className="w-full flex items-end justify-center gap-1.5 sm:gap-3">
                    {/* CỘT 1: ĐÃ THANH TOÁN (XANH LÁ) */}
                    <div 
                      className="w-1/2 max-w-[36px] bg-gradient-to-t from-emerald-700 via-emerald-600 to-emerald-500 rounded-t-lg transition-all duration-500 hover:brightness-110 shadow-sm relative cursor-pointer"
                      style={{ height: `${paidHeight}px` }}
                    >
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow whitespace-nowrap z-20 pointer-events-none">
                        {(item.paid_amount / 1000000).toFixed(1)} tr đ
                      </div>
                    </div>

                    {/* CỘT 2: CHƯA THANH TOÁN / KÝ QUỸ (HỔ PHÁCH) */}
                    <div 
                      className="w-1/2 max-w-[36px] bg-gradient-to-t from-amber-600 via-amber-500 to-amber-400 rounded-t-lg transition-all duration-500 hover:brightness-110 shadow-sm relative cursor-pointer"
                      style={{ height: `${pendingHeight}px` }}
                    >
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow whitespace-nowrap z-20 pointer-events-none">
                        {(item.pending_amount / 1000000).toFixed(1)} tr đ
                      </div>
                    </div>
                  </div>

                  {/* NHÃN THÁNG DƯỚI CHÂN CỘT */}
                  <div className="mt-3 text-center">
                    <p className="text-[12px] font-bold text-gray-800">{item.label}</p>
                    <p className="text-[10px] text-gray-400">{item.year}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* BẢNG SỐ LIỆU PHÂN TÍCH TỪNG THÁNG TRONG NĂM */}
        <div className="overflow-x-auto rounded-xl border border-gray-100 bg-[#fafcf9]">
          <table className="w-full text-left border-collapse text-[12px]">
            <thead>
              <tr className="border-b border-gray-200 text-[10.5px] font-bold uppercase tracking-wider text-gray-500 bg-gray-50/70">
                <th className="py-2.5 px-4">Tháng</th>
                <th className="py-2.5 px-3">Tổng Thu Ca & Gói</th>
                <th className="py-2.5 px-3 text-emerald-800">Khoản Đã Thanh Toán</th>
                <th className="py-2.5 px-3 text-amber-800">Khoản Chưa Thanh Toán / Ký Quỹ</th>
                <th className="py-2.5 px-3">Phí Nền Tảng (15%)</th>
                <th className="py-2.5 px-3">Gói VIP (300k)</th>
                <th className="py-2.5 px-4 text-right">Tỷ Lệ Thu Hồi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {monthlyChartData.map((m, i) => {
                const total = (Number(m.paid_amount) || 0) + (Number(m.pending_amount) || 0);
                const rate = total > 0 ? Math.round(((Number(m.paid_amount) || 0) / total) * 100) : 100;
                return (
                  <tr key={i} className="hover:bg-white transition-colors">
                    <td className="py-3 px-4 font-bold text-gray-900">{m.label} ({m.year})</td>
                    <td className="py-3 px-3 font-semibold text-gray-800">{total.toLocaleString('vi-VN')} đ</td>
                    <td className="py-3 px-3 font-bold text-emerald-900">{Number(m.paid_amount).toLocaleString('vi-VN')} đ</td>
                    <td className="py-3 px-3 font-bold text-amber-900">{Number(m.pending_amount).toLocaleString('vi-VN')} đ</td>
                    <td className="py-3 px-3 text-gray-600 font-medium">{Number(m.platform_fee).toLocaleString('vi-VN')} đ</td>
                    <td className="py-3 px-3 text-amber-700 font-semibold">{Number(m.vip_revenue).toLocaleString('vi-VN')} đ</td>
                    <td className="py-3 px-4 text-right">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-bold ${
                        rate >= 85 ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900'
                      }`}>
                        {rate}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ======================================================== */}
      {/* BẢNG CHI TIẾT TẤT CẢ GIAO DỊCH KÝ QUỸ & ĐIỀU PHỐI TÀI CHÍNH */}
      {/* ======================================================== */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-2xs overflow-hidden">
        <div className="border-b border-gray-200 p-4 sm:p-5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-[#fafcf9]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12px] font-bold text-gray-700">Lọc trạng thái:</span>
            <button
              onClick={() => setStatusFilter('all')}
              className={`rounded-lg px-3 py-1.5 text-[11.5px] font-bold transition ${
                statusFilter === 'all' ? 'bg-emerald-800 text-white shadow-xs' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              Tất cả ({transactions.length})
            </button>
            <button
              onClick={() => setStatusFilter('paid_out')}
              className={`rounded-lg px-3 py-1.5 text-[11.5px] font-bold transition ${
                statusFilter === 'paid_out' ? 'bg-blue-800 text-white shadow-xs' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              ✓ Đã giải ngân
            </button>
            <button
              onClick={() => setStatusFilter('in_escrow')}
              className={`rounded-lg px-3 py-1.5 text-[11.5px] font-bold transition ${
                statusFilter === 'in_escrow' ? 'bg-emerald-700 text-white shadow-xs' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              🛡️ Đang ký quỹ (An toàn)
            </button>
            <button
              onClick={() => setStatusFilter('pending_payment')}
              className={`rounded-lg px-3 py-1.5 text-[11.5px] font-bold transition ${
                statusFilter === 'pending_payment' ? 'bg-amber-600 text-white shadow-xs' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              ⏳ Chưa thanh toán
            </button>
          </div>

          <div className="relative min-w-[260px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Tìm mã GD, gia đình, người chăm sóc..."
              className="w-full rounded-xl border border-gray-200 bg-white py-1.5 pl-9 pr-3 text-[12px] outline-none focus:border-emerald-600"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[12.5px]">
            <thead>
              <tr className="border-b border-gray-200 bg-[#f7f9f6] text-[11px] font-bold uppercase tracking-wider text-gray-600">
                <th className="py-3.5 px-5">Mã Giao Dịch</th>
                <th className="py-3.5 px-4">Lịch Trình</th>
                <th className="py-3.5 px-4">Gia Đình Thanh Toán</th>
                <th className="py-3.5 px-4">Người Chăm Sóc</th>
                <th className="py-3.5 px-3">Tổng Thu</th>
                <th className="py-3.5 px-3">Phí Sàn 15%</th>
                <th className="py-3.5 px-3">Thù Lao 85%</th>
                <th className="py-3.5 px-4">Trạng Thái Ký Quỹ</th>
                <th className="py-3.5 px-5 text-right">Thao Tác Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredTransactions.map(tx => {
                const isPaidOut = tx.escrow_status === 'paid_out';
                const isInEscrow = tx.escrow_status === 'in_escrow';
                const isPending = tx.escrow_status === 'pending_payment';

                return (
                  <tr key={tx.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-4 px-5">
                      <span className="font-mono font-bold text-gray-900">{tx.transaction_code}</span>
                      <p className="text-[10.5px] text-gray-400 mt-0.5">
                        {tx.created_at ? new Date(tx.created_at).toLocaleDateString('vi-VN') : ''}
                      </p>
                    </td>

                    <td className="py-4 px-4">
                      <p className="font-semibold text-gray-900">{tx.shift_date}</p>
                      <p className="text-[11px] text-gray-500">{tx.shift_time}</p>
                    </td>

                    <td className="py-4 px-4">
                      <p className="font-bold text-gray-900">{tx.family_name || 'Gia đình'}</p>
                      <p className="text-[10.5px] text-gray-500">{tx.family_phone || ''}</p>
                    </td>

                    <td className="py-4 px-4">
                      <p className="font-semibold text-gray-900">{tx.caregiver_name}</p>
                      <p className="text-[10.5px] text-gray-500 font-mono">
                        {tx.cg_bank_name ? `${tx.cg_bank_name.split(' ')[0]} · ${tx.cg_acc_number}` : 'Đã gắn TK'}
                      </p>
                    </td>

                    <td className="py-4 px-3 font-semibold text-gray-800 whitespace-nowrap">
                      {Number(tx.total_amount).toLocaleString('vi-VN')} đ
                    </td>

                    <td className="py-4 px-3 font-bold text-emerald-800 whitespace-nowrap">
                      +{Number(tx.platform_fee).toLocaleString('vi-VN')} đ
                    </td>

                    <td className="py-4 px-3 font-bold text-blue-900 whitespace-nowrap">
                      {Number(tx.caregiver_earnings).toLocaleString('vi-VN')} đ
                    </td>

                    <td className="py-4 px-4 whitespace-nowrap">
                      {isPaidOut && (
                        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10.5px] font-bold bg-blue-100 text-blue-900 border border-blue-300">
                          <CheckCircle2 size={11} /> Đã giải ngân (85%)
                        </span>
                      )}
                      {isInEscrow && (
                        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10.5px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                          <ShieldCheck size={11} /> Đang giữ an toàn
                        </span>
                      )}
                      {isPending && (
                        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10.5px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                          <Hourglass size={11} /> Chờ nộp trước ca
                        </span>
                      )}
                    </td>

                    <td className="py-4 px-5 text-right whitespace-nowrap">
                      {isInEscrow ? (
                        <button
                          onClick={() => handleManualRelease(tx.id)}
                          className="rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1.5 text-[11px] font-bold shadow-2xs transition cursor-pointer"
                        >
                          Duyệt giải ngân
                        </button>
                      ) : isPaidOut ? (
                        <span className="text-[11px] font-mono text-gray-400">
                          Ref: {tx.bank_reference || 'NPS192837'}
                        </span>
                      ) : (
                        <span className="text-[11px] text-amber-800 font-medium">Nhắc nộp tiền ca</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
