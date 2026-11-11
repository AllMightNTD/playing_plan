"use client";

import React, { useMemo, useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { PlaceCard } from "@/components/user/PlaceCard";
import { LocationChip } from "@/components/user/LocationChip";
import { ExploreSearchBar } from "@/components/explore/ExploreSearchBar";
import { ExploreFilterSection } from "@/components/explore/ExploreFilterSection";
import { HIDDEN_SAFETY_PLACE, EXPLORE_MOODS } from "@/lib/constants/catalog";
import { HANOI_7_DISTRICTS, OTHER_DISTRICT_KEY } from "@/lib/districts";
import { isTrainStreetQuery } from "@/lib/catalog-filter";
import type { HanoiPlace } from "@/lib/types/catalog";
import type { PlaceSuggestion } from "@/lib/catalog-filter";
import { cn } from "@/lib/utils";

type QuickFilter = "all" | "outdoor" | "indoor" | "saved";

const QUICK_FILTERS: { key: QuickFilter; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "outdoor", label: "🌅 Ngoài trời ngắm cảnh" },
  { key: "indoor", label: "❄️ Trong nhà mát mẻ" },
  { key: "saved", label: "❤️ Đã lưu" },
];

function ExploreContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const {
    setActiveDetailSlug,
    setIsWheelOpen,
    isPlaceSaved,
    userLocation,
    distanceToPlace,
    places: sharedPlaces,
    placesNextCursor: sharedNextCursor,
    isLoadingPlaces: isLoadingSharedPlaces,
  } = useApp();

  // Đọc params từ URL
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [debouncedQuery, setDebouncedQuery] = useState(searchParams.get("q") || "");
  const [category, setCategory] = useState(searchParams.get("category") || "all");
  const [mood, setMood] = useState(searchParams.get("mood") || "all");
  const [district, setDistrict] = useState(searchParams.get("district") || "all");
  const [budget, setBudget] = useState(searchParams.get("budget") || "all");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>(
    (searchParams.get("quick") as QuickFilter) || "all"
  );
  const [sortBy, setSortBy] = useState<"default" | "near">(
    (searchParams.get("sort") as "default" | "near") || "default"
  );

  // Danh sách địa điểm tải từ Server-side API
  const [places, setPlaces] = useState<HanoiPlace[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [mobileGridCols, setMobileGridCols] = useState<1 | 2>(2);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  const activeAdvancedFilterCount =
    (mood !== "all" ? 1 : 0) +
    (district !== "all" ? 1 : 0) +
    (budget !== "all" ? 1 : 0) +
    (sortBy !== "default" ? 1 : 0);

  // Debounce search query 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Đồng bộ trạng thái ra URL
  const updateUrl = useCallback(
    (newParams: Record<string, string>) => {
      const current = new URLSearchParams(searchParams.toString());
      for (const [key, val] of Object.entries(newParams)) {
        if (!val || val === "all" || val === "default") {
          current.delete(key);
        } else {
          current.set(key, val);
        }
      }
      const qs = current.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  // Bộ lọc mặc định trùng đúng truy vấn AppProvider đã nạp sẵn (24 quán đầu), khỏi gọi API lần hai
  const isDefaultQuery =
    !debouncedQuery.trim() &&
    category === "all" &&
    mood === "all" &&
    district === "all" &&
    budget === "all" &&
    quickFilter !== "indoor" &&
    quickFilter !== "outdoor";

  // Gọi API tải địa điểm khi filter hoặc debounced query thay đổi
  useEffect(() => {
    let active = true;

    if (isDefaultQuery) {
      if (isLoadingSharedPlaces) {
        setIsLoading(true);
        return;
      }
      if (sharedPlaces.length > 0) {
        setPlaces(sharedPlaces);
        setNextCursor(sharedNextCursor);
        setIsLoading(false);
        return;
      }
    }

    setIsLoading(true);

    const queryParams = new URLSearchParams();
    if (debouncedQuery.trim()) queryParams.set("q", debouncedQuery.trim());
    if (category !== "all") queryParams.set("category", category);
    if (mood !== "all") queryParams.set("mood", mood);
    if (district !== "all") queryParams.set("district", district);
    if (budget !== "all") queryParams.set("price", budget);
    if (quickFilter === "indoor") queryParams.set("indoor", "true");
    if (quickFilter === "outdoor") queryParams.set("indoor", "false");
    queryParams.set("limit", "24");

    fetch(`/api/v1/user/places?${queryParams}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch places");
        return res.json();
      })
      .then((json) => {
        if (active) {
          setPlaces(json?.data?.items ?? []);
          setNextCursor(json?.data?.nextCursor ?? null);
        }
      })
      .catch((err) => {
        console.warn("Lỗi tải danh sách địa điểm:", err);
        if (active) {
          setPlaces([]);
          setNextCursor(null);
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [
    debouncedQuery,
    category,
    mood,
    district,
    budget,
    quickFilter,
    isDefaultQuery,
    isLoadingSharedPlaces,
    sharedPlaces,
    sharedNextCursor,
  ]);

  // Tải thêm trang kế tiếp
  const handleLoadMore = async () => {
    if (!nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const queryParams = new URLSearchParams();
      if (debouncedQuery.trim()) queryParams.set("q", debouncedQuery.trim());
      if (category !== "all") queryParams.set("category", category);
      if (mood !== "all") queryParams.set("mood", mood);
      if (district !== "all") queryParams.set("district", district);
      if (budget !== "all") queryParams.set("price", budget);
      if (quickFilter === "indoor") queryParams.set("indoor", "true");
      if (quickFilter === "outdoor") queryParams.set("indoor", "false");
      queryParams.set("limit", "24");
      queryParams.set("cursor", nextCursor);

      const res = await fetch(`/api/v1/user/places?${queryParams}`);
      if (!res.ok) throw new Error("Failed to fetch more places");
      const json = await res.json();
      const newItems: HanoiPlace[] = json?.data?.items ?? [];
      const newCursor: string | null = json?.data?.nextCursor ?? null;

      setPlaces((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        const unique = newItems.filter((p) => !existingIds.has(p.id));
        return [...prev, ...unique];
      });
      setNextCursor(newCursor);
    } catch (err) {
      console.warn("Lỗi tải thêm địa điểm:", err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Lọc client-side cho trường hợp QuickFilter "saved"
  const filteredPlaces = useMemo(() => {
    if (quickFilter === "saved") {
      return places.filter((p) => isPlaceSaved(p.slug) || isPlaceSaved(p.id));
    }
    return places;
  }, [places, quickFilter, isPlaceSaved]);

  // Sắp xếp gần tôi nhất nếu bật định vị
  const displayedPlaces = useMemo(() => {
    if (sortBy !== "near" || !userLocation) return filteredPlaces;
    const withDistance = filteredPlaces.map((p) => ({
      p,
      km: distanceToPlace(p)?.km ?? Number.POSITIVE_INFINITY,
    }));
    return withDistance.sort((a, b) => a.km - b.km).map(({ p }) => p);
  }, [filteredPlaces, sortBy, userLocation, distanceToPlace]);

  // Cảnh báo an toàn đường tàu (Mục 14.2)
  const isTrainStreet = useMemo(() => isTrainStreetQuery(debouncedQuery), [debouncedQuery]);
  const safeAlternatives = useMemo(
    () => places.filter((p) => HIDDEN_SAFETY_PLACE.alternatives.includes(p.slug)),
    [places]
  );

  // Handlers thay đổi filter
  const handleCategoryChange = (newCat: string) => {
    setCategory(newCat);
    updateUrl({ category: newCat });
  };

  const handleMoodChange = (newMood: string) => {
    setMood(newMood);
    updateUrl({ mood: newMood });
  };

  const handleDistrictChange = (newDistrict: string) => {
    setDistrict(newDistrict);
    updateUrl({ district: newDistrict });
  };

  const handleBudgetChange = (newBudget: string) => {
    setBudget(newBudget);
    updateUrl({ budget: newBudget });
  };

  const handleQuickFilterChange = (newQuick: QuickFilter) => {
    setQuickFilter(newQuick);
    updateUrl({ quick: newQuick });
  };

  const handleSortChange = (newSort: "default" | "near") => {
    setSortBy(newSort);
    updateUrl({ sort: newSort });
  };

  const handleSearchSubmit = (val: string) => {
    setDebouncedQuery(val);
    updateUrl({ q: val });
  };

  const handleSelectSuggestion = (suggestion: PlaceSuggestion) => {
    setActiveDetailSlug(suggestion.slug);
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setDebouncedQuery("");
    setCategory("all");
    setMood("all");
    setDistrict("all");
    setBudget("all");
    setQuickFilter("all");
    setSortBy("default");
    router.replace(pathname, { scroll: false });
  };

  return (
    <div className="space-y-8 sm:space-y-12 animate-in fade-in duration-300">
      <section className="space-y-3 sm:space-y-4">
        {/* Desktop Header (Compact on mobile so places appear immediately above the fold) */}
        <div className="hidden md:flex md:items-end justify-between gap-3">
          <div>
            <span className="text-xs font-bold text-brand-terracotta uppercase tracking-wider">
              🧭 Gợi ý địa điểm chọn lọc
            </span>
            <h2 className="font-serif font-extrabold text-xl sm:text-2xl text-paper-ink">
              Khám phá tọa độ hẹn hò hợp gu hai bạn
            </h2>
            <p className="text-xs text-paper-muted mt-0.5">
              Chạm vào từng tấm ảnh để xem bí kíp góc chụp đẹp, cách tạo dáng và gợi ý phối đồ đôi (OOTD)
            </p>
          </div>
          <div className="hidden md:flex flex-wrap items-center gap-1.5">
            {QUICK_FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => handleQuickFilterChange(f.key)}
                className={cn(
                  "px-3.5 py-1.5 rounded-full text-xs transition cursor-pointer",
                  quickFilter === f.key
                    ? "bg-brand-terracotta text-white font-bold shadow-xs"
                    : "bg-[#EFE4D2] text-paper-ink font-semibold hover:bg-[#E5D7C3]"
                )}
              >
                {f.key === "all" ? `${f.label} (${displayedPlaces.length})` : f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Native App Search + Category Icon Strip + Quick Toolbar */}
        <div className="bg-[#FFFDF9] border-2 border-[#D8C7B0] rounded-2xl p-3 sm:p-4 shadow-2xs space-y-3">
          {/* Row 1: Search Bar + Mobile Filter Bottom Sheet Trigger */}
          <div className="flex items-center gap-2">
            <ExploreSearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              onSearch={handleSearchSubmit}
              onSelectSuggestion={handleSelectSuggestion}
              onOpenWheel={() => setIsWheelOpen(true)}
            />
            <button
              type="button"
              onClick={() => setIsFilterSheetOpen(true)}
              aria-label="Mở bộ lọc tọa độ hẹn hò"
              className={cn(
                "md:hidden h-10 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 shrink-0 transition active:scale-95 cursor-pointer shadow-2xs",
                activeAdvancedFilterCount > 0
                  ? "bg-brand-peach/40 border-brand-terracotta text-brand-terracottaDark"
                  : "bg-[#FAF4E8] text-paper-ink border-[#CBB292]"
              )}
            >
              <span aria-hidden="true">🎛️</span>
              <span>Lọc</span>
              {activeAdvancedFilterCount > 0 && (
                <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-brand-terracotta text-white text-[10px] font-extrabold flex items-center justify-center leading-none">
                  {activeAdvancedFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* Row 2: Category Icon Tiles + Desktop 2nd-tier filters */}
          <ExploreFilterSection
            category={category}
            onSelectCategory={handleCategoryChange}
            mood={mood}
            onSelectMood={handleMoodChange}
            district={district}
            onSelectDistrict={handleDistrictChange}
            budget={budget}
            onSelectBudget={handleBudgetChange}
            sortBy={sortBy}
            onSelectSortBy={handleSortChange}
            userLocationAvailable={Boolean(userLocation)}
            totalCount={places.length}
            displayedCount={displayedPlaces.length}
            onResetFilters={handleResetFilters}
          />

          {/* Row 3 (Mobile Quick Action Bar + Segmented View Switcher) */}
          <div className="flex md:hidden items-center justify-between gap-2 pt-2 border-t border-dashed border-[#E8DAC6]">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 flex-1 min-w-0">
              <button
                type="button"
                onClick={() => handleQuickFilterChange(quickFilter === "saved" ? "all" : "saved")}
                className={cn(
                  "shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold border transition cursor-pointer",
                  quickFilter === "saved"
                    ? "bg-brand-terracotta text-white border-brand-terracottaDark shadow-2xs"
                    : "bg-[#FAF4E8] text-paper-ink border-[#D8C7B0]"
                )}
              >
                ❤️ Đã lưu
              </button>
              <button
                type="button"
                onClick={() => handleSortChange(sortBy === "near" ? "default" : "near")}
                disabled={!userLocation}
                className={cn(
                  "shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold border transition cursor-pointer disabled:opacity-50",
                  sortBy === "near"
                    ? "bg-brand-terracotta text-white border-brand-terracottaDark shadow-2xs"
                    : "bg-[#FAF4E8] text-paper-ink border-[#D8C7B0]"
                )}
              >
                📍 Gần tôi
              </button>
              <button
                type="button"
                onClick={() =>
                  handleQuickFilterChange(quickFilter === "indoor" ? "all" : "indoor")
                }
                className={cn(
                  "shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold border transition cursor-pointer",
                  quickFilter === "indoor"
                    ? "bg-brand-terracotta text-white border-brand-terracottaDark shadow-2xs"
                    : "bg-[#FAF4E8] text-paper-ink border-[#D8C7B0]"
                )}
              >
                ❄️ Trong nhà
              </button>
              <button
                type="button"
                onClick={() =>
                  handleQuickFilterChange(quickFilter === "outdoor" ? "all" : "outdoor")
                }
                className={cn(
                  "shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold border transition cursor-pointer",
                  quickFilter === "outdoor"
                    ? "bg-brand-terracotta text-white border-brand-terracottaDark shadow-2xs"
                    : "bg-[#FAF4E8] text-paper-ink border-[#D8C7B0]"
                )}
              >
                🌅 Ngoài trời
              </button>
            </div>

            {/* iOS Segmented Icon Toggle (⊞ 2 cột / ▭ 1 cột) */}
            <div className="flex items-center bg-[#EFE5D4] p-0.5 rounded-lg border border-[#CBB292] shrink-0">
              <button
                type="button"
                onClick={() => setMobileGridCols(2)}
                aria-pressed={mobileGridCols === 2}
                aria-label="Lưới 2 cột"
                title="Lưới 2 cột"
                className={cn(
                  "px-2 py-1 rounded-md text-xs font-bold transition cursor-pointer flex items-center justify-center",
                  mobileGridCols === 2
                    ? "bg-[#FFFDF9] text-brand-terracotta shadow-xs"
                    : "text-paper-ink/60"
                )}
              >
                ⊞
              </button>
              <button
                type="button"
                onClick={() => setMobileGridCols(1)}
                aria-pressed={mobileGridCols === 1}
                aria-label="Thẻ lớn 1 cột"
                title="Thẻ lớn 1 cột"
                className={cn(
                  "px-2 py-1 rounded-md text-xs font-bold transition cursor-pointer flex items-center justify-center",
                  mobileGridCols === 1
                    ? "bg-[#FFFDF9] text-brand-terracotta shadow-xs"
                    : "text-paper-ink/60"
                )}
              >
                ▭
              </button>
            </div>
          </div>

          <div className="hidden md:block">
            <LocationChip />
          </div>
        </div>

        {/* Train street safety warning (Section 14.2) */}
        {isTrainStreet && (
          <div className="bg-[#FAF4E8] border-2 border-brand-terracotta rounded-2xl p-5 space-y-3 shadow-sm animate-in fade-in duration-200">
            <div className="flex items-start gap-3">
              <span className="text-2xl select-none">⚠️</span>
              <div className="space-y-1">
                <h4 className="font-serif font-extrabold text-base text-paper-ink">
                  {HIDDEN_SAFETY_PLACE.name}
                </h4>
                <p className="text-xs text-paper-muted leading-relaxed">
                  {HIDDEN_SAFETY_PLACE.warningMessage}
                </p>
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
                    className="px-3 py-1.5 rounded-lg bg-brand-terracotta text-white text-xs font-bold hover:bg-brand-terracottaDark transition cursor-pointer"
                  >
                    {alt.emoji} {alt.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Places Discovery Grid (2-col Lemon8/Pinterest feed on mobile by default, 2-col on tablet, 3-col on desktop) */}
        {isLoading ? (
          <div className="text-center text-sm text-paper-muted py-14 flex flex-col items-center justify-center gap-2">
            <div className="w-8 h-8 border-3 border-brand-terracotta border-t-transparent rounded-full animate-spin" />
            <span>Đang lật sổ tìm tọa độ hẹn hò chuẩn gu...</span>
          </div>
        ) : displayedPlaces.length > 0 ? (
          <>
            <div
              className={cn(
                "grid gap-3 sm:gap-5 md:gap-6 pt-1",
                mobileGridCols === 2
                  ? "grid-cols-2 md:grid-cols-2 lg:grid-cols-3"
                  : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
              )}
            >
              {displayedPlaces.map((place, idx) => (
                <PlaceCard
                  key={place.id}
                  place={place}
                  index={idx}
                  compact={mobileGridCols === 2}
                />
              ))}
            </div>

            {nextCursor && (
              <div className="pt-6 pb-2 text-center">
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#FFFDF9] border-2 border-[#CBB292] text-xs sm:text-sm font-bold text-paper-ink hover:bg-brand-peach hover:border-brand-terracotta hover:text-brand-terracotta transition shadow-2xs disabled:opacity-50 cursor-pointer"
                >
                  <span>
                    {isLoadingMore ? "Đang lật thêm trang sổ..." : "📖 Xem thêm tọa độ hẹn hò"}
                  </span>
                  <span className="text-brand-terracotta font-mono font-bold">↓</span>
                </button>
              </div>
            )}

            {!nextCursor && displayedPlaces.length > 0 && (
              <div className="pt-6 pb-2 text-center text-xs text-paper-muted font-medium">
                ✨ Hai bạn đã xem hết các tọa độ hẹn hò khớp bộ lọc tại Hà Nội
              </div>
            )}
          </>
        ) : (
          <div className="bg-[#FFFDF9] border-2 border-dashed border-[#CBB292] rounded-2xl p-10 text-center text-xs space-y-2">
            <p className="text-sm font-bold text-paper-ink">
              {quickFilter === "saved"
                ? "Hai bạn chưa lưu tọa độ nào khớp bộ lọc này 💌"
                : "Không tìm thấy địa điểm nào khớp với tiêu chí tìm kiếm của hai bạn 🔍"}
            </p>
            <p className="text-paper-muted">
              Thử chọn thể loại khác hoặc đặt lại bộ lọc để khám phá thêm nhiều không gian thú vị nhé!
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-terracotta text-white font-bold hover:bg-brand-terracottaDark transition cursor-pointer"
              >
                <span>↺</span>
                <span>Đặt lại tất cả bộ lọc</span>
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Micro Lucky Wheel Trigger Banner (Compact, replaces heavy quiz on explore feed) */}
      <div id="explore-quiz-anchor" className="pt-6 pb-2 max-w-md mx-auto">
        <div className="bg-[#FFF8EE] border border-dashed border-[#CBB292] rounded-2xl p-4 flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl select-none">🎲</span>
            <div>
              <h4 className="font-serif font-bold text-xs sm:text-sm text-paper-ink">
                Chưa biết hẹn ở đâu hôm nay?
              </h4>
              <p className="text-[11px] text-paper-muted">
                Bốc quẻ ngẫu nhiên một tọa độ hẹn hò chuẩn gu hai bạn
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsWheelOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-brand-terracotta text-white font-bold text-xs hover:bg-brand-terracottaDark transition active:scale-95 cursor-pointer shadow-2xs shrink-0"
          >
            Bốc Quẻ ➔
          </button>
        </div>
      </div>

      {/* Native iOS Filter Bottom Sheet Drawer on Mobile (< 768px) */}
      {isFilterSheetOpen && (
        <div
          onClick={() => setIsFilterSheetOpen(false)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end justify-center md:hidden animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Bộ lọc tọa độ hẹn hò"
            className="w-full bg-[#FAF4E8] border-t-2 border-paper-ink rounded-t-3xl p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] shadow-2xl max-h-[88dvh] overflow-y-auto overscroll-contain space-y-4"
          >
            <div
              aria-hidden="true"
              className="w-10 h-1.5 rounded-full bg-[#CBB292] mx-auto -mt-1 mb-1"
            />

            <div className="flex items-center justify-between border-b border-[#E6D7C3] pb-2.5">
              <h3 className="font-serif font-extrabold text-base text-paper-ink flex items-center gap-1.5">
                <span aria-hidden="true">🎛️</span>
                <span>Bộ lọc tọa độ hẹn hò</span>
              </h3>
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs font-bold text-brand-terracotta hover:underline cursor-pointer"
              >
                ↺ Đặt lại
              </button>
            </div>

            {/* 1. Moods */}
            <div className="space-y-2">
              <span className="text-[11px] font-extrabold text-paper-muted uppercase tracking-wider block">
                💖 Gu hẹn hò &amp; Không khí
              </span>
              <div className="flex flex-wrap gap-1.5">
                {EXPLORE_MOODS.map((m) => {
                  const isActive = mood === m.key;
                  return (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => handleMoodChange(isActive ? "all" : m.key)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-xs transition flex items-center gap-1 cursor-pointer",
                        isActive
                          ? "bg-brand-peach border-2 border-brand-terracotta text-brand-terracotta font-extrabold"
                          : "bg-[#FFFDF9] text-paper-ink border border-[#D8C7B0] font-semibold"
                      )}
                    >
                      <span>{m.emoji}</span>
                      <span>{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Districts */}
            <div className="space-y-2">
              <span className="text-[11px] font-extrabold text-paper-muted uppercase tracking-wider block">
                📍 Khu vực / Quận
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => handleDistrictChange("all")}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-bold border transition cursor-pointer",
                    district === "all"
                      ? "bg-brand-terracotta text-white border-brand-terracottaDark"
                      : "bg-[#FFFDF9] text-paper-ink border-[#D8C7B0]"
                  )}
                >
                  Tất cả Quận
                </button>
                {HANOI_7_DISTRICTS.map((d) => (
                  <button
                    key={d.key}
                    type="button"
                    onClick={() => handleDistrictChange(district === d.key ? "all" : d.key)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-bold border transition cursor-pointer",
                      district === d.key
                        ? "bg-brand-terracotta text-white border-brand-terracottaDark"
                        : "bg-[#FFFDF9] text-paper-ink border-[#D8C7B0]"
                    )}
                  >
                    {d.name}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    handleDistrictChange(
                      district === OTHER_DISTRICT_KEY ? "all" : OTHER_DISTRICT_KEY
                    )
                  }
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-bold border transition cursor-pointer",
                    district === OTHER_DISTRICT_KEY
                      ? "bg-brand-terracotta text-white border-brand-terracottaDark"
                      : "bg-[#FFFDF9] text-paper-ink border-[#D8C7B0]"
                  )}
                >
                  Khu vực khác
                </button>
              </div>
            </div>

            {/* 3. Budget */}
            <div className="space-y-2">
              <span className="text-[11px] font-extrabold text-paper-muted uppercase tracking-wider block">
                💰 Mức ngân sách
              </span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "all", label: "💰 Mọi mức giá" },
                  { value: "1", label: "🌱 Tiết kiệm" },
                  { value: "2", label: "☕ Vừa vặn" },
                  { value: "3", label: "🥂 Dịp đặc biệt" },
                ].map((b) => (
                  <button
                    key={b.value}
                    type="button"
                    onClick={() => handleBudgetChange(b.value)}
                    className={cn(
                      "min-h-10 px-3 py-2 rounded-xl text-xs font-bold border transition cursor-pointer",
                      budget === b.value
                        ? "bg-brand-terracotta text-white border-brand-terracottaDark"
                        : "bg-[#FFFDF9] text-paper-ink border-[#D8C7B0]"
                    )}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Location Chip */}
            <LocationChip />

            <button
              type="button"
              onClick={() => setIsFilterSheetOpen(false)}
              className="min-h-11 w-full bg-brand-terracotta hover:bg-brand-terracottaDark text-white font-extrabold text-xs py-3 rounded-2xl shadow-md transition active:scale-98 cursor-pointer"
            >
              Xem {displayedPlaces.length} tọa độ phù hợp ➔
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ExplorePage() {
  return (
    <Suspense
      fallback={
        <div className="text-center text-sm text-paper-muted py-14">
          Đang lật sổ tìm tọa độ hẹn hò...
        </div>
      }
    >
      <ExploreContent />
    </Suspense>
  );
}
