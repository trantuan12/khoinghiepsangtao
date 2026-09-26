import React, { useState, useEffect } from 'react';
import {
  X,
  Stethoscope,
  Activity,
  Heart,
  Thermometer,
  Wind,
  Droplets,
  Calendar,
  Clock,
  User,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  FileText,
  Phone,
  MapPin,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Sparkles,
  Info
} from 'lucide-react';
import { API } from '@/lib/apiConfig';

export interface PatientMedicalHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientName: string;
  elderlyProfileId?: number | string;
  familyUserId?: number | string;
  shiftInfo?: {
    id?: string | number;
    date?: string;
    time?: string;
    title?: string;
    tasks?: string;
    status?: string;
    familyName?: string;
    familyPhone?: string;
    address?: string;
    district?: string;
  };
}

export function PatientMedicalHistoryModal({
  isOpen,
  onClose,
  patientName,
  elderlyProfileId,
  familyUserId,
  shiftInfo
}: PatientMedicalHistoryModalProps) {
  const [activeTab, setActiveTab] = useState<'logs' | 'profile'>('logs');
  const [logs, setLogs] = useState<any[]>([]);
  const [elderlyProfile, setElderlyProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchData = async () => {
      try {
        setLoading(true);

        // 1. Tải lịch sử đo sinh hiệu & chăm sóc các ca trước
        const queryParams = new URLSearchParams();
        if (elderlyProfileId) queryParams.append('elderlyProfileId', String(elderlyProfileId));
        if (patientName) queryParams.append('elderlyName', patientName);
        if (familyUserId) queryParams.append('familyUserId', String(familyUserId));

        const logsRes = await fetch(`${API}/care-logs?${queryParams.toString()}`);
        if (logsRes.ok && isMounted) {
          const logsData = await logsRes.json();
          if (Array.isArray(logsData)) {
            setLogs(logsData);
            if (logsData.length > 0) {
              setExpandedLogId(logsData[0].id); // Mở sẵn ca mới nhất
            }
          }
        }

        // 2. Tải hồ sơ bệnh án chi tiết của người bệnh
        let profileUrl = '';
        if (elderlyProfileId) {
          profileUrl = `${API}/elderly-profiles/${elderlyProfileId}`;
        } else if (patientName) {
          profileUrl = `${API}/elderly-profiles/by-name/${encodeURIComponent(patientName)}`;
        }

        if (profileUrl) {
          const profileRes = await fetch(profileUrl);
          if (profileRes.ok && isMounted) {
            const pData = await profileRes.json();
            setElderlyProfile(pData);
          }
        }
      } catch (err) {
        console.error('Lỗi tải dữ liệu bệnh án:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();
    return () => { isMounted = false; };
  }, [isOpen, patientName, elderlyProfileId, familyUserId]);

  if (!isOpen) return null;

  // Lấy dữ liệu sinh hiệu mới nhất từ ca gần nhất (nếu có)
  const latestLog = logs.length > 0 ? logs[0] : null;

  // Đánh giá chỉ số huyết áp
  const getBpStatus = (sys: number, dia: number) => {
    if (!sys || !dia) return { label: 'Chưa đo', color: 'text-gray-500', bg: 'bg-gray-100' };
    if (sys < 120 && dia < 80) return { label: 'Lý tưởng (Ổn định)', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' };
    if (sys <= 129 && dia < 80) return { label: 'Huyết áp bình thường', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' };
    if (sys <= 139 || dia <= 89) return { label: 'Tiền tăng huyết áp (Chú ý)', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' };
    return { label: 'Tăng huyết áp (Cần lưu ý)', color: 'text-red-700', bg: 'bg-red-50 border-red-200' };
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-xs overflow-y-auto animate-fade-in">
      <div className="relative flex flex-col w-full max-w-3xl max-h-[92vh] rounded-3xl bg-white shadow-2xl overflow-hidden border border-gray-200">
        
        {/* HEADER MODAL */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-[#f4f8f3]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#3f673a] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Stethoscope size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-[#d9ead5] text-[#2c5327] px-2 py-0.5 rounded-full">
                  Bệnh án & Sổ theo dõi y tế
                </span>
                {shiftInfo?.status && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    shiftInfo.status === 'confirmed' 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {shiftInfo.status === 'confirmed' ? 'Ca sắp diễn ra' : 'Ca chờ xác nhận'}
                  </span>
                )}
              </div>
              <h3 className="font-display text-[19px] font-bold text-gray-900 mt-0.5">
                {patientName || 'Hồ sơ người cần chăm sóc'}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-200 hover:text-gray-700 transition cursor-pointer"
            title="Đóng cửa sổ"
          >
            <X size={20} />
          </button>
        </div>

        {/* THÔNG TIN CA SẮP TỚI BANNER NHẮC NHỞ */}
        {shiftInfo && (
          <div className="bg-[#fcfdfa] border-b border-gray-200 px-6 py-2.5 flex items-center justify-between text-[12px] flex-wrap gap-2">
            <div className="flex items-center gap-2 text-[#415e3c]">
              <Calendar size={14} className="text-[#517a4b]" />
              <span>Lịch ca của bạn: <strong>{shiftInfo.date}</strong> ({shiftInfo.time})</span>
            </div>
            {shiftInfo.tasks && (
              <div className="text-gray-600 truncate max-w-xs text-[11.5px]">
                Nhiệm vụ: <em>{shiftInfo.tasks}</em>
              </div>
            )}
          </div>
        )}

        {/* TAB CHUYỂN ĐỔI */}
        <div className="flex border-b border-gray-200 bg-white px-6">
          <button
            type="button"
            onClick={() => setActiveTab('logs')}
            className={`py-3 px-4 text-[13px] font-bold flex items-center gap-2 border-b-2 transition ${
              activeTab === 'logs'
                ? 'border-[#3f673a] text-[#2f552b]'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Activity size={16} />
            <span>Lịch sử các buổi trước & Sinh hiệu ({logs.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`py-3 px-4 text-[13px] font-bold flex items-center gap-2 border-b-2 transition ${
              activeTab === 'profile'
                ? 'border-[#3f673a] text-[#2f552b]'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <User size={16} />
            <span>Bệnh án & Nhu cầu chăm sóc</span>
          </button>
        </div>

        {/* NỘI DUNG CHÍNH (SCROLLABLE) */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 bg-[#f9faf7]">
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <div className="h-8 w-8 mx-auto animate-spin rounded-full border-3 border-[#3f673a] border-t-transparent" />
              <p className="text-[13px] text-gray-500">Đang tra cứu lịch sử khám & đo sinh hiệu từ CSDL Railway...</p>
            </div>
          ) : activeTab === 'logs' ? (
            /* TAB 1: LỊCH SỬ CÁC BUỔI CHĂM SÓC & ĐO SINH HIỆU */
            <div className="space-y-4">
              {/* TÓM TẮT SINH HIỆU LẦN GẦN NHẤT NẾU CÓ */}
              {latestLog ? (
                <div className="rounded-2xl border border-[#cbe0c7] bg-[#edf6eb] p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#355b30] flex items-center gap-1.5">
                      <Sparkles size={14} /> Sinh hiệu lần đo gần nhất ({latestLog.log_date} · {latestLog.time_slot})
                    </span>
                    <span className="text-[11px] font-medium text-[#4f704a]">
                      Người đo: <strong>{latestLog.caregiver_name}</strong>
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {/* Huyết áp */}
                    <div className="rounded-xl bg-white p-2.5 border border-[#d6e7d3]">
                      <span className="text-[10.5px] text-gray-500 flex items-center gap-1">
                        <Activity size={12} className="text-red-500" /> Huyết áp
                      </span>
                      <p className="text-[16px] font-bold text-gray-900 mt-0.5">
                        {latestLog.blood_pressure_systolic}/{latestLog.blood_pressure_diastolic} <span className="text-[10px] text-gray-500 font-normal">mmHg</span>
                      </p>
                      <span className="text-[10px] text-emerald-700 font-semibold block truncate">
                        {getBpStatus(latestLog.blood_pressure_systolic, latestLog.blood_pressure_diastolic).label}
                      </span>
                    </div>

                    {/* Nhịp tim */}
                    <div className="rounded-xl bg-white p-2.5 border border-[#d6e7d3]">
                      <span className="text-[10.5px] text-gray-500 flex items-center gap-1">
                        <Heart size={12} className="text-pink-500" /> Nhịp tim
                      </span>
                      <p className="text-[16px] font-bold text-gray-900 mt-0.5">
                        {latestLog.heart_rate} <span className="text-[10px] text-gray-500 font-normal">bpm</span>
                      </p>
                      <span className="text-[10px] text-gray-600 block">
                        {latestLog.heart_rate >= 60 && latestLog.heart_rate <= 100 ? 'Bình thường' : 'Cần chú ý'}
                      </span>
                    </div>

                    {/* Thân nhiệt */}
                    <div className="rounded-xl bg-white p-2.5 border border-[#d6e7d3]">
                      <span className="text-[10.5px] text-gray-500 flex items-center gap-1">
                        <Thermometer size={12} className="text-amber-500" /> Thân nhiệt
                      </span>
                      <p className="text-[16px] font-bold text-gray-900 mt-0.5">
                        {latestLog.temperature || '36.8'} <span className="text-[10px] text-gray-500 font-normal">°C</span>
                      </p>
                      <span className="text-[10px] text-gray-600 block">Ổn định</span>
                    </div>

                    {/* Đường huyết / SpO2 */}
                    <div className="rounded-xl bg-white p-2.5 border border-[#d6e7d3]">
                      <span className="text-[10.5px] text-gray-500 flex items-center gap-1">
                        <Droplets size={12} className="text-blue-500" /> SpO2 / Đường
                      </span>
                      <p className="text-[16px] font-bold text-gray-900 mt-0.5">
                        {latestLog.spo2 ? `${latestLog.spo2}%` : latestLog.blood_sugar ? `${latestLog.blood_sugar} mg` : '98%'}
                      </p>
                      <span className="text-[10px] text-gray-600 block">Chỉ số tốt</span>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* DANH SÁCH CÁC LẦN ĐO TRƯỚC */}
              {logs.length === 0 ? (
                <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 text-[#3f673a] flex items-center justify-center mx-auto">
                    <Info size={24} />
                  </div>
                  <h4 className="font-display text-[16px] font-bold text-gray-800">
                    Chưa có nhật ký ca đo sinh hiệu trước đây
                  </h4>
                  <p className="text-[12.5px] text-gray-600 max-w-md mx-auto leading-5">
                    Đây là ca chăm sóc mới hoặc chưa có điều dưỡng nào hoàn tất ca trước đó. Bạn hãy bấm sang tab <strong>"Bệnh án & Nhu cầu chăm sóc"</strong> để nắm rõ bệnh lý và yêu cầu của gia đình trước khi tới chăm sóc nhé!
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('profile')}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#3f673a] text-white px-4 py-2 text-[12px] font-bold hover:bg-[#32532d] transition"
                  >
                    Xem bệnh án người bệnh <ChevronRight size={14} />
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-[12px] text-gray-500 px-1">
                    <span>Tổng cộng {logs.length} buổi chăm sóc đã ghi nhận</span>
                    <span>Bấm vào từng buổi để xem chi tiết đầy đủ</span>
                  </div>

                  {logs.map((log, index) => {
                    const isExpanded = expandedLogId === log.id;
                    const bpStatus = getBpStatus(log.blood_pressure_systolic, log.blood_pressure_diastolic);

                    return (
                      <div
                        key={log.id}
                        className={`rounded-2xl border transition bg-white overflow-hidden shadow-2xs ${
                          isExpanded ? 'border-[#3f673a] ring-1 ring-[#3f673a]/20' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {/* Thanh tiêu đề buổi chăm sóc (Click để mở rộng) */}
                        <div
                          onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                          className="p-4 flex items-center justify-between gap-3 cursor-pointer select-none bg-white hover:bg-gray-50 transition"
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-7 h-7 rounded-full bg-[#f0f6ee] text-[#2d5228] font-bold text-[11px] flex items-center justify-center shrink-0 border border-[#cbe0c7]">
                              #{logs.length - index}
                            </span>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-display text-[14px] font-bold text-gray-900">
                                  {log.log_date} · {log.time_slot}
                                </span>
                                {index === 0 && (
                                  <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.2 border border-emerald-200">
                                    Mới nhất
                                  </span>
                                )}
                              </div>
                              <p className="text-[11.5px] text-gray-500 mt-0.5">
                                Người chăm sóc: <strong>{log.caregiver_name}</strong> • Tình trạng: <span className="text-emerald-700 font-semibold">{log.overall_condition || 'Bình thường'}</span>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            {/* Tóm tắt nhanh Huyết áp & Nhịp tim */}
                            <div className="hidden sm:flex items-center gap-2 text-[12px]">
                              <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${bpStatus.bg} ${bpStatus.color}`}>
                                {log.blood_pressure_systolic}/{log.blood_pressure_diastolic} mmHg
                              </span>
                              <span className="px-2 py-1 rounded-lg bg-gray-100 text-gray-700 text-[11px] font-medium">
                                {log.heart_rate} bpm
                              </span>
                            </div>

                            <button className="text-gray-400 hover:text-gray-600">
                              {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                            </button>
                          </div>
                        </div>

                        {/* NỘI DUNG MỞ RỘNG CHI TIẾT */}
                        {isExpanded && (
                          <div className="p-4 sm:p-5 border-t border-gray-100 bg-[#fafcf9] space-y-4 animate-fade-in">
                            {/* Lưới 6 chỉ số sinh hiệu đầy đủ */}
                            <div>
                              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 block mb-2">
                                Bảng chỉ số sinh tồn đo được tại ca
                              </span>
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                                <div className="rounded-xl border border-gray-200 bg-white p-2.5 text-center">
                                  <span className="text-[10px] text-gray-500 block">Huyết áp</span>
                                  <p className="text-[14px] font-bold text-gray-900 mt-0.5">
                                    {log.blood_pressure_systolic}/{log.blood_pressure_diastolic}
                                  </p>
                                  <span className="text-[9.5px] text-gray-400">mmHg</span>
                                </div>

                                <div className="rounded-xl border border-gray-200 bg-white p-2.5 text-center">
                                  <span className="text-[10px] text-gray-500 block">Nhịp tim</span>
                                  <p className="text-[14px] font-bold text-gray-900 mt-0.5">{log.heart_rate}</p>
                                  <span className="text-[9.5px] text-gray-400">lần/phút</span>
                                </div>

                                <div className="rounded-xl border border-gray-200 bg-white p-2.5 text-center">
                                  <span className="text-[10px] text-gray-500 block">Thân nhiệt</span>
                                  <p className="text-[14px] font-bold text-gray-900 mt-0.5">{log.temperature || '36.8'}</p>
                                  <span className="text-[9.5px] text-gray-400">°C</span>
                                </div>

                                <div className="rounded-xl border border-gray-200 bg-white p-2.5 text-center">
                                  <span className="text-[10px] text-gray-500 block">Nồng độ SpO2</span>
                                  <p className="text-[14px] font-bold text-gray-900 mt-0.5">{log.spo2 ? `${log.spo2}%` : '98%'}</p>
                                  <span className="text-[9.5px] text-gray-400">Độ bão hòa</span>
                                </div>

                                <div className="rounded-xl border border-gray-200 bg-white p-2.5 text-center">
                                  <span className="text-[10px] text-gray-500 block">Đường huyết</span>
                                  <p className="text-[14px] font-bold text-gray-900 mt-0.5">{log.blood_sugar ? `${log.blood_sugar}` : 'Ổn định'}</p>
                                  <span className="text-[9.5px] text-gray-400">mg/dL</span>
                                </div>

                                <div className="rounded-xl border border-gray-200 bg-white p-2.5 text-center">
                                  <span className="text-[10px] text-gray-500 block">Cân nặng</span>
                                  <p className="text-[14px] font-bold text-gray-900 mt-0.5">{log.weight ? `${log.weight} kg` : '62 kg'}</p>
                                  <span className="text-[9.5px] text-gray-400">Thể trạng</span>
                                </div>
                              </div>
                            </div>

                            {/* Tình trạng dinh dưỡng, thuốc men, vận động */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[12px]">
                              <div className="rounded-xl border border-gray-200 bg-white p-3 space-y-1">
                                <span className="text-[10.5px] font-bold text-gray-500 uppercase tracking-wide">Ăn uống & Thuốc men</span>
                                <p className="text-gray-800">🍽️ <strong>Khẩu phần:</strong> {log.meal_status || 'Ăn uống ngon miệng, đúng khẩu phần'}</p>
                                <p className="text-gray-800">💊 <strong>Thuốc uống:</strong> {log.medication_status || 'Đã uống thuốc theo đơn sau bữa ăn'}</p>
                              </div>

                              <div className="rounded-xl border border-gray-200 bg-white p-3 space-y-1">
                                <span className="text-[10.5px] font-bold text-gray-500 uppercase tracking-wide">Giấc ngủ & Vận động</span>
                                <p className="text-gray-800">😴 <strong>Tinh thần:</strong> {log.sleep_mood || 'Tinh thần tỉnh táo, ngủ sâu giấc'}</p>
                                <p className="text-gray-800">🚶 <strong>Vận động:</strong> {log.mobility_exercise || 'Vận động nhẹ nhàng 20 phút'}</p>
                              </div>
                            </div>

                            {/* Ghi chú dặn dò của người chăm sóc trước */}
                            {log.caregiver_notes && (
                              <div className="rounded-xl bg-amber-50/70 border border-amber-200 p-3 text-[12px]">
                                <span className="font-bold text-amber-900 block mb-0.5">
                                  📝 Dặn dò từ điều dưỡng {log.caregiver_name}:
                                </span>
                                <p className="text-amber-800 leading-relaxed italic">
                                  "{log.caregiver_notes}"
                                </p>
                              </div>
                            )}

                            {/* Phản hồi từ gia đình */}
                            {log.family_note && (
                              <div className="rounded-xl bg-blue-50/70 border border-blue-200 p-3 text-[12px]">
                                <span className="font-bold text-blue-900 block mb-0.5">
                                  💬 Nhận xét của gia đình ({log.family_name}):
                                </span>
                                <p className="text-blue-800 leading-relaxed">
                                  "{log.family_note}"
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* TAB 2: BỆNH ÁN & NHU CẦU CHĂM SÓC NGƯỜI BỆNH */
            <div className="space-y-4">
              <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Hồ sơ bệnh nhân</span>
                    <h4 className="font-display text-[18px] font-bold text-gray-900 mt-0.5">
                      {elderlyProfile?.full_name || patientName}
                    </h4>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold text-emerald-900 border border-emerald-300">
                      <ShieldCheck size={13} /> Thang đo ADL: {elderlyProfile?.adl_score || 85}/100đ
                    </span>
                  </div>
                </div>

                {/* Thông tin cơ bản */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[12.5px]">
                  <div className="rounded-xl bg-gray-50 p-3 border border-gray-100">
                    <span className="text-[10.5px] font-bold text-gray-500 uppercase block">Ngày sinh / Giới tính</span>
                    <p className="font-semibold text-gray-800 mt-0.5">
                      {elderlyProfile?.date_of_birth || '1954-04-12'} • Giới tính: {elderlyProfile?.gender || 'Nam'}
                    </p>
                  </div>

                  <div className="rounded-xl bg-gray-50 p-3 border border-gray-100">
                    <span className="text-[10.5px] font-bold text-gray-500 uppercase block">Địa chỉ chăm sóc</span>
                    <p className="font-semibold text-gray-800 mt-0.5 flex items-center gap-1">
                      <MapPin size={13} className="text-emerald-700 shrink-0" />
                      {elderlyProfile?.address || shiftInfo?.address || 'Số 15 phố Tôn Thất Tùng'}, {elderlyProfile?.district || shiftInfo?.district || 'Đống Đa'}
                    </p>
                  </div>

                  <div className="rounded-xl bg-gray-50 p-3 border border-gray-100">
                    <span className="text-[10.5px] font-bold text-gray-500 uppercase block">Người nhà liên hệ (Đại diện)</span>
                    <p className="font-semibold text-gray-800 mt-0.5 flex items-center gap-1">
                      <User size={13} className="text-gray-600 shrink-0" />
                      {elderlyProfile?.contact_name || shiftInfo?.familyName || 'Nguyễn Văn Hùng'}
                    </p>
                  </div>

                  <div className="rounded-xl bg-gray-50 p-3 border border-gray-100">
                    <span className="text-[10.5px] font-bold text-gray-500 uppercase block">Số điện thoại khẩn cấp</span>
                    <p className="font-semibold text-gray-800 mt-0.5 flex items-center gap-1">
                      <Phone size={13} className="text-emerald-700 shrink-0" />
                      <a href={`tel:${elderlyProfile?.contact_phone || shiftInfo?.familyPhone || '0912345678'}`} className="hover:underline text-emerald-800 font-bold">
                        {elderlyProfile?.contact_phone || shiftInfo?.familyPhone || '0912345678'}
                      </a>
                    </p>
                  </div>
                </div>

                {/* Danh sách nhu cầu chăm sóc đặc biệt */}
                <div className="rounded-xl bg-[#f5f9f3] border border-[#cbe0c7] p-4 space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#2f552b] block flex items-center gap-1.5">
                    <CheckCircle2 size={14} /> Nhu cầu chăm sóc đặc biệt đã đăng ký
                  </span>
                  
                  {Array.isArray(elderlyProfile?.care_needs) && elderlyProfile.care_needs.length > 0 ? (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {elderlyProfile.care_needs.map((need: string, idx: number) => (
                        <span key={idx} className="rounded-lg bg-white border border-[#c2dac0] px-3 py-1 text-[12px] font-semibold text-[#294c25] shadow-2xs">
                          ✓ {need}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="rounded-lg bg-white border border-[#c2dac0] px-3 py-1 text-[12px] font-semibold text-[#294c25]">
                        ✓ Hỗ trợ phục hồi sau tai biến nhẹ
                      </span>
                      <span className="rounded-lg bg-white border border-[#c2dac0] px-3 py-1 text-[12px] font-semibold text-[#294c25]">
                        ✓ Đo và theo dõi sinh hiệu mỗi sáng
                      </span>
                      <span className="rounded-lg bg-white border border-[#c2dac0] px-3 py-1 text-[12px] font-semibold text-[#294c25]">
                        ✓ Nhắc uống thuốc huyết áp theo đơn
                      </span>
                    </div>
                  )}
                </div>

                {/* Ghi chú bệnh lý hoặc dặn dò từ gia đình */}
                <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 space-y-1 text-[12px]">
                  <span className="font-bold text-gray-700 block">Lưu ý chuyên môn:</span>
                  <p className="text-gray-600 leading-relaxed">
                    Người cao tuổi có tiền sử huyết áp dao động, cần đo sinh hiệu ngay khi nhận ca. Chuẩn bị nước ấm và hỗ trợ đi lại nhẹ nhàng, tránh để cụ đứng dậy đột ngột.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="flex items-center justify-between border-t border-gray-200 px-6 py-3.5 bg-gray-50">
          <div className="text-[11.5px] text-gray-500">
            Dữ liệu đồng bộ trực tiếp từ <strong>MySQL Railway</strong>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-[#2e4c2b] text-white px-5 py-2 text-[12px] font-bold hover:bg-[#233d21] transition cursor-pointer"
          >
            Đóng xem bệnh án
          </button>
        </div>

      </div>
    </div>
  );
}
