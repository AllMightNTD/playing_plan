"use client";

import React from "react";
import { EXPLORE_CATEGORIES, EXPLORE_MOODS } from "@/lib/constants/catalog";
import { HANOI_7_DISTRICTS, OTHER_DISTRICT_KEY } from "@/lib/districts";
import { cn } from "@/lib/utils";

/** Mức giá theo priceLevel 1-3 của catalog. */
const BUDGET_OPTIONS = [
  { value: "all", label: "💰 Mọi mức giá" },
  { value: "1", label: "🌱 Tiết kiệm" },
  { value: "2", label: "☕ Vừa vặn" },
  { value: "3", label: "🥂 Dịp đặc biệt" },
];

interface ExploreFilterSectionProps {
  category: string;
  onSelectCategory: (category: string) => void;
  mood: string;
  onSelectMood: (mood: string) => void;
  district: string;
  onSelectDistrict: (district: string) => void;
  budget: string;
  onSelectBudget: (budget: string) => void;
  sortBy: "default" | "near";
  onSelectSortBy: (sortBy: "default" | "near") => void;
  userLocationAvailable: boolean;
  totalCount: number;
  displayedCount: number;
  onResetFilters: () => void;
  className?: string;
}

export function ExploreFilterSection({
  category,
  onSelectCategory,
  mood,
  onSelectMood,
  district,
  onSelectDistrict,
  budget,
  onSelectBudget,
  sortBy,
  onSelectSortBy,
  userLocationAvailable,
  totalCount,
  displayedCount,
  onResetFilters,
  className,
}: ExploreFilterSectionProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {/* Tier 1: App Category Icon Tiles (Horizontal swipeable strip on mobile, pill row on desktop) */}
      <div className="space-y-1.5">
        <div className="hidden md:flex items-center justify-between">
          <span className="text-[11px] font-bold text-paper-muted uppercase tracking-wider">
            🏛️ Thể loại địa điểm
          </span>
        </div>
        <div className="flex items-start md:items-center gap-2.5 md:gap-2 overflow-x-auto pb-1 no-scrollbar scroll-smooth -mx-1 px-1">
          {EXPLORE_CATEGORIES.map((cat) => {
            const isActive = category === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => onSelectCategory(cat.key)}
                className="shrink-0 flex flex-col md:flex-row items-center justify-center gap-1 md:gap-1.5 w-[62px] md:w-auto cursor-pointer active:scale-95 group focus:outline-none"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "w-11 h-11 md:w-auto md:h-auto md:px-3.5 md:py-1.5 rounded-2xl md:rounded-full flex items-center justify-center text-lg md:text-xs transition-all",
                    isActive
                      ? "bg-brand-terracotta text-white shadow-xs ring-2 ring-brand-terracotta/20 scale-105"
                      : "bg-[#FFFDF9] md:bg-[#FAF4E8] text-paper-ink border border-[#E2D5C1] md:border-[#D8C7B0] group-hover:border-brand-terracotta"
                  )}
                >
                  <span className="leading-none">{cat.emoji}</span>
                  <span className="hidden md:inline font-semibold whitespace-nowrap ml-1.5">
                    {cat.label}
                  </span>
                </span>
                <span
                  className={cn(
                    "md:hidden text-[10px] font-bold text-center truncate w-full px-0.5",
                    isActive ? "text-brand-terracotta font-extrabold" : "text-paper-ink/85"
                  )}
                >
                  {cat.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tier 2 & Dropdowns: Visible inline on Desktop (>= 768px); on Mobile (< 768px) moved into Native Filter Bottom Sheet */}
      <div className="hidden md:block space-y-3.5">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-paper-muted uppercase tracking-wider">
              💖 Gu hẹn hò &amp; Không khí
            </span>
            {mood !== "all" && (
              <button
                type="button"
                onClick={() => onSelectMood("all")}
                className="text-[11px] text-brand-terracotta font-semibold hover:underline"
              >
                Bỏ chọn gu
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {EXPLORE_MOODS.map((m) => {
              const isActive = mood === m.key;
              return (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => onSelectMood(isActive ? "all" : m.key)}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs transition flex items-center gap-1 cursor-pointer",
                    isActive
                      ? "bg-brand-peach border-2 border-brand-terracotta text-brand-terracotta font-extrabold shadow-2xs scale-102"
                      : "bg-[#FFFDF9] text-paper-ink border border-[#E2D5C1] font-medium hover:border-brand-terracotta"
                  )}
                >
                  <span>{m.emoji}</span>
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dropdown filters: District, Sort, Budget */}
        <div className="grid grid-cols-1 xs:grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 pt-1 border-t border-dashed border-[#E8DAC6]">
          <select
            value={district}
            onChange={(e) => onSelectDistrict(e.target.value)}
            className="min-h-10 bg-[#FAF4E8] border border-[#CBB292] rounded-xl px-3 py-2 text-base sm:text-xs font-bold text-paper-ink focus:outline-none focus:border-brand-terracotta cursor-pointer"
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
            onChange={(e) => onSelectSortBy(e.target.value as "default" | "near")}
            className="min-h-10 bg-[#FAF4E8] border border-[#CBB292] rounded-xl px-3 py-2 text-base sm:text-xs font-bold text-paper-ink focus:outline-none focus:border-brand-terracotta cursor-pointer"
            aria-label="Sắp xếp"
          >
            <option value="default">↕ Gợi ý tốt nhất</option>
            <option value="near" disabled={!userLocationAvailable}>
              📍 Gần tôi nhất {!userLocationAvailable && "(Cần bật định vị)"}
            </option>
          </select>

          <select
            value={budget}
            onChange={(e) => onSelectBudget(e.target.value)}
            className="min-h-10 xs:col-span-2 sm:col-span-1 bg-[#FAF4E8] border border-[#CBB292] rounded-xl px-3 py-2 text-base sm:text-xs font-bold text-paper-ink focus:outline-none focus:border-brand-terracotta cursor-pointer"
            aria-label="Lọc theo mức giá"
          >
            {BUDGET_OPTIONS.map((b) => (
              <option key={b.value} value={b.value}>
                {b.label}
              </option>
            ))}
          </select>
        </div>

        {/* Summary count & Reset button */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1 border-t border-dashed border-[#E2D5C1]">
          <span className="text-paper-muted font-semibold">
            Đang hiển thị{" "}
            <strong className="text-brand-terracotta">{displayedCount}</strong>
            {totalCount > 0 && ` / ${totalCount}`} tọa độ hẹn hò
          </span>
          <button
            type="button"
            onClick={onResetFilters}
            className="text-brand-terracotta font-bold hover:underline cursor-pointer flex items-center gap-1"
          >
            <span>↺</span>
            <span>Đặt lại tất cả bộ lọc</span>
          </button>
        </div>
      </div>
    </div>
  );
}
