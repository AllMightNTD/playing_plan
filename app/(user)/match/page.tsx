"use client";

import React, { useState } from "react";
import { useApp } from "@/context/AppContext";
import { SwipeDeck } from "@/components/scrapbook/SwipeDeck";
import { BlindDateTicket } from "@/components/scrapbook/BlindDateTicket";
import { ScratchMapHanoi } from "@/components/scrapbook/ScratchMapHanoi";
import { SecretNotesBoard } from "@/components/scrapbook/SecretNotesBoard";
import { cn } from "@/lib/utils";

type GameTab = "swipe" | "blind" | "scratch" | "all";

const TABS: { key: GameTab; label: string }[] = [
  { key: "swipe", label: "💞 1. Quẹt thẻ Hợp Gu" },
  { key: "blind", label: "🎫 2. Vé Mù Bí Mật" },
  { key: "scratch", label: "🗺️ 3. Bản Đồ Cào & Thư Tình" },
  { key: "all", label: "Xem tất cả" },
];

export default function MatchPage() {
  const { quickAddPlaceToPlan, setActiveDetailSlug, homeSummary, roomProfile, addToast } = useApp();
  const [tab, setTab] = useState<GameTab>("swipe");
  // Check-in ở vé mù / thư tình làm bản đồ cào cập nhật lại
  const [checkInTrigger, setCheckInTrigger] = useState(0);

  const toast = (message: string, type?: "success" | "error" | "info") => addToast(message, type);
  const onCheckIn = () => setCheckInTrigger((n) => n + 1);
  const showSwipe = tab === "swipe" || tab === "all";
  const showBlind = tab === "blind" || tab === "all";
  const showScratch = tab === "scratch" || tab === "all";

  return (
    <section className="space-y-5 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <span className="text-xs font-extrabold uppercase tracking-wider text-brand-terracotta">💞 Tương tác cặp đôi thú vị</span>
          <h2 className="font-serif font-extrabold text-xl sm:text-2xl text-paper-ink">Trò Chơi Hợp Gu & Khám Phá Bí Mật Cùng Người Ấy</h2>
          <p className="text-xs text-paper-muted mt-0.5">Chọn một trò chơi bên dưới để cùng người thương tìm ra điểm hẹn ưng ý nhất:</p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 bg-[#EFE5D4] p-1.5 rounded-2xl border border-[#CBB292]" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "px-3.5 py-2 rounded-xl text-xs transition",
                tab === t.key
                  ? "bg-brand-terracotta text-white font-extrabold shadow-xs"
                  : t.key === "all"
                    ? "font-semibold text-paper-muted hover:text-paper-ink"
                    : "font-bold text-paper-ink hover:bg-[#FFFDF9]"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {showSwipe && (
        <SwipeDeck
          roomType={roomProfile?.room.roomType ?? "couple"}
          isPaired={homeSummary?.room?.isPaired ?? false}
          onError={(message) => addToast(message, "error")}
          onAddToPlan={(placeId) => quickAddPlaceToPlan(placeId)}
          onOpenDetail={setActiveDetailSlug}
        />
      )}

      {(showBlind || showScratch) && (
        <div className={cn("grid grid-cols-1 gap-6", tab === "all" ? "responsive-3col lg:grid-cols-3" : showScratch ? "responsive-2col lg:grid-cols-2" : "max-w-xl")}>
          {showBlind && <BlindDateTicket onToast={toast} onCheckInSuccess={onCheckIn} />}
          {showScratch && <ScratchMapHanoi onToast={toast} refreshTrigger={checkInTrigger} />}
          {showScratch && <SecretNotesBoard onToast={toast} onCheckInSuccess={onCheckIn} />}
        </div>
      )}
    </section>
  );
}
