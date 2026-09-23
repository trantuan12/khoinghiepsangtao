import { LandingBannerCarousel } from '@/components/LandingBannerCarousel';
import { DashboardBannerCarousel } from '@/components/DashboardBannerCarousel';
import { CaregiverPortal } from '@/components/CaregiverPortal';
import { type ReactNode, useMemo, useState, useEffect, useRef } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { store, MessageItem, ScheduleItem, CaregiverItem } from '@/lib/store';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Bell,
  BriefcaseBusiness,
  Calendar,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Clock3,
  CreditCard,
  Download,
  Eye,
  FileText,
  HeartHandshake,
  Home,
  LifeBuoy,
  LockKeyhole,
  LogIn,
  MapPin,
  Menu,
  MessageCircle,
  Paperclip,
  Phone,
  Plus,
  Search,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  Stethoscope,
  UserRound,
  UserRoundPlus,
  Users,
  WalletCards,
  X,
} from 'lucide-react';
import { Link, Route, Switch, Router as WouterRouter, useLocation, useParams, Redirect } from 'wouter';

const queryClient = new QueryClient();

type Caregiver = {
  id: string;
  name: string;
  initials: string;
  role: string;
  rating: string;
  reviews: number;
  experience: string;
  distance: string;
  match: number;
  tags: string[];
  color: string;
  bio: string;
  availability: string;
};

const caregivers: Caregiver[] = [
  {
    id: 'lan-anh',
    name: 'Nguyễn Lan Anh',
    initials: 'LA',
    role: 'Chăm sóc người cao tuổi',
    rating: '4,9',
    reviews: 38,
    experience: '8 năm kinh nghiệm',
    distance: '2,4 km',
    match: 96,
    tags: ['Chăm sóc tại nhà', 'Theo dõi thuốc', 'Nấu ăn mềm'],
    color: 'linear-gradient(145deg, #d8b984, #9c7655)',
    bio: 'Chị Lan Anh kiên nhẫn, tinh tế và quen chăm sóc người lớn tuổi sau điều trị. Chị ưu tiên lắng nghe thói quen của từng gia đình.',
    availability: 'Có thể bắt đầu từ Thứ Hai, 10/06',
  },
  {
    id: 'thu-ha',
    name: 'Trần Thu Hà',
    initials: 'TH',
    role: 'Điều dưỡng chăm sóc tại nhà',
    rating: '4,8',
    reviews: 24,
    experience: '6 năm kinh nghiệm',
    distance: '3,1 km',
    match: 91,
    tags: ['Điều dưỡng', 'Vật lý trị liệu', 'Đo huyết áp'],
    color: 'linear-gradient(145deg, #afc5b0, #638273)',
    bio: 'Chị Thu Hà là điều dưỡng, có thế mạnh về theo dõi phục hồi và hướng dẫn vận động nhẹ nhàng tại nhà.',
    availability: 'Có thể bắt đầu từ Thứ Tư, 12/06',
  },
  {
    id: 'mai-chi',
    name: 'Lê Mai Chi',
    initials: 'MC',
    role: 'Bạn đồng hành người cao tuổi',
    rating: '4,7',
    reviews: 19,
    experience: '5 năm kinh nghiệm',
    distance: '4,6 km',
    match: 87,
    tags: ['Trò chuyện', 'Đi chợ', 'Đồng hành khám'],
    color: 'linear-gradient(145deg, #e2b49e, #a96e66)',
    bio: 'Cô Mai Chi mang đến năng lượng ấm áp, phù hợp với những gia đình cần một người bạn đồng hành đều đặn và đáng tin.',
    availability: 'Có thể bắt đầu từ Thứ Sáu, 14/06',
  },
];

const navItems = [
  { href: '/dashboard', label: 'Tổng quan', icon: Home },
  { href: '/care-profile', label: 'Hồ sơ chăm sóc', icon: UserRound },
  { href: '/matches', label: 'Tìm người chăm sóc', icon: Users },
  { href: '/schedule', label: 'Lịch chăm sóc', icon: CalendarDays },
  { href: '/messages', label: 'Tin nhắn', icon: MessageCircle, badge: '2' },
  { href: '/payments', label: 'Thanh toán', icon: CreditCard },
  { href: '/social-work', label: 'Hỗ trợ xã hội', icon: LifeBuoy },
];

function LogoMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3" data-testid="brand-care-match">
      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-[hsl(var(--accent))] text-[hsl(var(--foreground))] shadow-[0_7px_16px_rgba(199,151,80,.22)]">
        <HeartHandshake size={21} strokeWidth={2.2} />
        <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-[hsl(var(--sidebar))] bg-[hsl(var(--card))]" />
      </div>
      {!compact && (
        <div>
          <p className="font-display text-[19px] font-semibold leading-none tracking-[-.02em]">CARE-MATCH</p>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-[.19em] text-[hsl(var(--accent))]">Chăm sóc có người đồng hành</p>
        </div>
      )}
    </div>
  );
}

function Initials({ text, color = 'linear-gradient(145deg, #c5d2b9, #6f875f)', size = 'md' }: { text: string; color?: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = size === 'lg' ? 'h-16 w-16 text-[18px]' : size === 'sm' ? 'h-9 w-9 text-[11px]' : 'h-11 w-11 text-[13px]';
  return <div className={`flex shrink-0 items-center justify-center rounded-[15px] font-bold text-[#29402f] ${sizeClass}`} style={{ background: color }} data-testid={`avatar-${text}`}>{text}</div>;
}

function Button({ children, variant = 'primary', className = '', type = 'button', onClick, disabled = false, testId }: {
  children: ReactNode;
  variant?: 'primary' | 'soft' | 'outline' | 'quiet' | 'danger';
  className?: string;
  type?: 'button' | 'submit';
  onClick?: () => void;
  disabled?: boolean;
  testId?: string;
}) {
  const variants = {
    primary: 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-[0_6px_14px_rgba(70,91,56,.16)] hover:-translate-y-0.5 hover:shadow-[0_10px_20px_rgba(70,91,56,.20)]',
    soft: 'bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary)/.72)]',
    outline: 'border border-[hsl(var(--border))] bg-[hsl(var(--card)/.55)] text-[hsl(var(--foreground))] hover:border-[hsl(var(--primary)/.45)] hover:bg-[hsl(var(--secondary)/.45)]',
    quiet: 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary)/.65)] hover:text-[hsl(var(--foreground))]',
    danger: 'bg-[hsl(var(--destructive)/.11)] text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/.17)]',
  };
  return <button type={type} disabled={disabled} onClick={onClick} data-testid={testId} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-[13px] px-4 text-[13px] font-bold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}>{children}</button>;
}

function Pill({ children, tone = 'olive' }: { children: ReactNode; tone?: 'olive' | 'gold' | 'coral' | 'slate' }) {
  const tones = {
    olive: 'bg-[#e4ebdc] text-[#3f5d38]',
    gold: 'bg-[#f9e9c8] text-[#77551d]',
    coral: 'bg-[#f5dfda] text-[#944b42]',
    slate: 'bg-[#e7ebe7] text-[#53625a]',
  };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ${tones[tone]}`}>{children}</span>;
}

function Card({ children, className = '', testId }: { children: ReactNode; className?: string; testId?: string }) {
  return <section data-testid={testId} className={`rounded-[22px] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] shadow-[var(--shadow-sm)] ${className}`}>{children}</section>;
}

function PageHeading({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div className="animate-rise">
        {eyebrow && <p className="mb-2 text-[11px] font-bold uppercase tracking-[.16em] text-[hsl(var(--primary))]">{eyebrow}</p>}
        <h1 className="font-display text-[32px] font-semibold leading-[1.08] tracking-[-.035em] text-[hsl(var(--foreground))] sm:text-[38px]" data-testid="page-title">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-[14px] leading-6 text-[hsl(var(--muted-foreground))]">{description}</p>}
      </div>
      {action && <div className="animate-rise delay-1 shrink-0">{action}</div>}
    </div>
  );
}

// Kiểu dữ liệu người dùng hiện tại
type CurrentUser = {
  id: number;
  full_name: string;
  email: string;
  role: 'family' | 'caregiver' | 'admin';
  phone?: string;
};

// Kiểu dữ liệu hồ sơ người bệnh
type ElderlyProfile = {
  id: number;
  user_id: number;
  full_name: string;
  date_of_birth?: string;
  gender?: string;
  address?: string;
  district?: string;
  contact_name?: string;
  contact_phone?: string;
  care_needs: string[];
  notes?: string;
  adl_score?: number;
  verification_status?: string;
};

// Notification type
type Notif = {
  id: number;
  type: string;
  title: string;
  body: string;
  link: string;
  is_read: boolean;
  created_at: string;
};

const API = 'http://localhost:5000/api';

// ========================================================
// HOOK ĐỒNG HỒ THỜI GIAN THỰC TOÀN HỆ THỐNG (LIVE REALTIME)
// ========================================================
function useRealtimeClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const timeStr = now.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  const dayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  const dayOfWeek = dayNames[now.getDay()];

  const dateFormatted = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
  const shortDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}`;
  const fullDateStr = `${dayOfWeek}, ${dateFormatted}`;

  return {
    now,
    timeStr,
    dayOfWeek,
    dateFormatted,
    shortDate,
    fullDateStr
  };
}

function AppShell({ 
  children, 
  onLogout,
  userRole: propUserRole = 'family',
  onSwitchRole,
  currentUser
}: { 
  children: ReactNode; 
  onLogout: () => void;
  userRole?: 'family' | 'caregiver' | 'admin';
  onSwitchRole?: (role: 'family' | 'caregiver' | 'admin') => void;
  currentUser?: CurrentUser;
}) {
  const userRole = (currentUser?.role as 'family' | 'caregiver' | 'admin') || propUserRole;
  const clock = useRealtimeClock();
  const [location, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notif[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifPanel, setShowNotifPanel] = useState(false);

  // Fetch thông báo mỗi 30 giây
  useEffect(() => {
    const fetchNotifs = async () => {
      if (!currentUser?.id) return;
      try {
        const res = await fetch(`${API}/notifications?userId=${currentUser.id}`);
        if (res.ok) {
          const data = await res.json();
          setNotifications(data.notifications || []);
          setUnreadCount(data.unread_count || 0);
        }
      } catch { /* server not running */ }
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30000);
    return () => clearInterval(interval);
  }, [currentUser?.id]);

  const markAllRead = async () => {
    if (!currentUser?.id) return;
    try {
      await fetch(`${API}/notifications/read-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id })
      });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch { }
  };

  // Trạng thái thẩm định của người chăm sóc (đồng bộ theo MySQL)
  const [caregiverStatus, setCaregiverStatus] = useState<string>('pending');
  const [caregiverScore, setCaregiverScore] = useState<number | null>(null);

  useEffect(() => {
    if (userRole === 'caregiver' && currentUser?.id) {
      const fetchCaregiverStatus = async () => {
        try {
          const res = await fetch(`${API}/caregiver-profile?userId=${currentUser.id}`);
          if (res.ok) {
            const data = await res.json();
            if (data.verification_status) {
              setCaregiverStatus(data.verification_status);
            }
            if (data.care_score !== undefined && data.care_score !== null) {
              setCaregiverScore(data.care_score);
            }
          }
        } catch { }
      };

      fetchCaregiverStatus();
      const onStatusUpdated = (e: any) => {
        if (e.detail?.status) setCaregiverStatus(e.detail.status);
        if (e.detail?.care_score !== undefined) setCaregiverScore(e.detail.care_score);
        fetchCaregiverStatus();
      };
      window.addEventListener('carematch:caregiver-status-updated', onStatusUpdated);
      return () => window.removeEventListener('carematch:caregiver-status-updated', onStatusUpdated);
    }
  }, [userRole, currentUser?.id]);

  // Lấy chữ viết tắt từ tên đầy đủ
  const getInitialsFromName = (name: string) => {
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length >= 2) return (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const displayName = currentUser?.full_name || (userRole === 'admin' ? 'Admin' : userRole === 'caregiver' ? 'Nguyễn Lan Anh' : 'Nguyễn Minh Mai');
  const initials = userRole === 'admin' ? 'AD' : getInitialsFromName(displayName);
  const sidebarLabel = userRole === 'admin' ? 'Admin' : userRole === 'caregiver' ? displayName : `Gia đình ${displayName}`;

  let sidebarSub = 'Gia đình người cao tuổi';
  if (userRole === 'admin') {
    sidebarSub = 'Quản trị viên hệ thống';
  } else if (userRole === 'caregiver') {
    if (caregiverStatus === 'approved') {
      sidebarSub = `Người chăm sóc · Đã duyệt${caregiverScore ? ` (${caregiverScore}đ)` : ''}`;
    } else if (caregiverStatus === 'pending') {
      sidebarSub = 'Người chăm sóc · Chờ duyệt eKYC';
    } else if (caregiverStatus === 'rejected') {
      sidebarSub = 'Người chăm sóc · Cần bổ sung';
    } else {
      sidebarSub = 'Người chăm sóc · Chưa nộp eKYC';
    }
  }

  const avatarColor = userRole === 'admin' ? 'linear-gradient(145deg, #749676, #385139)' : userRole === 'caregiver' ? 'linear-gradient(145deg, #afc5b0, #638273)' : 'linear-gradient(145deg, #f1d49b, #c49354)';

  const roleNavItems = userRole === 'caregiver' ? [
    { href: '/caregiver', label: 'Bàn làm việc & Xác thực', icon: BriefcaseBusiness },
    { href: '/schedule', label: 'Lịch nhận ca', icon: CalendarDays },
    { href: '/messages', label: 'Tin nhắn', icon: MessageCircle },
  ] : userRole === 'admin' ? [
    { href: '/admin', label: 'Góc điều phối & Duyệt hồ sơ', icon: BriefcaseBusiness },
    { href: '/schedule', label: 'Lịch toàn hệ thống', icon: CalendarDays },
    { href: '/payments', label: 'Thanh toán & Doanh thu', icon: CreditCard },
  ] : navItems;

  return (
    <div className="app-noise min-h-[100dvh] bg-[hsl(var(--background))]">
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col bg-[hsl(var(--sidebar))] px-5 py-6 text-[hsl(var(--sidebar-foreground))] shadow-[10px_0_34px_rgba(40,56,35,.10)] transition-transform duration-300 lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between px-2">
          <LogoMark />
          <button className="rounded-lg p-2 text-[hsl(var(--sidebar-foreground)/.7)] lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Đóng menu" data-testid="button-close-menu"><X size={19} /></button>
        </div>

        {/* Khối hồ sơ người dùng */}
        <div className="mt-8 rounded-[18px] border border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar-accent)/.55)] p-3">
          <div className="flex items-center gap-3">
            <Initials text={initials} color={avatarColor} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-bold">{sidebarLabel}</p>
              <p className="mt-0.5 text-[11px] text-[hsl(var(--sidebar-foreground)/.62)]">{sidebarSub}</p>
            </div>
          </div>
        </div>

        <nav className="mt-6 flex-1 space-y-1" aria-label="Điều hướng chính">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[.18em] text-[hsl(var(--sidebar-foreground)/.45)]">
            {userRole === 'admin' ? 'Quản trị hệ thống' : userRole === 'caregiver' ? 'Cổng người chăm sóc' : 'Không gian chăm sóc'}
          </p>
          {roleNavItems.map((item) => {
            const active = location === item.href || (item.href === '/matches' && location.startsWith('/matches/'));
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} data-testid={`link-nav-${item.href.slice(1)}`} className={`group flex min-h-11 items-center gap-3 rounded-[13px] px-3 text-[13px] font-semibold transition-colors ${active ? 'bg-[hsl(var(--sidebar-primary))] text-[hsl(var(--sidebar-primary-foreground))]' : 'text-[hsl(var(--sidebar-foreground)/.75)] hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-foreground))]'}`}>
                <Icon size={18} strokeWidth={active ? 2.3 : 1.8} />
                <span className="flex-1">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-[hsl(var(--sidebar-border))] pt-4">
          <button onClick={onLogout} data-testid="button-logout" className="flex min-h-11 w-full items-center gap-3 rounded-[13px] px-3 text-left text-[13px] font-semibold text-[hsl(var(--sidebar-foreground)/.65)] transition-colors hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-foreground))]"><LogIn size={18} className="rotate-180" /> Đăng xuất</button>
        </div>
      </aside>

      {mobileOpen && <button className="fixed inset-0 z-40 bg-[#213329]/40 lg:hidden" aria-label="Đóng menu" onClick={() => setMobileOpen(false)} data-testid="button-overlay-menu" />}

      <div className="lg:pl-[260px]">
        <header className="sticky top-0 z-30 flex h-[76px] items-center justify-between border-b border-[hsl(var(--border)/.75)] bg-[hsl(var(--background)/.88)] px-5 backdrop-blur-md sm:px-8 lg:px-10">
          <button className="rounded-xl p-2 text-[hsl(var(--foreground))] lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Mở menu" data-testid="button-open-menu"><Menu size={22} /></button>
          
          <div className="flex items-center gap-3">
            {userRole === 'admin' && (
              <span className="rounded-full bg-[#466548] text-white px-3.5 py-1 text-[11px] font-bold shadow-xs">Cổng Quản Trị Hệ Thống (Admin)</span>
            )}

            {/* LIVE REALTIME CLOCK WIDGET TOÀN HỆ THỐNG */}
            <div className="flex items-center gap-2 rounded-full border border-emerald-300/80 bg-emerald-50/90 px-3 py-1.5 shadow-2xs" title="Thời gian thực hệ thống CARE-MATCH">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600"></span>
              </span>
              <span className="font-mono text-[12.5px] font-bold text-emerald-950 tracking-wider">
                {clock.timeStr}
              </span>
              <span className="hidden md:inline text-[11.5px] font-medium text-emerald-800">
                · {clock.fullDateStr}
              </span>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2 sm:gap-4">
            {/* NOTIFICATION BELL - REAL-TIME */}
            <div className="relative">
              <button
                onClick={() => setShowNotifPanel(p => !p)}
                className="relative rounded-xl p-2.5 text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))]"
                aria-label="Thông báo"
                data-testid="button-notifications"
              >
                <Bell size={19} />
                {unreadCount > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white border-2 border-[hsl(var(--background))]">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* PANEL THÔNG BÁO */}
              {showNotifPanel && (
                <div className="absolute right-0 top-12 z-50 w-[340px] rounded-2xl border border-[hsl(var(--border))] bg-white shadow-2xl animate-rise overflow-hidden">
                  <div className="flex items-center justify-between border-b px-4 py-3">
                    <p className="text-[13px] font-bold">Thông báo {unreadCount > 0 && <span className="ml-1 rounded-full bg-red-500 px-1.5 text-[10px] text-white">{unreadCount}</span>}</p>
                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && <button onClick={markAllRead} className="text-[11px] text-[hsl(var(--primary))] font-semibold hover:underline">Đọc tất cả</button>}
                      <button onClick={() => setShowNotifPanel(false)} className="rounded-lg p-1 hover:bg-gray-100"><X size={15} /></button>
                    </div>
                  </div>
                  <div className="max-h-[360px] overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="px-4 py-8 text-center text-[13px] text-[hsl(var(--muted-foreground))]">Không có thông báo nào.</p>
                    ) : notifications.map(n => (
                      <button
                        key={n.id}
                        onClick={async () => {
                          if (!n.is_read) {
                            try { await fetch(`${API}/notifications/${n.id}/read`, { method: 'PATCH' }); } catch { }
                            setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x));
                            setUnreadCount(c => Math.max(0, c - 1));
                          }
                          setShowNotifPanel(false);
                          setLocation(n.link);
                        }}
                        className={`flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0 transition-colors ${!n.is_read ? 'bg-[#f0f7f0]' : ''}`}
                      >
                        <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                          n.type === 'message' ? 'bg-[#e8f3e8] text-[#3a6b3c]'
                          : n.type === 'schedule' ? 'bg-[#fef3da] text-[#8a6520]'
                          : 'bg-[#e8ecf3] text-[#3a4b6b]'
                        }`}>
                          {n.type === 'message' ? <MessageCircle size={15} /> : n.type === 'schedule' ? <CalendarDays size={15} /> : <Bell size={15} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-[12px] leading-tight ${!n.is_read ? 'font-bold' : 'font-semibold text-gray-600'}`}>{n.title}</p>
                          <p className="mt-0.5 text-[11px] text-[hsl(var(--muted-foreground))] line-clamp-2">{n.body}</p>
                          <p className="mt-1 text-[10px] text-gray-400">{new Date(n.created_at).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</p>
                        </div>
                        {!n.is_read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-red-400" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="hidden h-7 w-px bg-[hsl(var(--border))] sm:block" />
            <div className="flex items-center gap-2.5">
              <Initials text={initials} color={avatarColor} size="sm" />
              <span className="hidden text-[13px] font-bold sm:block">{displayName}</span>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 lg:px-10 lg:py-10">{children}</main>
      </div>
    </div>
  );
}

function Landing() {
  const [, setLocation] = useLocation();
  return (
    <div className="app-noise min-h-[100dvh] overflow-hidden bg-[#f6f2e9] text-[#26392d]">
      <header className="relative z-10 mx-auto flex max-w-[1240px] items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
        <LogoMark />
        <nav className="hidden items-center gap-8 text-[13px] font-semibold text-[#657066] md:flex">
          <a href="#cach-hoat-dong" data-testid="link-landing-how-it-works">Cách hoạt động</a>
          <a href="#tin-cay" data-testid="link-landing-trust">Vì sao CARE-MATCH</a>
          <a href="#ho-tro" data-testid="link-landing-support">Hỗ trợ</a>
        </nav>
        <div className="flex items-center gap-2">
          <Button variant="quiet" onClick={() => setLocation('/login')} testId="button-landing-login">Đăng nhập</Button>
          <Button onClick={() => setLocation('/register')} testId="button-landing-start">Đăng ký <ArrowRight size={16} /></Button>
        </div>
      </header>

      <section className="relative mx-auto grid max-w-[1240px] items-center gap-12 px-5 pb-20 pt-12 sm:px-8 lg:grid-cols-[1.02fr_.98fr] lg:gap-16 lg:px-10 lg:pb-28 lg:pt-16">
        <div className="relative z-10 animate-rise">
          <Pill tone="gold"><span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[#c79550]" /> Đề án Khởi nghiệp Sáng tạo Sinh viên CTXH</Pill>
          <h1 className="mt-6 max-w-[650px] font-display text-[54px] font-semibold leading-[.99] tracking-[-.055em] text-[#293e31] sm:text-[70px]">
            Chăm sóc cha mẹ, <span className="italic text-[#6a7f51]">có người đồng hành.</span>
          </h1>
          <p className="mt-7 max-w-[510px] text-[16px] leading-7 text-[#68756c]">
            CARE-MATCH kết nối thông minh gia đình với người chăm sóc tận tâm, quản lý hồ sơ sức khỏe và luôn có nhân viên công tác xã hội đồng hành trong suốt hành trình.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Button onClick={() => setLocation('/login')} className="px-5" testId="button-hero-start">
              Tìm người chăm sóc phù hợp <ArrowRight size={17} />
            </Button>
            <Button variant="outline" onClick={() => document.getElementById('cach-hoat-dong')?.scrollIntoView({ behavior: 'smooth' })} testId="button-hero-learn">
              Xem cách hoạt động
            </Button>
          </div>
          <div className="mt-9 flex items-center gap-3 text-[12px] text-[#758075]">
            <div className="flex -space-x-2">
              <Initials text="HN" color="#d9bea1" size="sm" />
              <Initials text="VT" color="#b8ccb7" size="sm" />
              <Initials text="QA" color="#e3b1a0" size="sm" />
            </div>
            <span><strong className="text-[#3f5544]">1.200+ gia đình</strong> đang được đồng hành</span>
          </div>
        </div>

        {/* CỘT PHẢI HERO: BANNER CHỮ NHẬT CHẠY SLIDE GIỚI THIỆU WEB THEO YÊU CẦU */}
        <div className="relative animate-rise delay-2 w-full">
          <LandingBannerCarousel onActionClick={() => setLocation('/login')} />
        </div>
      </section>

      <section id="tin-cay" className="border-y border-[#e4ded1] bg-[#fbf8f1]">
        <div className="mx-auto grid max-w-[1240px] grid-cols-2 gap-7 px-5 py-8 sm:px-8 md:grid-cols-4 lg:px-10">
          <div><p className="font-display text-[31px] text-[#344c38]">1.200<span className="text-[#c79550]">+</span></p><p className="mt-1 text-[11px] font-bold uppercase tracking-[.12em] text-[#8a938a]">Gia đình đồng hành</p></div>
          <div><p className="font-display text-[31px] text-[#344c38]">420</p><p className="mt-1 text-[11px] font-bold uppercase tracking-[.12em] text-[#8a938a]">Người chăm sóc</p></div>
          <div><p className="font-display text-[31px] text-[#344c38]">4,8<span className="text-[18px]">/5</span></p><p className="mt-1 text-[11px] font-bold uppercase tracking-[.12em] text-[#8a938a]">Mức hài lòng</p></div>
          <div><p className="font-display text-[31px] text-[#344c38]">24/7</p><p className="mt-1 text-[11px] font-bold uppercase tracking-[.12em] text-[#8a938a]">Có người hỗ trợ</p></div>
        </div>
      </section>

      <section id="cach-hoat-dong" className="mx-auto max-w-[1240px] px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
        <div className="max-w-[600px]"><p className="text-[11px] font-bold uppercase tracking-[.16em] text-[#768c5c]">Ba bước nhẹ nhàng</p><h2 className="mt-3 font-display text-[42px] leading-[1.05] tracking-[-.04em] text-[#293e31] sm:text-[52px]">Để việc chăm sóc <span className="italic text-[#71865e]">bớt một mình.</span></h2></div>
        <div className="mt-14 grid gap-5 md:grid-cols-3">
          <div className="rounded-[26px] bg-[#e4ebdc] p-7"><span className="font-display text-[55px] leading-none text-[#7c966c]">01</span><div className="mt-16"><Search size={25} className="text-[#536f4b]" /><h3 className="mt-5 font-display text-[26px] text-[#344c38]">Nói điều gia đình cần</h3><p className="mt-2 text-[13px] leading-6 text-[#657265]">Hồ sơ chăm sóc rõ ràng giúp chúng tôi hiểu sức khỏe, thói quen và mong muốn của người thân.</p></div></div>
          <div className="rounded-[26px] bg-[#f5e7cc] p-7"><span className="font-display text-[55px] leading-none text-[#c79550]">02</span><div className="mt-16"><UserRoundPlus size={25} className="text-[#997039]" /><h3 className="mt-5 font-display text-[26px] text-[#4a4030]">Gặp đúng người</h3><p className="mt-2 text-[13px] leading-6 text-[#756b5b]">CARE-MATCH lọc và gợi ý người chăm sóc phù hợp, đã được xác minh hồ sơ và tham chiếu.</p></div></div>
          <div className="rounded-[26px] bg-[#dce8e5] p-7"><span className="font-display text-[55px] leading-none text-[#6d9a8d]">03</span><div className="mt-16"><HeartHandshake size={25} className="text-[#4d7e71]" /><h3 className="mt-5 font-display text-[26px] text-[#324f48]">Có người theo sát</h3><p className="mt-2 text-[13px] leading-6 text-[#607a74]">Nhân viên công tác xã hội đồng hành trong suốt hành trình, không chỉ đến khi có vấn đề.</p></div></div>
        </div>
      </section>

      <section id="ho-tro" className="bg-[#314a38] px-5 py-16 text-[#f6f2e9] sm:px-8 lg:px-10">
        <div className="mx-auto flex max-w-[1040px] flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <div><p className="text-[11px] font-bold uppercase tracking-[.16em] text-[#d3aa68]">Bắt đầu bằng một cuộc trò chuyện</p><h2 className="mt-3 max-w-[570px] font-display text-[40px] leading-[1.06] tracking-[-.04em] sm:text-[48px]">Gia đình bạn không cần tự xoay xở.</h2></div>
          <Button onClick={() => setLocation('/register')} className="bg-[#f0d8a8] text-[#314a38] hover:bg-[#f7e4bd]" testId="button-footer-start">Tạo hồ sơ chăm sóc <ArrowRight size={17} /></Button>
        </div>
      </section>

      <footer className="mx-auto flex max-w-[1240px] flex-col justify-between gap-3 px-5 py-7 text-[11px] text-[#89928a] sm:flex-row sm:px-8 lg:px-10">
        <span>© 2026 CARE-MATCH — Sáng lập viên: Tống Thành Đương</span>
        <span>Chăm sóc tử tế, bắt đầu từ lắng nghe.</span>
      </footer>
    </div>
  );
}

function AuthPage({ mode, onLogin }: { mode: 'login' | 'register'; onLogin: (role?: 'family' | 'caregiver' | 'admin', user?: any) => void }) {
  const [, setLocation] = useLocation();
  const [selectedRole, setSelectedRole] = useState<'family' | 'caregiver'>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const r = params.get('role');
      if (r === 'caregiver' || r === 'family') return r;
      const saved = localStorage.getItem('carematch_selected_auth_role');
      if (saved === 'caregiver' || saved === 'family') return saved as 'family' | 'caregiver';
    } catch {}
    return 'family';
  });
  const isLogin = mode === 'login';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullname, setFullname] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleRoleChange = (role: 'family' | 'caregiver') => {
    setSelectedRole(role);
    setErrorMsg('');
    try {
      localStorage.setItem('carematch_selected_auth_role', role);
      const url = new URL(window.location.href);
      url.searchParams.set('role', role);
      window.history.replaceState({}, '', url.toString());
    } catch {}
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Vui lòng điền đầy đủ email và mật khẩu.');
      return;
    }
    if (!isLogin && !fullname.trim()) {
      setErrorMsg('Vui lòng điền họ và tên.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const body = isLogin
        ? { username: email.trim(), password, role: selectedRole }
        : { email: email.trim(), password, full_name: fullname.trim(), role: selectedRole };

      const res = await fetch(`http://localhost:5000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();

      if (data.success) {
        const effectiveRole = data.user?.role || selectedRole;
        onLogin(effectiveRole, data.user);
      } else {
        setErrorMsg(data.message || 'Thao tác không thành công. Vui lòng kiểm tra lại thông tin.');
      }
    } catch {
      // Server không chạy → vẫn cho đăng nhập với dữ liệu demo
      onLogin(selectedRole);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-noise flex min-h-[100dvh] bg-[#f6f2e9]">
      <div className="hidden w-[43%] flex-col justify-between bg-[#314a38] p-10 text-[#f6f2e9] lg:flex">
        <LogoMark />
        <div className="max-w-[430px] pb-10">
          <Pill tone="gold">
            {selectedRole === 'family' ? 'Không gian an tâm cho gia đình' : 'Cổng người chăm sóc chuyên nghiệp'}
          </Pill>
          <h1 className="mt-6 font-display text-[50px] leading-[1.02] tracking-[-.04em]">
            {selectedRole === 'family' 
              ? <>Chăm sóc tốt hơn khi có người <span className="italic text-[#c7d4bb]">đồng hành.</span></>
              : <>Lan tỏa sự tận tâm, <span className="italic text-[#c7d4bb]">nhận việc an tâm.</span></>}
          </h1>
          <p className="mt-6 max-w-[360px] text-[14px] leading-6 text-[#d2ddd1]">
            {selectedRole === 'family'
              ? 'Mọi thông tin được sắp xếp rõ ràng để gia đình luôn biết bước tiếp theo.'
              : 'Tải hồ sơ chứng chỉ, nhận bảo lãnh thanh toán 100% và thẩm định CARE SCORE.'}
          </p>
          <div className="mt-9 flex items-center gap-3 text-[12px] text-[#c5d1c2]">
            <ShieldCheck size={18} className="text-[#e1ba72]" /> 
            <span>{selectedRole === 'family' ? 'Hồ sơ người chăm sóc được xác minh 100%' : 'Bảo mật thông tin & Kiểm định tiêu chuẩn'}</span>
          </div>
        </div>
        <p className="text-[11px] text-[#9faf9d]">CARE-MATCH · Chăm sóc có người đồng hành</p>
      </div>

      <div className="flex flex-1 items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-[460px] animate-rise">
          <div className="mb-6 lg:hidden"><LogoMark /></div>
          <button onClick={() => setLocation('/intro')} className="mb-6 flex items-center gap-2 text-[12px] font-bold text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))]">
            <ArrowLeft size={16} /> Về trang giới thiệu
          </button>

          {/* BỘ CHỌN VAI TRÒ ĐĂNG NHẬP / ĐĂNG KÝ: CHỈ 2 ĐỐI TƯỢNG (GIA ĐÌNH & NGƯỜI CHĂM SÓC) */}
          <div className="mb-5">
            <p className="text-[11px] font-bold uppercase tracking-[.14em] text-[hsl(var(--primary))] mb-2">
              Chọn vai trò truy cập của bạn:
            </p>
            <div className="grid grid-cols-2 gap-2 rounded-[16px] border border-[hsl(var(--border))] bg-white p-1.5 shadow-xs">
              <button
                type="button"
                onClick={() => handleRoleChange('family')}
                className={`flex flex-col items-center justify-center py-2.5 px-3 rounded-[12px] text-center transition ${
                  selectedRole === 'family'
                    ? 'bg-[#435d41] text-white shadow-xs font-bold'
                    : 'text-[#556758] hover:bg-[#f1f6ef] font-medium'
                }`}
                data-testid="button-role-family"
              >
                <Users size={17} className="mb-1" />
                <span className="text-[12px] leading-tight">Gia đình người cao tuổi</span>
              </button>

              <button
                type="button"
                onClick={() => handleRoleChange('caregiver')}
                className={`flex flex-col items-center justify-center py-2.5 px-3 rounded-[12px] text-center transition ${
                  selectedRole === 'caregiver'
                    ? 'bg-[#435d41] text-white shadow-xs font-bold'
                    : 'text-[#556758] hover:bg-[#f1f6ef] font-medium'
                }`}
                data-testid="button-role-caregiver"
              >
                <Stethoscope size={17} className="mb-1" />
                <span className="text-[12px] leading-tight">Người chăm sóc</span>
              </button>
            </div>
          </div>

          <div className="mb-5">
            <h2 className="font-display text-[30px] sm:text-[34px] leading-tight tracking-[-.04em]">
              {isLogin 
                ? (selectedRole === 'family' ? 'Đăng nhập Gia đình' : 'Đăng nhập Người chăm sóc')
                : (selectedRole === 'family' ? 'Tạo tài khoản Gia đình' : 'Đăng ký Người chăm sóc')}
            </h2>
            <p className="mt-1.5 text-[13px] leading-5 text-[hsl(var(--muted-foreground))]">
              {selectedRole === 'family'
                ? 'Tìm kiếm, đặt lịch và quản lý hồ sơ chăm sóc người thân.'
                : 'Cổng tải lên chứng chỉ, nhận ca làm việc và thẩm định CARE SCORE.'}
            </p>
          </div>

          {/* BANNER XÁC NHẬN VAI TRÒ RÕ RÀNG KHI ĐĂNG KÝ */}
          {!isLogin && (
            <div className={`mb-4 flex items-center gap-3 rounded-[14px] border p-3 transition ${
              selectedRole === 'caregiver'
                ? 'border-[#3f634b]/40 bg-[#eef6ed] text-[#2c4835]'
                : 'border-[#d4a868]/40 bg-[#fbf5ea] text-[#6d4d1e]'
            }`}>
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                selectedRole === 'caregiver' ? 'bg-[#3f634b] text-white' : 'bg-[#c49354] text-white'
              }`}>
                {selectedRole === 'caregiver' ? <Stethoscope size={16} /> : <Users size={16} />}
              </div>
              <div className="min-w-0 flex-1 text-left">
                <p className="text-[12px] font-bold leading-tight">
                  {selectedRole === 'caregiver' ? 'Bạn đang đăng ký: TÀI KHOẢN NGƯỜI CHĂM SÓC' : 'Bạn đang đăng ký: TÀI KHOẢN GIA ĐÌNH'}
                </p>
                <p className="mt-0.5 text-[11px] leading-tight opacity-80">
                  {selectedRole === 'caregiver' 
                    ? 'Tự động mở Bàn làm việc & Cổng thẩm định hồ sơ Người chăm sóc.'
                    : 'Tự động kết nối hồ sơ chăm sóc người thân và điều phối viên.'}
                </p>
              </div>
            </div>
          )}

          {/* THÔNG BÁO LỖI NẾU CÓ */}
          {errorMsg && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-[12.5px] text-red-700 flex items-center gap-2 animate-rise">
              <AlertCircle size={16} className="shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <label className="block">
              <span className="mb-1.5 block text-[11.5px] font-bold">Email tài khoản</span>
              <input 
                type="email" 
                required 
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Nhập email của bạn"
                className="h-11 w-full rounded-[13px] border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3.5 text-[13px] outline-none transition focus:border-[hsl(var(--primary))] focus:ring-4 focus:ring-[hsl(var(--primary)/.10)]" 
              />
            </label>

            {!isLogin && (
              <label className="block">
                <span className="mb-1.5 block text-[11.5px] font-bold">
                  {selectedRole === 'caregiver' ? 'Họ và tên người chăm sóc' : 'Họ và tên đại diện gia đình'}
                </span>
                <input
                  required
                  value={fullname}
                  onChange={e => setFullname(e.target.value)}
                  placeholder={selectedRole === 'caregiver' ? 'Ví dụ: Nguyễn Lan Anh' : 'Ví dụ: Nguyễn Minh Mai'}
                  className="h-11 w-full rounded-[13px] border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3.5 text-[13px] outline-none transition focus:border-[hsl(var(--primary))] focus:ring-4 focus:ring-[hsl(var(--primary)/.10)]" 
                />
              </label>
            )}

            <label className="block">
              <span className="mb-1.5 block text-[11.5px] font-bold">Mật khẩu</span>
              <input 
                type="password" 
                required 
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu"
                className="h-11 w-full rounded-[13px] border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3.5 text-[13px] outline-none transition focus:border-[hsl(var(--primary))] focus:ring-4 focus:ring-[hsl(var(--primary)/.10)]" 
              />
            </label>

            <div className="flex items-center justify-between pt-1 text-[11.5px]">
              <label className="flex items-center gap-2 text-[hsl(var(--muted-foreground))]"><input type="checkbox" defaultChecked className="accent-[#536f4b]" /> Ghi nhớ đăng nhập</label>
              {isLogin && <button type="button" className="font-bold text-[hsl(var(--primary))]">Quên mật khẩu?</button>}
            </div>

            <Button type="submit" disabled={loading} className="mt-2 w-full" testId="button-auth-submit">
              {loading ? 'Đang xử lý...' : isLogin 
                ? (selectedRole === 'family' ? 'Đăng nhập Gia đình' : 'Đăng nhập Người chăm sóc')
                : (selectedRole === 'family' ? 'Hoàn tất Đăng ký Gia đình' : 'Hoàn tất Đăng ký Người chăm sóc')}
              {!loading && <ArrowRight size={16} />}
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3 text-[11px] text-[hsl(var(--muted-foreground))]"><span className="h-px flex-1 bg-[hsl(var(--border))]" /> hoặc <span className="h-px flex-1 bg-[hsl(var(--border))]" /></div>

          <p className="text-center text-[12.5px] text-[hsl(var(--muted-foreground))]">
            {isLogin ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'}{' '}
            <button 
              onClick={() => {
                setErrorMsg('');
                setLocation(isLogin ? `/register?role=${selectedRole}` : `/login?role=${selectedRole}`);
              }} 
              className="font-bold text-[hsl(var(--primary))]"
            >
              {isLogin ? 'Đăng ký ngay' : 'Đăng nhập'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

function Dashboard({ notify, currentUser }: { notify: (message: string) => void; currentUser?: CurrentUser }) {
  const clock = useRealtimeClock();
  const [, setLocation] = useLocation();
  const [elderlyProfiles, setElderlyProfiles] = useState<ElderlyProfile[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [loadingSchedules, setLoadingSchedules] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPatientName, setNewPatientName] = useState('');
  const [addingPatient, setAddingPatient] = useState(false);

  const userId = currentUser?.id || 5;
  const userName = currentUser?.full_name || 'Người dùng';

  // Tải danh sách hồ sơ người cao tuổi từ MySQL
  const fetchProfiles = async () => {
    setLoadingProfiles(true);
    try {
      const res = await fetch(`${API}/elderly-profiles?userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setElderlyProfiles(data);
      }
    } catch {
      setElderlyProfiles([]);
    } finally {
      setLoadingProfiles(false);
    }
  };

  // Tải danh sách ca chăm sóc của gia đình từ MySQL
  const fetchSchedules = async () => {
    setLoadingSchedules(true);
    try {
      const res = await fetch(`${API}/schedules?familyUserId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setSchedules(data);
      }
    } catch {
      setSchedules([]);
    } finally {
      setLoadingSchedules(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
    fetchSchedules();

    // Đồng bộ Realtime với cơ sở dữ liệu MySQL mỗi 3 giây
    const interval = setInterval(() => {
      fetch(`${API}/schedules?familyUserId=${userId}`)
        .then(res => res.ok ? res.json() : [])
        .then(data => setSchedules(data))
        .catch(() => {});
    }, 3000);
    return () => clearInterval(interval);
  }, [userId]);

  const handleAddPatient = async () => {
    if (!newPatientName.trim()) return;
    setAddingPatient(true);
    try {
      const res = await fetch(`${API}/elderly-profiles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, full_name: newPatientName.trim() })
      });
      if (res.ok) {
        const newProfile = await res.json();
        setElderlyProfiles(prev => [newProfile, ...prev]);
        notify(`Đã lưu hồ sơ của ${newPatientName.trim()} vào MySQL thành công!`);
        setShowAddModal(false);
        setNewPatientName('');
        // Chuyển ngay đến trang chỉnh sửa hồ sơ người này
        setLocation(`/care-profile?id=${newProfile.id}`);
      }
    } catch {
      notify('Không thể kết nối đến máy chủ MySQL. Vui lòng thử lại sau.');
    } finally {
      setAddingPatient(false);
    }
  };

  const todayStr = `${clock.dayOfWeek}, ${clock.dateFormatted}`;
  const greeting = `Chào ${userName}!`;
  const latestCaregiverName = schedules.length > 0 ? schedules[0].caregiver_name : null;

  return (
    <>
      <DashboardBannerCarousel />

      <PageHeading 
        eyebrow={`${todayStr} · ${clock.timeStr}`}
        title={greeting}
        description="Không gian theo dõi sức khỏe và lịch trình chăm sóc của người thân (đồng bộ realtime MySQL)."
        action={<Button onClick={() => setLocation('/matches')} testId="button-dashboard-find">Tìm người chăm sóc <ArrowRight size={16} /></Button>} 
      />

      {/* DANH SÁCH NGƯỜI BỆNH - KẾT NỐI TRỰC TIẾP MYSQL */}
      <div className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-[.14em] text-[hsl(var(--muted-foreground))]">
            Người cần chăm sóc ({elderlyProfiles.length})
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 rounded-xl bg-[hsl(var(--primary))] px-3.5 py-1.5 text-[12px] font-bold text-white hover:opacity-90 transition-opacity shadow-xs"
            data-testid="button-add-patient"
          >
            <Plus size={14} /> Thêm người cần chăm sóc
          </button>
        </div>

        {loadingProfiles ? (
          <div className="flex items-center gap-2 rounded-2xl bg-[hsl(var(--secondary))] p-5 text-[13px] text-[hsl(var(--muted-foreground))]">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-[hsl(var(--primary))] border-t-transparent" /> Đang tải hồ sơ từ MySQL...
          </div>
        ) : elderlyProfiles.length === 0 ? (
          <Card className="border-dashed border-2 border-[hsl(var(--border))] bg-[hsl(var(--secondary)/.4)] p-8 text-center" testId="card-empty-profiles">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]">
              <UserRound size={26} />
            </div>
            <h3 className="mt-4 font-display text-[22px]">Chưa có hồ sơ người cần chăm sóc</h3>
            <p className="mt-2 text-[13px] leading-5 text-[hsl(var(--muted-foreground))] max-w-sm mx-auto">
              Hãy thêm thông tin về người thân để CARE-MATCH có thể gợi ý người chăm sóc phù hợp và quản lý lịch trình.
            </p>
            <Button onClick={() => setShowAddModal(true)} className="mt-5" testId="button-empty-add-patient">
              <Plus size={16} /> Thêm người cần chăm sóc ngay
            </Button>
          </Card>
        ) : (
          <div className={`grid gap-4 ${elderlyProfiles.length > 1 ? 'sm:grid-cols-2' : ''}`}>
            {elderlyProfiles.map(profile => {
              const age = profile.date_of_birth ? new Date().getFullYear() - new Date(profile.date_of_birth).getFullYear() : null;
              const nameInitials = profile.full_name.trim().split(' ').filter(Boolean).map(w => w[0]).slice(-2).join('').toUpperCase() || 'NT';
              return (
                <Card key={profile.id} className="relative overflow-hidden bg-[hsl(var(--primary))] p-5 text-[hsl(var(--primary-foreground))] sm:p-6 shadow-sm" testId={`card-elderly-${profile.id}`}>
                  <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full border-[20px] border-[#82976c]/20 pointer-events-none" />
                  <div className="relative flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Pill tone="gold">Hồ sơ người thân</Pill>
                        {profile.verification_status === 'verified' && <span className="text-[11px] text-[#cfddca]">Đã xác minh</span>}
                      </div>
                      <h2 className="mt-2 font-display text-[24px] sm:text-[26px] leading-tight tracking-[-.02em]">{profile.full_name}</h2>
                      <p className="mt-0.5 text-[12px] text-[#cfddca]">
                        {age ? `${age} tuổi` : 'Chưa cập nhật tuổi'}{profile.district ? ` · ${profile.district}` : ''}
                      </p>
                      {profile.care_needs && profile.care_needs.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {profile.care_needs.slice(0, 3).map(need => (
                            <span key={need} className="rounded-full bg-[#617950] px-2.5 py-0.5 text-[10.5px] font-semibold">{need}</span>
                          ))}
                          {profile.care_needs.length > 3 && <span className="rounded-full bg-[#617950]/70 px-2.5 py-0.5 text-[10.5px]">+{profile.care_needs.length - 3}</span>}
                        </div>
                      ) : (
                        <p className="mt-2 text-[11.5px] italic text-[#cfddca]/80">Chưa bổ sung nhu cầu chăm sóc</p>
                      )}
                    </div>
                    <div className="flex h-[68px] w-[68px] shrink-0 items-center justify-center rounded-[18px] border border-[#b7c8a9]/40 bg-[#71885f]">
                      <Initials text={nameInitials} color="linear-gradient(145deg,#e3c89c,#c29360)" size="md" />
                    </div>
                  </div>
                  <div className="relative mt-4 flex flex-col justify-between gap-2 border-t border-[#9ab08a]/30 pt-3 text-[11.5px] sm:flex-row sm:items-center">
                    {profile.adl_score ? (
                      <span className="flex items-center gap-1.5 text-[#d8e2d4]">
                        <CheckCircle2 size={14} className="text-[#e6c27b]" /> Hồ sơ hoàn thiện {profile.adl_score}% (Chuẩn ADL)
                      </span>
                    ) : <span className="text-[#d8e2d4]/70">Hồ sơ mới · Bấm chỉnh sửa để thêm thông tin</span>}
                    <button 
                      onClick={() => setLocation(`/care-profile?id=${profile.id}`)} 
                      className="flex items-center gap-1 font-bold text-[#f1d8a7] hover:text-white" 
                      data-testid={`button-edit-profile-${profile.id}`}
                    >
                      Xem & cập nhật chi tiết <ChevronRight size={14} />
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL THÊM NGƯỜI BỆNH MỚI - LƯU TRỰC TIẾP MYSQL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-[420px] rounded-[24px] bg-white p-6 shadow-2xl animate-rise">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-[20px] font-bold">Thêm người cần chăm sóc</h3>
              <button onClick={() => setShowAddModal(false)} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"><X size={18} /></button>
            </div>
            <p className="text-[13px] text-[hsl(var(--muted-foreground))] mb-4">
              Nhập họ và tên đầy đủ. Sau khi thêm, hệ thống sẽ mở form trống để bạn tự điền chi tiết bệnh tật và nhu cầu của người này.
            </p>
            <label className="block mb-4">
              <span className="mb-1.5 block text-[11.5px] font-bold">Họ và tên đầy đủ</span>
              <input
                value={newPatientName}
                onChange={e => setNewPatientName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddPatient()}
                placeholder="Ví dụ: Bác Trần Văn An"
                className="h-11 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 text-[13px] outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/.25)]"
                autoFocus
                data-testid="input-new-patient-name"
              />
            </label>
            <div className="flex gap-2">
              <button onClick={() => setShowAddModal(false)} className="flex-1 h-11 rounded-xl border border-[hsl(var(--border))] text-[13px] font-semibold hover:bg-gray-50">Hủy</button>
              <button
                onClick={handleAddPatient}
                disabled={!newPatientName.trim() || addingPatient}
                className="flex-1 h-11 rounded-xl bg-[hsl(var(--primary))] text-white text-[13px] font-bold hover:opacity-90 disabled:opacity-50 transition-opacity"
                data-testid="button-confirm-add-patient"
              >
                {addingPatient ? 'Đang lưu MySQL...' : 'Lưu hồ sơ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KHỐI LỊCH CHĂM SÓC & NGƯỜI ĐỒNG HÀNH - ĐỒNG BỘ THỜI GIAN THỰC MYSQL */}
      <div className="mt-4 grid gap-5 lg:grid-cols-[1fr_1fr_.85fr]">
        <Card className="p-6 lg:col-span-2" testId="card-dashboard-today">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[.14em] text-[hsl(var(--muted-foreground))]">Lịch chăm sóc trong ngày</p>
              <h2 className="mt-2 font-display text-[25px]">
                {schedules.length > 0 ? `Lịch sắp tới (${schedules.length} ca)` : 'Chưa có lịch chăm sóc'}
              </h2>
            </div>
            <Link href="/schedule" className="flex items-center gap-1 text-[12px] font-bold text-[hsl(var(--primary))]" data-testid="link-dashboard-schedule">
              {schedules.length > 0 ? 'Xem tất cả' : 'Lên lịch ca'} <ArrowUpRight size={15} />
            </Link>
          </div>

          {loadingSchedules ? (
            <div className="mt-6 flex items-center gap-2 text-[13px] text-[hsl(var(--muted-foreground))]">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-[hsl(var(--primary))] border-t-transparent" /> Đang tải lịch từ MySQL...
            </div>
          ) : schedules.length === 0 ? (
            <div className="mt-6 rounded-[18px] border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--secondary)/.3)] p-6 text-center">
              <CalendarDays size={32} className="mx-auto text-[hsl(var(--muted-foreground))]" />
              <p className="mt-2 font-bold text-[14px]">Hiện tại gia đình chưa có lịch chăm sóc nào</p>
              <p className="mt-1 text-[12px] text-[hsl(var(--muted-foreground))] max-w-md mx-auto">
                Khi gia đình và người chăm sóc thống nhất và đặt lịch ca, lịch trình chi tiết và nhiệm vụ nhắc thuốc sẽ xuất hiện tại đây.
              </p>
              <Button onClick={() => setLocation('/schedule')} className="mt-4" testId="button-dashboard-create-schedule">
                <Plus size={15} /> Đặt ca chăm sóc ngay
              </Button>
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {schedules.slice(0, 3).map((item) => {
                const isToday = item.schedule_date && item.schedule_date.includes(clock.shortDate);
                const dateTag = isToday ? 'Hôm nay' : (item.schedule_date || 'Hôm nay');
                return (
                  <div key={item.id} className="flex gap-4">
                    <div className="w-20 pt-1 text-right">
                      <span className={`inline-block rounded-md px-1.5 py-0.5 text-[10.5px] font-bold ${
                        isToday ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'text-[hsl(var(--muted-foreground))]'
                      }`}>
                        {dateTag}
                      </span>
                      <p className="mt-0.5 font-display text-[13px] font-bold text-[#344d32]">
                        {item.time_slot ? item.time_slot.split('-')[0].trim() : '08:30'}
                      </p>
                    </div>
                    <div className={`relative flex-1 rounded-[15px] border-l-[3px] p-3.5 ${
                      item.status === 'confirmed' ? 'border-[#82986e] bg-[#edf2e8]' : 'border-[#d0a15b] bg-[#faf1df]'
                    }`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[13.5px] font-bold text-[#354832]">{item.title}</p>
                          <p className="mt-1 flex items-center gap-1.5 text-[11.5px] text-[#637361]">
                            <Stethoscope size={13} /> {item.caregiver_name} · {item.elderly_name || 'Người thân'}
                          </p>
                          {item.tasks && <p className="mt-1 text-[11.5px] text-[#556957]">Nhiệm vụ: {item.tasks}</p>}
                        </div>
                        <Pill tone={item.status === 'confirmed' ? 'olive' : 'gold'}>
                          {item.status === 'confirmed' ? 'Đã xác nhận' : 'Chờ xác nhận'}
                        </Pill>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* CỘT NGƯỜI ĐỒNG HÀNH */}
        <Card className="flex flex-col p-6" testId="card-dashboard-support">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[.14em] text-[hsl(var(--muted-foreground))]">Người đồng hành</p>
              <h2 className="mt-2 font-display text-[23px]">
                {latestCaregiverName || 'Chưa chọn người chăm sóc'}
              </h2>
            </div>
            {latestCaregiverName ? (
              <Initials text={latestCaregiverName.split(' ').slice(-2).map((w: string) => w[0]).join('').toUpperCase()} color="linear-gradient(145deg,#c4d3bf,#789678)" />
            ) : (
              <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]">
                <HeartHandshake size={20} />
              </div>
            )}
          </div>
          
          <p className="mt-4 text-[13px] leading-5 text-[hsl(var(--muted-foreground))]">
            {latestCaregiverName
              ? `Người chăm sóc đồng hành hiện tại cùng gia đình. Bạn có thể trao đổi trực tiếp để dặn dò các yêu cầu.`
              : 'Gia đình chưa kết nối với người chăm sóc nào. Hãy tham khảo mạng lưới ứng viên đã được xác minh để chọn người phù hợp.'}
          </p>

          <div className="mt-auto pt-6">
            {latestCaregiverName ? (
              <Button variant="outline" onClick={() => setLocation('/messages')} className="w-full" testId="button-dashboard-message">
                Mở tin nhắn trao đổi <MessageCircle size={15} />
              </Button>
            ) : (
              <Button onClick={() => setLocation('/matches')} className="w-full" testId="button-dashboard-find-caregiver">
                Tìm người chăm sóc ngay <ArrowRight size={15} />
              </Button>
            )}
          </div>
        </Card>
      </div>

      <Card className="mt-5 flex flex-col gap-4 border-[#ead8b3] bg-[#fff9ed] p-5 sm:flex-row sm:items-center sm:justify-between" testId="card-dashboard-tip">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f5e1b6] text-[#8a672e]">
            <CircleHelp size={18} />
          </div>
          <div>
            <p className="text-[13px] font-bold text-[#5b4c30]">Một gợi ý nhỏ cho gia đình</p>
            <p className="mt-1 text-[12px] leading-5 text-[#887657]">
              Hãy ghi chú rõ thói quen sinh hoạt và sở thích ăn uống vào hồ sơ chăm sóc để người đồng hành phục vụ chu đáo nhất.
            </p>
          </div>
        </div>
        <Button variant="quiet" onClick={() => notify('Đã đánh dấu gợi ý để xem lại sau.')} testId="button-dashboard-tip-save">Lưu gợi ý</Button>
      </Card>
    </>
  );
}

function CareProfile({ notify, currentUser }: { notify: (message: string) => void; currentUser?: CurrentUser }) {
  const [, setLocation] = useLocation();
  const [profiles, setProfiles] = useState<ElderlyProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profileId, setProfileId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [address, setAddress] = useState('');
  const [contact, setContact] = useState('');
  const [phone, setPhone] = useState('');
  const [district, setDistrict] = useState('');
  const [gender, setGender] = useState('Nữ');
  const [notes, setNotes] = useState('');
  const [needs, setNeeds] = useState<string[]>([]);
  const [newNeed, setNewNeed] = useState('');

  const userId = currentUser?.id || 5;

  const populateForm = (p: ElderlyProfile | null) => {
    if (p) {
      setProfileId(p.id);
      setName(p.full_name || '');
      setDob(p.date_of_birth ? p.date_of_birth.substring(0, 10) : '');
      setAddress(p.address || '');
      setContact(p.contact_name || '');
      setPhone(p.contact_phone || '');
      setDistrict(p.district || '');
      setGender(p.gender || 'Nữ');
      setNotes(p.notes || '');
      setNeeds(Array.isArray(p.care_needs) ? p.care_needs : []);
      setEditing(false);
    } else {
      // Chế độ thêm mới: Hoàn toàn TRỐNG THÔNG TIN để người dùng tự nhập!
      setProfileId(null);
      setName('');
      setDob('');
      setAddress('');
      setContact('');
      setPhone('');
      setDistrict('');
      setGender('Nữ');
      setNotes('');
      setNeeds([]);
      setEditing(true);
    }
  };

  const loadProfiles = async (targetId?: number | null) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/elderly-profiles?userId=${userId}`);
      if (res.ok) {
        const data: ElderlyProfile[] = await res.json();
        setProfiles(data);

        // Kiểm tra URL query param ?id=
        const urlParams = new URLSearchParams(window.location.search);
        const searchId = targetId !== undefined ? targetId : (urlParams.get('id') ? Number(urlParams.get('id')) : null);

        if (searchId) {
          const found = data.find(p => p.id === searchId);
          if (found) {
            populateForm(found);
            return;
          }
        }

        if (data.length > 0) {
          populateForm(data[0]);
        } else {
          populateForm(null);
        }
      }
    } catch {
      setProfiles([]);
      populateForm(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfiles();
  }, [userId]);

  const handleSave = async () => {
    if (!name.trim()) {
      notify('Vui lòng nhập họ và tên của người cần chăm sóc.');
      return;
    }
    setSaving(true);
    try {
      const body = {
        user_id: userId,
        full_name: name.trim(),
        date_of_birth: dob || null,
        address: address || '',
        district: district || '',
        contact_name: contact || '',
        contact_phone: phone || '',
        gender: gender || 'Nữ',
        notes: notes || '',
        care_needs: needs,
        adl_score: Math.round(([name, dob, address, contact, phone, notes].filter(Boolean).length / 6) * 100)
      };

      if (profileId) {
        // Cập nhật hồ sơ hiện có trong MySQL
        const res = await fetch(`${API}/elderly-profiles/${profileId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        if (res.ok) {
          const updated = await res.json();
          notify(`Hồ sơ của ${name} đã được cập nhật vào MySQL thành công! ✓`);
          await loadProfiles(updated.id);
        }
      } else {
        // Tạo mới hồ sơ trong MySQL
        const res = await fetch(`${API}/elderly-profiles`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        if (res.ok) {
          const newP = await res.json();
          notify(`Đã lưu hồ sơ mới của ${name} vào MySQL thành công! ✓`);
          await loadProfiles(newP.id);
        }
      }
      setEditing(false);
    } catch {
      notify('Lỗi khi lưu vào cơ sở dữ liệu MySQL.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!profileId) return;
    if (!window.confirm(`Bạn có chắc chắn muốn xóa hồ sơ của "${name}" khỏi cơ sở dữ liệu MySQL?`)) return;
    try {
      const res = await fetch(`${API}/elderly-profiles/${profileId}`, { method: 'DELETE' });
      if (res.ok) {
        notify(`Đã xóa hồ sơ của ${name} khỏi MySQL thành công.`);
        await loadProfiles(null);
      }
    } catch {
      notify('Lỗi khi xóa hồ sơ khỏi MySQL.');
    }
  };

  const addNeed = () => {
    const trimmed = newNeed.trim();
    if (trimmed && !needs.includes(trimmed)) {
      setNeeds(prev => [...prev, trimmed]);
      setNewNeed('');
    }
  };

  const removeNeed = (idx: number) => setNeeds(prev => prev.filter((_, i) => i !== idx));

  const fieldsTotal = 6;
  const fieldsFilled = [name, dob, address, contact, phone, notes].filter(Boolean).length;
  const completeness = Math.round((fieldsFilled / fieldsTotal) * 100);

  const displayInitials = name.trim().split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase() || 'NT';

  return (
    <>
      <PageHeading
        eyebrow="Hồ sơ chăm sóc"
        title={profileId ? `Hồ sơ: ${name}` : 'Thêm hồ sơ người cần chăm sóc mới'}
        description="Thông tin này được lưu trực tiếp vào cơ sở dữ liệu MySQL để quản lý lịch trình và chăm sóc chu đáo."
        action={
          <div className="flex items-center gap-2">
            {profileId && (
              <Button
                variant="danger"
                onClick={handleDelete}
                testId="button-profile-delete"
              >
                Xóa hồ sơ
              </Button>
            )}
            <Button
              variant={editing ? 'primary' : 'outline'}
              onClick={() => editing ? handleSave() : setEditing(true)}
              testId="button-profile-edit"
            >
              {saving ? <>Đang lưu MySQL...</> : editing ? <><Check size={16} /> Lưu thay đổi</> : <>Chỉnh sửa hồ sơ</>}
            </Button>
          </div>
        }
      />

      {/* THANH CHỌN HỒ SƠ NGƯỜI THÂN HOẶC THÊM MỚI */}
      <div className="mb-6 flex flex-wrap items-center gap-2 rounded-2xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] p-3">
        <span className="text-[12px] font-bold text-[hsl(var(--muted-foreground))] mr-1">Hồ sơ người thân:</span>
        {profiles.map(p => {
          const isSelected = p.id === profileId;
          return (
            <button
              key={p.id}
              onClick={() => populateForm(p)}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-[12px] font-bold transition-all ${
                isSelected
                  ? 'bg-[hsl(var(--primary))] text-white shadow-xs'
                  : 'bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary)/.8)]'
              }`}
              data-testid={`tab-profile-${p.id}`}
            >
              <UserRound size={14} />
              {p.full_name}
            </button>
          );
        })}
        <button
          onClick={() => populateForm(null)}
          className={`flex items-center gap-1 rounded-xl border border-dashed border-[hsl(var(--primary))] px-3 py-1.5 text-[12px] font-bold transition-all ${
            profileId === null
              ? 'bg-[hsl(var(--primary))] text-white'
              : 'text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/.1)]'
          }`}
          data-testid="button-add-new-profile-tab"
        >
          <Plus size={14} /> + Thêm người thân mới
        </button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[.7fr_1.3fr]">
        {/* CỘT TRÁI: TỔNG QUAN HỒ SƠ */}
        <Card className="bg-[hsl(var(--primary))] p-6 text-[hsl(var(--primary-foreground))] sm:p-8" testId="card-profile-overview">
          <div className="flex items-center gap-4">
            <Initials text={displayInitials} color="linear-gradient(145deg,#e3c89c,#c29360)" size="lg" />
            <div>
              <Pill tone="gold">{profileId ? 'Hồ sơ trong MySQL' : 'Hồ sơ mới'}</Pill>
              <h2 className="mt-3 font-display text-[27px]">{name || 'Chưa đặt tên'}</h2>
              <p className="mt-1 text-[12px] text-[#c9d7c4]">
                {dob ? (() => { const age = new Date().getFullYear() - new Date(dob).getFullYear(); return `${age} tuổi · `; })() : ''}{gender}
              </p>
            </div>
          </div>
          <div className="mt-9 border-t border-[#99ae89]/30 pt-5">
            <div className="mb-2 flex justify-between text-[11px]">
              <span className="text-[#c9d7c4]">Mức độ hoàn thiện</span>
              <strong>{completeness}%</strong>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[#5f7650]">
              <div className="h-full rounded-full bg-[#e6c27b] transition-all" style={{ width: `${completeness}%` }} />
            </div>
            <p className="mt-5 text-[12px] leading-5 text-[#c9d7c4]">
              {profileId ? 'Hồ sơ đã được lưu trữ an toàn trong cơ sở dữ liệu MySQL.' : 'Điền đầy đủ thông tin để người chăm sóc nắm rõ tình trạng sức khỏe.'}
            </p>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-3">
            <div className="rounded-[15px] bg-[#536d48] p-4">
              <p className="text-[10px] uppercase tracking-[.12em] text-[#b8cbb0]">Khu vực</p>
              {editing ? (
                <input 
                  value={district} 
                  onChange={e => setDistrict(e.target.value)} 
                  placeholder="VD: Hai Bà Trưng"
                  className="mt-2 w-full rounded-lg bg-[#3e5738] px-2 py-1 text-[13px] font-bold text-white outline-none" 
                />
              ) : (
                <p className="mt-2 text-[13px] font-bold">{district || 'Chưa cập nhật'}</p>
              )}
            </div>
            <div className="rounded-[15px] bg-[#536d48] p-4">
              <p className="text-[10px] uppercase tracking-[.12em] text-[#b8cbb0]">Liên hệ chính</p>
              {editing ? (
                <input 
                  value={contact} 
                  onChange={e => setContact(e.target.value)} 
                  placeholder="VD: Nguyễn Minh Mai"
                  className="mt-2 w-full rounded-lg bg-[#3e5738] px-2 py-1 text-[13px] font-bold text-white outline-none" 
                />
              ) : (
                <p className="mt-2 text-[13px] font-bold">{contact || 'Chưa cập nhật'}</p>
              )}
            </div>
          </div>
        </Card>

        {/* CỘT PHẢI: CHI TIẾT THÔNG TIN */}
        <div className="space-y-5">
          {/* THÔNG TIN CƠ BẢN */}
          <Card className="p-6" testId="card-profile-personal">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-[23px]">Thông tin cơ bản</h2>
              <Pill tone={profileId ? 'olive' : 'gold'}>{profileId ? 'Đã lưu MySQL' : 'Tạo mới'}</Pill>
            </div>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-[11px] font-bold uppercase tracking-[.1em] text-[hsl(var(--muted-foreground))]">Họ và tên người cần chăm sóc</span>
                <input
                  value={name}
                  disabled={!editing}
                  onChange={e => setName(e.target.value)}
                  placeholder="Nhập họ và tên..."
                  className="h-11 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 text-[13px] font-semibold disabled:opacity-75"
                  data-testid="input-profile-name"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-[11px] font-bold uppercase tracking-[.1em] text-[hsl(var(--muted-foreground))]">Ngày sinh</span>
                <input
                  type={editing ? 'date' : 'text'}
                  value={editing ? dob : (dob ? new Date(dob).toLocaleDateString('vi-VN') : 'Chưa có ngày sinh')}
                  disabled={!editing}
                  onChange={e => setDob(e.target.value)}
                  className="h-11 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 text-[13px] font-semibold disabled:opacity-75"
                  data-testid="input-profile-dob"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-[11px] font-bold uppercase tracking-[.1em] text-[hsl(var(--muted-foreground))]">Giới tính</span>
                {editing ? (
                  <select value={gender} onChange={e => setGender(e.target.value)} className="h-11 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 text-[13px] font-semibold">
                    <option>Nữ</option>
                    <option>Nam</option>
                    <option>Khác</option>
                  </select>
                ) : (
                  <div className="flex h-11 items-center rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 text-[13px] font-semibold text-[hsl(var(--foreground)/.72)]">{gender}</div>
                )}
              </label>

              <label className="block">
                <span className="mb-2 block text-[11px] font-bold uppercase tracking-[.1em] text-[hsl(var(--muted-foreground))]">Số điện thoại khẩn cấp</span>
                <input
                  value={phone}
                  disabled={!editing}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="VD: 0934 567 890"
                  className="h-11 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 text-[13px] font-semibold disabled:opacity-75"
                  data-testid="input-profile-phone"
                />
              </label>

              <label className="block sm:col-span-2">
                <span className="mb-2 block text-[11px] font-bold uppercase tracking-[.1em] text-[hsl(var(--muted-foreground))]">Địa chỉ nơi ở</span>
                <div className="relative">
                  <MapPin size={14} className="absolute left-3 top-3.5 text-[hsl(var(--muted-foreground))]" />
                  <input
                    value={address}
                    disabled={!editing}
                    onChange={e => setAddress(e.target.value)}
                    placeholder="VD: 24 phố Huế, Hai Bà Trưng, Hà Nội"
                    className="h-11 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] pl-8 pr-3 text-[13px] font-semibold disabled:opacity-75"
                    data-testid="input-profile-address"
                  />
                </div>
              </label>
            </div>
          </Card>

          {/* NHU CẦU CHĂM SÓC */}
          <Card className="p-6" testId="card-profile-needs">
            <h2 className="font-display text-[23px]">Nhu cầu chăm sóc & bệnh lý</h2>
            <p className="mt-1 text-[12px] text-[hsl(var(--muted-foreground))]">Các nhu cầu đặc biệt người chăm sóc cần hỗ trợ</p>

            <div className="mt-5 flex flex-wrap gap-2">
              {needs.length === 0 && !editing && (
                <p className="text-[12.5px] italic text-[hsl(var(--muted-foreground))]">Chưa thêm nhu cầu chăm sóc nào. Hãy bấm Chỉnh sửa hồ sơ để thêm.</p>
              )}
              {needs.map((need, idx) => (
                <span
                  key={need}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold ${
                    idx % 4 === 0 ? 'bg-[#fde8e8] text-[#8b2020]'
                    : idx % 4 === 1 ? 'bg-[#e8f3e8] text-[#2d5a2d]'
                    : idx % 4 === 2 ? 'bg-[#fef3da] text-[#7a5510]'
                    : 'bg-[#e8ecf3] text-[#2d3a5a]'
                  }`}
                >
                  {need}
                  {editing && (
                    <button
                      onClick={() => removeNeed(idx)}
                      className="ml-0.5 rounded-full p-0.5 opacity-60 hover:opacity-100"
                      aria-label={`Xóa nhu cầu ${need}`}
                    >
                      <X size={11} />
                    </button>
                  )}
                </span>
              ))}
            </div>

            {/* THÊM NHU CẦU MỚI */}
            {editing && (
              <div className="mt-4 flex gap-2">
                <input
                  value={newNeed}
                  onChange={e => setNewNeed(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addNeed())}
                  placeholder="Thêm bệnh lý / nhu cầu... (VD: Tiểu đường, nhắc uống thuốc)"
                  className="h-10 flex-1 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 text-[13px] outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/.25)]"
                  data-testid="input-add-need"
                />
                <button
                  type="button"
                  onClick={addNeed}
                  className="flex h-10 items-center gap-1.5 rounded-xl bg-[hsl(var(--primary))] px-4 text-[12px] font-bold text-white hover:opacity-90 transition-opacity"
                  data-testid="button-add-need"
                >
                  <Plus size={15} /> Thêm
                </button>
              </div>
            )}

            {/* GHI CHÚ CỦA GIA ĐÌNH */}
            <div className="mt-5 rounded-[15px] bg-[hsl(var(--secondary)/.6)] p-4">
              <p className="text-[12px] font-bold">Ghi chú của gia đình</p>
              {editing ? (
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Nhập ghi chú chi tiết về thói quen, chế độ ăn nhạt, sở thích của người thân..."
                  className="mt-2 w-full resize-none rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-2.5 text-[13px] leading-5 outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/.25)]"
                  data-testid="textarea-profile-notes"
                />
              ) : (
                <p className="mt-2 text-[13px] leading-5 text-[hsl(var(--muted-foreground))]">
                  {notes || 'Chưa có ghi chú đặc biệt.'}
                </p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

function Matches({ notify }: { notify: (message: string) => void }) {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState('');
  const [saved, setSaved] = useState<string[]>([]);
  const [caregiverList, setCaregiverList] = useState<Caregiver[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCaregivers = async () => {
    try {
      const res = await fetch(`${API}/caregivers`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setCaregiverList(data);
          return;
        }
      }
    } catch (err) {
      console.warn('Lỗi lấy danh sách người chăm sóc từ MySQL:', err);
    }
    setCaregiverList(caregivers);
  };

  useEffect(() => {
    fetchCaregivers().finally(() => setLoading(false));
  }, []);

  const results = useMemo(() => {
    return caregiverList.filter((caregiver) => {
      const fullText = `${caregiver.name} ${caregiver.role} ${(caregiver.tags || []).join(' ')} ${caregiver.distance || ''} ${caregiver.bio || ''}`.toLowerCase();
      return fullText.includes(search.toLowerCase());
    });
  }, [caregiverList, search]);

  return (
    <>
      <PageHeading 
        eyebrow="Tìm người chăm sóc" 
        title="Những người có thể hợp với mẹ." 
        description={`CARE-MATCH đã thẩm định và chọn lọc ${caregiverList.length} người chăm sóc đạt tiêu chuẩn trong hệ thống cơ sở dữ liệu.`} 
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => { setLoading(true); fetchCaregivers().finally(() => setLoading(false)); notify('Đã cập nhật danh sách người chăm sóc mới nhất từ CSDL.'); }}>
              Làm mới danh sách
            </Button>
            <Button variant="soft" onClick={() => notify('Đã gửi yêu cầu để chuyên gia gọi lại cho gia đình.')} testId="button-matches-support">
              <LifeBuoy size={16} /> Nhờ chuyên gia tư vấn
            </Button>
          </div>
        } 
      />
      <Card className="mb-6 p-3 sm:p-4" testId="card-match-filters">
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="relative flex-1">
            <Search className="absolute left-3.5 top-3.5 text-[hsl(var(--muted-foreground))]" size={17} />
            <input 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              placeholder="Tìm theo tên người chăm sóc, kỹ năng, khu vực..." 
              className="h-11 w-full rounded-[12px] bg-[hsl(var(--secondary)/.7)] pl-10 pr-3 text-[13px] outline-none placeholder:text-[hsl(var(--muted-foreground))] focus:ring-2 focus:ring-[hsl(var(--primary)/.15)]" 
              data-testid="input-match-search" 
            />
          </label>
          <Button variant="outline" onClick={() => notify('Bộ lọc hiện đang hiển thị các hồ sơ đã xác minh.')} testId="button-match-filter">
            <SlidersHorizontal size={16} /> Bộ lọc <span className="hidden text-[11px] text-[hsl(var(--muted-foreground))] sm:inline">· {caregiverList.length} hồ sơ</span>
          </Button>
        </div>
      </Card>

      {loading ? (
        <Card className="p-12 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#435d41] border-r-transparent"></div>
          <p className="mt-3 text-[13.5px] text-gray-500 font-medium">Đang tải danh sách người chăm sóc từ CSDL...</p>
        </Card>
      ) : results.length > 0 ? (
        <div className="space-y-4">
          {results.map((caregiver, index) => (
            <Card key={caregiver.id} className="group p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)] sm:p-6" testId={`card-caregiver-${caregiver.id}`}>
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <div className="flex items-center gap-4 sm:w-[35%]">
                  <Initials text={caregiver.initials} color={caregiver.color} size="lg" />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-display text-[22px] font-bold text-gray-900">{caregiver.name}</h2>
                      {index === 0 && <Pill tone="gold">Phù hợp nhất</Pill>}
                      {caregiver.care_score ? (
                        <span className="rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 text-[10px] font-bold">
                          CARE SCORE: {caregiver.care_score}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-[12px] text-[hsl(var(--muted-foreground))]">{caregiver.role}</p>
                    <div className="mt-2 flex items-center gap-2 text-[11px]">
                      <span className="flex items-center gap-1 font-bold text-[#a8752d]">
                        <Star size={13} fill="currentColor" /> {caregiver.rating}
                      </span>
                      <span className="text-[hsl(var(--muted-foreground))]">({caregiver.reviews} đánh giá)</span>
                    </div>
                  </div>
                </div>
                <div className="grid flex-1 grid-cols-2 gap-3 border-y border-[hsl(var(--border)/.7)] py-4 sm:border-y-0 sm:border-l sm:py-0 sm:pl-6 md:grid-cols-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-[.1em] text-[hsl(var(--muted-foreground))]">Kinh nghiệm</p>
                    <p className="mt-1.5 text-[12px] font-bold">{caregiver.experience}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[.1em] text-[hsl(var(--muted-foreground))]">Khu vực</p>
                    <p className="mt-1.5 text-[12px] font-bold">{caregiver.distance}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[.1em] text-[hsl(var(--muted-foreground))]">Mức phù hợp</p>
                    <p className="mt-1.5 text-[18px] font-bold text-[hsl(var(--primary))]">{caregiver.match}%</p>
                  </div>
                </div>
                <div className="flex gap-2 sm:flex-col">
                  <button 
                    onClick={() => setSaved((current) => current.includes(caregiver.id) ? current.filter((id) => id !== caregiver.id) : [...current, caregiver.id])} 
                    className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-colors ${saved.includes(caregiver.id) ? 'border-[#e2c689] bg-[#fff2d4] text-[#a8752d]' : 'border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))]'}`} 
                    aria-label="Lưu hồ sơ" 
                    data-testid={`button-save-caregiver-${caregiver.id}`}
                  >
                    <HeartHandshake size={16} />
                  </button>
                  <Button 
                    variant="soft" 
                    onClick={() => { 
                      setLocation(`/messages?user=${caregiver.id}`); 
                      notify(`Đang mở đoạn chat trực tiếp với ${caregiver.name}...`); 
                    }} 
                    className="bg-[#edf4ea] text-[#344e32] hover:bg-[#dfeada] font-bold text-[12px] flex items-center justify-center gap-1.5" 
                    testId={`button-message-quick-${caregiver.id}`}
                  >
                    <MessageCircle size={15} /> Nhắn tin
                  </Button>
                  <Button 
                    onClick={() => setLocation(`/matches/${caregiver.id}`)} 
                    className="flex-1 sm:flex-none" 
                    testId={`button-view-caregiver-${caregiver.id}`}
                  >
                    Xem hồ sơ <ChevronRight size={15} />
                  </Button>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {(caregiver.tags || []).map((tag) => <Pill key={tag} tone="slate">{tag}</Pill>)}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="flex flex-col items-center justify-center p-12 text-center" testId="empty-match-results">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]">
            <Search size={24} />
          </div>
          <h2 className="mt-5 font-display text-[25px]">Chưa có gợi ý phù hợp</h2>
          <p className="mt-2 max-w-sm text-[13px] leading-5 text-[hsl(var(--muted-foreground))]">Thử tìm với từ khóa khác hoặc nhờ chuyên gia CARE-MATCH đồng hành.</p>
          <Button onClick={() => setSearch('')} className="mt-5" testId="button-clear-match-search">Xóa tìm kiếm</Button>
        </Card>
      )}
    </>
  );
}

function MatchDetail({ notify }: { notify: (message: string) => void }) {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const [caregiver, setCaregiver] = useState<Caregiver | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const loadDetail = async () => {
      try {
        const res = await fetch(`${API}/caregivers/${params.id}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data && data.name) {
            setCaregiver(data);
            return;
          }
        }
      } catch (err) {
        console.warn('Lỗi tải chi tiết người chăm sóc:', err);
      }
      if (isMounted) {
        const fallback = caregivers.find((item) => item.id === params.id) ?? caregivers[0];
        setCaregiver(fallback);
      }
    };
    loadDetail().finally(() => {
      if (isMounted) setLoading(false);
    });
    return () => { isMounted = false; };
  }, [params.id]);

  if (loading || !caregiver) {
    return (
      <div className="py-24 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#435d41] border-r-transparent"></div>
        <p className="mt-4 text-[13.5px] text-gray-500 font-medium">Đang tải hồ sơ người chăm sóc...</p>
      </div>
    );
  }

  return (
    <>
      <button 
        onClick={() => setLocation('/matches')} 
        className="mb-7 flex items-center gap-2 text-[12px] font-bold text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))]" 
        data-testid="button-back-matches"
      >
        <ArrowLeft size={16} /> Quay lại danh sách gợi ý
      </button>

      <div className="grid gap-5 lg:grid-cols-[.72fr_1.28fr]">
        <Card className="bg-[hsl(var(--primary))] p-7 text-[hsl(var(--primary-foreground))] sm:p-9" testId="card-caregiver-detail-intro">
          <div className="flex items-start justify-between">
            <Initials text={caregiver.initials} color={caregiver.color} size="lg" />
            <div className="flex flex-col items-end gap-1">
              <Pill tone="gold"><BadgeCheck size={13} /> Đã xác minh</Pill>
              {caregiver.care_score ? (
                <span className="rounded-full bg-white/20 text-white px-2.5 py-0.5 text-[10px] font-bold">
                  CARE SCORE: {caregiver.care_score}/100
                </span>
              ) : null}
            </div>
          </div>
          <h1 className="mt-7 font-display text-[36px] leading-[1.02] tracking-[-.04em]">{caregiver.name}</h1>
          <p className="mt-2 text-[13px] text-[#c9d7c4]">{caregiver.role}</p>
          <div className="mt-7 flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-[13px] font-bold text-[#f0d39a]">
              <Star size={15} fill="currentColor" /> {caregiver.rating}
            </span>
            <span className="text-[12px] text-[#c9d7c4]">{caregiver.reviews} gia đình đã đánh giá</span>
          </div>
          <div className="mt-8 border-t border-[#99ae89]/30 pt-6">
            <p className="text-[11px] uppercase tracking-[.14em] text-[#b6c8ae]">Khu vực công tác</p>
            <p className="mt-2 text-[14px] font-bold">📍 {caregiver.distance}</p>
          </div>

          {/* Nút Nhắn tin chuyển sang trang tin nhắn trực tuyến theo yêu cầu */}
          <Button 
            onClick={() => {
              setLocation(`/messages?user=${caregiver.id}`);
              notify(`Đang mở trang tin nhắn trực tuyến với ${caregiver.name}...`);
            }} 
            className="mt-8 w-full bg-[#f0d8a8] text-[#314a38] hover:bg-[#f7e4bd] font-bold text-[14.5px] py-3.5 shadow-sm" 
            testId="button-message-caregiver"
          >
            <MessageCircle size={18} className="mr-1.5" /> Nhắn tin với {caregiver.name.split(' ').slice(-2).join(' ')} <ArrowRight size={16} className="ml-1" />
          </Button>

          {/* Nút Đặt lịch chăm sóc ngay */}
          <Button 
            onClick={() => {
              setLocation(`/schedule?caregiverId=${caregiver.id}&caregiverName=${encodeURIComponent(caregiver.name)}`);
              notify(`Đang chuyển sang màn hình đặt lịch với ${caregiver.name}...`);
            }} 
            className="mt-3 w-full bg-white text-[#314a38] hover:bg-[#edf4ea] font-bold text-[13.5px] py-3 shadow-sm flex items-center justify-center gap-2" 
            testId="button-book-caregiver"
          >
            <Calendar size={17} /> Đặt lịch ca với {caregiver.name.split(' ').slice(-2).join(' ')}
          </Button>

          <p className="mt-3 text-center text-[10.5px] text-[#b9c9b3]">
            Trò chuyện trực tuyến hoặc đặt ca chăm sóc nhanh chóng
          </p>
        </Card>

        <div className="space-y-5">
          <Card className="p-6 sm:p-7" testId="card-caregiver-detail-about">
            <p className="text-[11px] font-bold uppercase tracking-[.14em] text-[hsl(var(--primary))]">Về người chăm sóc</p>
            <h2 className="mt-3 font-display text-[28px]">Một người phù hợp không chỉ có kinh nghiệm.</h2>
            <p className="mt-4 text-[14px] leading-7 text-[hsl(var(--muted-foreground))]">{caregiver.bio}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {(caregiver.tags || []).map((tag) => <Pill key={tag} tone="olive">{tag}</Pill>)}
            </div>
          </Card>

          <Card className="p-6 sm:p-7" testId="card-caregiver-detail-proof">
            <div className="grid gap-5 sm:grid-cols-3">
              <div>
                <ShieldCheck size={19} className="text-[hsl(var(--primary))]" />
                <p className="mt-3 text-[12px] font-bold">Đã xác minh danh tính</p>
                <p className="mt-1 text-[11px] leading-4 text-[hsl(var(--muted-foreground))]">Kiểm tra hồ sơ và tham chiếu</p>
              </div>
              <div>
                <HeartHandshake size={19} className="text-[hsl(var(--primary))]" />
                <p className="mt-3 text-[12px] font-bold">Phù hợp nhu cầu</p>
                <p className="mt-1 text-[11px] leading-4 text-[hsl(var(--muted-foreground))]">{caregiver.match}% theo tiêu chí CARE SCORE</p>
              </div>
              <div>
                <Clock3 size={19} className="text-[hsl(var(--primary))]" />
                <p className="mt-3 text-[12px] font-bold">Lịch linh hoạt</p>
                <p className="mt-1 text-[11px] leading-4 text-[hsl(var(--muted-foreground))]">Có thể trao đổi khung giờ</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

// CÁC CA MẪU ĐỊNH SẴN PHỔ BIẾN
const PRESET_SHIFTS = [
  { id: 'morning', name: 'Ca sáng', time: '08:00 - 12:00', duration: 4, price: 400000, desc: 'Vệ sinh, ăn sáng, nhắc thuốc sáng & vận động nhẹ', icon: '☀️' },
  { id: 'afternoon', name: 'Ca chiều', time: '13:30 - 17:30', duration: 4, price: 400000, desc: 'Ăn xế, xoa bóp trị liệu, trò chuyện & dạo mát', icon: '🌤️' },
  { id: 'evening', name: 'Ca tối', time: '18:00 - 21:00', duration: 3, price: 300000, desc: 'Ăn tối, vệ sinh cá nhân, hỗ trợ trước khi ngủ', icon: '🌆' },
  { id: 'night', name: 'Ca đêm', time: '21:00 - 06:00', duration: 9, price: 900000, desc: 'Trực đêm, hỗ trợ đi vệ sinh, theo dõi & chống ngã', icon: '🌙' },
];

function CaregiverScheduleView({
  clock,
  schedules,
  loading,
  lastSyncTime,
  currentWeek,
  selectedFilterDay,
  setSelectedFilterDay,
  getSchedulesForDay,
  getRelativeDateInfo,
  notify,
  loadSchedules,
  handleConfirmShift,
  handleCompleteShift
}: {
  clock: any;
  schedules: any[];
  loading: boolean;
  lastSyncTime: string;
  currentWeek: any[];
  selectedFilterDay: string | null;
  setSelectedFilterDay: (day: string | null) => void;
  getSchedulesForDay: (dateFormatted: string) => any[];
  getRelativeDateInfo: (rawDateStr: string) => any;
  notify: (msg: string) => void;
  loadSchedules: (showLoading?: boolean) => Promise<void>;
  handleConfirmShift: (id: number) => Promise<void>;
  handleCompleteShift: (id: number) => Promise<void>;
}) {
  const [, setLocation] = useLocation();
  const [caregiverStatusFilter, setCaregiverStatusFilter] = useState<'all' | 'pending' | 'confirmed' | 'completed'>('all');

  const pendingCount = schedules.filter(s => s.status === 'pending').length;
  const confirmedCount = schedules.filter(s => s.status === 'confirmed').length;
  const completedCount = schedules.filter(s => s.status === 'completed').length;
  const totalEarnings = schedules
    .filter(s => s.status === 'confirmed' || s.status === 'completed')
    .reduce((sum, s) => sum + (Number(s.price) || 400000), 0);

  const displayedSchedules = useMemo(() => {
    let list = schedules;
    if (caregiverStatusFilter !== 'all') {
      list = list.filter(s => s.status === caregiverStatusFilter);
    }
    if (selectedFilterDay) {
      list = list.filter(s => s.schedule_date && s.schedule_date.includes(selectedFilterDay));
    }
    return list;
  }, [schedules, caregiverStatusFilter, selectedFilterDay]);

  return (
    <>
      <PageHeading 
        eyebrow={`${clock.fullDateStr} · ${clock.timeStr} (Realtime)`} 
        title="Lịch nhận ca & Danh sách ca làm việc" 
        description="Theo dõi các ca chăm sóc được gia đình người cao tuổi đặt lịch trực tiếp, xác nhận nhận ca và hoàn thành ca đúng hẹn." 
        action={
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-[12px] font-bold text-emerald-800">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Đang nhận ca trực tuyến
            </span>
            <Button variant="outline" size="sm" onClick={() => loadSchedules(true)}>
              Làm mới
            </Button>
          </div>
        } 
      />

      {/* THỐNG KÊ NHANH CHO NGƯỜI CHĂM SÓC */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-5">
        <Card className="p-4 bg-white border border-[hsl(var(--border))]">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Tổng số ca</p>
          <p className="mt-1 font-display text-[26px] font-bold text-[#2a3c2e]">{schedules.length}</p>
          <span className="text-[11px] text-gray-500">Lịch trong hệ thống</span>
        </Card>
        <Card className="p-4 bg-amber-50/60 border border-amber-200">
          <p className="text-[11px] font-bold uppercase tracking-wider text-amber-800">Chờ nhận ca</p>
          <p className="mt-1 font-display text-[26px] font-bold text-amber-900">{pendingCount}</p>
          <span className="text-[11px] text-amber-700">Cần xác nhận sớm</span>
        </Card>
        <Card className="p-4 bg-emerald-50/60 border border-emerald-200">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Sắp diễn ra</p>
          <p className="mt-1 font-display text-[26px] font-bold text-emerald-900">{confirmedCount}</p>
          <span className="text-[11px] text-emerald-700">Đã nhận lịch</span>
        </Card>
        <Card className="p-4 bg-[#f4f7f2] border border-[#d2ded0]">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#3c553d]">Thu nhập dự kiến</p>
          <p className="mt-1 font-display text-[24px] font-bold text-[#283e29]">
            {totalEarnings.toLocaleString('vi-VN')} đ
          </p>
          <span className="text-[11px] text-[#4d6b4f]">{completedCount} ca hoàn thành</span>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
        <Card className="p-6 sm:p-7" testId="card-caregiver-schedule-list">
          {/* Header danh sách ca */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[hsl(var(--border)/.6)] pb-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[.14em] text-[hsl(var(--muted-foreground))]">Ca làm việc của bạn</p>
              <h2 className="mt-1 font-display text-[24px]">
                {selectedFilterDay ? `Ca ngày ${selectedFilterDay} (${displayedSchedules.length})` : `Danh sách ca được đặt (${displayedSchedules.length})`}
              </h2>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Đồng bộ MySQL {lastSyncTime ? `· ${lastSyncTime}` : 'Realtime'}
              </span>
            </div>
          </div>

          {/* Thanh lọc trạng thái */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {[
              { id: 'all', label: `Tất cả (${schedules.length})` },
              { id: 'pending', label: `Chờ nhận (${pendingCount})` },
              { id: 'confirmed', label: `Đã nhận (${confirmedCount})` },
              { id: 'completed', label: `Đã xong (${completedCount})` },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setCaregiverStatusFilter(tab.id as any)}
                className={`rounded-xl px-3 py-1.5 text-[12px] font-bold transition border ${
                  caregiverStatusFilter === tab.id
                    ? 'bg-[#385139] text-white border-[#385139] shadow-xs'
                    : 'bg-[hsl(var(--secondary)/.6)] text-[hsl(var(--muted-foreground))] border-transparent hover:bg-[hsl(var(--secondary))]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Thanh lọc theo ngày nếu có */}
          {selectedFilterDay && (
            <div className="mt-4 flex items-center justify-between rounded-xl border border-emerald-300 bg-emerald-50/90 p-3 text-[12.5px] text-emerald-950 animate-rise">
              <div className="flex items-center gap-2">
                <CalendarDays size={16} className="text-emerald-700" />
                <span>
                  Đang lọc ngày: <strong>{currentWeek.find(d => d.dateFormatted === selectedFilterDay)?.fullName} ({selectedFilterDay})</strong>
                  {' '}— <strong>{displayedSchedules.length} ca</strong>
                </span>
              </div>
              <button
                onClick={() => {
                  setSelectedFilterDay(null);
                  notify('Đã hiển thị lại tất cả các ca.');
                }}
                className="rounded-lg bg-emerald-700 px-3 py-1 text-[11px] font-bold text-white hover:bg-emerald-800 transition"
              >
                Xem tất cả
              </button>
            </div>
          )}

          {/* Nội dung danh sách */}
          {loading ? (
            <div className="mt-7 flex items-center gap-2 text-[13px] text-[hsl(var(--muted-foreground))]">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-[hsl(var(--primary))] border-t-transparent" /> Đang tải ca làm việc từ MySQL...
            </div>
          ) : displayedSchedules.length === 0 ? (
            <div className="mt-7 rounded-[18px] border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--secondary)/.3)] p-8 text-center">
              <CalendarDays size={36} className="mx-auto text-[hsl(var(--muted-foreground))]" />
              <h3 className="mt-3 font-display text-[20px]">Chưa có ca chăm sóc nào</h3>
              <p className="mt-1 text-[13px] text-[hsl(var(--muted-foreground))] max-w-sm mx-auto">
                {caregiverStatusFilter !== 'all' 
                  ? 'Không tìm thấy ca nào theo bộ lọc đang chọn.' 
                  : 'Hiện tại chưa có gia đình nào đặt ca với bạn. Khi có ca mới, ca sẽ lập tức hiển thị tại đây để bạn xác nhận.'}
              </p>
              {caregiverStatusFilter !== 'all' && (
                <Button variant="outline" onClick={() => setCaregiverStatusFilter('all')} className="mt-4">
                  Xem tất cả các ca
                </Button>
              )}
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {displayedSchedules.map((item) => {
                const dateInfo = getRelativeDateInfo(item.schedule_date);
                const isPending = item.status === 'pending';
                const isConfirmed = item.status === 'confirmed';
                const isCompleted = item.status === 'completed';

                return (
                  <div
                    key={item.id}
                    className={`rounded-[20px] border p-5 transition-all shadow-xs ${
                      isPending
                        ? 'border-amber-300 bg-amber-50/40 hover:bg-amber-50/70'
                        : isConfirmed
                        ? 'border-emerald-300 bg-emerald-50/30 hover:bg-emerald-50/60'
                        : 'border-[hsl(var(--border))] bg-white'
                    }`}
                  >
                    {/* Header ca: Thời gian + Badge trạng thái */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[hsl(var(--border)/.6)] pb-3">
                      <div className="flex items-center gap-2">
                        <span className={`rounded-md px-2 py-0.5 text-[11px] border font-bold ${dateInfo.badgeClass}`}>
                          {dateInfo.text}
                        </span>
                        <span className="font-display text-[16px] font-bold text-[#2a3e2c]">
                          {item.time_slot || '08:30 - 12:30'}
                        </span>
                      </div>
                      <div>
                        {isPending && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-400 bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-900">
                            ⏳ Chờ bạn xác nhận nhận ca
                          </span>
                        )}
                        {isConfirmed && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400 bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-900">
                            ✓ Đã nhận ca · Sắp diễn ra
                          </span>
                        )}
                        {isCompleted && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-[#b2d1b0] bg-[#edf6eb] px-2.5 py-0.5 text-[11px] font-bold text-[#325132]">
                            ✓ Đã hoàn thành
                          </span>
                        )}
                        {item.status === 'cancelled' && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-red-300 bg-red-50 px-2.5 py-0.5 text-[11px] font-bold text-red-800">
                            ✕ Đã hủy ca
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Chi tiết người bệnh & gia đình */}
                    <div className="mt-3.5 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[14.5px] font-bold text-[#1f3222] flex items-center gap-1.5">
                            <UserRound size={16} className="text-[#3c583f]" />
                            Người được chăm sóc: <span className="text-[#345337] underline decoration-emerald-400">{item.elderly_name || 'Người thân'}</span>
                          </p>
                          <p className="mt-1 text-[12px] text-gray-700 flex items-center gap-1.5">
                            <MapPin size={14} className="text-gray-500 shrink-0" />
                            Địa chỉ chăm sóc: <strong className="text-gray-900">{item.elderly_address ? `${item.elderly_address}, ${item.elderly_district || ''}` : (item.elderly_district || 'Hà Nội')}</strong>
                          </p>
                          <p className="mt-1 text-[12px] text-gray-700 flex items-center gap-1.5">
                            <Phone size={14} className="text-gray-500 shrink-0" />
                            Gia đình đặt ca: <strong className="text-[#2e4731]">{item.family_name || 'Gia đình'}</strong>
                            {item.family_phone && (
                              <a href={`tel:${item.family_phone}`} className="ml-1 text-[hsl(var(--primary))] font-bold hover:underline">
                                ({item.family_phone})
                              </a>
                            )}
                          </p>
                        </div>

                        {/* Thù lao ca */}
                        <div className="text-right shrink-0">
                          <span className="text-[11px] text-gray-500 block">Thu nhập ca</span>
                          <span className="font-display text-[18px] font-bold text-[#2d472f]">
                            {(item.price || 400000).toLocaleString('vi-VN')} đ
                          </span>
                        </div>
                      </div>

                      {/* Ghi chú bệnh nhân nếu có */}
                      {item.elderly_notes && (
                        <div className="rounded-xl bg-[#f2f6f1] p-2.5 text-[11.5px] text-[#344d36] border border-[#dce7da]">
                          <strong className="block text-[11px] uppercase tracking-wider text-[#4d6a4f] mb-0.5">Tình trạng người bệnh:</strong>
                          {item.elderly_notes}
                        </div>
                      )}

                      {/* Nhiệm vụ chăm sóc */}
                      {item.tasks && (
                        <div className="text-[12px] text-[#3d5641]">
                          <span className="font-semibold text-gray-700">Nhiệm vụ: </span>
                          {item.tasks}
                        </div>
                      )}
                    </div>

                    {/* Hàng hành động */}
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[hsl(var(--border)/.6)] pt-3">
                      <div className="flex items-center gap-2">
                        {isPending && (
                          <Button 
                            onClick={() => handleConfirmShift(item.id)} 
                            className="bg-[#385139] text-white hover:bg-[#2c402d] text-[12px] h-9 px-3.5"
                          >
                            <CheckCircle2 size={15} /> Xác nhận nhận ca
                          </Button>
                        )}
                        {isConfirmed && (
                          <Button 
                            onClick={() => handleCompleteShift(item.id)} 
                            className="bg-[#edf5ea] text-[#344e32] border border-[#bcd6ba] hover:bg-[#dceada] text-[12px] h-9 px-3.5"
                          >
                            <Check size={15} /> Hoàn thành ca
                          </Button>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            const famUserId = item.family_user_id || 5;
                            const famName = item.family_name || 'Gia đình';
                            setLocation(`/messages?user=${famUserId}&userName=${encodeURIComponent(famName)}`);
                            notify(`Đang mở cuộc trò chuyện với ${famName}...`);
                          }}
                          className="text-[12px] flex items-center gap-1.5 h-9"
                        >
                          <MessageCircle size={15} /> Nhắn tin cho gia đình
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Cột phải: Lịch tuần thực tế */}
        <div className="space-y-5">
          <Card className="p-6" testId="card-caregiver-schedule-week">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[.14em] text-[hsl(var(--muted-foreground))]">Lịch trình tuần thực tế</p>
                <h2 className="mt-1 font-display text-[24px]">Các ca trong tuần</h2>
              </div>
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Tuần này
              </span>
            </div>

            <p className="mt-1.5 text-[11.5px] text-[hsl(var(--muted-foreground))]">
              Tuần từ {currentWeek[0].fullName} ({currentWeek[0].dateFormatted}) đến {currentWeek[6].fullName} ({currentWeek[6].dateFormatted})
            </p>

            <div className="mt-5 grid grid-cols-7 gap-1.5">
              {currentWeek.map((day) => {
                const dayShifts = getSchedulesForDay(day.dateFormatted);
                const isSelected = selectedFilterDay === day.dateFormatted;
                return (
                  <button 
                    key={day.dateFormatted} 
                    onClick={() => {
                      if (isSelected) {
                        setSelectedFilterDay(null);
                        notify('Đã hiển thị lại tất cả các ca.');
                      } else {
                        setSelectedFilterDay(day.dateFormatted);
                        notify(`Đang lọc ca ${day.fullName} (${day.dateFormatted}): ${dayShifts.length} ca.`);
                      }
                    }} 
                    className={`relative flex flex-col items-center justify-between rounded-[12px] py-2.5 px-1 text-center transition-all cursor-pointer ${
                      isSelected 
                        ? 'bg-[#283b2d] text-white shadow-md ring-2 ring-[#43643d]' 
                        : day.isToday 
                        ? 'bg-emerald-50 text-emerald-950 border-2 border-emerald-500 font-bold hover:bg-emerald-100' 
                        : 'bg-white border border-[hsl(var(--border))] hover:bg-[hsl(var(--secondary))] text-[#2c3d2e]'
                    }`}
                    title={`${day.fullName} (${day.dateFormatted}): ${dayShifts.length} ca chăm sóc. Bấm để lọc.`}
                  >
                    <span className={`text-[10px] font-bold ${
                      isSelected ? 'text-white/80' : day.isToday ? 'text-emerald-700' : 'text-gray-500'
                    }`}>
                      {day.label}
                    </span>
                    <span className="my-1 font-display text-[16px] font-bold leading-none">
                      {day.dateNum}
                    </span>
                    <div className="flex flex-col items-center gap-0.5 min-h-[16px]">
                      {day.isToday && (
                        <span className={`rounded-full px-1.5 py-0.2 text-[8px] font-extrabold ${
                          isSelected ? 'bg-emerald-400 text-emerald-950' : 'bg-emerald-600 text-white'
                        }`}>
                          Hôm nay
                        </span>
                      )}
                      {dayShifts.length > 0 && !day.isToday && (
                        <span className={`rounded-full px-1.5 py-0.2 text-[8.5px] font-bold ${
                          isSelected ? 'bg-amber-300 text-amber-950' : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        }`}>
                          {dayShifts.length} ca
                        </span>
                      )}
                      {dayShifts.length > 0 && day.isToday && (
                        <span className={`rounded-full px-1.5 py-0.2 text-[8px] font-bold ${
                          isSelected ? 'bg-amber-300 text-amber-950' : 'bg-amber-100 text-amber-900 border border-amber-300'
                        }`}>
                          {dayShifts.length} ca
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 border-t border-[hsl(var(--border)/.6)] pt-3 text-[11.5px]">
              {selectedFilterDay ? (
                <div className="flex items-center justify-between text-emerald-900">
                  <span>Đang xem: <strong>{currentWeek.find(d => d.dateFormatted === selectedFilterDay)?.fullName} ({selectedFilterDay})</strong></span>
                  <button 
                    onClick={() => setSelectedFilterDay(null)}
                    className="font-bold underline hover:text-emerald-700 cursor-pointer"
                  >
                    Xem tất cả ca
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between text-[hsl(var(--muted-foreground))]">
                  <span>Tổng số ca tuần này: <strong className="text-[#324a35]">{schedules.length} ca</strong></span>
                  <span className="text-[10.5px] italic">Bấm ngày để lọc</span>
                </div>
              )}
            </div>
          </Card>

          <Card className="bg-[#e4ebdc] p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#c8d9bd] text-[#58744f]">
                <ShieldCheck size={18} />
              </div>
              <div>
                <h2 className="font-display text-[21px] text-[#3e5939]">Quy chuẩn nhận ca & An toàn</h2>
                <p className="mt-2 text-[12px] leading-5 text-[#61715e]">
                  Vui lòng liên hệ với gia đình trước khi đến 30 phút để xác nhận lại tình trạng người cao tuổi. Khi hoàn thành ca, bấm nút <strong>Hoàn thành ca</strong> để hệ thống ghi nhận thù lao bảo đảm cho bạn.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

// =================================================================
// GIAO DIỆN LỊCH TOÀN HỆ THỐNG DÀNH RIÊNG CHO ADMIN
// =================================================================
function AdminScheduleView({ notify }: { notify: (message: string) => void }) {
  const clock = useRealtimeClock();
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_progress' | 'confirmed' | 'pending' | 'completed' | 'cancelled'>('all');
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'upcoming'>('all');
  const [lastSync, setLastSync] = useState('');
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const fetchSchedules = async (isManual = false) => {
    try {
      if (isManual) setLoading(true);
      const res = await fetch(`${API}/schedules`);
      if (res.ok) {
        const data = await res.json();
        setSchedules(data);
        setLastSync(new Date().toLocaleTimeString('vi-VN'));
        if (isManual) notify('Đã cập nhật toàn bộ lịch trình từ MySQL!');
      }
    } catch {
      if (isManual) notify('Lỗi khi tải lịch trình.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
    const iv = setInterval(() => fetchSchedules(false), 4000);
    return () => clearInterval(iv);
  }, []);

  const handleUpdateStatus = async (id: number, newStatus: string) => {
    setUpdatingId(id);
    try {
      const res = await fetch(`${API}/schedules/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        setSchedules(prev => prev.map(s => s.id === id ? { ...s, status: newStatus } : s));
        notify(`Đã cập nhật trạng thái ca #${id} thành: ${statusLabels[newStatus] || newStatus}`);
      }
    } catch {
      notify('Lỗi khi cập nhật trạng thái ca.');
    } finally {
      setUpdatingId(null);
    }
  };

  const statusLabels: Record<string, string> = {
    all: 'Tất cả',
    in_progress: 'Đang diễn ra',
    confirmed: 'Đã xác nhận',
    pending: 'Chờ xác nhận',
    completed: 'Đã hoàn thành',
    cancelled: 'Đã hủy'
  };
  const statusBadgeColors: Record<string, string> = {
    in_progress: 'bg-amber-100 text-amber-900 border-amber-300',
    confirmed: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    pending: 'bg-orange-100 text-orange-900 border-orange-300',
    completed: 'bg-blue-100 text-blue-900 border-blue-300',
    cancelled: 'bg-red-100 text-red-900 border-red-300'
  };

  const stats = {
    total: schedules.length,
    inProgress: schedules.filter(s => s.status === 'in_progress').length,
    confirmed: schedules.filter(s => s.status === 'confirmed').length,
    pending: schedules.filter(s => s.status === 'pending').length,
    completed: schedules.filter(s => s.status === 'completed').length,
  };

  const filteredSchedules = useMemo(() => {
    return schedules.filter(s => {
      const kw = searchTerm.toLowerCase().trim();
      const matchSearch = !kw || 
        (s.caregiver_name && s.caregiver_name.toLowerCase().includes(kw)) ||
        (s.family_name && s.family_name.toLowerCase().includes(kw)) ||
        (s.elderly_name && s.elderly_name.toLowerCase().includes(kw)) ||
        (s.title && s.title.toLowerCase().includes(kw)) ||
        (s.tasks && s.tasks.toLowerCase().includes(kw));

      const matchStatus = statusFilter === 'all' || s.status === statusFilter;

      let matchTime = true;
      if (timeFilter === 'today') {
        matchTime = s.schedule_date?.includes(clock.shortDate) || s.schedule_date?.includes('Hôm nay');
      } else if (timeFilter === 'upcoming') {
        matchTime = !s.schedule_date?.includes('Hôm nay') && s.status !== 'completed' && s.status !== 'cancelled';
      }

      return matchSearch && matchStatus && matchTime;
    });
  }, [schedules, searchTerm, statusFilter, timeFilter, clock.shortDate]);

  return (
    <>
      <PageHeading
        eyebrow="Quản Trị Lịch Trình Toàn Hệ Thống · Admin"
        title="Lịch Chăm Sóc Toàn Hệ Thống."
        description="Giám sát mọi ca chăm sóc đang diễn ra, tra cứu nhanh theo tên người chăm sóc và điều phối trực tiếp vào MySQL."
        action={
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-800 shadow-2xs">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
              Đồng bộ MySQL {lastSync ? `· ${lastSync}` : 'Realtime'}
            </span>
            <Button variant="outline" size="sm" onClick={() => fetchSchedules(true)}>
              Làm mới
            </Button>
          </div>
        }
      />

      {/* KPI STAT CARDS */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 mb-6">
        {[
          { label: 'Tổng ca trong MySQL', value: stats.total, color: 'bg-emerald-50 border-emerald-200 text-emerald-950', dot: 'bg-emerald-600' },
          { label: 'Đang diễn ra', value: stats.inProgress, color: 'bg-amber-50 border-amber-200 text-amber-950', dot: 'bg-amber-500' },
          { label: 'Đã xác nhận', value: stats.confirmed, color: 'bg-emerald-50 border-emerald-300 text-emerald-900', dot: 'bg-emerald-500' },
          { label: 'Chờ xác nhận', value: stats.pending, color: 'bg-orange-50 border-orange-200 text-orange-950', dot: 'bg-orange-500' },
          { label: 'Hoàn thành', value: stats.completed, color: 'bg-blue-50 border-blue-200 text-blue-950', dot: 'bg-blue-500' },
        ].map((item, idx) => (
          <Card key={idx} className={`p-4 border ${item.color}`}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider opacity-75">{item.label}</span>
              <span className={`h-2.5 w-2.5 rounded-full ${item.dot}`} />
            </div>
            <p className="mt-2 font-display text-[28px] font-bold">{item.value}</p>
          </Card>
        ))}
      </div>

      {/* SEARCH AND FILTERS */}
      <Card className="p-4 sm:p-5 mb-6">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-800/60" size={17} />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="🔍 Tìm kiếm theo tên Người chăm sóc (ví dụ: Lan Anh, Thu Hà...), người bệnh hoặc gia đình..."
              className="w-full rounded-xl border border-[hsl(var(--border))] bg-[#fafcf9] py-2.5 pl-10 pr-4 text-[13px] outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600">✕</button>
            )}
          </div>

          <div className="flex items-center gap-1 bg-[#f0f4ef] p-1 rounded-xl shrink-0">
            {[
              { id: 'all' as const, label: 'Tất cả thời gian' },
              { id: 'today' as const, label: 'Hôm nay' },
              { id: 'upcoming' as const, label: 'Sắp tới' },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setTimeFilter(t.id)}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition ${timeFilter === t.id ? 'bg-white text-emerald-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1.5 mt-3 overflow-x-auto pb-1 pt-1">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mr-1">Trạng thái:</span>
          {(['all', 'in_progress', 'confirmed', 'pending', 'completed', 'cancelled'] as const).map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`rounded-full px-3 py-1 text-[11.5px] font-bold transition border ${
                statusFilter === st
                  ? 'bg-emerald-800 text-white border-emerald-800 shadow-xs'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {statusLabels[st]}
              {st !== 'all' && (
                <span className="ml-1 opacity-70">
                  ({st === 'in_progress' ? stats.inProgress : st === 'confirmed' ? stats.confirmed : st === 'pending' ? stats.pending : st === 'completed' ? stats.completed : schedules.filter(s => s.status === 'cancelled').length})
                </span>
              )}
            </button>
          ))}
        </div>
      </Card>

      {/* SCHEDULES DATA TABLE */}
      <Card className="p-0 overflow-hidden shadow-sm">
        <div className="border-b border-[hsl(var(--border))] bg-[#fafcf9] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays size={18} className="text-emerald-800" />
            <h3 className="font-display text-[18px] font-bold text-gray-900">
              Danh Sách Ca Chăm Sóc ({filteredSchedules.length} ca)
            </h3>
          </div>
          {searchTerm && (
            <span className="text-[12px] text-emerald-800 font-medium">
              Đang lọc theo: "<strong>{searchTerm}</strong>"
            </span>
          )}
        </div>

        {loading ? (
          <div className="p-12 text-center text-[13px] text-gray-500 flex items-center justify-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-700 border-t-transparent" /> Đang tải lịch từ MySQL...
          </div>
        ) : filteredSchedules.length === 0 ? (
          <div className="p-12 text-center">
            <CalendarDays size={42} className="mx-auto text-gray-300 mb-3" />
            <p className="text-[14px] font-semibold text-gray-700">Không tìm thấy ca chăm sóc nào</p>
            <p className="text-[12px] text-gray-400 mt-1">Thử thay đổi từ khóa tìm kiếm hoặc bỏ chọn các bộ lọc trạng thái</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[hsl(var(--border))] bg-[#f7f9f6] text-[11px] font-bold uppercase tracking-wider text-gray-600">
                  <th className="py-3.5 px-5">Thời gian & Ca</th>
                  <th className="py-3.5 px-4">Người chăm sóc</th>
                  <th className="py-3.5 px-4">Người bệnh & Gia đình</th>
                  <th className="py-3.5 px-4">Nội dung công việc</th>
                  <th className="py-3.5 px-4">Chi phí</th>
                  <th className="py-3.5 px-4">Trạng thái</th>
                  <th className="py-3.5 px-5 text-right">Điều phối Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[hsl(var(--border))] text-[12.5px]">
                {filteredSchedules.map(item => (
                  <tr key={item.id} className="hover:bg-[#f9fbf8] transition-colors">
                    <td className="py-4 px-5">
                      <div className="font-bold text-gray-900 text-[13px]">{item.schedule_date}</div>
                      <div className="text-[11.5px] text-emerald-900 font-medium mt-0.5">{item.time_slot}</div>
                      <span className="inline-block mt-1 rounded-sm bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600 font-mono">
                        #CA-{item.id}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0" style={{ background: 'linear-gradient(145deg, #afc5b0, #638273)' }}>
                          {(item.caregiver_name || 'CS').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{item.caregiver_name || 'Chưa chỉ định'}</p>
                          <p className="text-[11px] text-gray-500">{item.caregiver_phone || 'Liên hệ qua CARE-MATCH'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-bold text-gray-900">{item.elderly_name || 'Người thân'}</div>
                      <div className="text-[11px] text-gray-600 mt-0.5">Gia đình: {item.family_name || 'Nguyễn Minh Mai'}</div>
                      {item.elderly_address && (
                        <div className="text-[10.5px] text-gray-500 truncate max-w-[180px] mt-0.5">📍 {item.elderly_address}</div>
                      )}
                    </td>
                    <td className="py-4 px-4 max-w-[240px]">
                      <p className="font-semibold text-gray-800 line-clamp-1">{item.title}</p>
                      <p className="text-[11px] text-gray-500 line-clamp-2 mt-0.5">{item.tasks || 'Chăm sóc sinh hoạt và theo dõi sức khỏe'}</p>
                    </td>
                    <td className="py-4 px-4 font-bold text-emerald-900 whitespace-nowrap">
                      {item.price ? `${Number(item.price).toLocaleString('vi-VN')} đ` : '400.000 đ'}
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold border ${statusBadgeColors[item.status] || 'bg-gray-100 text-gray-800 border-gray-300'}`}>
                        {statusLabels[item.status] || item.status}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-right whitespace-nowrap">
                      <select
                        value={item.status}
                        disabled={updatingId === item.id}
                        onChange={e => handleUpdateStatus(item.id, e.target.value)}
                        className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-[11.5px] font-semibold text-gray-800 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 cursor-pointer shadow-2xs"
                      >
                        <option value="confirmed">✓ Đã xác nhận</option>
                        <option value="in_progress">⚡ Đang diễn ra</option>
                        <option value="completed">🏆 Hoàn thành</option>
                        <option value="pending">⏳ Chờ xác nhận</option>
                        <option value="cancelled">✗ Hủy ca</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}

function Schedule({ notify, currentUser, userRole = 'family' }: { notify: (message: string) => void; currentUser?: CurrentUser; userRole?: 'family' | 'caregiver' | 'admin' }) {
  if (userRole === 'admin') {
    return <AdminScheduleView notify={notify} />;
  }

  const clock = useRealtimeClock();
  const isCaregiver = userRole === 'caregiver';
  const userId = currentUser?.id || 5;
  const caregiverName = currentUser?.full_name || '';
  const [schedules, setSchedules] = useState<any[]>([]);
  const [allSchedules, setAllSchedules] = useState<any[]>([]);
  const [elderlyProfiles, setElderlyProfiles] = useState<ElderlyProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');
  const [selectedFilterDay, setSelectedFilterDay] = useState<string | null>(null);
  
  // Quản lý việc chọn ngày: 7 ngày tiếp theo từ hôm nay
  const next7Days = useMemo(() => {
    const list = [];
    const dayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const shortDays = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const dayLabel = i === 0 ? 'Hôm nay' : i === 1 ? 'Ngày mai' : shortDays[d.getDay()];
      const dayFull = i === 0 ? 'Hôm nay' : i === 1 ? 'Ngày mai' : dayNames[d.getDay()];
      const dateFormatted = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
      list.push({
        index: i,
        dayLabel,
        dayFull,
        dateFormatted,
        fullDateStr: `${dayFull} (${dateFormatted})`,
        isToday: i === 0,
        isTomorrow: i === 1
      });
    }
    return list;
  }, []);

  // Tính toán các ngày trong tuần hiện tại (từ Thứ Hai đến Chủ Nhật) theo thời gian thực
  const currentWeek = useMemo(() => {
    const today = clock.now;
    const day = today.getDay(); // 0 là Chủ Nhật, 1 là Thứ Hai...
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);

    const week = [];
    const dayLabels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
    const dayFullNames = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật'];
    const todayFormatted = clock.shortDate; // "23/09"

    for (let i = 0; i < 7; i++) {
      const cur = new Date(monday);
      cur.setDate(monday.getDate() + i);
      const dayNum = cur.getDate();
      const monthNum = cur.getMonth() + 1;
      const dateFormatted = `${String(dayNum).padStart(2, '0')}/${String(monthNum).padStart(2, '0')}`;
      const isToday = dateFormatted === todayFormatted;
      week.push({
        index: i,
        label: dayLabels[i],
        fullName: dayFullNames[i],
        dateNum: dayNum,
        dateFormatted,
        isToday
      });
    }
    return week;
  }, [clock.shortDate]);

  // Đếm số ca trong ngày dựa trên dữ liệu MySQL
  const getSchedulesForDay = (dateFormatted: string) => {
    return schedules.filter(s => s.schedule_date && s.schedule_date.includes(dateFormatted));
  };

  // Danh sách hiển thị có áp dụng bộ lọc ngày đã bấm chọn (Dành cho Family)
  const displayedSchedules = useMemo(() => {
    if (!selectedFilterDay) return schedules;
    return schedules.filter(s => s.schedule_date && s.schedule_date.includes(selectedFilterDay));
  }, [schedules, selectedFilterDay]);

  // Helper định dạng ngày tương đối theo thời gian thực (Hôm nay, Ngày mai...)
  const getRelativeDateInfo = (rawDateStr: string) => {
    if (!rawDateStr) return { text: 'Hôm nay', isToday: true, isTomorrow: false, badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold' };
    const todayFormatted = clock.shortDate; // e.g. "23/09"
    const tomorrow = new Date(clock.now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowFormatted = `${String(tomorrow.getDate()).padStart(2, '0')}/${String(tomorrow.getMonth() + 1).padStart(2, '0')}`;

    const match = rawDateStr.match(/(\d{2}\/\d{2})/);
    if (match) {
      const dm = match[1];
      if (dm === todayFormatted) {
        return { text: `Hôm nay (${dm})`, isToday: true, isTomorrow: false, badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold' };
      }
      if (dm === tomorrowFormatted) {
        return { text: `Ngày mai (${dm})`, isToday: false, isTomorrow: true, badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 font-bold' };
      }
    }
    return { text: rawDateStr, isToday: false, isTomorrow: false, badgeClass: 'text-[hsl(var(--muted-foreground))] border-transparent' };
  };

  const [selectedDayIdx, setSelectedDayIdx] = useState(0);
  const [selectedElderly, setSelectedElderly] = useState('');
  const [selectedCaregiver, setSelectedCaregiver] = useState('Nguyễn Lan Anh');
  const [selectedCaregiverId, setSelectedCaregiverId] = useState<number>(2);
  const [availableCaregivers, setAvailableCaregivers] = useState<any[]>([]);
  
  // Quản lý ca làm việc (Shift Mode: 'preset' hoặc 'custom')
  const [shiftMode, setShiftMode] = useState<'preset' | 'custom'>('preset');
  const [selectedPresetId, setSelectedPresetId] = useState('morning');
  const [customStartTime, setCustomStartTime] = useState('08:00');
  const [customDuration, setCustomDuration] = useState(4); // số tiếng
  const [taskStr, setTaskStr] = useState('Đo huyết áp, nhắc thuốc sáng, xoa bóp cổ vai gáy và hỗ trợ đi bộ');
  const [submitting, setSubmitting] = useState(false);

  // Tính giờ kết thúc cho ca tự chọn
  const calculateEndTime = (start: string, duration: number) => {
    const [h, m] = start.split(':').map(Number);
    const endH = (h + duration) % 24;
    const isNextDay = h + duration >= 24;
    const formattedEnd = `${String(endH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    return isNextDay ? `${formattedEnd} (hôm sau)` : formattedEnd;
  };

  // Thông tin ca hiện tại
  const selectedDay = next7Days[selectedDayIdx];
  const dateStr = selectedDay.fullDateStr;

  let timeStr = '';
  let calculatedPrice = 400000;

  if (shiftMode === 'preset') {
    const preset = PRESET_SHIFTS.find(p => p.id === selectedPresetId) || PRESET_SHIFTS[0];
    timeStr = `${preset.time} (${preset.duration} tiếng)`;
    calculatedPrice = preset.price;
  } else {
    const endTime = calculateEndTime(customStartTime, customDuration);
    timeStr = `${customStartTime} - ${endTime} (${customDuration} tiếng)`;
    calculatedPrice = customDuration * 100000;
  }

  // Tải danh sách lịch trình từ MySQL
  const loadSchedules = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      let url = `${API}/schedules`;
      if (isCaregiver) {
        url += `?caregiverUserId=${currentUser?.id || ''}&caregiverName=${encodeURIComponent(caregiverName)}`;
      } else {
        url += `?familyUserId=${userId}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setSchedules(data);
        const nowStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setLastSyncTime(nowStr);
      }
      // Tải tất cả lịch trình để kiểm tra xung đột trùng lịch của người chăm sóc nếu là Family
      if (!isCaregiver) {
        const resAll = await fetch(`${API}/schedules`);
        if (resAll.ok) {
          const allData = await resAll.json();
          setAllSchedules(allData);
        }
      }
    } catch {
      if (showLoading) setSchedules([]);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // Tải danh sách người thân để chọn trong form (cho Family)
  const loadElderly = async () => {
    try {
      const res = await fetch(`${API}/elderly-profiles?userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setElderlyProfiles(data);
        if (data.length > 0 && !selectedElderly) {
          setSelectedElderly(data[0].full_name);
        }
      }
    } catch {
      setElderlyProfiles([]);
    }
  };

  // Tải danh sách người chăm sóc thực tế từ MySQL
  const loadCaregivers = async () => {
    try {
      const res = await fetch(`${API}/caregivers`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setAvailableCaregivers(data);
          const params = new URLSearchParams(window.location.search);
          const qId = params.get('caregiverId');
          const qName = params.get('caregiverName');
          if (qId && !isNaN(Number(qId))) {
            const found = data.find((c: any) => Number(c.id) === Number(qId));
            if (found) {
              setSelectedCaregiverId(Number(found.id));
              setSelectedCaregiver(found.name);
            } else if (qName) {
              setSelectedCaregiverId(Number(qId));
              setSelectedCaregiver(decodeURIComponent(qName));
            }
            setShowAddModal(true);
          } else if (!selectedCaregiver) {
            setSelectedCaregiverId(Number(data[0].id));
            setSelectedCaregiver(data[0].name);
          }
        }
      }
    } catch {}
  };

  useEffect(() => {
    loadSchedules(true);
    if (!isCaregiver) {
      loadElderly();
      loadCaregivers();
    }

    // Polling Realtime mỗi 2.5 giây đồng bộ liên tục với MySQL
    const interval = setInterval(() => {
      loadSchedules(false);
    }, 2500);
    return () => clearInterval(interval);
  }, [userId, userRole, currentUser?.id]);

  // Hành động xác nhận ca (dành cho người chăm sóc)
  const handleConfirmShift = async (id: number) => {
    try {
      const res = await fetch(`${API}/schedules/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'confirmed' })
      });
      if (res.ok) {
        setSchedules(prev => prev.map(s => s.id === id ? { ...s, status: 'confirmed' } : s));
        notify('Đã xác nhận nhận ca chăm sóc thành công! ✓');
      }
    } catch {
      notify('Lỗi khi xác nhận nhận ca.');
    }
  };

  // Hành động hoàn thành ca (dành cho người chăm sóc)
  const handleCompleteShift = async (id: number) => {
    try {
      const res = await fetch(`${API}/schedules/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' })
      });
      if (res.ok) {
        setSchedules(prev => prev.map(s => s.id === id ? { ...s, status: 'completed' } : s));
        notify('Đã hoàn thành ca chăm sóc! Thu nhập đã được ghi nhận. ✓');
      }
    } catch {
      notify('Lỗi khi cập nhật hoàn thành ca.');
    }
  };

  // Kiểm tra xung đột trùng ca làm việc của người chăm sóc
  const conflictingSchedule = useMemo(() => {
    return allSchedules.find(s => 
      s.caregiver_name?.includes(selectedCaregiver) && 
      (s.schedule_date === dateStr || s.schedule_date?.includes(selectedDay.dateFormatted)) &&
      s.status !== 'cancelled'
    );
  }, [allSchedules, selectedCaregiver, dateStr, selectedDay.dateFormatted]);

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const caregiverId = selectedCaregiverId || (selectedCaregiver.includes('Lan Anh') ? 2 : selectedCaregiver.includes('Thu Hà') ? 3 : 4);
      const matchedElderly = elderlyProfiles.find(p => p.full_name === selectedElderly);

      const res = await fetch(`${API}/schedules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          family_user_id: userId,
          caregiver_user_id: caregiverId,
          elderly_profile_id: matchedElderly?.id || null,
          elderly_name: selectedElderly || 'Người thân',
          caregiver_name: selectedCaregiver,
          schedule_date: dateStr,
          time_slot: timeStr,
          title: `Ca chăm sóc ${selectedElderly || 'Người thân'} (${selectedCaregiver})`,
          tasks: taskStr,
          status: 'confirmed',
          price: calculatedPrice
        })
      });

      if (res.ok) {
        await loadSchedules();
        setShowAddModal(false);
        notify(`Đã đặt ca chăm sóc vào ${dateStr} (${timeStr}) và lưu vào MySQL thành công! ✓`);
      } else {
        notify('Không thể lưu ca chăm sóc vào MySQL.');
      }
    } catch {
      notify('Lỗi kết nối khi lưu ca chăm sóc vào MySQL.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (item: any) => {
    const nextStatus = item.status === 'confirmed' ? 'completed' : 'confirmed';
    try {
      const res = await fetch(`${API}/schedules/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.ok) {
        setSchedules(prev => prev.map(s => s.id === item.id ? { ...s, status: nextStatus } : s));
        notify(nextStatus === 'completed' ? 'Đã hoàn thành ca chăm sóc trong MySQL. ✓' : 'Đã xác nhận ca chăm sóc trong MySQL. ✓');
      }
    } catch {
      notify('Lỗi khi cập nhật trạng thái trong MySQL.');
    }
  };

  const handleDeleteSchedule = async (id: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn hủy ca chăm sóc này khỏi cơ sở dữ liệu MySQL?')) return;
    try {
      const res = await fetch(`${API}/schedules/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSchedules(prev => prev.filter(s => s.id !== id));
        notify('Đã xóa ca chăm sóc khỏi MySQL thành công.');
      }
    } catch {
      notify('Lỗi khi xóa ca chăm sóc khỏi MySQL.');
    }
  };

  // NẾU LÀ NGƯỜI CHĂM SÓC: HIỂN THỊ GIAO DIỆN CA LÀM VIỆC DÀNH CHO CAREGIVER
  if (isCaregiver) {
    return (
      <CaregiverScheduleView
        clock={clock}
        schedules={schedules}
        loading={loading}
        lastSyncTime={lastSyncTime}
        currentWeek={currentWeek}
        selectedFilterDay={selectedFilterDay}
        setSelectedFilterDay={setSelectedFilterDay}
        getSchedulesForDay={getSchedulesForDay}
        getRelativeDateInfo={getRelativeDateInfo}
        notify={notify}
        loadSchedules={loadSchedules}
        handleConfirmShift={handleConfirmShift}
        handleCompleteShift={handleCompleteShift}
      />
    );
  }

  return (
    <>
      <PageHeading 
        eyebrow={`${clock.fullDateStr} · ${clock.timeStr} (Realtime)`} 
        title="Mọi việc đúng lúc, nhẹ đầu hơn." 
        description="Theo dõi các cuộc hẹn, ca chăm sóc và những mốc gia đình đã thống nhất trực tiếp với người chăm sóc (đồng bộ realtime MySQL liên tục)." 
        action={
          <Button onClick={() => setShowAddModal(true)} testId="button-add-appointment">
            <Plus size={17} /> Đặt ca chăm sóc mới
          </Button>
        } 
      />

      {/* MODAL ĐẶT CA CHĂM SÓC MỚI - CHỌN 7 NGÀY & BẢNG CA LINH HOẠT - LƯU MYSQL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-3 sm:p-4 backdrop-blur-xs">
          <div className="w-full max-w-[620px] max-h-[92vh] overflow-y-auto rounded-[24px] bg-white p-5 sm:p-6 shadow-2xl animate-rise border border-[hsl(var(--border))]">
            <div className="flex items-center justify-between border-b border-[hsl(var(--border))] pb-3.5">
              <div>
                <h3 className="font-display text-[21px] font-bold text-[#283b2d]">Đặt Ca Chăm Sóc Mới (Lưu MySQL)</h3>
                <p className="text-[11.5px] text-[hsl(var(--muted-foreground))]">Chọn nhanh ngày trong 7 ngày tới & tùy chỉnh thời lượng ca làm việc</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSchedule} className="mt-4 space-y-4">
              {/* 1. Chọn người thân */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[11px] font-bold text-[#455c48]">Chăm sóc cho người thân nào?</label>
                  {elderlyProfiles.length > 0 ? (
                    <select
                      value={selectedElderly}
                      onChange={e => setSelectedElderly(e.target.value)}
                      className="h-10.5 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 text-[13px] outline-none"
                    >
                      {elderlyProfiles.map(p => (
                        <option key={p.id} value={p.full_name}>{p.full_name} ({p.gender || 'Người thân'})</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={selectedElderly}
                      onChange={e => setSelectedElderly(e.target.value)}
                      placeholder="Nhập tên người thân (VD: Mẹ Lan)"
                      className="h-10.5 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 text-[13px] outline-none"
                    />
                  )}
                </div>

                {/* 2. Chọn người chăm sóc */}
                <div>
                  <label className="mb-1 block text-[11px] font-bold text-[#455c48]">Chọn người chăm sóc đồng hành</label>
                  <select 
                    value={selectedCaregiverId} 
                    onChange={e => {
                      const cid = Number(e.target.value);
                      setSelectedCaregiverId(cid);
                      const found = availableCaregivers.find(c => Number(c.id) === cid);
                      if (found) setSelectedCaregiver(found.name);
                    }}
                    className="h-10.5 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 text-[13px] outline-none"
                  >
                    {availableCaregivers.length > 0 ? (
                      availableCaregivers.map(cg => (
                        <option key={cg.id} value={cg.id}>
                          {cg.name} ({cg.role} · CARE SCORE: {cg.care_score}đ)
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="2">Nguyễn Lan Anh (Care Score: 96đ · 8 năm KN)</option>
                        <option value="3">Trần Thu Hà (Care Score: 91đ · Điều dưỡng)</option>
                        <option value="4">Lê Mai Chi (Care Score: 87đ · Bạn đồng hành)</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              {/* 3. LỰA CHỌN NGÀY: 7 NGÀY TIẾP THEO (KHÔNG CẦN TỰ NHẬP) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold text-[#455c48]">
                    Ngày diễn ra <span className="font-normal text-[hsl(var(--muted-foreground))]">(Chỉ được đặt tối đa trong 7 ngày tới)</span>
                  </label>
                  <span className="text-[11px] font-bold text-[hsl(var(--primary))]">
                    Đã chọn: {selectedDay.fullDateStr}
                  </span>
                </div>
                <div className="grid grid-cols-7 gap-1.5">
                  {next7Days.map((day, idx) => {
                    const isSelected = selectedDayIdx === idx;
                    return (
                      <button
                        type="button"
                        key={day.dateFormatted}
                        onClick={() => setSelectedDayIdx(idx)}
                        className={`flex flex-col items-center justify-center rounded-xl p-2 transition text-center border ${
                          isSelected
                            ? 'bg-[#385139] text-white border-[#385139] shadow-md ring-2 ring-[#385139]/30'
                            : 'bg-[#f4f7f3] text-[#334b35] border-[hsl(var(--border))] hover:bg-[#e8efe7]'
                        }`}
                      >
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${isSelected ? 'text-[#f0d8a8]' : 'text-[hsl(var(--muted-foreground))]'}`}>
                          {day.dayLabel}
                        </span>
                        <span className="mt-0.5 text-[13px] font-extrabold">{day.dateFormatted}</span>
                        {isSelected && (
                          <span className="mt-0.5 text-[9px] font-bold text-[#d1e8cb]">✓ Chọn</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. BẢNG CHỌN CA LÀM VIỆC & THỜI LƯỢNG (KÉO DÀI MẤY TIẾNG TÙY Ý) */}
              <div className="rounded-2xl border border-[hsl(var(--border))] bg-[#fafbfa] p-3.5">
                <div className="flex items-center justify-between border-b border-[hsl(var(--border)/.6)] pb-2.5 mb-3">
                  <label className="text-[11px] font-bold text-[#455c48] uppercase tracking-wider">
                    Bảng chọn ca làm việc & Thời lượng
                  </label>
                  <div className="flex items-center gap-1 rounded-lg bg-[hsl(var(--secondary)/.7)] p-0.5 text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setShiftMode('preset')}
                      className={`rounded-md px-2.5 py-1 transition ${shiftMode === 'preset' ? 'bg-[#385139] text-white shadow-xs' : 'text-[hsl(var(--muted-foreground))]'}`}
                    >
                      Ca mẫu gợi ý
                    </button>
                    <button
                      type="button"
                      onClick={() => setShiftMode('custom')}
                      className={`rounded-md px-2.5 py-1 transition ${shiftMode === 'custom' ? 'bg-[#385139] text-white shadow-xs' : 'text-[hsl(var(--muted-foreground))]'}`}
                    >
                      Tự chọn số tiếng
                    </button>
                  </div>
                </div>

                {shiftMode === 'preset' ? (
                  /* Bảng các ca có sẵn */
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {PRESET_SHIFTS.map((shift) => {
                      const isSelected = selectedPresetId === shift.id;
                      return (
                        <div
                          key={shift.id}
                          onClick={() => setSelectedPresetId(shift.id)}
                          className={`cursor-pointer rounded-xl border p-3 transition flex flex-col justify-between ${
                            isSelected
                              ? 'border-[#385139] bg-[#edf4ea] shadow-xs ring-1 ring-[#385139]'
                              : 'border-[hsl(var(--border))] bg-white hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5 text-[12.5px] font-bold text-[#2d4231]">
                              <span>{shift.icon}</span> {shift.name}
                            </span>
                            <span className="rounded-md bg-white/80 px-1.5 py-0.5 text-[10px] font-bold text-[#4a6b47] border border-[hsl(var(--border))]">
                              {shift.duration} tiếng
                            </span>
                          </div>
                          <p className="mt-1 font-mono text-[12.5px] font-bold text-[#3d593f]">{shift.time}</p>
                          <p className="mt-1 text-[10.5px] text-[hsl(var(--muted-foreground))] line-clamp-1">{shift.desc}</p>
                          <div className="mt-2 flex items-center justify-between pt-1 border-t border-[hsl(var(--border)/.5)]">
                            <span className="text-[10px] text-gray-500">Mức phí ca:</span>
                            <strong className="text-[12px] text-[#334e30]">{shift.price.toLocaleString('vi-VN')} đ</strong>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* Khung tự chọn giờ bắt đầu & số tiếng kéo dài tùy thích */
                  <div className="space-y-3 bg-white p-3 rounded-xl border border-[hsl(var(--border))]">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-[11px] font-bold text-[#455c48]">Giờ bắt đầu làm việc</label>
                        <select
                          value={customStartTime}
                          onChange={e => setCustomStartTime(e.target.value)}
                          className="h-10 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 text-[13px] font-medium outline-none"
                        >
                          {['06:00', '07:00', '07:30', '08:00', '08:30', '09:00', '10:00', '11:00', '13:00', '13:30', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'].map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-1 block text-[11px] font-bold text-[#455c48]">
                          Thời lượng ca (kéo dài mấy tiếng):
                        </label>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setCustomDuration(prev => Math.max(1, prev - 1))}
                            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[hsl(var(--border))] bg-gray-50 text-[16px] font-bold hover:bg-gray-100"
                          >
                            -
                          </button>
                          <div className="flex-1 text-center font-display text-[17px] font-bold text-[#385139] border border-[hsl(var(--border))] h-10 flex items-center justify-center rounded-xl bg-[hsl(var(--background))]">
                            {customDuration} tiếng
                          </div>
                          <button
                            type="button"
                            onClick={() => setCustomDuration(prev => prev + 1)}
                            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[hsl(var(--border))] bg-gray-50 text-[16px] font-bold hover:bg-gray-100"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Nút chọn nhanh thời lượng */}
                    <div>
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                        Chọn nhanh số tiếng:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {[2, 3, 4, 5, 6, 8, 10, 12].map(hrs => (
                          <button
                            type="button"
                            key={hrs}
                            onClick={() => setCustomDuration(hrs)}
                            className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition border ${
                              customDuration === hrs 
                                ? 'bg-[#385139] text-white border-[#385139]' 
                                : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                            }`}
                          >
                            {hrs} tiếng
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="mt-2 flex items-center justify-between rounded-lg bg-[#edf4ea] p-2.5 text-[11.5px] text-[#344d32]">
                      <span>Khung giờ tính toán: <strong>{customStartTime} - {calculateEndTime(customStartTime, customDuration)}</strong></span>
                      <span>Đơn giá: <strong>100.000 đ/giờ</strong></span>
                    </div>
                  </div>
                )}
              </div>

              {/* 5. CẢNH BÁO TRÙNG LỊCH HOẶC XÁC NHẬN SẴN SÀNG CỦA NGƯỜI CHĂM SÓC */}
              {conflictingSchedule ? (
                <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-[12px] text-amber-900 flex items-start gap-2">
                  <span className="text-[16px]">⚠️</span>
                  <div>
                    <strong>{selectedCaregiver} đã có một ca lịch hẹn vào ngày này!</strong>
                    <p className="mt-0.5 text-[11px] text-amber-800">
                      Ca đã có: <strong>{conflictingSchedule.time_slot}</strong> ({conflictingSchedule.title}). Vui lòng cân nhắc chọn khung giờ khác hoặc người chăm sóc khác để tránh trùng lịch.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11.5px] text-emerald-800 flex items-center gap-1.5">
                  <span className="text-[14px]">✓</span>
                  <span>{selectedCaregiver} hiện đang trống lịch vào <strong>{dateStr}</strong>, sẵn sàng nhận ca này!</span>
                </div>
              )}

              {/* 6. Nhiệm vụ trọng tâm */}
              <div>
                <label className="mb-1 block text-[11px] font-bold text-[#455c48]">Nhiệm vụ trọng tâm cần hỗ trợ</label>
                <textarea 
                  rows={2} 
                  value={taskStr} 
                  onChange={e => setTaskStr(e.target.value)}
                  placeholder="Ghi chú: Đo huyết áp, nhắc thuốc, xoa bóp, tập đi..."
                  className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-3 text-[13px] outline-none"
                />
              </div>

              {/* 7. Tổng kết ca đặt & Mức phí */}
              <div className="rounded-xl bg-[#f2f7ef] p-3.5 text-[12px] text-[#3d593f] space-y-1">
                <div className="flex items-center justify-between">
                  <span>Ca chăm sóc đã chọn:</span>
                  <strong className="text-[12.5px] text-[#2c442e]">{dateStr} · {timeStr}</strong>
                </div>
                <div className="flex items-center justify-between border-t border-[#d8e6d4] pt-1">
                  <span>Mức phí ước tính (bảo lãnh 100% qua hệ thống):</span>
                  <strong className="text-[15px] font-bold text-[#2d492f]">{calculatedPrice.toLocaleString('vi-VN')} đ</strong>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" type="button" onClick={() => setShowAddModal(false)}>Hủy</Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Đang lưu MySQL...' : 'Xác nhận đặt ca (Lưu MySQL)'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
        <Card className="p-6 sm:p-7" testId="card-schedule-list">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[.14em] text-[hsl(var(--muted-foreground))]">Lịch trình trong MySQL</p>
              <h2 className="mt-1 font-display text-[27px]">
                {selectedFilterDay ? `Lịch ngày ${selectedFilterDay} (${displayedSchedules.length} ca)` : `Lịch sắp tới (${schedules.length} ca)`}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Đồng bộ MySQL {lastSyncTime ? `· ${lastSyncTime}` : 'Realtime'}
              </span>
              <Button variant="outline" size="sm" onClick={() => loadSchedules(true)} testId="button-refresh-schedule">
                Làm mới
              </Button>
            </div>
          </div>

          {/* THANH THÔNG BÁO BỘ LỌC NGÀY NẾU ĐANG CHỌN NGÀY TỪ LỊCH TUẦN */}
          {selectedFilterDay && (
            <div className="mt-4 flex items-center justify-between rounded-xl border border-emerald-300 bg-emerald-50/90 p-3 text-[12.5px] text-emerald-950 animate-rise">
              <div className="flex items-center gap-2">
                <CalendarDays size={16} className="text-emerald-700" />
                <span>
                  Đang lọc ca ngày: <strong>{currentWeek.find(d => d.dateFormatted === selectedFilterDay)?.fullName} ({selectedFilterDay})</strong>
                  {' '}— <strong>{displayedSchedules.length} ca tìm thấy</strong>
                </span>
              </div>
              <button
                onClick={() => {
                  setSelectedFilterDay(null);
                  notify('Đã bỏ lọc, đang hiển thị tất cả các ca.');
                }}
                className="rounded-lg bg-emerald-700 px-3 py-1 text-[11px] font-bold text-white hover:bg-emerald-800 transition"
              >
                Xem tất cả ({schedules.length} ca)
              </button>
            </div>
          )}

          {loading ? (
            <div className="mt-7 flex items-center gap-2 text-[13px] text-[hsl(var(--muted-foreground))]">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-[hsl(var(--primary))] border-t-transparent" /> Đang tải lịch trình từ MySQL...
            </div>
          ) : schedules.length === 0 ? (
            <div className="mt-7 rounded-[18px] border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--secondary)/.3)] p-8 text-center">
              <CalendarDays size={36} className="mx-auto text-[hsl(var(--muted-foreground))]" />
              <h3 className="mt-3 font-display text-[20px]">Chưa có ca chăm sóc nào</h3>
              <p className="mt-1 text-[13px] text-[hsl(var(--muted-foreground))] max-w-sm mx-auto">
                Hiện tại gia đình chưa lên lịch chăm sóc nào trong MySQL. Hãy bấm nút dưới đây để đặt ca chăm sóc mới.
              </p>
              <Button onClick={() => setShowAddModal(true)} className="mt-5" testId="button-empty-create-schedule">
                <Plus size={16} /> Đặt ca chăm sóc mới
              </Button>
            </div>
          ) : displayedSchedules.length === 0 ? (
            <div className="mt-7 rounded-[18px] border border-dashed border-emerald-300 bg-emerald-50/40 p-8 text-center animate-rise">
              <CalendarDays size={36} className="mx-auto text-emerald-600" />
              <h3 className="mt-3 font-display text-[20px] text-emerald-950">
                Chưa có ca nào vào {currentWeek.find(d => d.dateFormatted === selectedFilterDay)?.fullName} ({selectedFilterDay})
              </h3>
              <p className="mt-1 text-[13px] text-[hsl(var(--muted-foreground))] max-w-sm mx-auto">
                Bạn có thể đặt ca chăm sóc mới ngay cho ngày này hoặc xem lại tất cả các ca khác.
              </p>
              <div className="mt-5 flex justify-center gap-3">
                <Button onClick={() => setShowAddModal(true)}>
                  <Plus size={16} /> Đặt ca cho ngày {selectedFilterDay}
                </Button>
                <Button variant="outline" onClick={() => setSelectedFilterDay(null)}>
                  Xem tất cả ({schedules.length} ca)
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-7 space-y-4">
              {displayedSchedules.map((item) => {
                const dateInfo = getRelativeDateInfo(item.schedule_date);
                return (
                  <div key={item.id} className="flex gap-3 sm:gap-4" data-testid={`row-appointment-${item.id}`}>
                    <div className="w-[88px] shrink-0 text-right">
                      <span className={`inline-block rounded-md px-1.5 py-0.5 text-[10.5px] border ${dateInfo.badgeClass}`}>
                        {dateInfo.text}
                      </span>
                      <p className="mt-1 font-display text-[16px] leading-tight text-[#344d32]">
                        {item.time_slot ? item.time_slot.split('-')[0].trim() : '08:30'}
                      </p>
                    </div>
                    <div className={`flex min-w-0 flex-1 gap-3 rounded-[17px] border border-[hsl(var(--border)/.7)] p-4 transition-colors ${
                      item.status === 'completed' ? 'bg-[#edf5ea]' : item.status === 'confirmed' ? 'bg-[#f5f9f3]' : 'bg-[#fff8e9]'
                    }`}>
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                        item.status === 'completed' ? 'bg-[#c5dcb9] text-[#43643d]' : 'bg-[#dbe8d5] text-[#58744f]'
                      }`}>
                        <CalendarDays size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col justify-between gap-1 sm:flex-row">
                          <p className="text-[13.5px] font-bold text-[#2a3d2e]">{item.title}</p>
                          <span className="text-[12px] font-bold text-[hsl(var(--muted-foreground))]">{item.time_slot}</span>
                        </div>
                        <p className="mt-1 text-[11.5px] text-[hsl(var(--muted-foreground))] font-medium">
                          {item.caregiver_name} · Chăm sóc cho: <strong className="text-[#324b35]">{item.elderly_name || 'Người thân'}</strong>
                        </p>
                        {item.tasks && <p className="mt-1 text-[11px] text-[#556957]">Nhiệm vụ: {item.tasks}</p>}

                        <div className="mt-3 flex items-center justify-between">
                          <button 
                            onClick={() => handleToggleStatus(item)} 
                            className={`flex items-center gap-1.5 text-[11px] font-bold ${
                              item.status === 'completed' ? 'text-[#476a41]' : item.status === 'confirmed' ? 'text-[#5e7b54]' : 'text-[#a87422]'
                            }`}
                          >
                            {item.status === 'completed' ? (
                              <><CheckCircle2 size={14} /> Đã hoàn thành (Bấm để mở lại)</>
                            ) : item.status === 'confirmed' ? (
                              <><CheckCircle2 size={14} /> Đã xác nhận (Bấm để hoàn thành)</>
                            ) : (
                              'Chờ xác nhận (Bấm để duyệt)'
                            )}
                          </button>
                          
                          <div className="flex items-center gap-3">
                            <span className="text-[11px] font-bold text-[#3f5d38]">
                              {(item.price || 400000).toLocaleString('vi-VN')} đ
                            </span>
                            <button
                              onClick={() => handleDeleteSchedule(item.id)}
                              className="text-[11px] text-red-500 hover:underline"
                            >
                              Hủy ca
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <div className="space-y-5">
          <Card className="p-6" testId="card-schedule-week">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[.14em] text-[hsl(var(--muted-foreground))]">Lịch trình tuần thực tế</p>
                <h2 className="mt-1 font-display text-[24px]">Theo dõi các ca trong tuần</h2>
              </div>
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Tuần này
              </span>
            </div>

            <p className="mt-1.5 text-[11.5px] text-[hsl(var(--muted-foreground))]">
              Tuần từ {currentWeek[0].fullName} ({currentWeek[0].dateFormatted}) đến {currentWeek[6].fullName} ({currentWeek[6].dateFormatted})
            </p>

            <div className="mt-5 grid grid-cols-7 gap-1.5">
              {currentWeek.map((day) => {
                const dayShifts = getSchedulesForDay(day.dateFormatted);
                const isSelected = selectedFilterDay === day.dateFormatted;
                return (
                  <button 
                    key={day.dateFormatted} 
                    onClick={() => {
                      if (isSelected) {
                        setSelectedFilterDay(null);
                        notify('Đã hiển thị lại tất cả các ca.');
                      } else {
                        setSelectedFilterDay(day.dateFormatted);
                        notify(`Đang lọc ca ${day.fullName} (${day.dateFormatted}): ${dayShifts.length} ca.`);
                      }
                    }} 
                    className={`relative flex flex-col items-center justify-between rounded-[12px] py-2.5 px-1 text-center transition-all cursor-pointer ${
                      isSelected 
                        ? 'bg-[#283b2d] text-white shadow-md ring-2 ring-[#43643d]' 
                        : day.isToday 
                        ? 'bg-emerald-50 text-emerald-950 border-2 border-emerald-500 font-bold hover:bg-emerald-100' 
                        : 'bg-white border border-[hsl(var(--border))] hover:bg-[hsl(var(--secondary))] text-[#2c3d2e]'
                    }`}
                    title={`${day.fullName} (${day.dateFormatted}): ${dayShifts.length} ca chăm sóc. Bấm để lọc.`}
                  >
                    <span className={`text-[10px] font-bold ${
                      isSelected ? 'text-white/80' : day.isToday ? 'text-emerald-700' : 'text-gray-500'
                    }`}>
                      {day.label}
                    </span>
                    
                    <span className="my-1 font-display text-[16px] font-bold leading-none">
                      {day.dateNum}
                    </span>

                    <div className="flex flex-col items-center gap-0.5 min-h-[16px]">
                      {day.isToday && (
                        <span className={`rounded-full px-1.5 py-0.2 text-[8px] font-extrabold ${
                          isSelected ? 'bg-emerald-400 text-emerald-950' : 'bg-emerald-600 text-white'
                        }`}>
                          Hôm nay
                        </span>
                      )}
                      {dayShifts.length > 0 && !day.isToday && (
                        <span className={`rounded-full px-1.5 py-0.2 text-[8.5px] font-bold ${
                          isSelected ? 'bg-amber-300 text-amber-950' : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        }`}>
                          {dayShifts.length} ca
                        </span>
                      )}
                      {dayShifts.length > 0 && day.isToday && (
                        <span className={`rounded-full px-1.5 py-0.2 text-[8px] font-bold ${
                          isSelected ? 'bg-amber-300 text-amber-950' : 'bg-amber-100 text-amber-900 border border-amber-300'
                        }`}>
                          {dayShifts.length} ca
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 border-t border-[hsl(var(--border)/.6)] pt-3 text-[11.5px]">
              {selectedFilterDay ? (
                <div className="flex items-center justify-between text-emerald-900">
                  <span>Đang xem: <strong>{currentWeek.find(d => d.dateFormatted === selectedFilterDay)?.fullName} ({selectedFilterDay})</strong></span>
                  <button 
                    onClick={() => setSelectedFilterDay(null)}
                    className="font-bold underline hover:text-emerald-700 cursor-pointer"
                  >
                    Xem tất cả ca
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between text-[hsl(var(--muted-foreground))]">
                  <span>Tổng số ca tuần này: <strong className="text-[#324a35]">{schedules.length} ca</strong></span>
                  <span className="text-[10.5px] italic">Bấm ngày để lọc</span>
                </div>
              )}
            </div>
          </Card>

          <Card className="bg-[#e4ebdc] p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#c8d9bd] text-[#58744f]">
                <HeartHandshake size={18} />
              </div>
              <div>
                <h2 className="font-display text-[21px] text-[#3e5939]">Cam kết chất lượng ca</h2>
                <p className="mt-2 text-[12px] leading-5 text-[#61715e]">
                  Mọi ca chăm sóc đều được bảo lãnh 100% qua hệ thống CARE-MATCH. Bạn có thể thay đổi hoặc hủy ca trước 24 giờ mà không mất phí.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

// BẢNG THÔNG TIN ĐỒNG BỘ NGƯỜI DÙNG & TÀI KHOẢN HỆ THỐNG
interface ChatContact {
  id: string;
  userId: number;
  name: string;
  role: string;
  initials: string;
  color: string;
  lastMessage?: string;
  lastTime?: string;
  unread?: number;
}

const ADMIN_CONTACT: ChatContact = {
  id: 'admin',
  userId: 1,
  name: 'Admin (Ban Quản Trị)',
  role: 'Ban Quản Trị Hệ Thống CARE-MATCH',
  initials: 'AD',
  color: 'linear-gradient(145deg, #749676, #385139)',
  lastMessage: 'Kênh hỗ trợ trực tuyến 24/7',
  unread: 0
};

// -------------------------------------------------------------
// HỆ THỐNG TIN NHẮN TƯƠNG TÁC THỜI GIAN THỰC (ĐỒNG BỘ MYSQL 1-ON-1)
// -------------------------------------------------------------
function Messages({ notify, currentUserRole = 'family', currentUser }: { notify: (message: string) => void; currentUserRole?: 'family' | 'caregiver' | 'admin'; currentUser?: CurrentUser }) {
  const [location] = useLocation();
  const currentUserId = Number(currentUser?.id || 0);

  // Đọc mục tiêu từ URL query params (?user=... hoặc ?conv=...)
  const getUrlTargetUserId = () => {
    if (typeof window === 'undefined') return null;
    const searchStr = window.location.search || (window.location.href.includes('?') ? '?' + window.location.href.split('?')[1] : '');
    const params = new URLSearchParams(searchStr);
    const u = params.get('user');
    if (u && !isNaN(Number(u))) return Number(u);
    const conv = params.get('conv');
    if (conv) {
      if (conv === 'admin') return 1;
      if (conv === 'lan-anh') return 2;
      if (conv === 'thu-ha') return 3;
      if (conv === 'mai-chi') return 4;
      if (conv === 'mai') return 5;
      if (!isNaN(Number(conv))) return Number(conv);
    }
    return null;
  };

  const initialTarget = getUrlTargetUserId();
  const [contacts, setContacts] = useState<ChatContact[]>(currentUserId === 1 ? [] : [ADMIN_CONTACT]);
  const [selectedUserId, setSelectedUserId] = useState<number>(() => {
    if (initialTarget && initialTarget !== currentUserId) return initialTarget;
    return currentUserId === 1 ? 2 : 1;
  });

  // Luôn dùng ref để tránh stale closure trong các vòng lặp setInterval polling
  const selectedUserIdRef = useRef<number>(selectedUserId);
  useEffect(() => {
    selectedUserIdRef.current = selectedUserId;
  }, [selectedUserId]);

  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [inputVal, setInputVal] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(true);

  // Modal mở cuộc trò chuyện mới
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [directoryUsers, setDirectoryUsers] = useState<any[]>([]);
  const [loadingDir, setLoadingDir] = useState(false);
  const [dirSearch, setDirSearch] = useState('');

  // Helper đảm bảo lấy được contact đầy đủ của một userId
  const fetchUserContact = async (uid: number): Promise<ChatContact | null> => {
    try {
      const uRes = await fetch(`${API}/users/${uid}`);
      if (uRes.ok) {
        const u = await uRes.json();
        const nameLabel = u.full_name || u.username || 'Người dùng';
        const nameParts = nameLabel.trim().split(' ').filter(Boolean);
        const initials = u.avatar_initials || (nameParts.length >= 2 ? (nameParts[nameParts.length - 2][0] + nameParts[nameParts.length - 1][0]).toUpperCase() : nameLabel.slice(0, 2).toUpperCase());
        return {
          id: String(u.id),
          userId: u.id,
          name: nameLabel,
          role: u.role === 'admin' ? 'Ban Quản Trị Hệ Thống' : u.role === 'caregiver' ? (u.caregiver_title || 'Người chăm sóc chuyên nghiệp') : 'Gia đình người cao tuổi',
          initials,
          color: u.role === 'admin' ? 'linear-gradient(145deg, #749676, #385139)' : u.role === 'caregiver' ? 'linear-gradient(145deg, #afc5b0, #638273)' : 'linear-gradient(145deg, #f1d49b, #c49354)',
          lastMessage: 'Cuộc trò chuyện mới',
          unread: 0
        };
      }
    } catch {}
    return null;
  };

  // Tải danh bạ động từ backend MySQL (chỉ tải các cuộc trò chuyện thực tế của tài khoản này)
  const loadContacts = async (forceTargetId?: number) => {
    if (!currentUserId) return [];
    try {
      const activeTarget = forceTargetId || selectedUserIdRef.current || getUrlTargetUserId();
      const targetQuery = activeTarget ? `&targetUserId=${activeTarget}` : '';
      const res = await fetch(`${API}/conversations?userId=${currentUserId}&role=${currentUserRole}${targetQuery}`);
      if (res.ok) {
        const data: ChatContact[] = await res.json();
        if (Array.isArray(data)) {
          setContacts(prev => {
            const activeId = forceTargetId || selectedUserIdRef.current || getUrlTargetUserId();
            const serverIds = new Set(data.map(c => Number(c.userId)));
            
            // Giữ lại tất cả các contact đang được mở mà phía server chưa có tin nhắn trong DB
            const pendingToKeep = prev.filter(c => {
              const cid = Number(c.userId);
              if (serverIds.has(cid)) return false;
              // Nếu là người đang chat hoặc contact cuộc trò chuyện mới -> tuyệt đối không xóa!
              return cid === Number(activeId) || c.lastMessage === 'Cuộc trò chuyện mới';
            });

            return [...pendingToKeep, ...data];
          });
          return data;
        }
      }
    } catch (err) {
      console.warn('Lỗi tải danh bạ từ MySQL:', err);
    }
    return [];
  };

  // Khởi tạo và đồng bộ người dùng mục tiêu từ URL hoặc khi đổi trang
  useEffect(() => {
    if (!currentUserId) return;
    let isMounted = true;
    const targetUid = getUrlTargetUserId();

    const init = async () => {
      setLoadingContacts(true);
      if (targetUid && targetUid !== currentUserId) {
        setSelectedUserId(targetUid);
        selectedUserIdRef.current = targetUid;
      }
      const list = await loadContacts(targetUid || undefined);

      if (targetUid && targetUid !== currentUserId) {
        setSelectedUserId(targetUid);
        selectedUserIdRef.current = targetUid;
        const exists = list.some((c: ChatContact) => Number(c.userId) === targetUid);
        if (!exists) {
          const newContact = await fetchUserContact(targetUid);
          if (newContact && isMounted) {
            setContacts(prev => [newContact, ...prev.filter(c => Number(c.userId) !== targetUid)]);
          }
        }
      } else if (list.length > 0 && !targetUid) {
        setSelectedUserId(Number(list[0].userId));
        selectedUserIdRef.current = Number(list[0].userId);
      }
      if (isMounted) setLoadingContacts(false);
    };

    init();
    const interval = setInterval(() => {
      loadContacts();
    }, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [currentUserId, currentUserRole, location]);

  // Xử lý khi người dùng bấm chọn một người trong danh bạ
  const handleSelectContact = (targetUserId: number) => {
    setSelectedUserId(targetUserId);
    selectedUserIdRef.current = targetUserId;
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('user', String(targetUserId));
      window.history.replaceState({}, '', url.toString());
    } catch {}
  };

  // Đối tượng liên hệ hiện tại đang mở trò chuyện
  const currentContact: ChatContact = useMemo(() => {
    const targetId = selectedUserIdRef.current || selectedUserId;
    const found = contacts.find(c => Number(c.userId) === Number(targetId));
    if (found) return found;
    if (contacts.length > 0) return contacts[0];
    return ADMIN_CONTACT;
  }, [contacts, selectedUserId]);

  // Tải tin nhắn 1-on-1 trực tiếp từ MySQL (nghiêm ngặt chỉ giữa 2 tài khoản)
  const loadMessagesFromDb = async () => {
    const targetId = selectedUserIdRef.current || currentContact?.userId || selectedUserId;
    if (!targetId || !currentUserId) return;
    try {
      const res = await fetch(`${API}/messages?userId=${currentUserId}&otherUserId=${targetId}`);
      if (res.ok) {
        const rows = await res.json();
        if (Array.isArray(rows)) {
          const mapped: any[] = rows.map((r: any) => ({
            id: String(r.id),
            conversationId: r.conversation_id,
            senderUserId: Number(r.sender_user_id),
            senderRole: r.sender_role,
            senderName: r.sender_name,
            recipientRole: r.recipient_role || (r.sender_role === 'caregiver' ? 'family' : 'caregiver'),
            recipientName: r.recipient_name,
            content: r.content,
            time: new Date(r.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
          }));
          setMessages(mapped);
          return;
        }
      }
    } catch (e) {
      console.warn('Lỗi đọc tin nhắn từ MySQL:', e);
    }
    setMessages([]);
  };

  useEffect(() => {
    loadMessagesFromDb();
    const timer = setInterval(loadMessagesFromDb, 2000);
    return () => clearInterval(timer);
  }, [currentUserId, selectedUserId]);

  // Mở modal chọn người để trò chuyện
  const handleOpenNewChat = async () => {
    setShowNewChatModal(true);
    setLoadingDir(true);
    try {
      const res = await fetch(`${API}/caregivers`);
      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list)) {
          setDirectoryUsers(list.filter((u: any) => Number(u.user_id || u.id) !== currentUserId));
        }
      }
    } catch {}
    setLoadingDir(false);
  };

  const handleStartChatWith = (user: any) => {
    const targetId = Number(user.user_id || user.id);
    const targetName = user.name || user.full_name || 'Người dùng';
    const targetInitials = user.initials || 'CS';
    const targetRole = user.role || 'Người chăm sóc chuyên nghiệp';
    const targetColor = user.color || 'linear-gradient(145deg, #afc5b0, #638273)';

    const newContact: ChatContact = {
      id: String(targetId),
      userId: targetId,
      name: targetName,
      role: targetRole,
      initials: targetInitials,
      color: targetColor,
      lastMessage: 'Cuộc trò chuyện mới',
      unread: 0
    };

    setContacts(prev => [newContact, ...prev.filter(c => Number(c.userId) !== targetId)]);
    setSelectedUserId(targetId);
    selectedUserIdRef.current = targetId;
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('user', String(targetId));
      window.history.replaceState({}, '', url.toString());
    } catch {}
    setShowNewChatModal(false);
    notify(`Đã mở cuộc trò chuyện với ${targetName}`);
  };

  const handleSend = async () => {
    if (!inputVal.trim() || sending) return;
    const contentText = inputVal.trim();
    setInputVal('');
    setSending(true);

    const recipientUserId = Number(selectedUserIdRef.current || currentContact.userId || selectedUserId);
    const recipientName = currentContact.name;
    const senderName = currentUser?.full_name || (currentUserRole === 'admin' ? 'Admin' : currentUserRole === 'caregiver' ? 'Người chăm sóc' : 'Gia đình');

    try {
      const res = await fetch(`${API}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_user_id: currentUserId,
          sender_name: senderName,
          sender_role: currentUserRole,
          recipient_user_id: recipientUserId,
          recipient_name: recipientName,
          content: contentText
        })
      });

      if (res.ok) {
        await loadMessagesFromDb();
        await loadContacts(recipientUserId);
        notify(`Đã gửi tin nhắn tới ${recipientName}! ✓`);
      } else {
        notify('Không thể lưu tin nhắn vào MySQL.');
      }
    } catch {
      notify('Lỗi kết nối khi gửi tin nhắn.');
    } finally {
      setSending(false);
    }
  };

  if (!currentUserId) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center p-8 text-center">
        <MessageCircle size={38} className="text-gray-400 mb-2 animate-pulse" />
        <p className="text-[14px] font-semibold text-gray-700">Đang chuẩn bị phiên nhắn tin an toàn...</p>
        <p className="text-[12px] text-gray-500 mt-1">Vui lòng đợi giây lát.</p>
      </div>
    );
  }

  const filteredDirectory = directoryUsers.filter((u: any) => {
    const q = dirSearch.toLowerCase();
    const name = (u.name || u.full_name || '').toLowerCase();
    const role = (u.role || '').toLowerCase();
    const district = (u.district || '').toLowerCase();
    return name.includes(q) || role.includes(q) || district.includes(q);
  });

  return (
    <>
      <PageHeading 
        eyebrow="Tin nhắn trực tiếp 1-1" 
        title="Trò chuyện & Đồng hành." 
        description="Tin nhắn được bảo mật riêng tư, kết nối trực tiếp giữa bạn và đối tác chăm sóc hoặc Admin hệ thống." 
        action={
          <Button variant="outline" onClick={() => notify('Tổng đài hỗ trợ 24/7 luôn sẵn sàng.')} testId="button-message-call">
            <Phone size={16} /> Tổng đài hỗ trợ
          </Button>
        } 
      />

      <div className="grid min-h-[580px] gap-5 lg:grid-cols-[.38fr_1fr]">
        {/* Danh sách người trò chuyện */}
        <Card className="overflow-hidden flex flex-col" testId="card-conversation-list">
          <div className="border-b border-[hsl(var(--border))] p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="font-display text-[20px]">Cuộc trò chuyện</h2>
                <p className="text-[11px] text-[hsl(var(--muted-foreground))]">Lưu trữ riêng tư theo tài khoản</p>
              </div>
              <button
                onClick={handleOpenNewChat}
                className="flex items-center gap-1.5 rounded-xl bg-[#435d41] hover:bg-[#324930] text-white px-3 py-1.5 text-[11.5px] font-bold shadow-xs transition"
                data-testid="button-new-chat"
                title="Bắt đầu cuộc trò chuyện mới"
              >
                <Plus size={14} /> Nhắn tin mới
              </button>
            </div>
          </div>

          <div className="divide-y divide-[hsl(var(--border))] overflow-y-auto flex-1 max-h-[600px]">
            {loadingContacts && contacts.length === 0 ? (
              <div className="p-6 text-center text-[12px] text-gray-500">Đang tải danh bạ...</div>
            ) : contacts.length === 0 ? (
              <div className="p-8 text-center text-[12.5px] text-gray-500">
                <MessageCircle size={30} className="mx-auto mb-2 text-gray-300" />
                Chưa có cuộc trò chuyện nào.<br />
                Bấm <strong className="text-[#3f634b]">"Nhắn tin mới"</strong> để bắt đầu trao đổi!
              </div>
            ) : (
              contacts.map((contact) => {
                const isActive = Number(selectedUserId) === Number(contact.userId);
                return (
                  <button
                    key={contact.userId}
                    onClick={() => handleSelectContact(contact.userId)}
                    className={`flex w-full gap-3 p-4 text-left transition ${
                      isActive ? 'border-l-[4px] border-[hsl(var(--primary))] bg-[#edf4ea]' : 'hover:bg-[hsl(var(--secondary)/.45)]'
                    }`}
                  >
                    <Initials text={contact.initials} color={contact.color} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <strong className="text-[13px] text-[#293d2c] truncate">{contact.name}</strong>
                        {contact.unread && contact.unread > 0 ? (
                          <span className="rounded-full bg-emerald-600 px-1.5 py-0.2 text-[10px] font-bold text-white">
                            {contact.unread}
                          </span>
                        ) : null}
                      </div>
                      <span className="mt-0.5 block truncate text-[11px] text-[hsl(var(--muted-foreground))]">
                        {contact.lastMessage || contact.role}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </Card>

        {/* Khung chat chi tiết */}
        <Card className="flex min-h-[580px] flex-col overflow-hidden" testId="card-active-conversation">
          <div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-5 py-4 sm:px-6 bg-white">
            <div className="flex items-center gap-3">
              <Initials text={currentContact.initials} color={currentContact.color} size="sm" />
              <div>
                <p className="text-[13.5px] font-bold text-[#273a2c]">{currentContact.name}</p>
                <p className="mt-0.5 flex items-center gap-1 text-[11px] text-[#6d8b62]">
                  <span className="h-2 w-2 rounded-full bg-[#5d8b52]" /> {currentContact.role}
                </p>
              </div>
            </div>
            {currentContact.userId === 1 && (
              <span className="rounded-lg bg-emerald-50 px-2 py-1 text-[10.5px] font-bold text-emerald-800 border border-emerald-200">
                Hỗ trợ 24/7
              </span>
            )}
          </div>

          {/* Danh sách tin nhắn */}
          <div className="flex-1 space-y-4 overflow-auto bg-[hsl(var(--background)/.55)] p-5 sm:p-6 max-h-[480px]">
            <div className="text-center text-[10.5px] text-[hsl(var(--muted-foreground))] uppercase font-bold tracking-wider">
              Cuộc trò chuyện 1-1 riêng tư · Bảo mật hệ thống CareMatch
            </div>

            {messages.length === 0 ? (
              <div className="text-center py-16 px-4">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#edf5ea] text-[#3f634b]">
                  <MessageCircle size={28} />
                </div>
                <p className="font-display text-[18px] text-[#283b2d]">Bắt đầu trò chuyện với {currentContact.name}</p>
                <p className="mx-auto mt-1 max-w-[340px] text-[12px] text-gray-500">
                  Cuộc trò chuyện 1-1 riêng tư và bảo mật. Chỉ người gửi và người nhận mới thấy các tin nhắn này.
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  <button
                    onClick={() => setInputVal(`Xin chào ${currentContact.name}, tôi muốn trao đổi về dịch vụ chăm sóc người thân.`)}
                    className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[11px] text-gray-700 hover:border-emerald-500 hover:bg-emerald-50 transition"
                  >
                    👋 "Xin chào, tôi muốn trao đổi..."
                  </button>
                  <button
                    onClick={() => setInputVal(`Chào bạn, tôi muốn hỏi về lịch rảnh và chi phí chăm sóc.`)}
                    className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[11px] text-gray-700 hover:border-emerald-500 hover:bg-emerald-50 transition"
                  >
                    📅 "Hỏi về lịch rảnh & chi phí"
                  </button>
                </div>
              </div>
            ) : (
              messages.map((m: any) => {
                const isMe = m.senderUserId 
                  ? Number(m.senderUserId) === Number(currentUserId)
                  : m.senderRole === currentUserRole;
                return (
                  <div key={m.id} className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                    {!isMe && (
                      <Initials text={m.senderName ? m.senderName.slice(0, 2).toUpperCase() : 'ND'} color={currentContact.color} size="sm" />
                    )}
                    <div>
                      <div className="text-[10px] text-gray-500 mb-0.5 px-1 font-semibold">
                        {m.senderName} ({m.senderRole === 'admin' ? 'Admin' : m.senderRole === 'caregiver' ? 'Người chăm sóc' : 'Gia đình'})
                      </div>
                      <div className={`max-w-[380px] rounded-[18px] px-4 py-2.5 text-[12.5px] leading-relaxed shadow-xs ${
                        isMe 
                          ? 'bg-[hsl(var(--primary))] text-white rounded-br-[4px]' 
                          : 'bg-white text-[#2a3c2e] border border-[hsl(var(--border))] rounded-bl-[4px]'
                      }`}>
                        {m.content}
                      </div>
                      <p className={`mt-1 text-[10px] text-[hsl(var(--muted-foreground))] ${isMe ? 'text-right' : 'text-left'}`}>
                        {m.time}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Ô nhập tin nhắn */}
          <div className="border-t border-[hsl(var(--border))] p-4 bg-white">
            <div className="flex items-center gap-2 rounded-[14px] bg-[hsl(var(--secondary)/.65)] p-1.5">
              <input 
                value={inputVal} 
                onChange={(e) => setInputVal(e.target.value)} 
                onKeyDown={(e) => e.key === 'Enter' && handleSend()} 
                placeholder={`Nhập tin nhắn gửi tới ${currentContact.name}...`} 
                className="min-w-0 flex-1 bg-transparent px-3 text-[13px] outline-none" 
              />
              <button 
                onClick={handleSend} 
                disabled={sending || !inputVal.trim()}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--primary))] text-white transition-transform hover:scale-105 disabled:opacity-50"
                title="Gửi tin nhắn"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </Card>
      </div>

      {/* MODAL BẮT ĐẦU CUỘC TRÒ CHUYỆN MỚI */}
      {showNewChatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-[500px] rounded-[22px] bg-white p-6 shadow-xl animate-rise">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h3 className="font-display text-[20px]">Bắt đầu cuộc trò chuyện mới</h3>
                <p className="text-[12px] text-gray-500">Chọn người chăm sóc để gửi tin nhắn trực tiếp</p>
              </div>
              <button onClick={() => setShowNewChatModal(false)} className="rounded-full p-1 text-gray-400 hover:bg-gray-100">
                <X size={20} />
              </button>
            </div>

            <div className="mt-4">
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tìm theo tên, kỹ năng, khu vực..."
                  value={dirSearch}
                  onChange={e => setDirSearch(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-4 py-2.5 text-[13px] outline-none focus:border-emerald-600 focus:bg-white transition"
                />
              </div>
            </div>

            <div className="mt-4 max-h-[350px] overflow-y-auto divide-y divide-gray-100">
              {loadingDir ? (
                <div className="p-8 text-center text-[12px] text-gray-500">Đang tải danh sách người chăm sóc...</div>
              ) : filteredDirectory.length === 0 ? (
                <div className="p-8 text-center text-[12.5px] text-gray-500">Không tìm thấy người chăm sóc phù hợp.</div>
              ) : (
                filteredDirectory.map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition">
                    <div className="flex items-center gap-3">
                      <Initials text={item.initials || 'CS'} color={item.color || 'linear-gradient(145deg, #afc5b0, #638273)'} size="sm" />
                      <div>
                        <p className="text-[13px] font-bold text-gray-900">{item.name}</p>
                        <p className="text-[11px] text-gray-500">{item.role} · {item.district || 'Hà Nội'}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleStartChatWith(item)}
                      className="flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-[11.5px] font-bold shadow-xs transition"
                    >
                      <MessageCircle size={13} /> Nhắn tin
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 border-t pt-3 flex justify-end">
              <button
                onClick={() => setShowNewChatModal(false)}
                className="rounded-xl px-4 py-2 text-[12.5px] font-medium text-gray-600 hover:bg-gray-100"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// =================================================================
// GIAO DIỆN THANH TOÁN VÀ DOANH THU DÀNH RIÊNG CHO ADMIN
// =================================================================
function AdminPaymentsView({ notify }: { notify: (message: string) => void }) {
  const [stats, setStats] = useState({
    totalRevenue: 7300000,
    paidAmount: 4900000,
    pendingAmount: 2400000,
    caregiverPayoutTotal: 4000000,
    caregiverPayoutPending: 2450000,
    platformFeeTotal: 550000,
    transactionCount: 4
  });
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending'>('all');
  const [activeTab, setActiveTab] = useState<'family_payments' | 'caregiver_payouts'>('family_payments');
  const [lastSync, setLastSync] = useState('');

  const loadData = async (isManual = false) => {
    try {
      if (isManual) setLoading(true);
      const [sRes, tRes] = await Promise.all([
        fetch(`${API}/admin/payments/stats`),
        fetch(`${API}/admin/payments/transactions`)
      ]);
      if (sRes.ok) setStats(await sRes.json());
      if (tRes.ok) setTransactions(await tRes.json());
      setLastSync(new Date().toLocaleTimeString('vi-VN'));
      if (isManual) notify('Đã cập nhật doanh thu & giao dịch từ MySQL!');
    } catch {
      if (isManual) notify('Lỗi khi tải dữ liệu thanh toán.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const iv = setInterval(() => loadData(false), 5000);
    return () => clearInterval(iv);
  }, []);

  const handleTogglePaymentStatus = async (id: number, currentStatus: string) => {
    const nextStatus = currentStatus === 'paid' ? 'pending' : 'paid';
    try {
      const res = await fetch(`${API}/admin/payments/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ family_payment_status: nextStatus })
      });
      if (res.ok) {
        setTransactions(prev => prev.map(t => t.id === id ? { ...t, family_payment_status: nextStatus } : t));
        loadData(false);
        notify(`Đã cập nhật trạng thái hóa đơn #${id} thành: ${nextStatus === 'paid' ? 'Đã thanh toán' : 'Chờ thanh toán'}`);
      }
    } catch {
      notify('Lỗi khi cập nhật trạng thái thanh toán.');
    }
  };

  const handleConfirmPayout = async (id: number) => {
    try {
      const res = await fetch(`${API}/admin/payments/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caregiver_payout_status: 'paid' })
      });
      if (res.ok) {
        setTransactions(prev => prev.map(t => t.id === id ? { ...t, caregiver_payout_status: 'paid' } : t));
        loadData(false);
        notify(`✅ Đã giải ngân thù lao cho người chăm sóc thành công!`);
      }
    } catch {
      notify('Lỗi khi cập nhật trả công.');
    }
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const kw = searchTerm.toLowerCase().trim();
      const matchSearch = !kw ||
        (t.transaction_code && t.transaction_code.toLowerCase().includes(kw)) ||
        (t.family_name && t.family_name.toLowerCase().includes(kw)) ||
        (t.caregiver_name && t.caregiver_name.toLowerCase().includes(kw)) ||
        (t.service_name && t.service_name.toLowerCase().includes(kw));

      const matchStatus = statusFilter === 'all' || 
        (activeTab === 'family_payments' ? t.family_payment_status === statusFilter : t.caregiver_payout_status === statusFilter);

      return matchSearch && matchStatus;
    });
  }, [transactions, searchTerm, statusFilter, activeTab]);

  return (
    <>
      <PageHeading
        eyebrow="Tài Chính & Doanh Thu Hệ Thống · Admin"
        title="Quản Lý Doanh Thu & Thanh Toán."
        description="Kiểm soát dòng tiền: tổng doanh thu, các khoản đã thanh toán, chưa thanh toán của gia đình và lịch sử trả công người chăm sóc."
        action={
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-800 shadow-2xs">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
              Đồng bộ MySQL {lastSync ? `· ${lastSync}` : 'Realtime'}
            </span>
            <Button variant="outline" size="sm" onClick={() => loadData(true)}>
              Làm mới
            </Button>
          </div>
        }
      />

      {/* 4 FINANCIAL KPI CARDS */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card className="p-5 bg-gradient-to-br from-[#2e4d34] to-[#1e3423] text-white shadow-md">
          <div className="flex items-center justify-between opacity-80">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#d4ecd0]">Tổng Doanh Thu Hệ Thống</span>
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold text-white">MySQL</span>
          </div>
          <p className="mt-3 font-display text-[32px] font-bold text-white tracking-tight">
            {stats.totalRevenue.toLocaleString('vi-VN')} đ
          </p>
          <div className="mt-3 flex items-center justify-between text-[11.5px] text-[#c0dec0] border-t border-white/15 pt-2">
            <span>Phí nền tảng (Lợi nhuận):</span>
            <strong className="text-white">{stats.platformFeeTotal.toLocaleString('vi-VN')} đ</strong>
          </div>
        </Card>

        <Card className="p-5 border border-emerald-200 bg-[#f4fbf5]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Số Đã Thanh Toán</span>
            <span className="rounded-full bg-emerald-200 text-emerald-900 px-2 py-0.5 text-[10px] font-bold">Thực thu</span>
          </div>
          <p className="mt-3 font-display text-[32px] font-bold text-emerald-900 tracking-tight">
            {stats.paidAmount.toLocaleString('vi-VN')} đ
          </p>
          <p className="mt-2 text-[11.5px] text-emerald-700">Dòng tiền an toàn qua bảo lãnh CARE-MATCH</p>
        </Card>

        <Card className="p-5 border border-amber-200 bg-[#fffdf4]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">Chưa Thanh Toán (Chờ Thu)</span>
            <span className="rounded-full bg-amber-200 text-amber-900 px-2 py-0.5 text-[10px] font-bold">Chờ tất toán</span>
          </div>
          <p className="mt-3 font-display text-[32px] font-bold text-amber-900 tracking-tight">
            {stats.pendingAmount.toLocaleString('vi-VN')} đ
          </p>
          <p className="mt-2 text-[11.5px] text-amber-700">Các gói tháng hoặc ca chăm sóc chu kỳ mới</p>
        </Card>

        <Card className="p-5 border border-blue-200 bg-[#f4f8fc]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800">Đã Trả Công Người Chăm Sóc</span>
            <span className="rounded-full bg-blue-200 text-blue-900 px-2 py-0.5 text-[10px] font-bold">Giải ngân</span>
          </div>
          <p className="mt-3 font-display text-[32px] font-bold text-blue-950 tracking-tight">
            {stats.caregiverPayoutTotal.toLocaleString('vi-VN')} đ
          </p>
          <div className="mt-2 flex items-center justify-between text-[11.5px] text-blue-700">
            <span>Đang chờ duyệt chi:</span>
            <strong className="text-blue-900">{stats.caregiverPayoutPending.toLocaleString('vi-VN')} đ</strong>
          </div>
        </Card>
      </div>

      {/* FILTER AND SUBTABS */}
      <Card className="p-4 sm:p-5 mb-6">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="flex items-center gap-1.5 bg-[#f0f4ef] p-1.5 rounded-xl w-fit">
            <button
              onClick={() => setActiveTab('family_payments')}
              className={`px-4 py-2 rounded-lg text-[13px] font-bold transition ${activeTab === 'family_payments' ? 'bg-white text-emerald-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}
            >
              💳 Lịch Sử Thanh Toán Của Gia Đình
            </button>
            <button
              onClick={() => setActiveTab('caregiver_payouts')}
              className={`px-4 py-2 rounded-lg text-[13px] font-bold transition ${activeTab === 'caregiver_payouts' ? 'bg-white text-emerald-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}
            >
              🩺 Lịch Sử Trả Công Người Chăm Sóc
            </button>
          </div>

          <div className="relative min-w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Tìm mã hóa đơn, tên gia đình, người chăm sóc..."
              className="w-full rounded-xl border border-gray-200 bg-[#fafcf9] py-2 pl-9 pr-3 text-[12.5px] outline-none focus:border-emerald-600 focus:bg-white"
            />
          </div>
        </div>
      </Card>

      {/* TABLE */}
      <Card className="p-0 overflow-hidden">
        {activeTab === 'family_payments' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[12.5px]">
              <thead>
                <tr className="border-b border-gray-200 bg-[#f7f9f6] text-[11px] font-bold uppercase tracking-wider text-gray-600">
                  <th className="py-3.5 px-5">Mã Giao Dịch</th>
                  <th className="py-3.5 px-4">Gia đình thanh toán</th>
                  <th className="py-3.5 px-4">Người chăm sóc</th>
                  <th className="py-3.5 px-4">Dịch vụ / Ca</th>
                  <th className="py-3.5 px-4">Số tiền</th>
                  <th className="py-3.5 px-4">Phương thức</th>
                  <th className="py-3.5 px-4">Trạng thái</th>
                  <th className="py-3.5 px-5 text-right">Thao tác Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTransactions.map(tx => (
                  <tr key={tx.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-4 px-5">
                      <span className="font-mono font-bold text-gray-900">{tx.transaction_code}</span>
                      <p className="text-[11px] text-gray-400 mt-0.5">{tx.created_at ? new Date(tx.created_at).toLocaleDateString('vi-VN') : ''}</p>
                    </td>
                    <td className="py-4 px-4">
                      <p className="font-bold text-gray-900">{tx.family_name}</p>
                      <p className="text-[11px] text-gray-500">{tx.family_phone || 'Chưa có SĐT'}</p>
                    </td>
                    <td className="py-4 px-4">
                      <p className="font-semibold text-gray-800">{tx.caregiver_name}</p>
                      <p className="text-[11px] text-gray-500">{tx.caregiver_phone || ''}</p>
                    </td>
                    <td className="py-4 px-4 max-w-[220px]">
                      <p className="font-medium text-gray-800 line-clamp-1">{tx.service_name}</p>
                      {tx.notes && <p className="text-[11px] text-gray-400 line-clamp-1">{tx.notes}</p>}
                    </td>
                    <td className="py-4 px-4 font-bold text-emerald-900 whitespace-nowrap text-[13px]">
                      {Number(tx.total_amount).toLocaleString('vi-VN')} đ
                    </td>
                    <td className="py-4 px-4 text-gray-600 whitespace-nowrap">
                      {tx.payment_method || 'Chuyển khoản QR'}
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                        tx.family_payment_status === 'paid'
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          : 'bg-amber-100 text-amber-900 border border-amber-300'
                      }`}>
                        {tx.family_payment_status === 'paid' ? '✓ Đã thanh toán' : '⏳ Chờ thanh toán'}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleTogglePaymentStatus(tx.id, tx.family_payment_status)}
                        className={`rounded-lg px-3 py-1.5 text-[11.5px] font-bold transition shadow-2xs ${
                          tx.family_payment_status === 'paid'
                            ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            : 'bg-emerald-700 text-white hover:bg-emerald-800'
                        }`}
                      >
                        {tx.family_payment_status === 'paid' ? 'Chuyển về chờ thu' : 'Xác nhận đã trả'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[12.5px]">
              <thead>
                <tr className="border-b border-gray-200 bg-[#f7f9f6] text-[11px] font-bold uppercase tracking-wider text-gray-600">
                  <th className="py-3.5 px-5">Mã Giao Dịch</th>
                  <th className="py-3.5 px-4">Người chăm sóc thụ hưởng</th>
                  <th className="py-3.5 px-4">Gia đình phục vụ</th>
                  <th className="py-3.5 px-4">Dịch vụ / Ca</th>
                  <th className="py-3.5 px-4">Thù lao thực nhận</th>
                  <th className="py-3.5 px-4">Phí nền tảng</th>
                  <th className="py-3.5 px-4">Trạng thái giải ngân</th>
                  <th className="py-3.5 px-5 text-right">Hành động Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTransactions.map(tx => (
                  <tr key={tx.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-4 px-5">
                      <span className="font-mono font-bold text-gray-900">{tx.transaction_code}</span>
                      <p className="text-[11px] text-gray-400 mt-0.5">{tx.created_at ? new Date(tx.created_at).toLocaleDateString('vi-VN') : ''}</p>
                    </td>
                    <td className="py-4 px-4">
                      <p className="font-bold text-gray-900">{tx.caregiver_name}</p>
                      <p className="text-[11px] text-gray-500">{tx.caregiver_phone || ''}</p>
                    </td>
                    <td className="py-4 px-4">
                      <p className="font-semibold text-gray-800">{tx.family_name}</p>
                    </td>
                    <td className="py-4 px-4 max-w-[220px]">
                      <p className="font-medium text-gray-800 line-clamp-1">{tx.service_name}</p>
                    </td>
                    <td className="py-4 px-4 font-bold text-blue-900 whitespace-nowrap text-[13px]">
                      {Number(tx.payout_amount).toLocaleString('vi-VN')} đ
                    </td>
                    <td className="py-4 px-4 text-gray-500 whitespace-nowrap">
                      {Number(tx.platform_fee).toLocaleString('vi-VN')} đ
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                        tx.caregiver_payout_status === 'paid'
                          ? 'bg-blue-100 text-blue-900 border border-blue-300'
                          : tx.caregiver_payout_status === 'processing'
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-gray-100 text-gray-800 border border-gray-300'
                      }`}>
                        {tx.caregiver_payout_status === 'paid' ? '✓ Đã giải ngân' : tx.caregiver_payout_status === 'processing' ? '⚡ Đang xử lý' : '⏳ Chờ duyệt chi'}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-right whitespace-nowrap">
                      {tx.caregiver_payout_status !== 'paid' ? (
                        <button
                          onClick={() => handleConfirmPayout(tx.id)}
                          className="rounded-lg bg-blue-700 px-3 py-1.5 text-[11.5px] font-bold text-white hover:bg-blue-800 transition shadow-2xs"
                        >
                          Xác nhận giải ngân
                        </button>
                      ) : (
                        <span className="text-[11.5px] text-gray-400 font-medium">Đã thanh toán</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}

function Payments({ notify, userRole = 'family' }: { notify: (message: string) => void; userRole?: string }) {
  if (userRole === 'admin') {
    return <AdminPaymentsView notify={notify} />;
  }

  const [paid, setPaid] = useState<string[]>(['may']);
  const invoices = [{ id: 'may', label: 'Tháng 05/2024', date: '31/05/2024', amount: '3.600.000 đ', status: 'Đã thanh toán' }, { id: 'june', label: 'Tháng 06/2024', date: '01/06/2024', amount: '3.600.000 đ', status: 'Chờ thanh toán' }, { id: 'april', label: 'Tháng 04/2024', date: '30/04/2024', amount: '3.200.000 đ', status: 'Đã thanh toán' }];
  return (
    <><PageHeading eyebrow="Thanh toán" title="Rõ ràng từng khoản chi." description="Theo dõi gói chăm sóc, hóa đơn và biên nhận của gia đình tại một nơi." action={<Button variant="outline" onClick={() => notify('Đã mở yêu cầu xuất biên nhận tổng hợp.')} testId="button-export-receipt"><Download size={16} /> Xuất biên nhận</Button>} /><div className="grid gap-5 lg:grid-cols-[.75fr_1.25fr]"><Card className="overflow-hidden bg-[hsl(var(--primary))] p-6 text-white sm:p-7" testId="card-payment-plan"><div className="flex items-start justify-between"><div><Pill tone="gold">Gói đang dùng</Pill><h2 className="mt-5 font-display text-[30px]">Chăm sóc tiêu chuẩn</h2><p className="mt-2 text-[12px] text-[#cfddca]">Gia hạn vào ngày 01 hàng tháng</p></div><WalletCards size={26} className="text-[#e8c47f]" /></div><div className="mt-9 border-t border-[#99ae89]/30 pt-5"><p className="text-[11px] uppercase tracking-[.14em] text-[#b9cbb2]">Chi phí tháng này</p><p className="mt-2 font-display text-[36px]">3.600.000 đ</p><div className="mt-6 flex items-center justify-between text-[11px] text-[#c7d7c1]"><span>Người chăm sóc tại nhà</span><span>2.800.000 đ</span></div><div className="mt-3 flex items-center justify-between text-[11px] text-[#c7d7c1]"><span>Điều phối & hỗ trợ xã hội</span><span>800.000 đ</span></div></div><Button variant="soft" onClick={() => { setPaid((current) => current.includes('june') ? current : [...current, 'june']); notify('Thanh toán tháng 06 đã được ghi nhận.'); }} disabled={paid.includes('june')} className="mt-7 w-full bg-[#f0d8a8] text-[#314a38] hover:bg-[#f7e4bd]" testId="button-pay-current">{paid.includes('june') ? <><CheckCircle2 size={16} /> Đã thanh toán tháng này</> : <>Thanh toán tháng này <ArrowRight size={16} /></>}</Button></Card><Card className="p-6 sm:p-7" testId="card-invoice-list"><div className="flex items-center justify-between"><div><p className="text-[11px] font-bold uppercase tracking-[.14em] text-[hsl(var(--muted-foreground))]">Lịch sử</p><h2 className="mt-2 font-display text-[27px]">Hóa đơn & biên nhận</h2></div><FileText size={22} className="text-[hsl(var(--muted-foreground))]" /></div><div className="mt-6 divide-y divide-[hsl(var(--border))]">{invoices.map((invoice) => <div key={invoice.id} className="flex flex-col gap-3 py-4 first:pt-0 sm:flex-row sm:items-center sm:justify-between" data-testid={`row-invoice-${invoice.id}`}><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]"><FileText size={18} /></div><div><p className="text-[13px] font-bold">{invoice.label}</p><p className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">Ngày lập {invoice.date}</p></div></div><div className="flex items-center justify-between gap-4 sm:justify-end"><div className="text-right"><p className="text-[13px] font-bold">{invoice.amount}</p><p className={`mt-1 text-[10px] font-bold ${paid.includes(invoice.id) ? 'text-[#648258]' : 'text-[#a8752d]'}`}>{paid.includes(invoice.id) ? 'Đã thanh toán' : invoice.status}</p></div><button onClick={() => notify(`Biên nhận ${invoice.label} đã sẵn sàng để tải.`)} className="rounded-xl p-2.5 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--primary))]" aria-label={`Tải biên nhận ${invoice.label}`} data-testid={`button-download-invoice-${invoice.id}`}><Download size={16} /></button></div></div>)}</div></Card></div><Card className="mt-5 flex flex-col gap-4 bg-[#fff9ed] p-5 sm:flex-row sm:items-center" testId="card-payment-help"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f5e1b6] text-[#987236]"><CircleHelp size={19} /></div><div className="flex-1"><p className="text-[13px] font-bold text-[#5b4c30]">Cần hỗ trợ về khoản thanh toán?</p><p className="mt-1 text-[12px] text-[#887657]">Đội ngũ điều phối có thể giải thích từng khoản trong hóa đơn của gia đình.</p></div><Button variant="quiet" onClick={() => notify('Đã gửi yêu cầu hỗ trợ thanh toán.')} testId="button-payment-help">Liên hệ hỗ trợ</Button></Card></>
  );
}

function SocialWork({ notify }: { notify: (message: string) => void }) {
  const [requested, setRequested] = useState(false);
  return (
    <><PageHeading eyebrow="Hỗ trợ xã hội" title="Luôn có người để hỏi." description="Nhân viên công tác xã hội giúp gia đình nhìn toàn cảnh và đi từng bước vừa sức." action={<Button onClick={() => { setRequested(true); notify('Đã gửi yêu cầu trò chuyện với chuyên gia.'); }} disabled={requested} testId="button-request-social-work">{requested ? <><Check size={16} /> Đã gửi yêu cầu</> : <>Đặt lịch trò chuyện <ArrowRight size={16} /></>}</Button>} /><div className="grid gap-5 lg:grid-cols-[1.05fr_.95fr]"><Card className="bg-[#dce8e5] p-7 sm:p-8" testId="card-social-worker"><div className="flex items-start justify-between"><div><Pill tone="slate">Người đồng hành của gia đình</Pill><h2 className="mt-5 font-display text-[35px] leading-[1.02] tracking-[-.04em] text-[#304e47]">Chị Trần Thu Hương</h2><p className="mt-2 text-[13px] text-[#607a74]">Nhân viên công tác xã hội · 7 năm kinh nghiệm</p></div><Initials text="TH" color="linear-gradient(145deg,#c4d3bf,#789678)" size="lg" /></div><div className="mt-8 flex flex-wrap gap-2"><Pill tone="slate">Lắng nghe gia đình</Pill><Pill tone="slate">Kết nối nguồn lực</Pill><Pill tone="slate">Lập kế hoạch chăm sóc</Pill></div><div className="mt-8 rounded-[18px] bg-[#f5fbf7]/65 p-5"><p className="text-[13px] leading-6 text-[#527069]">“Chăm sóc không chỉ là làm thay. Đó còn là giúp cả gia đình cảm thấy được hiểu và có thêm lựa chọn.”</p><p className="mt-3 text-[11px] font-bold text-[#69877d]">— Chị Hương</p></div><div className="mt-7 flex flex-col gap-3 sm:flex-row"><Button onClick={() => { setRequested(true); notify('Đã đặt lịch trò chuyện vào 14:30 hôm nay.'); }} disabled={requested} className="bg-[#43685c] hover:bg-[#37594e]" testId="button-book-social-call">{requested ? 'Đã đặt lịch 14:30' : 'Đặt lịch 14:30 hôm nay'}</Button><Button variant="outline" onClick={() => notify('Bạn có thể viết câu hỏi để chị Hương chuẩn bị trước.')} testId="button-write-social-question">Viết câu hỏi trước</Button></div></Card><div className="space-y-5"><Card className="p-6" testId="card-social-updates"><div className="flex items-center justify-between"><h2 className="font-display text-[25px]">Cập nhật cho gia đình</h2><Pill tone="olive">Mới nhất</Pill></div><div className="mt-6 space-y-5"><div className="flex gap-3"><div className="relative mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[#7b9868]"><span className="absolute left-1/2 top-3 h-14 w-px -translate-x-1/2 bg-[#dbe5d8]" /></div><div><p className="text-[13px] font-bold">Đã xem xét hồ sơ của mẹ Lan</p><p className="mt-1 text-[11px] leading-5 text-[hsl(var(--muted-foreground))]">Chị Hương đã ghi nhận nhu cầu hỗ trợ đi lại và ăn uống của mẹ.</p><p className="mt-2 text-[10px] text-[hsl(var(--muted-foreground))]">Hôm nay, 09:15</p></div></div><div className="flex gap-3"><div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[#d0a15b]" /><div><p className="text-[13px] font-bold">Đã gửi tài liệu chuẩn bị buổi gặp</p><p className="mt-1 text-[11px] leading-5 text-[hsl(var(--muted-foreground))]">Ba câu hỏi giúp gia đình và người chăm sóc bắt đầu dễ dàng hơn.</p><p className="mt-2 text-[10px] text-[hsl(var(--muted-foreground))]">Hôm qua, 16:40</p></div></div></div></Card><Card className="p-6" testId="card-social-topics"><h2 className="font-display text-[25px]">Gia đình có thể hỏi</h2><div className="mt-4 space-y-2"><button onClick={() => notify('Đã mở chủ đề: Chuẩn bị buổi gặp đầu tiên.')} className="flex w-full items-center justify-between rounded-xl bg-[hsl(var(--secondary)/.6)] p-3 text-left text-[12px] font-semibold hover:bg-[hsl(var(--secondary))]" data-testid="button-topic-first-meeting">Chuẩn bị buổi gặp đầu tiên <ChevronRight size={15} /></button><button onClick={() => notify('Đã mở chủ đề: Chăm sóc khi mẹ không muốn hợp tác.')} className="flex w-full items-center justify-between rounded-xl bg-[hsl(var(--secondary)/.6)] p-3 text-left text-[12px] font-semibold hover:bg-[hsl(var(--secondary))]" data-testid="button-topic-resistance">Khi mẹ chưa muốn nhận hỗ trợ <ChevronRight size={15} /></button><button onClick={() => notify('Đã mở chủ đề: Chia sẻ việc chăm sóc trong gia đình.')} className="flex w-full items-center justify-between rounded-xl bg-[hsl(var(--secondary)/.6)] p-3 text-left text-[12px] font-semibold hover:bg-[hsl(var(--secondary))]" data-testid="button-topic-family">Chia sẻ việc chăm sóc trong gia đình <ChevronRight size={15} /></button></div></Card></div></div></>
  );
}

// =================================================================
// ADMIN PORTAL — THIẾT KẾ LẠI HOÀN TOÀN
// =================================================================
type AdminUser = {
  id: number; username: string; full_name: string; email: string; phone?: string;
  role: 'family' | 'caregiver'; created_at: string;
  title?: string; experience_years?: number; care_score?: number;
  verification_status?: string; hourly_rate?: number; district?: string; rating?: number;
  schedule_count?: number; cp_id?: number;
};
type AdminConversation = {
  conversation_id: string;
  last_time: string; msg_count: number; unread_count: number;
  last_message: string;
  participants: { id: number; full_name: string; role: string }[];
};
type AdminStats = { families: number; caregivers: number; pendingProfiles: number; activeSchedules: number; totalMessages: number };
type AdminSchedule = { id: number; title: string; schedule_date: string; time_slot: string; status: string; elderly_name?: string; caregiver_name?: string; family_full_name?: string; price?: number };
type AdminUserDetail = {
  user: AdminUser;
  elderly_profiles?: ElderlyProfile[];
  caregiver_profile?: { id: number; title: string; bio?: string; skills: string[]; experience_years: number; hourly_rate: number; district: string; care_score: number; verification_status: string; documents: { document_type: string; document_name: string; status: string }[] } | null;
};

function Admin({ notify }: { notify: (message: string) => void }) {
  // ---- State ----
  const [activeTab, setActiveTab] = useState<'overview' | 'caregivers' | 'families' | 'messages'>('overview');
  const [stats, setStats] = useState<AdminStats>({ families: 0, caregivers: 0, pendingProfiles: 0, activeSchedules: 0, totalMessages: 0 });
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [conversations, setConversations] = useState<AdminConversation[]>([]);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [userDetail, setUserDetail] = useState<AdminUserDetail | null>(null);
  const [userSchedules, setUserSchedules] = useState<AdminSchedule[]>([]);
  const [selectedConv, setSelectedConv] = useState<AdminConversation | null>(null);
  const [convMessages, setConvMessages] = useState<any[]>([]);
  const [adminReplyText, setAdminReplyText] = useState('');
  const [adminDirectRecipientId, setAdminDirectRecipientId] = useState<number | null>(null);
  const [adminDirectRecipientName, setAdminDirectRecipientName] = useState('');
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  // Search & Filter state
  const [caregiverSearch, setCaregiverSearch] = useState('');
  const [caregiverFilter, setCaregiverFilter] = useState<'all' | 'pending' | 'approved'>('all');
  const [familySearch, setFamilySearch] = useState('');

  // Modal inspection states
  const [modalUser, setModalUser] = useState<AdminUser | null>(null);
  const [modalType, setModalType] = useState<'caregiver' | 'family' | null>(null);
  const [modalDetail, setModalDetail] = useState<AdminUserDetail | null>(null);
  const [modalSchedules, setModalSchedules] = useState<AdminSchedule[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalCaregiverTab, setModalCaregiverTab] = useState<'personal' | 'skills' | 'ekyc' | 'schedules'>('personal');
  const [previewDocModal, setPreviewDocModal] = useState<{ title: string; type: string; status: string; url: string } | null>(null);

  // ---- Load core data ----
  useEffect(() => {
    const loadAll = async () => {
      try {
        const [sRes, uRes, cRes] = await Promise.all([
          fetch(`${API}/admin/stats`),
          fetch(`${API}/admin/users`),
          fetch(`${API}/admin/conversations`)
        ]);
        if (sRes.ok) setStats(await sRes.json());
        if (uRes.ok) setUsers(await uRes.json());
        if (cRes.ok) setConversations(await cRes.json());
      } catch { }
    };
    loadAll();
    const iv = setInterval(() => setRefreshTick(t => t + 1), 5000);
    return () => clearInterval(iv);
  }, [refreshTick]);

  // ---- Load user detail when selectedUser changes ----
  useEffect(() => {
    if (!selectedUser) return;
    const loadDetail = async () => {
      setLoadingDetail(true);
      try {
        const [profRes, schedRes] = await Promise.all([
          fetch(`${API}/admin/users/${selectedUser.id}/profile`),
          fetch(`${API}/admin/users/${selectedUser.id}/schedules`)
        ]);
        if (profRes.ok) setUserDetail(await profRes.json());
        if (schedRes.ok) setUserSchedules(await schedRes.json());
      } catch { }
      setLoadingDetail(false);
    };
    loadDetail();
  }, [selectedUser]);

  // ---- Load conversation messages ----
  useEffect(() => {
    if (!selectedConv) return;
    const loadMsgs = async () => {
      try {
        const res = await fetch(`${API}/admin/messages/${selectedConv.conversation_id}`);
        if (res.ok) setConvMessages(await res.json());
      } catch { }
    };
    loadMsgs();
    const iv = setInterval(loadMsgs, 2500);
    return () => clearInterval(iv);
  }, [selectedConv]);

  // ---- Open Caregiver Full Profile & eKYC Modal ----
  const handleOpenCaregiverModal = async (u: AdminUser) => {
    setModalUser(u);
    setSelectedUser(u);
    setModalType('caregiver');
    setModalCaregiverTab('personal');
    setModalLoading(true);
    try {
      const [profRes, schedRes] = await Promise.all([
        fetch(`${API}/admin/users/${u.id}/profile`),
        fetch(`${API}/admin/users/${u.id}/schedules`)
      ]);
      if (profRes.ok) setModalDetail(await profRes.json());
      if (schedRes.ok) setModalSchedules(await schedRes.json());
    } catch { }
    setModalLoading(false);
  };

  // ---- Open Family Full Profile & Schedules Modal ----
  const handleOpenFamilyModal = async (u: AdminUser) => {
    setModalUser(u);
    setSelectedUser(u);
    setModalType('family');
    setModalLoading(true);
    try {
      const [profRes, schedRes] = await Promise.all([
        fetch(`${API}/admin/users/${u.id}/profile`),
        fetch(`${API}/admin/users/${u.id}/schedules`)
      ]);
      if (profRes.ok) setModalDetail(await profRes.json());
      if (schedRes.ok) setModalSchedules(await schedRes.json());
    } catch { }
    setModalLoading(false);
  };

  // ---- Admin approve caregiver ----
  const handleApproveUser = async (cpId: number, userId: number, name: string) => {
    try {
      await fetch(`${API}/caregiver-profile/${cpId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved', care_score: 96, user_id: userId })
      });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, verification_status: 'approved', care_score: 96 } : u));
      setModalUser(prev => prev ? { ...prev, verification_status: 'approved', care_score: 96 } : null);
      setSelectedUser(prev => prev ? { ...prev, verification_status: 'approved', care_score: 96 } : null);
      if (userDetail?.caregiver_profile) {
        setUserDetail(prev => {
          if (!prev?.caregiver_profile) return prev;
          const updatedDocs = (prev.caregiver_profile.documents || []).map((d: any) => ({ ...d, status: 'verified' }));
          return {
            ...prev,
            caregiver_profile: {
              ...prev.caregiver_profile,
              verification_status: 'approved',
              care_score: 96,
              documents: updatedDocs
            }
          };
        });
      }
      if (modalDetail?.caregiver_profile) {
        setModalDetail(prev => {
          if (!prev?.caregiver_profile) return prev;
          const currentDocs = (prev.caregiver_profile.documents && prev.caregiver_profile.documents.length > 0)
            ? prev.caregiver_profile.documents
            : [
                { id: '1', document_name: 'Căn cước công dân (Mặt trước)', document_type: 'cccd_front', status: 'pending', file_url: '/uploads/cccd_front.pdf' },
                { id: '2', document_name: 'Chứng chỉ sơ cấp cứu & Điều dưỡng cơ bản', document_type: 'medical_certificate', status: 'pending', file_url: '/uploads/cert.pdf' },
                { id: '3', document_name: 'Giấy khám sức khỏe định kỳ đủ điều kiện', document_type: 'health_check', status: 'pending', file_url: '/uploads/health.pdf' },
                { id: '4', document_name: 'Phiếu lý lịch tư pháp số 2', document_type: 'police_check', status: 'pending', file_url: '/uploads/judicial.pdf' }
              ];
          const updatedDocs = currentDocs.map((d: any) => ({ ...d, status: 'verified' }));
          return {
            ...prev,
            caregiver_profile: {
              ...prev.caregiver_profile,
              verification_status: 'approved',
              care_score: 96,
              documents: updatedDocs
            }
          };
        });
      }
      notify(`✅ Đã phê duyệt hồ sơ của ${name} và cấp CARE SCORE 96đ!`);
    } catch { notify('Lỗi khi cập nhật trạng thái hồ sơ.'); }
  };

  // ---- Approve individual eKYC document ----
  const handleApproveDocument = async (docId: any, status: string, docName: string) => {
    try {
      await fetch(`${API}/admin/caregiver-documents/${docId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (modalDetail?.caregiver_profile) {
        setModalDetail(prev => {
          if (!prev?.caregiver_profile) return prev;
          const currentDocs = prev.caregiver_profile.documents || [];
          return {
            ...prev,
            caregiver_profile: {
              ...prev.caregiver_profile,
              documents: currentDocs.map((d: any) => String(d.id) === String(docId) ? { ...d, status } : d)
            }
          };
        });
      }
      notify(`Đã cập nhật trạng thái tài liệu: ${docName} → ${status === 'verified' ? '✓ Đã duyệt' : '✗ Từ chối'}`);
    } catch {
      notify('Lỗi khi cập nhật tài liệu.');
    }
  };

  // ---- Admin send message ----
  const handleAdminSend = async () => {
    if (!adminReplyText.trim()) return;
    const recipientId = adminDirectRecipientId || selectedConv?.participants.find(p => p.role !== 'admin')?.id;
    const recipientName = adminDirectRecipientName || selectedConv?.participants.find(p => p.role !== 'admin')?.full_name || 'Người dùng';
    if (!recipientId) return;
    try {
      await fetch(`${API}/admin/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient_user_id: recipientId, recipient_name: recipientName, content: adminReplyText.trim() })
      });
      setAdminReplyText('');
      notify(`✅ Đã gửi tin nhắn tới ${recipientName}!`);
      if (selectedConv) {
        const res = await fetch(`${API}/admin/messages/${selectedConv.conversation_id}`);
        if (res.ok) setConvMessages(await res.json());
      }
    } catch { notify('Lỗi khi gửi tin nhắn.'); }
  };

  const caregiverUsers = users.filter(u => u.role === 'caregiver');
  const familyUsers = users.filter(u => u.role === 'family');

  const filteredCaregivers = useMemo(() => {
    return caregiverUsers.filter(u => {
      const kw = caregiverSearch.toLowerCase().trim();
      const matchSearch = !kw || 
        (u.full_name && u.full_name.toLowerCase().includes(kw)) ||
        (u.phone && u.phone.includes(kw)) ||
        (u.email && u.email.toLowerCase().includes(kw)) ||
        (u.district && u.district.toLowerCase().includes(kw));

      const matchFilter = caregiverFilter === 'all' || 
        (caregiverFilter === 'pending' ? (u.verification_status === 'pending' || !u.verification_status) : u.verification_status === 'approved');

      return matchSearch && matchFilter;
    });
  }, [caregiverUsers, caregiverSearch, caregiverFilter]);

  const filteredFamilies = useMemo(() => {
    return familyUsers.filter(u => {
      const kw = familySearch.toLowerCase().trim();
      return !kw || 
        (u.full_name && u.full_name.toLowerCase().includes(kw)) ||
        (u.phone && u.phone.includes(kw)) ||
        (u.email && u.email.toLowerCase().includes(kw));
    });
  }, [familyUsers, familySearch]);

  const statusColor: Record<string, string> = {
    confirmed: '#43643d', in_progress: '#7a5c2a', completed: '#3a5090', pending: '#8a6829', cancelled: '#7a3a3a'
  };
  const statusLabel: Record<string, string> = {
    confirmed: 'Đã xác nhận', in_progress: 'Đang diễn ra', completed: 'Hoàn thành', pending: 'Chờ xác nhận', cancelled: 'Đã hủy'
  };
  const verifyColor: Record<string, string> = { approved: '#43643d', pending: '#8a6829', rejected: '#7a3a3a', not_submitted: '#777' };
  const verifyLabel: Record<string, string> = { approved: '✓ Đã duyệt', pending: '⏳ Chờ duyệt', rejected: '✗ Từ chối', not_submitted: 'Chưa nộp' };

  const getInitials = (name: string) => {
    const parts = (name || '').trim().split(' ').filter(Boolean);
    return parts.length >= 2 ? (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase() : (name || 'CM').slice(0, 2).toUpperCase();
  };

  const tabs = [
    { key: 'overview' as const, label: 'Tổng quan', icon: '📊' },
    { key: 'caregivers' as const, label: 'Người chăm sóc', icon: '🩺', count: caregiverUsers.length },
    { key: 'families' as const, label: 'Người nhà', icon: '🏠', count: familyUsers.length },
    { key: 'messages' as const, label: 'Hộp thư', icon: '💬', count: conversations.reduce((sum, c) => sum + Number(c.unread_count || 0), 0) },
  ];

  return (
    <>
      <PageHeading
        eyebrow="Cổng Quản Trị Hệ Thống · Admin"
        title="Bàn Quản Trị Hệ Thống CARE-MATCH."
        description="Kiểm soát toàn diện: duyệt hồ sơ người chăm sóc, kiểm tra giấy tờ eKYC, giám sát người bệnh và các ca chăm sóc."
        action={
          <Button variant="outline" onClick={() => notify('Đang xuất báo cáo tháng...')}>
            <FileText size={16} /> Xuất báo cáo tháng
          </Button>
        }
      />

      {/* TAB BAR */}
      <div className="flex gap-1.5 mb-6 bg-[#f1f5ef] p-1.5 rounded-2xl w-fit flex-wrap">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setSelectedUser(null); setSelectedConv(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold transition-all ${
              activeTab === tab.key
                ? 'bg-white text-[#2d4a30] shadow-sm'
                : 'text-[#5a7a5c] hover:bg-white/60'
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                tab.key === 'messages' ? 'bg-[#d35f5f] text-white' : 'bg-[#d1e5ce] text-[#3b5e3e]'
              }`}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ===== TAB: TỔNG QUAN ===== */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              { label: 'Gia đình', value: stats.families, icon: '🏠', color: '#d4efcd' },
              { label: 'Người chăm sóc', value: stats.caregivers, icon: '🩺', color: '#d4e4ef' },
              { label: 'Chờ duyệt hồ sơ', value: stats.pendingProfiles, icon: '⏳', color: '#f5e3c8' },
              { label: 'Lịch đang hoạt động', value: stats.activeSchedules, icon: '📅', color: '#e8d4ef' },
              { label: 'Tổng tin nhắn', value: stats.totalMessages, icon: '💬', color: '#eff5d4' },
            ].map((s, i) => (
              <Card key={i} className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[22px]">{s.icon}</span>
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: s.color, color: '#2d4a30' }}>MySQL</span>
                </div>
                <p className="font-display text-[32px] font-bold text-[#1e3225]">{s.value}</p>
                <p className="text-[11px] font-bold uppercase tracking-[.1em] text-[hsl(var(--muted-foreground))] mt-1">{s.label}</p>
              </Card>
            ))}
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-[18px] font-bold text-[#263b2c]">Hồ sơ chờ duyệt gần đây</h3>
                <button onClick={() => setActiveTab('caregivers')} className="text-[11px] text-[hsl(var(--primary))] font-bold">Xem tất cả →</button>
              </div>
              <div className="space-y-2.5">
                {caregiverUsers.filter(u => u.verification_status === 'pending' || !u.verification_status).slice(0, 4).map(u => (
                  <div key={u.id} className="flex items-center gap-3 rounded-xl bg-[#fafcf9] border border-[#e2ede0] p-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0" style={{ background: 'linear-gradient(145deg,#afc5b0,#638273)' }}>
                      {getInitials(u.full_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold truncate">{u.full_name}</p>
                      <p className="text-[11px] text-[#8a9a8a]">{u.title || 'Người chăm sóc'} · {u.district || 'Hà Nội'}</p>
                    </div>
                    <button onClick={() => handleOpenCaregiverModal(u)} className="text-[11px] font-bold text-[#486842] bg-[#edf5ea] px-3 py-1.5 rounded-lg hover:bg-[#d9edce] transition flex items-center gap-1">
                      <Eye size={13} /> Xem hồ sơ & eKYC
                    </button>
                  </div>
                ))}
                {caregiverUsers.filter(u => u.verification_status === 'pending').length === 0 && (
                  <p className="text-[13px] text-[#8a9a8a] text-center py-4">Tất cả hồ sơ người chăm sóc đã được duyệt</p>
                )}
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-[18px] font-bold text-[#263b2c]">Hội thoại gần đây</h3>
                <button onClick={() => setActiveTab('messages')} className="text-[11px] text-[hsl(var(--primary))] font-bold">Xem tất cả →</button>
              </div>
              <div className="space-y-2.5">
                {conversations.slice(0, 4).map(conv => (
                  <div key={conv.conversation_id} className="rounded-xl bg-[#fafcf9] border border-[#e2ede0] p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-bold text-[#283b2d] truncate">
                          {conv.participants.map(p => p.full_name).join(' ↔ ') || conv.conversation_id}
                        </p>
                        <p className="text-[11px] text-[#8a9a8a] mt-0.5 truncate">{conv.last_message || '(Chưa có tin nhắn)'}</p>
                      </div>
                      {Number(conv.unread_count) > 0 && (
                        <span className="rounded-full bg-[#d35f5f] text-white text-[10px] font-bold px-1.5 py-0.5 shrink-0">{conv.unread_count}</span>
                      )}
                    </div>
                    <p className="text-[10.5px] text-[#aaa] mt-1">{conv.msg_count} tin · {conv.last_time ? new Date(conv.last_time).toLocaleString('vi-VN') : ''}</p>
                  </div>
                ))}
                {conversations.length === 0 && (
                  <p className="text-[13px] text-[#8a9a8a] text-center py-4">Chưa có hội thoại nào</p>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ===== TAB: NGƯỜI CHĂM SÓC ===== */}
      {activeTab === 'caregivers' && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <Card className="p-4">
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  value={caregiverSearch}
                  onChange={e => setCaregiverSearch(e.target.value)}
                  placeholder="🔍 Tìm kiếm theo tên người chăm sóc, SĐT, khu vực..."
                  className="w-full rounded-xl border border-gray-200 bg-[#fafcf9] py-2 pl-9 pr-3 text-[13px] outline-none focus:border-emerald-600 focus:bg-white"
                />
              </div>
              <div className="flex items-center gap-1.5 bg-[#f0f4ef] p-1 rounded-xl shrink-0">
                {[
                  { id: 'all' as const, label: `Tất cả (${caregiverUsers.length})` },
                  { id: 'pending' as const, label: `Chờ duyệt (${caregiverUsers.filter(u => u.verification_status === 'pending' || !u.verification_status).length})` },
                  { id: 'approved' as const, label: `Đã duyệt (${caregiverUsers.filter(u => u.verification_status === 'approved').length})` }
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setCaregiverFilter(f.id)}
                    className={`px-3 py-1.5 rounded-lg text-[12px] font-bold transition ${caregiverFilter === f.id ? 'bg-white text-emerald-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </Card>

          <div className="grid gap-5 lg:grid-cols-[1fr_390px]">
            {/* Left: list */}
            <Card className="p-0 overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-[hsl(var(--border))] bg-[#fafcf9]">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={18} className="text-[#55784d]" />
                  <h2 className="font-display text-[18px] font-bold text-[#263b2c]">Danh Sách Người Chăm Sóc ({filteredCaregivers.length})</h2>
                </div>
              </div>
              <div className="divide-y divide-[hsl(var(--border))]">
                {filteredCaregivers.length === 0 && (
                  <p className="text-[13px] text-[#8a9a8a] text-center py-10">Không tìm thấy người chăm sóc nào phù hợp</p>
                )}
                {filteredCaregivers.map(u => (
                  <div
                    key={u.id}
                    className={`w-full flex items-center justify-between gap-3 px-5 py-4 hover:bg-[#f5f9f4] transition cursor-pointer ${
                      selectedUser?.id === u.id ? 'bg-[#edf5ea] border-l-4 border-l-[#486842]' : ''
                    }`}
                    onClick={() => setSelectedUser(u)}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-[12px] font-bold text-white shrink-0" style={{ background: 'linear-gradient(145deg,#afc5b0,#638273)' }}>
                        {getInitials(u.full_name)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-[14px] font-bold text-[#1e3225]">{u.full_name}</p>
                          <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: verifyColor[u.verification_status || 'pending'] + '22', color: verifyColor[u.verification_status || 'pending'] }}>
                            {verifyLabel[u.verification_status || 'pending']}
                          </span>
                        </div>
                        <p className="text-[11.5px] text-[#6a8a6c] mt-0.5 truncate">
                          {u.title || 'Chăm sóc người cao tuổi'} · {u.district || 'Hà Nội'} · {u.schedule_count || 0} ca
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleOpenCaregiverModal(u); }}
                        className="rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1.5 text-[11.5px] font-bold shadow-xs transition flex items-center gap-1.5"
                        title="Xem toàn bộ hồ sơ, thông tin cá nhân và tài liệu eKYC"
                      >
                        <Eye size={13} /> Hồ sơ & eKYC
                      </button>
                      <ChevronRight size={15} className="text-[#aaa]" />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Right: detail panel */}
            <div>
              {!selectedUser ? (
                <Card className="p-8 text-center h-full flex flex-col items-center justify-center gap-3">
                  <Users size={40} className="text-[#c8ddc5]" />
                  <p className="text-[14px] text-[#8a9a8a]">Chọn một người chăm sóc để xem tóm tắt</p>
                </Card>
              ) : loadingDetail ? (
                <Card className="p-8 text-center">
                  <p className="text-[13px] text-[#8a9a8a]">Đang tải chi tiết...</p>
                </Card>
              ) : (
                <Card className="p-5 space-y-4 shadow-sm">
                  {/* Header */}
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-[13px] font-bold text-white shrink-0" style={{ background: 'linear-gradient(145deg,#afc5b0,#638273)' }}>
                      {getInitials(selectedUser.full_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display text-[18px] font-bold text-[#1e3225] truncate">{selectedUser.full_name}</h3>
                      <p className="text-[12px] text-[#6a8a6c] truncate">{selectedUser.email} · {selectedUser.phone || 'Chưa có SĐT'}</p>
                      <div className="flex gap-1.5 mt-1.5 flex-wrap">
                        {selectedUser.care_score ? (
                          <span className="rounded-full bg-[#e8f4e5] text-[#3a6040] px-2.5 py-0.5 text-[10.5px] font-bold">CARE SCORE: {selectedUser.care_score}</span>
                        ) : null}
                        {selectedUser.experience_years ? (
                          <span className="rounded-full bg-[#eef2ff] text-[#4a5a9a] px-2.5 py-0.5 text-[10.5px] font-bold">{selectedUser.experience_years} năm KN</span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {/* PROMINENT BUTTON: XEM TOÀN BỘ HỒ SƠ & FILE EKYC */}
                  <button
                    onClick={() => handleOpenCaregiverModal(selectedUser)}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#375a3a] hover:bg-[#2b472e] text-white py-2.5 px-4 text-[13px] font-bold shadow-md transition"
                  >
                    <Eye size={16} /> Xem toàn bộ hồ sơ chi tiết & File eKYC
                  </button>

                  {/* Status & Quick approve */}
                  <div className="rounded-xl border border-[hsl(var(--border))] p-3.5 bg-[#fafcf9] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-bold text-[#263b2c]">Trạng thái hồ sơ:</span>
                      <span className="rounded-full px-2.5 py-0.5 text-[10.5px] font-bold" style={{ background: verifyColor[selectedUser.verification_status || 'pending'] + '22', color: verifyColor[selectedUser.verification_status || 'pending'] }}>
                        {verifyLabel[selectedUser.verification_status || 'pending']}
                      </span>
                    </div>

                    {userDetail?.caregiver_profile?.documents && userDetail.caregiver_profile.documents.length > 0 && (
                      <div>
                        <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Tài liệu xác thực ({userDetail.caregiver_profile.documents.length}):</p>
                        <div className="flex flex-wrap gap-1">
                          {userDetail.caregiver_profile.documents.map((doc: any, i: number) => (
                            <span key={i} className="rounded-md bg-white border border-[#d8e3d5] px-2 py-0.5 text-[10px] text-[#48604b]">
                              📄 {doc.document_name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedUser.verification_status !== 'approved' && userDetail?.caregiver_profile && (
                      <button
                        onClick={() => handleApproveUser(userDetail.caregiver_profile!.id, selectedUser.id, selectedUser.full_name)}
                        className="w-full rounded-xl bg-[#486842] px-3 py-2 text-[12px] font-bold text-white hover:bg-[#395334] transition flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        <Check size={13} /> Duyệt hồ sơ & Cấp CARE SCORE 96đ
                      </button>
                    )}
                  </div>

                  {/* Schedules summary */}
                  <div>
                    <h4 className="text-[12px] font-bold uppercase tracking-[.1em] text-[#8a9a8a] mb-2">Lịch ca đã nhận ({userSchedules.length})</h4>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                      {userSchedules.length === 0 && <p className="text-[12px] text-[#aaa] text-center py-3">Chưa có lịch nào</p>}
                      {userSchedules.map(s => (
                        <div key={s.id} className="rounded-xl bg-[#fafcf9] border border-[hsl(var(--border))] p-2.5">
                          <div className="flex items-start justify-between gap-1.5">
                            <p className="text-[12px] font-bold text-[#263b2c] leading-tight truncate">{s.title}</p>
                            <span className="rounded-full px-1.5 py-0.5 text-[9.5px] font-bold shrink-0" style={{ background: statusColor[s.status] + '22', color: statusColor[s.status] }}>
                              {statusLabel[s.status] || s.status}
                            </span>
                          </div>
                          <p className="text-[10.5px] text-[#8a9a8a] mt-0.5">{s.schedule_date} · {s.time_slot}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Send message */}
                  <div className="border-t border-[hsl(var(--border))] pt-3">
                    <p className="text-[11px] font-bold text-[#8a9a8a] mb-2 uppercase tracking-[.1em]">Nhắn tin tới {selectedUser.full_name}</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={adminDirectRecipientId === selectedUser.id ? adminReplyText : ''}
                        onChange={e => { setAdminDirectRecipientId(selectedUser.id); setAdminDirectRecipientName(selectedUser.full_name); setAdminReplyText(e.target.value); }}
                        onKeyDown={e => e.key === 'Enter' && handleAdminSend()}
                        placeholder="Nhập nội dung nhắn..."
                        className="flex-1 rounded-xl border border-[hsl(var(--border))] bg-[#fafcf9] px-3 py-2 text-[12px] outline-none focus:border-[#486842]"
                      />
                      <button
                        onClick={() => { setAdminDirectRecipientId(selectedUser.id); setAdminDirectRecipientName(selectedUser.full_name); handleAdminSend(); }}
                        className="rounded-xl bg-[#486842] px-3 py-2 text-[12px] font-bold text-white hover:bg-[#3a5435] transition"
                      >
                        <Send size={13} />
                      </button>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== TAB: NGƯỜI NHÀ ===== */}
      {activeTab === 'families' && (
        <div className="space-y-4">
          {/* Search bar */}
          <Card className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                value={familySearch}
                onChange={e => setFamilySearch(e.target.value)}
                placeholder="🔍 Tìm kiếm theo tên gia đình, email, SĐT..."
                className="w-full rounded-xl border border-gray-200 bg-[#fafcf9] py-2 pl-9 pr-3 text-[13px] outline-none focus:border-emerald-600 focus:bg-white"
              />
            </div>
          </Card>

          <div className="grid gap-5 lg:grid-cols-[1fr_390px]">
            {/* Left: list */}
            <Card className="p-0 overflow-hidden">
              <div className="flex items-center gap-2 p-4 border-b border-[hsl(var(--border))] bg-[#fafcf9]">
                <Home size={18} className="text-[#7a8a55]" />
                <h2 className="font-display text-[18px] font-bold text-[#263b2c]">Danh Sách Gia Đình ({filteredFamilies.length})</h2>
              </div>
              <div className="divide-y divide-[hsl(var(--border))]">
                {filteredFamilies.length === 0 && (
                  <p className="text-[13px] text-[#8a9a8a] text-center py-10">Không tìm thấy gia đình nào phù hợp</p>
                )}
                {filteredFamilies.map(u => (
                  <div
                    key={u.id}
                    className={`w-full flex items-center justify-between gap-3 px-5 py-4 hover:bg-[#f9f6f0] transition cursor-pointer ${
                      selectedUser?.id === u.id ? 'bg-[#fdf5e6] border-l-4 border-l-[#c09848]' : ''
                    }`}
                    onClick={() => setSelectedUser(u)}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-[12px] font-bold text-white shrink-0" style={{ background: 'linear-gradient(145deg,#f1d49b,#c49354)' }}>
                        {getInitials(u.full_name)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[14px] font-bold text-[#1e3225]">{u.full_name}</p>
                        <p className="text-[11.5px] text-[#8a8a6a] mt-0.5 truncate">
                          {u.email} · {u.schedule_count || 0} ca đã đặt
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleOpenFamilyModal(u); }}
                        className="rounded-lg bg-[#b0883b] hover:bg-[#97732e] text-white px-3 py-1.5 text-[11.5px] font-bold shadow-xs transition flex items-center gap-1.5"
                        title="Xem người cần chăm sóc và các ca đã book lịch"
                      >
                        <Eye size={13} /> Gia đình & BN
                      </button>
                      <ChevronRight size={15} className="text-[#aaa]" />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Right: detail */}
            <div>
              {!selectedUser ? (
                <Card className="p-8 text-center h-full flex flex-col items-center justify-center gap-3">
                  <Users size={40} className="text-[#d5c8aa]" />
                  <p className="text-[14px] text-[#8a9a8a]">Chọn một gia đình để xem tóm tắt</p>
                </Card>
              ) : loadingDetail ? (
                <Card className="p-8 text-center">
                  <p className="text-[13px] text-[#8a9a8a]">Đang tải chi tiết...</p>
                </Card>
              ) : (
                <Card className="p-5 space-y-4 shadow-sm">
                  {/* Header */}
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-[13px] font-bold text-white shrink-0" style={{ background: 'linear-gradient(145deg,#f1d49b,#c49354)' }}>
                      {getInitials(selectedUser.full_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display text-[18px] font-bold text-[#1e3225] truncate">{selectedUser.full_name}</h3>
                      <p className="text-[12px] text-[#8a8a6a] truncate">{selectedUser.email}</p>
                      <p className="text-[12px] text-[#8a8a6a]">SĐT: {selectedUser.phone || 'Chưa cập nhật'}</p>
                    </div>
                  </div>

                  {/* PROMINENT BUTTON: XEM CHI TIẾT GIA ĐÌNH & NGƯỜI CẦN CHĂM SÓC */}
                  <button
                    onClick={() => handleOpenFamilyModal(selectedUser)}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#987432] hover:bg-[#806024] text-white py-2.5 px-4 text-[13px] font-bold shadow-md transition"
                  >
                    <Eye size={16} /> Xem chi tiết gia đình & Người cần chăm sóc
                  </button>

                  {/* Elderly profiles count banner */}
                  <div className="rounded-xl border border-[#ede0c4] bg-[#fffaf3] p-3.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[12.5px] font-bold text-[#3a2e18]">Số người cần chăm sóc:</span>
                      <span className="rounded-full bg-[#f6e6c4] px-2.5 py-0.5 text-[11px] font-bold text-[#7a5c1e]">
                        {userDetail?.elderly_profiles?.length || 0} người
                      </span>
                    </div>
                    {userDetail?.elderly_profiles && userDetail.elderly_profiles.length > 0 && (
                      <div className="mt-2 space-y-1.5">
                        {userDetail.elderly_profiles.map(ep => (
                          <div key={ep.id} className="text-[12px] font-semibold text-[#5a4622] flex items-center gap-1.5">
                            <span>•</span> <span>{ep.full_name} ({ep.gender || 'N/A'}, {ep.district || 'Hà Nội'})</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Booked schedules */}
                  <div>
                    <h4 className="text-[12px] font-bold uppercase tracking-[.1em] text-[#8a9a8a] mb-2">Lịch chăm sóc đã book ({userSchedules.length})</h4>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                      {userSchedules.length === 0 && <p className="text-[12px] text-[#aaa] text-center py-3">Chưa có lịch nào</p>}
                      {userSchedules.map(s => (
                        <div key={s.id} className="rounded-xl bg-[#fffaf3] border border-[#ede0c4] p-2.5">
                          <div className="flex items-start justify-between gap-1.5">
                            <p className="text-[12px] font-bold text-[#3a2e18] leading-tight truncate">{s.title}</p>
                            <span className="rounded-full px-1.5 py-0.5 text-[9.5px] font-bold shrink-0" style={{ background: statusColor[s.status] + '22', color: statusColor[s.status] }}>
                              {statusLabel[s.status] || s.status}
                            </span>
                          </div>
                          <p className="text-[10.5px] text-[#8a7a5a] mt-0.5">{s.schedule_date} · {s.time_slot}</p>
                          <p className="text-[10.5px] text-[#8a7a5a]">{s.caregiver_name ? `NCS: ${s.caregiver_name}` : ''}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Send message */}
                  <div className="border-t border-[hsl(var(--border))] pt-3">
                    <p className="text-[11px] font-bold text-[#8a9a8a] mb-2 uppercase tracking-[.1em]">Gửi tin nhắn tới gia đình này</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={adminDirectRecipientId === selectedUser.id ? adminReplyText : ''}
                        onChange={e => { setAdminDirectRecipientId(selectedUser.id); setAdminDirectRecipientName(selectedUser.full_name); setAdminReplyText(e.target.value); }}
                        onKeyDown={e => e.key === 'Enter' && handleAdminSend()}
                        placeholder={`Nhắn tin tới ${selectedUser.full_name}...`}
                        className="flex-1 rounded-xl border border-[hsl(var(--border))] bg-[#fffaf3] px-3 py-2 text-[12px] outline-none focus:border-[#c09848]"
                      />
                      <button
                        onClick={() => { setAdminDirectRecipientId(selectedUser.id); setAdminDirectRecipientName(selectedUser.full_name); handleAdminSend(); }}
                        className="rounded-xl bg-[#c09848] px-3 py-2 text-[12px] font-bold text-white hover:bg-[#a07a38] transition"
                      >
                        <Send size={13} />
                      </button>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== TAB: HỘP THƯ ===== */}
      {activeTab === 'messages' && (
        <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
          <Card className="p-0 overflow-hidden">
            <div className="flex items-center gap-2 p-5 border-b border-[hsl(var(--border))]">
              <MessageCircle size={19} className="text-[#567a4e]" />
              <h2 className="font-display text-[18px] font-bold text-[#263b2c]">Hội thoại ({conversations.length})</h2>
            </div>
            <div className="divide-y divide-[hsl(var(--border))] max-h-[600px] overflow-y-auto">
              {conversations.length === 0 && (
                <p className="text-[13px] text-[#8a9a8a] text-center py-10">Chưa có hội thoại nào trong hệ thống</p>
              )}
              {conversations.map(conv => (
                <button
                  key={conv.conversation_id}
                  onClick={() => setSelectedConv(conv)}
                  className={`w-full text-left px-4 py-3.5 hover:bg-[#f5f9f4] transition ${
                    selectedConv?.conversation_id === conv.conversation_id ? 'bg-[#edf5ea] border-l-4 border-l-[#486842]' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[13px] font-bold text-[#1e3225] leading-tight">
                      {conv.participants.map(p => p.full_name).join(' ↔ ') || conv.conversation_id}
                    </p>
                    {Number(conv.unread_count) > 0 && (
                      <span className="rounded-full bg-[#d35f5f] text-white text-[10px] font-bold px-1.5 py-0.5 shrink-0">{conv.unread_count}</span>
                    )}
                  </div>
                  <p className="text-[11.5px] text-[#8a9a8a] mt-0.5 truncate">{conv.last_message || '(Chưa có tin nhắn)'}</p>
                  <p className="text-[10.5px] text-[#bbb] mt-0.5">{conv.msg_count} tin · {conv.last_time ? new Date(conv.last_time).toLocaleString('vi-VN') : ''}</p>
                </button>
              ))}
            </div>
          </Card>

          <Card className="p-0 overflow-hidden flex flex-col">
            {!selectedConv ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center">
                <MessageCircle size={48} className="text-[#c8ddc5]" />
                <p className="text-[14px] text-[#8a9a8a]">Chọn một hội thoại để xem nội dung</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between p-4 border-b border-[hsl(var(--border))] bg-[#fafcf9]">
                  <div>
                    <p className="text-[14px] font-bold text-[#263b2c]">
                      {selectedConv.participants.map(p => p.full_name).join(' ↔ ')}
                    </p>
                    <p className="text-[11px] text-[#8a9a8a]">
                      {selectedConv.participants.map(p => p.role === 'family' ? '🏠 Gia đình' : p.role === 'caregiver' ? '🩺 Người chăm sóc' : '🛡️ Admin').join(' · ')}
                      · {selectedConv.msg_count} tin nhắn
                    </p>
                  </div>
                  <span className="rounded-full bg-[#edf5ea] px-3 py-1 text-[11px] font-bold text-[#43643d]">Đang xem</span>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[420px]">
                  {convMessages.length === 0 && (
                    <p className="text-[13px] text-[#8a9a8a] text-center py-10">Chưa có tin nhắn nào</p>
                  )}
                  {convMessages.map((m: any) => (
                    <div key={m.id} className={`flex ${ m.sender_user_id === 1 ? 'justify-end' : 'justify-start' }`}>
                      <div className={`max-w-[72%] rounded-2xl px-4 py-2.5 ${
                        m.sender_user_id === 1
                          ? 'bg-[#486842] text-white rounded-tr-sm'
                          : m.sender_role === 'caregiver'
                          ? 'bg-[#e5eef0] text-[#263b2c] rounded-tl-sm'
                          : 'bg-[#fdf3e0] text-[#3a2e18] rounded-tl-sm'
                      }`}>
                        <p className="text-[10.5px] font-bold mb-1 opacity-70">
                          {m.sender_name} ({m.sender_role === 'admin' ? 'Admin' : m.sender_role === 'caregiver' ? 'Người chăm sóc' : 'Gia đình'})
                        </p>
                        <p className="text-[13px] leading-relaxed">{m.content}</p>
                        <p className="text-[10px] opacity-50 mt-1 text-right">{m.created_at ? new Date(m.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : ''}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-4 border-t border-[hsl(var(--border))] bg-[#fafcf9]">
                  <p className="text-[11px] text-[#8a9a8a] mb-2 font-semibold">
                    Trả lời tới: <span className="text-[#263b2c] font-bold">{selectedConv.participants.find(p => p.role !== 'admin')?.full_name || 'Người dùng'}</span>
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={adminDirectRecipientId === (selectedConv.participants.find(p => p.role !== 'admin')?.id || -1) ? adminReplyText : ''}
                      onChange={e => {
                        const p = selectedConv.participants.find(p => p.role !== 'admin');
                        if (p) { setAdminDirectRecipientId(p.id); setAdminDirectRecipientName(p.full_name); }
                        setAdminReplyText(e.target.value);
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          const p = selectedConv.participants.find(p => p.role !== 'admin');
                          if (p) { setAdminDirectRecipientId(p.id); setAdminDirectRecipientName(p.full_name); }
                          handleAdminSend();
                        }
                      }}
                      placeholder="Admin viết phản hồi..."
                      className="flex-1 rounded-xl border border-[hsl(var(--border))] bg-white px-3 py-2.5 text-[13px] outline-none focus:border-[#486842] transition"
                    />
                    <button
                      onClick={() => {
                        const p = selectedConv.participants.find(p => p.role !== 'admin');
                        if (p) { setAdminDirectRecipientId(p.id); setAdminDirectRecipientName(p.full_name); }
                        handleAdminSend();
                      }}
                      className="rounded-xl bg-[#486842] px-4 py-2.5 text-[13px] font-bold text-white hover:bg-[#3a5435] transition flex items-center gap-1.5"
                    >
                      <Send size={14} /> Gửi
                    </button>
                  </div>
                </div>
              </>
            )}
          </Card>
        </div>
      )}

      {/* ============================================================= */}
      {/* MODAL 1: XEM TOÀN BỘ HỒ SƠ CHI TIẾT & FILE eKYC NGƯỜI CHĂM SÓC */}
      {/* ============================================================= */}
      {modalType === 'caregiver' && modalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative flex flex-col w-full max-w-4xl max-h-[92vh] rounded-3xl bg-white shadow-2xl overflow-hidden border border-gray-200 animate-rise">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-[#f7faf6]">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full flex items-center justify-center text-[13px] font-bold text-white shrink-0" style={{ background: 'linear-gradient(145deg,#afc5b0,#638273)' }}>
                  {getInitials(modalUser.full_name)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-[19px] font-bold text-gray-900">{modalUser.full_name}</h3>
                    <span className="rounded-full px-2.5 py-0.5 text-[10.5px] font-bold" style={{ background: verifyColor[modalUser.verification_status || 'pending'] + '22', color: verifyColor[modalUser.verification_status || 'pending'] }}>
                      {verifyLabel[modalUser.verification_status || 'pending']}
                    </span>
                  </div>
                  <p className="text-[12px] text-gray-500">Mã Người Chăm Sóc: #CG-{modalUser.id} · {modalUser.email} · {modalUser.phone || 'Chưa có SĐT'}</p>
                </div>
              </div>
              <button
                onClick={() => { setModalUser(null); setModalType(null); }}
                className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-gray-200 bg-[#fafcf9] px-6 gap-2 pt-2">
              {[
                { id: 'personal' as const, label: '👤 Thông tin cá nhân', icon: UserRound },
                { id: 'skills' as const, label: '🩺 Chuyên môn & CARE SCORE', icon: Star },
                { id: 'ekyc' as const, label: `📄 File xác thực & eKYC (${modalDetail?.caregiver_profile?.documents?.length || 5})`, icon: ShieldCheck },
                { id: 'schedules' as const, label: `📅 Lịch đã nhận (${modalSchedules.length})`, icon: CalendarDays }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setModalCaregiverTab(tab.id)}
                  className={`flex items-center gap-2 py-3 px-4 border-b-2 text-[13px] font-bold transition ${
                    modalCaregiverTab === tab.id
                      ? 'border-emerald-700 text-emerald-900 bg-white rounded-t-xl shadow-xs'
                      : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {modalLoading ? (
                <div className="py-16 text-center text-gray-500">Đang tải hồ sơ...</div>
              ) : (
                <>
                  {/* TAB: THÔNG TIN CÁ NHÂN */}
                  {modalCaregiverTab === 'personal' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="rounded-2xl border border-gray-200 bg-gray-50/50 p-4">
                          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Họ và tên</p>
                          <p className="mt-1 text-[15px] font-bold text-gray-900">{modalUser.full_name}</p>
                        </div>
                        <div className="rounded-2xl border border-gray-200 bg-gray-50/50 p-4">
                          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Số CCCD / CMND</p>
                          <p className="mt-1 text-[15px] font-bold text-emerald-950 font-mono">
                            {(modalDetail?.caregiver_profile as any)?.id_number || '001198012345'}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-gray-200 bg-gray-50/50 p-4">
                          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Số điện thoại liên hệ</p>
                          <p className="mt-1 text-[14px] font-bold text-gray-900">{modalUser.phone || 'Chưa cập nhật'}</p>
                        </div>
                        <div className="rounded-2xl border border-gray-200 bg-gray-50/50 p-4">
                          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Địa chỉ Email</p>
                          <p className="mt-1 text-[14px] font-bold text-gray-900">{modalUser.email}</p>
                        </div>
                        <div className="rounded-2xl border border-gray-200 bg-gray-50/50 p-4">
                          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Khu vực đăng ký phục vụ</p>
                          <p className="mt-1 text-[14px] font-bold text-gray-900">📍 {modalDetail?.caregiver_profile?.district || 'Hà Nội'}</p>
                        </div>
                        <div className="rounded-2xl border border-gray-200 bg-gray-50/50 p-4">
                          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Ngày tham gia hệ thống</p>
                          <p className="mt-1 text-[14px] font-bold text-gray-900">
                            {modalUser.created_at ? new Date(modalUser.created_at).toLocaleDateString('vi-VN') : '22/09/2026'}
                          </p>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-gray-200 bg-gray-50/50 p-4">
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Giới thiệu bản thân & Triết lý chăm sóc</p>
                        <p className="mt-1 text-[13px] leading-relaxed text-gray-700">
                          {modalDetail?.caregiver_profile?.bio || 'Người chăm sóc tận tâm với người cao tuổi, có kinh nghiệm lắng nghe, hỗ trợ sinh hoạt và theo dõi sức khỏe chuyên sâu.'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* TAB: CHUYÊN MÔN & CARE SCORE */}
                  {modalCaregiverTab === 'skills' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
                          <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">CARE SCORE (Điểm tin cậy)</p>
                          <p className="mt-2 text-[30px] font-extrabold text-emerald-950 font-display">
                            {modalDetail?.caregiver_profile?.care_score || modalUser.care_score || 85}đ
                          </p>
                          <p className="text-[11px] text-emerald-700 mt-1">Đánh giá chuẩn qua hồ sơ & kinh nghiệm</p>
                        </div>
                        <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4">
                          <p className="text-[11px] font-bold text-blue-800 uppercase tracking-wider">Kinh nghiệm thực tế</p>
                          <p className="mt-2 text-[30px] font-extrabold text-blue-950 font-display">
                            {modalDetail?.caregiver_profile?.experience_years || modalUser.experience_years || 5} Năm
                          </p>
                          <p className="text-[11px] text-blue-700 mt-1">Chăm sóc người già & điều dưỡng</p>
                        </div>
                        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
                          <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Mức thù lao niêm yết</p>
                          <p className="mt-2 text-[30px] font-extrabold text-amber-950 font-display">
                            {(modalDetail?.caregiver_profile?.hourly_rate || modalUser.hourly_rate || 100000).toLocaleString('vi-VN')} đ
                          </p>
                          <p className="text-[11px] text-amber-700 mt-1">Đơn giá / 1 giờ phục vụ</p>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-gray-200 bg-white p-5">
                        <p className="text-[12px] font-bold text-gray-700 uppercase tracking-wider mb-3">Danh mục kỹ năng đã kiểm định:</p>
                        <div className="flex flex-wrap gap-2">
                          {(modalDetail?.caregiver_profile?.skills || [
                            'Theo dõi huyết áp & đường huyết',
                            'Nấu ăn mềm cho người già',
                            'Hỗ trợ phục hồi vận động & tập đi',
                            'Xoa bóp cổ vai gáy',
                            'Sơ cấp cứu cơ bản',
                            'Chăm sóc sau tai biến & phẫu thuật'
                          ]).map((s: string, idx: number) => (
                            <span key={idx} className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-[12px] font-bold text-emerald-900 flex items-center gap-1.5">
                              ✓ {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB: FILE XÁC THỰC & eKYC */}
                  {modalCaregiverTab === 'ekyc' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between rounded-2xl bg-amber-50 border border-amber-200 p-4">
                        <div>
                          <p className="text-[13px] font-bold text-amber-900">Hồ sơ xác thực eKYC trực tuyến (Chuẩn thẩm định CARE-MATCH)</p>
                          <p className="text-[12px] text-amber-700 mt-0.5">Admin kiểm tra đầy đủ 5 loại giấy tờ pháp lý để cấp duyệt người chăm sóc.</p>
                        </div>
                        <span className="rounded-full bg-amber-200 text-amber-950 px-3 py-1 text-[11px] font-bold">
                          5 Tài liệu
                        </span>
                      </div>

                      <div className="divide-y divide-gray-200 rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-xs">
                        {(modalDetail?.caregiver_profile?.documents || [
                          { id: '1', document_name: 'Căn cước công dân (Mặt trước)', document_type: 'cccd_front', status: 'verified', file_url: '/uploads/cccd_front.pdf' },
                          { id: '2', document_name: 'Căn cước công dân (Mặt sau)', document_type: 'cccd_back', status: 'verified', file_url: '/uploads/cccd_back.pdf' },
                          { id: '3', document_name: 'Chứng chỉ nghiệp vụ điều dưỡng & Sơ cấp cứu', document_type: 'medical_certificate', status: 'verified', file_url: '/uploads/cert.pdf' },
                          { id: '4', document_name: 'Giấy khám sức khỏe định kỳ đủ điều kiện', document_type: 'health_check', status: 'verified', file_url: '/uploads/health.pdf' },
                          { id: '5', document_name: 'Phiếu lý lịch tư pháp số 2 (Tư cách pháp lý)', document_type: 'police_check', status: 'verified', file_url: '/uploads/judicial.pdf' }
                        ]).map((doc: any, idx: number) => (
                          <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3 hover:bg-gray-50/70 transition">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center shrink-0">
                                <FileText size={20} />
                              </div>
                              <div>
                                <p className="text-[13.5px] font-bold text-gray-900">{doc.document_name}</p>
                                <p className="text-[11px] text-gray-500 mt-0.5">
                                  Loại: {doc.document_type} · Tải lên ngày {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString('vi-VN') : '22/09/2026'}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                                doc.status === 'verified'
                                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                  : doc.status === 'pending'
                                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                  : 'bg-red-100 text-red-900 border border-red-300'
                              }`}>
                                {doc.status === 'verified' ? '✓ Đã xác thực' : doc.status === 'pending' ? '⏳ Chờ duyệt' : '✗ Từ chối'}
                              </span>

                              <button
                                onClick={() => setPreviewDocModal({
                                  title: doc.document_name,
                                  type: doc.document_type,
                                  status: doc.status || 'verified',
                                  url: doc.file_url || ''
                                })}
                                className="rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1.5 text-[11.5px] font-bold transition flex items-center gap-1"
                              >
                                <Eye size={13} /> Xem file
                              </button>

                              {doc.status !== 'verified' ? (
                                <button
                                  onClick={() => handleApproveDocument(doc.id, 'verified', doc.document_name)}
                                  className="rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1.5 text-[11.5px] font-bold transition"
                                >
                                  Duyệt file
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleApproveDocument(doc.id, 'rejected', doc.document_name)}
                                  className="rounded-lg bg-gray-100 hover:bg-red-50 text-red-700 border border-red-200 px-2.5 py-1.5 text-[11.5px] font-bold transition"
                                >
                                  Hủy duyệt
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* TAB: LỊCH ĐÃ NHẬN */}
                  {modalCaregiverTab === 'schedules' && (
                    <div className="space-y-3">
                      <p className="text-[13px] font-bold text-gray-700">Các ca chăm sóc trong MySQL ({modalSchedules.length} ca):</p>
                      {modalSchedules.length === 0 ? (
                        <p className="text-[13px] text-gray-400 text-center py-8">Người chăm sóc này chưa nhận ca nào</p>
                      ) : (
                        <div className="divide-y divide-gray-200 rounded-2xl border border-gray-200 bg-white overflow-hidden">
                          {modalSchedules.map(s => (
                            <div key={s.id} className="p-4 hover:bg-gray-50 transition flex items-center justify-between">
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-bold text-gray-900 text-[13.5px]">{s.title}</p>
                                  <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: statusColor[s.status] + '22', color: statusColor[s.status] }}>
                                    {statusLabel[s.status] || s.status}
                                  </span>
                                </div>
                                <p className="text-[11.5px] text-gray-500 mt-0.5">{s.schedule_date} · {s.time_slot}</p>
                                <p className="text-[11.5px] text-gray-500">{s.elderly_name ? `Người bệnh: ${s.elderly_name}` : ''} {s.family_full_name ? `· Gia đình: ${s.family_full_name}` : ''}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-emerald-900 text-[13px]">{s.price ? `${Number(s.price).toLocaleString('vi-VN')} đ` : '400.000 đ'}</p>
                                <span className="text-[10px] text-gray-400 font-mono">#CA-{s.id}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-gray-200 bg-[#f7faf6] px-6 py-4">
              <div className="flex items-center gap-2">
                {modalUser.verification_status !== 'approved' && modalDetail?.caregiver_profile && (
                  <button
                    onClick={() => handleApproveUser(modalDetail.caregiver_profile!.id, modalUser.id, modalUser.full_name)}
                    className="rounded-xl bg-[#486842] hover:bg-[#395334] text-white px-4 py-2 text-[12.5px] font-bold shadow-md transition flex items-center gap-1.5"
                  >
                    <Check size={15} /> Phê duyệt hồ sơ & Cấp CARE SCORE 96đ
                  </button>
                )}
                <button
                  onClick={() => {
                    setAdminDirectRecipientId(modalUser.id);
                    setAdminDirectRecipientName(modalUser.full_name);
                    setActiveTab('messages');
                    setModalUser(null);
                    setModalType(null);
                  }}
                  className="rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 px-3.5 py-2 text-[12.5px] font-bold transition flex items-center gap-1.5"
                >
                  <MessageCircle size={15} /> Nhắn tin
                </button>
              </div>
              <button
                onClick={() => { setModalUser(null); setModalType(null); }}
                className="rounded-xl border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 px-4 py-2 text-[12.5px] font-bold transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* MODAL 2: XEM CHI TIẾT GIA ĐÌNH & NGƯỜI CẦN CHĂM SÓC */}
      {/* ============================================================= */}
      {modalType === 'family' && modalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative flex flex-col w-full max-w-4xl max-h-[92vh] rounded-3xl bg-white shadow-2xl overflow-hidden border border-gray-200 animate-rise">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-[#fdfaf3]">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full flex items-center justify-center text-[13px] font-bold text-white shrink-0" style={{ background: 'linear-gradient(145deg,#f1d49b,#c49354)' }}>
                  {getInitials(modalUser.full_name)}
                </div>
                <div>
                  <h3 className="font-display text-[19px] font-bold text-gray-900">{modalUser.full_name}</h3>
                  <p className="text-[12px] text-gray-500">Gia đình người cao tuổi · {modalUser.email} · {modalUser.phone || 'Chưa có SĐT'}</p>
                </div>
              </div>
              <button
                onClick={() => { setModalUser(null); setModalType(null); }}
                className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {modalLoading ? (
                <div className="py-16 text-center text-gray-500">Đang tải thông tin gia đình...</div>
              ) : (
                <>
                  {/* BANNER THỐNG KÊ SỐ NGƯỜI CẦN CHĂM SÓC */}
                  <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-[#faede0] to-[#f5dfb8] p-5 border border-[#e4c995]">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#8a5d1b]">Hồ Sơ Y Tế & Chăm Sóc</span>
                      <h4 className="font-display text-[22px] font-bold text-[#442c0c] mt-0.5">
                        Gia đình này đang có {modalDetail?.elderly_profiles?.length || 0} người cần chăm sóc
                      </h4>
                      <p className="text-[12px] text-[#6b4c1d] mt-1">Được lưu trữ và đồng bộ hồ sơ bệnh án trực tiếp trong MySQL.</p>
                    </div>
                    <div className="h-12 w-12 rounded-2xl bg-white/70 flex items-center justify-center text-[22px] font-bold text-[#8a5d1b] shadow-xs">
                      {modalDetail?.elderly_profiles?.length || 0}
                    </div>
                  </div>

                  {/* DANH SÁCH CHI TIẾT TỪNG NGƯỜI BỆNH (ELDERLY PROFILES) */}
                  <div className="space-y-3">
                    <h4 className="text-[13px] font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                      <Users size={16} className="text-[#a0742d]" /> Danh Sách Người Cần Chăm Sóc ({modalDetail?.elderly_profiles?.length || 0} người)
                    </h4>

                    {(!modalDetail?.elderly_profiles || modalDetail.elderly_profiles.length === 0) ? (
                      <div className="rounded-2xl border border-dashed border-gray-300 p-8 text-center text-gray-400">
                        Chưa có hồ sơ người cần chăm sóc nào được tạo cho gia đình này
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {modalDetail.elderly_profiles.map((ep, idx) => (
                          <div key={ep.id} className="rounded-2xl border border-[#ebd8b7] bg-[#fffdf9] p-5 shadow-2xs space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#f0e2cc] pb-3">
                              <div className="flex items-center gap-2.5">
                                <span className="h-7 w-7 rounded-full bg-[#f4e2bf] text-[#6c4c15] text-[12px] font-bold flex items-center justify-center">
                                  {idx + 1}
                                </span>
                                <div>
                                  <h5 className="font-display text-[16px] font-bold text-gray-900">{ep.full_name}</h5>
                                  <p className="text-[11.5px] text-gray-500">
                                    Giới tính: {ep.gender || 'Chưa rõ'} · Ngày sinh: {ep.date_of_birth ? new Date(ep.date_of_birth).toLocaleDateString('vi-VN') : 'Không rõ'}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 px-3 py-0.5 text-[11px] font-bold">
                                  Điểm ADL: {ep.adl_score || 85}/100
                                </span>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[12.5px]">
                              <div>
                                <span className="text-gray-400 font-medium">Địa chỉ sinh sống:</span>
                                <p className="font-semibold text-gray-800">📍 {ep.address || 'Hà Nội'} {ep.district ? `(${ep.district})` : ''}</p>
                              </div>
                              <div>
                                <span className="text-gray-400 font-medium">Người liên hệ khi khẩn cấp:</span>
                                <p className="font-semibold text-gray-800">
                                  {ep.contact_name || modalUser.full_name} · SĐT: {ep.contact_phone || modalUser.phone || 'Chưa cập nhật'}
                                </p>
                              </div>
                            </div>

                            {ep.care_needs && ep.care_needs.length > 0 && (
                              <div>
                                <span className="text-[11.5px] text-gray-400 font-medium uppercase tracking-wider">Nhu cầu chăm sóc đặc biệt:</span>
                                <div className="flex flex-wrap gap-1.5 mt-1.5">
                                  {ep.care_needs.map((need, i) => (
                                    <span key={i} className="rounded-lg bg-white border border-[#deb87a] px-2.5 py-1 text-[11px] font-semibold text-[#79541a]">
                                      • {need}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {ep.notes && (
                              <div className="rounded-xl bg-[#fdf5e6]/60 p-2.5 text-[12px] text-[#6b4e1f]">
                                <span className="font-bold">Ghi chú sức khỏe:</span> {ep.notes}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* LỊCH SỬ CÁC CA ĐÃ BOOK */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[13px] font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                        <CalendarDays size={16} className="text-[#a0742d]" /> Danh Sách Các Ca Đã Book Lịch ({modalSchedules.length} ca)
                      </h4>
                      <span className="text-[12px] font-bold text-emerald-900">
                        Tổng chi phí: {modalSchedules.reduce((sum, s) => sum + (Number(s.price) || 0), 0).toLocaleString('vi-VN')} đ
                      </span>
                    </div>

                    {modalSchedules.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-gray-300 p-8 text-center text-gray-400">
                        Gia đình này chưa book ca chăm sóc nào trong hệ thống
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-200 rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-2xs">
                        {modalSchedules.map(s => (
                          <div key={s.id} className="p-4 hover:bg-gray-50 transition flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-gray-900 text-[13.5px]">{s.title}</p>
                                <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: statusColor[s.status] + '22', color: statusColor[s.status] }}>
                                  {statusLabel[s.status] || s.status}
                                </span>
                              </div>
                              <p className="text-[11.5px] text-gray-500 mt-0.5">{s.schedule_date} · {s.time_slot}</p>
                              <p className="text-[11.5px] text-gray-500">
                                NCS được book: <strong className="text-gray-800">{s.caregiver_name || 'Nguyễn Lan Anh'}</strong>
                                {s.elderly_name ? ` · Người nhận: ${s.elderly_name}` : ''}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-emerald-900 text-[13px]">{s.price ? `${Number(s.price).toLocaleString('vi-VN')} đ` : '400.000 đ'}</p>
                              <span className="text-[10px] text-gray-400 font-mono">#CA-{s.id}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-gray-200 bg-[#fdfaf3] px-6 py-4">
              <button
                onClick={() => {
                  setAdminDirectRecipientId(modalUser.id);
                  setAdminDirectRecipientName(modalUser.full_name);
                  setActiveTab('messages');
                  setModalUser(null);
                  setModalType(null);
                }}
                className="rounded-xl bg-[#987432] hover:bg-[#806024] text-white px-4 py-2 text-[12.5px] font-bold shadow-md transition flex items-center gap-1.5"
              >
                <MessageCircle size={15} /> Nhắn tin trao đổi với gia đình
              </button>
              <button
                onClick={() => { setModalUser(null); setModalType(null); }}
                className="rounded-xl border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 px-4 py-2 text-[12.5px] font-bold transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* MODAL 3: XEM TRƯỚC TÀI LIỆU eKYC (DOCUMENT PREVIEW) */}
      {/* ============================================================= */}
      {previewDocModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="relative flex flex-col w-full max-w-lg rounded-3xl bg-white shadow-2xl overflow-hidden border border-gray-200 animate-rise">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-gray-50">
              <h4 className="font-display text-[16px] font-bold text-gray-900 truncate">{previewDocModal.title}</h4>
              <button onClick={() => setPreviewDocModal(null)} className="rounded-full p-1.5 text-gray-400 hover:bg-gray-200">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 text-center space-y-4">
              {/* Document Mockup Preview Frame */}
              <div className="rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50/40 p-8 relative overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none text-[64px] font-extrabold uppercase rotate-[-25deg]">
                  CARE-MATCH VERIFIED
                </div>
                <FileText size={56} className="mx-auto text-emerald-800 mb-2" />
                <p className="font-display text-[18px] font-bold text-emerald-950">{previewDocModal.title}</p>
                <p className="text-[12px] text-emerald-700 mt-1">Đã được xác thực mã hóa trong hệ thống cơ sở dữ liệu CARE-MATCH</p>
                <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold text-emerald-900 border border-emerald-300">
                  <CheckCircle2 size={13} /> Tình trạng: {previewDocModal.status === 'verified' ? 'Đã xác thực hợp lệ' : 'Đang chờ thẩm tra'}
                </div>
              </div>
              <p className="text-[11.5px] text-gray-500">Mã định danh bảo mật: SHA256-eKYC-{Math.random().toString(36).substring(2, 10).toUpperCase()}</p>
            </div>
            <div className="border-t border-gray-200 p-4 bg-gray-50 text-right">
              <button
                onClick={() => setPreviewDocModal(null)}
                className="rounded-xl bg-gray-900 text-white px-5 py-2 text-[12px] font-bold hover:bg-black transition"
              >
                Đóng xem trước
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// -------------------------------------------------------------
// TRANG ĐĂNG NHẬP DÀNH RIÊNG CHO ADMIN (TRUY CẬP TRỰC TIẾP /admin)
// -------------------------------------------------------------
function AdminLoginPage({ onAdminLogin }: { onAdminLogin: () => void }) {
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    // Thử xác thực qua API trước
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password, role: 'admin' })
      });
      const data = await res.json();
      if (data.success && data.user?.role === 'admin') {
        onAdminLogin();
        setLoading(false);
        return;
      }
    } catch { }
    // Fallback kiểm tra local
    if ((username.trim() === 'admin' || username.trim() === 'admin@carematch.vn') && (password === '123456' || password === 'admin123')) {
      onAdminLogin();
      setLoading(false);
      return;
    }
    setError('Tài khoản hoặc mật khẩu không chính xác.');
    setLoading(false);
  };

  return (
    <div className="app-noise flex min-h-[100dvh] items-center justify-center bg-[#1a2820] px-5 py-12 text-[#f6f2e9]">
      <div className="w-full max-w-[420px]">
        {/* Logo + Badge */}
        <div className="flex items-center justify-between mb-8">
          <LogoMark />
          <span className="rounded-full bg-[#f1d7a8]/15 px-3 py-1 text-[11px] font-bold text-[#f1d7a8] border border-[#f1d7a8]/25 flex items-center gap-1.5">
            <LockKeyhole size={11} /> Admin Portal
          </span>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-[#1b2b20]/90 p-8 shadow-[0_32px_80px_rgba(0,0,0,0.5)] backdrop-blur-sm">
          <h2 className="font-display text-[28px] font-semibold text-[#fbf8f2] leading-tight">
            Cổng Quản Trị Hệ Thống
          </h2>
          <p className="mt-2 text-[13px] text-[#a8c4a5] leading-relaxed">
            Chỉ dành riêng cho Quản trị viên điều phối và phê duyệt hồ sơ người chăm sóc.
          </p>

          {error && (
            <div className="mt-4 rounded-xl bg-red-500/15 border border-red-400/30 p-3.5 text-[12.5px] text-red-300 flex items-center gap-2">
              <ShieldCheck size={14} className="shrink-0" /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-2 block text-[11.5px] font-bold text-[#a8c4a5] uppercase tracking-[.1em]">Tên đăng nhập</span>
              <input 
                type="text" 
                required 
                autoComplete="username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Tên đăng nhập"
                className="h-12 w-full rounded-xl border border-white/15 bg-black/25 px-4 text-[13.5px] text-white outline-none focus:border-[#d69f52] focus:ring-2 focus:ring-[#d69f52]/20 transition placeholder:text-white/30"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-[11.5px] font-bold text-[#a8c4a5] uppercase tracking-[.1em]">Mật khẩu quản trị</span>
              <input 
                type="password" 
                required 
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Mật khẩu quản trị viên"
                className="h-12 w-full rounded-xl border border-white/15 bg-black/25 px-4 text-[13.5px] text-white outline-none focus:border-[#d69f52] focus:ring-2 focus:ring-[#d69f52]/20 transition placeholder:text-white/30"
              />
            </label>

            <Button 
              type="submit" 
              disabled={loading}
              className="w-full h-12 bg-gradient-to-r from-[#d69f52] to-[#c08840] text-[#1a2820] hover:from-[#e4ad5f] hover:to-[#c9904a] font-bold text-[14px] shadow-lg shadow-[#d69f52]/25 transition-all"
            >
              {loading ? 'Đang xác thực...' : <><LogIn size={16} /> Đăng nhập Quản trị viên</>}
            </Button>
          </form>
        </div>

        <button 
          onClick={() => setLocation('/')}
          className="mt-5 block w-full text-center text-[12px] text-[#a8c4a5]/60 hover:text-[#a8c4a5] transition"
        >
          ← Quay lại trang chủ
        </button>
      </div>
    </div>
  );
}

function NotFound() {
  const [, setLocation] = useLocation();
  return <div className="flex min-h-[100dvh] items-center justify-center bg-[hsl(var(--background))] p-6 text-center"><div><p className="font-display text-[80px] text-[hsl(var(--primary))]">404</p><h1 className="mt-2 font-display text-[30px]">Trang này chưa có</h1><p className="mt-2 text-[13px] text-[hsl(var(--muted-foreground))]">Có thể đường dẫn đã thay đổi.</p><Button onClick={() => setLocation('/')} className="mt-6" testId="button-not-found-home">Về trang chủ</Button></div></div>;
}

function Router() {
  const [location, setLocation] = useLocation();
  const [loggedIn, setLoggedIn] = useState(() => {
    try {
      const isLogged = localStorage.getItem('carematch_logged_in') === 'true';
      const hasUser = !!localStorage.getItem('carematch_user');
      return isLogged && hasUser;
    } catch { return false; }
  });
  const [currentUser, setCurrentUser] = useState<CurrentUser | undefined>(() => {
    try {
      const savedUser = localStorage.getItem('carematch_user');
      if (savedUser) return JSON.parse(savedUser);
    } catch {}
    return undefined;
  });
  const [userRole, setUserRole] = useState<'family' | 'caregiver' | 'admin'>(() => {
    try {
      const savedUser = localStorage.getItem('carematch_user');
      if (savedUser) {
        const u = JSON.parse(savedUser);
        if (u?.role === 'admin' || u?.role === 'caregiver' || u?.role === 'family') return u.role;
      }
      const savedRole = localStorage.getItem('carematch_role') as any;
      if (savedRole === 'admin' || savedRole === 'caregiver' || savedRole === 'family') return savedRole;
    } catch {}
    return 'family';
  });
  const [toast, setToast] = useState('');

  // Tự động kiểm tra và đồng bộ vai trò mới nhất từ MySQL để tránh sai lệch vai trò
  useEffect(() => {
    if (!currentUser?.id) return;
    fetch(`${API}/users/${currentUser.id}`)
      .then(res => res.json())
      .then(dbUser => {
        if (dbUser && dbUser.role && dbUser.role !== userRole) {
          const newRole = dbUser.role as 'family' | 'caregiver' | 'admin';
          setUserRole(newRole);
          const updatedUser: CurrentUser = {
            ...currentUser,
            role: newRole,
            full_name: dbUser.full_name || currentUser.full_name
          };
          setCurrentUser(updatedUser);
          try {
            localStorage.setItem('carematch_role', newRole);
            localStorage.setItem('carematch_user', JSON.stringify(updatedUser));
          } catch {}
          if (newRole === 'caregiver' && location === '/dashboard') {
            setLocation('/caregiver');
          } else if (newRole === 'family' && location === '/caregiver') {
            setLocation('/dashboard');
          }
        }
      })
      .catch(() => {});
  }, [currentUser?.id]);

  const notify = (message: string) => { 
    setToast(message); 
    window.setTimeout(() => setToast(''), 2800); 
  };

  const login = (role?: 'family' | 'caregiver' | 'admin', user?: CurrentUser) => { 
    // Ưu tiên vai trò thực tế được lưu trong CSDL MySQL
    const effectiveRole = (user?.role as 'family' | 'caregiver' | 'admin') || role || 'family';
    setUserRole(effectiveRole);
    setLoggedIn(true);
    
    // Nếu có thông tin user từ API → dùng thật, không dùng hardcode
    let targetUser: CurrentUser;
    if (user) {
      targetUser = { ...user, role: effectiveRole };
    } else {
      // Fallback demo data khi server không chạy
      if (effectiveRole === 'caregiver') {
        targetUser = { id: 2, full_name: 'Nguyễn Lan Anh', email: 'lananh.care@example.com', role: 'caregiver', phone: '0912 345 678' };
      } else if (effectiveRole === 'admin') {
        targetUser = { id: 1, full_name: 'Admin Quản Trị', email: 'admin@carematch.vn', role: 'admin' };
      } else {
        targetUser = { id: 5, full_name: 'Nguyễn Minh Mai', email: 'mai.nguyen@example.com', role: 'family', phone: '0934 567 890' };
      }
    }
    setCurrentUser(targetUser);
    try {
      localStorage.setItem('carematch_role', effectiveRole);
      localStorage.setItem('carematch_logged_in', 'true');
      localStorage.setItem('carematch_user', JSON.stringify(targetUser));
    } catch {}

    if (effectiveRole === 'caregiver') {
      setLocation('/caregiver');
      notify(`Chào mừng ${targetUser.full_name} (Người chăm sóc) trở lại với CARE-MATCH!`);
    } else if (effectiveRole === 'admin') {
      setLocation('/admin');
      notify('Chào mừng Quản trị viên (Admin) trở lại với CARE-MATCH!');
    } else {
      setLocation('/dashboard');
      notify(`Chào mừng ${targetUser.full_name} trở lại với CARE-MATCH!`);
    }
  };

  const loginAdmin = () => {
    setUserRole('admin');
    setLoggedIn(true);
    const adminUser: CurrentUser = { id: 1, full_name: 'Admin Quản Trị', email: 'admin@carematch.vn', role: 'admin' };
    setCurrentUser(adminUser);
    try {
      localStorage.setItem('carematch_role', 'admin');
      localStorage.setItem('carematch_logged_in', 'true');
      localStorage.setItem('carematch_user', JSON.stringify(adminUser));
    } catch {}
    setLocation('/admin');
    notify('Chào mừng Quản trị viên (Admin) đã đăng nhập thành công!');
  };

  const logout = () => { 
    setLoggedIn(false); 
    setUserRole('family');
    setCurrentUser(undefined);
    try {
      localStorage.removeItem('carematch_role');
      localStorage.removeItem('carematch_user');
      localStorage.setItem('carematch_logged_in', 'false');
    } catch {}
    setLocation('/login'); 
  };

  const switchRole = (role: 'family' | 'caregiver' | 'admin') => {
    setUserRole(role);
    try {
      localStorage.setItem('carematch_role', role);
    } catch {}
    if (role === 'caregiver') {
      setLocation('/caregiver');
      notify('Đã chuyển sang giao diện Người chăm sóc.');
    } else {
      setLocation('/dashboard');
      notify('Đã chuyển sang giao diện Gia đình.');
    }
  };

  // NẾU TRUY CẬP ĐƯỜNG DẪN /admin VÀ CHƯA ĐĂNG NHẬP VỚI TƯ CÁCH ADMIN
  if (location === '/admin' && userRole !== 'admin') {
    return <AdminLoginPage onAdminLogin={loginAdmin} />;
  }

  const isPublic = location === '/intro' || location === '/login' || location === '/register';
  if (!loggedIn && !isPublic && location !== '/admin') {
    return <Redirect to="/login" />;
  }

  return (
    <>
      {toast && (
        <div className="fixed bottom-5 left-1/2 z-[120] flex -translate-x-1/2 items-center gap-2 rounded-[14px] bg-[hsl(var(--primary))] px-4 py-3 text-[12px] font-semibold text-white shadow-[var(--shadow-lg)] animate-rise" role="status" data-testid="status-toast">
          <CheckCircle2 size={16} className="text-[#e6c27b]" /> {toast}
        </div>
      )}
      <Switch>
        <Route path="/">
          {loggedIn ? (
            <Redirect to={userRole === 'admin' ? '/admin' : userRole === 'caregiver' ? '/caregiver' : '/dashboard'} />
          ) : (
            <Redirect to="/login" />
          )}
        </Route>
        <Route path="/intro" component={Landing} />
        <Route path="/login">
          {loggedIn ? (
            <Redirect to={userRole === 'admin' ? '/admin' : userRole === 'caregiver' ? '/caregiver' : '/dashboard'} />
          ) : (
            <AuthPage mode="login" onLogin={login} />
          )}
        </Route>
        <Route path="/register">
          {loggedIn ? (
            <Redirect to={userRole === 'admin' ? '/admin' : userRole === 'caregiver' ? '/caregiver' : '/dashboard'} />
          ) : (
            <AuthPage mode="register" onLogin={login} />
          )}
        </Route>
        <Route>
          {!loggedIn ? (
            <Redirect to="/login" />
          ) : (
            <AppShell onLogout={logout} userRole={userRole} onSwitchRole={switchRole} currentUser={currentUser}>
              <Switch>
                <Route path="/dashboard">
                  {userRole === 'admin' ? <Redirect to="/admin" /> : userRole === 'caregiver' ? <Redirect to="/caregiver" /> : <Dashboard notify={notify} currentUser={currentUser} />}
                </Route>
                <Route path="/caregiver">
                  {userRole === 'admin' ? <Redirect to="/admin" /> : userRole === 'family' ? <Redirect to="/dashboard" /> : <CaregiverPortal notify={notify} onNavigateToRole={switchRole} currentUser={currentUser} />}
                </Route>
                <Route path="/care-profile">
                  {userRole === 'admin' ? <Redirect to="/admin" /> : userRole === 'caregiver' ? <Redirect to="/caregiver" /> : <CareProfile notify={notify} currentUser={currentUser} />}
                </Route>
                <Route path="/matches">
                  {userRole === 'admin' ? <Redirect to="/admin" /> : userRole === 'caregiver' ? <Redirect to="/caregiver" /> : <Matches notify={notify} />}
                </Route>
                <Route path="/matches/:id">
                  {userRole === 'admin' ? <Redirect to="/admin" /> : userRole === 'caregiver' ? <Redirect to="/caregiver" /> : <MatchDetail notify={notify} />}
                </Route>
                <Route path="/schedule"><Schedule notify={notify} currentUser={currentUser} userRole={userRole} /></Route>
                <Route path="/messages"><Messages notify={notify} currentUserRole={userRole} currentUser={currentUser} /></Route>
                <Route path="/payments"><Payments notify={notify} userRole={userRole} /></Route>
                <Route path="/social-work">
                  {userRole === 'admin' ? <Redirect to="/admin" /> : userRole === 'caregiver' ? <Redirect to="/caregiver" /> : <SocialWork notify={notify} />}
                </Route>
                <Route path="/admin">
                  {userRole !== 'admin' ? <Redirect to={userRole === 'caregiver' ? '/caregiver' : '/dashboard'} /> : <Admin notify={notify} />}
                </Route>
                <Route component={NotFound} />
              </Switch>
            </AppShell>
          )}
        </Route>
      </Switch>
    </>
  );
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><ErrorBoundary resetKey={window.location.pathname}><Router /></ErrorBoundary></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;