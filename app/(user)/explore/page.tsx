"use client";

import React, { useState } from "react";
import { useApp } from "@/context/AppContext";
import { PlaceCard } from "@/components/user/PlaceCard";
import { HIDDEN_SAFETY_PLACE } from "@/lib/mock-data";
import { Search, X, AlertTriangle, Coffee, BookOpen } from "lucide-react";
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
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Search & Filter Header Box */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-peach-soft shadow-sm space-y-4">
        {/* Search bar + quick tags */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-brown-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm không dấu: 'ho guom', 'cau long bien', 'ca phe duong tau'..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-cream border border-peach-soft text-xs sm:text-sm font-medium text-brown focus:outline-none focus:border-peach-deep placeholder:text-brown-muted/70 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-brown-muted hover:text-brown p-1"
                aria-label="Xóa tìm kiếm"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick test buttons for F22 Vietnamese search & safety */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            <button
              onClick={() => setSearchQuery("ho guom")}
              className="px-2.5 py-1.5 rounded-xl bg-peach-soft/60 hover:bg-peach-soft text-[11px] font-bold text-brown shrink-0 transition"
            >
              Thử: &quot;ho guom&quot;
            </button>
            <button
              onClick={() => setSearchQuery("ca phe duong tau")}
              className="px-2.5 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-[11px] font-bold text-amber-900 shrink-0 transition"
            >
              ⚠️ Thử: &quot;cà phê đường tàu&quot;
            </button>
          </div>
        </div>

        {/* Filter chips */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1">
          {[
            { key: "all", label: "Tất cả (10)" },
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
                className={cn(
                  "px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition",
                  isSelected
                    ? "bg-peach-deep text-white shadow-sm"
                    : "bg-cream text-brown hover:bg-peach-soft"
                )}
              >
                {cat.label}
              </button>
            );
          })}

          <button
            onClick={() => setOnlyIndoor(!onlyIndoor)}
            className={cn(
              "px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition flex items-center gap-1",
              onlyIndoor
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-blue-50 text-blue-800 hover:bg-blue-100"
            )}
          >
            <span>☔ Phương án khi mưa</span>
          </button>
        </div>
      </div>

      {/* SAFETY WARNING BANNER FOR TRAIN STREET (Section 14.2) */}
      {isTrainStreetSearch && (
        <div className="bg-amber-50 border-2 border-amber-400 rounded-3xl p-5 space-y-3.5 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 font-bold text-lg shadow-sm">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-amber-200 text-amber-900 font-bold">
                Mục 14.2 • status = hidden (Cảnh báo an toàn)
              </span>
              <h4 className="font-display font-extrabold text-base text-amber-950">
                {HIDDEN_SAFETY_PLACE.name}
              </h4>
              <p className="text-xs text-amber-900 leading-relaxed">
                {HIDDEN_SAFETY_PLACE.warningMessage}
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-amber-200 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-bold text-amber-950">
              💡 DateMate gợi ý 2 địa điểm ngắm tàu & cầu an toàn 100%:
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveDetailSlug("ca-phe-view-cau-long-bien")}
                className="px-3 py-1.5 rounded-xl bg-peach-deep text-white text-xs font-bold shadow-sm hover:bg-peach-hover transition flex items-center gap-1"
              >
                <Coffee className="w-3.5 h-3.5" />
                <span>☕ Cà phê view Cầu Long Biên</span>
              </button>
              <button
                onClick={() => setActiveDetailSlug("cau-long-bien")}
                className="px-3 py-1.5 rounded-xl bg-white border border-amber-300 text-brown text-xs font-bold hover:bg-amber-100 transition"
              >
                <span>🌉 Cầu Long Biên</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results Grid */}
      {displayedPlaces.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {displayedPlaces.map((place) => (
            <PlaceCard key={place.id} place={place} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-10 text-center border border-peach-soft space-y-3 shadow-sm">
          <div className="text-4xl">🔍</div>
          <h4 className="font-display font-extrabold text-base text-brown">
            Chưa có nơi nào hợp bộ lọc, thử bỏ bớt nhé!
          </h4>
          <p className="text-xs text-brown-muted max-w-sm mx-auto">
            Gợi ý: Bạn có thể xóa từ khóa tìm kiếm hoặc bấm chọn &quot;Tất cả&quot;.
          </p>
          <button
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory("all");
              setOnlyIndoor(false);
            }}
            className="px-4 py-2 rounded-xl bg-peach-deep text-white text-xs font-bold shadow-peach hover:bg-peach-hover transition"
          >
            Xóa bộ lọc
          </button>
        </div>
      )}
    </div>
  );
}
