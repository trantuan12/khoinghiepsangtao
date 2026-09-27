import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, 
  UploadCloud, 
  FileCheck2, 
  Clock, 
  Calendar, 
  DollarSign, 
  Star, 
  CheckCircle2, 
  AlertCircle, 
  Send, 
  UserRound, 
  BriefcaseBusiness, 
  Award, 
  FileText, 
  MapPin, 
  Check,
  Eye,
  Trash2,
  X,
  Upload,
  Sparkles,
  Info,
  Lock,
  Edit3,
  Phone,
  CreditCard,
  Plus,
  Building2,
  Video,
  Home,
  ExternalLink,
  ThumbsUp,
  MessageSquareQuote,
  RefreshCw,
  Stethoscope
} from 'lucide-react';
import { store, ScheduleItem } from '@/lib/store';
import { CareShiftReportModal } from './CareShiftReportModal';
import { PatientMedicalHistoryModal } from './PatientMedicalHistoryModal';
import { API, API_BASE_URL } from '@/lib/apiConfig';
import { compressImage } from '@/lib/imageUtils';

export interface WorkHistoryItem {
  id: string;
  workplace: string;
  role: string;
  from_date: string;
  to_date: string;
  description: string;
}

export interface CaregiverDoc {
  type: string;
  name: string;
  url: string;
  filename?: string;
  uploadedAt?: string;
}

interface CurrentUser {
  id: number;
  username: string;
  full_name: string;
  email: string;
  role: string;
  phone?: string;
}

interface CaregiverPortalProps {
  notify: (msg: string) => void;
  onNavigateToRole?: (role: string) => void;
  currentUser?: CurrentUser;
  initialTab?: 'profile' | 'schedule' | 'earnings' | 'reviews';
}

const COMMON_SKILLS = [
  "Theo dõi huyết áp & đường huyết",
  "Nấu ăn mềm & dinh dưỡng người già",
  "Hỗ trợ phục hồi vận động & tập đi",
  "Xoa bóp cổ vai gáy & bấm huyệt",
  "Chăm sóc sau tai biến & phẫu thuật",
  "Đỡ tắm, vệ sinh cá nhân & chống loét",
  "Nhắc nhở uống thuốc đúng giờ",
  "Trò chuyện & đồng hành tâm lý"
];



// Hàm xử lý hậu kỳ số năm kinh nghiệm: nếu < 10 tự động thêm số 0 ở đầu (VD: '8' -> '08')
export const formatExperience = (val: string | number | undefined | null) => {
  const digits = String(val ?? '').replace(/\D/g, '');
  if (!digits) return '00';
  const n = parseInt(digits, 10);
  return n < 10 ? `0${n}` : `${n}`;
};

function MonthYearPicker({
  label,
  value,
  onChange,
  isToDate = false
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  isToDate?: boolean;
}) {
  const isPresent = isToDate && (value === 'Hiện tại' || value === 'Đến nay');
  
  // Phân tích giá trị MM/YYYY hoặc YYYY-MM
  const parseVal = (v: string) => {
    if (!v || v === 'Hiện tại' || v === 'Đến nay') return { month: '', year: '' };
    if (/^\d{4}-\d{2}$/.test(v)) {
      const [y, m] = v.split('-');
      return { month: m, year: y };
    }
    const match = v.match(/^(\d{1,2})\/(\d{4})$/);
    if (match) {
      return { month: match[1].padStart(2, '0'), year: match[2] };
    }
    if (/^\d{4}$/.test(v)) {
      return { month: '01', year: v };
    }
    return { month: '', year: '' };
  };

  const { month, year } = parseVal(value);
  const hiddenDateInputRef = useRef<HTMLInputElement>(null);

  const handleMonthChange = (newMonth: string) => {
    if (!newMonth) {
      onChange(year ? `01/${year}` : '');
      return;
    }
    const currentYear = year || new Date().getFullYear().toString();
    onChange(`${newMonth}/${currentYear}`);
  };

  const handleYearChange = (newYearRaw: string) => {
    // Giới hạn tối đa 4 số
    const cleanYear = newYearRaw.replace(/\D/g, '').slice(0, 4);
    if (!cleanYear) {
      onChange('');
      return;
    }
    const currentMonth = month || '01';
    onChange(`${currentMonth}/${cleanYear}`);
  };

  const handleCalendarPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value; // YYYY-MM
    if (val && /^\d{4}-\d{2}$/.test(val)) {
      const [y, m] = val.split('-');
      onChange(`${m}/${y}`);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-[10.5px] font-semibold text-gray-700">
          {label} *
        </label>
        {isToDate && (
          <label className="inline-flex items-center gap-1 text-[10.5px] font-bold text-[#345931] cursor-pointer hover:underline">
            <input 
              type="checkbox" 
              checked={isPresent}
              onChange={e => {
                if (e.target.checked) {
                  onChange('Hiện tại');
                } else {
                  const now = new Date();
                  const m = String(now.getMonth() + 1).padStart(2, '0');
                  const y = String(now.getFullYear());
                  onChange(`${m}/${y}`);
                }
              }}
              className="rounded text-[#345931] focus:ring-0"
            />
            Đến nay (Hiện tại)
          </label>
        )}
      </div>

      {isPresent ? (
        <div className="h-9 w-full rounded-lg border border-[#a8cea1] bg-[#f0f8ee] px-3 flex items-center justify-between text-[12px] font-bold text-[#2d5229]">
          <span>🌟 Đến nay (Đang công tác tại đây)</span>
          <button 
            type="button" 
            onClick={() => {
              const now = new Date();
              const m = String(now.getMonth() + 1).padStart(2, '0');
              const y = String(now.getFullYear());
              onChange(`${m}/${y}`);
            }}
            className="text-[10.5px] text-gray-500 hover:text-red-600 underline font-normal cursor-pointer"
          >
            Đổi sang tháng/năm
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1.5">
          {/* Chọn tháng từ 01 -> 12 */}
          <select
            value={month}
            onChange={e => handleMonthChange(e.target.value)}
            className="h-9 w-[110px] rounded-lg border border-gray-200 bg-white px-2 text-[12px] font-medium outline-none focus:border-[#435d41]"
          >
            <option value="">-- Tháng --</option>
            {Array.from({ length: 12 }, (_, i) => {
              const m = String(i + 1).padStart(2, '0');
              return (
                <option key={m} value={m}>
                  Tháng {m}
                </option>
              );
            })}
          </select>

          {/* Nhập năm: giới hạn 4 số */}
          <div className="relative flex-1">
            <input
              type="number"
              min={1970}
              max={2099}
              placeholder="Năm (4 số)"
              value={year}
              onChange={e => handleYearChange(e.target.value)}
              className="h-9 w-full rounded-lg border border-gray-200 bg-white pl-2.5 pr-8 text-[12px] outline-none focus:border-[#435d41]"
            />
            {/* Input type="month" ẩn để mở lịch chọn nhanh dạng lịch */}
            <input
              type="month"
              ref={hiddenDateInputRef}
              onChange={handleCalendarPick}
              className="sr-only"
              tabIndex={-1}
            />
            <button
              type="button"
              onClick={() => {
                try {
                  hiddenDateInputRef.current?.showPicker?.();
                } catch {
                  hiddenDateInputRef.current?.focus();
                }
              }}
              title="Mở lịch chọn tháng/năm"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#435d41] transition cursor-pointer p-0.5"
            >
              <Calendar size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function CaregiverPortal({ notify, onNavigateToRole, currentUser, initialTab }: CaregiverPortalProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'schedule' | 'earnings' | 'reviews'>((initialTab as any) === 'care_logs' ? 'schedule' : (initialTab || 'profile'));
  const [scheduleSubFilter, setScheduleSubFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [completingShift, setCompletingShift] = useState<any | null>(null);
  const [viewingReportShift, setViewingReportShift] = useState<any | null>(null);
  const [viewingPatientHistory, setViewingPatientHistory] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [profileId, setProfileId] = useState<number | null>(null);

  // Đồng bộ tab khi được chuyển hướng từ thông báo (ví dụ bấm xem đánh giá sao)
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Dữ liệu đánh giá sao & nhận xét thực tế từ các gia đình
  const [reviewsData, setReviewsData] = useState<{
    stats: {
      avg_rating: number;
      review_count: number;
      five_star: number;
      four_star: number;
      three_star: number;
      two_star: number;
      one_star: number;
    };
    reviews: Array<{
      id: number;
      rating: number;
      review_text: string;
      tags: string[];
      created_at: string;
      family_name?: string;
      patient_name?: string;
      shift_date?: string;
    }>;
  }>({
    stats: { avg_rating: 5, review_count: 0, five_star: 0, four_star: 0, three_star: 0, two_star: 0, one_star: 0 },
    reviews: []
  });
  const [loadingReviews, setLoadingReviews] = useState(false);

  // Chế độ xem (View Mode) vs Chế độ chỉnh sửa (Edit Mode)
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const isEditingRef = useRef<boolean>(false);
  const hasUnsavedChangesRef = useRef<boolean>(false);

  useEffect(() => {
    isEditingRef.current = isEditing;
  }, [isEditing]);

  // Trạng thái hồ sơ: 'not_submitted' | 'pending' | 'approved' | 'rejected'
  const [verificationStatus, setVerificationStatus] = useState<'not_submitted' | 'pending' | 'approved' | 'rejected'>('not_submitted');
  const [careScore, setCareScore] = useState<number>(0);
  
  // Lịch trình nhận ca
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);

  // Danh sách tài liệu đã upload
  const [documents, setDocuments] = useState<CaregiverDoc[]>([]);

  // Dữ liệu biểu mẫu (kinh nghiệm cho phép nhập tự do, lưu hậu kỳ thành 0x)
  const [formData, setFormData] = useState({
    fullName: currentUser?.full_name || '',
    phone: currentUser?.phone || '',
    idNumber: '',
    contactAddress: '',
    experienceYears: '' as string | number,
    district: '',
    hourlyRate: 100000,
    shiftRate: 400000,
    nightShiftRate: 600000,
    workHistory: [] as WorkHistoryItem[],
    skills: [] as string[],
    bio: ''
  });

  const [customSkillInput, setCustomSkillInput] = useState('');

  // Modal xem trước ảnh tài liệu
  const [previewDoc, setPreviewDoc] = useState<CaregiverDoc | null>(null);

  // Trạng thái phỏng vấn trực tuyến với Admin (Bắt buộc để nhận ca)
  const [interviewStatus, setInterviewStatus] = useState<'not_scheduled' | 'scheduled' | 'passed' | 'failed'>('not_scheduled');
  const [interviewDate, setInterviewDate] = useState<string>('');
  const [interviewTime, setInterviewTime] = useState<string>('');
  const [interviewMeetingLink, setInterviewMeetingLink] = useState<string>('');
  const [interviewNotes, setInterviewNotes] = useState<string>('');
  const [showScheduleModal, setShowScheduleModal] = useState<boolean>(false);
  const [bookingInterview, setBookingInterview] = useState<boolean>(false);

  // Form đặt lịch phỏng vấn
  const [bookingDate, setBookingDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [bookingTimeSlot, setBookingTimeSlot] = useState<string>('09:30 - 10:00');
  const [bookingCandidateNotes, setBookingCandidateNotes] = useState<string>('');

  // File input refs cho các loại tài liệu
  const fileInputRefs = {
    cccd: useRef<HTMLInputElement>(null),
    cccdFront: useRef<HTMLInputElement>(null),
    cccdBack: useRef<HTMLInputElement>(null),
    policeCheck: useRef<HTMLInputElement>(null),
    certificate: useRef<HTMLInputElement>(null),
    healthCheck: useRef<HTMLInputElement>(null)
  };

  const userId = currentUser?.id;
  const userName = currentUser?.full_name || formData.fullName || 'Người chăm sóc';

  // Tải danh sách đánh giá sao & nhận xét thực tế
  const loadCaregiverReviews = async () => {
    if (!userId) return;
    setLoadingReviews(true);
    try {
      const res = await fetch(`${API}/reviews/caregiver/${userId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setReviewsData({
            stats: data.stats || { avg_rating: 5, review_count: 0, five_star: 0, four_star: 0, three_star: 0, two_star: 0, one_star: 0 },
            reviews: data.reviews || []
          });
        }
      }
    } catch {}
    setLoadingReviews(false);
  };

  useEffect(() => {
    if (userId) loadCaregiverReviews();
  }, [userId]);

  // 1. Tải hồ sơ từ cơ sở dữ liệu
  const loadCaregiverProfile = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/caregiver-profile?userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setProfileId(data.id || null);
        const status = data.verification_status || 'not_submitted';
        setVerificationStatus(status);
        setCareScore(data.care_score || 0);

        setInterviewStatus(data.interview_status || 'not_scheduled');
        setInterviewDate(data.interview_date || '');
        setInterviewTime(data.interview_time || '');
        setInterviewMeetingLink(data.interview_meeting_link || '');
        setInterviewNotes(data.interview_notes || '');

        // Bắn sự kiện đồng bộ trạng thái thanh sidebar bên trái
        window.dispatchEvent(new CustomEvent('carematch:caregiver-status-updated', {
          detail: { status, care_score: data.care_score }
        }));

        // CHỈ đồng bộ formData, documents và isEditing nếu người dùng KHÔNG đang chỉnh sửa và KHÔNG có dữ liệu nạp cục bộ chưa lưu
        if (!isEditingRef.current && !hasUnsavedChangesRef.current) {
          const exp = data.experience_years !== undefined && data.experience_years !== null
            ? formatExperience(Math.max(1, data.experience_years))
            : '01';

          const shiftRate = Number(data.shift_rate) || 400000;
          const nightShiftRate = Number(data.night_shift_rate) || Math.round(shiftRate * 1.5);
          // Mặc định là mảng rỗng [] nếu chưa có dữ liệu, không tự động điền dữ liệu giả lập
          const workHistory = Array.isArray(data.work_history) ? data.work_history : [];

          setFormData({
            fullName: data.full_name || currentUser?.full_name || '',
            phone: data.phone || currentUser?.phone || '',
            idNumber: data.id_number || '',
            contactAddress: data.contact_address || '',
            experienceYears: exp,
            district: data.district || '',
            hourlyRate: data.hourly_rate || 100000,
            shiftRate,
            nightShiftRate,
            workHistory,
            skills: Array.isArray(data.skills) ? data.skills : [],
            bio: data.bio || ''
          });

          if (Array.isArray(data.documents)) {
            setDocuments(data.documents);
          }

          // Tự động xác định chế độ: Nếu là tài khoản mới (chưa nộp hoặc chưa có CCCD/Bio) -> vào Chế độ Chỉnh sửa (isEditing = true)
          const hasCompletedProfile = Boolean(
            (status === 'approved' || status === 'pending') && (data.id_number || data.bio)
          );
          setIsEditing(!hasCompletedProfile);
        }
      }
    } catch (e) {
      console.error('Lỗi tải hồ sơ người chăm sóc:', e);
    } finally {
      setLoading(false);
    }
  };

  // 2. Tải lịch trình ca làm việc từ MySQL
  const fetchSchedules = async () => {
    if (!userId) {
      setSchedules([]);
      return;
    }
    try {
      const res = await fetch(`${API}/schedules?caregiverUserId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const mapped: any[] = data.map((d: any) => ({
            id: String(d.id),
            caregiverId: String(d.caregiver_user_id || userId),
            caregiverName: d.caregiver_name || userName,
            patientName: d.elderly_name || 'Người thân',
            elderlyProfileId: d.elderly_profile_id,
            familyUserId: d.family_user_id,
            familyName: d.family_name,
            familyPhone: d.family_phone,
            address: d.elderly_address || d.address,
            district: d.elderly_district || d.district,
            notes: d.elderly_notes,
            date: d.schedule_date || 'Hôm nay',
            time: d.time_slot || '08:00 - 12:00',
            title: d.title || 'Ca chăm sóc',
            tasks: d.tasks || 'Hỗ trợ sinh hoạt',
            status: d.status || 'confirmed',
            price: d.price || 400000
          }));
          setSchedules(mapped);
          return;
        }
      }
      setSchedules([]);
    } catch {
      setSchedules([]);
    }
  };

  useEffect(() => {
    if (!userId) return;
    loadCaregiverProfile();
    fetchSchedules();

    const onSync = () => {
      loadCaregiverProfile();
      fetchSchedules();
    };

    window.addEventListener('focus', onSync);
    window.addEventListener('carematch:interview-updated', onSync);
    window.addEventListener('carematch:caregiver-status-updated', onSync);
    window.addEventListener('storage', onSync);

    // Polling đồng bộ Realtime mỗi 4 giây (bao gồm cả trạng thái phỏng vấn và duyệt từ Admin)
    const interval = setInterval(onSync, 4000);
    return () => {
      window.removeEventListener('focus', onSync);
      window.removeEventListener('carematch:interview-updated', onSync);
      window.removeEventListener('carematch:caregiver-status-updated', onSync);
      window.removeEventListener('storage', onSync);
      clearInterval(interval);
    };
  }, [userId]);

  // 3. Xử lý tải lên tệp ảnh thực tế (lưu trực tiếp tại giao diện, CHƯA gửi lên database khi chưa nộp)
  const handleFileChange = async (docType: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Giới hạn kích thước tệp tối đa 15MB
    if (file.size > 15 * 1024 * 1024) {
      notify('Kích thước tệp quá lớn. Vui lòng chọn tệp nhỏ hơn 15MB.');
      return;
    }

    try {
      // Nén ảnh tự động và chuyển thành base64 dataUrl
      const dataUrl = await compressImage(file);

      const newDoc: CaregiverDoc = {
        type: docType,
        name: file.name,
        url: dataUrl,
        filename: file.name,
        uploadedAt: new Date().toISOString()
      };

      setDocuments(prev => {
        const filtered = prev.filter(d => d.type !== docType);
        return [...filtered, newDoc];
      });

      hasUnsavedChangesRef.current = true;
      notify(`Đã nạp ảnh ${file.name} vào hồ sơ! Bấm "Lưu thông tin" hoặc "Nộp hồ sơ duyệt ngay" để hoàn tất. ✓`);
    } catch (err) {
      notify('Lỗi đọc tệp từ thiết bị của bạn.');
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  // 4. Xóa tài liệu đã tải lên
  const handleRemoveDoc = (docType: string) => {
    setDocuments(prev => prev.filter(d => d.type !== docType));
    hasUnsavedChangesRef.current = true;
    notify('Đã gỡ tệp tài liệu.');
  };

  // 4.1. Tải lên nhiều tệp (chứng chỉ bổ sung)
  const handleMultipleFilesChange = async (docType: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    let uploadedCount = 0;
    for (const file of files) {
      if (file.size > 15 * 1024 * 1024) {
        notify(`Tệp ${file.name} vượt quá 15MB, đã bỏ qua.`);
        continue;
      }

      try {
        const dataUrl = await compressImage(file);
        const newDoc: CaregiverDoc = {
          type: docType,
          name: file.name,
          url: dataUrl,
          filename: file.name,
          uploadedAt: new Date().toISOString()
        };

        setDocuments(prev => [...prev, newDoc]);
        hasUnsavedChangesRef.current = true;
        uploadedCount++;
      } catch (err) {
        console.error('Lỗi khi nạp tệp:', file.name, err);
      }
    }

    if (uploadedCount > 0) {
      const typeLabel = docType === 'cccd' ? 'ảnh CCCD' : 'chứng chỉ bổ sung';
      notify(`Đã nạp thành công ${uploadedCount} ${typeLabel}! Bấm "Nộp hồ sơ duyệt ngay" để gửi Admin. ✓`);
    }
    if (e.target) e.target.value = '';
  };

  // 4.2. Xóa 1 tệp tài liệu cụ thể
  const handleRemoveSpecificDoc = (docToRemove: CaregiverDoc) => {
    setDocuments(prev => prev.filter(d => {
      if (docToRemove.url && d.url) return d.url !== docToRemove.url;
      return d.name !== docToRemove.name;
    }));
    hasUnsavedChangesRef.current = true;
    notify(`Đã gỡ tệp: ${docToRemove.name}`);
  };

  // 5. Thêm/Bỏ kỹ năng
  const toggleSkill = (skill: string) => {
    setFormData(prev => {
      const exists = prev.skills.includes(skill);
      return {
        ...prev,
        skills: exists ? prev.skills.filter(s => s !== skill) : [...prev.skills, skill]
      };
    });
  };

  const handleAddCustomSkill = () => {
    const trimmed = customSkillInput.trim();
    if (!trimmed) return;
    if (!formData.skills.includes(trimmed)) {
      setFormData(prev => ({ ...prev, skills: [...prev.skills, trimmed] }));
    }
    setCustomSkillInput('');
  };

  const handleAddWorkHistory = () => {
    const newItem: WorkHistoryItem = {
      id: 'wh-' + Date.now(),
      workplace: '',
      role: '',
      from_date: '',
      to_date: '',
      description: ''
    };
    setFormData(prev => ({
      ...prev,
      workHistory: [...prev.workHistory, newItem]
    }));
  };

  const handleUpdateWorkHistory = (id: string, field: keyof WorkHistoryItem, val: string) => {
    setFormData(prev => ({
      ...prev,
      workHistory: prev.workHistory.map(item => item.id === id ? { ...item, [field]: val } : item)
    }));
  };

  const handleRemoveWorkHistory = (id: string) => {
    setFormData(prev => ({
      ...prev,
      workHistory: prev.workHistory.filter(item => item.id !== id)
    }));
  };

  // 6. Lưu hồ sơ vào MySQL
  const handleSaveProfile = async (submitForReview = false) => {
    if (!formData.fullName.trim()) {
      notify('Vui lòng nhập Họ và tên đầy đủ.');
      return;
    }

    if (submitForReview) {
      if (!formData.idNumber.trim()) {
        notify('Vui lòng nhập Số Căn cước công dân (CCCD) trước khi nộp hồ sơ.');
        return;
      }
      if (documents.length === 0) {
        notify('Vui lòng tải lên ít nhất ảnh Căn cước công dân gắn chip để Admin thẩm định.');
        return;
      }
      setSubmittingReview(true);
    } else {
      setSaving(true);
    }

    // Xử lý hậu kỳ số năm kinh nghiệm: tối thiểu 1 năm
    const rawExp = String(formData.experienceYears).replace(/\D/g, '');
    const numExp = rawExp ? Math.max(1, parseInt(rawExp, 10)) : 1;
    const formattedExp = formatExperience(numExp);
    const parsedShiftRate = Math.min(1000000, Math.max(400000, Number(formData.shiftRate) || 400000));
    const parsedNightShiftRate = Math.round(parsedShiftRate * 1.5);
    setFormData(prev => ({ ...prev, experienceYears: formattedExp, shiftRate: parsedShiftRate, nightShiftRate: parsedNightShiftRate }));

    try {
      const res = await fetch(`${API}/caregiver-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          full_name: formData.fullName.trim(),
          phone: formData.phone.trim(),
          id_number: formData.idNumber.trim(),
          experience_years: numExp,
          hourly_rate: Math.round(parsedShiftRate / 4),
          shift_rate: parsedShiftRate,
          night_shift_rate: parsedNightShiftRate,
          work_history: formData.workHistory,
          district: formData.district.trim(),
          contact_address: formData.contactAddress.trim(),
          bio: formData.bio.trim(),
          skills: formData.skills,
          documents,
          submit_for_review: submitForReview
        })
      });

      if (res.ok) {
        const resData = await res.json();
        if (resData.profileId) setProfileId(resData.profileId);
        setIsEditing(false);
        isEditingRef.current = false;
        hasUnsavedChangesRef.current = false;

        if (submitForReview) {
          setVerificationStatus('pending');
          window.dispatchEvent(new CustomEvent('carematch:caregiver-status-updated', {
            detail: { status: 'pending', care_score: careScore }
          }));
          notify('Hồ sơ và tài liệu xác thực eKYC đã được gửi lên Admin thẩm định thành công! Đã chuyển sang trạng thái Chờ duyệt. ✓');
        } else {
          window.dispatchEvent(new CustomEvent('carematch:caregiver-status-updated', {
            detail: { status: verificationStatus, care_score: careScore }
          }));
          notify('Đã lưu thông tin hồ sơ thành công! Bấm "Chỉnh sửa hồ sơ" khi cần sửa đổi. ✓');
        }
      } else {
        notify('Không thể lưu hồ sơ lên hệ thống.');
      }
    } catch {
      notify('Lỗi kết nối khi lưu hồ sơ vào máy chủ.');
    } finally {
      setSaving(false);
      setSubmittingReview(false);
    }
  };

  // 6.1. Đặt lịch phỏng vấn online với Admin
  const handleBookInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingDate || !bookingTimeSlot) {
      notify('Vui lòng chọn ngày và khung giờ phỏng vấn.');
      return;
    }
    setBookingInterview(true);
    try {
      const res = await fetch(`${API}/caregiver/schedule-interview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          date: bookingDate,
          timeSlot: bookingTimeSlot,
          notes: bookingCandidateNotes
        })
      });
      const data = await res.json();
      if (data.success) {
        notify('Đã gửi yêu cầu đặt lịch phỏng vấn! Vui lòng chờ Admin duyệt và gửi link Google Meet trong hộp thư. ✓');
        setInterviewStatus('scheduled');
        setInterviewDate(bookingDate);
        setInterviewTime(bookingTimeSlot);
        setInterviewMeetingLink(data.interview?.meetingLink || '');
        setShowScheduleModal(false);
      } else {
        notify(data.error || 'Đặt lịch chưa thành công.');
      }
    } catch {
      notify('Lỗi kết nối máy chủ.');
    } finally {
      setBookingInterview(false);
    }
  };

  // 7. Cập nhật trạng thái ca làm việc (Cần sự xác nhận từ cả 2 phía để giải ngân thù lao)
  const handleUpdateStatus = async (sch: ScheduleItem, nextStatus: 'confirmed' | 'completed') => {
    try {
      const res = await fetch(`${API}/schedules/${sch.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus, confirmedBy: 'caregiver' })
      });
      const data = await res.json();
      if (data.success && data.status) {
        store.updateScheduleStatus(sch.id, data.status);
        setSchedules(prev => prev.map(s => s.id === sch.id ? { ...s, status: data.status, caregiver_confirmed_completed: true } : s));
        if (data.status === 'completed') {
          notify(`Ca làm việc đã được cả 2 bên xác nhận hoàn tất! Thù lao đã được chuyển vào tài khoản ví của bạn.`);
        } else if (data.status === 'caregiver_completed') {
          notify(`Bạn đã báo cáo hoàn thành ca! Đang chờ người nhà bệnh nhân bấm xác nhận hoàn tất để hệ thống giải ngân thù lao.`);
        } else {
          notify(`Đã cập nhật trạng thái ca: ${sch.title}`);
        }
        return;
      }
    } catch { }
    store.updateScheduleStatus(sch.id, nextStatus);
    setSchedules(prev => prev.map(s => s.id === sch.id ? { ...s, status: nextStatus } : s));
    notify(nextStatus === 'completed' ? `Đã báo cáo hoàn thành ca: ${sch.title}` : `Đã nhận ca: ${sch.title}`);
  };

  // Định dạng hiển thị tệp URL (hỗ trợ cả relative URL và external)
  const getFullFileUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `${API_BASE_URL}${url}`;
  };

  // Lấy tài liệu theo loại
  const getDoc = (type: string) => documents.find(d => d.type === type);

  return (
    <div className="space-y-6">
      {/* Tiêu đề trang Người chăm sóc */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[hsl(var(--border))] pb-5">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[hsl(var(--primary))]">
            <BriefcaseBusiness size={14} />
            <span>Cổng Làm Việc Dành Cho Người Chăm Sóc</span>
          </div>
          <h1 className="mt-1 font-display text-[30px] sm:text-[36px] font-semibold text-[#273a2c]">
            Chào bạn {userName}!
          </h1>
          <p className="text-[13px] text-[hsl(var(--muted-foreground))]">
            {verificationStatus === 'approved' 
              ? 'Hồ sơ của bạn đã được chứng thực. Bạn sẵn sàng nhận các ca chăm sóc từ gia đình.'
              : 'Quản lý thông tin năng lực, tải lên giấy tờ xác thực eKYC và gửi Admin xét duyệt.'}
          </p>
        </div>

        {/* Nút chuyển tab điều hướng nhanh */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 max-w-full">
          <button
            onClick={() => setActiveTab('profile')}
            className={`rounded-xl px-3.5 py-2 text-[12px] font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'profile' 
                ? 'bg-[hsl(var(--primary))] text-white shadow-sm' 
                : 'bg-[hsl(var(--secondary))] text-[#374c39] hover:bg-[#e4ece0]'
            }`}
          >
            Hồ sơ & Xác thực (Upload eKYC)
          </button>
          <button
            onClick={() => setActiveTab('schedule')}
            className={`rounded-xl px-3.5 py-2 text-[12px] font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'schedule' 
                ? 'bg-[hsl(var(--primary))] text-white shadow-sm' 
                : 'bg-[hsl(var(--secondary))] text-[#374c39] hover:bg-[#e4ece0]'
            }`}
          >
            Lịch nhận ca ({schedules.length})
          </button>
          <button
            onClick={() => setActiveTab('earnings')}
            className={`rounded-xl px-3.5 py-2 text-[12px] font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'earnings' 
                ? 'bg-[hsl(var(--primary))] text-white shadow-sm' 
                : 'bg-[hsl(var(--secondary))] text-[#374c39] hover:bg-[#e4ece0]'
            }`}
          >
            Thu nhập
          </button>
          <button
            onClick={() => { setActiveTab('reviews'); loadCaregiverReviews(); }}
            className={`rounded-xl px-3.5 py-2 text-[12px] font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              activeTab === 'reviews' 
                ? 'bg-[hsl(var(--primary))] text-white shadow-sm' 
                : 'bg-[hsl(var(--secondary))] text-[#374c39] hover:bg-[#e4ece0]'
            }`}
          >
            <Star size={13} className="fill-amber-400 text-amber-500" />
            Hồ sơ & Đánh giá sao ⭐ ({reviewsData.stats.review_count})
          </button>
        </div>
      </div>

      {/* BANNER TRẠNG THÁI XÁC THỰC TỪ ADMIN (DYNAMIC THEO MYSQL) */}
      <div className={`rounded-[22px] p-5 border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
        verificationStatus === 'approved'
          ? 'bg-[#edf5ea] border-[#c0d6bc]'
          : verificationStatus === 'pending'
          ? 'bg-[#fcf5e8] border-[#ebd6ab]'
          : 'bg-[#f0f4f8] border-[#cddae6]'
      }`}>
        <div className="flex items-start gap-3.5">
          <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] ${
            verificationStatus === 'approved'
              ? 'bg-[#5b7a54] text-white'
              : verificationStatus === 'pending'
              ? 'bg-[#e2aa4f] text-white'
              : 'bg-[#5c7a99] text-white'
          }`}>
            <ShieldCheck size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display text-[18px] font-bold text-[#273a2c]">
                {verificationStatus === 'approved' && 'Hồ Sơ Đã Được Admin Phê Duyệt'}
                {verificationStatus === 'pending' && 'Hồ Sơ Đang Trong Hàng Đợi Thẩm Định Của Admin'}
                {verificationStatus === 'not_submitted' && 'Hồ Sơ Mới · Chưa Gửi Thẩm Định Xác Thực eKYC'}
                {verificationStatus === 'rejected' && 'Hồ Sơ Cần Bổ Sung Giấy Tờ Xác Thực'}
              </h3>
              <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                verificationStatus === 'approved'
                  ? 'bg-[#43643d] text-white'
                  : verificationStatus === 'pending'
                  ? 'bg-[#c98e29] text-white'
                  : 'bg-[#4f6f8f] text-white'
              }`}>
                {verificationStatus === 'approved' && `CARE SCORE: ${careScore || 96}/100`}
                {verificationStatus === 'pending' && 'Chờ Admin duyệt'}
                {verificationStatus === 'not_submitted' && 'Chưa nộp hồ sơ'}
                {verificationStatus === 'rejected' && 'Cần bổ sung'}
              </span>
            </div>
            <p className="mt-1 text-[12px] text-[#556757]">
              {verificationStatus === 'approved' && (
                'Bạn đã được cấp tích xanh xác thực pháp lý, lý lịch tư pháp số 2 đạt chuẩn và được hiển thị ưu tiên khi gia đình tìm kiếm người chăm sóc.'
              )}
              {verificationStatus === 'pending' && (
                'Hồ sơ và các tệp tài liệu eKYC của bạn đã được gửi lên hệ thống. Admin đang đối soát căn cước và chứng chỉ, hệ thống đã khóa chỉnh sửa để đảm bảo trung thực.'
              )}
              {verificationStatus === 'not_submitted' && (
                'Chào mừng bạn đến với CARE-MATCH! Vui lòng điền thông tin năng lực và tải lên các ảnh chụp giấy tờ xác thực (CCCD, chứng chỉ) bên dưới rồi bấm "Nộp hồ sơ duyệt ngay" để Admin thẩm định.'
              )}
              {verificationStatus === 'rejected' && (
                'Hồ sơ xác thực của bạn cần bổ sung thêm giấy tờ hoặc ảnh chụp chưa rõ nét. Vui lòng tải lại ảnh mới bên dưới và nộp lại.'
              )}
            </p>
          </div>
        </div>

        {/* Nút hành động nhanh ở banner: Nếu chờ duyệt thì hiển thị badge Chờ duyệt, ẩn nút gửi */}
        <div className="flex items-center gap-2 shrink-0">
          {verificationStatus === 'pending' ? (
            <div className="flex items-center gap-1.5 rounded-xl bg-[#c98e29]/15 border border-[#c98e29]/40 px-3.5 py-2 text-[12.5px] font-bold text-[#8c6014]">
              <Clock size={15} className="animate-spin text-[#c98e29]" />
              <span>Chờ duyệt</span>
            </div>
          ) : verificationStatus === 'not_submitted' || verificationStatus === 'rejected' ? (
            <button
              onClick={() => handleSaveProfile(true)}
              disabled={submittingReview}
              className="rounded-xl bg-[#3f5f3b] px-4 py-2 text-[12px] font-bold text-white shadow-xs hover:bg-[#324f2f] transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              <Send size={13} /> {submittingReview ? 'Đang gửi...' : 'Nộp hồ sơ duyệt ngay'}
            </button>
          ) : (
            <div className="flex items-center gap-1.5 rounded-xl bg-[#43643d]/15 border border-[#43643d]/30 px-3.5 py-2 text-[12px] font-bold text-[#32522c]">
              <CheckCircle2 size={15} className="text-[#43643d]" />
              <span>Đã xác thực</span>
            </div>
          )}
        </div>
      </div>

      {/* NỘI DUNG TAB 1: HỒ SƠ & TẢI LÊN XÁC THỰC (eKYC THỰC TẾ) */}
      {activeTab === 'profile' && (
        <div className="grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
          {/* CỘT TRÁI: FORM THÔNG TIN CÁ NHÂN & KỸ NĂNG (HỖ TRỢ VIEW MODE & EDIT MODE) */}
          <div className="rounded-[24px] border border-[hsl(var(--border))] bg-white p-4 sm:p-6 shadow-sm flex flex-col justify-between max-w-full overflow-hidden">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[hsl(var(--border))]">
                <div>
                  <h3 className="font-display text-[21px] font-semibold text-[#273a2c]">
                    {isEditing ? 'Chỉnh Sửa Thông Tin Năng Lực' : 'Thông Tin Năng Lực & Kinh Nghiệm'}
                  </h3>
                  <p className="mt-0.5 text-[12px] text-[hsl(var(--muted-foreground))]">
                    {isEditing 
                      ? 'Cập nhật thông tin chính xác để hệ thống kết nối ca chăm sóc phù hợp.'
                      : 'Hồ sơ đã được lưu trữ an toàn trên hệ thống. Bấm nút chỉnh sửa khi cần cập nhật lại.'}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {loading && (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-[hsl(var(--primary))] border-t-transparent" />
                  )}
                  {!isEditing ? (
                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#e8f2e6] border border-[#c6dfc3] text-[#345831] px-3 py-1.5 text-[11px] font-bold shadow-2xs whitespace-nowrap">
                        <CheckCircle2 size={13} className="text-[#3b6837]" /> Đã lưu hệ thống
                      </span>
                      {verificationStatus === 'pending' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 px-3 py-1.5 text-[11px] font-bold shadow-2xs whitespace-nowrap">
                          <Clock size={12} /> Chờ duyệt
                        </span>
                      )}
                      {verificationStatus === 'approved' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 px-3 py-1.5 text-[11px] font-bold shadow-2xs whitespace-nowrap">
                          <CheckCircle2 size={12} className="text-emerald-700" /> Đã duyệt
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => { setIsEditing(true); isEditingRef.current = true; }}
                        className="inline-flex items-center gap-1.5 rounded-full bg-[#f2f7f1] border border-[#bed7bc] px-3.5 py-1.5 text-[11.5px] font-bold text-[#2d472f] hover:bg-[#e4efe2] transition cursor-pointer shadow-xs whitespace-nowrap"
                      >
                        <Edit3 size={13} />
                        <span>Chỉnh sửa hồ sơ</span>
                      </button>
                    </div>
                  ) : (
                    Boolean(profileId || formData.idNumber || formData.bio) && (
                      <button
                        type="button"
                        onClick={() => { setIsEditing(false); isEditingRef.current = false; hasUnsavedChangesRef.current = false; loadCaregiverProfile(); }}
                        className="flex items-center gap-1 rounded-xl border border-gray-200 px-3 py-1.5 text-[11.5px] font-medium text-gray-600 hover:bg-gray-100 transition cursor-pointer"
                      >
                        <X size={13} /> Hủy
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* NỘI DUNG HIỂN THỊ: CHẾ ĐỘ XEM (VIEW MODE) vs CHẾ ĐỘ SỬA (EDIT MODE) */}
              {!isEditing ? (
                /* VIEW MODE: TỔNG QUAN HỒ SƠ ĐÃ LƯU RÕ RÀNG */
                <div className="mt-5 space-y-4">
                  {verificationStatus === 'pending' ? (
                    <div className="rounded-xl bg-amber-50/80 border border-amber-200 p-3 text-[12px] text-amber-800 flex items-start gap-2.5">
                      <Clock size={15} className="text-amber-600 mt-0.5 shrink-0" />
                      <span>Hồ sơ đang trong quá trình đối soát và thẩm định bởi Admin. Bạn có thể nhấn <strong>"Chỉnh sửa hồ sơ"</strong> để cập nhật thông tin nếu cần.</span>
                    </div>
                  ) : (
                    <div className="rounded-xl bg-[#f2f8f0] border border-[#c8dec4] p-3 text-[12px] text-[#2f4b2c] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-[#3f6d3a] shrink-0" />
                        <span>Hồ sơ đã được lưu trữ an toàn trên hệ thống. Bạn có thể nhấn <strong>"Chỉnh sửa hồ sơ"</strong> bất kỳ lúc nào.</span>
                      </div>
                      <span className="shrink-0 text-[10.5px] font-bold text-[#355f30] bg-[#dbead7] px-2 py-0.5 rounded-full">
                        Đang áp dụng
                      </span>
                    </div>
                  )}

                  {/* Thông tin cá nhân grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="rounded-xl border border-[hsl(var(--border))] bg-[#fafcf9] p-3">
                      <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#5b735e] block">Họ và tên đầy đủ</span>
                      <p className="mt-1 text-[13.5px] font-semibold text-[#253928] flex items-center gap-1.5">
                        <UserRound size={15} className="text-[#51704e]" />
                        {formData.fullName || 'Chưa cập nhật'}
                      </p>
                    </div>

                    <div className="rounded-xl border border-[hsl(var(--border))] bg-[#fafcf9] p-3">
                      <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#5b735e] block">Số điện thoại liên hệ</span>
                      <p className="mt-1 text-[13.5px] font-semibold text-[#253928] flex items-center gap-1.5">
                        <Phone size={15} className="text-[#51704e]" />
                        {formData.phone || 'Chưa cập nhật'}
                      </p>
                    </div>

                    <div className="rounded-xl border border-[hsl(var(--border))] bg-[#fafcf9] p-3">
                      <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#5b735e] block">Số Căn cước công dân (CCCD)</span>
                      <p className="mt-1 text-[13.5px] font-semibold text-[#253928] flex items-center gap-1.5">
                        <CreditCard size={15} className="text-[#51704e]" />
                        {formData.idNumber || 'Chưa cập nhật'}
                      </p>
                    </div>

                    <div className="rounded-xl border border-[hsl(var(--border))] bg-[#fafcf9] p-3">
                      <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#5b735e] block">Số năm kinh nghiệm</span>
                      <p className="mt-1 text-[13.5px] font-bold text-[#2d5229] flex items-center gap-1.5">
                        <Award size={15} className="text-[#51704e]" />
                        {formatExperience(formData.experienceYears)} năm kinh nghiệm
                      </p>
                    </div>

                    <div className="rounded-xl border border-[hsl(var(--border))] bg-[#fafcf9] p-3 sm:col-span-2">
                      <div className="mb-1">
                        <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#5b735e] block">
                          Địa chỉ liên hệ (Nơi cư trú hiện tại)
                        </span>
                      </div>
                      <p className="mt-1 text-[13px] font-semibold text-[#253928] flex items-center gap-1.5">
                        <Home size={15} className="text-[#51704e] shrink-0" />
                        {formData.contactAddress || 'Chưa cập nhật địa chỉ liên hệ'}
                      </p>
                    </div>

                    <div className="rounded-xl border border-[hsl(var(--border))] bg-[#fafcf9] p-3">
                      <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#5b735e] block">Khu vực sẵn sàng nhận ca</span>
                      <p className="mt-1 text-[13.5px] font-semibold text-[#253928] flex items-center gap-1.5">
                        <MapPin size={15} className="text-[#51704e]" />
                        {formData.district || 'Toàn thành phố'}
                      </p>
                    </div>

                    <div className="rounded-xl border border-[hsl(var(--border))] bg-[#fafcf9] p-3">
                      <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#5b735e] block">Mức thù lao nhận theo ca</span>
                      <div className="mt-1 space-y-1">
                        <div className="flex items-center justify-between text-[12.5px] font-bold text-[#2d5229]">
                          <span className="flex items-center gap-1 font-semibold text-[11px] text-[#48634a]">☀️ Ca ngày:</span>
                          <span>{(Number(formData.shiftRate) || 400000).toLocaleString('vi-VN')} đ/ca</span>
                        </div>
                        <div className="flex items-center justify-between text-[12px] font-bold text-[#8a5d1a]">
                          <span className="flex items-center gap-1 font-semibold text-[11px] text-[#8a5d1a]">🌙 Ca tối (x1.5):</span>
                          <span>{(Number(formData.nightShiftRate) || Math.round((Number(formData.shiftRate) || 400000) * 1.5)).toLocaleString('vi-VN')} đ/ca</span>
                        </div>
                        <div className="flex items-center justify-between text-[11.5px] font-bold text-[#355238] pt-0.5 border-t border-gray-100">
                          <span className="flex items-center gap-1 font-semibold text-[10.5px] text-[#556e58]">⏱️ Theo giờ (Ca / 4):</span>
                          <span>{Math.round((Number(formData.shiftRate) || 400000) / 4).toLocaleString('vi-VN')} đ/giờ</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Kỹ năng chuyên môn đã lưu */}
                  <div className="rounded-xl border border-[hsl(var(--border))] bg-[#fafcf9] p-3.5">
                    <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#5b735e] block mb-2">
                      Kỹ năng chuyên môn nổi bật ({formData.skills.length})
                    </span>
                    {formData.skills.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {formData.skills.map(s => (
                          <span key={s} className="rounded-full bg-[#e6efe4] text-[#2c4728] border border-[#bed1b9] px-2.5 py-1 text-[11px] font-semibold flex items-center gap-1">
                            <Check size={12} className="text-[#3b6734]" /> {s}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[12px] text-gray-400 italic">Chưa chọn kỹ năng chuyên môn</p>
                    )}
                  </div>

                  {/* Lịch sử nơi từng công tác & kinh nghiệm làm việc */}
                  <div className="rounded-xl border border-[hsl(var(--border))] bg-[#fafcf9] p-3.5">
                    <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#5b735e] block mb-2">
                      Lịch sử nơi từng công tác & kinh nghiệm làm việc ({formData.workHistory.length})
                    </span>
                    {formData.workHistory.length > 0 ? (
                      <div className="space-y-2.5">
                        {formData.workHistory.map((wh, idx) => (
                          <div key={wh.id || idx} className="rounded-lg border border-[hsl(var(--border)/.7)] bg-white p-3 text-[12px]">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h4 className="font-bold text-[#253928] text-[13px] flex items-center gap-1.5">
                                  <Building2 size={14} className="text-[#4b6a48]" />
                                  {wh.workplace || 'Chưa đặt tên cơ sở'}
                                </h4>
                                <p className="text-[11.5px] text-[#4d6d4a] font-medium mt-0.5">{wh.role || 'Chuyên viên chăm sóc'}</p>
                              </div>
                              <span className="rounded-md bg-[#edf5eb] text-[#345831] px-2 py-0.5 text-[10.5px] font-bold shrink-0">
                                📅 {wh.from_date || 'Bắt đầu'} - {wh.to_date || 'Hiện tại'}
                              </span>
                            </div>
                            {wh.description && (
                              <p className="mt-2 text-[12px] text-[#556956] leading-relaxed border-t border-gray-100 pt-1.5">
                                {wh.description}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[12px] text-gray-400 italic">Chưa cập nhật lịch sử nơi làm việc</p>
                    )}
                  </div>

                  {/* Giới thiệu bản thân */}
                  <div className="rounded-xl border border-[hsl(var(--border))] bg-[#fafcf9] p-3.5">
                    <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#5b735e] block mb-1.5">
                      Giới thiệu bản thân & kinh nghiệm
                    </span>
                    <p className="text-[12.5px] text-[#334636] leading-relaxed italic bg-white p-3 rounded-lg border border-[hsl(var(--border)/.6)]">
                      "{formData.bio || 'Chưa cập nhật thông tin tự giới thiệu.'}"
                    </p>
                  </div>
                </div>
              ) : (
                /* EDIT MODE: FORM NHẬP THÔNG TIN TỰ DO */
                <div className="mt-5 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="block">
                      <span className="mb-1.5 block text-[11px] font-bold text-[#455b48]">Họ và tên đầy đủ *</span>
                      <input 
                        type="text" 
                        value={formData.fullName} 
                        onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                        placeholder="VD: Trần Anh Tuấn"
                        className="h-11 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 text-[13px] outline-none focus:border-[hsl(var(--primary))]" 
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1.5 block text-[11px] font-bold text-[#455b48]">Số điện thoại liên hệ</span>
                      <input 
                        type="text" 
                        value={formData.phone} 
                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="VD: 0988 123 456"
                        className="h-11 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 text-[13px] outline-none focus:border-[hsl(var(--primary))]" 
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <label className="block sm:col-span-2">
                      <span className="mb-1.5 block text-[11px] font-bold text-[#455b48]">Số Căn cước công dân (CCCD) *</span>
                      <input 
                        type="text" 
                        value={formData.idNumber} 
                        onChange={e => setFormData({ ...formData, idNumber: e.target.value })}
                        placeholder="12 chữ số trên thẻ CCCD"
                        className="h-11 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 text-[13px] outline-none focus:border-[hsl(var(--primary))]" 
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1.5 block text-[11px] font-bold text-[#455b48]">Số năm kinh nghiệm *</span>
                      <input 
                        type="number"
                        min={1}
                        max={40}
                        value={formData.experienceYears} 
                        onChange={e => {
                          const val = e.target.value.replace(/\D/g, '');
                          setFormData({ ...formData, experienceYears: val });
                        }}
                        placeholder="VD: 5"
                        className="h-11 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 text-[13px] outline-none focus:border-[hsl(var(--primary))]" 
                      />
                      <span className="mt-1 block text-[10px] text-[#556e58]">
                        Tối thiểu 1 năm kinh nghiệm
                      </span>
                    </label>
                  </div>

                  <label className="block">
                    <div className="mb-1.5">
                      <span className="text-[11px] font-bold text-[#455b48]">
                        Địa chỉ liên hệ (Nơi cư trú hiện tại) *
                      </span>
                    </div>
                    <input 
                      type="text" 
                      value={formData.contactAddress} 
                      onChange={e => setFormData({ ...formData, contactAddress: e.target.value })}
                      placeholder="Số nhà, ngõ/phố, Phường/Xã... (VD: Số 25 ngõ 120 Hoàng Quốc Việt, Cầu Giấy)"
                      className="h-11 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 text-[13px] outline-none focus:border-[hsl(var(--primary))]" 
                    />
                    <span className="mt-1 block text-[10px] text-[#556e58]">
                      Địa chỉ nơi ở của bạn để liên hệ & đối soát hồ sơ.
                    </span>
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="block">
                      <span className="mb-1.5 block text-[11px] font-bold text-[#455b48]">Khu vực sẵn sàng nhận ca</span>
                      <input 
                        type="text" 
                        value={formData.district} 
                        onChange={e => setFormData({ ...formData, district: e.target.value })}
                        placeholder="VD: Quận Cầu Giấy & Đống Đa, Hà Nội"
                        className="h-11 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 text-[13px] outline-none focus:border-[hsl(var(--primary))]" 
                      />
                    </label>

                    <div>
                      <label className="block">
                        <span className="mb-1.5 block text-[11px] font-bold text-[#455b48]">
                          Mức thù lao mong muốn theo ca (VNĐ/ca) *
                        </span>
                        <input 
                          type="number" 
                          min={400000}
                          max={1000000}
                          step={50000}
                          value={formData.shiftRate} 
                          onChange={e => {
                            const val = Number(e.target.value);
                            setFormData(prev => ({
                              ...prev,
                              shiftRate: val,
                              nightShiftRate: Math.round(val * 1.5)
                            }));
                          }}
                          className="h-11 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 text-[13px] outline-none focus:border-[hsl(var(--primary))]" 
                        />
                      </label>
                      <div className="mt-1.5 rounded-lg border border-[#c4dbc1] bg-[#f4f9f2] p-2 text-[11px]">
                        <div className="flex items-center justify-between text-[#2e4d34]">
                          <span>☀️ Ca ngày: <strong>{(Number(formData.shiftRate) || 400000).toLocaleString('vi-VN')} đ/ca</strong></span>
                          <span>🌙 Ca tối (x1.5): <strong className="text-[#8f5d1b]">{(Math.round((Number(formData.shiftRate) || 400000) * 1.5)).toLocaleString('vi-VN')} đ/ca</strong></span>
                        </div>
                        <p className="mt-1 text-[10px] text-gray-500 italic">
                          * Thấp nhất 400.000đ/ca, tối đa 1.000.000đ/ca. Ca tối tự động gấp 1.5 lần ca ngày.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* QUẢN LÝ KINH NGHIỆM CÔNG TÁC & NƠI ĐÃ TỪNG LÀM VIỆC THEO YÊU CẦU */}
                  <div className="rounded-xl border border-[#c8dec4] bg-[#f7faf6] p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[12px] font-bold uppercase tracking-wider text-[#2e4d34] flex items-center gap-1.5">
                          <BriefcaseBusiness size={15} />
                          Kinh nghiệm công tác & Nơi đã từng làm việc ({formData.workHistory.length})
                        </span>
                        <p className="mt-0.5 text-[11px] text-[#556956]">
                          Khai báo các bệnh viện, viện dưỡng lão, phòng khám hoặc gia đình bạn đã từng công tác.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddWorkHistory}
                        className="flex items-center gap-1 rounded-xl bg-[#43643d] text-white px-3 py-1.5 text-[11.5px] font-bold hover:bg-[#324f2d] transition cursor-pointer shadow-xs"
                      >
                        <Plus size={14} /> Thêm nơi công tác
                      </button>
                    </div>

                    {formData.workHistory.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-4 text-center">
                        <p className="text-[12px] text-gray-500">Chưa có nơi làm việc nào được thêm.</p>
                        <button
                          type="button"
                          onClick={handleAddWorkHistory}
                          className="mt-2 text-[11.5px] font-bold text-[#43643d] hover:underline cursor-pointer"
                        >
                          + Bấm vào đây để thêm nơi công tác đầu tiên
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {formData.workHistory.map((wh, idx) => (
                          <div key={wh.id || idx} className="rounded-xl border border-[#d6e5d3] bg-white p-3.5 space-y-2.5 shadow-xs">
                            <div className="flex items-center justify-between pb-1.5 border-b border-gray-100">
                              <span className="text-[11px] font-bold text-[#355f30]">Nơi công tác #{idx + 1}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveWorkHistory(wh.id)}
                                className="text-red-500 hover:text-red-700 text-[11px] font-medium flex items-center gap-1 cursor-pointer"
                              >
                                <Trash2 size={13} /> Xóa ô này
                              </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              <div>
                                <label className="block text-[10.5px] font-semibold text-gray-700 mb-1">
                                  Tên đơn vị / Bệnh viện / Cơ sở y tế *
                                </label>
                                <input
                                  type="text"
                                  value={wh.workplace}
                                  onChange={e => handleUpdateWorkHistory(wh.id, 'workplace', e.target.value)}
                                  placeholder="VD: Bệnh viện Lão khoa Trung ương"
                                  className="h-9 w-full rounded-lg border border-gray-200 px-2.5 text-[12px] outline-none focus:border-[#435d41]"
                                />
                              </div>
                              <div>
                                <label className="block text-[10.5px] font-semibold text-gray-700 mb-1">
                                  Vị trí / Công việc đảm nhận *
                                </label>
                                <input
                                  type="text"
                                  value={wh.role}
                                  onChange={e => handleUpdateWorkHistory(wh.id, 'role', e.target.value)}
                                  placeholder="VD: Điều dưỡng viên, Chăm sóc phục hồi"
                                  className="h-9 w-full rounded-lg border border-gray-200 px-2.5 text-[12px] outline-none focus:border-[#435d41]"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <MonthYearPicker
                                label="Từ thời gian (Tháng/Năm)"
                                value={wh.from_date}
                                onChange={val => handleUpdateWorkHistory(wh.id, 'from_date', val)}
                              />
                              <MonthYearPicker
                                label="Đến thời gian"
                                value={wh.to_date}
                                onChange={val => handleUpdateWorkHistory(wh.id, 'to_date', val)}
                                isToDate={true}
                              />
                            </div>

                            <div>
                              <label className="block text-[10.5px] font-semibold text-gray-700 mb-1">
                                Mô tả kinh nghiệm công việc chi tiết
                              </label>
                              <textarea
                                rows={2}
                                value={wh.description}
                                onChange={e => handleUpdateWorkHistory(wh.id, 'description', e.target.value)}
                                placeholder="Mô tả kỹ năng đã làm: Chăm sóc sau tai biến, theo dõi thuốc, phục hồi chức năng..."
                                className="w-full resize-none rounded-lg border border-gray-200 p-2 text-[12px] outline-none focus:border-[#435d41]"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Kỹ năng chuyên môn */}
                  <div>
                    <span className="mb-1.5 block text-[11px] font-bold text-[#455b48]">
                      Kỹ năng chuyên môn nổi bật (Bấm để chọn):
                    </span>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {COMMON_SKILLS.map((skill) => {
                        const isSelected = formData.skills.includes(skill);
                        return (
                          <button
                            type="button"
                            key={skill}
                            onClick={() => toggleSkill(skill)}
                            className={`rounded-full px-3 py-1 text-[11px] font-semibold transition cursor-pointer border ${
                              isSelected
                                ? 'bg-[#3d5d3b] text-white border-[#3d5d3b]'
                                : 'bg-[#f4f7f2] text-[#476049] border-[#d4e2d2] hover:bg-[#e6efe4]'
                            }`}
                          >
                            {isSelected ? '✓ ' : '+ '}{skill}
                          </button>
                        );
                      })}
                    </div>

                    {/* Thêm kỹ năng tùy chỉnh */}
                    <div className="mt-3 flex gap-2">
                      <input
                        type="text"
                        value={customSkillInput}
                        onChange={e => setCustomSkillInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddCustomSkill())}
                        placeholder="Thêm kỹ năng khác..."
                        className="h-9 flex-1 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 text-[12px] outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomSkill}
                        className="h-9 px-3 rounded-xl border border-[hsl(var(--border))] bg-gray-50 text-[12px] font-bold hover:bg-gray-100 cursor-pointer"
                      >
                        Thêm
                      </button>
                    </div>
                  </div>

                  <label className="block">
                    <span className="mb-1.5 block text-[11px] font-bold text-[#455b48]">Giới thiệu ngắn về bản thân & kinh nghiệm</span>
                    <textarea 
                      rows={3} 
                      value={formData.bio} 
                      onChange={e => setFormData({ ...formData, bio: e.target.value })}
                      placeholder="Mô tả quá trình chăm sóc người bệnh, kỹ năng lắng nghe, kiên nhẫn và sự tận tâm..."
                      className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-3 text-[13px] outline-none focus:border-[hsl(var(--primary))]" 
                    />
                  </label>
                </div>
              )}
            </div>

            {/* Chân cột trái: Nút thao tác theo chế độ */}
            <div className="mt-6 border-t border-[hsl(var(--border))] pt-4 flex items-center justify-between gap-3">
              <span className="text-[11.5px] text-[hsl(var(--muted-foreground))]">
                {profileId ? `Mã hồ sơ: CM-CG-${profileId}` : 'Hồ sơ mới chưa lưu'}
              </span>

              {isEditing ? (
                <div className="flex items-center gap-2">
                  {Boolean(profileId || formData.idNumber || formData.bio) && (
                    <button
                      type="button"
                      onClick={() => { setIsEditing(false); isEditingRef.current = false; hasUnsavedChangesRef.current = false; loadCaregiverProfile(); }}
                      className="rounded-xl border border-gray-200 px-3.5 py-2 text-[12px] font-medium text-gray-600 hover:bg-gray-100 transition cursor-pointer"
                    >
                      Hủy bỏ
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleSaveProfile(false)}
                    disabled={saving}
                    className="rounded-xl border border-[hsl(var(--primary))] bg-[hsl(var(--primary))] px-4 py-2.5 text-[12.5px] font-bold text-white hover:opacity-90 transition cursor-pointer disabled:opacity-50 shadow-xs flex items-center gap-1.5"
                  >
                    💾 {saving ? 'Đang lưu hồ sơ...' : 'Lưu thông tin hồ sơ'}
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => { setIsEditing(true); isEditingRef.current = true; }}
                    className="rounded-xl border border-[hsl(var(--border))] bg-[#f7faf5] px-4 py-2 text-[12.5px] font-bold text-[#355238] hover:bg-[#edf4eb] transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Edit3 size={14} /> Chỉnh sửa hồ sơ
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* CỘT PHẢI: KHU VỰC TẢI LÊN TÀI LIỆU MINH CHỨNG (eKYC THỰC TẾ) & PHỎNG VẤN TRỰC TUYẾN */}
          <div className="space-y-6 max-w-full">
            <div className="rounded-[24px] border border-[hsl(var(--border))] bg-white p-4 sm:p-6 shadow-sm flex flex-col justify-between max-w-full overflow-hidden">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-[hsl(var(--border))]">
                  <div className="flex items-center gap-2">
                  <UploadCloud size={21} className="text-[#567a4e]" />
                  <h3 className="font-display text-[21px] font-semibold text-[#273a2c]">
                    Tài Liệu Xác Thực (eKYC)
                  </h3>
                </div>
                {verificationStatus === 'pending' ? (
                  <span className="rounded-full bg-amber-100 text-amber-800 px-2.5 py-0.5 text-[10px] font-bold flex items-center gap-1">
                    <Clock size={11} /> Chờ đối soát
                  </span>
                ) : verificationStatus === 'approved' ? (
                  <span className="rounded-full bg-green-100 text-green-800 px-2.5 py-0.5 text-[10px] font-bold flex items-center gap-1">
                    <CheckCircle2 size={11} /> Đã chứng thực
                  </span>
                ) : (
                  <span className="rounded-full bg-blue-50 text-blue-700 px-2.5 py-0.5 text-[10px] font-bold">
                    Cần tải ảnh
                  </span>
                )}
              </div>

              {/* Thông báo tài liệu trong lúc chờ Admin duyệt */}
              {verificationStatus === 'pending' && (
                <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 p-3 text-[12px] text-amber-900 flex items-start gap-2.5">
                  <Clock size={16} className="shrink-0 text-amber-600 mt-0.5" />
                  <div>
                    <strong>Hồ sơ đang chờ Admin xét duyệt:</strong> Giấy tờ xác thực đang được Ban Quản Trị đối soát và thẩm định. Bạn có thể nhấn <strong>"Xem tệp"</strong> để kiểm tra lại tài liệu đã tải, hoặc tải bổ sung giấy tờ còn thiếu bên dưới.
                  </div>
                </div>
              )}

              {verificationStatus === 'approved' && (
                <div className="mt-4 rounded-xl bg-green-50 border border-green-200 p-3 text-[12px] text-green-900 flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-green-600 shrink-0" />
                  <span>Tài liệu eKYC đã được Admin chứng thực hợp lệ (CARE SCORE: <strong>{careScore || 96}đ</strong>).</span>
                </div>
              )}

              {verificationStatus === 'not_submitted' && (
                <p className="mt-2 text-[12px] text-[hsl(var(--muted-foreground))]">
                  Tải lên ảnh chụp thực tế của 4 tài liệu sau để Admin đối soát và thẩm định cấp điểm CARE SCORE.
                </p>
              )}

              <div className="mt-4 space-y-3.5">
                {/* 1. CCCD gắn chip (Mặt trước & Mặt sau) - Giao diện 2 thẻ đẹp như bên Người nhà */}
                {(() => {
                  const frontDoc = documents.find(d => d.type === 'cccd_front' || (d.type === 'cccd' && (d.name.toLowerCase().includes('truoc') || d.name.toLowerCase().includes('front'))))
                    || documents.filter(d => d.type === 'cccd')[0];
                  const backDoc = documents.find(d => d.type === 'cccd_back' || (d.type === 'cccd' && (d.name.toLowerCase().includes('sau') || d.name.toLowerCase().includes('back'))))
                    || (documents.filter(d => d.type === 'cccd').length > 1 ? documents.filter(d => d.type === 'cccd')[1] : undefined);
                  
                  const isLocked = verificationStatus === 'pending';
                  const hasBoth = Boolean(frontDoc && backDoc);
                  const hasOne = Boolean((frontDoc && !backDoc) || (!frontDoc && backDoc));

                  return (
                    <div className={`rounded-[20px] border p-4 transition-all ${
                      hasBoth ? 'bg-[#f4f9f2] border-[#b8d4b3]' : hasOne ? 'bg-[#fffdfa] border-amber-200' : 'bg-[#fafcf9] border-[hsl(var(--border))]'
                    }`}>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                            hasBoth ? 'bg-[#dbebd7] text-[#41683b]' : 'bg-gray-100 text-gray-400'
                          }`}>
                            <FileCheck2 size={18} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-[13px] font-bold text-[#2a3c2e]">1. Căn cước công dân gắn chip *</p>
                              {hasBoth ? (
                                <span className="rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 text-[10px] font-bold border border-emerald-300">
                                  ✓ Đã đủ 2 mặt
                                </span>
                              ) : hasOne ? (
                                <span className="rounded-full bg-amber-100 text-amber-800 px-2.5 py-0.5 text-[10px] font-bold border border-amber-300">
                                  Đã tải 1/2 mặt · Cần thêm mặt còn lại
                                </span>
                              ) : (
                                <span className="rounded-full bg-red-50 text-red-700 px-2.5 py-0.5 text-[10px] font-bold border border-red-200">
                                  Chưa tải lên
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-0.5">
                              Tải ảnh chụp rõ nét 2 mặt CCCD (Mặt trước & Mặt sau) để Admin đối soát và thẩm định hồ sơ.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* 2 Thẻ Mặt Trước và Mặt Sau */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                        {/* MẶT TRƯỚC */}
                        <div className="rounded-2xl border border-dashed border-[#ccd9ca] bg-[#fafcfa] p-3 text-center">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[12px] font-bold text-gray-700">Mặt trước CCCD</span>
                            {frontDoc && (
                              <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                                isLocked ? 'bg-amber-100 text-amber-800' : 'bg-[#dbebd7] text-[#3e5f39]'
                              }`}>
                                {isLocked ? '🔒 Chờ duyệt' : 'Đã tải lên'}
                              </span>
                            )}
                          </div>
                          
                          <input 
                            type="file" 
                            ref={fileInputRefs.cccdFront}
                            accept="image/*,.pdf"
                            onChange={e => handleFileChange('cccd_front', e)}
                            className="hidden" 
                            disabled={verificationStatus === 'approved'}
                          />

                          {frontDoc ? (
                            <div className="relative group rounded-xl overflow-hidden border border-gray-200 bg-gray-50 aspect-[16/10] flex items-center justify-center">
                              <img 
                                src={frontDoc.url} 
                                alt="CCCD Mặt trước" 
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black/40 sm:bg-black/50 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 sm:gap-2 p-1.5">
                                <button
                                  type="button"
                                  onClick={() => setPreviewDoc(frontDoc)}
                                  className="rounded-lg bg-white/95 px-2.5 py-1.5 text-gray-800 hover:bg-white text-[11px] font-bold flex items-center gap-1 shadow cursor-pointer"
                                >
                                  <Eye size={13} /> Xem to
                                </button>
                                {verificationStatus !== 'approved' && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => fileInputRefs.cccdFront.current?.click()}
                                      className="rounded-lg bg-white/95 px-2 py-1.5 text-gray-800 hover:bg-white text-[11px] font-bold flex items-center gap-1 shadow cursor-pointer"
                                    >
                                      Đổi ảnh
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveSpecificDoc(frontDoc)}
                                      className="rounded-lg bg-rose-600/90 px-2 py-1.5 text-white hover:bg-rose-600 text-[11px] font-bold flex items-center gap-1 shadow cursor-pointer"
                                    >
                                      <Trash2 size={13} /> Xóa
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div 
                              onClick={() => {
                                if (verificationStatus !== 'approved') {
                                  fileInputRefs.cccdFront.current?.click();
                                }
                              }}
                              className="flex flex-col items-center justify-center aspect-[16/10] rounded-xl border border-dashed border-gray-300 bg-white hover:bg-[#f2f8f0] cursor-pointer transition p-3"
                            >
                              <Upload size={22} className="text-[#597855] mb-1.5" />
                              <span className="text-[12px] font-bold text-[#446240]">Tải ảnh mặt trước</span>
                              <span className="text-[10px] text-gray-400 mt-0.5">JPG, PNG hoặc PDF</span>
                            </div>
                          )}
                        </div>

                        {/* MẶT SAU */}
                        <div className="rounded-2xl border border-dashed border-[#ccd9ca] bg-[#fafcfa] p-3 text-center">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[12px] font-bold text-gray-700">Mặt sau CCCD</span>
                            {backDoc && (
                              <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                                isLocked ? 'bg-amber-100 text-amber-800' : 'bg-[#dbebd7] text-[#3e5f39]'
                              }`}>
                                {isLocked ? '🔒 Chờ duyệt' : 'Đã tải lên'}
                              </span>
                            )}
                          </div>

                          <input 
                            type="file" 
                            ref={fileInputRefs.cccdBack}
                            accept="image/*,.pdf"
                            onChange={e => handleFileChange('cccd_back', e)}
                            className="hidden" 
                            disabled={verificationStatus === 'approved'}
                          />

                          {backDoc ? (
                            <div className="relative group rounded-xl overflow-hidden border border-gray-200 bg-gray-50 aspect-[16/10] flex items-center justify-center">
                              <img 
                                src={backDoc.url} 
                                alt="CCCD Mặt sau" 
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black/40 sm:bg-black/50 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 sm:gap-2 p-1.5">
                                <button
                                  type="button"
                                  onClick={() => setPreviewDoc(backDoc)}
                                  className="rounded-lg bg-white/95 px-2.5 py-1.5 text-gray-800 hover:bg-white text-[11px] font-bold flex items-center gap-1 shadow cursor-pointer"
                                >
                                  <Eye size={13} /> Xem to
                                </button>
                                {verificationStatus !== 'approved' && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => fileInputRefs.cccdBack.current?.click()}
                                      className="rounded-lg bg-white/95 px-2 py-1.5 text-gray-800 hover:bg-white text-[11px] font-bold flex items-center gap-1 shadow cursor-pointer"
                                    >
                                      Đổi ảnh
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveSpecificDoc(backDoc)}
                                      className="rounded-lg bg-rose-600/90 px-2 py-1.5 text-white hover:bg-rose-600 text-[11px] font-bold flex items-center gap-1 shadow cursor-pointer"
                                    >
                                      <Trash2 size={13} /> Xóa
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div 
                              onClick={() => {
                                if (verificationStatus !== 'approved') {
                                  fileInputRefs.cccdBack.current?.click();
                                }
                              }}
                              className="flex flex-col items-center justify-center aspect-[16/10] rounded-xl border border-dashed border-gray-300 bg-white hover:bg-[#f2f8f0] cursor-pointer transition p-3"
                            >
                              <Upload size={22} className="text-[#597855] mb-1.5" />
                              <span className="text-[12px] font-bold text-[#446240]">Tải ảnh mặt sau</span>
                              <span className="text-[10px] text-gray-400 mt-0.5">JPG, PNG hoặc PDF</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* 2. Lý lịch tư pháp số 2 */}
                {(() => {
                  const doc = getDoc('policeCheck');
                  const isLocked = verificationStatus === 'pending';
                  return (
                    <div className={`rounded-[18px] border p-3.5 transition-all ${
                      doc ? 'bg-[#f4f9f2] border-[#b8d4b3]' : 'bg-[#fafcf9] border-[hsl(var(--border))]'
                    }`}>
                      <input 
                        type="file" 
                        ref={fileInputRefs.policeCheck}
                        accept="image/*,.pdf"
                        onChange={e => handleFileChange('policeCheck', e)}
                        className="hidden" 
                        disabled={verificationStatus === 'approved'}
                      />
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                            doc ? 'bg-[#dbebd7] text-[#41683b]' : 'bg-gray-100 text-gray-400'
                          }`}>
                            <FileCheck2 size={18} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[12.5px] font-bold text-[#2a3c2e]">2. Giấy Lý lịch tư pháp số 2</p>
                            <p className="text-[10.5px] text-[hsl(var(--muted-foreground))]">Chứng nhận lý lịch sạch từ Sở Tư pháp</p>
                            {doc && (
                              <div className="mt-1.5 flex items-center gap-2">
                                <span className="text-[11px] font-semibold text-[#3e5f39] truncate max-w-[170px]" title={doc.name}>
                                  📎 {doc.name}
                                </span>
                                <span className={`rounded-full px-2 py-0.2 text-[9px] font-bold ${
                                  isLocked ? 'bg-amber-100 text-amber-800' : 'bg-[#dbebd7] text-[#3e5f39]'
                                }`}>
                                  {isLocked ? '🔒 Chờ đối soát' : 'Đã tải lên'}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {doc ? (
                            <>
                              <button 
                                type="button" 
                                onClick={() => setPreviewDoc(doc)}
                                className="flex items-center gap-1 rounded-lg border border-[hsl(var(--border))] bg-white px-2.5 py-1 text-[11px] font-bold text-[#3b5938] hover:bg-[#e4efe0] transition cursor-pointer shadow-2xs"
                                title="Xem trước ảnh"
                              >
                                <Eye size={13} /> Xem tệp
                              </button>
                              {verificationStatus !== 'approved' && (
                                <>
                                  <button 
                                    type="button" 
                                    onClick={() => fileInputRefs.policeCheck.current?.click()}
                                    className="rounded-lg border border-[hsl(var(--border))] bg-white px-2 py-1 text-[11px] font-bold text-[#455c47] hover:bg-gray-50 transition cursor-pointer"
                                  >
                                    Đổi ảnh
                                  </button>
                                  <button 
                                    type="button" 
                                    onClick={() => handleRemoveDoc('policeCheck')}
                                    className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 transition cursor-pointer"
                                    title="Gỡ tệp"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </>
                              )}
                            </>
                          ) : (
                            <button 
                              type="button" 
                              onClick={() => fileInputRefs.policeCheck.current?.click()}
                              className="rounded-xl bg-[#456740] px-3 py-1.5 text-[11.5px] font-bold text-white shadow-2xs hover:bg-[#345130] transition cursor-pointer flex items-center gap-1"
                            >
                              <Upload size={13} /> Tải ảnh lên
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* 3. Các chứng chỉ bổ sung */}
                {(() => {
                  const certDocs = documents.filter(d => 
                    d.type === 'certificate' || 
                    d.type.startsWith('certificate') || 
                    d.type === 'additional_certificate'
                  );
                  const isLocked = verificationStatus === 'pending';
                  return (
                    <div className={`rounded-[18px] border p-3.5 transition-all ${
                      certDocs.length > 0 ? 'bg-[#f4f9f2] border-[#b8d4b3]' : 'bg-[#fafcf9] border-[hsl(var(--border))]'
                    }`}>
                      <input 
                        type="file" 
                        ref={fileInputRefs.certificate}
                        accept="image/*,.pdf"
                        multiple
                        onChange={e => handleMultipleFilesChange('certificate', e)}
                        className="hidden" 
                        disabled={verificationStatus === 'approved'}
                      />
                      
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                            certDocs.length > 0 ? 'bg-[#dbebd7] text-[#41683b]' : 'bg-gray-100 text-gray-400'
                          }`}>
                            <FileCheck2 size={18} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[12.5px] font-bold text-[#2a3c2e]">3. Các chứng chỉ bổ sung</p>
                            <p className="text-[10.5px] text-[hsl(var(--muted-foreground))]">Bằng CĐ Y tế, chứng chỉ Chữ thập đỏ...</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {verificationStatus !== 'approved' && (
                            <button 
                              type="button" 
                              onClick={() => fileInputRefs.certificate.current?.click()}
                              className="rounded-xl bg-[#456740] px-3 py-1.5 text-[11.5px] font-bold text-white shadow-2xs hover:bg-[#345130] transition cursor-pointer flex items-center gap-1"
                            >
                              <Upload size={13} /> Tải ảnh lên
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Danh sách các chứng chỉ đã tải lên */}
                      {certDocs.length > 0 && (
                        <div className="mt-2.5 space-y-1.5 border-t border-[#b8d4b3]/60 pt-2.5">
                          {certDocs.map((doc, idx) => (
                            <div key={doc.url || idx} className="flex items-center justify-between gap-2 rounded-lg bg-white/80 border border-[#c4dcbe] px-2.5 py-1.5">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-[11px] font-semibold text-[#3e5f39] truncate max-w-[170px]" title={doc.name}>
                                  📎 {doc.name}
                                </span>
                                <span className={`rounded-full px-2 py-0.2 text-[9px] font-bold shrink-0 ${
                                  isLocked ? 'bg-amber-100 text-amber-800' : 'bg-[#dbebd7] text-[#3e5f39]'
                                }`}>
                                  {isLocked ? '🔒 Chờ đối soát' : 'Đã tải lên'}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => setPreviewDoc(doc)}
                                  className="flex items-center gap-1 rounded-lg border border-[hsl(var(--border))] bg-white px-2 py-0.5 text-[10.5px] font-bold text-[#3b5938] hover:bg-[#e4efe0] transition cursor-pointer"
                                  title="Xem trước ảnh"
                                >
                                  <Eye size={12} /> Xem
                                </button>
                                {verificationStatus !== 'approved' && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveSpecificDoc(doc)}
                                    className="rounded-lg p-1 text-red-500 hover:bg-red-50 transition cursor-pointer"
                                    title="Gỡ tệp"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* 4. Giấy khám sức khỏe (nếu có) */}
                {(() => {
                  const doc = getDoc('healthCheck');
                  const isLocked = verificationStatus === 'pending';
                  return (
                    <div className={`rounded-[18px] border p-3.5 transition-all ${
                      doc ? 'bg-[#f4f9f2] border-[#b8d4b3]' : 'bg-[#fafcf9] border-[hsl(var(--border))]'
                    }`}>
                      <input 
                        type="file" 
                        ref={fileInputRefs.healthCheck}
                        accept="image/*,.pdf"
                        onChange={e => handleFileChange('healthCheck', e)}
                        className="hidden" 
                        disabled={verificationStatus === 'approved'}
                      />
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                            doc ? 'bg-[#dbebd7] text-[#41683b]' : 'bg-gray-100 text-gray-400'
                          }`}>
                            <FileCheck2 size={18} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-[12.5px] font-bold text-[#2a3c2e]">4. Giấy khám sức khỏe định kỳ (nếu có)</p>
                              <span className="rounded-full bg-stone-100 text-stone-600 px-2 py-0.2 text-[9.5px] font-semibold border border-stone-200">
                                Không bắt buộc
                              </span>
                            </div>
                            <p className="text-[10.5px] text-[hsl(var(--muted-foreground))]">Đủ điều kiện hành nghề trong 6 tháng (Điểm cộng khi xét duyệt)</p>
                            {doc && (
                              <div className="mt-1.5 flex items-center gap-2">
                                <span className="text-[11px] font-semibold text-[#3e5f39] truncate max-w-[170px]" title={doc.name}>
                                  📎 {doc.name}
                                </span>
                                <span className={`rounded-full px-2 py-0.2 text-[9px] font-bold ${
                                  isLocked ? 'bg-amber-100 text-amber-800' : 'bg-[#dbebd7] text-[#3e5f39]'
                                }`}>
                                  {isLocked ? '🔒 Chờ đối soát' : 'Đã tải lên'}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {doc ? (
                            <>
                              <button 
                                type="button" 
                                onClick={() => setPreviewDoc(doc)}
                                className="flex items-center gap-1 rounded-lg border border-[hsl(var(--border))] bg-white px-2.5 py-1 text-[11px] font-bold text-[#3b5938] hover:bg-[#e4efe0] transition cursor-pointer shadow-2xs"
                                title="Xem trước ảnh"
                              >
                                <Eye size={13} /> Xem tệp
                              </button>
                              {verificationStatus !== 'approved' && (
                                <>
                                  <button 
                                    type="button" 
                                    onClick={() => fileInputRefs.healthCheck.current?.click()}
                                    className="rounded-lg border border-[hsl(var(--border))] bg-white px-2 py-1 text-[11px] font-bold text-[#455c47] hover:bg-gray-50 transition cursor-pointer"
                                  >
                                    Đổi ảnh
                                  </button>
                                  <button 
                                    type="button" 
                                    onClick={() => handleRemoveDoc('healthCheck')}
                                    className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 transition cursor-pointer"
                                    title="Gỡ tệp"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </>
                              )}
                            </>
                          ) : (
                            <button 
                              type="button" 
                              onClick={() => fileInputRefs.healthCheck.current?.click()}
                              className="rounded-xl bg-[#456740] px-3 py-1.5 text-[11.5px] font-bold text-white shadow-2xs hover:bg-[#345130] transition cursor-pointer flex items-center gap-1"
                            >
                              <Upload size={13} /> Tải ảnh lên
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Chân cột phải: Nút gửi hồ sơ duyệt cho Admin hoặc trạng thái chờ */}
            <div className="mt-6 border-t border-[hsl(var(--border))] pt-4">
              {verificationStatus === 'pending' ? (
                <div className="rounded-xl bg-[#fcf6e8] border border-[#ebd6ab] p-4 text-center">
                  <div className="flex items-center justify-center gap-2 text-[#996515] font-bold text-[13px]">
                    <Clock size={16} className="text-[#c98e29]" />
                    <span>Hồ sơ eKYC đang chờ Admin xét duyệt</span>
                  </div>
                  <p className="mt-1 text-[11.5px] text-[#785b28]">
                    Ban Quản Trị đang kiểm tra đối chiếu lý lịch và chứng chỉ y tế. Bạn sẽ nhận được thông báo ngay khi hồ sơ được duyệt.
                  </p>
                </div>
              ) : verificationStatus === 'approved' ? (
                <div className="rounded-xl bg-green-50 border border-green-200 p-3.5 text-center text-[12.5px] font-bold text-green-800 flex items-center justify-center gap-2">
                  <CheckCircle2 size={16} /> Tài liệu eKYC đã được chứng thực hợp lệ
                </div>
              ) : (
                <>
                  <button 
                    type="button"
                    onClick={() => handleSaveProfile(true)}
                    disabled={submittingReview}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] py-3.5 text-[13.5px] font-bold text-white shadow-md transition hover:opacity-90 cursor-pointer disabled:opacity-50"
                  >
                    <Send size={16} /> {submittingReview ? 'Đang gửi hồ sơ lên Admin...' : 'Gửi Hồ Sơ Xác Thực Lên Admin Xét Duyệt'}
                  </button>
                  <p className="mt-2 text-center text-[11px] text-[hsl(var(--muted-foreground))]">
                    Hồ sơ và ảnh tài liệu được bảo mật, chuyển tiếp trực tiếp đến Ban Quản Trị CARE-MATCH để xét duyệt.
                  </p>
                </>
              )}
            </div>
          </div>

          {/* CARD 2: PHỎNG VẤN TRỰC TUYẾN VỚI ADMIN (BẮT BUỘC NHẬN CA) */}
          <div className={`rounded-[24px] border p-4 sm:p-6 max-w-full overflow-hidden shadow-sm transition-all ${
            interviewStatus === 'passed' 
              ? 'border-emerald-300 bg-[#f4f9f2]' 
              : interviewStatus === 'scheduled' 
              ? 'border-amber-300 bg-[#fdfaf3]' 
              : 'border-[hsl(var(--border))] bg-white'
          }`}>
            <div className="flex items-start justify-between gap-3 border-b border-[hsl(var(--border))] pb-4">
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  interviewStatus === 'passed' ? 'bg-emerald-600 text-white' : interviewStatus === 'scheduled' ? 'bg-amber-600 text-white' : 'bg-[#456740] text-white'
                }`}>
                  <Video size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-display text-[17px] font-bold text-[#2a3c2e]">
                      Phỏng Vấn Online Với Admin
                    </h3>
                    <span className="rounded-full bg-red-100 text-red-800 px-2.5 py-0.5 text-[10px] font-bold border border-red-200">
                      Bắt buộc
                    </span>
                  </div>
                  <p className="text-[12px] text-[hsl(var(--muted-foreground))] mt-0.5">
                    Bước bắt buộc để bắt đầu nhận ca làm việc & xuất hiện trên đề xuất của gia đình.
                  </p>
                </div>
              </div>

              <span className={`rounded-full px-2.5 py-1 text-[10.5px] font-bold shrink-0 ${
                (interviewStatus === 'passed' || verificationStatus === 'approved')
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : (interviewStatus === 'scheduled' || interviewStatus === 'confirmed')
                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                  : (interviewStatus === 'failed' || interviewStatus === 'rejected')
                  ? 'bg-rose-100 text-rose-800 border border-rose-300'
                  : 'bg-stone-100 text-stone-700 border border-stone-200'
              }`}>
                {(interviewStatus === 'passed' || verificationStatus === 'approved') && '✓ Đã đạt chuẩn'}
                {(interviewStatus === 'scheduled' || interviewStatus === 'confirmed') && (interviewMeetingLink ? '⏳ Đã có link Meet' : '⏳ Chờ Admin xác nhận')}
                {(interviewStatus === 'failed' || interviewStatus === 'rejected') && '✗ Chưa đạt'}
                {interviewStatus === 'not_scheduled' && !['passed', 'approved', 'scheduled', 'confirmed', 'failed', 'rejected'].includes(interviewStatus) && 'Chưa đặt lịch'}
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {(interviewStatus === 'passed' || verificationStatus === 'approved') ? (
                <div className="rounded-2xl bg-white/90 border border-emerald-200 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold text-[13px]">
                    <CheckCircle2 size={16} className="text-emerald-600" />
                    <span>Buổi phỏng vấn đạt chuẩn · Đã kích hoạt quyền nhận ca</span>
                  </div>
                  <p className="text-[12px] text-gray-700">
                    Ban Quản Trị đã hoàn tất phỏng vấn và chứng thực năng lực chuyên môn của bạn. Hồ sơ của bạn đã đạt chuẩn bắt buộc: Sẵn sàng nhận ca chăm sóc và xuất hiện trên danh mục đề xuất tìm kiếm của gia đình.
                  </p>
                  {interviewNotes && (
                    <div className="rounded-xl bg-emerald-50/80 p-2.5 text-[11.5px] text-emerald-900 border border-emerald-200">
                      <strong>Nhận xét từ Admin:</strong> {interviewNotes}
                    </div>
                  )}
                </div>
              ) : (interviewStatus === 'scheduled' || interviewStatus === 'confirmed') ? (
                <div className="rounded-2xl bg-white/90 border border-amber-200 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-bold text-amber-900 flex items-center gap-1.5">
                      <Clock size={15} className="text-amber-600" /> Lịch hẹn phỏng vấn trực tuyến:
                    </span>
                    <span className="rounded-full bg-amber-100 text-amber-800 px-2.5 py-0.5 text-[11px] font-bold">
                      Google Meet
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[12.5px] font-semibold text-gray-800">
                    <div className="rounded-xl bg-[#fafcf9] border border-amber-100 p-2.5">
                      <span className="block text-[10px] text-gray-500 uppercase">Ngày phỏng vấn</span>
                      <span className="font-bold text-[#2a3c2e]">{interviewDate || 'Hôm nay'}</span>
                    </div>
                    <div className="rounded-xl bg-[#fafcf9] border border-amber-100 p-2.5">
                      <span className="block text-[10px] text-gray-500 uppercase">Khung giờ</span>
                      <span className="font-bold text-[#2a3c2e]">{interviewTime || '09:30 - 10:00'}</span>
                    </div>
                  </div>

                  {interviewMeetingLink ? (
                    <div className="space-y-2">
                      <a
                        href={interviewMeetingLink}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-[13px] font-bold text-white hover:bg-emerald-800 transition shadow-sm cursor-pointer"
                      >
                        <Video size={16} /> Vào Phòng Họp Google Meet
                        <ExternalLink size={13} />
                      </a>
                      <p className="text-[11px] text-center text-gray-500 font-mono">
                        {interviewMeetingLink}
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-center">
                      <div className="flex items-center justify-center gap-2 text-amber-800 font-bold text-[12.5px]">
                        <Clock size={15} className="animate-spin text-amber-600" />
                        <span>Đang chờ Admin duyệt & gửi link Google Meet</span>
                      </div>
                      <p className="mt-1 text-[11px] text-amber-700">
                        Admin sẽ xác nhận lịch hẹn và gửi đường link Google Meet trực tiếp qua tin nhắn cho bạn trước buổi hẹn.
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <p className="text-[11px] text-gray-500">
                      Chuẩn bị CCCD gốc và trang phục chỉnh tề khi tham gia.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowScheduleModal(true)}
                      className="text-[11px] font-bold text-[#456740] hover:underline cursor-pointer"
                    >
                      Đổi lịch hẹn
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl bg-[#fafcf9] border border-stone-200 p-4 space-y-3">
                  {(interviewStatus === 'failed' || interviewStatus === 'rejected') && (
                    <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-[12px] text-rose-800">
                      <strong className="block mb-0.5">⚠️ Kết quả phỏng vấn trước: Chưa đạt yêu cầu</strong>
                      <span>{interviewNotes || 'Bạn chưa đáp ứng đủ tiêu chuẩn kỹ năng chuyên môn. Vui lòng ôn tập thêm và bấm nút dưới đây để hẹn lại lịch phỏng vấn mới cùng Admin.'}</span>
                    </div>
                  )}
                  <p className="text-[12px] text-gray-600 leading-relaxed">
                    Sau khi tải lên ảnh CCCD và các chứng chỉ, bạn cần hẹn một buổi phỏng vấn trực tuyến (khoảng 20-30 phút qua Google Meet) cùng Admin để:
                  </p>
                  <ul className="text-[11.5px] text-gray-700 space-y-1 pl-4 list-disc">
                    <li>Đối soát trực tiếp CCCD gắn chip và bằng cấp chuyên môn.</li>
                    <li>Đánh giá kỹ năng sơ cấp cứu & thái độ đồng hành cùng người cao tuổi.</li>
                    <li>Kích hoạt quyền nhận ca làm việc và đưa hồ sơ lên danh mục đề xuất gia đình.</li>
                  </ul>

                  <button
                    type="button"
                    onClick={() => setShowScheduleModal(true)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#456740] py-3 text-[12.5px] font-bold text-white hover:bg-[#345130] transition shadow-xs cursor-pointer"
                  >
                    <Calendar size={15} />
                    {(interviewStatus === 'failed' || interviewStatus === 'rejected') ? 'Đặt lại lịch phỏng vấn online với Admin' : 'Đặt lịch phỏng vấn online với Admin'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )}

      {/* MODAL ĐẶT LỊCH PHỎNG VẤN TRỰC TUYẾN VỚI ADMIN */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-[500px] rounded-[24px] bg-white p-6 shadow-2xl animate-rise border border-gray-200">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#dbebd7] text-[#3e5f39]">
                  <Video size={20} />
                </div>
                <div>
                  <h3 className="font-display text-[17px] font-bold text-[#2a3c2e]">
                    Đặt Lịch Phỏng Vấn Trực Tuyến
                  </h3>
                  <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
                    Thẩm định năng lực qua Google Meet cùng Ban Quản Trị
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowScheduleModal(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleBookInterview} className="space-y-4">
              <div>
                <label className="block text-[11.5px] font-bold text-[#3e5f39] mb-1">
                  Chọn ngày phỏng vấn *
                </label>
                <input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={bookingDate}
                  onChange={e => setBookingDate(e.target.value)}
                  required
                  className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-[13px] outline-none focus:border-[#456740] bg-[#fafcf9]"
                />
              </div>

              <div>
                <label className="block text-[11.5px] font-bold text-[#3e5f39] mb-1">
                  Chọn khung giờ thuận tiện (30 phút) *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    '08:30 - 09:00',
                    '09:30 - 10:00',
                    '10:30 - 11:00',
                    '14:00 - 14:30',
                    '15:30 - 16:00',
                    '16:30 - 17:00',
                    '19:30 - 20:00'
                  ].map(slot => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setBookingTimeSlot(slot)}
                      className={`rounded-xl border py-2 px-2.5 text-[12px] font-bold transition text-center cursor-pointer ${
                        bookingTimeSlot === slot
                          ? 'border-[#456740] bg-[#edf5ea] text-[#2a3c2e] shadow-2xs font-extrabold'
                          : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11.5px] font-bold text-[#3e5f39] mb-1">
                  Ghi chú hoặc lời nhắn cho Ban Quản Trị (nếu có)
                </label>
                <textarea
                  rows={2}
                  value={bookingCandidateNotes}
                  onChange={e => setBookingCandidateNotes(e.target.value)}
                  placeholder="Ví dụ: Tôi có thể chuẩn bị sẵn bản gốc bằng Cao đẳng Y tế..."
                  className="w-full rounded-xl border border-gray-300 p-2.5 text-[12px] outline-none focus:border-[#456740] bg-[#fafcf9]"
                />
              </div>

              <div className="rounded-xl bg-[#f4f9f2] border border-[#c4dcbe] p-3 text-[11.5px] text-[#345130] flex items-start gap-2">
                <Info size={16} className="shrink-0 mt-0.5 text-[#456740]" />
                <span>
                  Hệ thống sẽ cấp link phòng họp Google Meet và gửi thông báo trực tiếp đến Admin. Vượt qua phỏng vấn là bắt buộc để nhận ca và xuất hiện trên đề xuất.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="rounded-xl border border-gray-300 px-4 py-2 text-[12px] font-bold text-gray-700 hover:bg-gray-100 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={bookingInterview}
                  className="rounded-xl bg-[#456740] px-5 py-2 text-[12px] font-bold text-white hover:bg-[#345130] transition shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Video size={14} />
                  {bookingInterview ? 'Đang gửi lịch...' : 'Xác nhận đặt lịch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL XEM TRƯỚC ẢNH TÀI LIỆU EKYC */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-[680px] max-h-[90vh] overflow-y-auto rounded-[24px] bg-white p-5 shadow-2xl animate-rise border border-[hsl(var(--border))]">
            <div className="flex items-center justify-between border-b pb-3 mb-3">
              <div>
                <h3 className="font-display text-[18px] font-bold text-[#2a3c2e]">
                  Xem Trước Tài Liệu Xác Thực
                </h3>
                <p className="text-[11.5px] text-[hsl(var(--muted-foreground))]">
                  Tệp: <strong>{previewDoc.name}</strong>
                </p>
              </div>
              <button 
                onClick={() => setPreviewDoc(null)} 
                className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="rounded-xl border border-gray-200 overflow-hidden bg-gray-50 flex items-center justify-center p-2 min-h-[300px]">
              {previewDoc.url.endsWith('.pdf') ? (
                <div className="p-8 text-center">
                  <FileText size={48} className="mx-auto text-red-500 mb-2" />
                  <p className="font-bold text-[14px]">Tài liệu định dạng PDF: {previewDoc.name}</p>
                  <a 
                    href={getFullFileUrl(previewDoc.url)} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="mt-3 inline-block rounded-xl bg-[hsl(var(--primary))] px-4 py-2 text-[12px] font-bold text-white hover:opacity-90"
                  >
                    Mở tệp PDF trong tab mới
                  </a>
                </div>
              ) : (
                <img 
                  src={getFullFileUrl(previewDoc.url)} 
                  alt={previewDoc.name}
                  className="max-h-[70vh] w-auto object-contain rounded-lg shadow-xs" 
                />
              )}
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <a 
                href={getFullFileUrl(previewDoc.url)} 
                target="_blank" 
                rel="noreferrer"
                className="rounded-xl border border-[hsl(var(--border))] px-3.5 py-2 text-[12px] font-bold hover:bg-gray-50"
              >
                Mở ảnh gốc
              </a>
              <button 
                onClick={() => setPreviewDoc(null)} 
                className="rounded-xl bg-[hsl(var(--primary))] px-4 py-2 text-[12px] font-bold text-white hover:opacity-90 cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NỘI DUNG TAB 2: LỊCH NHẬN CA (ĐỒNG BỘ MYSQL) */}
      {activeTab === 'schedule' && (
        <div className="rounded-[24px] border border-[hsl(var(--border))] bg-white p-6 shadow-sm">
          {/* BANNER KHÓA NHẬN CA NẾU CHƯA PHỎNG VẤN ĐẠT CHUẨN (BẮT BUỘC) */}
          {interviewStatus !== 'passed' && (
            <div className="mb-6 rounded-[20px] bg-amber-50/90 border-2 border-amber-300 p-5 shadow-xs">
              <div className="flex items-start gap-3.5">
                <div className="mt-0.5 rounded-xl bg-amber-500 text-white p-2.5 shrink-0 shadow-xs">
                  <Lock size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-display font-bold text-amber-950 text-[16px]">
                      Quyền Nhận Ca Đang Tạm Khóa · Cần Hoàn Tất Phỏng Vấn Online
                    </h4>
                    <span className="rounded-full bg-amber-200/90 text-amber-900 px-2.5 py-0.5 text-[10px] font-bold">
                      Bắt buộc
                    </span>
                  </div>
                  <p className="mt-1.5 text-[12.5px] text-amber-900/90 leading-relaxed">
                    Theo quy trình kiểm định an toàn của CARE-MATCH, người chăm sóc cần <strong>vượt qua buổi phỏng vấn trực tuyến với Ban Quản Trị</strong> để kích hoạt quyền nhận ca làm việc và xuất hiện trên danh mục đề xuất tìm kiếm của các gia đình.
                  </p>

                  <div className="mt-3.5 flex items-center gap-3 flex-wrap">
                    {interviewStatus === 'scheduled' ? (
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="rounded-xl bg-white border border-amber-300 px-3 py-1.5 text-[12px] font-bold text-amber-900 flex items-center gap-1.5">
                          <Clock size={14} className="text-amber-600" />
                          Lịch phỏng vấn: {interviewDate} ({interviewTime})
                        </span>
                        {interviewMeetingLink && (
                          <a 
                            href={interviewMeetingLink} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-3.5 py-1.5 text-[12px] font-bold text-white hover:bg-emerald-800 transition shadow-xs"
                          >
                            <Video size={14} /> Vào Google Meet <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('profile');
                          setShowScheduleModal(true);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-amber-700 px-4 py-2 text-[12.5px] font-bold text-white hover:bg-amber-800 transition cursor-pointer shadow-xs"
                      >
                        <Calendar size={15} /> Đặt lịch phỏng vấn online với Admin ngay
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="font-display text-[22px] font-semibold text-[#273a2c]">
                Lịch Làm Việc Được Phân Bổ
              </h3>
              <p className="text-[13px] text-[hsl(var(--muted-foreground))]">
                Các ca chăm sóc đang diễn ra và sắp tới được kết nối trực tiếp từ các gia đình.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-[#edf5ea] px-3 py-1 text-[11px] font-bold text-[#43643d]">
                Tổng số ca: {schedules.length}
              </span>
            </div>
          </div>

          {/* Thanh lọc trạng thái ca */}
          <div className="flex items-center gap-2 mb-5 flex-wrap">
            {[
              { id: 'all', label: `Tất cả (${schedules.length})` },
              { id: 'active', label: `Sắp tới & Đang nhận (${schedules.filter(s => s.status !== 'completed').length})` },
              { id: 'completed', label: `Đã xong (${schedules.filter(s => s.status === 'completed').length})` },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setScheduleSubFilter(tab.id as any)}
                className={`rounded-xl px-3.5 py-1.5 text-[12px] font-bold transition border cursor-pointer ${
                  scheduleSubFilter === tab.id
                    ? 'bg-[#385139] text-white border-[#385139] shadow-xs'
                    : 'bg-[#f4f7f2] text-[#4a6148] border-transparent hover:bg-[#e6efe4]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {(() => {
            const displayed = schedules.filter(s => {
              if (scheduleSubFilter === 'active') return s.status !== 'completed';
              if (scheduleSubFilter === 'completed') return s.status === 'completed';
              return true;
            });

            if (displayed.length === 0) {
              return (
                <div className="rounded-2xl border border-dashed border-[hsl(var(--border))] p-8 text-center bg-[#fafcf9]">
                  <Calendar size={36} className="mx-auto text-gray-400 mb-2" />
                  <p className="font-bold text-[14px] text-gray-700">Chưa có ca chăm sóc nào trong mục này</p>
                  <p className="text-[12px] text-gray-500 mt-1 max-w-sm mx-auto">
                    {scheduleSubFilter === 'completed'
                      ? 'Chưa có ca nào được hoàn thành. Sau khi kết thúc ca và ghi nhận báo cáo sinh hiệu, ca sẽ hiển thị tại đây.'
                      : 'Khi gia đình lựa chọn bạn làm người đồng hành và đặt ca, thông tin chi tiết sẽ xuất hiện tại đây.'}
                  </p>
                </div>
              );
            }

            return (
              <div className="space-y-3">
                {displayed.map((sch) => (
                  <div 
                    key={sch.id} 
                    className={`rounded-[18px] border-l-4 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-[hsl(var(--border))] ${
                      sch.status === 'completed' ? 'border-[#8ea48b] bg-[#f2f6f1]' : sch.status === 'confirmed' ? 'border-[#5b7a54] bg-[#f9faf7]' : 'border-[#c98e29] bg-[#faf8f2]'
                    }`}
                  >
                    <div>
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${
                        sch.status === 'completed' ? 'text-[#617c5d]' : sch.status === 'confirmed' ? 'text-[#688a60]' : 'text-[#a87422]'
                      }`}>
                        {sch.date} · {sch.time}
                      </span>
                      <h4 className="font-display text-[17px] font-bold text-[#2a3c2e] mt-0.5">{sch.title}</h4>
                      <p className="text-[12px] text-[hsl(var(--muted-foreground))] flex items-center gap-1.5 mt-0.5">
                        <MapPin size={13} /> Người cần chăm sóc: <strong>{sch.patientName || 'Người thân'}</strong> • Mức thù lao: {(sch.price || 400000).toLocaleString('vi-VN')} đ
                      </p>
                      {sch.tasks && <p className="text-[11px] text-[#556957] mt-1">Nhiệm vụ: {sch.tasks}</p>}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* NÚT XEM BỆNH ÁN & LỊCH SỬ CÁC BUỔI TRƯỚC */}
                      <button
                        type="button"
                        onClick={() => setViewingPatientHistory(sch)}
                        className="rounded-xl bg-[#edf6eb] border border-[#bcdcb6] px-3 py-1.5 text-[11.5px] font-bold text-[#2d5626] hover:bg-[#dfeeda] flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                        title="Xem bệnh án và lịch sử đo sinh hiệu các buổi trước của người bệnh"
                      >
                        <Stethoscope size={13} className="text-[#3c6b35]" />
                        <span>Xem bệnh án & Lịch sử đo</span>
                      </button>

                      {sch.status === 'completed' ? (
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-[#e3efe0] px-3 py-1 text-[11px] font-bold text-[#3e5f39] flex items-center gap-1">
                            <CheckCircle2 size={13} /> Đã hoàn thành ca
                          </span>
                          <button
                            type="button"
                            onClick={() => setViewingReportShift(sch)}
                            className="rounded-xl bg-blue-50 border border-blue-200 px-3 py-1.5 text-[11.5px] font-bold text-blue-800 hover:bg-blue-100 flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                            title="Xem lại báo cáo sinh hiệu & đánh giá đã nộp"
                          >
                            <FileText size={13} className="text-blue-600" /> Xem lại báo cáo & sinh hiệu
                          </button>
                        </div>
                      ) : sch.status === 'confirmed' ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <button 
                            type="button"
                            onClick={() => setCompletingShift(sch)}
                            className="rounded-xl bg-[#567a4e] px-3.5 py-1.5 text-[12px] font-bold text-white hover:bg-[#43643d] transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                          >
                            <CheckCircle2 size={13} /> Báo cáo hoàn thành ca
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Bạn có chắc muốn gửi yêu cầu hủy hoặc đổi ca chăm sóc "${sch.title}" vào ngày ${sch.date} (${sch.time}) không? Hệ thống sẽ thông báo đến Admin và Gia đình để sắp xếp điều phối kịp thời.`)) {
                                notify(`Đã gửi yêu cầu đổi/hủy ca (${sch.date}) tới Admin & Gia đình.`);
                              }
                            }}
                            className="rounded-xl border border-gray-200 bg-white hover:bg-red-50 text-gray-600 hover:text-red-700 px-2.5 py-1.5 text-[11.5px] font-medium transition cursor-pointer"
                            title="Yêu cầu đổi hoặc hủy ca"
                          >
                            Yêu cầu hủy/đổi ca
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button 
                            type="button"
                            onClick={() => {
                              if (interviewStatus !== 'passed') {
                                notify('Bạn cần hoàn tất phỏng vấn online đạt chuẩn với Admin trước khi được phép nhận ca.');
                                return;
                              }
                              handleUpdateStatus(sch, 'confirmed');
                            }}
                            className={`rounded-xl px-3.5 py-1.5 text-[12px] font-bold transition flex items-center gap-1.5 ${
                              interviewStatus !== 'passed' 
                                ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                                : 'bg-[#c98e29] text-white hover:bg-[#b07b22] cursor-pointer'
                            }`}
                            title={interviewStatus !== 'passed' ? 'Cần vượt qua phỏng vấn online với Admin để nhận ca' : 'Xác nhận nhận ca'}
                          >
                            {interviewStatus !== 'passed' && <Lock size={12} />}
                            Xác nhận nhận ca
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Bạn có chắc muốn từ chối ca "${sch.title}" này không?`)) {
                                notify('Đã từ chối nhận ca. Hệ thống sẽ điều phối người chăm sóc khác.');
                              }
                            }}
                            className="rounded-xl border border-gray-200 bg-white hover:bg-gray-100 text-gray-600 px-2.5 py-1.5 text-[11.5px] font-medium transition cursor-pointer"
                          >
                            Từ chối
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* NỘI DUNG TAB 3: THU NHẬP & ĐÁNH GIÁ */}
      {activeTab === 'earnings' && (
        <div className="grid gap-6 sm:grid-cols-3">
          <div className="rounded-[22px] border border-[hsl(var(--border))] bg-white p-5 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Thu nhập tạm tính tháng này</p>
            <p className="mt-3 font-display text-[30px] font-bold text-[#43643d]">
              {verificationStatus === 'approved' ? '12.450.000 đ' : '0 đ'}
            </p>
            <p className="mt-1 text-[11px] text-[#5d7c55]">Được bảo lãnh thanh toán 100% qua hệ thống</p>
          </div>
          <div className="rounded-[22px] border border-[hsl(var(--border))] bg-white p-5 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Tổng số ca đã nhận</p>
            <p className="mt-3 font-display text-[30px] font-bold text-[#2b3e2d]">
              {schedules.length} ca
            </p>
            <p className="mt-1 text-[11px] text-[#5d7c55]">Đồng bộ dữ liệu thời gian thực</p>
          </div>
          <div className="rounded-[22px] border border-[hsl(var(--border))] bg-white p-5 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Điểm tín nhiệm CARE SCORE</p>
            <p className="mt-3 font-display text-[30px] font-bold text-[#c98e29] flex items-center gap-1.5">
              {careScore > 0 ? `${careScore}/100` : 'Chờ cấp điểm'} <Star size={20} fill="#c98e29" />
            </p>
            <p className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">
              {verificationStatus === 'approved' ? 'Xếp hạng Điều dưỡng & Chăm sóc Uy tín' : 'Cần hoàn tất xác thực eKYC'}
            </p>
          </div>
        </div>
      )}

      {/* NỘI DUNG TAB 4: HỒ SƠ CỦA BẠN & ĐÁNH GIÁ SAO THỰC TẾ TỪ GIA ĐÌNH */}
      {activeTab === 'reviews' && (
        <div className="space-y-6">
          {/* Header & Thống kê điểm sao */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Card 1: Thẻ hồ sơ chuyên môn tổng quát */}
            <div className="rounded-[24px] border border-[hsl(var(--border))] bg-white p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-[#43643d] to-[#2c4728] flex items-center justify-center text-white text-[20px] font-bold shadow-sm">
                    {userName.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-display text-[18px] font-bold text-[#203623] truncate">{userName}</h3>
                    <p className="text-[12px] text-gray-500 font-medium">Chuyên viên chăm sóc y tế</p>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className={`rounded-full px-2 py-0.5 text-[9.5px] font-bold ${
                        verificationStatus === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {verificationStatus === 'approved' ? '✓ Đã xác thực eKYC' : 'Chờ hoàn tất eKYC'}
                      </span>
                      {interviewStatus === 'passed' && (
                        <span className="rounded-full bg-blue-100 text-blue-800 px-2 py-0.5 text-[9.5px] font-bold">
                          ✓ Đạt chuẩn Meet
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 space-y-2 text-[12px]">
                  <div className="flex justify-between py-1 border-b border-gray-50">
                    <span className="text-gray-500">Số năm kinh nghiệm:</span>
                    <strong className="text-gray-800">{formatExperience(formData.experienceYears)} năm</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-50">
                    <span className="text-gray-500">Khu vực phục vụ:</span>
                    <strong className="text-gray-800">{formData.district || 'Toàn thành phố'}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-50">
                    <span className="text-gray-500">Thù lao ca ngày:</span>
                    <strong className="text-emerald-800 font-bold">{(Number(formData.shiftRate) || 400000).toLocaleString('vi-VN')} đ/ca</strong>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-gray-500">Thù lao ca tối (x1.5):</span>
                    <strong className="text-amber-800 font-bold">{(Number(formData.nightShiftRate) || Math.round((Number(formData.shiftRate) || 400000) * 1.5)).toLocaleString('vi-VN')} đ/ca</strong>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                <span className="text-[11px] text-gray-400">Mã hồ sơ: CM-CG-{profileId || userId}</span>
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="text-[11.5px] font-bold text-[#43643d] hover:underline cursor-pointer"
                >
                  Chỉnh sửa hồ sơ
                </button>
              </div>
            </div>

            {/* Card 2: Thống kê số sao trung bình & CARE SCORE */}
            <div className="rounded-[24px] border border-[hsl(var(--border))] bg-gradient-to-br from-[#f9faf7] to-[#eef4ec] p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#43643d] flex items-center gap-1">
                    <Award size={15} /> Xếp hạng tín nhiệm dịch vụ
                  </span>
                  <button 
                    onClick={loadCaregiverReviews}
                    disabled={loadingReviews}
                    className="p-1 rounded-lg text-gray-500 hover:bg-white transition cursor-pointer"
                    title="Cập nhật đánh giá mới"
                  >
                    <RefreshCw size={13} className={loadingReviews ? 'animate-spin' : ''} />
                  </button>
                </div>

                <div className="mt-4 text-center">
                  <div className="inline-flex items-baseline gap-1.5">
                    <span className="font-display text-[46px] font-extrabold text-[#1f3823] leading-none">
                      {Number(reviewsData.stats.avg_rating || 5.0).toFixed(1)}
                    </span>
                    <span className="text-[18px] text-gray-400 font-medium">/ 5.0</span>
                  </div>

                  <div className="flex items-center justify-center gap-1 mt-2">
                    {[1, 2, 3, 4, 5].map((s) => {
                      const avg = Number(reviewsData.stats.avg_rating || 5.0);
                      const isFull = s <= Math.floor(avg);
                      const isHalf = !isFull && s <= Math.ceil(avg) && avg % 1 >= 0.3;
                      return (
                        <Star 
                          key={s} 
                          size={22} 
                          className={isFull ? 'fill-amber-400 text-amber-400' : isHalf ? 'fill-amber-300 text-amber-400' : 'text-gray-300'} 
                        />
                      );
                    })}
                  </div>

                  <p className="mt-2 text-[12.5px] font-semibold text-gray-700">
                    Dựa trên <strong>{reviewsData.stats.review_count}</strong> lượt đánh giá từ các gia đình
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-2xl bg-white/80 border border-emerald-200 p-3 flex items-center justify-between text-[12px]">
                <span className="text-gray-600 font-medium">Điểm tin cậy CARE SCORE:</span>
                <span className="font-bold text-[#2d5229] bg-[#e4efe0] px-2.5 py-0.5 rounded-full">
                  {careScore > 0 ? `${careScore}/100` : '96/100'} điểm
                </span>
              </div>
            </div>

            {/* Card 3: Biểu đồ phân bổ 5 mức sao */}
            <div className="rounded-[24px] border border-[hsl(var(--border))] bg-white p-6 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-600 block mb-3">
                  Phân bổ mức độ hài lòng
                </span>

                <div className="space-y-2 text-[12px]">
                  {[
                    { stars: 5, count: reviewsData.stats.five_star, label: '5 sao' },
                    { stars: 4, count: reviewsData.stats.four_star, label: '4 sao' },
                    { stars: 3, count: reviewsData.stats.three_star, label: '3 sao' },
                    { stars: 2, count: reviewsData.stats.two_star, label: '2 sao' },
                    { stars: 1, count: reviewsData.stats.one_star, label: '1 sao' }
                  ].map((row) => {
                    const total = reviewsData.stats.review_count || 1;
                    const pct = Math.round((row.count / total) * 100);
                    return (
                      <div key={row.stars} className="flex items-center gap-2">
                        <span className="w-10 text-[11.5px] font-bold text-gray-600">{row.label}</span>
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              row.stars >= 4 ? 'bg-amber-400' : row.stars === 3 ? 'bg-amber-300' : 'bg-rose-400'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="w-8 text-right text-[11px] text-gray-500">{row.count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 text-[11px] text-gray-500 flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                <span>100% đánh giá đến từ các ca chăm sóc thực tế được bảo lãnh.</span>
              </div>
            </div>
          </div>

          {/* Danh sách lời nhận xét & phản hồi chi tiết từ gia đình */}
          <div className="rounded-[24px] border border-[hsl(var(--border))] bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="font-display text-[19px] font-bold text-[#233827] flex items-center gap-2">
                  <MessageSquareQuote size={18} className="text-[#43643d]" />
                  Chi Tiết Nhận Xét & Phản Hồi Từ Gia Đình ({reviewsData.reviews.length})
                </h3>
                <p className="text-[12px] text-gray-500 mt-0.5">
                  Phản hồi được ghi nhận tự động sau mỗi ca làm việc hoàn tất thành công.
                </p>
              </div>

              <span className="rounded-full bg-[#f1f6ef] text-[#345337] px-3 py-1 text-[11.5px] font-bold">
                ⭐ {reviewsData.stats.review_count} Đánh giá
              </span>
            </div>

            {loadingReviews ? (
              <div className="py-12 text-center text-[13px] text-gray-500">
                <RefreshCw size={24} className="animate-spin mx-auto text-[#43643d] mb-2" />
                Đang tải dữ liệu nhận xét...
              </div>
            ) : reviewsData.reviews.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-[#fbfdfa] p-10 text-center space-y-2">
                <Star size={36} className="mx-auto text-amber-300" />
                <h4 className="font-bold text-[15px] text-gray-700">Chưa có đánh giá nào</h4>
                <p className="text-[12.5px] text-gray-500 max-w-md mx-auto">
                  Khi bạn nhận ca chăm sóc từ gia đình và hoàn thành ca, người nhà bệnh nhân sẽ gửi lời nhận xét và số sao đánh giá tại đây.
                </p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {reviewsData.reviews.map((rev) => (
                  <div key={rev.id} className="rounded-2xl border border-gray-200 bg-[#fbfdfa] p-4.5 space-y-2.5 transition hover:shadow-xs">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-display font-bold text-[14px] text-gray-900">
                            {rev.family_name || 'Gia đình người thân'}
                          </h4>
                          {rev.patientName && (
                            <span className="rounded-full bg-[#e8f1e5] text-[#345831] px-2 py-0.2 text-[10.5px] font-semibold">
                              Chăm sóc: {rev.patientName}
                            </span>
                          )}
                          <span className="rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.2 text-[9.5px] font-bold">
                            ✓ Ca hoàn tất
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          {rev.shift_date ? `Ca ngày: ${rev.shift_date} · ` : ''}
                          {new Date(rev.created_at).toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                      </div>

                      <div className="flex items-center gap-0.5 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-xl shrink-0">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star 
                            key={s} 
                            size={14} 
                            className={s <= rev.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'} 
                          />
                        ))}
                        <span className="ml-1 text-[11.5px] font-bold text-amber-900">{rev.rating} sao</span>
                      </div>
                    </div>

                    {/* Lời nhận xét */}
                    <p className="text-[13px] text-gray-800 leading-relaxed font-normal bg-white p-3 rounded-xl border border-gray-100">
                      "{rev.review_text || 'Chăm sóc rất tận tình, đúng giờ và chu đáo.'}"
                    </p>

                    {/* Tags khen ngợi */}
                    {Array.isArray(rev.tags) && rev.tags.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        <span className="text-[10.5px] font-bold uppercase text-gray-400 flex items-center gap-1">
                          <ThumbsUp size={11} className="text-emerald-600" /> Điểm cộng:
                        </span>
                        {rev.tags.map((tag: string, idx: number) => (
                          <span key={idx} className="rounded-lg bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-semibold text-emerald-900">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL BÁO CÁO SINH HIỆU KHI BÁO HOÀN THÀNH CA (BẮT BUỘC) */}
      {completingShift && (
        <CareShiftReportModal
          isOpen={true}
          mode="create"
          shift={completingShift}
          currentUser={currentUser}
          notify={notify}
          onClose={() => setCompletingShift(null)}
          onSuccess={() => {
            setSchedules(prev => prev.map(s => s.id === completingShift.id ? { ...s, status: 'completed' } : s));
            setCompletingShift(null);
          }}
        />
      )}

      {/* MODAL XEM LẠI BÁO CÁO & SINH HIỆU TRONG MỤC ĐÃ XONG */}
      {viewingReportShift && (
        <CareShiftReportModal
          isOpen={true}
          mode="view"
          shift={viewingReportShift}
          currentUser={currentUser}
          notify={notify}
          onClose={() => setViewingReportShift(null)}
        />
      )}

      {/* MODAL XEM BỆNH ÁN & LỊCH SỬ ĐO SINH HIỆU CÁC BUỔI TRƯỚC */}
      {viewingPatientHistory && (
        <PatientMedicalHistoryModal
          isOpen={true}
          onClose={() => setViewingPatientHistory(null)}
          patientName={viewingPatientHistory.patientName}
          elderlyProfileId={viewingPatientHistory.elderlyProfileId}
          familyUserId={viewingPatientHistory.familyUserId}
          shiftInfo={{
            id: viewingPatientHistory.id,
            date: viewingPatientHistory.date,
            time: viewingPatientHistory.time,
            title: viewingPatientHistory.title,
            tasks: viewingPatientHistory.tasks,
            status: viewingPatientHistory.status,
            familyName: viewingPatientHistory.familyName,
            familyPhone: viewingPatientHistory.familyPhone,
            address: viewingPatientHistory.address,
            district: viewingPatientHistory.district
          }}
        />
      )}
    </div>
  );
}
