import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Mail, 
  KeyRound, 
  Lock, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  ArrowLeft, 
  RefreshCw, 
  Eye, 
  EyeOff, 
  ShieldCheck,
  Sparkles,
  LockKeyhole,
  Check,
  SendHorizontal
} from 'lucide-react';
import { API_BASE_URL } from '@/lib/apiConfig';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEmail?: string;
  onSuccess?: (email: string) => void;
}

type Step = 'EMAIL' | 'OTP_AND_PASSWORD' | 'SUCCESS';

export function ForgotPasswordModal({
  isOpen,
  onClose,
  initialEmail = '',
  onSuccess
}: ForgotPasswordModalProps) {
  const [step, setStep] = useState<Step>('EMAIL');
  const [email, setEmail] = useState('');
  
  // 6 ô OTP riêng biệt
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  // Reset state mỗi khi mở modal
  useEffect(() => {
    if (isOpen) {
      setEmail(initialEmail || '');
      setStep('EMAIL');
      setOtpDigits(['', '', '', '', '', '']);
      setNewPassword('');
      setConfirmPassword('');
      setErrorMsg('');
      setInfoMsg('');
      setDevOtp(null);
      setCountdown(0);
    }
  }, [isOpen, initialEmail]);

  // Đếm ngược 60s cho nút gửi lại mã OTP
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Xử lý phím và nhập số vào ô OTP
  const handleOtpChange = (index: number, value: string) => {
    // Chỉ lấy ký tự số
    const cleanVal = value.replace(/\D/g, '');
    
    // Nếu người dùng dán (paste) cả chuỗi 6 số
    if (cleanVal.length > 1) {
      const pastedDigits = cleanVal.slice(0, 6).split('');
      const newDigits = [...otpDigits];
      pastedDigits.forEach((digit, i) => {
        if (i < 6) newDigits[i] = digit;
      });
      setOtpDigits(newDigits);
      const focusIndex = Math.min(pastedDigits.length, 5);
      otpInputRefs.current[focusIndex]?.focus();
      return;
    }

    const newDigits = [...otpDigits];
    newDigits[index] = cleanVal ? cleanVal[cleanVal.length - 1] : '';
    setOtpDigits(newDigits);

    // Tự động nhảy sang ô kế tiếp
    if (cleanVal && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const getFullOtp = () => otpDigits.join('');

  if (!isOpen) return null;

  // Hàm gọi API với cơ chế tự động thử qua các endpoint (Vite proxy, IPv4, localhost)
  const callAuthApi = async (endpoint: string, payload: any) => {
    const candidateUrls = [
      `/api${endpoint}`,                         // Vite dev proxy (cùng nguồn, tránh lỗi IPv6/CORS trên Windows)
      `${API_BASE_URL}/api${endpoint}`,          // URL cấu hình chính
      `http://127.0.0.1:5000/api${endpoint}`,    // IPv4 trực tiếp
      `http://localhost:5000/api${endpoint}`     // Localhost trực tiếp
    ];

    const uniqueUrls = Array.from(new Set(candidateUrls.filter(Boolean)));
    let lastError: any = null;

    for (const url of uniqueUrls) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        return { ok: res.ok, data };
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError || new Error('Không thể kết nối đến máy chủ.');
  };

  // Bước 1: Yêu cầu gửi mã xác nhận qua email
  const handleRequestOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMsg('Vui lòng nhập địa chỉ email của bạn.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setErrorMsg('Địa chỉ email không đúng định dạng. Ví dụ: user@carematch.vn');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setInfoMsg('');

    try {
      const { ok, data } = await callAuthApi('/auth/forgot-password', { email: cleanEmail });

      if (ok && data.success) {
        setStep('OTP_AND_PASSWORD');
        setCountdown(60);
        if (data.devOtp) {
          setDevOtp(data.devOtp);
        }
        setInfoMsg(data.message || 'Mã xác nhận 6 chữ số đã được gửi đến email của bạn.');
        setTimeout(() => {
          otpInputRefs.current[0]?.focus();
        }, 150);
      } else {
        setErrorMsg(data.message || 'Không tìm thấy tài khoản với email này.');
      }
    } catch {
      setErrorMsg('Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại kết nối mạng hoặc thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  // Gửi lại mã OTP
  const handleResendOtp = async () => {
    if (countdown > 0 || resendLoading) return;
    setResendLoading(true);
    setErrorMsg('');

    try {
      const { ok, data } = await callAuthApi('/auth/forgot-password', { email: email.trim() });
      if (ok && data.success) {
        setCountdown(60);
        setOtpDigits(['', '', '', '', '', '']);
        if (data.devOtp) {
          setDevOtp(data.devOtp);
        }
        setInfoMsg('Đã gửi lại mã OTP mới. Vui lòng kiểm tra hộp thư!');
        otpInputRefs.current[0]?.focus();
      } else {
        setErrorMsg(data.message || 'Không thể gửi lại mã OTP. Vui lòng thử lại.');
      }
    } catch {
      setErrorMsg('Lỗi kết nối khi gửi lại mã OTP.');
    } finally {
      setResendLoading(false);
    }
  };

  // Bước 2: Xác nhận OTP và đặt lại mật khẩu
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const fullOtp = getFullOtp();
    if (fullOtp.length < 6) {
      setErrorMsg('Vui lòng nhập đủ 6 chữ số mã xác nhận OTP.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg('Mật khẩu mới phải có tối thiểu 6 ký tự.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Mật khẩu xác nhận không khớp.');
      return;
    }

    setLoading(true);

    try {
      const { ok, data } = await callAuthApi('/auth/reset-password', {
        email: email.trim(),
        otp: fullOtp,
        newPassword
      });

      if (ok && data.success) {
        setStep('SUCCESS');
      } else {
        setErrorMsg(data.message || 'Mã xác nhận hoặc thông tin không hợp lệ.');
      }
    } catch {
      setErrorMsg('Lỗi kết nối khi đặt lại mật khẩu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  // Đánh giá độ mạnh mật khẩu
  const getPasswordStrength = () => {
    if (!newPassword) return null;
    let score = 0;
    if (newPassword.length >= 6) score++;
    if (newPassword.length >= 8) score++;
    if (/[0-9]/.test(newPassword)) score++;
    if (/[a-zA-Z]/.test(newPassword)) score++;
    if (/[^a-zA-Z0-9]/.test(newPassword)) score++;

    if (score <= 2) return { text: 'Yếu', color: 'bg-red-400', textColor: 'text-red-600', step: 1 };
    if (score <= 3) return { text: 'Trung bình', color: 'bg-amber-400', textColor: 'text-amber-600', step: 2 };
    return { text: 'Mạnh & An toàn', color: 'bg-emerald-500', textColor: 'text-emerald-600', step: 3 };
  };

  const strength = getPasswordStrength();

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#0f1b0a]/50 backdrop-blur-md transition-all duration-300 animate-fadeIn"
      data-testid="modal-forgot-password"
    >
      <div 
        className="relative w-full max-w-[480px] overflow-hidden rounded-[32px] bg-white p-7 sm:p-9 shadow-[0_25px_70px_rgba(15,27,10,0.22)] border border-[#e4ecde] animate-rise"
      >
        {/* Nút đóng góc phải */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-[#f4f7f2] text-gray-500 hover:bg-[#e7eee4] hover:text-gray-800 transition duration-150 cursor-pointer"
          data-testid="button-close-forgot-password"
          aria-label="Đóng"
        >
          <X size={18} />
        </button>

        {/* Glow trang trí phía trên */}
        <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-72 -translate-x-1/2 rounded-full bg-gradient-to-b from-[#a4e078]/25 to-transparent blur-2xl" />

        {/* ======================================================== */}
        {/* HEADER MODAL SANG TRỌNG & ĐỒNG BỘ THƯƠNG HIỆU */}
        {/* ======================================================== */}
        <div className="relative text-center pb-6 border-b border-[#edf3ea]">
          <div className="mx-auto mb-3.5 flex h-14 w-14 items-center justify-center rounded-[20px] bg-gradient-to-br from-[#f2f8ed] via-[#e5f1de] to-[#d8ebd0] text-[#2d5624] shadow-sm border border-[#cbe2c2]">
            {step === 'SUCCESS' ? (
              <CheckCircle2 size={28} className="text-[#3b732e]" />
            ) : step === 'OTP_AND_PASSWORD' ? (
              <KeyRound size={26} className="text-[#335926]" />
            ) : (
              <LockKeyhole size={26} className="text-[#335926]" />
            )}
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#edf5e8] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#356127] border border-[#d2e6c7] mb-2">
            <Sparkles size={12} className="text-[#4e823d]" />
            {step === 'SUCCESS' ? 'Hoàn tất' : 'Khôi phục tài khoản CareMatch'}
          </div>

          <h3 className="font-display text-[24px] sm:text-[26px] font-bold text-[#1b2b16] tracking-tight leading-tight">
            {step === 'SUCCESS'
              ? 'Đổi mật khẩu thành công!'
              : step === 'OTP_AND_PASSWORD'
              ? 'Xác thực OTP & Mật khẩu mới'
              : 'Quên mật khẩu?'}
          </h3>

          <p className="mt-1.5 text-[13px] leading-relaxed text-[#5c6e57] max-w-[380px] mx-auto">
            {step === 'SUCCESS'
              ? 'Mật khẩu của bạn đã được cập nhật an toàn vào hệ thống.'
              : step === 'OTP_AND_PASSWORD'
              ? `Nhập mã 6 chữ số vừa gửi đến email ${email} và đặt mật khẩu mới.`
              : 'Nhập email tài khoản đã đăng ký để nhận mã bảo mật xác minh danh tính.'}
          </p>

          {/* Stepper Progress nhỏ gọn */}
          {step !== 'SUCCESS' && (
            <div className="mt-5 flex items-center justify-center gap-3 text-[11.5px] font-semibold">
              <div className={`flex items-center gap-1.5 ${step === 'EMAIL' ? 'text-[#2e5223] font-bold' : 'text-gray-400'}`}>
                <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10.5px] ${step === 'EMAIL' ? 'bg-[#375f2b] text-white shadow-xs' : 'bg-gray-100 text-gray-500'}`}>
                  1
                </span>
                <span>Nhập Email</span>
              </div>

              <div className="h-0.5 w-6 rounded-full bg-gray-200" />

              <div className={`flex items-center gap-1.5 ${step === 'OTP_AND_PASSWORD' ? 'text-[#2e5223] font-bold' : 'text-gray-400'}`}>
                <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10.5px] ${step === 'OTP_AND_PASSWORD' ? 'bg-[#375f2b] text-white shadow-xs' : 'bg-gray-100 text-gray-500'}`}>
                  2
                </span>
                <span>Mã OTP & Mật khẩu</span>
              </div>
            </div>
          )}
        </div>

        {/* ======================================================== */}
        {/* NỘI DUNG FORM */}
        {/* ======================================================== */}
        <div className="pt-6">
          {/* Thông báo lỗi */}
          {errorMsg && (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50/90 p-3.5 text-[12.5px] text-red-700 flex items-start gap-2.5 animate-rise shadow-xs">
              <AlertCircle size={16} className="shrink-0 text-red-600 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">{errorMsg}</div>
            </div>
          )}

          {/* ======================================================== */}
          {/* BƯỚC 1: NHẬP EMAIL */}
          {/* ======================================================== */}
          {step === 'EMAIL' && (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <label className="block mb-2 text-[12px] font-bold uppercase tracking-wider text-[#3c5036]">
                  Địa chỉ Email tài khoản
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                    <Mail size={18} />
                  </div>
                  <input
                    type="email"
                    required
                    autoFocus
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="example@carematch.vn"
                    className="h-12 w-full rounded-2xl border border-[#d6dfd3] bg-[#fafcf9] pl-11 pr-4 text-[14px] text-[#1c2918] placeholder:text-gray-400 outline-none transition-all duration-200 focus:border-[#385e2c] focus:bg-white focus:ring-4 focus:ring-[#385e2c]/10 shadow-xs"
                    data-testid="input-forgot-email"
                  />
                </div>
              </div>

              {/* Hộp ghi chú bảo mật */}
              <div className="rounded-2xl bg-[#f5f9f2] border border-[#d8e8d3] p-3.5 text-[12.5px] text-[#335627] flex items-start gap-3">
                <ShieldCheck size={18} className="text-[#45793a] shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Mã OTP bảo mật có hiệu lực trong <strong>10 phút</strong>. Áp dụng cho cả tài khoản <em>Gia đình</em> và <em>Người chăm sóc</em>.
                </p>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="h-12 px-5 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 text-[13px] font-bold text-gray-600 transition cursor-pointer"
                >
                  Quay lại
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex flex-1 h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#243818] via-[#314f21] to-[#243818] hover:from-[#2c451d] hover:to-[#2c451d] text-white px-5 text-[13.5px] font-bold shadow-lg shadow-[#243818]/15 hover:shadow-xl hover:shadow-[#243818]/25 transition-all duration-200 cursor-pointer disabled:opacity-50"
                  data-testid="button-send-otp"
                >
                  {loading ? (
                    <>Đang gửi mã xác nhận...</>
                  ) : (
                    <>
                      Gửi mã qua Email <SendHorizontal size={16} />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* ======================================================== */}
          {/* BƯỚC 2: NHẬP 6 Ô OTP & ĐẶT MẬT KHẨU MỚI */}
          {/* ======================================================== */}
          {step === 'OTP_AND_PASSWORD' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              {/* Badge thông báo gửi tới email */}
              <div className="flex items-center justify-between rounded-2xl bg-[#f0f6ed] border border-[#d4e6cc] px-4 py-2.5 text-[12px] text-[#2c4e23]">
                <div className="flex items-center gap-2 truncate">
                  <Mail size={15} className="text-[#3c6b32] shrink-0" />
                  <span className="truncate">
                    Gửi đến: <strong className="text-[#1c3615]">{email}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setStep('EMAIL');
                    setErrorMsg('');
                    setInfoMsg('');
                  }}
                  className="shrink-0 text-[11.5px] font-bold text-[#356127] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft size={12} /> Đổi email
                </button>
              </div>

              {/* Dev OTP nếu chưa có SMTP */}
              {devOtp && (
                <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3 text-[12px] text-amber-900 animate-rise shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1.5">
                      <Sparkles size={14} className="text-amber-600" /> Mã thử nghiệm (Local / Dev):
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const digits = devOtp.split('').slice(0, 6);
                        setOtpDigits(digits);
                      }}
                      className="rounded-lg bg-amber-200/80 px-2 py-0.5 text-[10.5px] font-bold text-amber-900 hover:bg-amber-300 transition cursor-pointer"
                    >
                      Điền tự động
                    </button>
                  </div>
                  <div className="mt-1 font-mono text-[16px] font-bold tracking-widest text-amber-800">
                    {devOtp}
                  </div>
                </div>
              )}

              {/* 6 Ô NHẬP MÃ OTP RỜI HIỆN ĐẠI (FINTECH / APPLE STYLE) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[12px] font-bold uppercase tracking-wider text-[#3c5036]">
                    Mã xác nhận 6 số
                  </span>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={countdown > 0 || resendLoading}
                    className="text-[11.5px] font-semibold text-[#356127] hover:underline disabled:opacity-50 disabled:no-underline flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw size={11} className={resendLoading ? 'animate-spin' : ''} />
                    {countdown > 0 ? `Gửi lại sau (${countdown}s)` : 'Gửi lại mã OTP'}
                  </button>
                </div>

                <div className="flex items-center justify-between gap-2">
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={el => (otpInputRefs.current[idx] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={e => handleOtpChange(idx, e.target.value)}
                      onKeyDown={e => handleOtpKeyDown(idx, e)}
                      className={`h-13 w-11 sm:h-14 sm:w-13 rounded-2xl border-2 text-center font-mono text-[22px] font-bold outline-none transition-all duration-200 ${
                        digit
                          ? 'border-[#385e2c] bg-white text-[#1b2f15] shadow-xs'
                          : 'border-gray-200 bg-[#fafcf9] text-gray-800 focus:border-[#385e2c] focus:bg-white focus:ring-4 focus:ring-[#385e2c]/10'
                      }`}
                      data-testid={`input-otp-${idx}`}
                    />
                  ))}
                </div>
              </div>

              {/* Mật khẩu mới */}
              <div>
                <label className="block mb-1.5 text-[12px] font-bold uppercase tracking-wider text-[#3c5036]">
                  Mật khẩu mới
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                    <Lock size={16} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Tối thiểu 6 ký tự"
                    className="h-12 w-full rounded-2xl border border-[#d6dfd3] bg-[#fafcf9] pl-10 pr-11 text-[13.5px] text-[#1c2918] outline-none transition-all focus:border-[#385e2c] focus:bg-white focus:ring-4 focus:ring-[#385e2c]/10 shadow-xs"
                    data-testid="input-forgot-new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>

                {/* Thanh độ mạnh mật khẩu */}
                {strength && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="grid grid-cols-3 gap-1.5 flex-1">
                      <div className={`h-1.5 rounded-full transition-all ${strength.step >= 1 ? strength.color : 'bg-gray-100'}`} />
                      <div className={`h-1.5 rounded-full transition-all ${strength.step >= 2 ? strength.color : 'bg-gray-100'}`} />
                      <div className={`h-1.5 rounded-full transition-all ${strength.step >= 3 ? strength.color : 'bg-gray-100'}`} />
                    </div>
                    <span className={`text-[11px] font-bold ${strength.textColor}`}>
                      {strength.text}
                    </span>
                  </div>
                )}
              </div>

              {/* Xác nhận mật khẩu mới */}
              <div>
                <label className="block mb-1.5 text-[12px] font-bold uppercase tracking-wider text-[#3c5036]">
                  Xác nhận lại mật khẩu
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                    <Lock size={16} />
                  </div>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu mới"
                    className="h-12 w-full rounded-2xl border border-[#d6dfd3] bg-[#fafcf9] pl-10 pr-11 text-[13.5px] text-[#1c2918] outline-none transition-all focus:border-[#385e2c] focus:bg-white focus:ring-4 focus:ring-[#385e2c]/10 shadow-xs"
                    data-testid="input-forgot-confirm-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
                {confirmPassword && (
                  <p className={`mt-1.5 text-[11.5px] font-medium flex items-center gap-1 ${
                    newPassword === confirmPassword ? 'text-emerald-600' : 'text-red-500'
                  }`}>
                    {newPassword === confirmPassword ? (
                      <><Check size={14} /> Mật khẩu khớp</>
                    ) : (
                      'Mật khẩu xác nhận chưa khớp.'
                    )}
                  </p>
                )}
              </div>

              {/* Nút hành động */}
              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setStep('EMAIL')}
                  className="h-12 px-5 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 text-[13px] font-bold text-gray-600 transition cursor-pointer"
                >
                  Quay lại
                </button>

                <button
                  type="submit"
                  disabled={loading || getFullOtp().length < 6 || newPassword.length < 6 || newPassword !== confirmPassword}
                  className="flex flex-1 h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#243818] via-[#314f21] to-[#243818] hover:from-[#2c451d] hover:to-[#2c451d] text-white px-5 text-[13.5px] font-bold shadow-lg shadow-[#243818]/15 hover:shadow-xl hover:shadow-[#243818]/25 transition-all duration-200 cursor-pointer disabled:opacity-50"
                  data-testid="button-confirm-reset-password"
                >
                  {loading ? 'Đang cập nhật...' : 'Xác nhận & Cập nhật mật khẩu'}
                </button>
              </div>
            </form>
          )}

          {/* ======================================================== */}
          {/* BƯỚC 3: THÀNH CÔNG */}
          {/* ======================================================== */}
          {step === 'SUCCESS' && (
            <div className="py-2 text-center space-y-4">
              <div className="mx-auto flex h-18 w-18 items-center justify-center rounded-full bg-gradient-to-br from-emerald-100 to-emerald-50 text-emerald-600 shadow-inner border border-emerald-200 animate-bounce">
                <CheckCircle2 size={40} className="text-emerald-600" />
              </div>

              <div className="space-y-1.5">
                <h4 className="font-display text-[20px] font-bold text-gray-900">
                  Cập nhật thành công!
                </h4>
                <p className="text-[13px] leading-relaxed text-gray-600 max-w-sm mx-auto">
                  Tài khoản <strong className="text-gray-900">{email}</strong> đã được đổi mật khẩu thành công. Bây giờ bạn có thể đăng nhập ngay với mật khẩu mới.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (onSuccess) onSuccess(email);
                    onClose();
                  }}
                  className="w-full h-12 rounded-2xl bg-gradient-to-r from-[#243818] via-[#314f21] to-[#243818] hover:from-[#2c451d] hover:to-[#2c451d] text-white px-5 text-[14px] font-bold shadow-lg shadow-[#243818]/20 transition-all cursor-pointer"
                  data-testid="button-login-after-reset"
                >
                  Đăng nhập ngay với mật khẩu mới
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
