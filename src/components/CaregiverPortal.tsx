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
  CreditCard
} from 'lucide-react';
import { store, ScheduleItem } from '@/lib/store';

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

const API = 'http://localhost:5000/api';

// Hàm xử lý hậu kỳ số năm kinh nghiệm: nếu < 10 tự động thêm số 0 ở đầu (VD: '8' -> '08')
export const formatExperience = (val: string | number | undefined | null) => {
  const digits = String(val ?? '').replace(/\D/g, '');
  if (!digits) return '00';
  const n = parseInt(digits, 10);
  return n < 10 ? `0${n}` : `${n}`;
};

export function CaregiverPortal({ notify, onNavigateToRole, currentUser }: CaregiverPortalProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'schedule' | 'earnings'>('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [profileId, setProfileId] = useState<number | null>(null);

  // Chế độ xem (View Mode) vs Chế độ chỉnh sửa (Edit Mode)
  const [isEditing, setIsEditing] = useState<boolean>(false);

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
    experienceYears: '' as string | number,
    district: '',
    hourlyRate: 100000,
    skills: [] as string[],
    bio: ''
  });

  const [customSkillInput, setCustomSkillInput] = useState('');

  // Modal xem trước ảnh tài liệu
  const [previewDoc, setPreviewDoc] = useState<CaregiverDoc | null>(null);

  // File input refs cho 4 loại tài liệu
  const fileInputRefs = {
    cccd: useRef<HTMLInputElement>(null),
    policeCheck: useRef<HTMLInputElement>(null),
    certificate: useRef<HTMLInputElement>(null),
    healthCheck: useRef<HTMLInputElement>(null)
  };

  const userId = currentUser?.id || 2;
  const userName = currentUser?.full_name || formData.fullName || 'Người chăm sóc';

  // 1. Tải hồ sơ từ cơ sở dữ liệu MySQL
  const loadCaregiverProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/caregiver-profile?userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setProfileId(data.id || null);
        const status = data.verification_status || 'not_submitted';
        setVerificationStatus(status);
        setCareScore(data.care_score || 0);

        const exp = data.experience_years !== undefined && data.experience_years !== null
          ? formatExperience(data.experience_years)
          : '';

        setFormData({
          fullName: data.full_name || currentUser?.full_name || '',
          phone: data.phone || currentUser?.phone || '',
          idNumber: data.id_number || '',
          experienceYears: exp,
          district: data.district || '',
          hourlyRate: data.hourly_rate || 100000,
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

        // Bắn sự kiện đồng bộ trạng thái thanh sidebar bên trái
        window.dispatchEvent(new CustomEvent('carematch:caregiver-status-updated', {
          detail: { status, care_score: data.care_score }
        }));
      }
    } catch (e) {
      console.error('Lỗi tải hồ sơ người chăm sóc:', e);
    } finally {
      setLoading(false);
    }
  };

  // 2. Tải lịch trình ca làm việc từ MySQL
  const fetchSchedules = async () => {
    try {
      const nameQuery = currentUser?.full_name ? encodeURIComponent(currentUser.full_name) : 'Lan Anh';
      const res = await fetch(`${API}/schedules?caregiverUserId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const mapped: ScheduleItem[] = data.map((d: any) => ({
            id: String(d.id),
            caregiverId: String(d.caregiver_user_id || userId),
            caregiverName: d.caregiver_name || userName,
            patientName: d.elderly_name || 'Người thân',
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
    loadCaregiverProfile();
    fetchSchedules();

    // Polling đồng bộ Realtime mỗi 3 giây
    const interval = setInterval(fetchSchedules, 3000);
    return () => clearInterval(interval);
  }, [userId]);

  // 3. Xử lý tải lên tệp ảnh thực tế
  const handleFileChange = async (docType: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Giới hạn kích thước tệp tối đa 15MB
    if (file.size > 15 * 1024 * 1024) {
      notify('Kích thước tệp quá lớn. Vui lòng chọn tệp nhỏ hơn 15MB.');
      return;
    }

    notify(`Đang tải lên tệp: ${file.name}...`);

    try {
      // Đọc file thành data URL
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result as string;

        try {
          const res = await fetch(`${API}/upload`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              dataUrl,
              fileName: file.name,
              documentType: docType
            })
          });

          if (res.ok) {
            const uploadData = await res.json();
            const newDoc: CaregiverDoc = {
              type: docType,
              name: file.name,
              url: uploadData.url,
              filename: uploadData.filename,
              uploadedAt: new Date().toISOString()
            };

            setDocuments(prev => {
              const filtered = prev.filter(d => d.type !== docType);
              return [...filtered, newDoc];
            });

            notify(`Đã tải lên tệp ${file.name} thành công và lưu vào hệ thống! ✓`);
          } else {
            notify('Máy chủ không thể lưu tệp. Vui lòng thử lại.');
          }
        } catch {
          notify('Lỗi kết nối khi gửi tệp lên máy chủ.');
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      notify('Lỗi đọc tệp từ thiết bị của bạn.');
    } finally {
      // Reset input để có thể chọn lại cùng một tệp nếu muốn
      if (e.target) e.target.value = '';
    }
  };

  // 4. Xóa tài liệu đã tải lên
  const handleRemoveDoc = (docType: string) => {
    setDocuments(prev => prev.filter(d => d.type !== docType));
    notify('Đã gỡ tệp tài liệu.');
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

    // Xử lý hậu kỳ số năm kinh nghiệm: người dùng nhập tự do, khi lưu nếu < 10 tự động nhảy thêm số 0 ở đầu (VD: 8 -> 08)
    const rawExp = String(formData.experienceYears).replace(/\D/g, '');
    const numExp = rawExp ? parseInt(rawExp, 10) : 0;
    const formattedExp = formatExperience(numExp);
    setFormData(prev => ({ ...prev, experienceYears: formattedExp }));

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
          hourly_rate: Number(formData.hourlyRate) || 100000,
          district: formData.district.trim(),
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
          notify('Đã lưu thông tin hồ sơ vào cơ sở dữ liệu MySQL thành công! Bấm "Chỉnh sửa hồ sơ" khi cần sửa đổi. ✓');
        }
      } else {
        notify('Không thể lưu hồ sơ vào MySQL.');
      }
    } catch {
      notify('Lỗi kết nối khi lưu hồ sơ vào máy chủ.');
    } finally {
      setSaving(false);
      setSubmittingReview(false);
    }
  };

  // 7. Cập nhật trạng thái ca làm việc
  const handleUpdateStatus = async (sch: ScheduleItem, nextStatus: 'confirmed' | 'completed') => {
    try {
      await fetch(`${API}/schedules/${sch.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
    } catch { }
    store.updateScheduleStatus(sch.id, nextStatus);
    setSchedules(prev => prev.map(s => s.id === sch.id ? { ...s, status: nextStatus } : s));
    notify(nextStatus === 'completed' ? `Đã xác nhận hoàn thành: ${sch.title} (Lưu MySQL)` : `Đã nhận ca: ${sch.title} (Lưu MySQL)`);
  };

  // Định dạng hiển thị tệp URL (hỗ trợ cả relative URL và external)
  const getFullFileUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `http://localhost:5000${url}`;
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
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('profile')}
            className={`rounded-xl px-3.5 py-2 text-[12px] font-bold transition cursor-pointer ${
              activeTab === 'profile' 
                ? 'bg-[hsl(var(--primary))] text-white shadow-sm' 
                : 'bg-[hsl(var(--secondary))] text-[#374c39] hover:bg-[#e4ece0]'
            }`}
          >
            Hồ sơ & Xác thực (Upload eKYC)
          </button>
          <button
            onClick={() => setActiveTab('schedule')}
            className={`rounded-xl px-3.5 py-2 text-[12px] font-bold transition cursor-pointer ${
              activeTab === 'schedule' 
                ? 'bg-[hsl(var(--primary))] text-white shadow-sm' 
                : 'bg-[hsl(var(--secondary))] text-[#374c39] hover:bg-[#e4ece0]'
            }`}
          >
            Lịch nhận ca ({schedules.length})
          </button>
          <button
            onClick={() => setActiveTab('earnings')}
            className={`rounded-xl px-3.5 py-2 text-[12px] font-bold transition cursor-pointer ${
              activeTab === 'earnings' 
                ? 'bg-[hsl(var(--primary))] text-white shadow-sm' 
                : 'bg-[hsl(var(--secondary))] text-[#374c39] hover:bg-[#e4ece0]'
            }`}
          >
            Thu nhập & Đánh giá
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
          <div className="rounded-[24px] border border-[hsl(var(--border))] bg-white p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[hsl(var(--border))]">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-[21px] font-semibold text-[#273a2c]">
                      {isEditing ? 'Chỉnh Sửa Thông Tin Năng Lực' : 'Thông Tin Năng Lực & Kinh Nghiệm'}
                    </h3>
                    {!isEditing && (
                      <span className="rounded-full bg-[#e8f2e6] text-[#345831] px-2.5 py-0.5 text-[10px] font-bold">
                        ✓ Đã lưu CSDL
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[12px] text-[hsl(var(--muted-foreground))]">
                    {isEditing 
                      ? 'Cập nhật thông tin chính xác để hệ thống đồng bộ vào MySQL và kết nối ca chăm sóc phù hợp.'
                      : 'Hồ sơ đã được lưu trữ an toàn trong MySQL. Bấm nút chỉnh sửa khi cần cập nhật lại.'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {loading && (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-[hsl(var(--primary))] border-t-transparent" />
                  )}
                  {!isEditing ? (
                    <div className="flex items-center gap-2">
                      {verificationStatus === 'pending' && (
                        <span className="rounded-full bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-0.5 text-[10.5px] font-bold flex items-center gap-1">
                          <Clock size={11} /> Chờ duyệt
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => setIsEditing(true)}
                        className="flex items-center gap-1.5 rounded-xl bg-[hsl(var(--secondary))] border border-[#c2d7bf] px-3.5 py-1.5 text-[12px] font-bold text-[#2d472f] hover:bg-[#dfebe0] transition cursor-pointer shadow-xs"
                      >
                        <Edit3 size={14} />
                        <span>Chỉnh sửa hồ sơ</span>
                      </button>
                    </div>
                  ) : (
                    Boolean(profileId || formData.idNumber || formData.bio) && (
                      <button
                        type="button"
                        onClick={() => setIsEditing(false)}
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
                        <span>Hồ sơ đã được lưu trữ an toàn trong MySQL. Bạn có thể nhấn <strong>"Chỉnh sửa hồ sơ"</strong> bất kỳ lúc nào.</span>
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

                    <div className="rounded-xl border border-[hsl(var(--border))] bg-[#fafcf9] p-3">
                      <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#5b735e] block">Khu vực nhận ca</span>
                      <p className="mt-1 text-[13.5px] font-semibold text-[#253928] flex items-center gap-1.5">
                        <MapPin size={15} className="text-[#51704e]" />
                        {formData.district || 'Toàn thành phố'}
                      </p>
                    </div>

                    <div className="rounded-xl border border-[hsl(var(--border))] bg-[#fafcf9] p-3">
                      <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#5b735e] block">Mức thù lao mong muốn</span>
                      <p className="mt-1 text-[13.5px] font-bold text-[#2d5229] flex items-center gap-1.5">
                        <DollarSign size={15} className="text-[#51704e]" />
                        {(Number(formData.hourlyRate) || 100000).toLocaleString('vi-VN')} đ/giờ
                      </p>
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
                      <span className="mb-1.5 block text-[11px] font-bold text-[#455b48]">Số năm kinh nghiệm</span>
                      <input 
                        type="text" 
                        inputMode="numeric"
                        value={formData.experienceYears} 
                        onChange={e => {
                          const val = e.target.value.replace(/\D/g, '');
                          setFormData({ ...formData, experienceYears: val });
                        }}
                        placeholder="VD: 8"
                        className="h-11 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 text-[13px] outline-none focus:border-[hsl(var(--primary))]" 
                      />
                      <span className="mt-1 block text-[10px] text-[#556e58]">
                        Nhập tự do (nếu &lt; 10, lưu xong sẽ tự thêm số 0)
                      </span>
                    </label>
                  </div>

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

                    <label className="block">
                      <span className="mb-1.5 block text-[11px] font-bold text-[#455b48]">Mức thù lao mong muốn (đ/giờ)</span>
                      <input 
                        type="number" 
                        step="10000"
                        value={formData.hourlyRate} 
                        onChange={e => setFormData({ ...formData, hourlyRate: Number(e.target.value) })}
                        className="h-11 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 text-[13px] outline-none focus:border-[hsl(var(--primary))]" 
                      />
                    </label>
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
                      onClick={() => setIsEditing(false)}
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
                    💾 {saving ? 'Đang lưu MySQL...' : 'Lưu thông tin hồ sơ (Lưu MySQL)'}
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="rounded-xl border border-[hsl(var(--border))] bg-[#f7faf5] px-4 py-2 text-[12.5px] font-bold text-[#355238] hover:bg-[#edf4eb] transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Edit3 size={14} /> Chỉnh sửa hồ sơ
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* CỘT PHẢI: KHU VỰC TẢI LÊN TÀI LIỆU MINH CHỨNG (eKYC THỰC TẾ) */}
          <div className="rounded-[24px] border border-[hsl(var(--border))] bg-white p-6 shadow-sm flex flex-col justify-between">
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
                {/* 1. CCCD gắn chip */}
                {(() => {
                  const doc = getDoc('cccd');
                  const isLocked = verificationStatus === 'pending';
                  return (
                    <div className={`rounded-[18px] border p-3.5 transition-all ${
                      doc ? 'bg-[#f4f9f2] border-[#b8d4b3]' : 'bg-[#fafcf9] border-[hsl(var(--border))]'
                    }`}>
                      <input 
                        type="file" 
                        ref={fileInputRefs.cccd}
                        accept="image/*,.pdf"
                        onChange={e => handleFileChange('cccd', e)}
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
                            <p className="text-[12.5px] font-bold text-[#2a3c2e]">1. Căn cước công dân gắn chip *</p>
                            <p className="text-[10.5px] text-[hsl(var(--muted-foreground))]">Ảnh chụp 2 mặt rõ nét, không lóa</p>
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
                                    onClick={() => fileInputRefs.cccd.current?.click()}
                                    className="rounded-lg border border-[hsl(var(--border))] bg-white px-2 py-1 text-[11px] font-bold text-[#455c47] hover:bg-gray-50 transition cursor-pointer"
                                  >
                                    Đổi ảnh
                                  </button>
                                  <button 
                                    type="button" 
                                    onClick={() => handleRemoveDoc('cccd')}
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
                              onClick={() => fileInputRefs.cccd.current?.click()}
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

                {/* 3. Chứng chỉ Điều dưỡng / Sơ cấp cứu */}
                {(() => {
                  const doc = getDoc('certificate');
                  const isLocked = verificationStatus === 'pending';
                  return (
                    <div className={`rounded-[18px] border p-3.5 transition-all ${
                      doc ? 'bg-[#f4f9f2] border-[#b8d4b3]' : 'bg-[#fafcf9] border-[hsl(var(--border))]'
                    }`}>
                      <input 
                        type="file" 
                        ref={fileInputRefs.certificate}
                        accept="image/*,.pdf"
                        onChange={e => handleFileChange('certificate', e)}
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
                            <p className="text-[12.5px] font-bold text-[#2a3c2e]">3. Chứng chỉ Điều dưỡng / Sơ cấp cứu</p>
                            <p className="text-[10.5px] text-[hsl(var(--muted-foreground))]">Bằng CĐ Y tế, chứng chỉ Chữ thập đỏ...</p>
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
                                    onClick={() => fileInputRefs.certificate.current?.click()}
                                    className="rounded-lg border border-[hsl(var(--border))] bg-white px-2 py-1 text-[11px] font-bold text-[#455c47] hover:bg-gray-50 transition cursor-pointer"
                                  >
                                    Đổi ảnh
                                  </button>
                                  <button 
                                    type="button" 
                                    onClick={() => handleRemoveDoc('certificate')}
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
                              onClick={() => fileInputRefs.certificate.current?.click()}
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

                {/* 4. Giấy khám sức khỏe */}
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
                            <p className="text-[12.5px] font-bold text-[#2a3c2e]">4. Giấy khám sức khỏe định kỳ</p>
                            <p className="text-[10.5px] text-[hsl(var(--muted-foreground))]">Đủ điều kiện hành nghề trong 6 tháng</p>
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
                    Hồ sơ và ảnh tài liệu được bảo mật và lưu vào MySQL, chuyển tiếp trực tiếp đến Ban Quản Trị CARE-MATCH.
                  </p>
                </>
              )}
            </div>
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
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display text-[22px] font-semibold text-[#273a2c]">
                Lịch Làm Việc Được Phân Bổ
              </h3>
              <p className="text-[13px] text-[hsl(var(--muted-foreground))]">
                Các ca chăm sóc đang diễn ra và sắp tới được đồng bộ trực tiếp từ các gia đình qua MySQL.
              </p>
            </div>
            <span className="rounded-full bg-[#edf5ea] px-3 py-1 text-[11px] font-bold text-[#43643d]">
              Tổng số ca: {schedules.length}
            </span>
          </div>

          {schedules.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[hsl(var(--border))] p-8 text-center bg-[#fafcf9]">
              <Calendar size={36} className="mx-auto text-gray-400 mb-2" />
              <p className="font-bold text-[14px] text-gray-700">Chưa có ca chăm sóc nào được chỉ định</p>
              <p className="text-[12px] text-gray-500 mt-1 max-w-sm mx-auto">
                Khi gia đình lựa chọn bạn làm người đồng hành và đặt ca, thông tin chi tiết sẽ xuất hiện tại đây.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {schedules.map((sch) => (
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

                  <div className="flex items-center gap-2">
                    {sch.status === 'completed' ? (
                      <span className="rounded-full bg-[#e3efe0] px-3 py-1 text-[11px] font-bold text-[#3e5f39] flex items-center gap-1">
                        <CheckCircle2 size={13} /> Đã hoàn thành ca
                      </span>
                    ) : sch.status === 'confirmed' ? (
                      <button 
                        onClick={() => handleUpdateStatus(sch, 'completed')}
                        className="rounded-xl bg-[#567a4e] px-3.5 py-2 text-[12px] font-bold text-white hover:bg-[#43643d] transition cursor-pointer"
                      >
                        Báo cáo hoàn thành ca
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleUpdateStatus(sch, 'confirmed')}
                        className="rounded-xl bg-[#c98e29] px-3.5 py-2 text-[12px] font-bold text-white hover:bg-[#b07b22] transition cursor-pointer"
                      >
                        Xác nhận nhận ca
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
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
    </div>
  );
}
