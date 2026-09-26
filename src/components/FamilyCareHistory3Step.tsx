import React, { useState, useEffect, useMemo } from 'react';
import {
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
  FileText,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Home,
  Users,
  ChevronRight
} from 'lucide-react';
import { useLocation } from 'wouter';
import { PatientCareLog, FamilyTreeItem } from './CareLogsView';
import { API } from '@/lib/apiConfig';

interface FamilyCareHistory3StepProps {
  familyUserId?: number;
  initialPatientId?: number | null;
  notify?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export function FamilyCareHistory3Step({
  familyUserId,
  initialPatientId,
  notify = () => {}
}: FamilyCareHistory3StepProps) {
  const [, setLocation] = useLocation();
  const [familyTree, setFamilyTree] = useState<FamilyTreeItem[]>([]);
  const [logs, setLogs] = useState<PatientCareLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Nấc 1 (cũ là Nấc 2): Chọn Người Thân
  const [selectedFamilyId, setSelectedFamilyId] = useState<number | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  // Nấc 2 (cũ là Nấc 3): Lần chăm sóc đang được mở rộng chi tiết
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);

  // Tải cây gia đình và danh sách nhật ký
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [treeRes, logsRes] = await Promise.all([
          fetch(`${API}/care-logs/families-tree`),
          fetch(`${API}/care-logs`)
        ]);
        if (treeRes.ok) {
          const treeData: FamilyTreeItem[] = await treeRes.json();
          setFamilyTree(treeData);

          // TỰ ĐỘNG chọn gia đình dựa trên familyUserId (không hiển thị Nấc 1 nữa)
          const defaultFam = (familyUserId ? treeData.find(f => f.id === familyUserId) : null) || treeData[0];
          if (defaultFam) {
            setSelectedFamilyId(defaultFam.id);
            if (defaultFam.patients.length > 0) {
              const defaultPatient = initialPatientId
                ? defaultFam.patients.find(p => p.id === initialPatientId) || defaultFam.patients[0]
                : defaultFam.patients[0];
              setSelectedPatientId(defaultPatient.id);
            }
          }
        }
        if (logsRes.ok) {
          const logsData: PatientCareLog[] = await logsRes.json();
          setLogs(logsData);
        }
      } catch (e) {
        console.warn('Lỗi tải dữ liệu lịch sử chăm sóc:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [familyUserId, initialPatientId]);

  // Gia đình hiện tại (tự động chọn, không cần user chọn)
  const currentFamily = useMemo(() => {
    return familyTree.find(f => f.id === selectedFamilyId) || familyTree[0];
  }, [familyTree, selectedFamilyId]);

  // Người thân hiện tại
  const currentPatient = useMemo(() => {
    if (!currentFamily) return null;
    return currentFamily.patients.find(p => p.id === selectedPatientId) || currentFamily.patients[0] || null;
  }, [currentFamily, selectedPatientId]);

  // Danh sách các lần chăm sóc của người thân hiện tại (Sắp xếp từ mới đến cũ)
  const patientLogs = useMemo(() => {
    if (!currentPatient) return [];
    const list = logs.filter(l => {
      return (
        (l.elderly_profile_id && l.elderly_profile_id === currentPatient.id) ||
        (l.elderly_name && l.elderly_name.toLowerCase().includes(currentPatient.full_name.toLowerCase()))
      );
    });
    // Tự động mở lần đầu tiên nếu chưa mở
    if (list.length > 0 && expandedLogId === null) {
      setExpandedLogId(list[0].id);
    }
    return list;
  }, [logs, currentPatient, expandedLogId]);

  const handleSelectPatient = (patientId: number) => {
    setSelectedPatientId(patientId);
    setExpandedLogId(null);
  };

  return (
    <div className="bg-white rounded-3xl p-6 md:p-8 shadow-xs border border-stone-200 space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-stone-100">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-800 border border-emerald-200">
            <Stethoscope size={13} />
            <span>THEO DÕI SAU CHĂM SÓC GIA ĐÌNH (2 NẤC PHÂN CẤP)</span>
          </div>
          <h3 className="mt-2 text-xl md:text-2xl font-bold text-stone-900">
            Lịch Sử Chăm Sóc & Sinh Hiệu Qua Các Lần
          </h3>
          <p className="mt-1 text-xs text-stone-500">
            Chọn người thân trong gia đình, sau đó bấm vào từng Lần (Lần 1, Lần 2, Lần 3...) để xem chi tiết sinh hiệu và dặn dò của người chăm sóc.
          </p>
          {currentFamily && (
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-emerald-900 text-white px-3 py-1.5 text-[11.5px] font-bold">
              <Home size={13} />
              <span>{currentFamily.family_name}</span>
              <span className="text-emerald-300 font-normal">• {currentFamily.district} • {currentFamily.patients.length} người thân</span>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-stone-400 text-xs">
          Đang tải lịch sử chăm sóc qua các lần...
        </div>
      ) : (
        <div className="space-y-6">
          {/* NẤC 1: CHỌN NGƯỜI THÂN TRONG GIA ĐÌNH */}
          {currentFamily && (
            <div>
              <label className="text-[11.5px] font-bold uppercase tracking-wider text-stone-500 mb-2.5 flex items-center gap-1.5">
                <Users size={14} className="text-teal-700" />
                Nấc 1: Chọn Thành Viên Trong {currentFamily.family_name.toUpperCase()} ({currentFamily.patients.length})
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {currentFamily.patients.map(p => {
                  const isSelected = selectedPatientId === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => handleSelectPatient(p.id)}
                      className={`p-3.5 rounded-2xl text-left border transition-all flex items-center justify-between ${
                        isSelected
                          ? 'bg-teal-900 text-white border-teal-950 shadow-md ring-2 ring-teal-600/30'
                          : 'bg-stone-50/70 hover:bg-stone-100 text-stone-800 border-stone-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-full font-bold flex items-center justify-center text-xs ${
                            isSelected ? 'bg-teal-500 text-white' : 'bg-teal-100 text-teal-800'
                          }`}
                        >
                          {p.full_name.split(' ').slice(-1)[0][0]}
                        </div>
                        <div>
                          <div className="font-bold text-[13.5px]">{p.full_name}</div>
                          <div className={`text-[11px] ${isSelected ? 'text-teal-200' : 'text-stone-500'}`}>
                            {p.age} tuổi • Giới tính: {p.gender}
                          </div>
                        </div>
                      </div>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-bold ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {p.logs_count} lần chăm sóc
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* NẤC 2: DANH SÁCH CÁC LẦN CHĂM SÓC (LẦN 1, LẦN 2, LẦN 3...) */}
          {currentPatient && (
            <div className="pt-2 border-t border-stone-100">
              <label className="text-[11.5px] font-bold uppercase tracking-wider text-stone-500 mb-3 flex items-center gap-1.5">
                <Clock size={14} className="text-indigo-700" />
                Nấc 2: Các Lần Chăm Sóc Đã Thực Hiện Cho {currentPatient.full_name.toUpperCase()} ({patientLogs.length} lần)
              </label>

              {patientLogs.length === 0 ? (
                <div className="rounded-2xl bg-stone-50 p-8 text-center text-stone-500 text-xs border border-stone-200">
                  Chưa có lần chăm sóc nào được ghi nhận cho {currentPatient.full_name}.
                </div>
              ) : (
                <div className="space-y-3">
                  {patientLogs.map((log, index) => {
                    const isExpanded = expandedLogId === log.id;
                    const iterationNum = patientLogs.length - index; // Lần 1, Lần 2, Lần 3...
                    const isBpHigh = log.blood_pressure_systolic >= 140;

                    return (
                      <div
                        key={log.id}
                        className="rounded-2xl border border-stone-200 overflow-hidden bg-stone-50/50 hover:border-emerald-700/40 transition"
                      >
                        {/* Header của Lần: Click để mở/đóng */}
                        <div
                          onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                          className="p-4 flex items-center justify-between cursor-pointer bg-white hover:bg-stone-50/80 transition"
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 font-extrabold flex items-center justify-center text-xs">
                              #{iterationNum}
                            </span>
                            <div>
                              <div className="font-bold text-[13.5px] text-stone-900 flex items-center gap-2">
                                <span>Lần {iterationNum}: {log.log_date.split('T')[0]} ({log.time_slot})</span>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    log.overall_condition === 'good'
                                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                      : 'bg-amber-50 text-amber-800 border border-amber-200'
                                  }`}
                                >
                                  {log.overall_condition === 'good' ? '✓ Rất tốt' : '⚠️ Cần lưu ý'}
                                </span>
                              </div>
                              <div className="text-[11px] text-stone-500 mt-0.5 flex items-center gap-2">
                                <span>Người chăm sóc: <strong>{log.caregiver_name}</strong></span>
                                <span>•</span>
                                <span>Huyết áp: {log.blood_pressure_systolic}/{log.blood_pressure_diastolic} mmHg</span>
                                <span>•</span>
                                <span>Nhịp tim: {log.heart_rate} bpm</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs text-stone-400 font-medium hidden sm:inline">
                              {isExpanded ? 'Thu gọn' : 'Bấm xem chi tiết'}
                            </span>
                            {isExpanded ? <ChevronUp size={16} className="text-stone-500" /> : <ChevronDown size={16} className="text-stone-500" />}
                          </div>
                        </div>

                        {/* Chi tiết nội dung của Lần chăm sóc khi mở rộng */}
                        {isExpanded && (
                          <div className="p-4 md:p-5 border-t border-stone-100 bg-white space-y-4 text-xs animate-in fade-in duration-150">
                            {/* Khối sinh hiệu: Bắt buộc + Tùy chọn */}
                            <div>
                              <span className="text-[10.5px] font-bold uppercase tracking-wider text-stone-400 block mb-2">
                                Kết Quả Đo Sinh Hiệu Lâm Sàng
                              </span>
                              <div className="flex flex-wrap gap-2.5">
                                {/* Huyết áp - Bắt buộc */}
                                <div className={`p-2.5 rounded-xl border flex-1 min-w-[130px] ${isBpHigh ? 'bg-red-50/70 border-red-200' : 'bg-stone-50 border-stone-200'}`}>
                                  <span className="text-[10.5px] text-stone-500 flex items-center gap-1">
                                    <Activity size={12} className={isBpHigh ? 'text-red-600' : 'text-stone-400'} />
                                    Huyết áp (Bắt buộc)
                                  </span>
                                  <div className="mt-1 font-mono text-[15px] font-bold text-stone-900">
                                    {log.blood_pressure_systolic}/{log.blood_pressure_diastolic} <span className="text-[10px] font-normal text-stone-400">mmHg</span>
                                  </div>
                                </div>

                                {/* Nhịp tim - Bắt buộc */}
                                <div className="p-2.5 rounded-xl border border-stone-200 bg-stone-50 flex-1 min-w-[120px]">
                                  <span className="text-[10.5px] text-stone-500 flex items-center gap-1">
                                    <Heart size={12} className="text-rose-500" />
                                    Nhịp tim (Bắt buộc)
                                  </span>
                                  <div className="mt-1 font-mono text-[15px] font-bold text-stone-900">
                                    {log.heart_rate} <span className="text-[10px] font-normal text-stone-400">bpm</span>
                                  </div>
                                </div>

                                {/* Thân nhiệt - Bắt buộc */}
                                <div className="p-2.5 rounded-xl border border-stone-200 bg-stone-50 flex-1 min-w-[120px]">
                                  <span className="text-[10.5px] text-stone-500 flex items-center gap-1">
                                    <Thermometer size={12} className="text-amber-500" />
                                    Thân nhiệt (Bắt buộc)
                                  </span>
                                  <div className="mt-1 font-mono text-[15px] font-bold text-stone-900">
                                    {log.temperature || 36.6} <span className="text-[10px] font-normal text-stone-400">°C</span>
                                  </div>
                                </div>

                                {/* SpO2 - Tùy chọn */}
                                {log.spo2 !== null && log.spo2 !== undefined && (
                                  <div className="p-2.5 rounded-xl border border-teal-200 bg-teal-50/60 flex-1 min-w-[120px]">
                                    <span className="text-[10.5px] text-teal-800 font-bold flex items-center gap-1">
                                      <Wind size={12} className="text-teal-600" />
                                      SpO2 (Oxy máu)
                                    </span>
                                    <div className="mt-1 font-mono text-[15px] font-bold text-teal-900">
                                      {log.spo2}%
                                    </div>
                                  </div>
                                )}

                                {/* Đường huyết - Tùy chọn */}
                                {log.blood_sugar !== null && log.blood_sugar !== undefined && (
                                  <div className="p-2.5 rounded-xl border border-amber-200 bg-amber-50/60 flex-1 min-w-[120px]">
                                    <span className="text-[10.5px] text-amber-800 font-bold flex items-center gap-1">
                                      <Droplets size={12} className="text-amber-600" />
                                      Đường huyết
                                    </span>
                                    <div className="mt-1 font-mono text-[15px] font-bold text-amber-900">
                                      {log.blood_sugar} <span className="text-[10px] font-normal text-amber-700">mmol/L</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Người chăm sóc & nút Nhắn tin */}
                            <div className="flex items-center justify-between bg-stone-50 p-3 rounded-xl border border-stone-100">
                              <div className="flex items-center gap-2">
                                <ShieldCheck size={16} className="text-emerald-700" />
                                <div>
                                  <span className="text-[10px] text-stone-400 block font-medium">Người chăm sóc ca này:</span>
                                  <strong className="text-[12.5px] text-stone-800">{log.caregiver_name}</strong>
                                </div>
                              </div>
                              <button
                                onClick={() => setLocation('/messages')}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1 transition shadow-xs"
                              >
                                <MessageSquare size={13} />
                                <span>Nhắn tin</span>
                              </button>
                            </div>

                            {/* Ghi chú & Dặn dò */}
                            {log.caregiver_notes && (
                              <div className="p-3 bg-stone-50 rounded-xl border border-stone-100 text-xs text-stone-700">
                                <strong className="text-stone-900 block font-bold mb-1">Dặn dò của người chăm sóc:</strong>
                                <p className="leading-relaxed">{log.caregiver_notes}</p>
                              </div>
                            )}

                            {/* Xác nhận của gia đình */}
                            <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11.5px]">
                              <span className="text-stone-400">Trạng thái xác nhận:</span>
                              <span className="inline-flex items-center gap-1 text-emerald-800 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                                <CheckCircle2 size={13} /> Gia đình đã xem & xác nhận
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

