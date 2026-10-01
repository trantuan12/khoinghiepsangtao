import React, { useState, useEffect } from 'react';
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
  Info
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
  const [otp, setOtp] = useState('');
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

  // Khởi tạo giá trị email khi mở modal
  useEffect(() => {
    if (isOpen) {
      setEmail(initialEmail || '');
      setStep('EMAIL');
      setOtp('');
      setNewPassword('');
      setConfirmPassword('');
      setErrorMsg('');
      setInfoMsg('');
      setDevOtp(null);
      setCountdown(0);
    }
  }, [isOpen, initialEmail]);

  // Bộ đếm thời gian cho nút Gửi lại mã OTP
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  if (!isOpen) return null;

  // Bước 1: Yêu cầu gửi mã OTP qua email
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
      const res = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setStep('OTP_AND_PASSWORD');
        setCountdown(60);
        if (data.devOtp) {
          setDevOtp(data.devOtp);
        }
        setInfoMsg(data.message || 'Mã xác nhận đã được gửi đến email của bạn.');
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
      const res = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setCountdown(60);
        if (data.devOtp) {
          setDevOtp(data.devOtp);
        }
        setInfoMsg('Đã gửi lại mã OTP mới. Vui lòng kiểm tra hộp thư!');
      } else {
        setErrorMsg(data.message || 'Không thể gửi lại mã OTP. Vui lòng thử lại.');
      }
    } catch {
      setErrorMsg('Lỗi kết nối khi gửi lại mã OTP.');
    } finally {
      setResendLoading(false);
    }
  };

  // Bước 2: Xác thực OTP & Đổi mật khẩu
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanOtp = otp.trim();
    if (!cleanOtp) {
      setErrorMsg('Vui lòng nhập mã OTP gồm 6 chữ số.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg('Mật khẩu mới phải có tối thiểu 6 ký tự.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Mật khẩu xác nhận không khớp với mật khẩu mới.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          otp: cleanOtp,
          newPassword
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
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

  // Tính độ mạnh mật khẩu
  const getPasswordStrength = () => {
    if (!newPassword) return null;
    let score = 0;
    if (newPassword.length >= 6) score++;
    if (newPassword.length >= 8) score++;
    if (/[0-9]/.test(newPassword)) score++;
    if (/[a-zA-Z]/.test(newPassword)) score++;
    if (/[^a-zA-Z0-9]/.test(newPassword)) score++;

    if (score <= 2) return { text: 'Yếu', color: 'bg-red-400', textColor: 'text-red-600', percent: '33%' };
    if (score <= 3) return { text: 'Trung bình', color: 'bg-amber-400', textColor: 'text-amber-600', percent: '66%' };
    return { text: 'Mạnh & An toàn', color: 'bg-emerald-500', textColor: 'text-emerald-600', percent: '100%' };
  };

  const strength = getPasswordStrength();

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-xs animate-fadeIn"
      data-testid="modal-forgot-password"
    >
      <div className="relative w-full max-w-[460px] overflow-hidden rounded-[26px] bg-white shadow-2xl border border-[hsl(var(--border))] animate-rise">
        {/* Nút đóng */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
          data-testid="button-close-forgot-password"
          aria-label="Đóng"
        >
          <X size={18} />
        </button>

        {/* Header thương hiệu */}
        <div className="bg-gradient-to-r from-[#243818] via-[#2f4d1f] to-[#3a5d27] px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-[#a4e078] backdrop-blur-md border border-white/20 shadow-xs">
              {step === 'SUCCESS' ? (
                <ShieldCheck size={22} className="text-[#a4e078]" />
              ) : step === 'OTP_AND_PASSWORD' ? (
                <KeyRound size={22} />
              ) : (
                <Mail size={22} />
              )}
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#d2e8cb]">
                {step === 'SUCCESS' ? 'Hoàn tất' : 'Khôi phục tài khoản'}
              </span>
              <h3 className="font-display text-[18px] font-bold leading-tight text-white">
                {step === 'SUCCESS'
                  ? 'Mật khẩu đã được cập nhật'
                  : step === 'OTP_AND_PASSWORD'
                  ? 'Xác thực OTP & Đổi mật khẩu'
                  : 'Quên mật khẩu?'}
              </h3>
            </div>
          </div>

          {/* Stepper tabs */}
          {step !== 'SUCCESS' && (
            <div className="mt-4 flex items-center gap-2 pt-2 border-t border-white/10 text-[11.5px]">
              <span className={`inline-flex items-center gap-1.5 font-bold ${step === 'EMAIL' ? 'text-[#a4e078]' : 'text-white/60'}`}>
                <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${step === 'EMAIL' ? 'bg-[#a4e078] text-[#243818]' : 'bg-white/20 text-white'}`}>1</span>
                Nhập Email
              </span>
              <span className="text-white/30">→</span>
              <span className={`inline-flex items-center gap-1.5 font-bold ${step === 'OTP_AND_PASSWORD' ? 'text-[#a4e078]' : 'text-white/60'}`}>
                <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${step === 'OTP_AND_PASSWORD' ? 'bg-[#a4e078] text-[#243818]' : 'bg-white/20 text-white'}`}>2</span>
                Mã OTP & Mật khẩu mới
              </span>
            </div>
          )}
        </div>

        {/* Nội dung bên trong Modal */}
        <div className="p-6">
          {/* Thông báo lỗi */}
          {errorMsg && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-[12.5px] text-red-700 flex items-start gap-2.5 animate-rise">
              <AlertCircle size={16} className="shrink-0 text-red-600 mt-0.5" />
              <div className="flex-1">{errorMsg}</div>
            </div>
          )}

          {/* ======================================================== */}
          {/* BƯỚC 1: NHẬP EMAIL */}
          {/* ======================================================== */}
          {step === 'EMAIL' && (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <p className="text-[13px] leading-relaxed text-gray-600">
                Vui lòng nhập địa chỉ email đã đăng ký tại <strong>CareMatch</strong>. Chúng tôi sẽ gửi một mã xác nhận 6 chữ số (OTP) đến hộp thư của bạn.
              </p>

              <label className="block">
                <span className="mb-1.5 block text-[11.5px] font-bold text-gray-700">
                  Địa chỉ Email tài khoản
                </span>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    required
                    autoFocus
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="example@carematch.vn"
                    className="h-11 w-full rounded-[13px] border border-gray-300 bg-gray-50/50 pl-10 pr-3.5 text-[13.5px] outline-none transition focus:border-[hsl(var(--primary))] focus:bg-white focus:ring-4 focus:ring-[hsl(var(--primary)/.10)]"
                    data-testid="input-forgot-email"
                  />
                </div>
              </label>

              <div className="rounded-xl bg-[#f6f9f5] border border-[#d8e8d5] p-3 text-[12px] text-[#2c4e24] flex items-start gap-2.5">
                <Info size={16} className="text-[#45793a] shrink-0 mt-0.5" />
                <p>
                  Mã OTP sẽ có hiệu lực trong vòng <strong>10 phút</strong>. Bạn có thể sử dụng email này cho cả tài khoản <em>Gia đình</em> hoặc <em>Người chăm sóc</em>.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-[12.5px] font-semibold text-gray-700 hover:bg-gray-50 transition"
                >
                  Hủy bỏ
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/.9)] text-white px-5 py-2.5 text-[13px] font-bold shadow-md shadow-[hsl(var(--primary)/.20)] transition disabled:opacity-50"
                  data-testid="button-send-otp"
                >
                  {loading ? (
                    <>Đang gửi mã...</>
                  ) : (
                    <>
                      Gửi mã xác nhận qua Email <ArrowRight size={15} />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* ======================================================== */}
          {/* BƯỚC 2: NHẬP OTP & ĐẶT LẠI MẬT KHẨU */}
          {/* ======================================================== */}
          {step === 'OTP_AND_PASSWORD' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              {/* Badge thông tin email đã gửi */}
              <div className="flex items-center justify-between rounded-xl bg-emerald-50/70 border border-emerald-200/80 px-3.5 py-2.5 text-[12px] text-emerald-800">
                <div className="flex items-center gap-2 truncate">
                  <Mail size={15} className="text-emerald-600 shrink-0" />
                  <span className="truncate">
                    Gửi tới: <strong>{email}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setStep('EMAIL');
                    setErrorMsg('');
                    setInfoMsg('');
                  }}
                  className="shrink-0 text-[11px] font-bold text-emerald-700 hover:underline flex items-center gap-1"
                >
                  <ArrowLeft size={12} /> Đổi email
                </button>
              </div>

              {/* Thông báo hướng dẫn hoặc dev OTP banner */}
              {devOtp && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-[12px] text-amber-900 animate-rise">
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1.5">
                      <Sparkles size={14} className="text-amber-600" /> Mã thử nghiệm (Local / Chưa SMTP):
                    </span>
                    <button
                      type="button"
                      onClick={() => setOtp(devOtp)}
                      className="rounded bg-amber-200/80 px-2 py-0.5 text-[10.5px] font-bold text-amber-900 hover:bg-amber-300 transition"
                    >
                      Điền tự động
                    </button>
                  </div>
                  <div className="mt-1 font-mono text-[16px] font-bold tracking-widest text-amber-800">
                    {devOtp}
                  </div>
                </div>
              )}

              {infoMsg && !devOtp && (
                <div className="rounded-xl bg-blue-50 border border-blue-200 p-2.5 text-[12px] text-blue-700 flex items-center gap-2">
                  <Info size={14} className="shrink-0 text-blue-500" />
                  <span>{infoMsg}</span>
                </div>
              )}

              {/* Ô nhập mã OTP */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11.5px] font-bold text-gray-700">
                    Mã xác nhận (OTP 6 số)
                  </span>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={countdown > 0 || resendLoading}
                    className="text-[11px] font-semibold text-[hsl(var(--primary))] hover:underline disabled:opacity-50 disabled:no-underline flex items-center gap-1"
                  >
                    <RefreshCw size={11} className={resendLoading ? 'animate-spin' : ''} />
                    {countdown > 0 ? `Gửi lại sau (${countdown}s)` : 'Gửi lại mã'}
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    required
                    maxLength={6}
                    autoFocus
                    value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="••••••"
                    className="h-12 w-full rounded-[13px] border border-gray-300 bg-gray-50/50 text-center font-mono text-[20px] font-bold tracking-[0.4em] text-gray-900 outline-none transition focus:border-[hsl(var(--primary))] focus:bg-white focus:ring-4 focus:ring-[hsl(var(--primary)/.10)]"
                    data-testid="input-forgot-otp"
                  />
                </div>
              </div>

              {/* Ô nhập mật khẩu mới */}
              <div>
                <span className="mb-1.5 block text-[11.5px] font-bold text-gray-700">
                  Mật khẩu mới
                </span>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Tối thiểu 6 ký tự"
                    className="h-11 w-full rounded-[13px] border border-gray-300 bg-gray-50/50 pl-10 pr-10 text-[13px] outline-none transition focus:border-[hsl(var(--primary))] focus:bg-white focus:ring-4 focus:ring-[hsl(var(--primary)/.10)]"
                    data-testid="input-forgot-new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {/* Thanh đánh giá độ mạnh mật khẩu */}
                {strength && (
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="h-1.5 flex-1 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className={`h-full ${strength.color} transition-all duration-300`}
                        style={{ width: strength.percent }}
                      />
                    </div>
                    <span className={`text-[11px] font-medium ${strength.textColor}`}>
                      {strength.text}
                    </span>
                  </div>
                )}
              </div>

              {/* Ô xác nhận mật khẩu mới */}
              <div>
                <span className="mb-1.5 block text-[11.5px] font-bold text-gray-700">
                  Xác nhận lại mật khẩu mới
                </span>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu mới"
                    className="h-11 w-full rounded-[13px] border border-gray-300 bg-gray-50/50 pl-10 pr-10 text-[13px] outline-none transition focus:border-[hsl(var(--primary))] focus:bg-white focus:ring-4 focus:ring-[hsl(var(--primary)/.10)]"
                    data-testid="input-forgot-confirm-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="mt-1 text-[11px] text-red-500 font-medium">Mật khẩu xác nhận chưa khớp.</p>
                )}
              </div>

              {/* Nút thao tác */}
              <div className="pt-2 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setStep('EMAIL')}
                  className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-[12.5px] font-semibold text-gray-700 hover:bg-gray-50 transition"
                >
                  Quay lại
                </button>

                <button
                  type="submit"
                  disabled={loading || !otp.trim() || newPassword.length < 6 || newPassword !== confirmPassword}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/.9)] text-white px-5 py-2.5 text-[13px] font-bold shadow-md shadow-[hsl(var(--primary)/.20)] transition disabled:opacity-50"
                  data-testid="button-confirm-reset-password"
                >
                  {loading ? 'Đang cập nhật...' : 'Xác nhận & Đổi mật khẩu'}
                </button>
              </div>
            </form>
          )}

          {/* ======================================================== */}
          {/* BƯỚC 3: THÀNH CÔNG */}
          {/* ======================================================== */}
          {step === 'SUCCESS' && (
            <div className="py-3 text-center space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-inner animate-bounce">
                <CheckCircle2 size={36} />
              </div>

              <div className="space-y-1.5">
                <h4 className="font-display text-[19px] font-bold text-gray-900">
                  Đặt lại mật khẩu thành công!
                </h4>
                <p className="text-[13px] leading-relaxed text-gray-600 max-w-sm mx-auto">
                  Mật khẩu tài khoản <strong className="text-gray-900">{email}</strong> đã được cập nhật thành công. Bạn có thể sử dụng mật khẩu mới để đăng nhập ngay bây giờ.
                </p>
              </div>

              <div className="pt-3">
                <button
                  type="button"
                  onClick={() => {
                    if (onSuccess) onSuccess(email);
                    onClose();
                  }}
                  className="w-full rounded-xl bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/.9)] text-white px-5 py-3 text-[14px] font-bold shadow-lg shadow-[hsl(var(--primary)/.25)] transition"
                  data-testid="button-login-after-reset"
                >
                  Đăng nhập ngay
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
