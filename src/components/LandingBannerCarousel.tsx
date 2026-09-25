import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  SlidersHorizontal, 
  HeartHandshake, 
  ShieldCheck, 
  Clock3, 
  Sparkles, 
  ArrowRight,
  CheckCircle2,
  Award,
  Users,
  Calendar
} from 'lucide-react';

interface LandingBannerCarouselProps {
  onActionClick?: () => void;
}

export function LandingBannerCarousel({ onActionClick }: LandingBannerCarouselProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      id: 1,
      tag: "MÔ-ĐUN GHÉP ĐÔI THÔNG MINH",
      tagTone: "gold",
      title: "Tìm Đúng Người Chăm Sóc Sau 3 Bước",
      description: "Thuật toán đối soát 5 chiều: Nhu cầu thể trạng (thang ADL), thói quen tính cách, thời gian rảnh, địa bàn gần nhà và chi phí tối ưu.",
      stats: [
        { label: "Độ tương thích", value: "96%" },
        { label: "Người chăm sóc", value: "420+" },
        { label: "Thời gian ghép", value: "< 15 phút" }
      ],
      badge: "Ghép đôi thông minh",
      icon: SlidersHorizontal,
      gradient: "from-[#283f1a] via-[#1e3014] to-[#14220d]",
      accentColor: "#dfa338",
      ctaText: "Tìm người chăm sóc ngay"
    },
    {
      id: 2,
      tag: "ĐIỂM KHÁC BIỆT CỐT LÕI",
      tagTone: "emerald",
      title: "Nhân Viên Công Tác Xã Hội Đồng Hành",
      description: "Không chỉ tìm người trông nom. Chuyên viên CTXH trực tiếp quản trị trường hợp: Đánh giá nhu cầu toàn diện, điều phối dịch vụ, giám sát định kỳ và can thiệp khi có biến cố.",
      stats: [
        { label: "Quy trình CTXH", value: "6 Bước" },
        { label: "Tổng đài tư vấn", value: "24/7" },
        { label: "Thăm khám tại nhà", value: "Định kỳ" }
      ],
      badge: "Quản trị trường hợp",
      icon: HeartHandshake,
      gradient: "from-[#2f491f] via-[#233817] to-[#18260f]",
      accentColor: "#9ec980",
      ctaText: "Khám phá vai trò CTXH"
    },
    {
      id: 3,
      tag: "TIÊU CHUẨN TÍN NHIỆM MINH BẠCH",
      tagTone: "amber",
      title: "Hệ Thống CARE SCORE — An Tâm Trao Gửi",
      description: "Thang 100 điểm với 4 trụ cột khắt khe: 100% người chăm sóc được Admin kiểm tra CCCD gắn chip, Lý lịch tư pháp số 2 sạch, bằng cấp y tế và đánh giá thực tế từ các gia đình.",
      stats: [
        { label: "Thang điểm chuẩn", value: "100đ" },
        { label: "Xác thực lý lịch", value: "100%" },
        { label: "Bảo hiểm trách nhiệm", value: "100 Triệu" }
      ],
      badge: "Kiểm định pháp lý",
      icon: ShieldCheck,
      gradient: "from-[#334620] via-[#263717] to-[#1a260f]",
      accentColor: "#e5b76b",
      ctaText: "Xem bảng tiêu chí Care Score"
    },
    {
      id: 4,
      tag: "GIẢI PHÁP CHĂM SÓC TOÀN DIỆN",
      tagTone: "blue",
      title: "Đa Dạng Gói: Theo Giờ, Ca Ngày, Đêm & 24/24",
      description: "Linh hoạt tối đa theo nhu cầu gia đình: Từ vài giờ hỗ trợ việc nhà nhẹ, đưa cụ đi dạo công viên, ca đêm canh giấc ngủ chống té ngã cho đến gói chăm sóc lưu trú trọn tháng.",
      stats: [
        { label: "Mức giá linh hoạt", value: "Từ 75k/h" },
        { label: "Ca đêm canh ngủ", value: "Chống ngã" },
        { label: "Gói tháng", value: "-20% phí" }
      ],
      badge: "Linh hoạt thời gian",
      icon: Clock3,
      gradient: "from-[#273d1b] via-[#1c2e13] to-[#13220d]",
      accentColor: "#e8c98e",
      ctaText: "Xem chi tiết bảng giá"
    }
  ];

  // Tự động chuyển slide sau mỗi 4.5 giây
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [slides.length]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const slide = slides[currentSlide];
  const IconComponent = slide.icon;

  return (
    <div className="relative w-full overflow-hidden rounded-[32px] border border-white/60 bg-gradient-to-br shadow-[0_24px_64px_rgba(41,57,39,0.22)]">
      {/* Container của Slide */}
      <div className={`relative min-h-[460px] sm:min-h-[500px] bg-gradient-to-br ${slide.gradient} p-7 text-[#f6f2e9] sm:p-9 flex flex-col justify-between transition-all duration-500`}>
        {/* Nền họa tiết vòng tròn mờ tinh tế */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full border-[32px] border-white/10 opacity-70 blur-md" />
        <div className="pointer-events-none absolute -bottom-24 -left-20 h-64 w-64 rounded-full border-[28px] border-white/5 opacity-50 blur-sm" />

        {/* Phần đầu slide: Badge phân loại & Nút chuyển slide */}
        <div className="relative z-10 flex items-center justify-between gap-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3.5 py-1.5 text-[11px] font-bold tracking-wider uppercase backdrop-blur-md border border-white/15 text-[#f1d7a8]">
            <Sparkles size={13} color="#e5ba72" />
            <span>{slide.tag}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button 
              onClick={prevSlide}
              aria-label="Slide trước"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-black/20 text-white/80 hover:bg-white/20 hover:text-white transition backdrop-blur-sm border border-white/10"
            >
              <ChevronLeft size={17} />
            </button>
            <button 
              onClick={nextSlide}
              aria-label="Slide tiếp theo"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-black/20 text-white/80 hover:bg-white/20 hover:text-white transition backdrop-blur-sm border border-white/10"
            >
              <ChevronRight size={17} />
            </button>
          </div>
        </div>

        {/* Nội dung trọng tâm của Slide */}
        <div className="relative z-10 my-auto pt-6 pb-4">
          <div className="mb-4 inline-flex items-center gap-2 text-[12px] font-semibold text-[#cfddcb]">
            <IconComponent size={18} style={{ color: slide.accentColor }} />
            <span>{slide.badge}</span>
          </div>

          <h3 className="font-display text-[29px] sm:text-[35px] font-semibold leading-[1.12] tracking-[-0.03em] text-[#fbf8f2] max-w-[480px]">
            {slide.title}
          </h3>

          <p className="mt-4 text-[14px] sm:text-[15px] leading-relaxed text-[#cfddcb] max-w-[450px]">
            {slide.description}
          </p>

          {/* 3 Chỉ số nổi bật trong slide */}
          <div className="mt-7 grid grid-cols-3 gap-3 rounded-[20px] bg-black/25 p-4 backdrop-blur-md border border-white/10 max-w-[460px]">
            {slide.stats.map((st, i) => (
              <div key={i} className="text-center">
                <p className="font-display text-[19px] sm:text-[22px] font-bold leading-tight" style={{ color: slide.accentColor }}>
                  {st.value}
                </p>
                <p className="mt-0.5 text-[10px] uppercase font-bold tracking-wider text-white/65">
                  {st.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Phần chân slide: Nút bấm & Chỉ báo Dots */}
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-t border-white/15 pt-5">
          {/* Nút hành động */}
          <button 
            onClick={onActionClick}
            className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[13px] font-bold text-[#233527] transition-all hover:scale-[1.02] shadow-md active:scale-[0.98]"
            style={{ backgroundColor: slide.accentColor }}
          >
            <span>{slide.ctaText}</span>
            <ArrowRight size={15} />
          </button>

          {/* Dots chuyển slide */}
          <div className="flex items-center gap-2">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                aria-label={`Chuyển tới slide ${idx + 1}`}
                className={`h-2 rounded-full transition-all duration-300 ${
                  idx === currentSlide 
                    ? 'w-7 bg-[#e5ba72]' 
                    : 'w-2 bg-white/30 hover:bg-white/50'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
