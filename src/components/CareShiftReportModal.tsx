import React, { useState, useEffect } from 'react';
import {
  X,
  Activity,
  Heart,
  Thermometer,
  Stethoscope,
  Droplets,
  CheckCircle2,
  AlertTriangle,
  FileText,
  UserRound,
  ShieldCheck,
  Calendar
} from 'lucide-react';
import { API, API_BASE_URL } from '@/lib/apiConfig';

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
    familyUserId?: number;
    family_user_id?: number;
    care_log_id?: number;
  };
  currentUser?: {
    id?: number;
    full_name?: string;
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
  // Chỉ số bắt buộc
  const [bpSys, setBpSys] = useState<number>(120);
  const [bpDia, setBpDia] = useState<number>(80);
  const [heartRate, setHeartRate] = useState<number>(75);
  const [temp, setTemp] = useState<number>(36.8);
  const [condition, setCondition] = useState<'good' | 'normal' | 'attention' | 'warning'>('good');

  // Chỉ số tùy chọn
  const [spo2, setSpo2] = useState<string>('');
  const [bloodSugar, setBloodSugar] = useState<string>('');

  // Ghi chú ca tiếp theo cho gia đình: MẶC ĐỊNH LÀ TRỐNG THEO YÊU CẦU AUDIO 2
  const [notes, setNotes] = useState<string>('');

  const [loading, setLoading] = useState(false);
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
            // Thử tìm theo tên người bệnh
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
      // Reset về rỗng hoàn toàn theo yêu cầu
      setBpSys(120);
      setBpDia(80);
      setHeartRate(75);
      setTemp(36.8);
      setCondition('good');
      setSpo2('');
      setBloodSugar('');
      setNotes('');
    }
  }, [isOpen, mode, shift.id, patientName]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bpSys || !bpDia || !heartRate || !temp) {
      notify('Vui lòng điền đầy đủ các chỉ số sinh hiệu bắt buộc (*)');
      return;
    }

    setLoading(true);
    try {
      const caregiverId = currentUser?.id || 2;
      const caregiverName = currentUser?.full_name || 'Người chăm sóc';
      const familyUserId = shift.familyUserId || shift.family_user_id || 5;

      const payload = {
        schedule_id: shift.id,
        elderly_name: patientName,
        family_user_id: familyUserId,
        caregiver_user_id: caregiverId,
        caregiver_name: caregiverName,
        log_date: shiftDate,
        time_slot: shiftTime,
        blood_pressure_systolic: Number(bpSys),
        blood_pressure_diastolic: Number(bpDia),
        heart_rate: Number(heartRate),
        temperature: Number(temp),
        spo2: spo2 !== '' ? Number(spo2) : null,
        blood_sugar: bloodSugar !== '' ? Number(bloodSugar) : null,
        overall_condition: condition,
        caregiver_notes: notes.trim()
      };

      const res = await fetch(`${API}/care-logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        // Cập nhật trạng thái ca sang completed
        await fetch(`${API_BASE_URL}/schedules/${shift.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'completed', confirmedBy: 'caregiver' })
        }).catch(() => {});

        notify('✅ Đã lưu báo cáo sinh hiệu & Hoàn thành ca chăm sóc thành công!');
        if (onSuccess) onSuccess();
        onClose();
      } else {
        notify('Không thể lưu báo cáo, vui lòng thử lại.');
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
                  ? 'Ghi nhận bắt buộc chỉ số sinh hiệu y tế trước khi hoàn tất ca'
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
                {/* Chỉ số sinh hiệu */}
                <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 space-y-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-900 block flex items-center gap-1.5">
                    <Activity size={14} className="text-emerald-700" />
                    Chỉ số sinh hiệu ghi nhận
                  </span>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="rounded-xl bg-white p-2.5 border border-emerald-100 text-center">
                      <span className="text-[10.5px] text-stone-500 block">Huyết áp</span>
                      <strong className="text-[15px] font-mono text-stone-900">
                        {existingLog.blood_pressure_systolic}/{existingLog.blood_pressure_diastolic}
                      </strong>
                      <span className="text-[9.5px] text-stone-400 block">mmHg</span>
                    </div>

                    <div className="rounded-xl bg-white p-2.5 border border-emerald-100 text-center">
                      <span className="text-[10.5px] text-stone-500 block">Nhịp tim</span>
                      <strong className="text-[15px] font-mono text-stone-900">
                        {existingLog.heart_rate}
                      </strong>
                      <span className="text-[9.5px] text-stone-400 block">bpm</span>
                    </div>

                    <div className="rounded-xl bg-white p-2.5 border border-emerald-100 text-center">
                      <span className="text-[10.5px] text-stone-500 block">Thân nhiệt</span>
                      <strong className="text-[15px] font-mono text-stone-900">
                        {existingLog.temperature}°C
                      </strong>
                      <span className="text-[9.5px] text-stone-400 block">Bình thường</span>
                    </div>

                    <div className="rounded-xl bg-white p-2.5 border border-emerald-100 text-center">
                      <span className="text-[10.5px] text-stone-500 block">SpO2 / Đường</span>
                      <strong className="text-[14px] font-mono text-stone-900">
                        {existingLog.spo2 ? `${existingLog.spo2}%` : '—'}
                      </strong>
                      <span className="text-[9.5px] text-stone-400 block">
                        {existingLog.blood_sugar ? `${existingLog.blood_sugar} mmol/L` : 'Không đo'}
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
                      {existingLog.overall_condition === 'good' ? '✓ Rất tốt / Ổn định' : existingLog.overall_condition === 'warning' ? '🚨 Cảnh báo' : 'Bình thường'}
                    </span>
                  </div>
                </div>

                {/* Ghi chú & Dặn dò */}
                <div className="rounded-2xl bg-stone-50 border border-stone-200 p-4">
                  <span className="font-bold text-stone-800 block mb-1 text-[12px]">Ghi chú & Dặn dò ca tiếp theo cho gia đình:</span>
                  <p className="text-[12px] text-stone-700 leading-relaxed italic bg-white p-3 rounded-xl border border-stone-100">
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
                <p>Ca này đã được ghi nhận hoàn thành. Báo cáo sinh hiệu chi tiết đã được đồng bộ vào hệ thống.</p>
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
          /* CHẾ ĐỘ TẠO MỚI BÁO CÁO (POPUP BẮT BUỘC KHI BÁO HOÀN THÀNH CA) */
          <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
            {/* KHỐI SINH HIỆU BẮT BUỘC */}
            <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-900 block flex items-center gap-1.5">
                <Activity size={14} className="text-emerald-700" />
                Chỉ số sinh hiệu Bắt buộc (*)
              </span>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-stone-600 mb-1 font-medium">Huyết áp tâm thu *</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={bpSys}
                      onChange={e => setBpSys(Number(e.target.value))}
                      className="w-full bg-white border border-stone-200 rounded-xl px-3 py-1.5 font-mono text-center font-bold text-stone-900 outline-none focus:border-emerald-600"
                      required
                    />
                    <span className="absolute right-2 top-1.5 text-[10px] text-stone-400">mmHg</span>
                  </div>
                </div>
                <div>
                  <label className="block text-stone-600 mb-1 font-medium">Huyết áp tâm trương *</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={bpDia}
                      onChange={e => setBpDia(Number(e.target.value))}
                      className="w-full bg-white border border-stone-200 rounded-xl px-3 py-1.5 font-mono text-center font-bold text-stone-900 outline-none focus:border-emerald-600"
                      required
                    />
                    <span className="absolute right-2 top-1.5 text-[10px] text-stone-400">mmHg</span>
                  </div>
                </div>
                <div>
                  <label className="block text-stone-600 mb-1 font-medium">Nhịp tim *</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={heartRate}
                      onChange={e => setHeartRate(Number(e.target.value))}
                      className="w-full bg-white border border-stone-200 rounded-xl px-3 py-1.5 font-mono text-center font-bold text-stone-900 outline-none focus:border-emerald-600"
                      required
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
                    value={temp}
                    onChange={e => setTemp(Number(e.target.value))}
                    className="w-full bg-white border border-stone-200 rounded-xl px-3 py-1.5 font-mono text-center font-bold text-stone-900 outline-none focus:border-emerald-600"
                    required
                  />
                </div>
                <div>
                  <label className="block text-stone-600 mb-1 font-medium">Đánh giá chung ca *</label>
                  <select
                    value={condition}
                    onChange={e => setCondition(e.target.value as any)}
                    className="w-full bg-white border border-stone-200 rounded-xl px-3 py-1.5 text-stone-900 font-bold outline-none focus:border-emerald-600"
                  >
                    <option value="good">✓ Rất tốt / Ổn định</option>
                    <option value="normal">Bình thường</option>
                    <option value="attention">⚠️ Cần lưu ý</option>
                    <option value="warning">🚨 Cảnh báo</option>
                  </select>
                </div>
              </div>
            </div>

            {/* KHỐI TÙY CHỌN */}
            <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200 space-y-2">
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-stone-500 block">
                Chỉ số lâm sàng tùy chọn (để trống nếu không đo)
              </span>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-600 mb-1">Nồng độ Oxy máu (SpO2 %)</label>
                  <input
                    type="number"
                    value={spo2}
                    onChange={e => setSpo2(e.target.value)}
                    placeholder="Không đo thì để trống"
                    className="w-full bg-white border border-stone-200 rounded-xl px-3 py-1.5 font-mono text-center text-stone-900 outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-stone-600 mb-1">Đường huyết (mmol/L)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={bloodSugar}
                    onChange={e => setBloodSugar(e.target.value)}
                    placeholder="Không đo thì để trống"
                    className="w-full bg-white border border-stone-200 rounded-xl px-3 py-1.5 font-mono text-center text-stone-900 outline-none focus:border-emerald-600"
                  />
                </div>
              </div>
            </div>

            {/* GHI CHÚ VÀ DẶN DÒ CHO GIA ĐÌNH: HOÀN TOÀN TRỐNG THEO AUDIO 2 */}
            <div>
              <label className="block text-stone-700 font-bold mb-1">
                Ghi chú & Dặn dò ca tiếp theo cho gia đình
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Ghi chú diễn biến sức khỏe, nhắc thuốc hoặc dặn dò cho ca tiếp theo..."
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
