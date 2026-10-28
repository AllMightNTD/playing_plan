"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { setIsWheelOpen } = useApp();

  // Hide BottomNav on admin
  if (pathname.startsWith("/admin")) {
    return null;
  }

  const handleNavClick = (sectionId: string) => {
    if (pathname !== "/") {
      router.push(`/#${sectionId}`);
      return;
    }
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <nav className="mobile-bottom-nav hidden fixed bottom-0 left-0 right-0 z-40 kraft-texture border-t-2 border-[#CBB292] px-2 py-1.5 justify-around items-center shadow-2xl select-none">
      <button
        onClick={() => handleNavClick("section-home")}
        className="mobile-bottom-link flex flex-col items-center gap-0.5 px-2.5 py-1 rounded-lg bg-brand-terracotta text-white font-semibold text-[11px] transition active:scale-95"
      >
        <span>🏠</span>
        <span>Trang chủ</span>
      </button>

      <button
        onClick={() => handleNavClick("section-explore")}
        className="mobile-bottom-link flex flex-col items-center gap-0.5 px-2.5 py-1 rounded-lg text-paper-ink font-medium text-[11px] transition active:scale-95"
      >
        <span>🧭</span>
        <span>Khám phá</span>
      </button>

      {/* Floating Center Dice Button */}
      <button
        onClick={() => setIsWheelOpen(true)}
        className="flex flex-col items-center -mt-5 bg-brand-terracotta border-2 border-[#FAF4E8] text-white w-12 h-12 rounded-full justify-center shadow-lg active:scale-90 transition hover:scale-105"
        title="Quay số ngẫu nhiên"
      >
        <span className="text-lg">🎲</span>
      </button>

      <button
        onClick={() => handleNavClick("section-video")}
        className="mobile-bottom-link flex flex-col items-center gap-0.5 px-2.5 py-1 rounded-lg text-paper-ink font-medium text-[11px] transition active:scale-95"
      >
        <span>🎞️</span>
        <span>Video</span>
      </button>

      <button
        onClick={() => handleNavClick("section-memory")}
        className="mobile-bottom-link flex flex-col items-center gap-0.5 px-2.5 py-1 rounded-lg text-paper-ink font-medium text-[11px] transition active:scale-95"
      >
        <span>📸</span>
        <span>Kỷ niệm</span>
      </button>
    </nav>
  );
}

