"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import {
  Heart,
  X,
  RotateCcw,
  Sparkles,
  MapPin,
  CalendarPlus,
  RefreshCw,
  SlidersHorizontal,
  Check,
} from "lucide-react";
import { HOBBY_TAGS, type HobbyTagId } from "@/lib/catalog/hobby-filter";
import type { HanoiPlace } from "@/lib/types/catalog";
import type { MatchDto } from "@/server/services/user/match.service";

interface SwipeDeckProps {
  initialDeck?: HanoiPlace[];
  initialMatches?: MatchDto[];
  roomType?: "couple" | "group";
  onAddToPlan?: (placeId: string, placeName: string) => void;
}

interface EtagLogEntry {
  id: string;
  text: string;
  time: string;
  type: "304" | "200" | "swipe";
}

export function SwipeDeck({
  initialDeck = [],
  initialMatches = [],
  roomType: initialRoomType = "couple",
  onAddToPlan,
}: SwipeDeckProps) {
  // State phòng & filter
  const [roomMode, setRoomMode] = useState<"couple" | "group">(initialRoomType);
  const [selectedHobby, setSelectedHobby] = useState<HobbyTagId | "all">("all");

  // State bộ bài quẹt
  const [deck, setDeck] = useState<HanoiPlace[]>(initialDeck);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipeHistory, setSwipeHistory] = useState<Array<{ place: HanoiPlace; choice: "like" | "nope" }>>([]);
  const [isLoadingDeck, setIsLoadingDeck] = useState(false);

  // State Match & Polling ETag
  const [matches, setMatches] = useState<MatchDto[]>(initialMatches);
  const [lastEtag, setLastEtag] = useState<string>("");
  const [pollingStatus, setPollingStatus] = useState<"idle" | "304" | "200">("304");
  const [etagLogs, setEtagLogs] = useState<EtagLogEntry[]>([
    {
      id: "init",
      text: '[GET /api/v1/user/matches] If-None-Match: "initial" ➔ 304 (0B payload)',
      time: new Date().toLocaleTimeString("vi-VN"),
      type: "304",
    },
  ]);

  // State Confetti & Match Modal
  const [showCelebration, setShowCelebration] = useState(false);
  const [latestMatchPlace, setLatestMatchPlace] = useState<HanoiPlace | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Thêm log vào console giả lập ETag
  const addEtagLog = useCallback((text: string, type: "304" | "200" | "swipe") => {
    setEtagLogs((prev) => [
      {
        id: Math.random().toString(36).slice(2, 9),
        text,
        time: new Date().toLocaleTimeString("vi-VN"),
        type,
      },
      ...prev.slice(0, 24), // Giữ tối đa 25 logs
    ]);
  }, []);

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

  // Đổi Hobby filter
  const handleSelectHobby = (hobbyId: HobbyTagId | "all") => {
    setSelectedHobby(hobbyId);
    fetchDeck(hobbyId);
  };

  // Quẹt thẻ: like hoặc nope
  const handleCardSwipe = async (choice: "like" | "nope") => {
    if (currentIndex >= deck.length) return;
    const place = deck[currentIndex];

    // Ghi vào lịch sử để hỗ trợ Undo
    setSwipeHistory((prev) => [{ place, choice }, ...prev]);
    setCurrentIndex((prev) => prev + 1);

    addEtagLog(
      `[POST /api/v1/user/swipes] choice=${choice} ("${place.name}") ➔ 200 OK`,
      "swipe"
    );

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

          addEtagLog(
            `🎉 NỔ MATCH: Cả hai cùng thích "${place.name}"! (Tự động lưu DB)`,
            "200"
          );
        }
      }
    } catch {
      // Fallback optimistic
    }
  };

  // Hoàn tác 1 lượt quẹt gần nhất (Undo)
  const handleUndoSwipe = () => {
    if (swipeHistory.length === 0 || currentIndex <= 0) return;
    const last = swipeHistory[0];
    setSwipeHistory((prev) => prev.slice(1));
    setCurrentIndex((prev) => prev - 1);
    addEtagLog(`[UNDO] Hoàn tác lượt quẹt: "${last.place.name}"`, "swipe");
  };

  // Short Polling 3s kiểm tra Match mới với header ETag
  useEffect(() => {
    let isMounted = true;
    const interval = setInterval(async () => {
      try {
        const headers: Record<string, string> = {};
        if (lastEtag) {
          headers["If-None-Match"] = lastEtag;
        }

        const res = await fetch("/api/v1/user/matches", { headers });

        if (!isMounted) return;

        if (res.status === 304) {
          setPollingStatus("304");
          addEtagLog(
            `[GET /api/v1/user/matches] If-None-Match: "${lastEtag.slice(0, 16)}..." ➔ 304 (0B payload)`,
            "304"
          );
        } else if (res.status === 200) {
          const newEtag = res.headers.get("ETag") || `W/"etag-${Date.now()}"`;
          setLastEtag(newEtag);
          setPollingStatus("200");

          const json = await res.json();
          const items: MatchDto[] = json.data?.items ?? [];

          // Tìm các match mới chưa xem
          const unseen = items.filter((m) => !m.isSeen);
          if (unseen.length > 0) {
            triggerConfetti();
            setLatestMatchPlace(unseen[0].place);
            setShowCelebration(true);
            addEtagLog(
              `[ETag] Phát hiện ${unseen.length} Match mới ("${unseen[0].place.name}") ➔ Bắn Confetti!`,
              "200"
            );

            // Đánh dấu đã xem
            for (const m of unseen) {
              fetch(`/api/v1/user/matches/${m.id}/seen`, { method: "POST" });
            }
          }

          setMatches(items);
        }
      } catch {
        // Polling silent retry
      }
    }, 3000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [lastEtag, addEtagLog, triggerConfetti]);

  // Nút giả lập đối phương vừa like trùng (phục vụ test & demo trực quan)
  const simulatePartnerLike = () => {
    if (deck.length === 0) return;
    const place = deck[Math.floor(Math.random() * deck.length)];
    triggerConfetti();
    setLatestMatchPlace(place);
    setShowCelebration(true);
    setPollingStatus("200");

    const simMatchId = `sim_${Date.now()}`;
    setMatches((prev) => [
      {
        id: simMatchId,
        place,
        matchedAt: new Date(),
        status: "open",
        isSeen: false,
      },
      ...prev,
    ]);

    addEtagLog(
      `[SIMULATE] Đối phương vừa thích "${place.name}" ➔ Nổ Match & Confetti!`,
      "200"
    );
  };

  const currentPlace = deck[currentIndex];
  const ruleText =
    roomMode === "couple"
      ? "👩‍❤️‍👨 Cần 2/2 thành viên thả tim"
      : "👯‍♂️ Chế độ Nhóm: Cần ≥ 50% thành viên thả tim";

  return (
    <section className="w-full max-w-6xl mx-auto py-8 px-4 sm:px-6">
      {/* Canvas Confetti nổi toàn màn hình */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-50"
      />

      {/* Header Phân Khu */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E6D3B8]/60 pb-5 mb-6">
        <div>
          <span className="text-xs font-extrabold uppercase tracking-wider text-[#C84B31]">
            💞 Phase 2 • Post-Commit Match Engine & ETag Polling
          </span>
          <h2 className="font-serif font-extrabold text-2xl sm:text-3xl text-[#362721] mt-1">
            Quẹt Thẻ Chọn Điểm Hẹn & Đồng Bộ Thời Gian Thực
          </h2>
        </div>

        {/* Chuyển chế độ phòng: Cặp đôi (2/2) vs Hội nhóm (>=50%) */}
        <div className="flex items-center gap-1.5 bg-[#FFFDF9] p-1.5 rounded-2xl border border-[#E6D3B8] shadow-sm">
          <button
            type="button"
            onClick={() => setRoomMode("couple")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              roomMode === "couple"
                ? "bg-[#C84B31] text-white shadow-sm"
                : "text-[#362721]/70 hover:bg-[#E6D3B8]/40"
            }`}
          >
            👩‍❤️‍👨 Cặp đôi (2/2 Like)
          </button>
          <button
            type="button"
            onClick={() => setRoomMode("group")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              roomMode === "group"
                ? "bg-[#C84B31] text-white shadow-sm"
                : "text-[#362721]/70 hover:bg-[#E6D3B8]/40"
            }`}
          >
            👯‍♂️ Hội nhóm (≥ 50%)
          </button>
        </div>
      </div>

      {/* Thanh 8 Hobby Filter Chips */}
      <div className="mb-6 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
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
            className={`px-3 py-1.5 rounded-full text-xs font-medium border shrink-0 flex items-center gap-1 transition ${
              selectedHobby === hobby.id
                ? "bg-[#C84B31] text-white border-[#C84B31] shadow-sm"
                : "bg-[#FFFDF9] text-[#362721] border-[#E6D3B8] hover:bg-[#E6D3B8]/40"
            }`}
          >
            <span>{hobby.emoji}</span>
            <span>{hobby.label}</span>
          </button>
        ))}
      </div>

      {/* Grid 2 Cột: Bàn Quẹt Polaroid (7/12) & Polling ETag + Danh Sách Matches (5/12) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Cột Trái (7/12): Bàn Quẹt Thẻ Polaroid */}
        <div className="lg:col-span-7 bg-[#EFE5D4]/70 rounded-3xl p-5 sm:p-7 border-2 border-[#D8CBB8] flex flex-col items-center relative overflow-hidden shadow-sm">
          {/* Washi tape trang trí góc trên */}
          <div className="absolute top-2 left-6 w-24 h-5 bg-[#C84B31]/30 -rotate-6 rounded-sm border border-white/40 pointer-events-none" />
          <div className="absolute top-2 right-6 w-24 h-5 bg-[#6E8361]/30 rotate-6 rounded-sm border border-white/40 pointer-events-none" />

          {isLoadingDeck ? (
            <div className="w-full max-w-md h-96 bg-[#FFFDF9] rounded-2xl flex flex-col items-center justify-center p-6 border-2 border-[#362721]/20">
              <RefreshCw className="w-8 h-8 text-[#C84B31] animate-spin mb-3" />
              <p className="text-sm font-medium text-[#362721]/70">Đang chuẩn bị bộ thẻ hẹn hò...</p>
            </div>
          ) : currentPlace ? (
            /* Thẻ Polaroid chính */
            <div className="w-full max-w-md bg-[#FFFDF9] border-2 border-[#362721] rounded-2xl p-4 shadow-xl transition-all duration-300">
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
                  <span>•</span>
                  <span>{currentPlace.costText || "Hạt dẻ"}</span>
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

                <p className="text-xs text-[#362721]/80 mt-1.5 line-clamp-2 leading-relaxed">
                  {currentPlace.summary || "Địa điểm hẹn hò lý tưởng tại Hà Nội."}
                </p>

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
          <div className="flex items-center justify-center gap-4 mt-5 w-full">
            <button
              type="button"
              disabled={!currentPlace}
              onClick={() => handleCardSwipe("nope")}
              className="bg-[#FFFDF9] hover:bg-red-50 border-2 border-[#362721] text-[#362721] font-extrabold px-5 py-2.5 rounded-full shadow flex items-center gap-1.5 text-xs sm:text-sm transition transform active:scale-95 disabled:opacity-40"
            >
              <X className="w-4 h-4 text-rose-600" />
              <span>Bỏ qua (Nope)</span>
            </button>

            <button
              type="button"
              disabled={swipeHistory.length === 0}
              onClick={handleUndoSwipe}
              title="Hoàn tác lượt quẹt vừa rồi"
              className="bg-[#FFFDF9] hover:bg-[#E6D3B8]/50 border-2 border-[#362721] text-[#362721] font-bold p-2.5 rounded-full shadow transition transform active:scale-95 disabled:opacity-30"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              type="button"
              disabled={!currentPlace}
              onClick={() => handleCardSwipe("like")}
              className="bg-[#C84B31] hover:bg-[#9E331E] border-2 border-[#362721] text-white font-extrabold px-6 py-2.5 rounded-full shadow-lg flex items-center gap-1.5 text-xs sm:text-sm transition transform active:scale-95 disabled:opacity-40"
            >
              <Heart className="w-4 h-4 fill-white" />
              <span>Thích mê (Like!)</span>
            </button>
          </div>
        </div>

        {/* Cột Phải (5/12): Console Polling ETag 3s & Danh Sách Matches */}
        <div className="lg:col-span-5 space-y-4">
          {/* Terminal Console mô phỏng ETag */}
          <div className="bg-[#231A16] text-[#F7F1E5] rounded-2xl p-4 font-mono text-xs space-y-2.5 border border-[#4A3931] shadow-md">
            <div className="flex items-center justify-between border-b border-[#4A3931] pb-2">
              <span className="text-[#F29B7E] font-bold flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Short Polling (3s ETag)
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  pollingStatus === "304"
                    ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                    : "bg-amber-500 text-stone-950 font-extrabold animate-pulse"
                }`}
              >
                {pollingStatus === "304" ? "304 Not Modified" : "200 OK (Match mới!)"}
              </span>
            </div>

            {/* Khung scroll log */}
            <div className="text-[11px] text-[#D7C4B0] space-y-1.5 max-h-28 overflow-y-auto scrollbar-thin pr-1">
              {etagLogs.map((log) => (
                <div
                  key={log.id}
                  className={`leading-tight ${
                    log.type === "200"
                      ? "text-amber-300 font-bold"
                      : log.type === "swipe"
                      ? "text-[#F29B7E]"
                      : "text-stone-400"
                  }`}
                >
                  <span className="text-stone-500 mr-1.5">[{log.time}]</span>
                  <span>{log.text}</span>
                </div>
              ))}
            </div>

            {/* Nút giả lập Like trùng */}
            <button
              type="button"
              onClick={simulatePartnerLike}
              className="w-full bg-[#C84B31] hover:bg-[#9E331E] text-white font-sans font-bold text-xs py-2 rounded-xl transition shadow flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>⚡ Giả lập Đối phương vừa Like trùng (Bắn Confetti!)</span>
            </button>
          </div>

          {/* Danh sách địa điểm đã Match trong phòng */}
          <div className="bg-[#FAF4E8] border border-[#D8CBB8] rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3 border-b border-[#D8CBB8]/60 pb-2">
              <h3 className="font-serif font-bold text-sm text-[#362721] flex items-center gap-1.5">
                <span>🎉 Tọa độ hai bạn đã Match</span>
                <span className="bg-[#C84B31] text-white text-[10px] font-bold px-2 py-0.2 rounded-full">
                  {matches.length}
                </span>
              </h3>
              <span className="text-[10px] font-bold text-[#6E8361] flex items-center gap-1">
                <Check className="w-3 h-3" /> Tự động lưu DB
              </span>
            </div>

            <div className="space-y-2.5 max-h-64 overflow-y-auto scrollbar-thin pr-1">
              {matches.length === 0 ? (
                <p className="text-xs text-[#362721]/60 text-center py-6 italic font-hand text-sm">
                  Chưa có điểm hẹn chung nào. Cả hai hãy cùng quẹt thẻ nhé!
                </p>
              ) : (
                matches.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-2.5 bg-[#FFFDF9] border border-[#E6D3B8] rounded-xl hover:border-[#C84B31]/60 transition"
                  >
                    <div className="min-w-0 pr-2">
                      <h4 className="font-semibold text-xs text-[#362721] truncate">
                        {m.place.name}
                      </h4>
                      <p className="text-[10px] text-[#362721]/70 mt-0.5">
                        📍 {m.place.area} • {m.place.categoryLabel || m.place.category}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => onAddToPlan?.(m.place.id, m.place.name)}
                      className="shrink-0 flex items-center gap-1 px-2 py-1 text-[11px] font-bold bg-[#C84B31] hover:bg-[#9E331E] text-white rounded-lg shadow-sm transition"
                      title="Thêm địa điểm này vào lịch trình"
                    >
                      <CalendarPlus className="w-3 h-3" />
                      <span>+ Lịch</span>
                    </button>
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
    </section>
  );
}
