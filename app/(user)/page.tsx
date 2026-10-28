"use client";

import React from "react";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { PlaceCard } from "@/components/user/PlaceCard";
import {
  Wand2,
  Calendar,
  Sparkles,
  ArrowRight,
  CheckSquare,
  Sun,
  CalendarPlus,
  Heart,
} from "lucide-react";

export default function HomePage() {
  const {
    places,
    setIsWizardOpen,
    setIsWheelOpen,
    planStops,
    checklist,
    exportCalendarIcs,
  } = useApp();

  const topPlaces = places.slice(0, 3);
  const completedChecklistCount = checklist.filter((c) => c.done).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. Greeting & Anniversary Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-peach-deep bg-peach-soft px-3 py-1 rounded-full">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Chào buổi chiều, Dũng & Linh 💕</span>
          </span>
          <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-brown mt-1.5 tracking-tight">
            Cuối tuần này mình đi đâu nhỉ?
          </h2>
        </div>

        <div className="bg-white px-4 py-2 rounded-2xl border border-peach-soft flex items-center gap-2.5 text-xs shadow-sm">
          <span className="text-xl">🎉</span>
          <div>
            <div className="font-bold text-brown">Kỷ niệm 1 năm</div>
            <div className="text-[11px] text-peach-deep font-bold">Còn 12 ngày nữa</div>
          </div>
        </div>
      </div>

      {/* 2. Hero CTA Card: "Hôm nay đi đâu?" (Spec F20 + F05 + F06) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#C93F52] via-[#D85A67] to-[#FF9E8D] text-white p-5 sm:p-7 shadow-peach-lg">
        <div className="relative z-10 max-w-xl space-y-3.5">
          <span className="inline-block text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm">
            Chọn địa điểm dưới 60 giây
          </span>
          <h3 className="font-display font-extrabold text-2xl sm:text-3xl leading-tight">
            Bí ý tưởng hẹn hò?<br />Bấm 4 chạm là có lịch trình!
          </h3>
          <p className="text-xs sm:text-sm text-white/90 leading-relaxed max-w-lg">
            Tự động tính <strong>Giờ vàng hoàng hôn (SunCalc)</strong>, gợi ý{" "}
            <strong>Góc chụp & Pose dáng</strong> và <strong>Phối đồ đôi</strong> theo thời
            tiết Hà Nội hôm nay.
          </p>

          <div className="pt-1.5 flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsWizardOpen(true)}
              className="px-5 py-3 rounded-2xl bg-white text-peach-deep font-display font-extrabold text-xs sm:text-sm shadow-md hover:scale-[1.02] active:scale-95 transition flex items-center gap-2"
            >
              <Wand2 className="w-4 h-4" />
              <span>Hôm nay đi đâu?</span>
            </button>

            <button
              onClick={() => setIsWheelOpen(true)}
              className="px-4 py-3 rounded-2xl bg-brown/25 hover:bg-brown/35 backdrop-blur-sm text-white font-bold text-xs border border-white/30 transition flex items-center gap-1.5"
            >
              <span>🎲 Lười chọn, quay số đi</span>
            </button>
          </div>
        </div>

        {/* Decorative Peach Blossom Icon */}
        <div className="absolute -right-6 -bottom-6 text-[120px] opacity-15 select-none pointer-events-none">
          🌸
        </div>
      </div>

      {/* 3. Grid: Upcoming Date Card + Open-Meteo Weather Box */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Upcoming Date Card (F08 + .ics Calendar Sync) */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-5 border border-peach-soft shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-sage-light text-sage-dark text-xs font-bold">
                  Buổi hẹn sắp tới
                </span>
                <span className="text-xs font-semibold text-brown-muted">
                  CN, 01/11 • 16:30
                </span>
              </div>
              <h4 className="font-display font-extrabold text-base sm:text-lg text-brown mt-1.5">
                Ngắm hoàng hôn Hồ Tây & Cà phê Cầu Long Biên
              </h4>
            </div>

            <Link
              href="/plans"
              className="text-xs font-bold text-peach-deep hover:underline flex items-center gap-1 shrink-0"
            >
              <span>Xem timeline</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Mini Stops Preview */}
          <div className="flex items-center gap-2 text-xs text-brown-muted overflow-x-auto no-scrollbar py-1">
            <span className="px-2.5 py-1 rounded-xl bg-cream border border-peach-soft font-medium shrink-0">
              16:30 ☕ Cà phê Cầu Long Biên
            </span>
            <span>→</span>
            <span className="px-2.5 py-1 rounded-xl bg-cream border border-peach-soft font-medium shrink-0">
              17:35 🌉 Chụp giờ vàng
            </span>
            <span>→</span>
            <span className="px-2.5 py-1 rounded-xl bg-cream border border-peach-soft font-medium shrink-0">
              18:30 🌅 Dạo Hồ Tây
            </span>
          </div>

          {/* 1-Click .ics Export & Checklist Bar */}
          <div className="pt-3 border-t border-peach-soft/70 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-brown-muted flex items-center gap-1.5">
              <CheckSquare className="w-4 h-4 text-sage" />
              <span>
                Checklist chuẩn bị:{" "}
                <strong>
                  {completedChecklistCount}/{checklist.length} xong
                </strong>
              </span>
            </span>

            <button
              onClick={exportCalendarIcs}
              className="px-3.5 py-2 rounded-xl bg-peach-soft hover:bg-peach text-brown text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
            >
              <CalendarPlus className="w-3.5 h-3.5 text-peach-deep" />
              <span>Thêm vào Lịch ĐT (.ics)</span>
            </button>
          </div>
        </div>

        {/* Open-Meteo Weather & SunCalc Box (F12 & F13) */}
        <div className="lg:col-span-5 bg-[#FFF2EC] rounded-3xl p-5 border border-peach-soft shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-brown-muted">
                F12 • Thời tiết Hà Nội hôm nay
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="font-display font-extrabold text-3xl text-brown">26°C</span>
                <span className="text-xs font-bold text-sage-dark">
                  Nắng thu dịu • Mưa 10%
                </span>
              </div>
            </div>
            <div className="text-4xl">🌤️</div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-white/90 p-3 rounded-2xl border border-peach-soft shadow-sm">
              <div className="text-[11px] text-brown-muted">Giờ vàng chiều (SunCalc)</div>
              <div className="font-bold text-peach-deep text-sm mt-0.5">17:15 – 18:05</div>
            </div>
            <div className="bg-white/90 p-3 rounded-2xl border border-peach-soft shadow-sm">
              <div className="text-[11px] text-brown-muted">Giờ xanh (Blue Hour)</div>
              <div className="font-bold text-brown text-sm mt-0.5">18:05 – 18:35</div>
            </div>
          </div>

          <p className="text-[11px] text-brown-muted leading-relaxed">
            💡 <strong>Gợi ý tự động:</strong> Xác suất mưa thấp (10%), trời ít mây, cực hợp
            săn hoàng hôn ngoài trời ở <em>Cầu Long Biên</em> hoặc <em>Hồ Tây</em>!
          </p>
        </div>
      </div>

      {/* 4. Section: Hợp với thời tiết hôm nay (3 Curated Cards) */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display font-extrabold text-lg sm:text-xl text-brown">
              Hợp với thời tiết Hà Nội hôm nay
            </h3>
            <p className="text-xs text-brown-muted">
              Chạm vào thẻ để xem góc chụp, cách tạo dáng và gợi ý phối đồ đôi
            </p>
          </div>

          <Link
            href="/explore"
            className="text-xs font-bold text-peach-deep hover:underline flex items-center gap-1"
          >
            <span>Xem cả 36 nơi</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {topPlaces.map((place) => (
            <PlaceCard key={place.id} place={place} />
          ))}
        </div>
      </div>
    </div>
  );
}
