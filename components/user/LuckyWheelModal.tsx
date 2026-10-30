"use client";

import React, { useState } from "react";
import { useApp } from "@/context/AppContext";

export function LuckyWheelModal() {
  const {
    isWheelOpen,
    setIsWheelOpen,
    spinWheel,
    wheelResult,
    isSpinning,
    setActiveDetailSlug,
    quickAddPlaceToPlan,
  } = useApp();

  if (!isWheelOpen) return null;

  const handleSpin = () => {
    spinWheel();
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
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Rút quẻ hẹn hò"
        className="bg-[#FAF4E8] border-2 border-paper-ink rounded-2xl max-w-sm w-full p-5 text-center space-y-3 select-none max-h-[90dvh] overflow-y-auto overscroll-contain"
      >
        <h3 className="font-serif font-extrabold text-lg text-paper-ink">🎯 Rút Quẻ Hẹn Hò Hôm Nay</h3>

        <div className="bg-[#FFFDF9] border-2 border-dashed border-brand-terracotta rounded-xl p-4 min-h-[140px] flex flex-col items-center justify-center">
          {isSpinning ? (
            <p className="font-serif font-bold text-base text-brand-terracotta animate-pulse">🎲 Đang rút quẻ...</p>
          ) : wheelResult ? (
            <div className="space-y-1.5 animate-in zoom-in-95 duration-200">
              <h4 className="font-serif font-extrabold text-lg text-brand-terracotta">
                {wheelResult.emoji} {wheelResult.name}
              </h4>
              <p className="text-xs text-paper-ink font-semibold">
                📍 {wheelResult.area}
                {wheelResult.costText ? ` • 💰 ${wheelResult.costText}` : ""}
              </p>
              <p className="text-xs text-paper-muted line-clamp-2 leading-relaxed">{wheelResult.summary}</p>
              <div className="flex justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleOpenDetail}
                  className="bg-brand-peach hover:bg-brand-coral text-paper-ink font-bold text-xs px-3 py-1.5 rounded-lg border border-brand-terracotta/40"
                >
                  📖 Xem cẩm nang
                </button>
                <button
                  type="button"
                  onClick={() => quickAddPlaceToPlan(wheelResult)}
                  className="bg-brand-terracotta hover:bg-brand-terracottaDark text-white font-bold text-xs px-3 py-1.5 rounded-lg"
                >
                  + Vào lịch
                </button>
              </div>
            </div>
          ) : (
            <p className="font-serif font-bold text-base text-brand-terracotta">Bấm nút bên dưới để chọn ngẫu nhiên!</p>
          )}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSpin}
            disabled={isSpinning}
            className="flex-1 bg-brand-terracotta hover:bg-brand-terracottaDark text-white font-bold text-xs py-2.5 rounded-xl disabled:opacity-50"
          >
            🎲 {isSpinning ? "Đang quay..." : wheelResult ? "Quay lại" : "Quay ngay!"}
          </button>
          <button
            type="button"
            onClick={() => setIsWheelOpen(false)}
            className="bg-[#E5D1B8] text-paper-ink font-bold text-xs px-4 py-2.5 rounded-xl"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
