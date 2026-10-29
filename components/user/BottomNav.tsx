"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { MAIN_NAV, isNavActive } from "./ScrapbookNavbar";
import { cn } from "@/lib/utils";

const [PLAN_NAV, EXPLORE_NAV, MATCH_NAV, MEMORY_NAV] = MAIN_NAV;

export function BottomNav() {
  const pathname = usePathname();
  const { setIsSearchDrawerOpen } = useApp();

  const linkClass = (match: readonly string[]) =>
    cn(
      "flex flex-col items-center text-[11px] font-bold transition active:scale-95",
      isNavActive(pathname, match) ? "text-brand-terracotta" : "text-paper-ink"
    );

  return (
    <nav className="mobile-bottom-nav hidden fixed bottom-0 left-0 right-0 z-40 kraft-texture border-t-2 border-[#CBB292] px-2 py-1.5 justify-around items-center shadow-2xl select-none">
      <Link href={PLAN_NAV.href} className={linkClass(PLAN_NAV.match)}>
        <span>{PLAN_NAV.emoji}</span>
        <span>{PLAN_NAV.short}</span>
      </Link>
      <button
        type="button"
        onClick={() => {
          window.scrollTo({ top: 0, behavior: "smooth" });
          setIsSearchDrawerOpen(true);
        }}
        className="flex flex-col items-center text-[11px] font-bold text-paper-ink transition active:scale-95"
      >
        <span>🔍</span>
        <span>Tìm quán</span>
      </button>
      <Link
        href={MATCH_NAV.href}
        aria-label={MATCH_NAV.label}
        className={cn(
          "flex flex-col items-center -mt-4 text-white w-11 h-11 rounded-full justify-center shadow-lg transition active:scale-90",
          isNavActive(pathname, MATCH_NAV.match) ? "bg-brand-terracottaDark" : "bg-brand-terracotta"
        )}
      >
        <span>{MATCH_NAV.emoji}</span>
      </Link>
      <Link href={EXPLORE_NAV.href} className={linkClass(EXPLORE_NAV.match)}>
        <span>{EXPLORE_NAV.emoji}</span>
        <span>{EXPLORE_NAV.short}</span>
      </Link>
      <Link href={MEMORY_NAV.href} className={linkClass(MEMORY_NAV.match)}>
        <span>{MEMORY_NAV.emoji}</span>
        <span>{MEMORY_NAV.short}</span>
      </Link>
    </nav>
  );
}
