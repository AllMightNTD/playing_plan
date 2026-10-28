"use client";

import React from "react";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { QrCode } from "lucide-react";

export function MobileHeader() {
  const { setIsRoomModalOpen } = useApp();

  return (
    <header className="lg:hidden bg-cream/95 backdrop-blur-md px-4 py-2.5 flex items-center justify-between border-b border-peach-soft sticky top-0 z-30 shrink-0">
      <Link href="/" className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-2xl bg-peach-deep text-white flex items-center justify-center font-display font-extrabold text-sm shadow-sm">
          Đ
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-display font-extrabold text-base text-brown leading-none">
              DateMate
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-peach-soft text-peach-deep font-bold">
              Hà Nội
            </span>
          </div>
          <p className="text-[10px] text-brown-muted">Hôm nay đi đâu, mặc gì, chụp sao?</p>
        </div>
      </Link>

      {/* Room Status Pill */}
      <button
        onClick={() => setIsRoomModalOpen(true)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-peach-soft hover:bg-peach text-brown text-[11px] font-bold transition shadow-sm"
      >
        <span className="w-2 h-2 rounded-full bg-sage" />
        <span>Dũng & Linh</span>
        <QrCode className="w-3.5 h-3.5 text-peach-deep" />
      </button>
    </header>
  );
}
