import { useState, useEffect } from 'react';
import { 
  Users2, 
  Search, 
  MapPin, 
  Calendar, 
  Clock, 
  UserCheck, 
  QrCode, 
  ExternalLink, 
  Copy, 
  Check, 
  X, 
  Sparkles, 
  Heart,
  Share2,
  ShieldCheck,
  Activity
} from 'lucide-react';
import { API } from '@/lib/apiConfig';

export interface CommunityItem {
  id: number;
  name: string;
  category: string;
  description: string;
  meeting_schedule: string;
  location: string;
  member_count: number;
  leader_name: string;
  tags: string[];
  zalo_link: string;
  qr_code_url: string;
  status: 'active' | 'inactive';
}

const CATEGORIES = [
  'Tất cả',
  'Vận động ngoài trời',
  'Thể dục nhịp điệu',
  'Yoga & Khí công',
  'Giao lưu & Tâm lý',
  'Tư vấn y tế',
  'Rèn luyện trí não'
];

export function CommunityView({ notify = (_msg: string) => {} }: { notify?: (msg: string) => void }) {
  const [communities, setCommunities] = useState<CommunityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('Tất cả');
  const [selectedCommunity, setSelectedCommunity] = useState<CommunityItem | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchCommunities = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/communities`);
      if (res.ok) {
        const data = await res.json();
        setCommunities(data.communities || []);
      }
    } catch (err) {
      console.error('Lỗi tải danh sách cộng đồng:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommunities();
  }, []);

  const filteredCommunities = communities.filter(c => {
    const matchCategory = activeCategory === 'Tất cả' || c.category === activeCategory;
    const s = search.toLowerCase();
    const matchSearch = !s || 
      c.name.toLowerCase().includes(s) || 
      c.description.toLowerCase().includes(s) || 
      c.location.toLowerCase().includes(s) || 
      c.leader_name.toLowerCase().includes(s);
    return matchCategory && matchSearch;
  });

  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    notify('Đã sao chép đường dẫn nhóm Zalo vào bộ nhớ tạm!');
    setTimeout(() => setCopied(false), 2500);
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'Vận động ngoài trời':
        return { bg: 'bg-emerald-50 text-emerald-800 border-emerald-200', tag: 'bg-emerald-100 text-emerald-700' };
      case 'Thể dục nhịp điệu':
        return { bg: 'bg-amber-50 text-amber-800 border-amber-200', tag: 'bg-amber-100 text-amber-700' };
      case 'Yoga & Khí công':
        return { bg: 'bg-teal-50 text-teal-800 border-teal-200', tag: 'bg-teal-100 text-teal-700' };
      case 'Giao lưu & Tâm lý':
        return { bg: 'bg-rose-50 text-rose-800 border-rose-200', tag: 'bg-rose-100 text-rose-700' };
      case 'Tư vấn y tế':
        return { bg: 'bg-blue-50 text-blue-800 border-blue-200', tag: 'bg-blue-100 text-blue-700' };
      case 'Rèn luyện trí não':
        return { bg: 'bg-purple-50 text-purple-800 border-purple-200', tag: 'bg-purple-100 text-purple-700' };
      default:
        return { bg: 'bg-slate-50 text-slate-800 border-slate-200', tag: 'bg-slate-100 text-slate-700' };
    }
  };

  return (
    <div className="space-y-7 animate-rise">
      {/* Banner Tiêu đề Trang Cộng Đồng */}
      <div className="relative overflow-hidden rounded-[26px] bg-gradient-to-br from-[#2f4b36] via-[#3a5d44] to-[#26402d] p-7 sm:p-9 text-white shadow-lg">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-72 w-72 rounded-full bg-white/5 blur-3xl pointer-events-none" />
        <div className="absolute right-12 bottom-4 opacity-10 pointer-events-none hidden sm:block">
          <Users2 size={180} />
        </div>

        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1 text-[11px] font-bold uppercase tracking-wider backdrop-blur-md">
            <Sparkles size={14} className="text-[#f1d49b]" />
            Cộng Đồng Tuổi Vàng & Gia Đình Đồng Hành
          </div>
          <h1 className="mt-4 font-display text-[30px] sm:text-[38px] font-semibold leading-[1.15] tracking-tight">
            Luôn có người để sẻ chia & cùng vui khỏe mỗi ngày
          </h1>
          <p className="mt-3 text-[14px] leading-relaxed text-white/80">
            Không gian kết nối các câu lạc bộ dưỡng sinh, aerobic, đi bộ buổi sáng, yoga và trà đạo đàm tâm. 
            Mỗi cộng đồng đều có nhóm Zalo riêng để các bác và gia đình giao lưu, hẹn giờ tập và nhận lời khuyên sức khỏe.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-4 text-[12px] font-medium text-white/90">
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={16} className="text-[#f1d49b]" /> Nhóm Zalo được điều phối & kiểm duyệt
            </span>
            <span className="flex items-center gap-1.5">
              <Activity size={16} className="text-[#f1d49b]" /> Hoạt động đều đặn & miễn phí 100%
            </span>
          </div>
        </div>
      </div>

      {/* Thanh Tìm Kiếm & Lọc Danh Mục */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Thanh tìm kiếm */}
        <div className="relative flex-1 max-w-md">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Tìm theo tên CLB, địa điểm hoặc hoạt động..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-2xl border border-stone-200 bg-white py-2.5 pl-10 pr-4 text-[13px] text-stone-800 placeholder-stone-400 focus:border-[#3a5d44] focus:outline-none focus:ring-2 focus:ring-[#3a5d44]/20 shadow-xs"
          />
          {search && (
            <button 
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Tổng số lượng */}
        <div className="text-[13px] font-semibold text-stone-500">
          Hiển thị <span className="font-bold text-[#2f4b36]">{filteredCommunities.length}</span> cộng đồng hoạt động
        </div>
      </div>

      {/* Danh mục lọc Buttons */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => {
          const active = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`rounded-full px-4 py-1.5 text-[12px] font-semibold transition-all ${
                active
                  ? 'bg-[#3a5d44] text-white shadow-xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200/80'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Danh Sách Các Thẻ Cộng Đồng */}
      {loading ? (
        <div className="py-20 text-center text-stone-400">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-3 border-solid border-[#3a5d44] border-r-transparent" />
          <p className="mt-3 text-[13px]">Đang tải danh sách các câu lạc bộ cộng đồng...</p>
        </div>
      ) : filteredCommunities.length === 0 ? (
        <div className="rounded-[22px] border border-dashed border-stone-300 bg-stone-50/70 p-12 text-center">
          <Users2 size={44} className="mx-auto text-stone-300" />
          <h3 className="mt-3 font-display text-[18px] font-semibold text-stone-700">Không tìm thấy cộng đồng phù hợp</h3>
          <p className="mt-1 text-[13px] text-stone-500">Vui lòng thử tìm từ khóa khác hoặc chọn xem "Tất cả" danh mục.</p>
          <button
            onClick={() => { setSearch(''); setActiveCategory('Tất cả'); }}
            className="mt-4 rounded-xl bg-stone-200 px-4 py-2 text-[12px] font-bold text-stone-700 hover:bg-stone-300"
          >
            Xem tất cả cộng đồng
          </button>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filteredCommunities.map((c) => {
            const colors = getCategoryColor(c.category);
            return (
              <div 
                key={c.id}
                className="group flex flex-col justify-between rounded-[22px] border border-stone-200 bg-white p-6 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-[#3a5d44]/40 hover:shadow-md"
              >
                <div>
                  {/* Category */}
                  <div className="flex items-center justify-between gap-2">
                    <span className={`rounded-full px-3 py-0.5 text-[11px] font-bold border ${colors.bg}`}>
                      {c.category}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10.5px] font-bold text-emerald-800 border border-emerald-200">
                      <ShieldCheck size={12} className="text-emerald-700" />
                      CARE-MATCH Quản lý
                    </span>
                  </div>

                  {/* Tên cộng đồng */}
                  <h3 className="mt-3.5 font-display text-[18px] font-bold leading-snug text-stone-800 group-hover:text-[#2f4b36] transition-colors">
                    {c.name}
                  </h3>

                  {/* Mô tả */}
                  <p className="mt-2 text-[13px] leading-relaxed text-stone-600 line-clamp-3">
                    {c.description}
                  </p>

                  {/* Thông tin lịch & địa điểm */}
                  <div className="mt-4 space-y-2 rounded-xl bg-stone-50 p-3 text-[12px] text-stone-600 border border-stone-100">
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-[#3a5d44] shrink-0" />
                      <span className="font-semibold text-stone-700">Lịch:</span>
                      <span className="truncate">{c.meeting_schedule}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-[#3a5d44] shrink-0" />
                      <span className="font-semibold text-stone-700">Tại:</span>
                      <span className="truncate">{c.location}</span>
                    </div>
                  </div>

                  {/* Tags */}
                  {c.tags && c.tags.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {c.tags.slice(0, 3).map((tag, idx) => (
                        <span key={idx} className="rounded-md bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-600">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Nút Tham Gia Nhóm Zalo */}
                <div className="mt-6 pt-4 border-t border-stone-100 flex items-center gap-2">
                  <button
                    onClick={() => setSelectedCommunity(c)}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0068ff] to-[#008fe5] py-2.5 px-4 text-[13px] font-bold text-white shadow-xs hover:brightness-105 active:scale-[0.98] transition-all"
                  >
                    <QrCode size={16} />
                    Tham gia nhóm Zalo
                  </button>
                  <button
                    onClick={() => handleCopyLink(c.zalo_link)}
                    title="Sao chép liên kết Zalo"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-stone-200 text-stone-500 hover:bg-stone-50 hover:text-stone-700 transition-colors"
                  >
                    <Share2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL QUÉT MÃ QR NHÓM ZALO */}
      {selectedCommunity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fadeIn">
          <div className="relative w-full max-w-md rounded-[28px] bg-white p-7 text-stone-800 shadow-2xl animate-scaleUp">
            {/* Nút đóng */}
            <button
              onClick={() => setSelectedCommunity(null)}
              className="absolute right-5 top-5 rounded-full p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-colors"
            >
              <X size={20} />
            </button>

            {/* Header Modal */}
            <div className="text-center">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0068ff]/10 text-[#0068ff]">
                <QrCode size={26} />
              </div>
              <span className="mt-2 block text-[11px] font-bold uppercase tracking-wider text-[#0068ff]">
                Quét Mã QR Vào Nhóm Zalo
              </span>
              <h2 className="mt-1 font-display text-[21px] font-bold text-stone-900 leading-tight">
                {selectedCommunity.name}
              </h2>
              <p className="mt-1 text-[12px] text-stone-500">
                {selectedCommunity.category} · {selectedCommunity.member_count} thành viên
              </p>
            </div>

            {/* Khung Mã QR Code */}
            <div className="mt-6 flex flex-col items-center justify-center rounded-[22px] bg-gradient-to-b from-stone-50 to-stone-100/80 p-6 border border-stone-200/80 shadow-inner">
              <div className="relative rounded-2xl bg-white p-3 shadow-md border border-stone-200">
                <img
                  src={selectedCommunity.qr_code_url || `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(selectedCommunity.zalo_link)}`}
                  alt={`Mã QR ${selectedCommunity.name}`}
                  className="h-52 w-52 object-contain rounded-lg"
                />
                {/* Logo Zalo nhỏ ở giữa QR code */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="rounded-lg bg-[#0068ff] px-2 py-0.5 text-[10px] font-black text-white shadow-md border-2 border-white">
                    Zalo
                  </div>
                </div>
              </div>

              {/* Hướng dẫn quét */}
              <div className="mt-4 text-center">
                <p className="text-[12px] font-semibold text-stone-700">
                  📱 Dùng ứng dụng <span className="text-[#0068ff] font-bold">Zalo</span> trên điện thoại quét mã QR này
                </p>
                <p className="mt-1 text-[11px] text-stone-500">
                  Hoặc bạn có thể bấm nút bên dưới để mở trực tiếp nhóm trên trình duyệt.
                </p>
              </div>
            </div>

            {/* Các Nút Thao Tác Trực Tiếp */}
            <div className="mt-6 space-y-2.5">
              <a
                href={selectedCommunity.zalo_link}
                target="_blank"
                rel="noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0068ff] py-3 px-4 text-[13px] font-bold text-white shadow-sm hover:bg-[#005cd6] active:scale-[0.98] transition-all"
              >
                <ExternalLink size={16} />
                Mở nhóm Zalo trên trình duyệt
              </a>

              <div className="flex gap-2">
                <button
                  onClick={() => handleCopyLink(selectedCommunity.zalo_link)}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-stone-50 py-2.5 px-3 text-[12px] font-semibold text-stone-700 hover:bg-stone-100 transition-colors"
                >
                  {copied ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
                  {copied ? 'Đã sao chép link' : 'Sao chép link Zalo'}
                </button>
                <button
                  onClick={() => setSelectedCommunity(null)}
                  className="rounded-xl border border-stone-200 px-4 py-2.5 text-[12px] font-semibold text-stone-600 hover:bg-stone-100 transition-colors"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
