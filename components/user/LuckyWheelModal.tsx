"use client";

import React, { useEffect, useState } from "react";
import { useApp } from "@/context/AppContext";

const FALLBACK_REEL = [
  { emoji: "☕", name: "Cà phê Ban Công Phố Cổ", area: "Hoàn Kiếm" },
  { emoji: "🌅", name: "Đường Thanh Niên Ngắm Hoàng Hôn", area: "Tây Hồ" },
  { emoji: "🏺", name: "Workshop Gốm Bát Tràng", area: "Gia Lâm" },
  { emoji: "📸", name: "Bảo Tàng Mỹ Thuật Việt Nam", area: "Ba Đình" },
  { emoji: "🥂", name: "Rooftop Lounge Tràng Tiền", area: "Hoàn Kiếm" },
];

export function LuckyWheelModal() {
  const {
    isWheelOpen,
    setIsWheelOpen,
    spinWheel,
    wheelResult,
    isSpinning,
    places,
    setActiveDetailSlug,
    quickAddPlaceToPlan,
  } = useApp();

  const [reelIndex, setReelIndex] = useState(0);
  const [isAnimatingReel, setIsAnimatingReel] = useState(false);

  const reelPool = places.length >= 4 ? places.slice(0, 12) : FALLBACK_REEL;

  useEffect(() => {
    if (!isWheelOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsWheelOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isWheelOpen, setIsWheelOpen]);

  useEffect(() => {
    if (!isSpinning && !isAnimatingReel) return;
    const timer = setInterval(() => {
      setReelIndex((prev) => (prev + 1) % reelPool.length);
    }, 95);
    return () => clearInterval(timer);
  }, [isSpinning, isAnimatingReel, reelPool.length]);

  if (!isWheelOpen) return null;

  const showRollingState = isSpinning || isAnimatingReel;
  const activePreview = reelPool[reelIndex % reelPool.length] || FALLBACK_REEL[0];

  const handleSpin = () => {
    setIsAnimatingReel(true);
    void spinWheel();
    setTimeout(() => {
      setIsAnimatingReel(false);
    }, 850);
  };

  const handleOpenDetail = () => {
    if (wheelResult) {
      setIsWheelOpen(false);
      setActiveDetailSlug(wheelResult.slug);
    }
  };

  return (
    <div
      onClick={() => setIsWheelOpen(false)}
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Rút quẻ hẹn hò"
        className="bg-[#FAF4E8] border-t-2 sm:border-2 border-paper-ink rounded-t-3xl sm:rounded-3xl sm:max-w-sm w-full p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] sm:pb-5 text-center space-y-4 select-none max-h-[90dvh] overflow-y-auto overscroll-contain relative shadow-2xl"
      >
        <div
          aria-hidden="true"
          className="w-10 h-1.5 rounded-full bg-[#CBB292] mx-auto -mt-1 mb-1 sm:hidden"
        />
        <div className="hidden sm:block washi-tape washi-terracotta -top-3.5 left-1/2 -translate-x-1/2" />

        <div className="space-y-1 pt-1">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-brand-peach text-brand-terracottaDark text-[11px] font-extrabold uppercase tracking-wider">
            ✨ Vòng Quay Định Mệnh
          </span>
          <h3 className="font-serif font-extrabold text-xl text-paper-ink">
            🎯 Rút Quẻ Hẹn Hò Hôm Nay
          </h3>
        </div>

        {/* Slot Reel / Tarot Fortune Window */}
        <div className="bg-[#FFFDF9] border-2 border-dashed border-brand-terracotta rounded-2xl p-5 min-h-[175px] flex flex-col items-center justify-center relative overflow-hidden shadow-inner">
          {showRollingState ? (
            <div className="space-y-2.5 animate-in fade-in duration-150">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-brand-peach/70 border border-brand-terracotta/40 flex items-center justify-center text-3xl shadow-xs animate-bounce">
                {activePreview.emoji || "🎲"}
              </div>
              <p className="font-serif font-extrabold text-base text-brand-terracotta line-clamp-1 px-2">
                {activePreview.name}
              </p>
              <p className="text-[11px] font-semibold text-paper-muted">
                📍 {activePreview.area} • Đang xáo quẻ...
              </p>
              <div className="flex justify-center gap-1.5 pt-1">
                <span className="w-2 h-2 rounded-full bg-brand-terracotta animate-ping" />
                <span className="w-2 h-2 rounded-full bg-brand-coral animate-pulse" />
                <span className="w-2 h-2 rounded-full bg-brand-olive animate-bounce" />
              </div>
            </div>
          ) : wheelResult ? (
            <div className="space-y-2 animate-in zoom-in-95 duration-200 w-full">
              <span className="inline-block px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-extrabold uppercase tracking-wide">
                🎉 Quẻ Hẹn Hò Chân Ái!
              </span>
              <h4 className="font-serif font-extrabold text-lg text-brand-terracotta leading-snug">
                {wheelResult.emoji} {wheelResult.name}
              </h4>
              <p className="text-xs text-paper-ink font-semibold">
                📍 {wheelResult.area}
                {wheelResult.costText ? ` • 💰 ${wheelResult.costText}` : ""}
              </p>
              <p className="text-xs text-paper-muted line-clamp-2 leading-relaxed">
                {wheelResult.summary}
              </p>
              <div className="flex justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleOpenDetail}
                  className="min-h-10 bg-brand-peach hover:bg-brand-coral text-paper-ink font-bold text-xs px-3.5 py-2 rounded-xl border border-brand-terracotta/40 transition cursor-pointer"
                >
                  📖 Xem cẩm nang
                </button>
                <button
                  type="button"
                  onClick={() => quickAddPlaceToPlan(wheelResult)}
                  className="min-h-10 bg-brand-terracotta hover:bg-brand-terracottaDark text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-2xs transition cursor-pointer"
                >
                  + Vào lịch
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2 py-2">
              <div className="text-4xl">🎴</div>
              <p className="font-serif font-bold text-base text-brand-terracotta">
                Bấm nút bên dưới để chọn ngẫu nhiên!
              </p>
              <p className="text-[11px] text-paper-muted max-w-[230px] mx-auto">
                DateMate sẽ rút 1 tọa độ bất ngờ không trùng với 5 lần quay gần nhất của hai bạn.
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSpin}
            disabled={showRollingState}
            className="min-h-11 flex-1 bg-brand-terracotta hover:bg-brand-terracottaDark text-white font-bold text-xs py-2.5 rounded-xl shadow-xs transition active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            🎲 {showRollingState ? "Đang quay..." : wheelResult ? "Quay quẻ khác" : "Quay ngay!"}
          </button>
          <button
            type="button"
            onClick={() => setIsWheelOpen(false)}
            className="min-h-11 bg-[#E5D1B8] hover:bg-[#D8C0A4] text-paper-ink font-bold text-xs px-4 py-2.5 rounded-xl transition cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
