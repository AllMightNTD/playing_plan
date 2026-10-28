"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Search, Sparkles, Flame, Clock, Film, X, Filter, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { VideoCard } from "@/components/user/VideoCard";
import { VideoPlayerModal } from "@/components/user/VideoPlayerModal";
import type { VideoCatalogItem, VideoCategory } from "@/server/services/user/videos.service";
import { cn } from "@/lib/utils";

const CATEGORY_TABS: Array<{ id: string; label: string; icon: string }> = [
  { id: "all", label: "Tất cả", icon: "✨" },
  { id: "food", label: "Món ăn ngon", icon: "🍜" },
  { id: "cafe", label: "Trà & Café view đẹp", icon: "☕" },
  { id: "chill", label: "Địa điểm chill", icon: "🌿" },
  { id: "photo", label: "Sống ảo & View đẹp", icon: "📸" },
  { id: "stay", label: "Khách sạn & Homestay", icon: "🏨" },
  { id: "fun", label: "Đi chơi & Workshop", icon: "🎨" },
  { id: "walk", label: "Đi dạo ngắm cảnh", icon: "🚶" },
];

const SORT_TABS = [
  { id: "recommend", label: "Đề xuất cho cặp đôi", icon: Sparkles },
  { id: "popular", label: "Xem nhiều nhất", icon: Flame },
  { id: "latest", label: "Mới nhất", icon: Clock },
  { id: "all", label: "Tất cả", icon: Film },
];

export default function VideosPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedTab, setSelectedTab] = useState<"all" | "recommend" | "popular" | "latest">("recommend");
  const [selectedChannel, setSelectedChannel] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  const [videos, setVideos] = useState<VideoCatalogItem[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; label: string; count: number }>>([]);
  const [channels, setChannels] = useState<Array<{ title: string; count: number }>>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const [activeVideo, setActiveVideo] = useState<VideoCatalogItem | null>(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch videos from API
  const fetchVideos = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedQuery.trim()) params.set("q", debouncedQuery.trim());
      if (selectedCategory !== "all") params.set("category", selectedCategory);
      if (selectedTab !== "all") params.set("tab", selectedTab);
      if (selectedChannel !== "all") params.set("channel", selectedChannel);
      params.set("page", currentPage.toString());
      params.set("limit", "18");

      const res = await fetch(`/api/v1/user/videos?${params.toString()}`);
      if (!res.ok) throw new Error("Lỗi khi tải video");
      const json = await res.json();
      const payload = json.data;

      setVideos(payload.items || []);
      setTotal(payload.total || 0);
      setTotalPages(payload.totalPages || 1);
      if (payload.categories) setCategories(payload.categories);
      if (payload.channels) setChannels(payload.channels);
    } catch (err) {
      console.error("Lỗi khi lấy video review:", err);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedQuery, selectedCategory, selectedTab, selectedChannel, currentPage]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setSelectedTab("recommend");
    setSelectedChannel("all");
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">
      {/* 1. Header Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#7F2633] via-[#C93F52] to-[#FF9E8D] text-white p-5 sm:p-7 shadow-peach-lg">
        <div className="relative z-10 max-w-2xl space-y-3">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm">
            <Film className="w-3.5 h-3.5" />
            <span>Video Review Hẹn Hò & Ẩm Thực Hà Nội</span>
          </span>

          <h2 className="font-display font-extrabold text-2xl sm:text-3xl leading-tight">
            Xem thực tế trước khi đi,<br />khỏi lo chọn nhầm quán!
          </h2>

          <p className="text-xs sm:text-sm text-white/90 leading-relaxed max-w-lg">
            Hàng trăm video review chất lượng cao từ các YouTuber, Food Reviewer hàng đầu
            (Ninh Titô, Khoai Lang Thang, Dinology, Ở Hà Nội...). Tự động liên kết thẳng đến bản đồ & cẩm nang DateMate!
          </p>
        </div>

        {/* Decorative Video Icon */}
        <div className="absolute -right-4 -bottom-6 text-[100px] sm:text-[130px] opacity-15 select-none pointer-events-none">
          🎬
        </div>
      </div>

      {/* 2. Search & Sort Controls */}
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brown-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tiêu đề, món ăn, tên quán hoặc YouTuber (ví dụ: Ninh Tito, Hồ Tây, phở, chill)..."
            className="w-full pl-11 pr-10 py-3 rounded-2xl bg-white border border-peach-soft text-brown placeholder:text-brown-muted/60 text-xs sm:text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-peach-deep/30 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-peach-soft/60 hover:bg-peach-soft text-brown flex items-center justify-center transition"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Category Pills Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none select-none">
          {CATEGORY_TABS.map((cat) => {
            const countItem = categories.find((c) => c.id === cat.id);
            const countText = countItem ? ` (${countItem.count})` : "";
            const isSelected = selectedCategory === cat.id;

            return (
              <button
                key={cat.id}
                onClick={() => {
                  setSelectedCategory(cat.id);
                  setCurrentPage(1);
                }}
                className={cn(
                  "px-3.5 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all duration-200 flex items-center gap-1.5 shrink-0 shadow-sm",
                  isSelected
                    ? "bg-peach-deep text-white shadow-peach"
                    : "bg-white text-brown border border-peach-soft hover:bg-peach-soft/40"
                )}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
                {cat.id !== "all" && countText && (
                  <span className={cn("text-[10px]", isSelected ? "text-white/80" : "text-brown-muted")}>
                    {countText}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Sort & Recommendation Tabs + Channel Filter */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          {/* Recommend Tabs */}
          <div className="flex items-center gap-1.5 bg-white p-1 rounded-2xl border border-peach-soft shadow-sm select-none">
            {SORT_TABS.map((tab) => {
              const Icon = tab.icon;
              const isSelected = selectedTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setSelectedTab(tab.id as any);
                    setCurrentPage(1);
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5",
                    isSelected
                      ? "bg-peach-soft text-peach-deep"
                      : "text-brown-muted hover:text-brown"
                  )}
                >
                  <Icon className={cn("w-3.5 h-3.5", isSelected && "fill-current")} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Channels Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto max-w-full sm:max-w-md pb-1 scrollbar-none">
            <span className="text-[11px] font-bold text-brown-muted shrink-0 mr-1">
              Kênh:
            </span>
            <button
              onClick={() => {
                setSelectedChannel("all");
                setCurrentPage(1);
              }}
              className={cn(
                "px-2.5 py-1 rounded-xl text-[11px] font-bold shrink-0 transition",
                selectedChannel === "all"
                  ? "bg-brown text-white"
                  : "bg-white text-brown-muted border border-peach-soft hover:text-brown"
              )}
            >
              Tất cả
            </button>
            {channels.slice(0, 5).map((ch) => (
              <button
                key={ch.title}
                onClick={() => {
                  setSelectedChannel(selectedChannel === ch.title ? "all" : ch.title);
                  setCurrentPage(1);
                }}
                className={cn(
                  "px-2.5 py-1 rounded-xl text-[11px] font-bold shrink-0 transition",
                  selectedChannel === ch.title
                    ? "bg-brown text-white"
                    : "bg-white text-brown-muted border border-peach-soft hover:text-brown"
                )}
              >
                {ch.title} ({ch.count})
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Results Header & Count */}
      <div className="flex items-center justify-between text-xs text-brown-muted font-medium pt-1">
        <div>
          Tìm thấy <strong className="text-brown font-bold">{total}</strong> video review
          {selectedCategory !== "all" && ` trong mục "${CATEGORY_TABS.find((c) => c.id === selectedCategory)?.label}"`}
          {selectedChannel !== "all" && ` của kênh "${selectedChannel}"`}
        </div>

        {(searchQuery || selectedCategory !== "all" || selectedChannel !== "all" || selectedTab !== "recommend") && (
          <button
            onClick={handleResetFilters}
            className="text-peach-deep hover:underline font-bold flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Đặt lại bộ lọc</span>
          </button>
        )}
      </div>

      {/* 4. Video Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={idx}
              className="bg-white rounded-3xl overflow-hidden border border-peach-soft shadow-sm p-3 space-y-3 animate-pulse"
            >
              <div className="aspect-video bg-peach-soft/50 rounded-2xl" />
              <div className="h-4 bg-peach-soft/50 rounded-md w-3/4" />
              <div className="h-3 bg-peach-soft/30 rounded-md w-1/2" />
            </div>
          ))}
        </div>
      ) : videos.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {videos.map((vid) => (
            <VideoCard
              key={vid.id}
              video={vid}
              onPlay={(selected) => setActiveVideo(selected)}
            />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white rounded-3xl border border-peach-soft p-10 text-center space-y-3 shadow-sm">
          <div className="text-4xl">🔍</div>
          <h4 className="font-display font-extrabold text-lg text-brown">
            Chưa tìm thấy video review phù hợp
          </h4>
          <p className="text-xs text-brown-muted max-w-sm mx-auto">
            Thử đổi từ khóa tìm kiếm hoặc chọn mục &quot;Tất cả&quot; để xem toàn bộ cẩm nang video review nhé!
          </p>
          <button
            onClick={handleResetFilters}
            className="px-4 py-2 rounded-xl bg-peach-deep text-white font-bold text-xs hover:bg-peach-deep/90 transition shadow-sm mt-2"
          >
            Xem tất cả video
          </button>
        </div>
      )}

      {/* 5. Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-4 select-none">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1 || isLoading}
            className="px-3.5 py-2 rounded-xl bg-white border border-peach-soft text-brown text-xs font-bold disabled:opacity-40 hover:bg-peach-soft/30 transition flex items-center gap-1 shadow-sm"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Trang trước</span>
          </button>

          <span className="text-xs font-bold text-brown px-3 py-1 bg-peach-soft/60 rounded-lg">
            {currentPage} / {totalPages}
          </span>

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages || isLoading}
            className="px-3.5 py-2 rounded-xl bg-white border border-peach-soft text-brown text-xs font-bold disabled:opacity-40 hover:bg-peach-soft/30 transition flex items-center gap-1 shadow-sm"
          >
            <span>Trang sau</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 6. Video Player Modal */}
      <VideoPlayerModal
        video={activeVideo}
        onClose={() => setActiveVideo(null)}
      />
    </div>
  );
}
