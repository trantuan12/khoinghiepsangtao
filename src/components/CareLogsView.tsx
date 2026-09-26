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
  AlertTriangle,
  FileText,
  Search,
  Plus,
  RefreshCw,
  X,
  MessageSquare,
  Home,
  Users,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { API } from '@/lib/apiConfig';
import { useLocation } from 'wouter';

export interface PatientCareLog {
  id: number;
  schedule_id?: number | null;
  family_user_id: number;
  caregiver_user_id: number;
  elderly_profile_id?: number;
  elderly_name: string;
  family_name: string;
  caregiver_name: string;
  log_date: string;
  time_slot: string;
  blood_pressure_systolic: number;
  blood_pressure_diastolic: number;
  heart_rate: number;
  blood_sugar?: number | string | null;
  temperature?: number | string | null;
  spo2?: number | null;
  weight?: number | string | null;
  meal_status?: string;
  medication_status?: string;
  sleep_mood?: string;
  mobility_exercise?: string;
  tasks_completed?: string[];
  overall_condition: 'good' | 'normal' | 'attention' | 'warning';
  caregiver_notes?: string;
  family_acknowledged: boolean | number;
  family_note?: string;
  created_at?: string;
  caregiver_phone?: string;
  caregiver_avatar?: string;
  family_phone?: string;
}

export interface FamilyTreeItem {
  id: number;
  family_name: string;
  representative: string;
  phone: string;
  email: string;
  district: string;
  patients: {
    id: number;
    full_name: string;
    gender: string;
    age: number;
    district: string;
    care_needs: string[];
    logs_count: number;
  }[];
}

interface CareLogsViewProps {
  role?: 'family' | 'caregiver' | 'admin';
  currentUserId?: number;
  currentUserName?: string;
  notify?: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onOpenBookingModal?: () => void;
}

const COMMON_CARE_TASKS = [
  'Đo sinh hiệu (Huyết áp, Nhịp tim, Thân nhiệt)',
  'Hỗ trợ vệ sinh cá nhân & tắm rửa',
  'Chuẩn bị bữa ăn dinh dưỡng & nhắc ăn uống',
  'Nhắc uống thuốc theo đơn đúng giờ',
  'Xoa bóp cơ gối & hỗ trợ tập phục hồi',
  'Hỗ trợ vận động & đi dạo an toàn',
  'Dọn dẹp phòng ngủ người cao tuổi'
];

export function CareLogsView({
  role = 'family',
  currentUserId,
  currentUserName,
  notify = () => {},
  onOpenBookingModal
}: CareLogsViewProps) {
  const [, setLocation] = useLocation();
  const [logs, setLogs] = useState<PatientCareLog[]>([]);
  const [familyTree, setFamilyTree] = useState<FamilyTreeItem[]>([]);
  const [loading, setLoading] = useState(true);

  // 2 NẤC CHỌN PHÂN CẤP:
  // Nấc 1: Chọn Gia đình (Family)
  const [selectedFamilyId, setSelectedFamilyId] = useState<number | null>(null);
  // Nấc 2: Chọn Người bệnh (Patient) trong gia đình đó
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [conditionFilter, setConditionFilter] = useState<string>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedLogForDetail, setSelectedLogForDetail] = useState<PatientCareLog | null>(null);
  const [acknowledgingLogId, setAcknowledgingLogId] = useState<number | null>(null);
  const [acknowledgeNote, setAcknowledgeNote] = useState('');

  // Form tạo báo cáo mới
  const [formPatientName, setFormPatientName] = useState('Nguyễn Đỗ Tiến Danh');
  const [formFamilyName, setFormFamilyName] = useState('Gia đình Nguyễn Văn Hùng');
  const [formTimeSlot, setFormTimeSlot] = useState('Ca sáng (08:00 - 12:00)');
  const [formDate, setFormDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formBpSys, setFormBpSys] = useState(120);
  const [formBpDia, setFormBpDia] = useState(80);
  const [formHeartRate, setFormHeartRate] = useState(74);
  const [formTemp, setFormTemp] = useState(36.6);
  // Các chỉ số tùy chọn (Mặc định TRỐNG để người chăm sóc tự nhập)
  const [formSpo2, setFormSpo2] = useState<number | ''>('');
  const [formBloodSugar, setFormBloodSugar] = useState<number | ''>('');
  const [formWeight, setFormWeight] = useState<number | ''>('');
  const [formMeal, setFormMeal] = useState('');
  const [formMed, setFormMed] = useState('');
  const [formMood, setFormMood] = useState('');
  const [formMobility, setFormMobility] = useState('');
  const [formTasks, setFormTasks] = useState<string[]>([
    'Đo sinh hiệu (Huyết áp, Nhịp tim, Thân nhiệt)',
    'Hỗ trợ vệ sinh cá nhân & tắm rửa',
    'Nhắc uống thuốc theo đơn đúng giờ'
  ]);
  const [formCondition, setFormCondition] = useState<'good' | 'normal' | 'attention' | 'warning'>('good');
  const [formNotes, setFormNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Tải cây phân cấp Gia đình -> Người bệnh
  const fetchFamilyTree = async () => {
    try {
      const res = await fetch(`${API}/care-logs/families-tree`);
      if (res.ok) {
        const data: FamilyTreeItem[] = await res.json();
        setFamilyTree(data);
        if (data.length > 0 && selectedFamilyId === null) {
          // Mặc định chọn gia đình đầu tiên
          setSelectedFamilyId(data[0].id);
          if (data[0].patients.length > 0) {
            setSelectedPatientId(data[0].patients[0].id);
            setFormPatientName(data[0].patients[0].full_name);
            setFormFamilyName(data[0].family_name);
          }
        }
      }
    } catch (e) {
      console.warn('Lỗi tải cây gia đình:', e);
    }
  };

  // Tải danh sách nhật ký chăm sóc
  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (role === 'family' && currentUserId) {
        params.append('familyUserId', String(currentUserId));
      } else if (role === 'caregiver' && currentUserId) {
        params.append('caregiverUserId', String(currentUserId));
      }
      const res = await fetch(`${API}/care-logs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (e) {
      console.warn('Lỗi tải nhật ký chăm sóc:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFamilyTree();
    fetchLogs();
  }, [role, currentUserId]);

  // Gia đình đang được chọn hiện tại
  const currentSelectedFamily = useMemo(() => {
    return familyTree.find(f => f.id === selectedFamilyId) || familyTree[0];
  }, [familyTree, selectedFamilyId]);

  // Người bệnh đang được chọn hiện tại
  const currentSelectedPatient = useMemo(() => {
    if (!currentSelectedFamily) return null;
    return (
      currentSelectedFamily.patients.find(p => p.id === selectedPatientId) ||
      currentSelectedFamily.patients[0] ||
      null
    );
  }, [currentSelectedFamily, selectedPatientId]);

  // Đồng bộ lại khi đổi gia đình
  const handleSelectFamily = (familyId: number) => {
    setSelectedFamilyId(familyId);
    const fam = familyTree.find(f => f.id === familyId);
    if (fam && fam.patients.length > 0) {
      setSelectedPatientId(fam.patients[0].id);
      setFormFamilyName(fam.family_name);
      setFormPatientName(fam.patients[0].full_name);
    }
  };

  const handleSelectPatient = (patientId: number) => {
    setSelectedPatientId(patientId);
    const p = currentSelectedFamily?.patients.find(pt => pt.id === patientId);
    if (p) {
      setFormPatientName(p.full_name);
    }
  };

  // Lọc danh sách logs chỉ thuộc người bệnh đang được chọn
  const patientLogs = useMemo(() => {
    if (!currentSelectedPatient) return [];
    return logs.filter(l => {
      const matchPatient =
        (l.elderly_profile_id && l.elderly_profile_id === currentSelectedPatient.id) ||
        (l.elderly_name && l.elderly_name.toLowerCase().includes(currentSelectedPatient.full_name.toLowerCase()));

      const matchCondition =
        conditionFilter === 'all' || l.overall_condition === conditionFilter;

      const kw = searchQuery.toLowerCase().trim();
      const matchSearch =
        !kw ||
        (l.caregiver_name && l.caregiver_name.toLowerCase().includes(kw)) ||
        (l.caregiver_notes && l.caregiver_notes.toLowerCase().includes(kw));

      return matchPatient && matchCondition && matchSearch;
    });
  }, [logs, currentSelectedPatient, conditionFilter, searchQuery]);

  // Thống kê sinh hiệu trung bình CHỈ CHO ĐÚNG NGƯỜI BỆNH ĐANG CHỌN
  // Bắt buộc: Huyết áp, Nhịp tim, Thân nhiệt
  const patientVitals = useMemo(() => {
    if (patientLogs.length === 0) {
      return {
        avgSys: 120,
        avgDia: 80,
        avgHeartRate: 75,
        avgTemp: 36.6,
        count: 0
      };
    }
    const count = patientLogs.length;
    const avgSys = Math.round(
      patientLogs.reduce((acc, l) => acc + (Number(l.blood_pressure_systolic) || 120), 0) / count
    );
    const avgDia = Math.round(
      patientLogs.reduce((acc, l) => acc + (Number(l.blood_pressure_diastolic) || 80), 0) / count
    );
    const avgHeartRate = Math.round(
      patientLogs.reduce((acc, l) => acc + (Number(l.heart_rate) || 75), 0) / count
    );
    const avgTemp = (
      patientLogs.reduce((acc, l) => acc + (Number(l.temperature) || 36.6), 0) / count
    ).toFixed(1);

    return {
      avgSys,
      avgDia,
      avgHeartRate,
      avgTemp,
      count
    };
  }, [patientLogs]);

  // Xử lý gửi báo cáo mới
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPatientName.trim()) {
      notify('Vui lòng chọn hoặc nhập tên người bệnh.', 'error');
      return;
    }
    try {
      setSubmitting(true);
      const res = await fetch(`${API}/care-logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          family_user_id: currentSelectedFamily?.id || currentUserId || 10,
          caregiver_user_id: currentUserId || 21,
          elderly_profile_id: currentSelectedPatient?.id || null,
          elderly_name: formPatientName.trim(),
          family_name: formFamilyName.trim(),
          caregiver_name: currentUserName || 'Trần Văn Tuấn',
          log_date: formDate,
          time_slot: formTimeSlot,
          blood_pressure_systolic: formBpSys,
          blood_pressure_diastolic: formBpDia,
          heart_rate: formHeartRate,
          temperature: formTemp,
          spo2: formSpo2 === '' ? null : Number(formSpo2),
          blood_sugar: formBloodSugar === '' ? null : Number(formBloodSugar),
          weight: formWeight === '' ? null : Number(formWeight),
          meal_status: formMeal,
          medication_status: formMed,
          sleep_mood: formMood,
          mobility_exercise: formMobility,
          tasks_completed: formTasks,
          overall_condition: formCondition,
          caregiver_notes: formNotes
        })
      });
      if (res.ok) {
        notify('Đã thêm hồ sơ theo dõi sau ca thành công!');
        setIsCreateModalOpen(false);
        fetchLogs();
        fetchFamilyTree();
      } else {
        notify('Không thể lưu hồ sơ, vui lòng kiểm tra lại.', 'error');
      }
    } catch {
      notify('Có lỗi xảy ra khi lưu hồ sơ.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Xác nhận đã xem
  const handleAcknowledge = async (logId: number) => {
    try {
      const res = await fetch(`${API}/care-logs/${logId}/acknowledge`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ family_note: acknowledgeNote.trim() || 'Gia đình đã xem và ghi nhận chu đáo!' })
      });
      if (res.ok) {
        notify('Đã xác nhận xem hồ sơ chăm sóc!');
        setAcknowledgingLogId(null);
        setAcknowledgeNote('');
        fetchLogs();
      }
    } catch {
      notify('Lỗi khi xác nhận.', 'error');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-[26px] bg-gradient-to-r from-[#1b2f1f] via-[#263e2a] to-[#17251a] p-6 md:p-8 text-white shadow-xl border border-emerald-900/40">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3.5 py-1 text-[11px] font-bold text-emerald-300">
              <Stethoscope size={14} />
              <span>HỆ THỐNG THEO DÕI SỨC KHỎE SAU CHĂM SÓC</span>
            </div>
            <h1 className="mt-2.5 font-display text-2xl md:text-3xl font-extrabold tracking-tight text-white">
              Hồ Sơ Y Tế & Sinh Hiệu Người Thân
            </h1>
            <p className="mt-1.5 max-w-2xl text-[13.5px] text-emerald-100/80 leading-relaxed">
              Quản lý hồ sơ theo dõi lâm sàng theo từng gia đình và từng người bệnh độc lập. Bỏ qua danh xưng, tập trung giám sát các chỉ số sinh hiệu chuẩn y tế sau mỗi ca làm việc.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                fetchFamilyTree();
                fetchLogs();
                notify('Đã làm mới dữ liệu hồ sơ y tế!');
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 px-3.5 py-2 text-[12.5px] font-semibold text-white transition border border-white/10 backdrop-blur-sm"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Làm mới
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#c79750] hover:bg-[#d6a55e] px-4 py-2.5 text-[13px] font-bold text-stone-900 shadow-lg shadow-[#c79750]/20 transition"
            >
              <Plus size={16} />
              Viết Báo Cáo Sau Ca
            </button>
          </div>
        </div>
      </div>

      {/* KHỐI CHỌN 2 NẤC DẠNG CỘT (HIERARCHICAL 2-STEP SELECTOR) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* NẤC 1: CỘT CHỌN GIA ĐÌNH (Family Column) - 5 Cột */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-4 shadow-xs border border-stone-200">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-stone-100">
            <div className="flex items-center gap-2 text-stone-800 font-bold text-[13px]">
              <Home size={16} className="text-emerald-700" />
              <span>NẤC 1: CHỌN GIA ĐÌNH ({familyTree.length})</span>
            </div>
            <span className="text-[11px] text-stone-400 font-medium">Bấm chọn gia đình</span>
          </div>

          <div className="space-y-2">
            {familyTree.map(fam => {
              const isSelected = selectedFamilyId === fam.id;
              return (
                <button
                  key={fam.id}
                  onClick={() => handleSelectFamily(fam.id)}
                  className={`w-full text-left p-3 rounded-xl transition-all flex items-center justify-between border ${
                    isSelected
                      ? 'bg-emerald-900 text-white border-emerald-950 shadow-md ring-2 ring-emerald-600/30'
                      : 'bg-stone-50/70 hover:bg-stone-100/80 text-stone-800 border-stone-200/80'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                        isSelected ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {fam.representative.split(' ').slice(-1)[0][0]}
                    </div>
                    <div>
                      <div className="font-bold text-[13px] leading-snug flex items-center gap-1.5">
                        <span>{fam.family_name}</span>
                      </div>
                      <div className={`text-[11px] flex items-center gap-2 mt-0.5 ${isSelected ? 'text-emerald-200' : 'text-stone-500'}`}>
                        <span>{fam.district}</span>
                        <span>•</span>
                        <span>{fam.phone}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-stone-200 text-stone-700'
                      }`}
                    >
                      {fam.patients.length} người thân
                    </span>
                    <ChevronRight size={14} className={isSelected ? 'text-emerald-300' : 'text-stone-400'} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* NẤC 2: CỘT CHỌN NGƯỜI BỆNH TRONG GIA ĐÌNH ĐÓ (Patient Column) - 7 Cột */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-4 shadow-xs border border-stone-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-stone-100">
              <div className="flex items-center gap-2 text-stone-800 font-bold text-[13px]">
                <Users size={16} className="text-teal-700" />
                <span>
                  NẤC 2: NGƯỜI BỆNH THUỘC {currentSelectedFamily?.family_name.toUpperCase()} (
                  {currentSelectedFamily?.patients.length || 0})
                </span>
              </div>
              <span className="text-[11px] text-stone-400 font-medium">Bấm chọn hồ sơ cá nhân</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {currentSelectedFamily?.patients.map(p => {
                const isSelected = selectedPatientId === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => handleSelectPatient(p.id)}
                    className={`text-left p-3.5 rounded-xl transition-all border flex flex-col justify-between ${
                      isSelected
                        ? 'bg-teal-900 text-white border-teal-950 shadow-md ring-2 ring-teal-600/30'
                        : 'bg-stone-50/70 hover:bg-stone-100 text-stone-800 border-stone-200/80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                            isSelected ? 'bg-teal-500 text-white' : 'bg-teal-100 text-teal-800'
                          }`}
                        >
                          {p.full_name.split(' ').slice(-1)[0][0]}
                        </div>
                        <div>
                          <h4 className="font-bold text-[13.5px] leading-tight">{p.full_name}</h4>
                          <span
                            className={`text-[11px] font-medium ${
                              isSelected ? 'text-teal-200' : 'text-stone-500'
                            }`}
                          >
                            {p.age} tuổi • Giới tính: {p.gender}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {p.logs_count} ca
                      </span>
                    </div>

                    <div
                      className={`text-[11px] line-clamp-2 mt-1 pt-1.5 border-t ${
                        isSelected ? 'border-teal-800/60 text-teal-100' : 'border-stone-200 text-stone-600'
                      }`}
                    >
                      {Array.isArray(p.care_needs) && p.care_needs.length > 0
                        ? p.care_needs.join(' • ')
                        : 'Theo dõi sinh hiệu và hỗ trợ phục hồi sau ca'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {currentSelectedPatient && (
            <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
              <span>
                Đang hiển thị hồ sơ lâm sàng: <strong className="text-stone-800">{currentSelectedPatient.full_name}</strong>
              </span>
              <span className="text-[11px] bg-emerald-50 text-emerald-800 font-semibold px-2.5 py-0.5 rounded-full border border-emerald-200">
                Độc lập theo từng người
              </span>
            </div>
          )}
        </div>
      </div>

      {/* KHỐI CHỈ SỐ SINH HIỆU BẮT BUỘC (Huyết áp, Nhịp tim, Thân nhiệt) CỦA NGƯỜI BỆNH ĐANG CHỌN */}
      {currentSelectedPatient && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          {/* Huyết áp bắt buộc */}
          <div className="rounded-2xl bg-white p-4 shadow-xs border border-stone-200 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[11.5px] font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                <Activity size={15} className="text-emerald-700" />
                Huyết áp trung bình
              </span>
              <span className="text-[10.5px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Bắt buộc
              </span>
            </div>
            <div className="mt-2.5 flex items-baseline gap-1.5">
              <span className="font-mono text-2xl font-black text-stone-900">
                {patientVitals.avgSys}/{patientVitals.avgDia}
              </span>
              <span className="text-xs text-stone-400 font-medium">mmHg</span>
            </div>
            <p className="mt-1 text-[11px] text-stone-500">
              {patientVitals.avgSys >= 140 ? '⚠️ Cần lưu ý theo dõi' : '✓ Trong ngưỡng kiểm soát tốt'}
            </p>
          </div>

          {/* Nhịp tim bắt buộc */}
          <div className="rounded-2xl bg-white p-4 shadow-xs border border-stone-200">
            <div className="flex items-center justify-between">
              <span className="text-[11.5px] font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                <Heart size={15} className="text-rose-600" />
                Nhịp tim
              </span>
              <span className="text-[10.5px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                Bắt buộc
              </span>
            </div>
            <div className="mt-2.5 flex items-baseline gap-1.5">
              <span className="font-mono text-2xl font-black text-stone-900">
                {patientVitals.avgHeartRate}
              </span>
              <span className="text-xs text-stone-400 font-medium">bpm</span>
            </div>
            <p className="mt-1 text-[11px] text-stone-500">
              ✓ Đều, nhịp xoang ổn định
            </p>
          </div>

          {/* Thân nhiệt bắt buộc */}
          <div className="rounded-2xl bg-white p-4 shadow-xs border border-stone-200">
            <div className="flex items-center justify-between">
              <span className="text-[11.5px] font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                <Thermometer size={15} className="text-amber-600" />
                Thân nhiệt
              </span>
              <span className="text-[10.5px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                Bắt buộc
              </span>
            </div>
            <div className="mt-2.5 flex items-baseline gap-1.5">
              <span className="font-mono text-2xl font-black text-stone-900">
                {patientVitals.avgTemp}
              </span>
              <span className="text-xs text-stone-400 font-medium">°C</span>
            </div>
            <p className="mt-1 text-[11px] text-stone-500">
              ✓ Thân nhiệt bình thường
            </p>
          </div>

          {/* Tổng số ca chăm sóc */}
          <div className="rounded-2xl bg-white p-4 shadow-xs border border-stone-200">
            <div className="flex items-center justify-between">
              <span className="text-[11.5px] font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                <FileText size={15} className="text-indigo-600" />
                Tổng số ca chăm sóc
              </span>
              <span className="text-[10.5px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                {currentSelectedPatient.full_name}
              </span>
            </div>
            <div className="mt-2.5 flex items-baseline gap-1.5">
              <span className="font-mono text-2xl font-black text-stone-900">
                {patientVitals.count}
              </span>
              <span className="text-xs text-stone-400 font-medium">ca đã nộp</span>
            </div>
            <p className="mt-1 text-[11px] text-stone-500">
              Lưu vết y bạ sau mỗi buổi
            </p>
          </div>
        </div>
      )}

      {/* THANH TÌM KIẾM & BỘ LỌC TÌNH TRẠNG */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-stone-200 shadow-xs">
        <div className="relative w-full sm:w-96">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên người chăm sóc, ghi chú bàn giao..."
            className="w-full rounded-xl bg-stone-50 pl-10 pr-4 py-2 text-[13px] text-stone-800 placeholder-stone-400 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-[11.5px] text-stone-500 font-medium shrink-0">Tình trạng ca:</span>
          <select
            value={conditionFilter}
            onChange={e => setConditionFilter(e.target.value)}
            className="rounded-xl bg-stone-50 px-3 py-2 text-[12.5px] text-stone-700 font-medium border border-stone-200 focus:outline-none"
          >
            <option value="all">Tất cả tình trạng</option>
            <option value="good">Rất tốt (Ổn định)</option>
            <option value="normal">Bình thường</option>
            <option value="attention">Cần lưu ý</option>
            <option value="warning">Cảnh báo</option>
          </select>
        </div>
      </div>

      {/* DANH SÁCH CÁC CA CHĂM SÓC CỦA NGƯỜI BỆNH ĐANG CHỌN */}
      {loading ? (
        <div className="rounded-2xl bg-white p-12 text-center text-stone-400 border border-stone-200 shadow-xs">
          <RefreshCw size={24} className="mx-auto animate-spin mb-2 text-emerald-700" />
          <span>Đang tải nhật ký chăm sóc...</span>
        </div>
      ) : patientLogs.length === 0 ? (
        <div className="rounded-2xl bg-white p-12 text-center text-stone-500 border border-stone-200 shadow-xs">
          <Stethoscope size={36} className="mx-auto mb-3 text-stone-300" />
          <p className="font-bold text-[15px] text-stone-800">Chưa có nhật ký chăm sóc nào cho {currentSelectedPatient?.full_name}</p>
          <p className="text-xs text-stone-400 mt-1 max-w-md mx-auto">
            Sau mỗi ca làm việc, người chăm sóc sẽ đo sinh hiệu (Huyết áp, Tim, Thân nhiệt) và gửi báo cáo bàn giao tại đây.
          </p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="mt-4 px-4 py-2 rounded-xl bg-emerald-800 text-white font-bold text-xs hover:bg-emerald-700 transition"
          >
            + Viết báo cáo đầu tiên
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {patientLogs.map(log => {
            const isBpHigh = log.blood_pressure_systolic >= 140;
            return (
              <div
                key={log.id}
                className="rounded-2xl bg-white p-5 border border-stone-200 shadow-xs hover:border-emerald-700/40 transition"
              >
                {/* Header thẻ ca */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3.5 border-b border-stone-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-sm">
                      {log.elderly_name.split(' ').slice(-1)[0][0]}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-stone-900 text-[15px]">{log.elderly_name}</h3>
                        <span className="text-[11px] text-stone-400 font-medium">({log.family_name})</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold ${
                            log.overall_condition === 'good'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : log.overall_condition === 'attention'
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-stone-100 text-stone-700'
                          }`}
                        >
                          {log.overall_condition === 'good'
                            ? '✓ Tình trạng tốt'
                            : log.overall_condition === 'attention'
                            ? '⚠️ Cần lưu ý'
                            : 'Bình thường'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-stone-400 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Calendar size={13} /> {log.log_date.split('T')[0]}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock size={13} /> {log.time_slot}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* THÔNG TIN NGƯỜI CHĂM SÓC & NÚT NHẮN TIN (KHÔNG DÙNG NÚT GỌI) */}
                  <div className="flex items-center gap-2 bg-stone-50 px-3 py-1.5 rounded-xl border border-stone-100">
                    <ShieldCheck size={16} className="text-emerald-700" />
                    <div className="text-left">
                      <span className="text-[10px] text-stone-400 block font-medium">Người chăm sóc:</span>
                      <strong className="text-[12.5px] text-stone-800">{log.caregiver_name}</strong>
                    </div>

                    {/* NÚT NHẮN TIN CHUYỂN SANG /messages */}
                    <button
                      onClick={() => setLocation('/messages')}
                      className="ml-2 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1 transition shadow-xs"
                      title="Nhắn tin với người chăm sóc"
                    >
                      <MessageSquare size={13} />
                      <span>Nhắn tin</span>
                    </button>
                  </div>
                </div>

                {/* VITAL SIGNS: BẮT BUỘC (Huyết áp, Nhịp tim, Thân nhiệt) + TÙY CHỌN (Chỉ hiện SpO2 và Đường huyết nếu có) */}
                <div className="mt-4 flex flex-wrap gap-2.5">
                  {/* Huyết áp - BẮT BUỘC */}
                  <div className={`p-2.5 rounded-xl border flex-1 min-w-[140px] ${isBpHigh ? 'bg-red-50/70 border-red-200' : 'bg-stone-50 border-stone-200/80'}`}>
                    <span className="text-[11px] text-stone-500 flex items-center gap-1">
                      <Activity size={13} className={isBpHigh ? 'text-red-600' : 'text-stone-400'} />
                      Huyết áp (Bắt buộc)
                    </span>
                    <div className="mt-1 font-mono text-[16px] font-bold text-stone-900">
                      {log.blood_pressure_systolic}/{log.blood_pressure_diastolic}{' '}
                      <span className="text-[10px] font-normal text-stone-400">mmHg</span>
                    </div>
                  </div>

                  {/* Nhịp tim - BẮT BUỘC */}
                  <div className="p-2.5 rounded-xl border border-stone-200/80 bg-stone-50 flex-1 min-w-[130px]">
                    <span className="text-[11px] text-stone-500 flex items-center gap-1">
                      <Heart size={13} className="text-rose-500" />
                      Nhịp tim (Bắt buộc)
                    </span>
                    <div className="mt-1 font-mono text-[16px] font-bold text-stone-900">
                      {log.heart_rate}{' '}
                      <span className="text-[10px] font-normal text-stone-400">bpm</span>
                    </div>
                  </div>

                  {/* Thân nhiệt - BẮT BUỘC */}
                  <div className="p-2.5 rounded-xl border border-stone-200/80 bg-stone-50 flex-1 min-w-[130px]">
                    <span className="text-[11px] text-stone-500 flex items-center gap-1">
                      <Thermometer size={13} className="text-amber-500" />
                      Thân nhiệt (Bắt buộc)
                    </span>
                    <div className="mt-1 font-mono text-[16px] font-bold text-stone-900">
                      {log.temperature || 36.6}{' '}
                      <span className="text-[10px] font-normal text-stone-400">°C</span>
                    </div>
                  </div>

                  {/* SpO2 - TÙY CHỌN: CHỈ HIỂN THỊ KHI CÓ ĐO */}
                  {log.spo2 !== null && log.spo2 !== undefined && (
                    <div className="p-2.5 rounded-xl border border-teal-200 bg-teal-50/60 flex-1 min-w-[130px]">
                      <span className="text-[11px] text-teal-800 font-bold flex items-center gap-1">
                        <Wind size={13} className="text-teal-600" />
                        Oxy máu (SpO2)
                      </span>
                      <div className="mt-1 font-mono text-[16px] font-bold text-teal-900">
                        {log.spo2}%
                      </div>
                    </div>
                  )}

                  {/* Đường huyết - TÙY CHỌN: CHỈ HIỂN THỊ KHI CÓ ĐO */}
                  {log.blood_sugar !== null && log.blood_sugar !== undefined && (
                    <div className="p-2.5 rounded-xl border border-amber-200 bg-amber-50/60 flex-1 min-w-[140px]">
                      <span className="text-[11px] text-amber-800 font-bold flex items-center gap-1">
                        <Droplets size={13} className="text-amber-600" />
                        Đường huyết
                      </span>
                      <div className="mt-1 font-mono text-[16px] font-bold text-amber-900">
                        {log.blood_sugar} <span className="text-[10px] font-normal text-amber-700">mmol/L</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Ghi chú & Dặn dò điều dưỡng */}
                {log.caregiver_notes && (
                  <div className="mt-3.5 bg-stone-50/80 rounded-xl p-3 border border-stone-200/60 text-xs text-stone-700 leading-relaxed">
                    <strong className="text-stone-900 font-bold">Ghi chú & Bàn giao ca sau: </strong>
                    {log.caregiver_notes}
                  </div>
                )}

                {/* Footer thẻ ca: Chi tiết & Xác nhận gia đình */}
                <div className="mt-4 pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <button
                    onClick={() => setSelectedLogForDetail(log)}
                    className="text-emerald-800 font-bold hover:underline flex items-center gap-1"
                  >
                    Xem chi tiết toàn bộ chỉ số sinh hoạt & việc đã làm →
                  </button>

                  <div className="flex items-center gap-2">
                    {Boolean(log.family_acknowledged) ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-bold border border-emerald-200">
                        <CheckCircle2 size={13} /> Gia đình đã xem & xác nhận
                      </span>
                    ) : (
                      role === 'family' && (
                        <button
                          onClick={() => setAcknowledgingLogId(log.id)}
                          className="px-3 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] transition shadow-xs"
                        >
                          Xác nhận đã xem sổ
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* Form xác nhận của gia đình nếu đang mở */}
                {acknowledgingLogId === log.id && (
                  <div className="mt-3 p-3 rounded-xl bg-emerald-50/80 border border-emerald-200 flex flex-col sm:flex-row items-center gap-2">
                    <input
                      type="text"
                      value={acknowledgeNote}
                      onChange={e => setAcknowledgeNote(e.target.value)}
                      placeholder="Ghi chú phản hồi cho điều dưỡng (không bắt buộc)..."
                      className="flex-1 w-full bg-white border border-emerald-200 rounded-lg px-3 py-1.5 text-xs text-stone-800 focus:outline-none"
                    />
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        onClick={() => handleAcknowledge(log.id)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition"
                      >
                        Gửi xác nhận
                      </button>
                      <button
                        onClick={() => setAcknowledgingLogId(null)}
                        className="px-2.5 py-1.5 rounded-lg bg-stone-200 text-stone-700 text-xs hover:bg-stone-300 transition"
                      >
                        Hủy
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL TẠO BÁO CÁO SAU CA */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <Stethoscope size={16} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-stone-900">Báo Cáo Sức Khỏe Sau Ca Chăm Sóc</h3>
                  <p className="text-xs text-stone-400">Ghi nhận chỉ số sinh hiệu y tế & bàn giao cho gia đình</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-full text-stone-400 hover:bg-stone-100 transition"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-4 text-xs">
              {/* Chọn người bệnh */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-700 font-bold mb-1">Người bệnh được chăm sóc *</label>
                  <select
                    value={formPatientName}
                    onChange={e => setFormPatientName(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-800 font-medium focus:outline-none"
                    required
                  >
                    {familyTree.flatMap(f =>
                      f.patients.map(p => (
                        <option key={p.id} value={p.full_name}>
                          {p.full_name} ({f.family_name})
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-stone-700 font-bold mb-1">Khung giờ ca làm việc *</label>
                  <select
                    value={formTimeSlot}
                    onChange={e => setFormTimeSlot(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-800 font-medium focus:outline-none"
                  >
                    <option value="Ca sáng (08:00 - 12:00)">Ca sáng (08:00 - 12:00)</option>
                    <option value="Ca chiều (13:00 - 17:00)">Ca chiều (13:00 - 17:00)</option>
                    <option value="Ca tối (18:00 - 22:00)">Ca tối (18:00 - 22:00)</option>
                    <option value="Ca trực đêm (22:00 - 06:00)">Ca trực đêm (22:00 - 06:00)</option>
                  </select>
                </div>
              </div>

              {/* KHỐI CHỈ SỐ SINH HIỆU BẮT BUỘC */}
              <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-900 block flex items-center gap-1.5">
                  <Activity size={14} className="text-emerald-700" />
                  Chỉ số sinh hiệu Bắt buộc (*)
                </span>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-stone-600 mb-1">Huyết áp tâm thu *</label>
                    <input
                      type="number"
                      value={formBpSys}
                      onChange={e => setFormBpSys(Number(e.target.value))}
                      className="w-full bg-white border border-stone-200 rounded-xl px-3 py-1.5 font-mono text-center font-bold text-stone-900"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-stone-600 mb-1">Huyết áp tâm trương *</label>
                    <input
                      type="number"
                      value={formBpDia}
                      onChange={e => setFormBpDia(Number(e.target.value))}
                      className="w-full bg-white border border-stone-200 rounded-xl px-3 py-1.5 font-mono text-center font-bold text-stone-900"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-stone-600 mb-1">Nhịp tim (bpm) *</label>
                    <input
                      type="number"
                      value={formHeartRate}
                      onChange={e => setFormHeartRate(Number(e.target.value))}
                      className="w-full bg-white border border-stone-200 rounded-xl px-3 py-1.5 font-mono text-center font-bold text-stone-900"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-stone-600 mb-1">Thân nhiệt (°C) *</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formTemp}
                      onChange={e => setFormTemp(Number(e.target.value))}
                      className="w-full bg-white border border-stone-200 rounded-xl px-3 py-1.5 font-mono text-center font-bold text-stone-900"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-stone-600 mb-1">Đánh giá chung ca *</label>
                    <select
                      value={formCondition}
                      onChange={e => setFormCondition(e.target.value as any)}
                      className="w-full bg-white border border-stone-200 rounded-xl px-3 py-1.5 text-stone-900 font-bold"
                    >
                      <option value="good">✓ Rất tốt / Ổn định</option>
                      <option value="normal">Bình thường</option>
                      <option value="attention">⚠️ Cần lưu ý</option>
                      <option value="warning">🚨 Cảnh báo</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* KHỐI CHỈ SỐ SINH HIỆU TÙY CHỌN (SpO2, Đường huyết) */}
              <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 block">
                  Chỉ số lâm sàng tùy chọn (để trống nếu không đo)
                </span>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-stone-600 mb-1">Nồng độ Oxy máu (SpO2 %)</label>
                    <input
                      type="number"
                      value={formSpo2}
                      onChange={e => setFormSpo2(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="Không đo thì để trống"
                      className="w-full bg-white border border-stone-200 rounded-xl px-3 py-1.5 font-mono text-center text-stone-900"
                    />
                  </div>
                  <div>
                    <label className="block text-stone-600 mb-1">Đường huyết (mmol/L)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formBloodSugar}
                      onChange={e => setFormBloodSugar(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="Không đo thì để trống"
                      className="w-full bg-white border border-stone-200 rounded-xl px-3 py-1.5 font-mono text-center text-stone-900"
                    />
                  </div>
                </div>
              </div>

              {/* Ghi chú bàn giao */}
              <div>
                <label className="block text-stone-700 font-bold mb-1">Ghi chú & Dặn dò cho ca tiếp theo và gia đình</label>
                <textarea
                  rows={3}
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  placeholder="Ghi nhận diễn biến sức khỏe, lưu ý thuốc men..."
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-stone-800 text-xs focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold transition shadow-sm"
                >
                  {submitting ? 'Đang lưu...' : 'Lưu & Nộp Báo Cáo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL XEM CHI TIẾT CA CHĂM SÓC */}
      {selectedLogForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-xl p-6 shadow-2xl border border-stone-200 animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="font-bold text-stone-900 text-base flex items-center gap-2">
                <FileText size={18} className="text-emerald-700" />
                Chi Tiết Báo Cáo Ca: {selectedLogForDetail.elderly_name}
              </h3>
              <button
                onClick={() => setSelectedLogForDetail(null)}
                className="p-1 rounded-full text-stone-400 hover:bg-stone-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-stone-50 p-3.5 rounded-xl border border-stone-100">
                <div>
                  <span className="text-stone-400 block text-[10px]">Thời gian ca:</span>
                  <span className="font-bold text-stone-800">{selectedLogForDetail.log_date.split('T')[0]} ({selectedLogForDetail.time_slot})</span>
                </div>
                <div>
                  <span className="text-stone-400 block text-[10px]">Người chăm sóc:</span>
                  <span className="font-bold text-stone-800">{selectedLogForDetail.caregiver_name}</span>
                </div>
              </div>

              {/* Bảng sinh hiệu */}
              <div className="border border-stone-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-100 text-stone-600 font-bold">
                    <tr>
                      <th className="py-2 px-3">Chỉ số sinh tồn</th>
                      <th className="py-2 px-3">Kết quả đo</th>
                      <th className="py-2 px-3">Phân loại</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    <tr>
                      <td className="py-2 px-3 font-semibold text-stone-700">Huyết áp</td>
                      <td className="py-2 px-3 font-mono font-bold text-stone-900">
                        {selectedLogForDetail.blood_pressure_systolic}/{selectedLogForDetail.blood_pressure_diastolic} mmHg
                      </td>
                      <td className="py-2 px-3">
                        {selectedLogForDetail.blood_pressure_systolic >= 140 ? (
                          <span className="text-red-600 font-bold">Cao huyết áp</span>
                        ) : (
                          <span className="text-emerald-700 font-bold">Bình thường</span>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-semibold text-stone-700">Nhịp tim</td>
                      <td className="py-2 px-3 font-mono font-bold text-stone-900">{selectedLogForDetail.heart_rate} bpm</td>
                      <td className="py-2 px-3 text-emerald-700 font-bold">Đều</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-semibold text-stone-700">Thân nhiệt</td>
                      <td className="py-2 px-3 font-mono font-bold text-stone-900">{selectedLogForDetail.temperature || 36.6} °C</td>
                      <td className="py-2 px-3 text-emerald-700 font-bold">Bình thường</td>
                    </tr>
                    {selectedLogForDetail.spo2 !== null && (
                      <tr>
                        <td className="py-2 px-3 font-semibold text-teal-800">SpO2 (Oxy máu)</td>
                        <td className="py-2 px-3 font-mono font-bold text-teal-900">{selectedLogForDetail.spo2}%</td>
                        <td className="py-2 px-3 text-teal-700 font-bold">Tùy chọn đã đo</td>
                      </tr>
                    )}
                    {selectedLogForDetail.blood_sugar !== null && (
                      <tr>
                        <td className="py-2 px-3 font-semibold text-amber-800">Đường huyết</td>
                        <td className="py-2 px-3 font-mono font-bold text-amber-900">{selectedLogForDetail.blood_sugar} mmol/L</td>
                        <td className="py-2 px-3 text-amber-700 font-bold">Tùy chọn đã đo</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Lời dặn bàn giao */}
              <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-100">
                <span className="text-stone-400 block text-[10.5px] font-bold uppercase mb-1">Bàn giao & Lời dặn ca sau:</span>
                <p className="text-stone-700 leading-relaxed">{selectedLogForDetail.caregiver_notes}</p>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-stone-100 flex justify-end">
              <button
                onClick={() => setSelectedLogForDetail(null)}
                className="px-4 py-2 rounded-xl bg-stone-800 text-white font-bold text-xs hover:bg-stone-700 transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
