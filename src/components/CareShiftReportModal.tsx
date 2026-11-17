import React, { useState, useEffect } from 'react';
import {
  X,
  Activity,
  Stethoscope,
  CheckCircle2,
  UserRound,
  Calendar,
  Sparkles,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { API, getAuthHeaders } from '@/lib/apiConfig';

interface CareShiftReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'view';
  shift: {
    id: number;
    patientName?: string;
    elderly_name?: string;
    date?: string;
    schedule_date?: string;
    time?: string;
    time_slot?: string;
    title?: string;
    family_name?: string;
    familyName?: string;
    familyUserId?: number;
    family_user_id?: number;
    caregiver_user_id?: number;
    caregiverUserId?: number;
    caregiver_name?: string;
    caregiverName?: string;
    elderly_profile_id?: number;
    elderlyProfileId?: number;
    care_log_id?: number;
  };
  currentUser?: {
    id?: number;
    full_name?: string;
    role?: string;
  };
  notify: (msg: string) => void;
  onSuccess?: () => void;
}

export function CareShiftReportModal({
  isOpen,
  onClose,
  mode,
  shift,
  currentUser,
  notify,
  onSuccess
}: CareShiftReportModalProps) {
  // KHÔNG tự điền sinh hiệu mặc định (tránh gửi nhầm 120/80, 75, 36.8 khi thực tế chưa đo)
  const [bpSys, setBpSys] = useState<string>('');
  const [bpDia, setBpDia] = useState<string>('');
  const [heartRate, setHeartRate] = useState<string>('');
  const [temp, setTemp] = useState<string>('');
  const [condition, setCondition] = useState<'' | 'good' | 'normal' | 'attention' | 'warning'>('');
  const [vitalsNotMeasured, setVitalsNotMeasured] = useState<boolean>(false);

  // Chỉ số tùy chọn
  const [spo2, setSpo2] = useState<string>('');
  const [bloodSugar, setBloodSugar] = useState<string>('');

  // Ghi chú ca tiếp theo cho gia đình
  const [notes, setNotes] = useState<string>('');
  const [emergencyBanner, setEmergencyBanner] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [aiDrafting, setAiDrafting] = useState(false);
  const [existingLog, setExistingLog] = useState<any | null>(null);
  const [fetchingLog, setFetchingLog] = useState(false);

  const patientName = shift.patientName || shift.elderly_name || 'Người thân';
  const shiftDate = shift.date || shift.schedule_date || new Date().toISOString().split('T')[0];
  const shiftTime = shift.time || shift.time_slot || '08:00 - 12:00';

  useEffect(() => {
    if (!isOpen) return;

    if (mode === 'view') {
      setFetchingLog(true);
      const url = `${API}/care-logs?scheduleId=${shift.id}`;
      fetch(url)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data) && data.length > 0) {
            setExistingLog(data[0]);
          } else {
            return fetch(`${API}/care-logs?elderlyName=${encodeURIComponent(patientName)}`)
              .then(r => r.json())
              .then(d2 => {
                if (Array.isArray(d2) && d2.length > 0) {
                  setExistingLog(d2[0]);
                } else {
                  setExistingLog(null);
                }
              });
          }
        })
        .catch(() => setExistingLog(null))
        .finally(() => setFetchingLog(false));
    } else {
      // Khởi tạo hoàn toàn rỗng — chuyên viên phải nhập số đo thật hoặc xác nhận rõ "Chưa đo"
      setBpSys('');
      setBpDia('');
      setHeartRate('');
      setTemp('');
      setCondition('');
      setVitalsNotMeasured(false);
      setSpo2('');
      setBloodSugar('');
      setNotes('');
      setEmergencyBanner(null);
    }
  }, [isOpen, mode, shift.id, patientName]);

  if (!isOpen) return null;

  const handleAiDraftReport = async () => {
    const sBpSys = vitalsNotMeasured ? '' : bpSys.trim();
    const sBpDia = vitalsNotMeasured ? '' : bpDia.trim();
    const sHr = vitalsNotMeasured ? '' : heartRate.trim();
    const sTemp = vitalsNotMeasured ? '' : temp.trim();
    const sSpo2 = vitalsNotMeasured ? '' : spo2.trim();
    const sSugar = vitalsNotMeasured ? '' : bloodSugar.trim();
    const sNotes = notes.trim();

    if ((sBpSys && !sBpDia) || (!sBpSys && sBpDia)) {
      notify('Vui lòng nhập đầy đủ cả huyết áp tâm thu và tâm trương.');
      return;
    }
    if (!sBpSys && !sBpDia && !sHr && !sTemp && !sSpo2 && !sSugar && !sNotes) {
      notify('Vui lòng nhập chỉ số sinh hiệu thực tế đã đo hoặc ghi chú ca làm trước khi chuẩn hóa báo cáo.');
      return;
    }

    setAiDrafting(true);
    setEmergencyBanner(null);
    try {
      const res = await fetch(`${API}/ai/draft-shift-report`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          bpSys: sBpSys,
          bpDia: sBpDia,
          heartRate: sHr,
          temp: sTemp,
          spo2: sSpo2,
          bloodSugar: sSugar,
          condition,
          quickNotes: sNotes,
        }),
      });
      const data = await res.json();
      if (res.ok && data.draft_notes) {
        setNotes(data.draft_notes);
        if (data.emergency_alert) {
          setEmergencyBanner(data.emergency_alert);
        }
        if (data.suggested_condition && ['good', 'normal', 'attention', 'warning'].includes(data.suggested_condition)) {
          setCondition(data.suggested_condition);
        }
        notify('✨ CareMatchAI đã chuẩn hóa báo cáo bàn giao từ dữ liệu thực tế của bạn!');
      } else {
        notify(data.error || 'Không thể tạo nháp báo cáo CareMatchAI lúc này.');
      }
    } catch {
      notify('Lỗi kết nối CareMatchAI.');
    } finally {
      setAiDrafting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!vitalsNotMeasured) {
      if (!bpSys.trim() || !bpDia.trim() || !heartRate.trim() || !temp.trim()) {
        notify('Vui lòng nhập số đo sinh hiệu thực tế hoặc tích chọn "Xác nhận ca này chưa đo sinh hiệu".');
        return;
      }
    }
    if (!condition) {
      notify('Vui lòng chọn mức Đánh giá chung của ca chăm sóc.');
      return;
    }
    if (vitalsNotMeasured && !notes.trim()) {
      notify('Khi chưa đo sinh hiệu, vui lòng ghi rõ lý do và tình trạng sinh hoạt vào phần Ghi chú ca.');
      return;
    }

    setLoading(true);
    try {
      const caregiverId = currentUser?.id || shift.caregiver_user_id || shift.caregiverUserId;
      const caregiverName = currentUser?.full_name || shift.caregiver_name || shift.caregiverName || 'Người chăm sóc';
      const familyUserId = shift.family_user_id || shift.familyUserId || (currentUser?.role === 'family' ? currentUser.id : null);
      const elderlyProfileId = shift.elderly_profile_id || shift.elderlyProfileId || null;

      const payload = {
        schedule_id: shift.id,
        elderly_profile_id: elderlyProfileId,
        elderly_name: patientName,
        family_user_id: familyUserId,
        family_name: shift.family_name || shift.familyName || 'Gia đình',
        caregiver_user_id: caregiverId,
        caregiver_name: caregiverName,
        log_date: shiftDate,
        time_slot: shiftTime,
        blood_pressure_systolic: !vitalsNotMeasured && bpSys.trim() !== '' ? Number(bpSys) : null,
        blood_pressure_diastolic: !vitalsNotMeasured && bpDia.trim() !== '' ? Number(bpDia) : null,
        heart_rate: !vitalsNotMeasured && heartRate.trim() !== '' ? Number(heartRate) : null,
        temperature: !vitalsNotMeasured && temp.trim() !== '' ? Number(temp) : null,
        spo2: !vitalsNotMeasured && spo2.trim() !== '' ? Number(spo2) : null,
        blood_sugar: !vitalsNotMeasured && bloodSugar.trim() !== '' ? Number(bloodSugar) : null,
        overall_condition: condition,
        caregiver_notes: notes.trim()
      };

      const res = await fetch(`${API}/care-logs`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        await fetch(`${API}/schedules/${shift.id}`, {
          method: 'PATCH',
          headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ status: 'completed', confirmedBy: 'caregiver' })
        }).catch(() => {});

        notify('✅ Đã lưu báo cáo sinh hiệu & Hoàn thành ca chăm sóc thành công!');
        if (onSuccess) onSuccess();
        onClose();
      } else {
        const errData = await res.json().catch(() => ({}));
        notify(errData.error || 'Không thể lưu báo cáo, vui lòng thử lại.');
      }
    } catch {
      notify('Lỗi kết nối khi lưu báo cáo sau ca.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl w-full max-w-xl max-h-[92vh] overflow-y-auto p-6 shadow-2xl border border-stone-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
              <Stethoscope size={20} />
            </div>
            <div>
              <h3 className="text-[17px] font-bold text-stone-900">
                {mode === 'create' ? 'Đánh Giá & Báo Cáo Sinh Hiệu Sau Ca' : 'Báo Cáo Sức Khỏe & Sinh Hiệu Đã Lưu'}
              </h3>
              <p className="text-[12px] text-stone-500">
                {mode === 'create'
                  ? 'Chỉ nhập số đo thực tế đã thực hiện (hoặc xác nhận rõ chưa đo)'
                  : 'Xem lại hồ sơ sinh hiệu & dặn dò đã bàn giao cho gia đình'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Thông tin ca */}
        <div className="mt-4 rounded-2xl bg-[#f5f8f4] border border-[#d8e6d3] p-3.5 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-[13px] text-stone-800">
            <UserRound size={16} className="text-emerald-700 shrink-0" />
            <span>Người bệnh: <strong>{patientName}</strong></span>
          </div>
          <div className="flex items-center gap-2 text-[12px] text-stone-600">
            <Calendar size={14} className="text-stone-400 shrink-0" />
            <span>{shiftDate} · {shiftTime}</span>
          </div>
        </div>

        {mode === 'view' ? (
          /* CHẾ ĐỘ XEM LẠI BÁO CÁO ĐÃ NỘP */
          <div className="mt-5 space-y-4 text-xs">
            {fetchingLog ? (
              <div className="py-8 text-center text-stone-500">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent mx-auto mb-2" />
                Đang tải báo cáo sinh hiệu...
              </div>
            ) : existingLog ? (
              <>
                <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 space-y-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                    <Activity size={14} className="text-emerald-700" />
                    Chỉ số sinh hiệu ghi nhận
                  </span>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="rounded-xl bg-white p-2.5 border border-emerald-100 text-center">
                      <span className="text-[10.5px] text-stone-500 block">Huyết áp</span>
                      <strong className="text-[14px] font-mono text-stone-900">
                        {existingLog.blood_pressure_systolic && existingLog.blood_pressure_diastolic
                          ? `${existingLog.blood_pressure_systolic}/${existingLog.blood_pressure_diastolic}`
                          : 'Chưa đo'}
                      </strong>
                      <span className="text-[9.5px] text-stone-400 block">mmHg</span>
                    </div>

                    <div className="rounded-xl bg-white p-2.5 border border-emerald-100 text-center">
                      <span className="text-[10.5px] text-stone-500 block">Nhịp tim</span>
                      <strong className="text-[14px] font-mono text-stone-900">
                        {existingLog.heart_rate ? existingLog.heart_rate : 'Chưa đo'}
                      </strong>
                      <span className="text-[9.5px] text-stone-400 block">bpm</span>
                    </div>

                    <div className="rounded-xl bg-white p-2.5 border border-emerald-100 text-center">
                      <span className="text-[10.5px] text-stone-500 block">Thân nhiệt</span>
                      <strong className="text-[14px] font-mono text-stone-900">
                        {existingLog.temperature ? `${existingLog.temperature}°C` : 'Chưa đo'}
                      </strong>
                      <span className="text-[9.5px] text-stone-400 block">°C</span>
                    </div>

                    <div className="rounded-xl bg-white p-2.5 border border-emerald-100 text-center">
                      <span className="text-[10.5px] text-stone-500 block">SpO2 / Đường</span>
                      <strong className="text-[14px] font-mono text-stone-900">
                        {existingLog.spo2 ? `${existingLog.spo2}%` : 'Chưa đo'}
                      </strong>
                      <span className="text-[9.5px] text-stone-400 block">
                        {existingLog.blood_sugar ? `${existingLog.blood_sugar} mmol/L` : 'Chưa đo'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-1 flex items-center justify-between border-t border-emerald-100/70">
                    <span className="text-stone-600 font-medium">Đánh giá chung ca:</span>
                    <span className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                      existingLog.overall_condition === 'good'
                        ? 'bg-emerald-100 text-emerald-800'
                        : existingLog.overall_condition === 'warning'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                    }`}>
                      {existingLog.overall_condition === 'good'
                        ? '✓ Rất tốt / Ổn định'
                        : existingLog.overall_condition === 'warning'
                          ? '🚨 Cảnh báo'
                          : existingLog.overall_condition === 'attention'
                            ? '⚠️ Cần lưu ý'
                            : 'Bình thường'}
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl bg-stone-50 border border-stone-200 p-4">
                  <span className="font-bold text-stone-800 block mb-1 text-[12px]">Ghi chú & Dặn dò ca tiếp theo cho gia đình:</span>
                  <p className="text-[12px] text-stone-700 leading-relaxed italic bg-white p-3 rounded-xl border border-stone-100 whitespace-pre-line">
                    {existingLog.caregiver_notes ? existingLog.caregiver_notes : '(Người chăm sóc không để lại ghi chú đặc biệt)'}
                  </p>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={onClose}
                    className="px-5 py-2 rounded-xl bg-stone-800 text-white font-bold hover:bg-stone-900 transition"
                  >
                    Đóng
                  </button>
                </div>
              </>
            ) : (
              <div className="py-6 text-center text-stone-500">
                <p>Ca này chưa có bản ghi sinh hiệu chi tiết trong sổ theo dõi.</p>
                <button
                  onClick={onClose}
                  className="mt-3 px-4 py-1.5 rounded-xl bg-stone-100 text-stone-700 font-semibold"
                >
                  Đóng
                </button>
              </div>
            )}
          </div>
        ) : (
          /* CHẾ ĐỘ TẠO MỚI BÁO CÁO (KHÔNG MẶC ĐỊNH SỐ ĐO GIẢ) */
          <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
            {emergencyBanner && (
              <div className="rounded-2xl bg-rose-50 border border-rose-300 p-3.5 text-rose-900 flex items-start gap-2.5">
                <AlertTriangle size={18} className="text-rose-600 shrink-0 mt-0.5" />
                <div className="text-[12px] leading-relaxed font-semibold">{emergencyBanner}</div>
              </div>
            )}

            {/* KHỐI SINH HIỆU THỰC TẾ */}
            <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                  <Activity size={14} className="text-emerald-700" />
                  Chỉ số sinh hiệu thực tế đã đo
                </span>
                <label className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={vitalsNotMeasured}
                    onChange={(e) => setVitalsNotMeasured(e.target.checked)}
                    className="rounded border-amber-400 text-emerald-700"
                  />
                  Xác nhận ca này chưa đo sinh hiệu
                </label>
              </div>

              {!vitalsNotMeasured ? (
                <>
                  <div className="grid grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-stone-600 mb-1 font-medium">Huyết áp tâm thu *</label>
                      <div className="relative">
                        <input
                          type="number"
                          min={50}
                          max={260}
                          value={bpSys}
                          onChange={e => setBpSys(e.target.value)}
                          placeholder="VD: 120"
                          className="w-full bg-white border border-stone-200 rounded-xl px-3 py-1.5 font-mono text-center font-bold text-stone-900 outline-none focus:border-emerald-600 placeholder:font-normal placeholder:text-stone-400"
                        />
                        <span className="absolute right-2 top-1.5 text-[10px] text-stone-400">mmHg</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-stone-600 mb-1 font-medium">Huyết áp tâm trương *</label>
                      <div className="relative">
                        <input
                          type="number"
                          min={30}
                          max={180}
                          value={bpDia}
                          onChange={e => setBpDia(e.target.value)}
                          placeholder="VD: 80"
                          className="w-full bg-white border border-stone-200 rounded-xl px-3 py-1.5 font-mono text-center font-bold text-stone-900 outline-none focus:border-emerald-600 placeholder:font-normal placeholder:text-stone-400"
                        />
                        <span className="absolute right-2 top-1.5 text-[10px] text-stone-400">mmHg</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-stone-600 mb-1 font-medium">Nhịp tim *</label>
                      <div className="relative">
                        <input
                          type="number"
                          min={30}
                          max={220}
                          value={heartRate}
                          onChange={e => setHeartRate(e.target.value)}
                          placeholder="VD: 75"
                          className="w-full bg-white border border-stone-200 rounded-xl px-3 py-1.5 font-mono text-center font-bold text-stone-900 outline-none focus:border-emerald-600 placeholder:font-normal placeholder:text-stone-400"
                        />
                        <span className="absolute right-2 top-1.5 text-[10px] text-stone-400">bpm</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-stone-600 mb-1 font-medium">Thân nhiệt (°C) *</label>
                      <input
                        type="number"
                        step="0.1"
                        min={34}
                        max={43}
                        value={temp}
                        onChange={e => setTemp(e.target.value)}
                        placeholder="VD: 36.7"
                        className="w-full bg-white border border-stone-200 rounded-xl px-3 py-1.5 font-mono text-center font-bold text-stone-900 outline-none focus:border-emerald-600 placeholder:font-normal placeholder:text-stone-400"
                      />
                    </div>
                    <div>
                      <label className="block text-stone-600 mb-1 font-medium">Đánh giá chung ca *</label>
                      <select
                        value={condition}
                        onChange={e => setCondition(e.target.value as any)}
                        required
                        className="w-full bg-white border border-stone-200 rounded-xl px-3 py-1.5 text-stone-900 font-bold outline-none focus:border-emerald-600"
                      >
                        <option value="" disabled>-- Chọn tình trạng thực tế --</option>
                        <option value="good">✓ Rất tốt / Ổn định</option>
                        <option value="normal">Bình thường</option>
                        <option value="attention">⚠️ Cần lưu ý</option>
                        <option value="warning">🚨 Cảnh báo</option>
                      </select>
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-2.5">
                  <p className="text-[11.5px] text-amber-900 bg-amber-50/80 border border-amber-200 rounded-xl p-2.5">
                    Hệ thống sẽ ghi nhận rõ trạng thái <strong>"Chưa đo"</strong> cho toàn bộ chỉ số sinh hiệu của ca này (tuyệt đối không tự điền số mặc định).
                  </p>
                  <div>
                    <label className="block text-stone-600 mb-1 font-medium">Đánh giá chung qua quan sát sinh hoạt *</label>
                    <select
                      value={condition}
                      onChange={e => setCondition(e.target.value as any)}
                      required
                      className="w-full bg-white border border-stone-200 rounded-xl px-3 py-1.5 text-stone-900 font-bold outline-none focus:border-emerald-600"
                    >
                      <option value="" disabled>-- Chọn đánh giá thực tế --</option>
                      <option value="good">✓ Rất tốt / Ổn định</option>
                      <option value="normal">Bình thường</option>
                      <option value="attention">⚠️ Cần lưu ý</option>
                      <option value="warning">🚨 Cảnh báo</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* KHỐI TÙY CHỌN */}
            {!vitalsNotMeasured && (
              <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200 space-y-2">
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-stone-500 block">
                  Chỉ số lâm sàng tùy chọn (để trống nếu không đo)
                </span>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-stone-600 mb-1">Nồng độ Oxy máu (SpO2 %)</label>
                    <input
                      type="number"
                      min={50}
                      max={100}
                      value={spo2}
                      onChange={e => setSpo2(e.target.value)}
                      placeholder="Chưa đo thì để trống"
                      className="w-full bg-white border border-stone-200 rounded-xl px-3 py-1.5 font-mono text-center text-stone-900 outline-none focus:border-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block text-stone-600 mb-1">Đường huyết (mmol/L)</label>
                    <input
                      type="number"
                      step="0.1"
                      min={1}
                      max={40}
                      value={bloodSugar}
                      onChange={e => setBloodSugar(e.target.value)}
                      placeholder="Chưa đo thì để trống"
                      className="w-full bg-white border border-stone-200 rounded-xl px-3 py-1.5 font-mono text-center text-stone-900 outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* GHI CHÚ VÀ DẶN DÒ CHO GIA ĐÌNH */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                <label className="block text-stone-700 font-bold">
                  Ghi chú & Dặn dò ca tiếp theo cho gia đình {vitalsNotMeasured ? '*' : ''}
                </label>
                <button
                  type="button"
                  onClick={handleAiDraftReport}
                  disabled={aiDrafting}
                  className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-3 py-1 text-[11px] font-bold transition cursor-pointer disabled:opacity-50"
                >
                  {aiDrafting ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  {aiDrafting ? 'CareMatchAI đang viết...' : 'CareMatchAI chuẩn hóa báo cáo'}
                </button>
              </div>
              <textarea
                rows={3}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Ghi vài ý ngắn thực tế (vd: ăn hết cháo, uống thuốc đúng giờ...) rồi bấm 'CareMatchAI chuẩn hóa báo cáo', hoặc tự nhập chi tiết..."
                className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-stone-800 text-xs focus:outline-none focus:bg-white focus:border-emerald-600 transition"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-stone-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold transition"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold transition shadow-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                <CheckCircle2 size={15} />
                {loading ? 'Đang lưu báo cáo...' : 'Xác nhận hoàn thành ca & Lưu báo cáo'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
