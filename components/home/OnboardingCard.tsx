"use client";

import React from "react";
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
  const { setIsSearchDrawerOpen, setIsWheelOpen } = useApp();
  const greeting = buildGreeting(new Date());

  return (
    <div className="bg-gradient-to-r from-[#FFFDF9] via-[#FFF9F2] to-[#FADCD2]/40 border-2 border-[#DECBB3] rounded-2xl p-5 shadow-xs relative overflow-hidden">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1.5 max-w-xl">
          <div className="inline-flex items-center gap-1.5 bg-[#F9EFC7] border border-[#DFC98A] px-2.5 py-0.5 rounded-full text-[11px] font-bold text-paper-ink">
            <span>{greeting.emoji}</span>
            <span suppressHydrationWarning>{greeting.text}</span>
          </div>
          <h1 className="font-serif font-extrabold text-xl sm:text-2xl text-paper-ink">Hôm nay hai bạn muốn hẹn hò ở đâu?</h1>
          <p className="text-xs sm:text-sm text-paper-muted leading-relaxed">
            Chưa biết đi đâu cũng đừng lo! Hãy chọn nhanh một cách bên dưới để DateMate gợi ý lịch trình hợp thời tiết nhất cho
            hai đứa nhé:
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              window.scrollTo({ top: 0, behavior: "smooth" });
              setIsSearchDrawerOpen(true);
            }}
            className="bg-brand-terracotta hover:bg-brand-terracottaDark text-white font-bold text-xs sm:text-sm px-4 py-3 rounded-xl shadow flex items-center gap-2 transition"
          >
            <span>🔍</span>
            <span>Tìm theo sở thích</span>
          </button>
          <button
            type="button"
            onClick={() => setIsWheelOpen(true)}
            className="bg-[#FFFDF9] hover:bg-[#FAF4E8] border-2 border-brand-terracotta text-brand-terracottaDark font-bold text-xs sm:text-sm px-4 py-3 rounded-xl shadow-2xs flex items-center gap-2 transition"
          >
            <span>🎯</span>
            <span>Lười chọn? Quay số đi!</span>
          </button>
          <button
            type="button"
            onClick={onSendInvite}
            className="bg-[#F9EFC7] hover:bg-[#F5E39E] border border-[#D5BE7E] text-paper-ink font-bold text-xs sm:text-sm px-4 py-3 rounded-xl flex items-center gap-2 transition"
          >
            <span>💌</span>
            <span>Gửi thiệp hẹn</span>
          </button>
        </div>
      </div>
    </div>
  );
}
