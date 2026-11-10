"use client";

import React, { useMemo, useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { PlaceCard } from "@/components/user/PlaceCard";
import { LocationChip } from "@/components/user/LocationChip";
import { MoodMatchQuiz } from "@/components/explore/MoodMatchQuiz";
import { ExploreSearchBar } from "@/components/explore/ExploreSearchBar";
import { ExploreFilterSection } from "@/components/explore/ExploreFilterSection";
import { HIDDEN_SAFETY_PLACE } from "@/lib/constants/catalog";
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

  // Gọi API tải địa điểm khi filter hoặc debounced query thay đổi
  useEffect(() => {
    let active = true;
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
  }, [debouncedQuery, category, mood, district, budget, quickFilter]);

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
    <div className="space-y-12 animate-in fade-in duration-300">
      <section className="space-y-4">
        {/* Header & Quick Filters */}
        <div className="explore-header-row flex flex-col md:flex-row md:items-end justify-between gap-3">
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
          <div className="flex flex-wrap items-center gap-1.5">
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

        {/* Search & 2-Tier Filter Section */}
        <div className="bg-[#FFFDF9] border-2 border-[#D8C7B0] rounded-2xl p-4 shadow-2xs space-y-4">
          {/* Ô tìm kiếm có Autocomplete Dropdown */}
          <ExploreSearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            onSearch={handleSearchSubmit}
            onSelectSuggestion={handleSelectSuggestion}
            onOpenWheel={() => setIsWheelOpen(true)}
          />

          {/* Bộ lọc 2 tầng: Thể loại + Gu hẹn hò + Dropdowns */}
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

          <LocationChip />
        </div>

        {/* Cảnh báo an toàn đường tàu (Mục 14.2) */}
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

        {/* Danh sách địa điểm */}
        {isLoading ? (
          <div className="text-center text-sm text-paper-muted py-14 flex flex-col items-center justify-center gap-2">
            <div className="w-8 h-8 border-3 border-brand-terracotta border-t-transparent rounded-full animate-spin" />
            <span>Đang lật sổ tìm tọa độ hẹn hò chuẩn gu...</span>
          </div>
        ) : displayedPlaces.length > 0 ? (
          <>
            <div className="responsive-3col grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-1">
              {displayedPlaces.map((place, idx) => (
                <PlaceCard key={place.id} place={place} index={idx} />
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

      <MoodMatchQuiz />
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
