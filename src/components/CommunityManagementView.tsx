import { useState, useEffect } from 'react';
import { 
  Users2, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  QrCode, 
  ExternalLink, 
  Download, 
  Check, 
  X, 
  Sparkles, 
  Clock, 
  MapPin, 
  UserCheck, 
  Eye, 
  AlertTriangle 
} from 'lucide-react';
import { CommunityItem } from './CommunityView';

const CATEGORIES = [
  'Vận động ngoài trời',
  'Thể dục nhịp điệu',
  'Yoga & Khí công',
  'Giao lưu & Tâm lý',
  'Tư vấn y tế',
  'Rèn luyện trí não',
  'Khác'
];

export function CommunityManagementView({ notify = (_msg: string) => {} }: { notify?: (msg: string) => void }) {
  const [communities, setCommunities] = useState<CommunityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCommunity, setEditingCommunity] = useState<CommunityItem | null>(null);
  const [previewQrCommunity, setPreviewQrCommunity] = useState<CommunityItem | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    category: 'Vận động ngoài trời',
    description: '',
    meeting_schedule: '',
    location: '',
    member_count: 50,
    leader_name: '',
    tags: '',
    zalo_link: '',
    qr_code_url: '',
    status: 'active' as 'active' | 'inactive'
  });

  const fetchCommunities = async () => {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:5000/api/admin/communities');
      if (res.ok) {
        const data = await res.json();
        setCommunities(data.communities || []);
      }
    } catch (err) {
      console.error('Lỗi tải danh sách cộng đồng admin:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommunities();
  }, []);

  const openAddModal = () => {
    setEditingCommunity(null);
    setFormData({
      name: '',
      category: 'Vận động ngoài trời',
      description: '',
      meeting_schedule: '05:30 - 06:45 Hàng ngày',
      location: 'Hà Nội',
      member_count: 60,
      leader_name: 'Ban Điều Phối CARE-MATCH',
      tags: 'Dưỡng sinh, Sức khỏe, Giao lưu',
      zalo_link: 'https://zalo.me/g/carematch_clb',
      qr_code_url: '',
      status: 'active'
    });
    setIsModalOpen(true);
  };

  const openEditModal = (c: CommunityItem) => {
    setEditingCommunity(c);
    setFormData({
      name: c.name,
      category: c.category,
      description: c.description || '',
      meeting_schedule: c.meeting_schedule || '',
      location: c.location || '',
      member_count: c.member_count || 50,
      leader_name: c.leader_name || '',
      tags: Array.isArray(c.tags) ? c.tags.join(', ') : '',
      zalo_link: c.zalo_link || '',
      qr_code_url: c.qr_code_url || '',
      status: c.status || 'active'
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      notify('Vui lòng nhập tên câu lạc bộ / cộng đồng!');
      return;
    }

    try {
      const payload = {
        ...formData,
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
        qr_code_url: formData.qr_code_url || `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(formData.zalo_link || 'https://zalo.me/g/carematch_community')}`
      };

      if (editingCommunity) {
        // Cập nhật
        const res = await fetch(`http://localhost:5000/api/communities/${editingCommunity.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          notify('Đã cập nhật câu lạc bộ thành công!');
          setIsModalOpen(false);
          fetchCommunities();
        }
      } else {
        // Thêm mới
        const res = await fetch('http://localhost:5000/api/communities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          notify('Đã thêm câu lạc bộ mới thành công!');
          setIsModalOpen(false);
          fetchCommunities();
        }
      }
    } catch (err) {
      notify('Có lỗi xảy ra khi lưu thông tin cộng đồng.');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa cộng đồng này khỏi hệ thống?')) return;
    try {
      const res = await fetch(`http://localhost:5000/api/communities/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        notify('Đã xóa cộng đồng thành công!');
        fetchCommunities();
      }
    } catch (err) {
      notify('Lỗi xóa cộng đồng.');
    }
  };

  // Tải file CSV thật về máy tính
  const handleExportCsv = () => {
    if (communities.length === 0) {
      notify('Chưa có dữ liệu để xuất file CSV.');
      return;
    }

    const header = [
      'ID',
      'Tên Câu Lạc Bộ / Cộng Đồng',
      'Danh Mục',
      'Lịch Sinh Hoạt',
      'Địa Điểm Tổ Chức',
      'Số Lượng Thành Viên',
      'Trưởng Nhóm / Điều Phối',
      'Link Nhóm Zalo',
      'Trạng Thái'
    ];

    const escape = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const csvLines = [header.join(',')];
    for (const c of communities) {
      const line = [
        escape(c.id),
        escape(c.name),
        escape(c.category),
        escape(c.meeting_schedule),
        escape(c.location),
        escape(c.member_count),
        escape(c.leader_name),
        escape(c.zalo_link),
        escape(c.status === 'active' ? 'Đang hoạt động' : 'Tạm dừng')
      ];
      csvLines.push(line.join(','));
    }

    const csvContent = '\uFEFF' + csvLines.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Danh_Sach_Cong_Dong_CareMatch_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    notify('Đã tải xuống file CSV danh sách cộng đồng thành công!');
  };

  const filtered = communities.filter(c => {
    const matchCat = selectedCategory === 'Tất cả' || c.category === selectedCategory;
    const s = search.toLowerCase();
    const matchSearch = !s || 
      c.name.toLowerCase().includes(s) || 
      c.location.toLowerCase().includes(s) || 
      c.leader_name.toLowerCase().includes(s);
    return matchCat && matchSearch;
  });

  const totalMembers = communities.reduce((sum, c) => sum + (Number(c.member_count) || 0), 0);
  const activeCount = communities.filter(c => c.status === 'active').length;

  return (
    <div className="space-y-7 animate-rise">
      {/* Header Quản Trị Cộng Đồng */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-[#466548]/10 px-3.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[#355237]">
            <Users2 size={14} /> Quản Trị Viên CARE-MATCH
          </div>
          <h1 className="mt-2 font-display text-[30px] font-bold text-stone-900 leading-tight">
            Quản Lý Câu Lạc Bộ & Cộng Đồng
          </h1>
          <p className="mt-1 text-[13px] text-stone-500">
            Quản lý các nhóm sinh hoạt sức khỏe, cập nhật lịch tập, link Zalo và mã QR quét vào nhóm cho gia đình.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-[13px] font-bold text-stone-700 shadow-xs hover:bg-stone-50 active:scale-95 transition-all"
          >
            <Download size={16} />
            Xuất file CSV
          </button>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 rounded-xl bg-[#3a5d44] px-4 py-2.5 text-[13px] font-bold text-white shadow-xs hover:bg-[#2f4b36] active:scale-95 transition-all"
          >
            <Plus size={16} />
            Thêm cộng đồng mới
          </button>
        </div>
      </div>

      {/* Thống kê nhanh */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-[20px] border border-stone-200 bg-white p-5 shadow-xs">
          <p className="text-[12px] font-bold uppercase text-stone-400">Tổng số CLB / Cộng đồng</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-[32px] font-bold text-stone-800">{communities.length}</span>
            <span className="text-[12px] text-stone-500">nhóm kết nối</span>
          </div>
        </div>

        <div className="rounded-[20px] border border-emerald-200 bg-emerald-50/60 p-5 shadow-xs">
          <p className="text-[12px] font-bold uppercase text-emerald-700">Đang hoạt động tích cực</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-[32px] font-bold text-emerald-800">{activeCount}</span>
            <span className="text-[12px] text-emerald-700">CLB sẵn sàng</span>
          </div>
        </div>

        <div className="rounded-[20px] border border-stone-200 bg-white p-5 shadow-xs">
          <p className="text-[12px] font-bold uppercase text-stone-400">Tổng thành viên tham gia</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-[32px] font-bold text-stone-800">{totalMembers}</span>
            <span className="text-[12px] text-stone-500">người cao tuổi & gia đình</span>
          </div>
        </div>
      </div>

      {/* Bộ Lọc & Tìm Kiếm */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl bg-white p-4 border border-stone-200 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Tìm kiếm theo tên CLB, địa chỉ, người phụ trách..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-stone-200 bg-stone-50/80 py-2 pl-9 pr-3 text-[13px] text-stone-800 focus:border-[#3a5d44] focus:bg-white focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          <span className="text-[12px] font-bold text-stone-500 shrink-0">Danh mục:</span>
          {['Tất cả', ...CATEGORIES].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-lg px-3 py-1 text-[11px] font-bold transition-all shrink-0 ${
                selectedCategory === cat
                  ? 'bg-[#3a5d44] text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Bảng Danh Sách Cộng Đồng */}
      <div className="overflow-hidden rounded-[22px] border border-stone-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50/80 text-[11px] font-bold uppercase tracking-wider text-stone-500">
                <th className="py-3.5 px-5">Tên CLB & Danh Mục</th>
                <th className="py-3.5 px-4">Lịch Sinh Hoạt</th>
                <th className="py-3.5 px-4">Địa Điểm</th>
                <th className="py-3.5 px-4 text-center">Thành Viên</th>
                <th className="py-3.5 px-4">Người Phụ Trách</th>
                <th className="py-3.5 px-4 text-center">Mã QR Zalo</th>
                <th className="py-3.5 px-4 text-center">Trạng Thái</th>
                <th className="py-3.5 px-5 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-stone-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-stone-400">
                    Đang tải dữ liệu cộng đồng...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-stone-400">
                    Không có cộng đồng nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-stone-50/70 transition-colors">
                    {/* Tên & Danh mục */}
                    <td className="py-4 px-5">
                      <p className="font-bold text-stone-900">{c.name}</p>
                      <span className="mt-1 inline-block rounded-full bg-stone-100 px-2.5 py-0.5 text-[10px] font-bold text-stone-600">
                        {c.category}
                      </span>
                    </td>

                    {/* Lịch sinh hoạt */}
                    <td className="py-4 px-4 text-stone-600">
                      <div className="flex items-center gap-1.5 text-[12px]">
                        <Clock size={13} className="text-[#3a5d44] shrink-0" />
                        <span>{c.meeting_schedule}</span>
                      </div>
                    </td>

                    {/* Địa điểm */}
                    <td className="py-4 px-4 text-stone-600">
                      <div className="flex items-center gap-1.5 text-[12px] max-w-[200px] truncate" title={c.location}>
                        <MapPin size={13} className="text-amber-600 shrink-0" />
                        <span className="truncate">{c.location}</span>
                      </div>
                    </td>

                    {/* Thành viên */}
                    <td className="py-4 px-4 text-center font-bold text-stone-800">
                      {c.member_count}
                    </td>

                    {/* Người phụ trách */}
                    <td className="py-4 px-4 text-stone-600 text-[12px]">
                      {c.leader_name}
                    </td>

                    {/* Mã QR */}
                    <td className="py-4 px-4 text-center">
                      <button
                        onClick={() => setPreviewQrCommunity(c)}
                        className="inline-flex items-center gap-1 rounded-lg border border-[#0068ff]/30 bg-[#0068ff]/10 px-2.5 py-1 text-[11px] font-bold text-[#0068ff] hover:bg-[#0068ff]/20"
                      >
                        <QrCode size={13} /> Xem QR
                      </button>
                    </td>

                    {/* Trạng thái */}
                    <td className="py-4 px-4 text-center">
                      {c.status === 'active' ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                          Hoạt động
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-stone-200 px-2.5 py-0.5 text-[10px] font-bold text-stone-600">
                          Tạm dừng
                        </span>
                      )}
                    </td>

                    {/* Thao tác */}
                    <td className="py-4 px-5 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => openEditModal(c)}
                          title="Chỉnh sửa cộng đồng"
                          className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100 hover:text-stone-900"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
                          title="Xóa cộng đồng"
                          className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-700"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL THÊM / SỬA CỘNG ĐỒNG */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fadeIn">
          <div className="relative w-full max-w-2xl rounded-[28px] bg-white p-7 text-stone-800 shadow-2xl max-h-[90vh] overflow-y-auto animate-scaleUp">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute right-5 top-5 rounded-full p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
            >
              <X size={20} />
            </button>

            <div className="mb-6">
              <h2 className="font-display text-[22px] font-bold text-stone-900">
                {editingCommunity ? 'Chỉnh Sửa Câu Lạc Bộ' : 'Thêm Câu Lạc Bộ Mới'}
              </h2>
              <p className="mt-1 text-[12px] text-stone-500">
                Điền đầy đủ thông tin để người cao tuổi và gia đình dễ dàng kết nối tham gia.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-[12px] font-bold text-stone-700">Tên Câu Lạc Bộ / Nhóm *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="VD: CLB Đi Bộ Dưỡng Sinh Buổi Sáng"
                    className="mt-1 w-full rounded-xl border border-stone-200 px-3.5 py-2 text-[13px] focus:border-[#3a5d44] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-bold text-stone-700">Danh Mục Hoạt Động *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-stone-200 px-3.5 py-2 text-[13px] focus:border-[#3a5d44] focus:outline-none bg-white"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-[12px] font-bold text-stone-700">Khung Giờ Sinh Hoạt</label>
                  <input
                    type="text"
                    value={formData.meeting_schedule}
                    onChange={(e) => setFormData({ ...formData, meeting_schedule: e.target.value })}
                    placeholder="VD: 05:30 - 06:45 Hàng ngày"
                    className="mt-1 w-full rounded-xl border border-stone-200 px-3.5 py-2 text-[13px] focus:border-[#3a5d44] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-bold text-stone-700">Địa Điểm Sinh Hoạt</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="VD: Công viên Cầu Giấy, Hà Nội"
                    className="mt-1 w-full rounded-xl border border-stone-200 px-3.5 py-2 text-[13px] focus:border-[#3a5d44] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-[12px] font-bold text-stone-700">Người Điều Phối / Cố Vấn</label>
                  <input
                    type="text"
                    value={formData.leader_name}
                    onChange={(e) => setFormData({ ...formData, leader_name: e.target.value })}
                    placeholder="VD: Bác sĩ Tuấn / NV CTXH Thu Hà"
                    className="mt-1 w-full rounded-xl border border-stone-200 px-3.5 py-2 text-[13px] focus:border-[#3a5d44] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-bold text-stone-700">Số Lượng Thành Viên Ban Đầu</label>
                  <input
                    type="number"
                    min={1}
                    value={formData.member_count}
                    onChange={(e) => setFormData({ ...formData, member_count: Number(e.target.value) })}
                    className="mt-1 w-full rounded-xl border border-stone-200 px-3.5 py-2 text-[13px] focus:border-[#3a5d44] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-bold text-stone-700">Mô Tả Câu Lạc Bộ</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Mô tả mục tiêu, lợi ích sức khỏe và tinh thần mà cộng đồng mang lại..."
                  className="mt-1 w-full rounded-xl border border-stone-200 p-3 text-[13px] focus:border-[#3a5d44] focus:outline-none"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-[12px] font-bold text-stone-700">Link Nhóm Zalo *</label>
                  <input
                    type="text"
                    required
                    value={formData.zalo_link}
                    onChange={(e) => setFormData({ ...formData, zalo_link: e.target.value })}
                    placeholder="https://zalo.me/g/..."
                    className="mt-1 w-full rounded-xl border border-stone-200 px-3.5 py-2 text-[13px] focus:border-[#3a5d44] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-bold text-stone-700">URL Ảnh Mã QR Zalo (Tùy chọn)</label>
                  <input
                    type="text"
                    value={formData.qr_code_url}
                    onChange={(e) => setFormData({ ...formData, qr_code_url: e.target.value })}
                    placeholder="Để trống sẽ tự động tạo từ link Zalo"
                    className="mt-1 w-full rounded-xl border border-stone-200 px-3.5 py-2 text-[13px] focus:border-[#3a5d44] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-bold text-stone-700">Tags (Phân cách bằng dấu phẩy)</label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="Đi bộ dưỡng sinh, Xương khớp dẻo dai, Không khí trong lành"
                  className="mt-1 w-full rounded-xl border border-stone-200 px-3.5 py-2 text-[13px] focus:border-[#3a5d44] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[12px] font-bold text-stone-700">Trạng Thái Hoạt Động</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="mt-1 w-full rounded-xl border border-stone-200 px-3.5 py-2 text-[13px] focus:border-[#3a5d44] focus:outline-none bg-white"
                >
                  <option value="active">Hoạt động (Hiển thị cho người dùng)</option>
                  <option value="inactive">Tạm dừng (Ẩn khỏi trang người dùng)</option>
                </select>
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-stone-200 px-4 py-2 text-[13px] font-bold text-stone-600 hover:bg-stone-50"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#3a5d44] px-5 py-2 text-[13px] font-bold text-white hover:bg-[#2f4b36] shadow-xs"
                >
                  {editingCommunity ? 'Lưu Thay Đổi' : 'Tạo Cộng Đồng Mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL XEM NHANH MÃ QR ADMIN */}
      {previewQrCommunity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fadeIn">
          <div className="relative w-full max-w-sm rounded-[24px] bg-white p-6 text-center text-stone-800 shadow-2xl">
            <button
              onClick={() => setPreviewQrCommunity(null)}
              className="absolute right-4 top-4 rounded-full p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
            >
              <X size={18} />
            </button>

            <span className="inline-block rounded-full bg-[#0068ff]/10 px-3 py-0.5 text-[11px] font-bold text-[#0068ff]">
              Mã QR Nhóm Zalo
            </span>
            <h3 className="mt-2 font-display text-[17px] font-bold text-stone-900 leading-tight">
              {previewQrCommunity.name}
            </h3>

            <div className="mt-4 flex justify-center">
              <div className="rounded-xl bg-stone-50 p-3 border border-stone-200 shadow-xs">
                <img
                  src={previewQrCommunity.qr_code_url || `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(previewQrCommunity.zalo_link)}`}
                  alt="QR"
                  className="h-44 w-44 object-contain rounded-lg"
                />
              </div>
            </div>

            <p className="mt-3 text-[12px] text-stone-500 break-all">
              Link: <a href={previewQrCommunity.zalo_link} target="_blank" rel="noreferrer" className="text-[#0068ff] underline">{previewQrCommunity.zalo_link}</a>
            </p>

            <button
              onClick={() => setPreviewQrCommunity(null)}
              className="mt-5 w-full rounded-xl bg-stone-100 py-2.5 text-[12px] font-bold text-stone-700 hover:bg-stone-200"
            >
              Đóng cửa sổ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
