"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { PlaceCard } from "@/components/user/PlaceCard";
import { VideoCard } from "@/components/user/VideoCard";
import { VideoPlayerModal } from "@/components/user/VideoPlayerModal";
import type { VideoCatalogItem } from "@/server/services/user/videos.service";
import type { MemoryBoardDto, MemoryNoteDto } from "@/server/services/user/memory.service";
import type { HanoiPlace } from "@/lib/types/catalog";
import type { MoodKey, TimeSlot } from "@/lib/constants/catalog";
import type { MemoryNoteColor } from "@/lib/constants/user";

type MatchMood = "sunset" | "active" | "art";
type MatchBudget = "saving" | "moderate" | "luxury";

/** Quy đổi lựa chọn trắc nghiệm sang tiêu chí của POST /recommend (tối đa 2 mood). */
const MATCH_MOOD_CRITERIA: Record<MatchMood, { moods: MoodKey[]; slot: TimeSlot }> = {
  sunset: { moods: ["romantic", "photo"], slot: "sunset" },
  active: { moods: ["fun"], slot: "allday" },
  art: { moods: ["photo", "chill"], slot: "allday" },
};
const MATCH_BUDGET_LEVEL: Record<MatchBudget, number> = { saving: 1, moderate: 2, luxury: 3 };

interface MatchRecommendation {
  place: HanoiPlace;
  score: number;
  reasons: string[];
}

const NOTE_COLOR_STYLES: Record<MemoryNoteColor, { card: string; divider: string; label: string; pin: string }> = {
  peach: { card: "bg-[#FADCD2] border-[#E2A995]", divider: "border-[#E2A995]", label: "text-brand-terracottaDark", pin: "bg-brand-olive" },
  yellow: { card: "bg-[#F9EFC7] border-[#DFC98B]", divider: "border-[#D5BE7E]", label: "text-brand-terracotta", pin: "bg-brand-terracotta" },
  olive: { card: "bg-[#E3EBD9] border-[#AFC29F]", divider: "border-[#AFC29F]", label: "text-[#2F4225]", pin: "bg-brand-mustard" },
};
const NOTE_COLORS = Object.keys(NOTE_COLOR_STYLES) as MemoryNoteColor[];

const ROUTE_STOP_STYLES = [
  { bg: "bg-[#FFFDF9]", time: "text-brand-terracotta", offset: "-translate-y-1" },
  { bg: "bg-[#FADCD2]", time: "text-brand-terracottaDark", offset: "translate-y-2" },
  { bg: "bg-[#F9EFC7]", time: "text-brand-mustard", offset: "-translate-y-2" },
];

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return time;
  const total = (h * 60 + m + minutes) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function formatDayMonthYear(value: string | Date, separator = "/"): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return [String(d.getDate()).padStart(2, "0"), String(d.getMonth() + 1).padStart(2, "0"), d.getFullYear()].join(separator);
}

function formatNoteTime(value: string | Date): string {
  const d = new Date(value);
  const minutes = Math.round((Date.now() - d.getTime()) / 60000);
  if (minutes < 1) return "Vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;
  if (minutes < 24 * 60) return `${Math.floor(minutes / 60)} giờ trước`;
  return formatDayMonthYear(d);
}

export default function HomePage() {
  const {
    places,
    isLoadingPlaces,
    setIsWizardOpen,
    setIsWheelOpen,
    setIsRoomModalOpen,
    setActiveDetailSlug,
    homePublic,
    homeSummary,
    isLoadingHome,
    refetchHomeSummary,
    upcomingPlan,
    toggleUpcomingChecklistItem,
    addToast,
    isPlaceSaved,
  } = useApp();

  // Video state
  const [featuredVideos, setFeaturedVideos] = useState<VideoCatalogItem[]>([]);
  const [isLoadingVideos, setIsLoadingVideos] = useState<boolean>(true);
  const [activeVideo, setActiveVideo] = useState<VideoCatalogItem | null>(null);

  // Explore Filter state
  const [currentFilter, setCurrentFilter] = useState<string>("all");
  const [showAllPlaces, setShowAllPlaces] = useState<boolean>(false);

  // Match State
  const [matchMood, setMatchMood] = useState<MatchMood>("sunset");
  const [matchBudget, setMatchBudget] = useState<MatchBudget>("moderate");
  const [matchResult, setMatchResult] = useState<MatchRecommendation | null>(null);
  const [isMatching, setIsMatching] = useState<boolean>(false);

  // Checklist Popover State
  const [isChecklistOpen, setIsChecklistOpen] = useState<boolean>(false);
  const [newChecklistText, setNewChecklistText] = useState<string>("");

  // Timeline Modal State
  const [isTimelineOpen, setIsTimelineOpen] = useState<boolean>(false);

  // Memory Board
  const [memoryBoard, setMemoryBoard] = useState<MemoryBoardDto>({ notes: [], memories: [] });
  const [isLoadingMemories, setIsLoadingMemories] = useState<boolean>(true);
  const [isComposingNote, setIsComposingNote] = useState<boolean>(false);
  const [noteDraft, setNoteDraft] = useState<string>("");
  const [noteColor, setNoteColor] = useState<MemoryNoteColor>("peach");
  const [isSavingNote, setIsSavingNote] = useState<boolean>(false);

  // Personalized Data
  const room = homeSummary?.room ?? null;
  const anniversary = room?.anniversary ?? null;
  const daysLeft = anniversary?.daysLeft ?? null;
  const upcomingSummary = homeSummary?.upcomingPlan ?? null;
  const checklistItems = upcomingPlan?.checklist ?? [];
  const completedChecklistCount = checklistItems.filter((c) => c.isDone).length;
  // condition từ API dạng "Nắng thu dịu • Mưa 4%", phần mưa đã hiển thị riêng
  const weatherLabel = homePublic?.weather.condition.split(" • ")[0] ?? "";
  const isRainy = homePublic?.weather.icon === "rain" || homePublic?.weather.icon === "thunder";
  const todayStamp = formatDayMonthYear(new Date(), ".");

  const placeById = useMemo(() => new Map(places.map((p) => [p.id, p])), [places]);
  const stopName = (stop: { customName: string | null; placeId: string | null }) =>
    stop.customName || (stop.placeId && placeById.get(stop.placeId)?.name) || "Điểm hẹn hò";

  useEffect(() => {
    let active = true;
    fetch("/api/v1/user/videos?tab=recommend&limit=3")
      .then((res) => res.json())
      .then((json) => {
        if (active && Array.isArray(json?.data?.items)) {
          setFeaturedVideos(json.data.items);
        }
      })
      .catch((err) => console.warn("Lỗi tải video trang chủ:", err))
      .finally(() => {
        if (active) setIsLoadingVideos(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Bốc quẻ Match: chấm điểm địa điểm thật qua POST /recommend mỗi khi đổi tiêu chí
  useEffect(() => {
    let active = true;
    setIsMatching(true);
    fetch("/api/v1/user/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...MATCH_MOOD_CRITERIA[matchMood],
        budget: MATCH_BUDGET_LEVEL[matchBudget],
        transport: "motorbike",
        isRainy,
      }),
    })
      .then((res) => res.json())
      .then((json) => {
        if (active) setMatchResult(json?.data?.items?.[0] ?? null);
      })
      .catch((err) => {
        console.warn("Lỗi bốc quẻ match:", err);
        if (active) setMatchResult(null);
      })
      .finally(() => {
        if (active) setIsMatching(false);
      });
    return () => {
      active = false;
    };
  }, [matchMood, matchBudget, isRainy]);

  const loadMemoryBoard = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/user/memories", { cache: "no-store" });
      const json = await res.json();
      if (res.ok && json?.data) setMemoryBoard(json.data);
    } catch (err) {
      console.warn("Lỗi tải kho kỷ niệm:", err);
    } finally {
      setIsLoadingMemories(false);
    }
  }, []);

  useEffect(() => {
    loadMemoryBoard();
  }, [loadMemoryBoard]);

  // Filter Places
  const filteredPlaces = places.filter((p) => {
    if (currentFilter === "all") return true;
    if (currentFilter === "saved") return isPlaceSaved(p.slug) || isPlaceSaved(p.id);
    if (currentFilter === "outdoor") return !p.indoor;
    if (currentFilter === "indoor") return p.indoor;
    if (currentFilter === "art") {
      const cat = p.categoryLabel?.toLowerCase() || "";
      const name = p.name.toLowerCase();
      return (
        cat.includes("nghệ thuật") ||
        cat.includes("bảo tàng") ||
        cat.includes("thủ công") ||
        name.includes("bảo tàng") ||
        name.includes("gốm") ||
        name.includes("workshop")
      );
    }
    return true;
  });

  const displayPlaces =
    !showAllPlaces && currentFilter === "all"
      ? filteredPlaces.slice(0, 3)
      : filteredPlaces;

  // Xử lý nút "Hôm nay đi đâu?"
  const triggerWhereToGoToday = () => {
    const exploreEl = document.getElementById("section-explore");
    if (exploreEl) {
      exploreEl.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    const weather = homePublic?.weather;
    addToast(
      weather
        ? `🪄 Đã cuộn tới các địa điểm hợp với trời ${weatherLabel.toLowerCase()} ${weather.temp}°C hôm nay tại Hà Nội!`
        : "🪄 Đã cuộn tới các địa điểm hẹn hò tại Hà Nội!",
      "info"
    );
  };

  // Thêm mục chuẩn bị vào checklist của buổi hẹn sắp tới
  const handleAddChecklistItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = newChecklistText.trim();
    if (!content || !upcomingPlan) return;
    try {
      const res = await fetch(`/api/v1/user/plans/${encodeURIComponent(upcomingPlan.id)}/checklist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const json = await res.json();
      if (!res.ok) {
        addToast(json?.error?.message || "Chưa thêm được mục chuẩn bị.", "error");
        return;
      }
      setNewChecklistText("");
      await refetchHomeSummary();
    } catch (err) {
      console.warn("Lỗi thêm checklist:", err);
      addToast("Mất kết nối, chưa thêm được mục chuẩn bị.", "error");
    }
  };

  // Dán giấy nhớ kỷ niệm lên bảng (lưu vào phòng đôi, lần đầu sẽ tự tạo phòng)
  const handleAddStickyNote = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = noteDraft.trim();
    if (!content || isSavingNote) return;
    setIsSavingNote(true);
    try {
      const res = await fetch("/api/v1/user/memories/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, color: noteColor }),
      });
      const json = await res.json();
      if (!res.ok) {
        addToast(json?.error?.message || "Chưa dán được giấy nhớ, thử lại nhé.", "error");
        return;
      }
      const note: MemoryNoteDto = json.data;
      setMemoryBoard((prev) => ({ ...prev, notes: [note, ...prev.notes] }));
      setNoteDraft("");
      setIsComposingNote(false);
      addToast("📌 Đã ghim thêm một tờ giấy nhớ kỷ niệm lên bảng!", "success");
      if (!room) refetchHomeSummary();
    } catch (err) {
      console.warn("Lỗi dán giấy nhớ:", err);
      addToast("Mất kết nối, chưa dán được giấy nhớ.", "error");
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleRemoveStickyNote = async (id: string) => {
    const previous = memoryBoard.notes;
    setMemoryBoard((prev) => ({ ...prev, notes: prev.notes.filter((n) => n.id !== id) }));
    try {
      const res = await fetch(`/api/v1/user/memories/notes/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`memory note API ${res.status}`);
    } catch (err) {
      console.warn("Lỗi gỡ giấy nhớ:", err);
      setMemoryBoard((prev) => ({ ...prev, notes: previous }));
      addToast("Chưa gỡ được giấy nhớ, thử lại nhé.", "error");
    }
  };

  return (
    <div className="space-y-14">
      {/* =============================================================
           PHẦN 1: #section-home (TRANG CHỦ, VÉ TƯƠNG TÁC & LỊCH HẸN HÔM NAY)
           ============================================================= */}
      <section id="section-home" className="scroll-section space-y-6">
        {/* Cụm Hero: Bên trái Lời chào + 2 Tấm Vé | Bên phải Khung Polaroid Cặp Đôi */}
        <div className="hero-banner-grid grid grid-cols-1 lg:grid-cols-12 gap-6 items-center bg-[#F6ECDC]/80 border-2 border-dashed border-[#D6C3A7] rounded-2xl p-5 sm:p-6 relative shadow-sm">
          {/* Băng keo Washi trang trí góc khung Hero */}
          <div className="washi-tape washi-gingham-peach" />
          <div className="washi-tape washi-olive" />

          {/* Cột trái (8/12): Lời chào mùa thu Hà Nội + 2 Tấm Vé Tương Tác */}
          <div className="lg:col-span-8 space-y-4">
            <div className="inline-flex items-center gap-2 bg-[#FFFDF9] border border-[#CBB292] px-3 py-1 rounded-full text-xs font-semibold text-paper-ink shadow-2xs">
              <span>🍂 Sổ tay hẹn hò Hà Nội</span>
              <span className="text-brand-terracotta">•</span>
              <span className="font-hand text-base text-brand-terracotta font-bold">
                Chủ Nhật này hai bạn định đi đâu?
              </span>
            </div>

            <h1 className="font-serif font-extrabold text-2xl sm:text-3xl lg:text-[34px] text-paper-ink leading-tight">
              Lưu giữ từng khoảnh khắc &amp;{" "}
              <span className="text-brand-terracotta underline decoration-wavy decoration-brand-coral underline-offset-4">
                lên kế hoạch đi chơi
              </span>{" "}
              thật hợp gu!
            </h1>

            <p className="text-xs sm:text-sm text-paper-muted max-w-2xl leading-relaxed">
              Gợi ý địa điểm theo đúng thời tiết Hà Nội theo giờ thực, kèm góc chụp ảnh đẹp, bí kíp
              tạo dáng tự nhiên và phối đồ đôi chuẩn chỉnh.
            </p>

            {/* 2 Tấm Vé Răng Cưa Tương Tác */}
            <div className="ticket-row flex flex-wrap items-center gap-4 pt-1">
              {/* Tấm vé 1: Hôm nay đi đâu? */}
              <button
                onClick={triggerWhereToGoToday}
                className="ticket-btn bg-brand-terracotta text-white px-6 py-3.5 flex items-center gap-3 min-w-[215px] justify-center group"
              >
                <span className="absolute inset-1.5 border border-dashed border-[#FADCD2]/60 rounded pointer-events-none" />
                <span className="absolute top-1.5 bottom-1.5 right-7 border-r border-dashed border-[#FADCD2]/60 pointer-events-none" />
                <svg
                  className="w-5 h-5 text-[#FADCD2] group-hover:rotate-12 transition"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                  />
                </svg>
                <span className="font-bold text-[15px] tracking-wide pr-3">Hôm nay đi đâu?</span>
              </button>

              {/* Tấm vé 2: Lười chọn, quay số đi! */}
              <button
                onClick={() => setIsWheelOpen(true)}
                className="ticket-btn bg-[#F6B092] text-paper-ink px-6 py-3.5 flex items-center gap-3 min-w-[245px] justify-center group"
              >
                <span className="absolute inset-1.5 border border-dashed border-paper-ink/40 rounded pointer-events-none" />
                <span className="text-lg">🎲</span>
                <span className="font-bold text-[15px] tracking-wide">Lười chọn, quay số đi!</span>
                <svg
                  className="w-6 h-6 text-brand-olive group-hover:translate-x-1 group-hover:-translate-y-0.5 transition"
                  viewBox="0 0 32 32"
                  fill="none"
                >
                  <path
                    d="M4 28L19 13M19 13L23 5L27 9L19 13ZM19 13L28 4"
                    stroke="#362721"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path d="M23 5L27 9L19 13L23 5Z" fill="#6E8361" />
                </svg>
              </button>
            </div>
          </div>

          {/* Cột phải (4/12): Khung Ảnh Polaroid Cặp Đôi kẹp Ghim Sắt Đen */}
          <div className="lg:col-span-4 flex justify-center">
            <div className="relative w-full max-w-[250px] pt-3">
              {/* Kẹp Bướm Sắt Đen (Binder Clip SVG) */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
                <svg className="w-11 h-10 drop-shadow-md" viewBox="0 0 48 44" fill="none">
                  <path
                    d="M18 16L13 4C12.3 2.5 13.5 1 15 1H33C34.5 1 35.7 2.5 35 4L30 16"
                    stroke="#362721"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  <circle cx="24" cy="5" r="2.5" stroke="#362721" strokeWidth="2" />
                  <path
                    d="M9 16H39L42 30H6L9 16Z"
                    fill="#2B2624"
                    stroke="#1A1615"
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />
                  <path d="M11 20H37" stroke="#594F4B" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>

              {/* Tấm Polaroid phụ nghiêng phía sau */}
              <div className="absolute inset-x-2 top-4 bottom-2 bg-[#FAF3E6] border border-[#CBB69B] rounded shadow transform rotate-3 pointer-events-none" />

              {/* Tấm Polaroid chính */}
              <div
                onClick={() => setIsRoomModalOpen(true)}
                className="relative bg-[#FFFDF9] border-2 border-[#CDBB9E] rounded-md p-2.5 pb-3 shadow-lg transform -rotate-2 hover:rotate-0 transition cursor-pointer group"
              >
                <div className="overflow-hidden rounded-sm aspect-[4/3] bg-[#E8DCCB] relative">
                  <Image
                    src="https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=600&q=80"
                    alt="Ảnh kỷ niệm cặp đôi"
                    fill
                    sizes="250px"
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    unoptimized
                  />
                  <div className="absolute bottom-1.5 right-1.5 bg-black/55 backdrop-blur-xs text-white text-[10px] px-2 py-0.5 rounded flex items-center gap-1">
                    <span>🔗 Mã QR Phòng đôi</span>
                  </div>
                </div>
                <div className="text-center mt-2">
                  <p className="font-bold text-xs tracking-wider text-paper-ink uppercase">
                    {room ? `PHÒNG ĐÔI ${room.memberCount}/2` : "CHƯA CÓ PHÒNG ĐÔI"}
                  </p>
                  <p className="font-hand text-[18px] text-brand-terracotta font-bold leading-tight">
                    {daysLeft !== null
                      ? `Kỷ niệm còn ${daysLeft} ngày 💕`
                      : room
                      ? "Đặt ngày kỷ niệm nhé 💕"
                      : "Chạm để mời người ấy 💕"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Grid 2 cột: Bản Đồ Giấy Gấp "Buổi hẹn sắp tới" & Bưu Thiếp Thời Tiết Hà Nội */}
        <div className="hero-grid grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* TRÁI (7 CỘT): BẢN ĐỒ GIẤY GẤP 4 NẾP - BUỔI HẸN SẮP TỚI */}
          <div className="lg:col-span-7 folded-map-card rounded-lg p-5 sm:p-6 flex flex-col justify-between">
            <div className="map-dog-ear" />

            {upcomingSummary ? (
              <>
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 pr-6">
                    <div className="flex items-center gap-2.5">
                      <span className="bg-[#D5E2CC] border border-[#9BB08E] text-[#2F4225] text-xs font-bold px-3 py-1 rounded-full shadow-2xs">
                        Buổi hẹn sắp tới
                      </span>
                      <span className="text-xs sm:text-sm font-semibold text-paper-muted">
                        {upcomingSummary.formattedDate}
                      </span>
                    </div>
                    <button
                      onClick={() => setIsTimelineOpen(true)}
                      className="text-xs font-bold text-brand-terracotta hover:underline flex items-center gap-1"
                    >
                      <span>Xem timeline</span>
                      <span>→</span>
                    </button>
                  </div>

                  <h2 className="font-serif font-bold text-lg sm:text-[21px] text-paper-ink mt-2.5 leading-snug">
                    {upcomingSummary.title}
                  </h2>
                </div>

                {/* Sơ đồ tuyến đường vẽ tay (SVG Route + tối đa 3 trạm dừng đầu tiên) */}
                <div className="relative my-4 py-3 px-2 select-none">
                  <svg className="w-full h-24 overflow-visible" viewBox="0 0 560 95" fill="none">
                    <path
                      className="animated-route-line"
                      d="M 15 68 Q 75 18, 130 52 T 265 48 T 395 58 T 535 20"
                      stroke="#4A3931"
                      strokeWidth="2.2"
                      fill="none"
                      strokeLinecap="round"
                    />
                    <g transform="translate(320, 42)">
                      <path
                        d="M12 0C7.58 0 4 3.58 4 8C4 14 12 22 12 22C12 22 20 14 20 8C20 3.58 16.42 0 12 0Z"
                        fill="#C84B31"
                        stroke="#362721"
                        strokeWidth="1.8"
                      />
                      <circle cx="12" cy="8" r="3" fill="#FAF4E8" />
                    </g>
                  </svg>

                  <div
                    className={`absolute inset-0 flex items-center px-2 sm:px-5 pointer-events-none ${
                      upcomingSummary.stops.length > 1 ? "justify-between" : "justify-center"
                    }`}
                  >
                    {upcomingSummary.stops.length > 0 ? (
                      upcomingSummary.stops.map((stop, idx) => {
                        const style = ROUTE_STOP_STYLES[idx % ROUTE_STOP_STYLES.length];
                        return (
                          <button
                            key={stop.id}
                            onClick={() => addToast(`${stop.icon} ${stop.time} — ${stop.title}`, "info")}
                            className={`pointer-events-auto group flex flex-col items-center transform ${style.offset} hover:scale-110 transition`}
                          >
                            <div className={`${style.bg} border-2 border-paper-ink rounded-xl px-2.5 py-1.5 shadow-md flex items-center gap-1.5`}>
                              <span className="text-lg">{stop.icon}</span>
                              <div className="text-left">
                                <span className={`block text-[10px] font-bold ${style.time} leading-none`}>
                                  {stop.time}
                                </span>
                                <span className="block text-[11px] font-bold text-paper-ink max-w-[110px] truncate">
                                  {stop.title}
                                </span>
                              </div>
                            </div>
                          </button>
                        );
                      })
                    ) : (
                      <span className="pointer-events-auto bg-[#FFFDF9] border-2 border-dashed border-paper-ink/50 rounded-xl px-3 py-1.5 text-[11px] font-semibold text-paper-muted">
                        Chưa có điểm dừng — bấm &quot;+ Vào lịch&quot; trên thẻ địa điểm nhé
                      </span>
                    )}
                  </div>
                </div>

                {/* Checklist chuẩn bị & Nút Ghim Lịch (.ics) */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-dashed border-[#D5C5B0] relative">
                  <div className="relative">
                    <button
                      onClick={() => setIsChecklistOpen(!isChecklistOpen)}
                      className="flex items-center gap-2 text-xs sm:text-sm text-paper-ink hover:text-brand-terracotta font-medium py-1 px-2 rounded hover:bg-[#EFE4D2]/60 transition"
                    >
                      <span className="w-4 h-4 rounded border border-paper-ink flex items-center justify-center bg-white text-brand-olive font-bold text-xs">
                        ✓
                      </span>
                      <span>
                        Checklist chuẩn bị:{" "}
                        <strong className="font-bold">
                          {completedChecklistCount}/{checklistItems.length} xong
                        </strong>
                      </span>
                      <span className="text-[10px] text-paper-muted underline">(Chạm để tích)</span>
                    </button>

                    {/* Popover Checklist chuẩn bị */}
                    {isChecklistOpen && (
                      <div className="absolute left-0 bottom-10 w-64 bg-[#FFFDF7] border-2 border-paper-ink rounded-lg shadow-xl p-3 z-30">
                        <div className="flex items-center justify-between border-b border-dashed border-[#D5C5B0] pb-1.5 mb-2">
                          <span className="font-hand text-base font-bold text-brand-terracotta">
                            📝 Chuẩn bị trước giờ G
                          </span>
                          <button
                            onClick={() => setIsChecklistOpen(false)}
                            className="text-xs text-paper-muted hover:text-paper-ink"
                          >
                            ✕
                          </button>
                        </div>
                        <div className="space-y-1.5 text-xs max-h-56 overflow-y-auto">
                          {checklistItems.length === 0 && (
                            <p className="text-paper-muted p-1.5">Chưa có mục nào, thêm món cần chuẩn bị bên dưới nhé.</p>
                          )}
                          {checklistItems.map((item) => (
                            <label
                              key={item.id}
                              className="flex items-start gap-2 p-1.5 rounded hover:bg-[#F5EBDC] cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={item.isDone}
                                onChange={() => toggleUpcomingChecklistItem(item.id)}
                                className="mt-0.5 accent-[#C84B31] rounded cursor-pointer"
                              />
                              <span
                                className={
                                  item.isDone
                                    ? "line-through text-paper-muted"
                                    : "text-paper-ink font-medium"
                                }
                              >
                                {item.content}
                              </span>
                            </label>
                          ))}
                        </div>
                        <form onSubmit={handleAddChecklistItem} className="mt-2 pt-2 border-t border-dashed border-[#D5C5B0] flex gap-1.5">
                          <input
                            value={newChecklistText}
                            onChange={(e) => setNewChecklistText(e.target.value)}
                            maxLength={200}
                            placeholder="+ Thêm món cần mang..."
                            className="flex-1 min-w-0 bg-white border border-[#D5C5B0] rounded px-2 py-1 text-xs focus:outline-none focus:border-brand-terracotta"
                          />
                          <button
                            type="submit"
                            disabled={!newChecklistText.trim()}
                            className="bg-brand-terracotta disabled:opacity-40 text-white text-xs font-bold px-2.5 rounded"
                          >
                            Thêm
                          </button>
                        </form>
                      </div>
                    )}
                  </div>

                  <a
                    href={upcomingSummary.icsUrl}
                    download
                    onClick={() =>
                      addToast(
                        "📅 Đang tải file lịch .ics (Mở bằng Apple / Google Calendar để tự báo chuông trước giờ hẹn!)",
                        "success"
                      )
                    }
                    className="relative bg-[#E6D4BC] hover:bg-[#DEC5A4] border border-[#BDA688] text-paper-ink px-3.5 py-2 rounded shadow-sm text-xs font-bold flex items-center gap-1.5 transform -rotate-1 hover:rotate-0 transition active:scale-95"
                  >
                    <svg className="w-5 h-5 absolute -top-3 right-3 drop-shadow" viewBox="0 0 24 24" fill="none">
                      <ellipse cx="12" cy="6" rx="5" ry="3" fill="#6E8361" stroke="#362721" strokeWidth="1.5" />
                      <path d="M9 6L10 13L7 15H17L14 13L15 6" fill="#899F7B" stroke="#362721" strokeWidth="1.5" />
                      <path d="M12 15V22" stroke="#362721" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                    <span className="text-brand-terracotta">📅</span>
                    <span>Thêm vào Lịch ĐT (.ics)</span>
                  </a>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-start justify-center gap-3 h-full py-4 pr-6">
                <span className="bg-[#D5E2CC] border border-[#9BB08E] text-[#2F4225] text-xs font-bold px-3 py-1 rounded-full shadow-2xs">
                  Buổi hẹn sắp tới
                </span>
                {isLoadingHome ? (
                  <p className="text-sm text-paper-muted">Đang mở sổ lịch hẹn...</p>
                ) : (
                  <>
                    <h2 className="font-serif font-bold text-lg sm:text-[21px] text-paper-ink leading-snug">
                      Chưa có buổi hẹn nào được lên lịch
                    </h2>
                    <p className="text-xs sm:text-sm text-paper-muted max-w-md">
                      Để DateMate gợi ý lịch trình hợp gu, hoặc bấm &quot;+ Vào lịch&quot; trên bất kỳ thẻ địa điểm nào bên dưới để bắt đầu.
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        onClick={() => setIsWizardOpen(true)}
                        className="bg-brand-terracotta hover:bg-brand-terracottaDark text-white px-4 py-2 rounded text-xs font-bold shadow transition active:scale-95"
                      >
                        🪄 Lên lịch hẹn ngay
                      </button>
                      <button onClick={triggerWhereToGoToday} className="paper-btn px-4 py-2 text-xs font-bold">
                        🧭 Xem địa điểm gợi ý
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* PHẢI (5 CỘT): BƯU THIẾP THỜI TIẾT HÀ NỘI (AIRMAIL POSTCARD) */}
          <div className="lg:col-span-5 airmail-postcard">
            <div className="airmail-inner p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-2.5 right-3 flex items-center pointer-events-none select-none">
                <svg className="w-24 h-14 text-paper-ink/55 -mr-3" viewBox="0 0 110 60" fill="none">
                  <circle cx="32" cy="30" r="21" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 2" />
                  <circle cx="32" cy="30" r="16" stroke="currentColor" strokeWidth="1.2" />
                  <text x="32" y="27" textAnchor="middle" fontSize="6" fontWeight="bold" fill="currentColor">
                    HÀ NỘI
                  </text>
                  <text x="32" y="35" textAnchor="middle" fontSize="5.5" fill="currentColor">
                    {todayStamp}
                  </text>
                  <path d="M52 20 Q 62 15, 72 20 T 92 20 T 108 20" stroke="currentColor" strokeWidth="1.4" fill="none" />
                  <path d="M52 28 Q 62 23, 72 28 T 92 28 T 108 28" stroke="currentColor" strokeWidth="1.4" fill="none" />
                  <path d="M52 36 Q 62 31, 72 36 T 92 36 T 108 36" stroke="currentColor" strokeWidth="1.4" fill="none" />
                </svg>
                <div className="w-13 h-14 bg-[#DCE8EC] border-2 border-dashed border-[#6D8A96] rounded p-1 flex flex-col items-center justify-center shadow-xs transform rotate-3">
                  <span className="text-2xl leading-none">🌤️</span>
                  <span className="text-[8px] font-bold text-[#3E5C76] uppercase mt-0.5">HANOI</span>
                </div>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-paper-muted">
                  Thời tiết Hà Nội hôm nay
                </p>
                <div className="flex flex-wrap items-baseline gap-2 mt-1 pr-20">
                  <span className="font-serif font-extrabold text-3xl sm:text-4xl text-paper-ink">
                    {homePublic?.weather ? `${homePublic.weather.temp}°C` : "--°C"}
                  </span>
                  <span className="text-xs font-semibold text-paper-ink">
                    {homePublic?.weather ? (
                      <>
                        {weatherLabel} •{" "}
                        <span className="text-brand-olive font-bold">
                          Mưa {homePublic.weather.rainProbability}%
                        </span>
                      </>
                    ) : (
                      "Đang cập nhật..."
                    )}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 my-3.5">
                <div className="bg-[#F6EFE2] border-2 border-[#C8B598] rounded-md p-2.5 shadow-2xs">
                  <p className="text-[11px] font-medium text-paper-muted">Giờ vàng chiều (SunCalc)</p>
                  <p className="font-bold text-sm sm:text-[15px] text-brand-terracotta mt-0.5">
                    {homePublic?.sun?.goldenHour
                      ? `${homePublic.sun.goldenHour.start} - ${homePublic.sun.goldenHour.end}`
                      : "--:-- - --:--"}
                  </p>
                </div>
                <div className="bg-[#F6EFE2] border-2 border-[#C8B598] rounded-md p-2.5 shadow-2xs">
                  <p className="text-[11px] font-medium text-paper-muted">Giờ xanh (Blue Hour)</p>
                  <p className="font-bold text-sm sm:text-[15px] text-paper-ink mt-0.5">
                    {homePublic?.sun?.blueHour
                      ? `${homePublic.sun.blueHour.start} - ${homePublic.sun.blueHour.end}`
                      : "--:-- - --:--"}
                  </p>
                </div>
              </div>

              <div className="bg-[#F7EBC8] border border-[#DEC98C] rounded-md p-2.5 text-[11.5px] leading-relaxed text-paper-ink">
                <span className="font-bold">💡 Gợi ý tự động:</span>{" "}
                {homePublic?.weatherTip || "Đang xem trời Hà Nội hôm nay để gợi ý cho hai bạn..."}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =============================================================
           PHẦN 2: #section-explore (KHÁM PHÁ ĐỊA ĐIỂM POLAROID HỢP THỜI TIẾT)
           ============================================================= */}
      <section id="section-explore" className="scroll-section pt-2">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 mb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-terracotta uppercase tracking-wider">
              <span>🧭 Khám phá {places.length} tọa độ hẹn hò</span>
            </div>
            <h2 className="font-serif font-extrabold text-xl sm:text-2xl text-paper-ink mt-0.5">
              Hợp với thời tiết Hà Nội hôm nay
            </h2>
            <p className="text-xs sm:text-sm text-paper-muted mt-0.5">
              Chạm vào thẻ Polaroid để xem góc chụp, cách tạo dáng và gợi ý phối đồ đôi
            </p>
          </div>

          {/* Bộ lọc danh mục nhanh */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setCurrentFilter("all")}
              className={`filter-pill px-3 py-1.5 rounded-full text-xs transition ${
                currentFilter === "all"
                  ? "bg-brand-terracotta text-white font-bold shadow-xs"
                  : "bg-[#EFE4D2] text-paper-ink font-semibold hover:bg-[#E2D2B8]"
              }`}
            >
              Tất cả ({places.length})
            </button>
            <button
              onClick={() => setCurrentFilter("outdoor")}
              className={`filter-pill px-3 py-1.5 rounded-full text-xs transition ${
                currentFilter === "outdoor"
                  ? "bg-brand-terracotta text-white font-bold shadow-xs"
                  : "bg-[#EFE4D2] text-paper-ink font-semibold hover:bg-[#E2D2B8]"
              }`}
            >
              🌅 Ngắm hoàng hôn
            </button>
            <button
              onClick={() => setCurrentFilter("indoor")}
              className={`filter-pill px-3 py-1.5 rounded-full text-xs transition ${
                currentFilter === "indoor"
                  ? "bg-brand-terracotta text-white font-bold shadow-xs"
                  : "bg-[#EFE4D2] text-paper-ink font-semibold hover:bg-[#E2D2B8]"
              }`}
            >
              🎳 Indoor mát mẻ
            </button>
            <button
              onClick={() => setCurrentFilter("art")}
              className={`filter-pill px-3 py-1.5 rounded-full text-xs transition ${
                currentFilter === "art"
                  ? "bg-brand-terracotta text-white font-bold shadow-xs"
                  : "bg-[#EFE4D2] text-paper-ink font-semibold hover:bg-[#E2D2B8]"
              }`}
            >
              🎨 Nghệ thuật &amp; Bảo tàng
            </button>
            <button
              onClick={() => setShowAllPlaces(!showAllPlaces)}
              className="ml-1 text-xs font-bold text-brand-terracotta hover:underline flex items-center gap-1"
            >
              <span>{showAllPlaces ? "Thu gọn lại ↑" : `Xem cả ${places.length} nơi →`}</span>
            </button>
          </div>
        </div>

        {/* Lưới Thẻ Polaroid Địa Điểm */}
        <div id="polaroidGrid" className="polaroid-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7 pt-2">
          {isLoadingPlaces ? (
            <div className="col-span-full text-center text-sm text-paper-muted py-10">
              Đang lật sổ tìm tọa độ hẹn hò...
            </div>
          ) : displayPlaces.length > 0 ? (
            displayPlaces.map((place, idx) => (
              <PlaceCard key={place.id} place={place} index={idx} />
            ))
          ) : (
            <div className="col-span-full bg-[#FFFDF9] border-2 border-dashed border-[#CBB292] rounded-xl p-8 text-center">
              <span className="text-3xl">💌</span>
              <p className="font-serif font-bold text-lg text-paper-ink mt-2">
                Chưa có địa điểm nào trong mục này
              </p>
              <p className="text-xs text-paper-muted mt-1">
                Hãy bấm vào biểu tượng trái tim trên các tấm ảnh Polaroid để lưu lại nơi hai bạn thích nhé!
              </p>
              <button
                onClick={() => setCurrentFilter("all")}
                className="mt-3 paper-btn px-4 py-1.5 text-xs font-bold"
              >
                Xem tất cả địa điểm
              </button>
            </div>
          )}
        </div>
      </section>

      {/* =============================================================
           PHẦN 3: #section-video (VIDEO REVIEW HẸN HÒ TUYỂN CHỌN - 35MM FILM)
           ============================================================= */}
      <section id="section-video" className="scroll-section pt-4 relative">
        <svg
          className="hidden xl:block w-14 h-20 text-paper-ink absolute -top-6 right-2 pointer-events-none"
          viewBox="0 0 60 90"
          fill="none"
        >
          <path
            d="M35 5 C 55 20, 45 45, 28 42 C 15 40, 18 25, 32 30 C 48 35, 45 65, 22 78"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d="M26 70 L 20 79 L 31 81"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        <div className="flex flex-wrap items-end justify-between gap-2 mb-5">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-brand-terracotta uppercase tracking-wider">
              <span>🎞️ Thực tế &amp; Trực quan</span>
            </div>
            <h2 className="font-serif font-extrabold text-xl sm:text-2xl text-paper-ink mt-0.5">
              Video Review Hẹn Hò Tuyển Chọn
            </h2>
            <p className="text-xs sm:text-sm text-paper-muted">
              Trải nghiệm không gian quán qua góc nhìn chân thực của các reviewer
            </p>
          </div>

          <Link
            href="/videos"
            className="text-xs font-bold text-brand-terracotta hover:underline flex items-center gap-1"
          >
            <span>Xem tất cả video</span>
            <span>→</span>
          </Link>
        </div>

        <div className="video-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredVideos.length > 0 ? (
            featuredVideos.map((vid, vIdx) => (
              <VideoCard
                key={vid.id}
                video={vid}
                index={vIdx}
                onPlay={(selected) => setActiveVideo(selected)}
              />
            ))
          ) : (
            <div className="col-span-full bg-[#FFFDF9] border-2 border-dashed border-[#CBB292] rounded-xl p-8 text-center">
              <span className="text-3xl">🎞️</span>
              <p className="font-serif font-bold text-lg text-paper-ink mt-2">
                {isLoadingVideos ? "Đang tua cuộn phim..." : "Chưa có video review nào được tuyển chọn"}
              </p>
              {!isLoadingVideos && (
                <Link href="/videos" className="inline-block mt-3 paper-btn px-4 py-1.5 text-xs font-bold">
                  Xem kho video →
                </Link>
              )}
            </div>
          )}
        </div>
      </section>

      {/* =============================================================
           PHẦN 4: #section-match (MATCH CẶP ĐÔI & BỐC QUẺ HẸN HÒ)
           ============================================================= */}
      <section id="section-match" className="scroll-section pt-4">
        <div className="bg-[#FFFDF9] border-2 border-[#CBB292] rounded-2xl p-5 sm:p-7 relative shadow-md">
          <div className="washi-tape washi-cream-top" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-dashed border-[#D8CBB8] pb-4">
            <div>
              <span className="bg-brand-peach text-brand-terracottaDark text-xs font-bold px-3 py-1 rounded-full">
                💞 Trắc nghiệm nhanh đồng điệu
              </span>
              <h2 className="font-serif font-extrabold text-xl sm:text-2xl text-paper-ink mt-2">
                Match Cặp Đôi &amp; Bốc Quẻ Lịch Trình
              </h2>
              <p className="text-xs sm:text-sm text-paper-muted mt-0.5">
                Chọn nhanh 3 tiêu chí bên dưới để DateMate tìm ra kịch bản hẹn hò khớp 100% tâm trạng của cả hai!
              </p>
            </div>

            <button
              onClick={() => setIsWheelOpen(true)}
              className="ticket-btn bg-[#F6B092] text-paper-ink px-5 py-2.5 font-bold text-xs sm:text-sm shrink-0 self-start md:self-center"
            >
              🎲 Mở Vòng Quay Ngẫu Nhiên
            </button>
          </div>

          {/* Bộ chọn 3 bước Match cặp đôi */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 my-5">
            {/* Bước 1: Mood hôm nay */}
            <div className="bg-[#FAF4E8] border border-[#DED2C1] rounded-xl p-4">
              <p className="text-xs font-extrabold uppercase text-brand-terracotta tracking-wider">
                1. Mood của hai bạn hôm nay?
              </p>
              <div className="space-y-2 mt-3">
                <button
                  onClick={() => setMatchMood("sunset")}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs transition flex items-center justify-between ${
                    matchMood === "sunset"
                      ? "font-bold bg-brand-terracotta text-white shadow-xs"
                      : "font-semibold bg-white text-paper-ink border border-[#DED2C1] hover:border-brand-terracotta"
                  }`}
                >
                  <span>🌅 Chill ngắm hoàng hôn &amp; gió mát</span>
                  <span>{matchMood === "sunset" ? "✓" : ""}</span>
                </button>
                <button
                  onClick={() => setMatchMood("active")}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs transition flex items-center justify-between ${
                    matchMood === "active"
                      ? "font-bold bg-brand-terracotta text-white shadow-xs"
                      : "font-semibold bg-white text-paper-ink border border-[#DED2C1] hover:border-brand-terracotta"
                  }`}
                >
                  <span>🎳 Năng động, vui nhộn trong nhà</span>
                  <span>{matchMood === "active" ? "✓" : ""}</span>
                </button>
                <button
                  onClick={() => setMatchMood("art")}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs transition flex items-center justify-between ${
                    matchMood === "art"
                      ? "font-bold bg-brand-terracotta text-white shadow-xs"
                      : "font-semibold bg-white text-paper-ink border border-[#DED2C1] hover:border-brand-terracotta"
                  }`}
                >
                  <span>🎨 Nghệ thuật, bảo tàng &amp; thủ công</span>
                  <span>{matchMood === "art" ? "✓" : ""}</span>
                </button>
              </div>
            </div>

            {/* Bước 2: Ngân sách dự kiến */}
            <div className="bg-[#FAF4E8] border border-[#DED2C1] rounded-xl p-4">
              <p className="text-xs font-extrabold uppercase text-brand-olive tracking-wider">
                2. Ngân sách cho buổi hẹn?
              </p>
              <div className="space-y-2 mt-3">
                <button
                  onClick={() => setMatchBudget("saving")}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs transition flex items-center justify-between ${
                    matchBudget === "saving"
                      ? "font-bold bg-brand-olive text-white shadow-xs"
                      : "font-semibold bg-white text-paper-ink border border-[#DED2C1] hover:border-brand-olive"
                  }`}
                >
                  <span>🌱 Tiết kiệm hạt dẻ (&lt; 150k/đôi)</span>
                  <span>{matchBudget === "saving" ? "✓" : ""}</span>
                </button>
                <button
                  onClick={() => setMatchBudget("moderate")}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs transition flex items-center justify-between ${
                    matchBudget === "moderate"
                      ? "font-bold bg-brand-olive text-white shadow-xs"
                      : "font-semibold bg-white text-paper-ink border border-[#DED2C1] hover:border-brand-olive"
                  }`}
                >
                  <span>☕ Vừa vặn thoải mái (150k - 300k)</span>
                  <span>{matchBudget === "moderate" ? "✓" : ""}</span>
                </button>
                <button
                  onClick={() => setMatchBudget("luxury")}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs transition flex items-center justify-between ${
                    matchBudget === "luxury"
                      ? "font-bold bg-brand-olive text-white shadow-xs"
                      : "font-semibold bg-white text-paper-ink border border-[#DED2C1] hover:border-brand-olive"
                  }`}
                >
                  <span>🥂 Kỷ niệm đặc biệt (&gt; 350k)</span>
                  <span>{matchBudget === "luxury" ? "✓" : ""}</span>
                </button>
              </div>
            </div>

            {/* Bước 3: Kết quả Match tức thì (chấm điểm qua POST /recommend) */}
            <div
              id="matchResultCard"
              className={`bg-[#F9EFC7] border-2 border-dashed border-brand-terracotta rounded-xl p-4 flex flex-col justify-between transition ${
                isMatching ? "opacity-60" : ""
              }`}
            >
              {matchResult ? (
                <>
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="bg-brand-terracotta text-white text-[10px] font-extrabold px-2 py-0.5 rounded">
                        ĐỘ HỢP GU: {matchResult.score}%
                      </span>
                      <span className="text-lg">{matchResult.place.emoji || "💘"}</span>
                    </div>
                    <h3
                      id="matchResultTitle"
                      className="font-serif font-extrabold text-lg text-paper-ink mt-2 leading-tight"
                    >
                      {matchResult.place.displayName || matchResult.place.name}
                    </h3>
                    <p id="matchResultDesc" className="text-xs text-paper-muted mt-1 leading-relaxed line-clamp-3">
                      {matchResult.place.summary}
                    </p>
                    {matchResult.reasons.length > 0 && (
                      <ul className="mt-2 space-y-0.5 text-[11px] text-paper-ink">
                        {matchResult.reasons.slice(0, 3).map((reason) => (
                          <li key={reason}>✓ {reason}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="mt-3 pt-2.5 border-t border-[#DFC98B] flex items-center justify-between gap-2">
                    <span id="matchResultPrice" className="text-xs font-bold text-brand-terracottaDark">
                      💰 {matchResult.place.costText}
                    </span>
                    <button
                      onClick={() => setActiveDetailSlug(matchResult.place.slug)}
                      className="bg-paper-ink text-white text-xs font-bold px-3 py-1.5 rounded hover:bg-brand-terracotta transition shrink-0"
                    >
                      Xem cẩm nang →
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center text-center h-full gap-2 py-6">
                  <span className="text-2xl">💘</span>
                  <p className="text-xs font-semibold text-paper-muted">
                    {isMatching ? "Đang bốc quẻ cho hai bạn..." : "Chưa tìm được nơi hợp gu, thử đổi mood hoặc ngân sách nhé!"}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* =============================================================
           PHẦN 5: #section-memory (KHO KỶ NIỆM CẶP ĐÔI - BẢNG GỖ BẦN CORKBOARD)
           ============================================================= */}
      <section id="section-memory" className="scroll-section pt-4 pb-10">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-brand-terracotta uppercase tracking-wider">
              <span>📸 Nhật ký lưu giữ thanh xuân</span>
            </div>
            <h2 className="font-serif font-extrabold text-xl sm:text-2xl text-paper-ink mt-0.5">
              Kho Kỷ Niệm Của Hai Bạn{room ? ` (Phòng Đôi ${room.memberCount}/2)` : ""}
            </h2>
            <p className="text-xs sm:text-sm text-paper-muted">
              Bảng ghim những bức hình Polaroid và lời nhắn viết tay qua từng buổi hẹn tại Hà Nội
            </p>
          </div>

          <button
            onClick={() => setIsComposingNote(!isComposingNote)}
            className="paper-btn px-4 py-2 text-xs font-bold flex items-center gap-1.5 active:scale-95"
          >
            <span>{isComposingNote ? "✕ Thôi, để sau" : "✍️ + Dán thêm giấy nhớ kỷ niệm"}</span>
          </button>
        </div>

        {/* Bảng gỗ bần Corkboard ghim ảnh & giấy nhớ */}
        <div className="corkboard-surface p-5 sm:p-7 select-none">
          <div
            id="memoryBoardGrid"
            className="memory-grid grid grid-cols-1 md:grid-cols-3 gap-6 items-start"
          >
            {/* Tờ giấy nhớ đang viết */}
            {isComposingNote && (
              <form
                onSubmit={handleAddStickyNote}
                className={`${NOTE_COLOR_STYLES[noteColor].card} border-2 rounded-md p-5 shadow-lg relative select-text`}
              >
                <div className={`w-4 h-4 rounded-full ${NOTE_COLOR_STYLES[noteColor].pin} border-2 border-paper-ink shadow mx-auto -mt-7 mb-3`} />
                <textarea
                  autoFocus
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  maxLength={280}
                  rows={4}
                  placeholder="Viết lời nhắn cho người ấy..."
                  className="w-full bg-transparent font-hand text-lg text-paper-ink leading-snug resize-none focus:outline-none placeholder:text-paper-muted/70"
                />
                <div className={`mt-2 pt-2.5 border-t border-dashed ${NOTE_COLOR_STYLES[noteColor].divider} flex items-center justify-between gap-2`}>
                  <div className="flex items-center gap-1.5">
                    {NOTE_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setNoteColor(color)}
                        aria-label={`Màu giấy ${color}`}
                        className={`w-5 h-5 rounded-full border-2 ${NOTE_COLOR_STYLES[color].card} ${
                          noteColor === color ? "ring-2 ring-paper-ink" : ""
                        }`}
                      />
                    ))}
                  </div>
                  <button
                    type="submit"
                    disabled={!noteDraft.trim() || isSavingNote}
                    className="bg-paper-ink disabled:opacity-40 text-white text-xs font-bold px-3 py-1.5 rounded hover:bg-brand-terracotta transition"
                  >
                    {isSavingNote ? "Đang ghim..." : "📌 Ghim lên bảng"}
                  </button>
                </div>
              </form>
            )}

            {/* Giấy nhớ của phòng đôi */}
            {memoryBoard.notes.map((note, idx) => {
              const style = NOTE_COLOR_STYLES[note.color] ?? NOTE_COLOR_STYLES.peach;
              return (
                <div
                  key={note.id}
                  className={`${style.card} border-2 rounded-md p-5 shadow-lg transform ${
                    idx % 2 === 0 ? "-rotate-1" : "rotate-1"
                  } hover:rotate-0 transition relative`}
                >
                  <div className={`w-4 h-4 rounded-full ${style.pin} border-2 border-paper-ink shadow mx-auto -mt-7 mb-3`} />
                  <span className={`text-[11px] font-extrabold ${style.label} uppercase tracking-wider block text-center`}>
                    💌 {note.isMine ? "Bạn dán" : `${note.authorName} dán`}
                  </span>
                  <p className="font-hand text-lg text-center text-paper-ink mt-2 leading-snug break-words">
                    &quot;{note.content}&quot;
                  </p>
                  <div className={`mt-4 pt-2.5 border-t border-dashed ${style.divider} flex items-center justify-between text-xs`}>
                    <span className="font-semibold text-paper-muted">{formatNoteTime(note.createdAt)}</span>
                    <button
                      onClick={() => handleRemoveStickyNote(note.id)}
                      className={`${style.label} font-bold hover:underline`}
                    >
                      Gỡ giấy
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Giấy nhớ Vàng Đếm Ngược Ngày Kỷ Niệm */}
            <div className="bg-[#F9EFC7] border-2 border-[#DFC98B] rounded-md p-5 shadow-lg transform rotate-1 hover:rotate-0 transition relative">
              <div className="w-4 h-4 rounded-full bg-brand-terracotta border-2 border-paper-ink shadow mx-auto -mt-7 mb-3" />
              <span className="text-[11px] font-extrabold text-brand-terracotta uppercase tracking-wider block text-center">
                ⏳ Đếm ngược ngày đặc biệt
              </span>
              {anniversary && daysLeft !== null ? (
                <>
                  <h3 className="font-serif font-extrabold text-2xl text-paper-ink text-center mt-1">
                    {daysLeft === 0 ? "Hôm nay là ngày đó!" : `Còn ${daysLeft} Ngày Nữa!`}
                  </h3>
                  <p className="font-hand text-lg text-center text-paper-ink mt-2 leading-snug">
                    {anniversary.title}
                    {anniversary.date ? ` • ${formatDayMonthYear(anniversary.date)}` : ""}
                  </p>
                </>
              ) : (
                <>
                  <h3 className="font-serif font-extrabold text-xl text-paper-ink text-center mt-1">
                    Chưa đặt ngày kỷ niệm
                  </h3>
                  <p className="font-hand text-lg text-center text-paper-ink mt-2 leading-snug">
                    {room
                      ? "Đặt ngày yêu nhau trong Phòng đôi để DateMate đếm ngược giúp hai bạn nhé!"
                      : "Tạo Phòng đôi và mời người ấy vào để cùng lưu giữ kỷ niệm nhé!"}
                  </p>
                </>
              )}
              <div className="mt-4 pt-3 border-t border-dashed border-[#D5BE7E] flex items-center justify-end text-xs">
                <button
                  onClick={() => setIsRoomModalOpen(true)}
                  className="font-bold text-brand-terracotta hover:underline"
                >
                  Mở QR Phòng đôi →
                </button>
              </div>
            </div>

            {/* Ảnh Polaroid kỷ niệm sau các buổi hẹn */}
            {memoryBoard.memories.map((memory, idx) => (
              <div
                key={memory.id}
                className={`bg-[#FFFDF9] border border-[#CDBB9E] rounded p-3 pb-4 shadow-lg transform ${
                  idx % 2 === 0 ? "-rotate-1" : "-rotate-2"
                } hover:rotate-0 transition relative`}
              >
                <div className={`washi-tape ${idx % 2 === 0 ? "washi-gingham-peach" : "washi-olive"}`} />
                <div className="aspect-[4/3] rounded-xs overflow-hidden bg-[#E8DCCB] relative flex items-center justify-center">
                  {memory.coverUrl ? (
                    <Image
                      src={memory.coverUrl}
                      alt={memory.coverCaption || memory.title}
                      fill
                      unoptimized
                      sizes="320px"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-4xl">📷</span>
                  )}
                </div>
                <div className="mt-3 text-center">
                  <span className="text-[10px] font-bold text-paper-muted uppercase">
                    {formatDayMonthYear(memory.visitedAt)} • {"⭐".repeat(memory.rating)}
                  </span>
                  <p className="font-hand text-lg font-bold text-paper-ink mt-0.5">
                    {memory.journal ? `"${memory.journal}"` : memory.title}
                  </p>
                </div>
              </div>
            ))}

            {!isLoadingMemories && memoryBoard.memories.length === 0 && (
              <div className="bg-[#FFFDF9]/90 border-2 border-dashed border-[#CDBB9E] rounded p-5 text-center flex flex-col items-center justify-center gap-2 min-h-[220px]">
                <span className="text-3xl">📷</span>
                <p className="font-serif font-bold text-base text-paper-ink">Chưa có tấm Polaroid nào</p>
                <p className="text-xs text-paper-muted leading-relaxed">
                  Sau mỗi buổi hẹn, lưu lại ảnh và vài dòng nhật ký để bảng kỷ niệm đầy dần lên nhé!
                </p>
                <Link href="/memories" className="mt-1 paper-btn px-4 py-1.5 text-xs font-bold">
                  Mở nhật ký kỷ niệm →
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Video Player Modal */}
      <VideoPlayerModal video={activeVideo} onClose={() => setActiveVideo(null)} />

      {/* Timeline Modal Chi Tiết */}
      {isTimelineOpen && upcomingSummary && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#FAF4E8] border-2 border-[#CBB292] rounded-xl max-w-lg w-full p-6 relative shadow-2xl select-none">
            <button
              onClick={() => setIsTimelineOpen(false)}
              className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-[#E5D1B8] hover:bg-brand-terracotta hover:text-white text-paper-ink font-bold transition flex items-center justify-center shadow-xs"
            >
              ✕
            </button>
            <span className="bg-[#D5E2CC] text-[#2F4225] text-xs font-bold px-3 py-1 rounded-full">
              🗺️ Timeline Chi Tiết • {upcomingSummary.formattedDate}
            </span>
            <h3 className="font-serif font-extrabold text-xl text-paper-ink mt-2">
              {upcomingSummary.title}
            </h3>
            <div className="mt-4 space-y-3 border-l-2 border-dashed border-brand-terracotta pl-4 ml-2 max-h-[50vh] overflow-y-auto">
              {!upcomingPlan ? (
                <p className="text-xs text-paper-muted">Đang tải lịch trình...</p>
              ) : upcomingPlan.stops.length === 0 ? (
                <p className="text-xs text-paper-muted">
                  Buổi hẹn chưa có điểm dừng nào. Bấm &quot;+ Vào lịch&quot; trên thẻ địa điểm để thêm nhé.
                </p>
              ) : (
                upcomingPlan.stops.map((stop) => {
                  const startTime = stop.plannedTime || upcomingPlan.startTime;
                  return (
                    <div key={stop.id}>
                      <span className="text-xs font-bold text-brand-terracotta">
                        {startTime} - {addMinutes(startTime, stop.durationMin)}
                      </span>
                      <h4 className="font-bold text-sm text-paper-ink">📍 {stopName(stop)}</h4>
                      {stop.note && <p className="text-xs text-paper-muted">{stop.note}</p>}
                    </div>
                  );
                })
              )}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <a
                href={upcomingSummary.icsUrl}
                download
                className="bg-brand-terracotta hover:bg-brand-terracottaDark text-white px-4 py-2 rounded text-xs font-bold shadow transition active:scale-95"
              >
                📅 Tải lịch (.ics)
              </a>
              <button
                onClick={() => setIsTimelineOpen(false)}
                className="paper-btn px-4 py-2 text-xs font-bold"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
