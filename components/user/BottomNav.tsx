"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MAIN_NAV, isNavActive } from "./ScrapbookNavbar";
import { cn } from "@/lib/utils";

const [PLAN_NAV, EXPLORE_NAV, MATCH_NAV, MEMORY_NAV] = MAIN_NAV;

export function BottomNav() {
  const pathname = usePathname();

  const linkClass = (match: readonly string[]) => {
    const active = isNavActive(pathname, match);
    return cn(
      "relative min-h-11 min-w-16 px-2.5 py-1 rounded-2xl flex flex-col items-center justify-center gap-0.5 text-[11px] font-bold transition-all duration-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-terracotta",
      active
        ? "text-brand-terracotta bg-[#FFFDF9] shadow-xs -translate-y-0.5"
        : "text-paper-ink/85 hover:text-paper-ink"
    );
  };

  return (
    <nav
      aria-label="Điều hướng di động DateMate"
      className="mobile-bottom-nav hidden fixed bottom-2.5 sm:bottom-4 left-3 right-3 md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-md z-40 bg-[#FAF4E8]/95 backdrop-blur-md border-2 border-[#CBB292] rounded-3xl px-2.5 py-1.5 justify-around items-center gap-1.5 shadow-[0_14px_34px_rgba(54,39,33,0.22)] select-none"
    >
      <Link href={PLAN_NAV.href} className={linkClass(PLAN_NAV.match)}>
        <span aria-hidden="true" className="text-base leading-none">{PLAN_NAV.emoji}</span>
        <span>{PLAN_NAV.short}</span>
        {isNavActive(pathname, PLAN_NAV.match) && (
          <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-brand-terracotta mt-0.5" />
        )}
      </Link>
      <Link href={EXPLORE_NAV.href} className={linkClass(EXPLORE_NAV.match)}>
        <span aria-hidden="true" className="text-base leading-none">{EXPLORE_NAV.emoji}</span>
        <span>{EXPLORE_NAV.short}</span>
        {isNavActive(pathname, EXPLORE_NAV.match) && (
          <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-brand-terracotta mt-0.5" />
        )}
      </Link>
      <Link
        href={MATCH_NAV.href}
        aria-label={MATCH_NAV.label}
        className={cn(
          "min-h-11 min-w-[76px] -mt-3.5 px-3.5 py-1.5 rounded-2xl flex flex-col items-center justify-center gap-0.5 text-[11px] font-extrabold text-white border-2 border-[#FFFDF9] shadow-[0_8px_18px_rgba(200,75,49,0.38)] transition-all duration-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-terracottaDark",
          isNavActive(pathname, MATCH_NAV.match)
            ? "bg-brand-terracottaDark scale-105"
            : "bg-brand-terracotta hover:bg-brand-terracottaDark"
        )}
      >
        <span aria-hidden="true" className="text-base leading-none">{MATCH_NAV.emoji}</span>
        <span>{MATCH_NAV.short}</span>
      </Link>
      <Link href={MEMORY_NAV.href} className={linkClass(MEMORY_NAV.match)}>
        <span aria-hidden="true" className="text-base leading-none">{MEMORY_NAV.emoji}</span>
        <span>{MEMORY_NAV.short}</span>
        {isNavActive(pathname, MEMORY_NAV.match) && (
          <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-brand-terracotta mt-0.5" />
        )}
      </Link>
    </nav>
  );
}
