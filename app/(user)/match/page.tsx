"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useApp } from "@/context/AppContext";
import { Flame, X, Heart, BookOpen, Calendar, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export default function MatchPage() {
  const {
    places,
    matchedSlugs,
    recordMatchVote,
    setActiveDetailSlug,
    addStopToPlan,
  } = useApp();

  const [swipeIndex, setSwipeIndex] = useState(0);

  const currentPlace = places[swipeIndex % places.length];
  const matchedPlaces = places.filter((p) => matchedSlugs.includes(p.slug));

  const handleVote = (choice: "like" | "nope") => {
    if (!currentPlace) return;
    recordMatchVote(currentPlace.slug, choice);
    setSwipeIndex((prev) => prev + 1);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Interactive Swipe Card Deck (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-5 sm:p-6 border border-peach-soft shadow-peach space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-peach-deep uppercase tracking-wider flex items-center gap-1">
                <Flame className="w-3.5 h-3.5" />
                <span>F07 • Ẩn lựa chọn tới khi trùng khớp</span>
              </span>
              <h3 className="font-display font-extrabold text-xl text-brown mt-0.5">
                Quẹt thẻ chọn nơi hẹn cùng Linh
              </h3>
            </div>
            <span className="text-xs font-mono px-3 py-1 rounded-full bg-peach-soft/80 text-brown font-bold">
              Thẻ {(swipeIndex % places.length) + 1}/{places.length}
            </span>
          </div>

          {/* Active Swipe Card */}
          {currentPlace && (
            <div className="rounded-3xl overflow-hidden border border-peach-soft bg-cream shadow-sm transition-all duration-300">
              <div
                className={cn(
                  "h-56 sm:h-64 p-5 flex flex-col justify-between text-white relative overflow-hidden",
                  currentPlace.coverGradient || "from-[#FF9E8D] to-[#C93F52]"
                )}
              >
                {currentPlace.coverUrl && (
                  <Image
                    src={currentPlace.coverUrl}
                    alt={currentPlace.name}
                    fill
                    priority
                    sizes="(max-width: 1024px) 100vw, 600px"
                    className="object-cover"
                  />
                )}
                <div
                  className={cn(
                    "absolute inset-0 pointer-events-none",
                    currentPlace.coverUrl
                      ? "bg-gradient-to-t from-black/85 via-black/40 to-black/30"
                      : "bg-black/10 mix-blend-overlay"
                  )}
                />

                <div className="flex items-center justify-between z-10">
                  <span className="px-3 py-1 rounded-full bg-black/40 backdrop-blur-sm text-xs font-bold">
                    📍 {currentPlace.area}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-sage text-white text-xs font-bold">
                    {currentPlace.bestTimeText}
                  </span>
                </div>

                <div className="flex items-end justify-between z-10">
                  <div>
                    <h4 className="font-display font-extrabold text-2xl sm:text-3xl drop-shadow">
                      {currentPlace.name}
                    </h4>
                    <p className="text-xs text-white/90 font-medium mt-0.5">
                      {currentPlace.costText}
                    </p>
                  </div>
                  <span className="text-5xl drop-shadow-md">{currentPlace.emoji}</span>
                </div>
              </div>

              <div className="p-4 sm:p-5 space-y-3.5">
                <div className="flex flex-wrap gap-1.5">
                  {currentPlace.moodLabels?.map((m, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-0.5 rounded-full bg-peach-soft text-brown text-xs font-bold"
                    >
                      #{m}
                    </span>
                  ))}
                  {currentPlace.indoor && (
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold">
                      ☔ Trong nhà
                    </span>
                  )}
                </div>

                <p className="text-xs sm:text-sm text-brown leading-relaxed">
                  {currentPlace.summary}
                </p>

                <div className="p-3 rounded-2xl bg-white border border-peach-soft text-xs text-brown-muted flex items-center justify-between">
                  <span>
                    👗 <strong>Phối đồ:</strong> {currentPlace.outfit?.tonSurTon}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Accessible Control Buttons */}
          <div className="flex items-center justify-center gap-3 pt-1">
            <button
              onClick={() => handleVote("nope")}
              className="flex-1 py-3 px-4 rounded-2xl bg-zinc-100 hover:bg-zinc-200 text-brown font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition active:scale-95"
            >
              <X className="w-4 h-4 text-zinc-600" />
              <span>Bỏ qua (Nope)</span>
            </button>

            <button
              onClick={() => setActiveDetailSlug(currentPlace.slug)}
              className="py-3 px-4 rounded-2xl bg-peach-soft hover:bg-peach text-brown font-bold text-xs sm:text-sm transition flex items-center gap-1.5"
            >
              <BookOpen className="w-4 h-4 text-peach-deep" />
              <span className="hidden sm:inline">Cẩm nang</span>
            </button>

            <button
              onClick={() => handleVote("like")}
              className="flex-1 py-3 px-4 rounded-2xl bg-peach-deep hover:bg-peach-hover text-white font-bold text-xs sm:text-sm shadow-peach flex items-center justify-center gap-2 transition active:scale-95"
            >
              <Heart className="w-4 h-4 fill-current" />
              <span>Thích (Like)</span>
            </button>
          </div>
        </div>

        {/* Right Column: Matched List between Dũng & Linh (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-5 sm:p-6 border border-peach-soft shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-display font-extrabold text-base sm:text-lg text-brown flex items-center gap-2">
              <span>💕 Đã Tâm Đầu Ý Hợp</span>
              <span className="px-2 py-0.5 rounded-full bg-peach-soft text-peach-deep text-xs font-extrabold">
                {matchedPlaces.length}
              </span>
            </h4>
            <span className="text-[10px] font-mono text-sage-dark bg-sage-light px-2 py-0.5 rounded-full">
              Realtime Sync
            </span>
          </div>

          <p className="text-xs text-brown-muted leading-relaxed">
            Những địa điểm cả Dũng và Linh đều quẹt phải. Bấm 1 chạm để lên kế hoạch đi chơi ngay!
          </p>

          <div className="space-y-3 pt-1">
            {matchedPlaces.length > 0 ? (
              matchedPlaces.map((m) => (
                <div
                  key={m.id}
                  className="p-3.5 rounded-2xl bg-cream border border-peach-soft flex items-center justify-between gap-3 shadow-xs hover:border-peach transition"
                >
                  <div
                    onClick={() => setActiveDetailSlug(m.slug)}
                    className="flex items-center gap-3 min-w-0 cursor-pointer flex-1"
                  >
                    <span className="text-2xl shrink-0">{m.emoji}</span>
                    <div className="truncate">
                      <div className="font-bold text-xs sm:text-sm text-brown truncate">
                        {m.name}
                      </div>
                      <div className="text-[11px] text-peach-deep font-semibold truncate">
                        {m.bestTimeText}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => addStopToPlan(m)}
                    className="px-3 py-1.5 rounded-xl bg-peach-deep hover:bg-peach-hover text-white text-xs font-bold shrink-0 transition flex items-center gap-1 shadow-sm"
                  >
                    <Calendar className="w-3 h-3" />
                    <span>+ Lên lịch</span>
                  </button>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-brown-muted text-xs space-y-2">
                <div className="text-3xl">💌</div>
                <p>Chưa có địa điểm nào trùng khớp. Hãy tiếp tục quẹt thẻ nhé!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
