"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import {
  RotateCcw,
  Sparkles,
  MapPin,
  CalendarPlus,
  RefreshCw,
  SlidersHorizontal,
  Check,
} from "lucide-react";
import { HOBBY_TAGS, type HobbyTagId } from "@/lib/catalog/hobby-filter";
import { calculateNextPollInterval } from "@/lib/polling-backoff";
import type { HanoiPlace } from "@/lib/types/catalog";
import type { MatchDto } from "@/server/services/user/match.service";

interface SwipeDeckProps {
  initialDeck?: HanoiPlace[];
  initialMatches?: MatchDto[];
  roomType?: "couple" | "group";
  /** Trả `true` khi đã thêm vào kế hoạch thành công. */
  onAddToPlan?: (placeId: string, placeName: string) => void | Promise<boolean>;
  onOpenDetail?: (slug: string) => void;
  /** Phòng đã đủ người chưa; chưa ghép đôi thì like chỉ được lưu, chưa thể Match */
  isPaired?: boolean;
  onError?: (message: string) => void;
}

export function SwipeDeck({
  initialDeck = [],
  initialMatches = [],
  roomType: roomMode = "couple",
  onAddToPlan,
  onOpenDetail,
  isPaired = false,
  onError,
}: SwipeDeckProps) {
  // State filter
  const [selectedHobby, setSelectedHobby] = useState<HobbyTagId | "all">("all");

  // State bộ bài quẹt
  const [deck, setDeck] = useState<HanoiPlace[]>(initialDeck);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipeHistory, setSwipeHistory] = useState<Array<{ place: HanoiPlace; choice: "like" | "nope" }>>([]);
  const [isLoadingDeck, setIsLoadingDeck] = useState(false);
  const [isUndoing, setIsUndoing] = useState(false);

  // State Match & Polling ETag
  const [matches, setMatches] = useState<MatchDto[]>(initialMatches);
  const [lastEtag, setLastEtag] = useState<string>("");
  const [pollingStatus, setPollingStatus] = useState<"idle" | "304" | "200">("304");
  const lastEtagRef = useRef<string>(lastEtag);
  const idlePollCountRef = useRef(0);
  const hasRecentActivityRef = useRef(false);

  useEffect(() => {
    lastEtagRef.current = lastEtag;
  }, [lastEtag]);

  // State Confetti & Match Modal
  const [showCelebration, setShowCelebration] = useState(false);
  const [latestMatchPlace, setLatestMatchPlace] = useState<HanoiPlace | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Hiệu ứng Canvas Confetti nhẹ nhàng không cần thư viện ngoài
  const triggerConfetti = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ["#C84B31", "#F29B7E", "#6E8361", "#F7D070", "#3E5C76", "#E6D3B8"];
    const particles = Array.from({ length: 90 }, () => ({
      x: canvas.width / 2,
      y: canvas.height / 2,
      vx: (Math.random() - 0.5) * 16,
      vy: (Math.random() - 0.5) * 16 - 4,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: 1,
      rotation: Math.random() * 360,
      vRot: (Math.random() - 0.5) * 10,
    }));

    let animationFrame: number;
    const startTime = Date.now();

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const elapsed = Date.now() - startTime;

      let activeCount = 0;
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.25; // Trọng lực
        p.rotation += p.vRot;
        p.alpha = Math.max(0, 1 - elapsed / 2800);

        if (p.alpha > 0) {
          activeCount++;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.alpha;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
          ctx.restore();
        }
      }

      if (activeCount > 0 && elapsed < 3000) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };

    animate();
    return () => cancelAnimationFrame(animationFrame);
  }, []);

  // Tải lại bộ thẻ khi đổi hobby
  const fetchDeck = useCallback(async (hobby?: string) => {
    setIsLoadingDeck(true);
    try {
      const url = new URL("/api/v1/user/swipes/deck", window.location.origin);
      url.searchParams.set("limit", "30");
      if (hobby && hobby !== "all") {
        url.searchParams.set("hobby", hobby);
      }
      const res = await fetch(url.toString());
      if (res.ok) {
        const json = await res.json();
        setDeck(json.data?.items ?? []);
        setCurrentIndex(0);
      }
    } catch {
      // Offline fallback
    } finally {
      setIsLoadingDeck(false);
    }
  }, []);

  // Tải bộ thẻ một lần khi mount nếu chưa có initialDeck
  const initialDeckLength = useRef(initialDeck.length);
  useEffect(() => {
    if (initialDeckLength.current === 0) fetchDeck();
  }, [fetchDeck]);

  // Đổi Hobby filter
  const handleSelectHobby = (hobbyId: HobbyTagId | "all") => {
    setSelectedHobby(hobbyId);
    hasRecentActivityRef.current = true;
    idlePollCountRef.current = 0;
    fetchDeck(hobbyId === "all" ? undefined : hobbyId);
  };

  // Quẹt thẻ: like hoặc nope
  const handleCardSwipe = async (choice: "like" | "nope") => {
    if (currentIndex >= deck.length) return;
    const place = deck[currentIndex];

    hasRecentActivityRef.current = true;
    idlePollCountRef.current = 0;

    // Ghi vào lịch sử để hỗ trợ Undo
    setSwipeHistory((prev) => [{ place, choice }, ...prev]);
    setCurrentIndex((prev) => prev + 1);

    try {
      const res = await fetch("/api/v1/user/swipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placeId: place.id, choice }),
      });

      if (res.ok) {
        const json = await res.json();
        const data = json.data;

        // Nếu tạo thành công match mới
        if (data?.matched && data?.isNewMatch) {
          triggerConfetti();
          setLatestMatchPlace(place);
          setShowCelebration(true);

          setMatches((prev) => [
            {
              id: data.matchId,
              place,
              matchedAt: new Date(),
              status: "open",
              isSeen: false,
            },
            ...prev,
          ]);
        }
        return;
      }
      throw new Error(`swipe API ${res.status}`);
    } catch {
      // Chưa lưu được thì trả thẻ về để người dùng quẹt lại
      setSwipeHistory((prev) => prev.filter((entry) => entry.place.id !== place.id));
      setCurrentIndex((prev) => Math.max(0, prev - 1));
      onError?.("Chưa lưu được lượt quẹt, thử lại nhé.");
    }
  };

  // Hoàn tác 1 lượt quẹt gần nhất (Undo)
  // Xóa lượt quẹt trên server trước rồi mới lùi thẻ; Match mất ngưỡng like cũng bị gỡ theo
  const handleUndoSwipe = async () => {
    if (swipeHistory.length === 0 || currentIndex <= 0 || isUndoing) return;
    hasRecentActivityRef.current = true;
    idlePollCountRef.current = 0;
    const last = swipeHistory[0];
    setIsUndoing(true);
    try {
      const res = await fetch(`/api/v1/user/swipes/${encodeURIComponent(last.place.id)}`, { method: "DELETE" });
      const json = await res.json().catch(() => null);
      // 404: lượt quẹt chưa kịp lưu, server không có gì để xóa, vẫn lùi thẻ được
      if (!res.ok && res.status !== 404) {
        onError?.(json?.error?.message || "Chưa hoàn tác được, thử lại nhé.");
        return;
      }
      const removedMatchId: string | null = json?.data?.removedMatchId ?? null;
      if (removedMatchId) setMatches((prev) => prev.filter((m) => m.id !== removedMatchId));
      setSwipeHistory((prev) => prev.slice(1));
      setCurrentIndex((prev) => prev - 1);
    } catch {
      onError?.("Mất kết nối, chưa hoàn tác được.");
    } finally {
      setIsUndoing(false);
    }
  };

  // Smart Adaptive Polling kiểm tra Match mới (Page Visibility API + Adaptive Exponential Backoff)
  useEffect(() => {
    let isMounted = true;
    let timerId: NodeJS.Timeout | null = null;

    const executePoll = async () => {
      // Đóng băng polling khi tab trình duyệt chạy ngầm (tiết kiệm pin & CPU)
      if (typeof document !== "undefined" && document.hidden) {
        return;
      }

      try {
        const headers: Record<string, string> = {};
        if (lastEtagRef.current) {
          headers["If-None-Match"] = lastEtagRef.current;
        }

        const res = await fetch("/api/v1/user/matches", { headers });

        if (!isMounted) return;

        if (res.status === 304) {
          setPollingStatus("304");
          idlePollCountRef.current += 1;
          hasRecentActivityRef.current = false;
        } else if (res.status === 200) {
          const newEtag = res.headers.get("ETag") || `W/"etag-${Date.now()}"`;
          setLastEtag(newEtag);
          lastEtagRef.current = newEtag;
          setPollingStatus("200");

          const json = await res.json();
          const items: MatchDto[] = json.data?.items ?? [];

          // Tìm các match mới chưa xem
          const unseen = items.filter((m) => !m.isSeen);
          if (unseen.length > 0) {
            triggerConfetti();
            setLatestMatchPlace(unseen[0].place);
            setShowCelebration(true);
            hasRecentActivityRef.current = true;
            idlePollCountRef.current = 0;

            // Đánh dấu đã xem
            for (const m of unseen) {
              fetch(`/api/v1/user/matches/${m.id}/seen`, { method: "POST" });
            }
          } else {
            idlePollCountRef.current += 1;
            hasRecentActivityRef.current = false;
          }

          setMatches(items);
        }
      } catch {
        // Polling silent retry
        idlePollCountRef.current += 1;
      } finally {
        if (isMounted) {
          scheduleNextTick();
        }
      }
    };

    const scheduleNextTick = () => {
      if (timerId) clearTimeout(timerId);
      const nextDelay = calculateNextPollInterval(
        idlePollCountRef.current,
        hasRecentActivityRef.current
      );
      timerId = setTimeout(executePoll, nextDelay);
    };

    // Khởi động poll đợt đầu
    executePoll();

    // Lắng nghe khi tab ẩn/hiện để đóng băng hoặc hồi phục polling tức thì
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (timerId) {
          clearTimeout(timerId);
          timerId = null;
        }
      } else {
        // Vừa quay lại tab: reset idle count, poll ngay lập tức
        hasRecentActivityRef.current = true;
        idlePollCountRef.current = 0;
        executePoll();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isMounted = false;
      if (timerId) clearTimeout(timerId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [triggerConfetti]);

  const currentPlace = deck[currentIndex];
  const ruleText =
    roomMode === "couple"
      ? "👩‍❤️‍👨 Cần 2/2 thành viên thả tim"
      : "👯‍♂️ Chế độ Nhóm: Cần ≥ 50% thành viên thả tim";

  return (
    <div className="bg-[#FFFDF9] border-2 border-[#D8C7B0] rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
      {/* Canvas Confetti nổi toàn màn hình */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-50"
      />

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-dashed border-[#D8CBB8] pb-3">
        <div>
          <h3 className="font-serif font-extrabold text-lg text-paper-ink">💞 Quẹt Thẻ Tìm Điểm Hẹn Chung</h3>
          <p className="text-xs text-paper-muted">
            Khi cả hai bạn cùng thả tim một quán, pháo hoa sẽ nổ và quán được lưu vào danh sách Hợp Gu!
          </p>
        </div>
        {/* Luật Match theo loại phòng trên server */}
        <span className="px-3 py-1.5 rounded-xl bg-[#FAF4E8] border border-[#CBB292] text-xs font-bold text-paper-ink">
          {roomMode === "couple" ? "👩‍❤️‍👨 Đi đôi (2 người)" : "👯‍♂️ Đi nhóm bạn"}
        </span>
      </div>

      {!isPaired && (
        <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
          💌 Bạn đang quẹt một mình. Lượt thích vẫn được lưu, nhưng chỉ nổ Match khi người ấy vào phòng và cùng thả tim.
          Bấm nút phòng đôi trên thanh tiêu đề để lấy mã mời nhé!
        </div>
      )}

      {/* Thanh 8 Hobby Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        <span className="text-xs font-bold text-[#362721]/70 flex items-center gap-1 shrink-0 mr-1">
          <SlidersHorizontal className="w-3.5 h-3.5" /> Sở thích:
        </span>
        <button
          type="button"
          onClick={() => handleSelectHobby("all")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border shrink-0 transition ${
            selectedHobby === "all"
              ? "bg-[#362721] text-white border-[#362721]"
              : "bg-[#FFFDF9] text-[#362721] border-[#E6D3B8] hover:bg-[#E6D3B8]/40"
          }`}
        >
          🎲 Tất cả
        </button>
        {HOBBY_TAGS.map((hobby) => (
          <button
            key={hobby.id}
            type="button"
            onClick={() => handleSelectHobby(hobby.id)}
            className={`hobby-tag-chip shrink-0 ${selectedHobby === hobby.id ? "active" : ""}`}
          >
            <span>{hobby.emoji}</span>
            <span>{hobby.label}</span>
          </button>
        ))}
      </div>

      {/* Grid 2 Cột: Bàn Quẹt Polaroid (7/12) & Polling ETag + Danh Sách Matches (5/12) */}
      <div className="responsive-2col grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Cột trái (7/12): bàn quẹt thẻ */}
        <div className="lg:col-span-7 kraft-texture rounded-2xl p-4 sm:p-5 border border-[#CBB292] flex flex-col items-center">
          {isLoadingDeck ? (
            <div className="w-full max-w-md h-96 bg-[#FFFDF9] rounded-2xl flex flex-col items-center justify-center p-6 border-2 border-[#362721]/20">
              <RefreshCw className="w-8 h-8 text-[#C84B31] animate-spin mb-3" />
              <p className="text-sm font-medium text-[#362721]/70">Đang chuẩn bị bộ thẻ hẹn hò...</p>
            </div>
          ) : currentPlace ? (
            /* Thẻ Polaroid chính */
            <div className="w-full max-w-md bg-[#FFFDF9] border-2 border-[#CBB292] rounded-2xl p-3.5 shadow-md transition-all duration-300">
              {/* Khung ảnh Polaroid */}
              <div className="relative h-60 w-full rounded-xl overflow-hidden bg-stone-200">
                {currentPlace.coverUrl ? (
                  <Image
                    src={currentPlace.coverUrl}
                    alt={currentPlace.name}
                    fill
                    sizes="(max-width: 768px) 100vw, 448px"
                    className="object-cover"
                    priority
                  />
                ) : (
                  <div
                    className={`w-full h-full bg-gradient-to-br ${
                      currentPlace.coverGradient || "from-amber-400 to-rose-400"
                    } flex items-center justify-center text-4xl`}
                  >
                    {currentPlace.emoji || "✨"}
                  </div>
                )}

                {/* Badge Quận & Giá */}
                <span className="absolute top-3 left-3 bg-black/75 backdrop-blur-sm text-white text-[11px] font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow">
                  <MapPin className="w-3 h-3 text-[#F29B7E]" />
                  <span>{currentPlace.area}</span>
                  {currentPlace.costText && (
                    <>
                      <span>•</span>
                      <span>{currentPlace.costText}</span>
                    </>
                  )}
                </span>

                {/* Badge Quy tắc phòng */}
                <span className="absolute bottom-3 right-3 bg-[#C84B31] text-white text-[10px] font-extrabold px-2.5 py-1 rounded-md shadow">
                  {ruleText}
                </span>
              </div>

              {/* Thông tin địa điểm */}
              <div className="mt-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif font-bold text-xl text-[#362721]">
                    {currentPlace.name}
                  </h3>
                  <span className="text-xs bg-[#E6D3B8]/60 text-[#362721] px-2 py-0.5 rounded-full font-medium">
                    {currentPlace.categoryLabel || currentPlace.category}
                  </span>
                </div>

                {currentPlace.summary && (
                  <p className="text-xs text-[#362721]/80 mt-1.5 line-clamp-2 leading-relaxed">{currentPlace.summary}</p>
                )}

                {/* Khung giờ vàng ngắm cảnh */}
                {currentPlace.goldenAfternoon && (
                  <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-[#C84B31] font-semibold bg-[#FADCD2]/40 px-2 py-1 rounded-md">
                    <Sparkles className="w-3 h-3" />
                    <span>Giờ vàng săn ảnh: {currentPlace.goldenAfternoon}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Khi đã quẹt hết thẻ */
            <div className="w-full max-w-md h-96 bg-[#FFFDF9] rounded-2xl flex flex-col items-center justify-center p-6 border-2 border-dashed border-[#E6D3B8] text-center">
              <div className="w-14 h-14 rounded-full bg-[#E6D3B8]/40 flex items-center justify-center text-2xl mb-3">
                💌
              </div>
              <h4 className="font-serif font-bold text-lg text-[#362721]">
                Đã khám phá hết bộ thẻ này!
              </h4>
              <p className="text-xs text-[#362721]/70 mt-1 max-w-xs">
                Bạn đã vuốt qua tất cả địa điểm trong mục này. Hãy thử đổi sở thích khác hoặc tải lại danh sách nhé.
              </p>
              <button
                type="button"
                onClick={() => fetchDeck(selectedHobby)}
                className="mt-4 px-4 py-2 bg-[#C84B31] hover:bg-[#9E331E] text-white font-bold text-xs rounded-xl shadow transition"
              >
                🔄 Tải lại bộ thẻ
              </button>
            </div>
          )}

          {/* Các nút quẹt thẻ (Nope, Undo, Like) */}
          <div className="flex items-center justify-center gap-3 mt-4 w-full">
            <button
              type="button"
              disabled={!currentPlace}
              onClick={() => handleCardSwipe("nope")}
              className="bg-[#FFFDF9] hover:bg-stone-100 border border-[#CBB292] text-paper-ink font-bold px-5 py-2.5 rounded-full shadow-xs flex items-center gap-1.5 text-xs sm:text-sm transition transform active:scale-95 disabled:opacity-40"
            >
              <span>👈</span>
              <span>Đổi quán khác</span>
            </button>

            <button
              type="button"
              disabled={swipeHistory.length === 0 || isUndoing}
              onClick={handleUndoSwipe}
              title="Hoàn tác lượt quẹt vừa rồi"
              className="bg-[#FFFDF9] hover:bg-[#E6D3B8]/50 border border-[#CBB292] text-paper-ink font-bold p-2.5 rounded-full shadow-xs transition transform active:scale-95 disabled:opacity-30"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              type="button"
              disabled={!currentPlace}
              onClick={() => handleCardSwipe("like")}
              className="bg-brand-terracotta hover:bg-brand-terracottaDark text-white font-extrabold px-6 py-2.5 rounded-full shadow-md flex items-center gap-1.5 text-xs sm:text-sm transition transform active:scale-95 disabled:opacity-40"
            >
              <span>❤️</span>
              <span>Thích quán này!</span>
            </button>
          </div>
        </div>

        {/* Cột Phải (5/12): Console Polling ETag 3s & Danh Sách Matches */}
        <div className="lg:col-span-5 space-y-4">
          {/* Danh sách địa điểm đã Match trong phòng */}
          <div className="bg-[#FAF4E8] border border-[#D8CBB8] rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#D8CBB8]/60 pb-3">
              <div>
                <h3 className="font-serif font-extrabold text-base text-[#362721] flex items-center gap-2">
                  <span>🎉 Quán hai bạn cùng thích</span>
                  <span className="bg-[#C84B31] text-white text-xs font-bold px-2.5 py-0.5 rounded-full">
                    {matches.length}
                  </span>
                </h3>
                <p className="text-[11px] text-[#362721]/70 mt-0.5">
                  Tự động đồng bộ ngay khi cả hai cùng thả tim
                </p>
              </div>
            </div>

            <div className="space-y-2.5 max-h-[460px] overflow-y-auto scrollbar-thin pr-1">
              {matches.length === 0 ? (
                <div className="text-center py-10 space-y-2">
                  <span className="text-3xl block">💌</span>
                  <p className="text-xs text-[#362721]/70 italic font-hand text-base">
                    Chưa có điểm hẹn chung nào.<br />Cả hai hãy cùng quẹt thẻ để tìm tọa độ trùng gu nhé!
                  </p>
                </div>
              ) : (
                matches.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-3 bg-[#FFFDF9] border border-[#E6D3B8] rounded-xl hover:border-[#C84B31]/60 transition shadow-2xs"
                  >
                    <div
                      onClick={() => onOpenDetail?.(m.place.slug)}
                      className="min-w-0 pr-2 cursor-pointer group"
                    >
                      <h4 className="font-bold text-xs sm:text-sm text-[#362721] truncate group-hover:text-[#C84B31] transition">
                        {m.place.name}
                      </h4>
                      <p className="text-[10px] sm:text-[11px] text-[#362721]/70 mt-0.5 flex items-center gap-1">
                        <span>📍 {m.place.area}</span>
                        <span>•</span>
                        <span>{m.place.categoryLabel || m.place.category}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {onOpenDetail && (
                        <button
                          type="button"
                          onClick={() => onOpenDetail(m.place.slug)}
                          className="px-2.5 py-1 text-[11px] font-bold text-[#C84B31] bg-rose-50 hover:bg-rose-100 rounded-lg border border-[#C84B31]/30 transition"
                        >
                          Xem
                        </button>
                      )}
                      {m.status === "planned" ? (
                        <span className="flex items-center gap-1 px-3 py-1 text-[11px] font-bold text-[#6E8361] bg-emerald-50 border border-emerald-200 rounded-lg">
                          <Check className="w-3 h-3" />
                          <span>Đã lên lịch</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={async () => {
                            const added = await onAddToPlan?.(m.place.id, m.place.name);
                            // Thêm thành công thì server đã chuyển Match sang planned; cập nhật ngay, polling đồng bộ lại sau
                            if (added === true) {
                              setMatches((prev) => prev.map((x) => (x.id === m.id ? { ...x, status: "planned" } : x)));
                            }
                          }}
                          className="flex items-center gap-1 px-3 py-1 text-[11px] font-bold bg-[#C84B31] hover:bg-[#9E331E] text-white rounded-lg shadow-xs transition"
                          title="Thêm địa điểm này vào lịch trình"
                        >
                          <CalendarPlus className="w-3 h-3" />
                          <span>+ Lịch</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal Chúc Mừng Khi Nổ Match (Celebration Modal) */}
      {showCelebration && latestMatchPlace && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#FFFDF9] border-2 border-[#362721] rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center relative overflow-hidden">
            {/* Washi tape trang trí */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-28 h-6 bg-[#C84B31]/40 rotate-1 rounded-sm border border-white/50" />

            <div className="w-16 h-16 rounded-full bg-rose-100 border-2 border-[#C84B31] flex items-center justify-center text-3xl mx-auto mb-4 mt-2 animate-bounce">
              ❤️
            </div>

            <span className="text-xs font-bold uppercase tracking-wider text-[#C84B31]">
              {roomMode === "couple" ? "✨ MATCH 2/2 HOÀN HẢO!" : "🎉 MATCH NHÓM ĐA SỐ!"}
            </span>

            <h3 className="font-serif font-extrabold text-2xl text-[#362721] mt-1">
              Đã Tìm Thấy Điểm Hẹn Chung!
            </h3>

            <div className="my-4 p-3 bg-[#FAF4E8] border border-[#E6D3B8] rounded-xl text-left">
              <h4 className="font-bold text-sm text-[#362721]">
                {latestMatchPlace.name}
              </h4>
              <p className="text-xs text-[#362721]/70 mt-0.5">
                📍 {latestMatchPlace.area} • {latestMatchPlace.costText}
              </p>
            </div>

            <p className="text-xs text-[#362721]/80 italic font-hand text-base mb-5">
              Cả hai đều cùng thích nơi này. Lên lịch trình ngay để không bỏ lỡ nhé!
            </p>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowCelebration(false);
                  onAddToPlan?.(latestMatchPlace.id, latestMatchPlace.name);
                }}
                className="flex-1 py-2.5 px-4 bg-[#C84B31] hover:bg-[#9E331E] text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-1.5"
              >
                <CalendarPlus className="w-4 h-4" />
                <span>Thêm vào lịch trình</span>
              </button>
              <button
                type="button"
                onClick={() => setShowCelebration(false)}
                className="py-2.5 px-4 bg-[#E6D3B8]/50 hover:bg-[#E6D3B8] text-[#362721] font-bold text-xs rounded-xl transition"
              >
                Tiếp tục quẹt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
