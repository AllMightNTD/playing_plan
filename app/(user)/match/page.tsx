"use client";

import React, { useState } from "react";
import { useApp } from "@/context/AppContext";
import { SwipeDeck } from "@/components/scrapbook/SwipeDeck";
import { BlindDateTicket } from "@/components/scrapbook/BlindDateTicket";
import { SecretNotesBoard } from "@/components/scrapbook/SecretNotesBoard";
import { cn } from "@/lib/utils";

type GameTab = "swipe" | "blind" | "notes";

const TABS: { key: GameTab; label: string }[] = [
  { key: "swipe", label: "💞 Quẹt Thẻ" },
  { key: "blind", label: "🎫 Vé Mù" },
  { key: "notes", label: "💌 Hộp Thư" },
];

export default function MatchPage() {
  const { quickAddPlaceToPlan, setActiveDetailSlug, homeSummary, roomProfile, addToast } = useApp();
  const [tab, setTab] = useState<GameTab>("swipe");
  // Check-in ở vé mù / thư tình làm mới dữ liệu
  const [checkInTrigger, setCheckInTrigger] = useState(0);

  const toast = (message: string, type?: "success" | "error" | "info") => addToast(message, type);
  const onCheckIn = () => setCheckInTrigger((n) => n + 1);

  return (
    <section className="space-y-4 sm:space-y-5 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <span className="text-xs font-extrabold uppercase tracking-wider text-brand-terracotta">
            💞 Tương tác cặp đôi
          </span>
          <h2 className="font-serif font-extrabold text-xl sm:text-2xl text-paper-ink">
            Quẹt Thẻ Hợp Gu & Khám Phá Cùng Người Ấy
          </h2>
          <p className="text-xs text-paper-muted mt-0.5">
            Chọn một trò chơi để cùng người thương chốt điểm hẹn ưng ý nhất hôm nay
          </p>
        </div>

        {/* Native Segmented Control */}
        <div className="grid grid-cols-3 sm:flex items-center gap-1 bg-[#EFE5D4] p-1 rounded-2xl border border-[#CBB292]" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs transition cursor-pointer text-center",
                tab === t.key
                  ? "bg-brand-terracotta text-white font-extrabold shadow-xs"
                  : "font-bold text-paper-ink hover:bg-[#FFFDF9]/60"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "swipe" && (
        <SwipeDeck
          roomType={roomProfile?.room.roomType ?? "couple"}
          isPaired={homeSummary?.room?.isPaired ?? false}
          onError={(message) => addToast(message, "error")}
          onAddToPlan={(placeId) => quickAddPlaceToPlan(placeId)}
          onOpenDetail={setActiveDetailSlug}
        />
      )}

      {tab === "blind" && (
        <div className="max-w-xl mx-auto">
          <BlindDateTicket onToast={toast} onCheckInSuccess={onCheckIn} />
        </div>
      )}

      {tab === "notes" && (
        <div className="max-w-xl mx-auto">
          <SecretNotesBoard onToast={toast} onCheckInSuccess={onCheckIn} />
        </div>
      )}
    </section>
  );
}
