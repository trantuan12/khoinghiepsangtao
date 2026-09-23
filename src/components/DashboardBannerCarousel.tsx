import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  HeartHandshake, 
  ShieldCheck, 
  Calendar, 
  ArrowRight,
  Stethoscope,
  Award
} from 'lucide-react';
import { useLocation } from 'wouter';

export function DashboardBannerCarousel() {
  const [, setLocation] = useLocation();
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      tag: "TÍNH NĂNG CỐT LÕI · GHÉP ĐÔI THÔNG MINH",
      title: "Đề Xuất Người Chăm Sóc Chuẩn Xác Theo Thang Đo ADL",
      description: "Hệ thống tự động đối soát 5 tiêu chí: Thể trạng sức khỏe của mẹ, thói quen đi bộ trò chuyện, lịch rảnh và khoảng cách địa lý gần nhà nhất.",
      ctaText: "Xem 3 người chăm sóc phù hợp",
      ctaLink: "/matches",
      icon: Sparkles,
      gradient: "from-[#eef3eb] via-[#f7f5ed] to-[#f0efe6]",
      tagColor: "#56774e",
      tagBg: "#deebd9",
      btnBg: "#435d41",
      btnText: "#ffffff"
    },
    {
      tag: "ĐỒNG HÀNH CHUYÊN MÔN · CÔNG TÁC XÃ HỘI",
      title: "Chuyên Viên CTXH Hỗ Trợ Đánh Giá Nhu Cầu & Theo Sát Ca",
      description: "Không chỉ tìm người giúp việc. Chị Hương (Nhân viên CTXH) đồng hành giám sát chất lượng định kỳ và kết nối câu lạc bộ người cao tuổi.",
      ctaText: "Nhắn tin với Chuyên viên CTXH",
      ctaLink: "/messages",
      icon: HeartHandshake,
      gradient: "from-[#f7f2e7] via-[#faf6ef] to-[#edf3eb]",
      tagColor: "#8f682c",
      tagBg: "#faebd0",
      btnBg: "#997039",
      btnText: "#ffffff"
    },
    {
      tag: "AN TÂM TUYỆT ĐỐI · CARE SCORE 100 ĐIỂM",
      title: "100% Người Chăm Sóc Đã Được Admin Duyệt Pháp Lý",
      description: "Căn cước công dân gắn chip, giấy xác nhận lý lịch tư pháp số 2 và chứng chỉ sơ cấp cứu y tế đã được kiểm định minh bạch.",
      ctaText: "Xem tiêu chuẩn kiểm định",
      ctaLink: "/social-work",
      icon: ShieldCheck,
      gradient: "from-[#e9f2ee] via-[#f4f7f4] to-[#fbf8f0]",
      tagColor: "#3d6b5e",
      tagBg: "#d6ede6",
      btnBg: "#376256",
      btnText: "#ffffff"
    },
    {
      tag: "GÓI HỘI VIÊN ĐỊNH KỲ · TIẾT KIỆM ĐẾN 20%",
      title: "Chăm Sóc Dài Hạn Theo Tháng — Nhận Thêm Đặc Quyền",
      description: "Cố định người chăm sóc quen tính nết của mẹ, miễn phí đổi ca trong 24h và tặng kèm buổi chuyên viên CTXH đến tận nhà thăm khám.",
      ctaText: "Khám phá các gói tháng",
      ctaLink: "/payments",
      icon: Award,
      gradient: "from-[#fbf5e8] via-[#f5ede0] to-[#edf4ec]",
      tagColor: "#9e5f20",
      tagBg: "#fae7d0",
      btnBg: "#9e5f20",
      btnText: "#ffffff"
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const slide = slides[currentSlide];
  const Icon = slide.icon;

  return (
    <div className="relative mb-6 overflow-hidden rounded-[26px] border border-[#d7e1d4] shadow-[0_8px_24px_rgba(40,56,35,0.06)] transition-all">
      <div className={`relative flex flex-col justify-between bg-gradient-to-r ${slide.gradient} p-6 sm:p-7 transition-all duration-500`}>
        {/* Nền họa tiết elip trang nhã */}
        <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full border-[18px] border-black/5 opacity-50" />

        {/* Đầu banner: Tag & Nút prev/next */}
        <div className="relative z-10 flex items-center justify-between gap-3">
          <div 
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider"
            style={{ backgroundColor: slide.tagBg, color: slide.tagColor }}
          >
            <Icon size={14} />
            <span>{slide.tag}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button 
              onClick={() => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)}
              aria-label="Slide trước"
              className="flex h-7 w-7 items-center justify-center rounded-full bg-white/80 text-[#3b523f] shadow-sm hover:bg-white transition"
            >
              <ChevronLeft size={16} />
            </button>
            <button 
              onClick={() => setCurrentSlide((prev) => (prev + 1) % slides.length)}
              aria-label="Slide tiếp theo"
              className="flex h-7 w-7 items-center justify-center rounded-full bg-white/80 text-[#3b523f] shadow-sm hover:bg-white transition"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Thân banner: Tiêu đề & Mô tả */}
        <div className="relative z-10 my-3">
          <h3 className="font-display text-[22px] sm:text-[26px] font-semibold leading-snug tracking-[-0.03em] text-[#263a2c]">
            {slide.title}
          </h3>
          <p className="mt-1.5 text-[13px] sm:text-[14px] leading-relaxed text-[#566558] max-w-[700px]">
            {slide.description}
          </p>
        </div>

        {/* Chân banner: Nút bấm & Dots */}
        <div className="relative z-10 mt-2 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={() => setLocation(slide.ctaLink)}
            className="inline-flex items-center gap-2 rounded-[13px] px-4 py-2 text-[12px] font-bold transition hover:opacity-90 active:scale-[0.98] shadow-sm"
            style={{ backgroundColor: slide.btnBg, color: slide.btnText }}
          >
            <span>{slide.ctaText}</span>
            <ArrowRight size={14} />
          </button>

          <div className="flex items-center gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentSlide(i)}
                aria-label={`Slide ${i + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === currentSlide ? 'w-6 bg-[#4e6c4c]' : 'w-2 bg-[#b8c7b6]'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
