"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { Lock, Wand2, QrCode } from "lucide-react";

export function DesktopHeader() {
  const pathname = usePathname();
  const { setIsWheelOpen, setIsWizardOpen, setIsRoomModalOpen, homeSummary } = useApp();
  const roomDisplayName = homeSummary?.room?.name
    ? `Phòng: ${homeSummary.room.name}`
    : "Phòng: Dũng & Linh";

  return (
    <header className="hidden lg:flex bg-[#F5E6E0] px-6 py-2.5 border-b border-peach-soft items-center justify-between gap-4 shrink-0">
      {/* Browser dot controls & URL bar */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="w-3 h-3 rounded-full bg-[#FF5F56]" />
          <span className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
          <span className="w-3 h-3 rounded-full bg-[#27C93F]" />
        </div>

        {/* URL Box */}
        <div className="flex-1 bg-white/90 rounded-xl px-3 py-1.5 text-xs font-mono text-brown flex items-center justify-between border border-peach-soft shadow-inner">
          <div className="flex items-center gap-1.5 truncate">
            <Lock className="w-3 h-3 text-sage-dark shrink-0" />
            <span className="text-brown-muted">https://datemate.vn</span>
            <span className="font-semibold text-peach-deep truncate">{pathname}</span>
          </div>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-sage-light text-sage-dark font-sans font-semibold shrink-0">
            ISR 1h • Anonymous
          </span>
        </div>
      </div>

      {/* Right Quick Tools */}
      <div className="flex items-center gap-2.5 text-xs">
        <button
          onClick={() => setIsRoomModalOpen(true)}
          className="px-3 py-1.5 rounded-xl bg-white hover:bg-peach-soft/50 border border-peach-soft text-brown font-semibold transition flex items-center gap-1.5"
          title="Mã phòng đôi & Sao lưu"
        >
          <QrCode className="w-3.5 h-3.5 text-peach-deep" />
          <span className="max-w-[150px] truncate">{roomDisplayName}</span>
        </button>

        <button
          onClick={() => setIsWheelOpen(true)}
          className="px-3 py-1.5 rounded-xl bg-peach-soft hover:bg-peach text-brown font-bold transition flex items-center gap-1 shadow-sm"
        >
          <span>🎲 Quay số</span>
        </button>

        <button
          onClick={() => setIsWizardOpen(true)}
          className="px-3.5 py-1.5 rounded-xl bg-peach-deep hover:bg-peach-hover text-white font-bold transition flex items-center gap-1.5 shadow-peach"
        >
          <Wand2 className="w-3.5 h-3.5" />
          <span>Hôm nay đi đâu?</span>
        </button>
      </div>
    </header>
  );
}
