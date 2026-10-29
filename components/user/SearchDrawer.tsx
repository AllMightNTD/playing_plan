"use client";

import React, { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { MOOD_KEYS, MOOD_LABELS } from "@/lib/constants/catalog";
import { cn } from "@/lib/utils";

const MOOD_EMOJI: Record<(typeof MOOD_KEYS)[number], string> = {
  photo: "📸",
  romantic: "💞",
  chill: "☕",
  fun: "🎡",
  food: "🍜",
};

/** Ngăn kéo tìm theo sở thích: lọc catalog thật (từ khóa + mood) và xem nhanh 4 kết quả đầu. */
export function SearchDrawer() {
  const router = useRouter();
  const {
    isSearchDrawerOpen,
    setIsSearchDrawerOpen,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    filteredPlaces,
    setActiveDetailSlug,
    setIsWheelOpen,
  } = useApp();
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isSearchDrawerOpen) return;
    const input = inputRef.current;
    input?.focus();
    input?.classList.add("input-focus-pulse");
    const timer = setTimeout(() => input?.classList.remove("input-focus-pulse"), 900);
    return () => clearTimeout(timer);
  }, [isSearchDrawerOpen]);

  const hasFilter = Boolean(searchQuery.trim()) || selectedCategory !== "all";
  const instantResults = hasFilter ? filteredPlaces.slice(0, 4) : [];

  const goToExplore = () => {
    setIsSearchDrawerOpen(false);
    router.push("/explore");
  };

  return (
    <div className={cn("search-drawer-panel", isSearchDrawerOpen && "is-open")} aria-hidden={!isSearchDrawerOpen}>
      <div className="max-w-[1140px] mx-auto px-4 py-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-terracotta">🔍</span>
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") goToExplore();
                if (e.key === "Escape") setIsSearchDrawerOpen(false);
              }}
              tabIndex={isSearchDrawerOpen ? 0 : -1}
              placeholder="Hôm nay hai bạn thích gì? (VD: hoàng hôn, cà phê, hồ tây...)"
              className="w-full pl-10 pr-24 py-2.5 bg-[#FFFDF9] border-2 border-brand-terracotta rounded-xl text-sm font-medium text-paper-ink focus:outline-none"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("all");
                }}
                className="px-2 py-1 rounded bg-[#EFE5D4] text-xs font-bold"
                title="Xóa bộ lọc"
              >
                ✕
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsSearchDrawerOpen(false);
                  setIsWheelOpen(true);
                }}
                className="px-2 py-1 rounded bg-[#F9EFC7] border border-[#D5BE7E] text-xs font-bold"
              >
                🎲 Gợi ý
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goToExplore}
              className="bg-brand-terracotta hover:bg-brand-terracottaDark text-white font-bold text-xs px-4 py-2.5 rounded-xl transition"
            >
              Xem danh sách quán ↓
            </button>
            <button
              type="button"
              onClick={() => setIsSearchDrawerOpen(false)}
              className="bg-[#E5D1B8] text-paper-ink font-bold text-xs px-3 py-2.5 rounded-xl"
            >
              Đóng ▲
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {MOOD_KEYS.map((mood) => (
            <button
              key={mood}
              type="button"
              onClick={() => setSelectedCategory(selectedCategory === mood ? "all" : mood)}
              className={cn("hobby-tag-chip", selectedCategory === mood && "active")}
            >
              <span>{MOOD_EMOJI[mood]}</span>
              <span>{MOOD_LABELS[mood]}</span>
            </button>
          ))}
        </div>

        {hasFilter && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-1">
            {instantResults.length === 0 ? (
              <p className="text-xs text-paper-muted col-span-full">Chưa có quán nào khớp, thử bỏ bớt bộ lọc nhé.</p>
            ) : (
              instantResults.map((place) => (
                <button
                  key={place.id}
                  type="button"
                  onClick={() => {
                    setIsSearchDrawerOpen(false);
                    setActiveDetailSlug(place.slug);
                  }}
                  className="text-left bg-[#FFFDF9] border border-[#E2D6C5] hover:border-brand-terracotta rounded-xl p-2.5 transition"
                >
                  <div className="font-bold text-xs text-paper-ink truncate">
                    {place.emoji} {place.name}
                  </div>
                  <div className="text-[11px] text-paper-muted truncate">
                    📍 {place.area} • {place.costText}
                  </div>
                </button>
              ))
            )}
            {filteredPlaces.length > 4 && (
              <button type="button" onClick={goToExplore} className="text-xs font-bold text-brand-terracotta col-span-full text-left">
                + Xem tất cả {filteredPlaces.length} quán →
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
