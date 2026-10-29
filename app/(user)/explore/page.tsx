"use client";

import React, { useMemo, useState } from "react";
import { useApp } from "@/context/AppContext";
import { PlaceCard } from "@/components/user/PlaceCard";
import { LocationChip } from "@/components/user/LocationChip";
import { MoodMatchQuiz } from "@/components/explore/MoodMatchQuiz";
import { HIDDEN_SAFETY_PLACE, MOOD_KEYS, MOOD_LABELS } from "@/lib/constants/catalog";
import { HANOI_7_DISTRICTS, OTHER_DISTRICT_KEY, resolveDistrictKey } from "@/lib/districts";
import { cn } from "@/lib/utils";

type QuickFilter = "all" | "outdoor" | "indoor" | "saved";

const QUICK_FILTERS: { key: QuickFilter; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "outdoor", label: "🌅 Ngoài trời ngắm cảnh" },
  { key: "indoor", label: "❄️ Trong nhà mát mẻ" },
  { key: "saved", label: "❤️ Đã lưu" },
];

/** Mức giá theo priceLevel 1-3 của catalog. */
const BUDGET_OPTIONS = [
  { value: "all", label: "💰 Mọi mức giá" },
  { value: "1", label: "🌱 Tiết kiệm" },
  { value: "2", label: "☕ Vừa vặn" },
  { value: "3", label: "🥂 Dịp đặc biệt" },
];

export default function ExplorePage() {
  const {
    places,
    filteredPlaces,
    isLoadingPlaces,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    isTrainStreetSearch,
    setActiveDetailSlug,
    setIsWheelOpen,
    isPlaceSaved,
    userLocation,
    distanceToPlace,
  } = useApp();

  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [district, setDistrict] = useState("all");
  const [budget, setBudget] = useState("all");
  const [sortBy, setSortBy] = useState<"default" | "near">("default");

  const filtered = useMemo(
    () =>
      filteredPlaces.filter((p) => {
        if (quickFilter === "outdoor" && p.indoor) return false;
        if (quickFilter === "indoor" && !p.indoor) return false;
        if (quickFilter === "saved" && !isPlaceSaved(p.slug) && !isPlaceSaved(p.id)) return false;
        if (district !== "all" && resolveDistrictKey(p.area) !== district) return false;
        if (budget !== "all" && p.priceLevel !== Number(budget)) return false;
        return true;
      }),
    // isPlaceSaved đổi mỗi render; danh sách đã lưu nằm trong filteredPlaces/places
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filteredPlaces, quickFilter, district, budget]
  );

  // Gần tôi nhất: sắp theo khoảng cách từ vị trí hiện tại; quán thiếu tọa độ xuống cuối
  const displayedPlaces = useMemo(() => {
    if (sortBy !== "near" || !userLocation) return filtered;
    const withDistance = filtered.map((p) => ({ p, km: distanceToPlace(p)?.km ?? Number.POSITIVE_INFINITY }));
    return withDistance.sort((a, b) => a.km - b.km).map(({ p }) => p);
    // distanceToPlace chỉ phụ thuộc userLocation
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, sortBy, userLocation]);

  const safeAlternatives = places.filter((p) => HIDDEN_SAFETY_PLACE.alternatives.includes(p.slug));

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setQuickFilter("all");
    setDistrict("all");
    setBudget("all");
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-300">
      <section className="space-y-4">
        <div className="explore-header-row flex flex-col md:flex-row md:items-end justify-between gap-3">
          <div>
            <span className="text-xs font-bold text-brand-terracotta uppercase tracking-wider">🧭 Gợi ý địa điểm chọn lọc</span>
            <h2 className="font-serif font-extrabold text-xl sm:text-2xl text-paper-ink">Khám phá tọa độ hẹn hò hợp gu hai bạn</h2>
            <p className="text-xs text-paper-muted mt-0.5">
              Chạm vào từng tấm ảnh để xem bí kíp góc chụp đẹp, cách tạo dáng và gợi ý phối đồ đôi (OOTD)
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {QUICK_FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setQuickFilter(f.key)}
                className={cn(
                  "px-3.5 py-1.5 rounded-full text-xs transition",
                  quickFilter === f.key ? "bg-brand-terracotta text-white font-bold" : "bg-[#EFE4D2] text-paper-ink font-semibold"
                )}
              >
                {f.key === "all" ? `${f.label} (${places.length})` : f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-[#FFFDF9] border-2 border-[#D8C7B0] rounded-2xl p-4 shadow-2xs space-y-3">
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5">
            <div className="relative flex-1">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-terracotta">🔍</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm nhanh không dấu: hồ tây, cầu long biên, cà phê, bảo tàng..."
                className="w-full pl-10 pr-24 py-2.5 bg-[#FAF4E8] border border-[#CBB292] focus:border-brand-terracotta rounded-xl text-xs sm:text-sm font-medium text-paper-ink focus:outline-none"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button type="button" onClick={() => setSearchQuery("")} className="px-2 py-1 rounded bg-[#E5D1B8] text-[11px] font-bold">
                  ✕ Xóa
                </button>
                <button
                  type="button"
                  onClick={() => setIsWheelOpen(true)}
                  className="px-2 py-1 rounded bg-[#F9EFC7] border border-[#D5BE7E] text-[11px] font-bold"
                >
                  🎲 Gợi ý
                </button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="bg-[#FAF4E8] border border-[#CBB292] rounded-xl px-3 py-2.5 text-xs font-bold text-paper-ink"
                aria-label="Lọc theo quận"
              >
                <option value="all">📍 Tất cả Quận</option>
                {HANOI_7_DISTRICTS.map((d) => (
                  <option key={d.key} value={d.key}>
                    📍 {d.name}
                  </option>
                ))}
                <option value={OTHER_DISTRICT_KEY}>📍 Khu vực khác</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "default" | "near")}
                className="bg-[#FAF4E8] border border-[#CBB292] rounded-xl px-3 py-2.5 text-xs font-bold text-paper-ink"
                aria-label="Sắp xếp"
              >
                <option value="default">↕ Gợi ý</option>
                <option value="near" disabled={!userLocation}>
                  📍 Gần tôi nhất
                </option>
              </select>
              <select
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="bg-[#FAF4E8] border border-[#CBB292] rounded-xl px-3 py-2.5 text-xs font-bold text-paper-ink"
                aria-label="Lọc theo mức giá"
              >
                {BUDGET_OPTIONS.map((b) => (
                  <option key={b.value} value={b.value}>
                    {b.label}
                  </option>
                ))}
              </select>
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
                {MOOD_LABELS[mood]}
              </button>
            ))}
          </div>

          <LocationChip />

          <div className="flex items-center justify-between text-xs pt-1 border-t border-dashed border-[#E2D5C1]">
            <span className="text-paper-muted font-semibold">
              Đang hiển thị <strong className="text-brand-terracotta">{displayedPlaces.length}</strong> / {places.length} tọa độ hẹn hò
            </span>
            <button type="button" onClick={resetFilters} className="text-brand-terracotta font-bold hover:underline">
              ↺ Xem tất cả địa điểm
            </button>
          </div>
        </div>

        {/* Cảnh báo an toàn đường tàu (Mục 14.2) */}
        {isTrainStreetSearch && (
          <div className="bg-[#FAF4E8] border-2 border-brand-terracotta rounded-2xl p-5 space-y-3 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div className="space-y-1">
                <h4 className="font-serif font-extrabold text-base text-paper-ink">{HIDDEN_SAFETY_PLACE.name}</h4>
                <p className="text-xs text-paper-muted leading-relaxed">{HIDDEN_SAFETY_PLACE.warningMessage}</p>
              </div>
            </div>
            {safeAlternatives.length > 0 && (
              <div className="pt-3 border-t border-dashed border-[#D5C5B0] flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-paper-ink">💡 Gợi ý thay thế an toàn:</span>
                {safeAlternatives.map((alt) => (
                  <button
                    key={alt.id}
                    type="button"
                    onClick={() => setActiveDetailSlug(alt.slug)}
                    className="px-3 py-1.5 rounded-lg bg-brand-terracotta text-white text-xs font-bold hover:bg-brand-terracottaDark transition"
                  >
                    {alt.emoji} {alt.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {isLoadingPlaces ? (
          <div className="text-center text-sm text-paper-muted py-10">Đang lật sổ tìm tọa độ hẹn hò...</div>
        ) : displayedPlaces.length > 0 ? (
          <div className="responsive-3col grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-1">
            {displayedPlaces.map((place, idx) => (
              <PlaceCard key={place.id} place={place} index={idx} />
            ))}
          </div>
        ) : (
          <div className="bg-[#FFFDF9] border-2 border-dashed border-[#CBB292] rounded-2xl p-8 text-center text-xs">
            {quickFilter === "saved" ? "Hai bạn chưa lưu quán nào khớp bộ lọc. " : "Không tìm thấy địa điểm khớp bộ lọc. "}
            <button type="button" onClick={resetFilters} className="text-brand-terracotta font-bold underline">
              Đặt lại bộ lọc
            </button>
          </div>
        )}
      </section>

      <MoodMatchQuiz />
    </div>
  );
}
