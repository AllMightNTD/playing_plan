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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#FAF4E8] border-2 border-[#CBB292] rounded-xl max-w-md w-full p-6 relative shadow-2xl text-center select-none">
        {/* Băng dính Washi đào góc trên */}
        <div className="washi-tape washi-gingham-peach" />

        <button
          onClick={() => setIsWheelOpen(false)}
          className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-[#E5D1B8] hover:bg-brand-terracotta hover:text-white text-paper-ink font-bold transition flex items-center justify-center shadow-xs"
          aria-label="Đóng"
        >
          ✕
        </button>

        <span className="inline-block bg-brand-peach text-brand-terracottaDark text-xs font-bold px-3 py-1 rounded-full">
          🎲 Máy rút vé hẹn hò ngẫu nhiên
        </span>
        <h3 className="font-serif font-extrabold text-2xl text-paper-ink mt-2">
          Hôm nay số phận đưa ta đi đâu?
        </h3>
        <p className="text-xs text-paper-muted mt-1">
          Bấm nút bên dưới để DateMate chọn giúp hai bạn một lịch trình hợp thời tiết nhất!
        </p>

        {/* Ô hiển thị kết quả quay số */}
        <div
          id="wheelResultBox"
          className="my-5 bg-[#FFFDF9] border-2 border-dashed border-brand-terracotta rounded-xl p-5 min-h-[150px] flex flex-col items-center justify-center shadow-inner"
        >
          {isSpinning ? (
            <div className="space-y-2">
              <span className="text-4xl inline-block animate-bounce">🎲</span>
              <p className="font-serif font-bold text-lg text-brand-terracotta animate-pulse">
                Đang rút quẻ hẹn hò...
              </p>
              <p className="text-xs text-paper-muted">Vũ trụ đang tính toán theo nắng thu Hà Nội...</p>
            </div>
          ) : wheelResult ? (
            <div className="space-y-1.5 animate-in zoom-in-95 duration-200">
              <span className="bg-brand-olive text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full inline-block">
                🎉 QUẺ HẸN HÒ HÔM NAY
              </span>
              <h4 className="font-serif font-extrabold text-xl text-brand-terracotta mt-1">
                {wheelResult.emoji} {wheelResult.name}
              </h4>
              <p className="text-xs text-paper-ink font-semibold">
                📍 {wheelResult.area} • 💰 {wheelResult.costText}
              </p>
              <p className="text-xs text-paper-muted line-clamp-2 leading-relaxed">
                {wheelResult.summary}
              </p>
              <button
                onClick={handleOpenDetail}
                className="mt-2.5 bg-brand-peach hover:bg-brand-coral text-paper-ink font-bold text-xs px-4 py-1.5 rounded-md border border-brand-terracotta/40 transition active:scale-95 shadow-2xs"
              >
                📖 Xem cẩm nang & phối đồ ngay →
              </button>
            </div>
          ) : (
            <>
              <span className="text-4xl mb-2">🎟️</span>
              <p className="font-serif font-bold text-lg text-paper-ink">
                Sẵn sàng rút quẻ hẹn hò!
              </p>
              <p className="text-xs text-paper-muted mt-1">
                Chạm &quot;Quay số ngay&quot; để khám phá bất ngờ
              </p>
            </>
          )}
        </div>

        <div className="flex items-center gap-3 justify-center">
          <button
            onClick={handleSpin}
            disabled={isSpinning}
            className="ticket-btn bg-brand-terracotta text-white px-6 py-3 font-bold text-sm disabled:opacity-50"
          >
            🎯 {isSpinning ? "Đang quay..." : "Quay số ngay!"}
          </button>
          <button
            onClick={() => setIsWheelOpen(false)}
            className="paper-btn px-4 py-2.5 text-xs font-bold"
          >
            Đóng lại
          </button>
        </div>
      </div>
    </div>
  );
}
