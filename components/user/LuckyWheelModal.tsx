"use client";

import React from "react";
import { useApp } from "@/context/AppContext";
import { X, RotateCw, Calendar, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function LuckyWheelModal() {
  const {
    isWheelOpen,
    setIsWheelOpen,
    spinWheel,
    wheelResult,
    isSpinning,
    addStopToPlan,
  } = useApp();

  if (!isWheelOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-cream w-full max-w-md rounded-3xl shadow-2xl border border-peach-soft p-6 text-center space-y-4">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-peach-deep flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>F06 • Không lặp trong 5 lần quay</span>
          </span>
          <button
            onClick={() => setIsWheelOpen(false)}
            className="w-8 h-8 rounded-full bg-peach-soft/60 hover:bg-peach-soft flex items-center justify-center text-brown transition"
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <h3 className="font-display font-extrabold text-xl text-brown">
          Lười chọn? Để vũ trụ chốt giúp! 🎲
        </h3>

        {/* Wheel Graphic */}
        <div className="relative w-44 h-44 mx-auto my-3 flex items-center justify-center">
          <div
            className={cn(
              "w-full h-full rounded-full border-8 border-peach-soft shadow-peach flex items-center justify-center bg-gradient-to-tr from-[#C93F52] via-[#FF9E8D] to-[#FFE3DA] transition-all",
              isSpinning && "wheel-spinning"
            )}
          >
            <div className="w-16 h-16 rounded-full bg-cream shadow-inner flex items-center justify-center font-display font-extrabold text-peach-deep text-lg">
              ĐM
            </div>
          </div>
          {/* Top Pointer Needle */}
          <div className="absolute -top-2 w-5 h-6 bg-brown rounded-b-full shadow-sm" />
        </div>

        {/* Wheel Result Box */}
        <div className="bg-white rounded-2xl p-4 border border-peach-soft text-left space-y-2 min-h-[90px] flex flex-col justify-center shadow-sm">
          {isSpinning ? (
            <div className="text-center text-xs text-brown-muted py-2 flex items-center justify-center gap-2">
              <RotateCw className="w-4 h-4 animate-spin text-peach-deep" />
              <span>Đang quay tìm địa điểm hợp thời tiết...</span>
            </div>
          ) : wheelResult ? (
            <>
              <div className="flex items-center justify-between">
                <span className="font-display font-extrabold text-base text-brown">
                  {wheelResult.emoji} {wheelResult.name}
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-sage-light text-sage-dark">
                  {wheelResult.area}
                </span>
              </div>
              <p className="text-xs text-brown-muted line-clamp-2">
                {wheelResult.summary}
              </p>
              <div className="text-xs font-bold text-peach-deep">
                ✨ {wheelResult.bestTimeText} • {wheelResult.costText}
              </div>
            </>
          ) : (
            <div className="text-center text-xs text-brown-muted">
              Bấm quay để nhận gợi ý ngẫu nhiên
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={spinWheel}
            disabled={isSpinning}
            className="flex-1 py-2.5 px-4 rounded-2xl bg-peach-soft hover:bg-peach/60 text-brown font-bold text-xs transition flex items-center justify-center gap-1.5 disabled:opacity-60"
          >
            <RotateCw className={cn("w-3.5 h-3.5", isSpinning && "animate-spin")} />
            <span>Quay lại nơi khác</span>
          </button>

          <button
            onClick={() => {
              if (wheelResult) {
                addStopToPlan(wheelResult);
                setIsWheelOpen(false);
              }
            }}
            disabled={isSpinning || !wheelResult}
            className="flex-1 py-2.5 px-4 rounded-2xl bg-peach-deep hover:bg-peach-hover text-white font-bold text-xs shadow-sm transition flex items-center justify-center gap-1.5 disabled:opacity-60"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Chốt thêm vào lịch!</span>
          </button>
        </div>
      </div>
    </div>
  );
}
