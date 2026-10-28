"use client";

import React, { useState } from "react";
import { useApp } from "@/context/AppContext";
import { PlaceCard } from "@/components/user/PlaceCard";
import { HIDDEN_SAFETY_PLACE } from "@/lib/mock-data";
import { Search, X, AlertTriangle, Coffee } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ExplorePage() {
  const {
    filteredPlaces,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    isTrainStreetSearch,
    setActiveDetailSlug,
  } = useApp();

  const [onlyIndoor, setOnlyIndoor] = useState(false);

  const displayedPlaces = filteredPlaces.filter((p) => {
    if (onlyIndoor && !p.indoor) return false;
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Search & Filter Header Box */}
      <div className="bg-[#FFFDF9] rounded-2xl p-5 border-2 border-[#CBB292] shadow-sm space-y-4 select-none relative">
        <div className="washi-tape washi-cream-top" />

        <div>
          <span className="text-xs font-bold text-brand-terracotta uppercase tracking-wider">
            🧭 Bộ lọc tìm kiếm địa điểm
          </span>
          <h2 className="font-serif font-extrabold text-2xl text-paper-ink mt-0.5">
            Khám phá tọa độ hẹn hò Hà Nội
          </h2>
        </div>

        {/* Search bar + quick tags */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-paper-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm không dấu: 'ho guom', 'cau long bien', 'ca phe duong tau'..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#FAF4E8] border border-[#CBB292] text-xs sm:text-sm font-medium text-paper-ink focus:outline-none focus:border-brand-terracotta placeholder:text-paper-muted/70 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-paper-muted hover:text-paper-ink p-1"
                aria-label="Xóa tìm kiếm"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick test buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            <button
              onClick={() => setSearchQuery("ho guom")}
              className="px-2.5 py-1.5 rounded-lg bg-[#EFE4D2] hover:bg-[#E2D2B8] text-[11px] font-bold text-paper-ink shrink-0 transition"
            >
              Thử: &quot;ho guom&quot;
            </button>
            <button
              onClick={() => setSearchQuery("ca phe duong tau")}
              className="px-2.5 py-1.5 rounded-lg bg-[#FADCD2] hover:bg-brand-peach text-[11px] font-bold text-brand-terracottaDark shrink-0 transition"
            >
              ⚠️ Thử: &quot;cà phê đường tàu&quot;
            </button>
          </div>
        </div>

        {/* Filter chips */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1">
          {[
            { key: "all", label: "Tất cả" },
            { key: "photo", label: "📸 Chụp ảnh" },
            { key: "romantic", label: "💕 Lãng mạn" },
            { key: "chill", label: "🍃 Chill nhẹ" },
            { key: "fun", label: "🏺 Vui chơi" },
          ].map((cat) => {
            const isSelected = selectedCategory === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => setSelectedCategory(cat.key)}
                className={`filter-pill px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition ${
                  isSelected
                    ? "bg-brand-terracotta text-white shadow-xs"
                    : "bg-[#EFE4D2] text-paper-ink hover:bg-[#E2D2B8]"
                }`}
              >
                {cat.label}
              </button>
            );
          })}

          <button
            onClick={() => setOnlyIndoor(!onlyIndoor)}
            className={`filter-pill px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition flex items-center gap-1 ${
              onlyIndoor
                ? "bg-brand-olive text-white shadow-xs"
                : "bg-brand-oliveLight/50 text-brand-olive hover:bg-brand-oliveLight"
            }`}
          >
            <span>☔ Phương án khi mưa</span>
          </button>
        </div>
      </div>

      {/* CẢNH BÁO AN TOÀN ĐƯỜNG TÀU */}
      {isTrainStreetSearch && (
        <div className="bg-[#FAF4E8] border-2 border-brand-terracotta rounded-2xl p-5 space-y-3.5 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-brand-terracotta text-white flex items-center justify-center shrink-0 font-bold text-lg shadow-sm">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-brand-peach text-brand-terracottaDark font-bold">
                Cảnh báo an toàn du lịch
              </span>
              <h4 className="font-serif font-extrabold text-base text-paper-ink">
                {HIDDEN_SAFETY_PLACE.name}
              </h4>
              <p className="text-xs text-paper-muted leading-relaxed">
                {HIDDEN_SAFETY_PLACE.warningMessage}
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-dashed border-[#D5C5B0] flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-bold text-paper-ink">
              💡 DateMate gợi ý 2 địa điểm ngắm tàu &amp; cầu an toàn 100%:
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveDetailSlug("ca-phe-view-cau-long-bien")}
                className="px-3 py-1.5 rounded-lg bg-brand-terracotta text-white text-xs font-bold shadow-sm hover:bg-brand-terracottaDark transition flex items-center gap-1"
              >
                <Coffee className="w-3.5 h-3.5" />
                <span>☕ Cà phê view Cầu Long Biên</span>
              </button>
              <button
                onClick={() => setActiveDetailSlug("cau-long-bien")}
                className="px-3 py-1.5 rounded-lg bg-white border border-[#CBB292] text-paper-ink text-xs font-bold hover:bg-[#EFE4D2] transition"
              >
                <span>🌉 Cầu Long Biên</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lưới Polaroid Địa Điểm */}
      {displayedPlaces.length > 0 ? (
        <div className="polaroid-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7 pt-2">
          {displayedPlaces.map((place, idx) => (
            <PlaceCard key={place.id} place={place} index={idx} />
          ))}
        </div>
      ) : (
        <div className="bg-[#FFFDF9] rounded-2xl p-10 text-center border-2 border-dashed border-[#CBB292] space-y-3 shadow-sm">
          <div className="text-4xl">🔍</div>
          <h4 className="font-serif font-extrabold text-lg text-paper-ink">
            Chưa có nơi nào hợp bộ lọc, thử bỏ bớt nhé!
          </h4>
          <p className="text-xs text-paper-muted max-w-sm mx-auto">
            Gợi ý: Bạn có thể xóa từ khóa tìm kiếm hoặc bấm chọn &quot;Tất cả&quot;.
          </p>
          <button
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory("all");
              setOnlyIndoor(false);
            }}
            className="paper-btn px-5 py-2 text-xs font-bold"
          >
            Xóa bộ lọc
          </button>
        </div>
      )}
    </div>
  );
}
