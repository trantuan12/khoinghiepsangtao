import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  ShieldCheck, 
  AlertCircle, 
  Upload, 
  CheckCircle2, 
  Clock3, 
  FileText, 
  Eye, 
  Trash2, 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  CreditCard, 
  User, 
  Sparkles,
  Info
} from 'lucide-react';
import { API } from '@/lib/apiConfig';
import { compressImage } from '@/lib/imageUtils';

export interface FamilyProfileData {
  id?: number;
  user_id: number;
  representative_name: string;
  phone: string;
  email: string;
  id_number: string;
  address: string;
  district: string;
  id_card_front: string | null;
  id_card_back: string | null;
  verification_status: 'unverified' | 'pending' | 'approved' | 'rejected';
  rejection_reason?: string | null;
  verified_at?: string | null;
}

interface FamilyProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number;
  currentUser?: { id: number; full_name?: string; email?: string; phone?: string };
  onSaved?: (profile: FamilyProfileData) => void;
  notify?: (msg: string) => void;
}

export function FamilyProfileModal({
  isOpen,
  onClose,
  userId,
  currentUser,
  onSaved,
  notify = () => {}
}: FamilyProfileModalProps) {
  const [profile, setProfile] = useState<FamilyProfileData>({
    user_id: userId,
    representative_name: currentUser?.full_name || '',
    phone: currentUser?.phone || '',
    email: currentUser?.email || '',
    id_number: '',
    address: '',
    district: '',
    id_card_front: null,
    id_card_back: null,
    verification_status: 'unverified'
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingFront, setUploadingFront] = useState(false);
  const [uploadingBack, setUploadingBack] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);

  // Load data khi mở modal
  useEffect(() => {
    if (!isOpen || !userId) return;
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API}/family-profile?userId=${userId}`);
        if (res.ok) {
          const data = await res.json();
          if (data) {
            setProfile(prev => ({
              ...prev,
              ...data,
              representative_name: data.representative_name || currentUser?.full_name || prev.representative_name,
              phone: data.phone || currentUser?.phone || prev.phone,
              email: data.email || currentUser?.email || prev.email
            }));
          }
        }
      } catch (err) {
        console.error('Lỗi tải hồ sơ gia đình:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [isOpen, userId, currentUser]);

  if (!isOpen) return null;

  // Xử lý nạp ảnh CCCD: Nén ảnh và lưu ngay tại giao diện để xem/đổi, CHƯA gửi lên database
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, side: 'front' | 'back') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (side === 'front') setUploadingFront(true);
    else setUploadingBack(true);

    try {
      const dataUrl = await compressImage(file);

      // Lưu trực tiếp vào giao diện người dùng
      setProfile(prev => ({
        ...prev,
        [side === 'front' ? 'id_card_front' : 'id_card_back']: dataUrl
      }));
      notify(`Đã nạp ảnh CCCD (${side === 'front' ? 'Mặt trước' : 'Mặt sau'})! Bấm "Gửi Admin xét duyệt eKYC" để hoàn tất lưu trữ. ✓`);
    } catch (err) {
      console.error('Lỗi đọc ảnh:', err);
      notify('Không thể đọc file ảnh. Vui lòng thử lại.');
    } finally {
      if (side === 'front') setUploadingFront(false);
      else setUploadingBack(false);
      if (e.target) e.target.value = '';
    }
  };

  // Lưu hồ sơ
  const handleSave = async (submitForReview = false) => {
    if (!profile.representative_name.trim()) {
      alert('Vui lòng nhập họ và tên của người đại diện gia đình.');
      return;
    }

    if (submitForReview && !profile.id_number.trim()) {
      alert('Vui lòng nhập số Căn cước công dân (CCCD) gắn chip để gửi Admin xét duyệt eKYC.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...profile,
        user_id: userId,
        submit_for_review: submitForReview
      };

      const res = await fetch(`${API}/family-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const result = await res.json();
        const updated = result.profile || payload;
        setProfile(updated);
        if (onSaved) onSaved(updated);

        // Bắn event để Sidebar và Schedule cập nhật tức thì
        window.dispatchEvent(new CustomEvent('carematch:family-profile-updated', { detail: updated }));

        if (submitForReview) {
          notify('Đã gửi thông tin CCCD & hồ sơ eKYC cho Ban Quản Trị xét duyệt! ✓');
        } else {
          notify('Đã lưu thông tin gia đình thành công! ✓');
        }
        onClose();
      } else {
        notify('Lỗi máy chủ khi lưu hồ sơ gia đình.');
      }
    } catch (err) {
      console.error('Lỗi lưu family profile:', err);
      notify('Không thể kết nối đến máy chủ. Vui lòng thử lại sau.');
    } finally {
      setSaving(false);
    }
  };

  const status = profile.verification_status || 'unverified';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-xs animate-fadeIn" data-testid="modal-family-profile">
      <div className="relative flex flex-col w-full max-w-2xl max-h-[92vh] rounded-[28px] bg-white shadow-2xl border border-[hsl(var(--border))] overflow-hidden animate-rise">
        
        {/* HEADER MODAL */}
        <div className="flex items-center justify-between border-b border-[#e5ece2] bg-[#fbfdfa] px-4 sm:px-6 py-3.5 sm:py-4.5">
          <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
            <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#385139] to-[#5a7c5b] text-white shadow-md">
              <ShieldCheck size={20} className="sm:w-[22px] sm:h-[22px]" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <h3 className="font-display text-[16px] sm:text-[20px] font-bold text-[#233526] truncate">
                  Hồ Sơ Gia Đình & Xác Thực eKYC
                </h3>
                {status === 'approved' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] sm:text-[11px] font-bold border border-emerald-300">
                    <CheckCircle2 size={12} /> Đã duyệt eKYC
                  </span>
                )}
                {status === 'pending' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-[10px] sm:text-[11px] font-bold border border-amber-300">
                    <Clock3 size={12} /> Chờ Admin duyệt
                  </span>
                )}
                {status === 'rejected' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 text-rose-800 px-2 py-0.5 text-[10px] sm:text-[11px] font-bold border border-rose-300">
                    <AlertCircle size={12} /> Cần bổ sung
                  </span>
                )}
                {status === 'unverified' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 text-gray-700 px-2 py-0.5 text-[10px] sm:text-[11px] font-bold border border-gray-300">
                    Chưa xác thực CCCD
                  </span>
                )}
              </div>
              <p className="text-[11.5px] sm:text-[12px] text-[hsl(var(--muted-foreground))] truncate">
                Quản lý thông tin người đại diện và định danh CCCD gắn chip (Đồng bộ hệ thống)
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition shrink-0 ml-2"
            data-testid="button-close-family-modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* BODY MODAL */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 sm:space-y-6">
          {/* BANNER THÔNG BÁO BẢO ĐẢM AN TOÀN */}
          <div className="rounded-2xl border border-[#d6e5d2] bg-[#f4f9f2] p-4 text-[12.5px] leading-relaxed text-[#355337]">
            <div className="flex items-start gap-2.5">
              <Info size={17} className="text-[#3b6b3e] shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold text-[#203c22]">Quy định an toàn đặt ca tại CARE-MATCH:</strong>
                <p className="mt-1">
                  Nhằm đảm bảo an toàn tuyệt đối cho người chăm sóc khi đến hỗ trợ tại gia, người đại diện cần cung cấp 
                  <strong> số CCCD gắn chip</strong> và thông tin định danh cơ bản trước khi đặt ca. 
                  <span className="text-[#725418] font-semibold"> (Việc tư vấn, trao đổi tin nhắn trực tuyến hoàn toàn mở và miễn phí 100%).</span>
                </p>
              </div>
            </div>
          </div>

          {/* LÝ DO TỪ CHỐI NẾU CÓ */}
          {status === 'rejected' && profile.rejection_reason && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-[12.5px] text-rose-800">
              <p className="font-bold flex items-center gap-1.5"><AlertCircle size={15} /> Yêu cầu bổ sung từ Quản Trị Viên:</p>
              <p className="mt-1 text-rose-700">{profile.rejection_reason}</p>
            </div>
          )}

          {/* FORM THÔNG TIN ĐẠI DIỆN */}
          <div className="space-y-4">
            <h4 className="text-[13px] font-bold uppercase tracking-wider text-[#354832] flex items-center gap-2">
              <User size={15} className="text-[#4b6a48]" /> 1. Thông Tin Người Đại Diện Tạo Tài Khoản
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                  Họ và tên người đại diện *
                </label>
                <input
                  type="text"
                  value={profile.representative_name}
                  onChange={e => setProfile({ ...profile, representative_name: e.target.value })}
                  placeholder="VD: Nguyễn Minh Mai"
                  className="h-11 w-full rounded-xl border border-[hsl(var(--border))] bg-white px-3.5 text-[13px] font-semibold text-gray-900 outline-none focus:border-[#435d41] focus:ring-1 focus:ring-[#435d41]"
                  data-testid="input-family-rep-name"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                  Số điện thoại liên hệ *
                </label>
                <div className="relative">
                  <Phone size={15} className="absolute left-3.5 top-3.5 text-gray-400" />
                  <input
                    type="text"
                    value={profile.phone}
                    onChange={e => setProfile({ ...profile, phone: e.target.value })}
                    placeholder="VD: 0934 567 890"
                    className="h-11 w-full rounded-xl border border-[hsl(var(--border))] bg-white pl-9 pr-3 text-[13px] font-semibold text-gray-900 outline-none focus:border-[#435d41] focus:ring-1 focus:ring-[#435d41]"
                    data-testid="input-family-phone"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                  Email tài khoản
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-3.5 text-gray-400" />
                  <input
                    type="email"
                    value={profile.email}
                    onChange={e => setProfile({ ...profile, email: e.target.value })}
                    placeholder="VD: mai.nguyen@family.vn"
                    className="h-11 w-full rounded-xl border border-[hsl(var(--border))] bg-white pl-9 pr-3 text-[13px] font-semibold text-gray-900 outline-none focus:border-[#435d41] focus:ring-1 focus:ring-[#435d41]"
                    data-testid="input-family-email"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                  Số CCCD gắn chip (12 số) * <span className="text-amber-600 font-normal lowercase">(cần để đặt ca)</span>
                </label>
                <div className="relative">
                  <CreditCard size={15} className="absolute left-3.5 top-3.5 text-gray-400" />
                  <input
                    type="text"
                    value={profile.id_number}
                    onChange={e => setProfile({ ...profile, id_number: e.target.value.replace(/\D/g, '').slice(0, 12) })}
                    placeholder="VD: 001198000123"
                    className="h-11 w-full rounded-xl border border-[hsl(var(--border))] bg-white pl-9 pr-3 text-[13.5px] font-bold tracking-wider text-[#213523] outline-none focus:border-[#435d41] focus:ring-1 focus:ring-[#435d41]"
                    data-testid="input-family-id-number"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                  Khu vực (Quận / Huyện)
                </label>
                <input
                  type="text"
                  value={profile.district}
                  onChange={e => setProfile({ ...profile, district: e.target.value })}
                  placeholder="VD: Hai Bà Trưng, Hà Nội"
                  className="h-11 w-full rounded-xl border border-[hsl(var(--border))] bg-white px-3.5 text-[13px] font-semibold text-gray-900 outline-none focus:border-[#435d41] focus:ring-1 focus:ring-[#435d41]"
                  data-testid="input-family-district"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                  Địa chỉ thường trú / Nơi ở
                </label>
                <div className="relative">
                  <MapPin size={15} className="absolute left-3.5 top-3.5 text-gray-400" />
                  <input
                    type="text"
                    value={profile.address}
                    onChange={e => setProfile({ ...profile, address: e.target.value })}
                    placeholder="VD: Số 24 phố Huế, Hàng Bài"
                    className="h-11 w-full rounded-xl border border-[hsl(var(--border))] bg-white pl-9 pr-3 text-[13px] font-semibold text-gray-900 outline-none focus:border-[#435d41] focus:ring-1 focus:ring-[#435d41]"
                    data-testid="input-family-address"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* PHẦN TẢI ẢNH CCCD 2 MẶT ĐỂ ADMIN DUYỆT */}
          <div className="space-y-3 pt-2 border-t border-gray-100">
            <h4 className="text-[13px] font-bold uppercase tracking-wider text-[#354832] flex items-center gap-2">
              <CreditCard size={15} className="text-[#4b6a48]" /> 2. Ảnh Chụp Căn Cước Công Dân (Mặt trước & Mặt sau)
            </h4>
            <p className="text-[11.5px] text-[hsl(var(--muted-foreground))]">
              Tải ảnh chụp rõ nét 2 mặt CCCD của người đại diện để Admin đối soát và phê duyệt an toàn.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {/* MẶT TRƯỚC */}
              <div className="rounded-2xl border border-dashed border-[#ccd9ca] bg-[#fafcfa] p-4 text-center">
                <input 
                  type="file" 
                  ref={frontInputRef}
                  accept="image/*" 
                  onChange={e => handleFileUpload(e, 'front')} 
                  className="hidden" 
                  data-testid="input-family-cccd-front"
                />
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[12px] font-bold text-gray-700">Mặt trước CCCD</span>
                  {profile.id_card_front && (
                    <span className="rounded-full bg-[#dbebd7] text-[#3e5f39] px-2 py-0.5 text-[9px] font-bold">
                      Đã nạp ảnh
                    </span>
                  )}
                </div>

                {profile.id_card_front ? (
                  <div className="relative group rounded-xl overflow-hidden border border-gray-200 bg-gray-50 aspect-[16/10] flex items-center justify-center">
                    <img 
                      src={profile.id_card_front} 
                      alt="CCCD Mặt trước" 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 sm:bg-black/50 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-2">
                      <button
                        type="button"
                        onClick={() => setPreviewImage(profile.id_card_front)}
                        className="rounded-lg bg-white/95 px-2.5 py-1.5 text-gray-800 hover:bg-white text-[11px] font-bold flex items-center gap-1 shadow cursor-pointer"
                      >
                        <Eye size={13} /> Xem to
                      </button>
                      <button
                        type="button"
                        onClick={() => frontInputRef.current?.click()}
                        className="rounded-lg bg-white/95 px-2 py-1.5 text-gray-800 hover:bg-white text-[11px] font-bold flex items-center gap-1 shadow cursor-pointer"
                      >
                        Đổi ảnh
                      </button>
                      <button
                        type="button"
                        onClick={() => setProfile({ ...profile, id_card_front: null })}
                        className="rounded-lg bg-rose-600/90 px-2 py-1.5 text-white hover:bg-rose-600 text-[11px] font-bold flex items-center gap-1 shadow cursor-pointer"
                      >
                        <Trash2 size={13} /> Xóa
                      </button>
                    </div>
                  </div>
                ) : (
                  <div 
                    onClick={() => frontInputRef.current?.click()}
                    className="flex flex-col items-center justify-center aspect-[16/10] rounded-xl border border-dashed border-gray-300 bg-white hover:bg-[#f2f8f0] cursor-pointer transition p-3"
                  >
                    <Upload size={22} className="text-[#597855] mb-1.5" />
                    <span className="text-[12px] font-bold text-[#446240]">
                      {uploadingFront ? 'Đang nạp ảnh...' : 'Tải ảnh mặt trước'}
                    </span>
                    <span className="text-[10px] text-gray-400 mt-0.5">JPG, PNG hoặc WebP</span>
                  </div>
                )}
              </div>

              {/* MẶT SAU */}
              <div className="rounded-2xl border border-dashed border-[#ccd9ca] bg-[#fafcfa] p-4 text-center">
                <input 
                  type="file" 
                  ref={backInputRef}
                  accept="image/*" 
                  onChange={e => handleFileUpload(e, 'back')} 
                  className="hidden" 
                  data-testid="input-family-cccd-back"
                />
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[12px] font-bold text-gray-700">Mặt sau CCCD</span>
                  {profile.id_card_back && (
                    <span className="rounded-full bg-[#dbebd7] text-[#3e5f39] px-2 py-0.5 text-[9px] font-bold">
                      Đã nạp ảnh
                    </span>
                  )}
                </div>

                {profile.id_card_back ? (
                  <div className="relative group rounded-xl overflow-hidden border border-gray-200 bg-gray-50 aspect-[16/10] flex items-center justify-center">
                    <img 
                      src={profile.id_card_back} 
                      alt="CCCD Mặt sau" 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 sm:bg-black/50 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-2">
                      <button
                        type="button"
                        onClick={() => setPreviewImage(profile.id_card_back)}
                        className="rounded-lg bg-white/95 px-2.5 py-1.5 text-gray-800 hover:bg-white text-[11px] font-bold flex items-center gap-1 shadow cursor-pointer"
                      >
                        <Eye size={13} /> Xem to
                      </button>
                      <button
                        type="button"
                        onClick={() => backInputRef.current?.click()}
                        className="rounded-lg bg-white/95 px-2 py-1.5 text-gray-800 hover:bg-white text-[11px] font-bold flex items-center gap-1 shadow cursor-pointer"
                      >
                        Đổi ảnh
                      </button>
                      <button
                        type="button"
                        onClick={() => setProfile({ ...profile, id_card_back: null })}
                        className="rounded-lg bg-rose-600/90 px-2 py-1.5 text-white hover:bg-rose-600 text-[11px] font-bold flex items-center gap-1 shadow cursor-pointer"
                      >
                        <Trash2 size={13} /> Xóa
                      </button>
                    </div>
                  </div>
                ) : (
                  <div 
                    onClick={() => backInputRef.current?.click()}
                    className="flex flex-col items-center justify-center aspect-[16/10] rounded-xl border border-dashed border-gray-300 bg-white hover:bg-[#f2f8f0] cursor-pointer transition p-3"
                  >
                    <Upload size={22} className="text-[#597855] mb-1.5" />
                    <span className="text-[12px] font-bold text-[#446240]">
                      {uploadingBack ? 'Đang nạp ảnh...' : 'Tải ảnh mặt sau'}
                    </span>
                    <span className="text-[10px] text-gray-400 mt-0.5">JPG, PNG hoặc WebP</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-gray-200 bg-[#fbfdfa] px-6 py-4">
          <div className="text-[11.5px] text-gray-500">
            {profile.id_number ? (
              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                <CheckCircle2 size={13} /> Đã có số CCCD: {profile.id_number}
              </span>
            ) : (
              <span className="text-amber-700 font-medium flex items-center gap-1">
                <AlertCircle size={13} /> Chưa nhập CCCD (cần nhập để mở khóa tính năng đặt ca)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => handleSave(false)}
              disabled={saving}
              className="flex-1 sm:flex-none rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2.5 text-[12.5px] font-bold transition disabled:opacity-60"
              data-testid="button-save-family-draft"
            >
              {saving ? 'Đang lưu...' : 'Lưu bản nháp'}
            </button>

            <button
              type="button"
              onClick={() => handleSave(true)}
              disabled={saving}
              className="flex-1 sm:flex-none rounded-xl bg-gradient-to-r from-[#3d5a3f] to-[#4c704e] hover:from-[#354f37] hover:to-[#436445] text-white px-5 py-2.5 text-[12.5px] font-bold shadow-md transition disabled:opacity-60 flex items-center justify-center gap-1.5"
              data-testid="button-submit-family-ekyc"
            >
              <ShieldCheck size={16} />
              {saving ? 'Đang gửi...' : 'Gửi Admin xét duyệt eKYC'}
            </button>
          </div>
        </div>

      </div>

      {/* LIGHTBOX XEM ẢNH CCCD PHÓNG TO */}
      {previewImage && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 p-4" onClick={() => setPreviewImage(null)}>
          <div className="relative max-w-3xl max-h-[85vh] rounded-2xl overflow-hidden bg-white p-2">
            <button 
              onClick={() => setPreviewImage(null)}
              className="absolute right-4 top-4 rounded-full bg-black/60 p-2 text-white hover:bg-black"
            >
              <X size={18} />
            </button>
            <img src={previewImage} alt="Ảnh CCCD" className="max-w-full max-h-[80vh] object-contain rounded-xl" />
          </div>
        </div>
      )}
    </div>
  );
}
