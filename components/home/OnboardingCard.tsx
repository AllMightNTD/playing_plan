"use client";

import React from "react";
import Link from "next/link";
import { useApp } from "@/context/AppContext";

const SEASONS = [
  { months: [2, 3, 4], name: "xuân", emoji: "🌸" },
  { months: [5, 6, 7], name: "hạ", emoji: "☀️" },
  { months: [8, 9, 10], name: "thu", emoji: "🍂" },
  { months: [11, 12, 1], name: "đông", emoji: "❄️" },
];

/** Lời chào theo giờ trong ngày và mùa hiện tại ở Hà Nội. */
function buildGreeting(now: Date): { emoji: string; text: string } {
  const hour = now.getHours();
  const part = hour < 5 ? "đêm" : hour < 11 ? "buổi sáng" : hour < 14 ? "buổi trưa" : hour < 18 ? "buổi chiều" : "buổi tối";
  const season = SEASONS.find((s) => s.months.includes(now.getMonth() + 1)) ?? SEASONS[2];
  return { emoji: season.emoji, text: `Chào ${part} ${season.name} Hà Nội!` };
}

interface OnboardingCardProps {
  /** Mở thiệp hẹn (poster + link chia sẻ) cho buổi hẹn sắp tới */
  onSendInvite: () => void;
}

/** Thẻ chào mừng 3 bước cho người mới: tìm theo sở thích, quay số, gửi thiệp hẹn. */
export function OnboardingCard({ onSendInvite }: OnboardingCardProps) {
  const { setIsSearchDrawerOpen, setIsWheelOpen, homeSummary, homePublic } = useApp();
  const greeting = buildGreeting(new Date());
  const roomName = homeSummary?.room?.isPaired ? homeSummary.room.name : null;
  const sunsetTime = homePublic?.sun?.sunset;

  return (
    <div className="bg-gradient-to-r from-[#FFFDF9] via-[#FFF9F2] to-[#FADCD2]/40 border-2 border-[#DECBB3] rounded-2xl p-5 shadow-xs relative overflow-hidden">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1.5 max-w-xl">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1.5 bg-[#F9EFC7] border border-[#DFC98A] px-2.5 py-0.5 rounded-full text-[11px] font-bold text-paper-ink">
              <span>{greeting.emoji}</span>
              <span suppressHydrationWarning>{greeting.text}</span>
            </div>
            {sunsetTime && (
              <div className="inline-flex items-center gap-1 bg-amber-100/90 border border-amber-300 px-2.5 py-0.5 rounded-full text-[11px] font-bold text-amber-950">
                <span>🌅 Hoàng hôn hôm nay: {sunsetTime}</span>
              </div>
            )}
          </div>
          <h1 className="font-serif font-extrabold text-xl sm:text-2xl text-paper-ink">
            {roomName
              ? `Hôm nay phòng đôi "${roomName}" muốn hẹn hò ở đâu?`
              : "Hôm nay hai bạn muốn hẹn hò ở đâu?"}
          </h1>
          <p className="text-xs sm:text-sm text-paper-muted leading-relaxed">
            Chưa biết đi đâu cũng đừng lo! Hãy chọn nhanh một cách bên dưới để DateMate gợi ý lịch trình hợp thời tiết nhất cho
            hai đứa nhé:
          </p>
        </div>

        {/* Mobile & Tablet 4-Icon Super-App Launcher Grid (< 1024px) */}
        <div className="grid grid-cols-4 gap-2 sm:gap-3 pt-1 lg:hidden">
          <button
            type="button"
            onClick={() => {
              window.scrollTo({ top: 0, behavior: "smooth" });
              setIsSearchDrawerOpen(true);
            }}
            className="min-h-[72px] bg-[#FAF4E8] hover:bg-[#EFE5D4] border border-[#D8C7B0] rounded-2xl p-2 flex flex-col items-center justify-center gap-1.5 shadow-2xs transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-terracotta cursor-pointer"
          >
            <span
              aria-hidden="true"
              className="w-10 h-10 rounded-xl bg-[#FFFDF9] border border-[#E2D2B8] flex items-center justify-center text-lg shadow-2xs"
            >
              🔍
            </span>
            <span className="text-[11px] font-extrabold text-paper-ink truncate max-w-full">
              Sở thích
            </span>
          </button>

          <button
            type="button"
            onClick={() => setIsWheelOpen(true)}
            className="min-h-[72px] bg-[#FAF4E8] hover:bg-[#EFE5D4] border border-[#D8C7B0] rounded-2xl p-2 flex flex-col items-center justify-center gap-1.5 shadow-2xs transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-terracotta cursor-pointer"
          >
            <span
              aria-hidden="true"
              className="w-10 h-10 rounded-xl bg-[#FFFDF9] border border-[#E2D2B8] flex items-center justify-center text-lg shadow-2xs"
            >
              🎯
            </span>
            <span className="text-[11px] font-extrabold text-paper-ink truncate max-w-full">
              Quay số
            </span>
          </button>

          <Link
            href="/match"
            className="min-h-[72px] bg-brand-terracotta hover:bg-brand-terracottaDark text-white border border-brand-terracottaDark rounded-2xl p-2 flex flex-col items-center justify-center gap-1.5 shadow-sm transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-terracottaDark"
          >
            <span
              aria-hidden="true"
              className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-lg"
            >
              💞
            </span>
            <span className="text-[11px] font-extrabold text-white truncate max-w-full">
              Hợp Gu
            </span>
          </Link>

          <button
            type="button"
            onClick={onSendInvite}
            className="min-h-[72px] bg-[#F9EFC7] hover:bg-[#F5E39E] border border-[#D5BE7E] rounded-2xl p-2 flex flex-col items-center justify-center gap-1.5 shadow-2xs transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-terracotta cursor-pointer"
          >
            <span
              aria-hidden="true"
              className="w-10 h-10 rounded-xl bg-[#FFFDF9] border border-[#DFC98A] flex items-center justify-center text-lg shadow-2xs"
            >
              💌
            </span>
            <span className="text-[11px] font-extrabold text-paper-ink truncate max-w-full">
              Thiệp hẹn
            </span>
          </button>
        </div>

        {/* Desktop Action Buttons (>= 1024px) */}
        <div className="hidden lg:flex lg:flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              window.scrollTo({ top: 0, behavior: "smooth" });
              setIsSearchDrawerOpen(true);
            }}
            className="min-h-11 bg-brand-terracotta hover:bg-brand-terracottaDark text-white font-bold text-xs sm:text-sm px-4 py-2.5 sm:py-3 rounded-xl shadow flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <span aria-hidden="true">🔍</span>
            <span>Tìm theo sở thích</span>
          </button>
          <button
            type="button"
            onClick={() => setIsWheelOpen(true)}
            className="min-h-11 bg-[#FFFDF9] hover:bg-[#FAF4E8] border-2 border-brand-terracotta text-brand-terracottaDark font-bold text-xs sm:text-sm px-4 py-2.5 sm:py-3 rounded-xl shadow-2xs flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <span aria-hidden="true">🎯</span>
            <span>Lười chọn? Quay số đi!</span>
          </button>
          <button
            type="button"
            onClick={onSendInvite}
            className="min-h-11 bg-[#F9EFC7] hover:bg-[#F5E39E] border border-[#D5BE7E] text-paper-ink font-bold text-xs sm:text-sm px-4 py-2.5 sm:py-3 rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <span aria-hidden="true">💌</span>
            <span>Gửi thiệp hẹn</span>
          </button>
        </div>
      </div>
    </div>
  );
}
