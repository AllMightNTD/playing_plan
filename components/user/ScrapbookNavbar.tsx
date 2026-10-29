"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { NoticesBell } from "./NoticesBell";
import { SearchDrawer } from "./SearchDrawer";
import { cn } from "@/lib/utils";

/** 4 mục điều hướng cốt lõi; mỗi mục là một route, `match` liệt kê các route thuộc mục đó. */
export const MAIN_NAV = [
  { href: "/", emoji: "📅", label: "Kế hoạch hôm nay", short: "Kế hoạch", match: ["/", "/plans"] },
  { href: "/explore", emoji: "🧭", label: "Khám phá quán đẹp", short: "Khám phá", match: ["/explore", "/places", "/videos"] },
  { href: "/match", emoji: "💞", label: "Trò chơi Hợp Gu", short: "Hợp Gu", match: ["/match"] },
  { href: "/memories", emoji: "📸", label: "Sổ tay Kỷ niệm", short: "Kỷ niệm", match: ["/memories"] },
] as const;

export function isNavActive(pathname: string, match: readonly string[]): boolean {
  return match.some((prefix) => (prefix === "/" ? pathname === "/" : pathname === prefix || pathname.startsWith(`${prefix}/`)));
}

export function ScrapbookNavbar() {
  const pathname = usePathname();
  const { setIsRoomModalOpen, homeSummary, roomProfile, isSearchDrawerOpen, setIsSearchDrawerOpen, searchQuery, selectedCategory } =
    useApp();
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(scrollable > 0 ? Math.min(100, (window.scrollY / scrollable) * 100) : 0);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [pathname]);

  // Đổi trang thì đóng ngăn kéo tìm kiếm
  useEffect(() => {
    setIsSearchDrawerOpen(false);
  }, [pathname, setIsSearchDrawerOpen]);

  const room = homeSummary?.room ?? null;
  const activeFilterCount = (searchQuery.trim() ? 1 : 0) + (selectedCategory !== "all" ? 1 : 0);
  const initials = (roomProfile?.members ?? []).map((m) => m.nickname?.trim().charAt(0).toUpperCase() || "?");

  return (
    <nav className="scrapbook-navbar kraft-texture select-none" aria-label="Điều hướng chính DateMate">
      <div className="max-w-[1160px] mx-auto px-3 sm:px-6">
        <div className="flex items-center justify-between gap-2 py-3">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-brand-terracotta flex items-center justify-center text-white shadow-xs border-2 border-[#FAF4E8]">
              <span className="text-lg">💞</span>
            </div>
            <div>
              <span className="font-serif font-extrabold text-lg sm:text-xl text-paper-ink tracking-tight block leading-none">
                DateMate
              </span>
              <span className="text-[11px] text-paper-muted font-medium hidden sm:block mt-0.5">Cẩm nang hẹn hò Hà Nội</span>
            </div>
          </Link>

          {/* 4 mục điều hướng */}
          <div className="desktop-nav-links flex items-center gap-2">
            {MAIN_NAV.map((item) => (
              <Link key={item.href} href={item.href} className={cn("nav-craft-tab", isNavActive(pathname, item.match) && "active")}>
                <span>{item.emoji}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </div>

          {/* Tìm sở thích + Chuông + Phòng đôi */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsSearchDrawerOpen(!isSearchDrawerOpen)}
              aria-expanded={isSearchDrawerOpen}
              className="bg-[#FFFDF9] hover:bg-[#FFF5F0] border-2 border-brand-terracotta text-brand-terracottaDark px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-2xs transition"
            >
              <span>🔍</span>
              <span className="hidden sm:inline">Tìm sở thích</span>
              {activeFilterCount > 0 && (
                <span className="bg-brand-terracotta text-white text-[10px] px-1.5 rounded-full">{activeFilterCount}</span>
              )}
            </button>

            <NoticesBell />

            <button
              type="button"
              onClick={() => setIsRoomModalOpen(true)}
              className="bg-[#FFFDF9] hover:bg-brand-peach/40 border border-[#CBB292] rounded-full p-1 pr-3 flex items-center gap-2 shadow-2xs transition"
              title="Quản lý phòng đôi & Mã ghép đôi"
            >
              <div className="relative w-7 h-7 rounded-full border border-brand-terracotta shrink-0 bg-brand-peach flex items-center justify-center text-[11px] font-extrabold text-brand-terracottaDark">
                {initials.length > 0 ? initials.slice(0, 2).join("") : "💞"}
                {room?.isPaired && (
                  <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-green-500 ring-1 ring-white" />
                )}
              </div>
              <div className="couple-badge-text text-left leading-tight">
                <span className="text-[11px] font-bold text-paper-ink block max-w-[140px] truncate">
                  {room?.name ?? "Tạo phòng đôi"}
                </span>
                <span className="text-[10px] font-semibold text-brand-terracotta block">
                  {!room ? "Mời người ấy" : room.isPaired ? "❤️ Đã ghép đôi" : "⏳ Chờ người ấy"}
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Dải cuộn ngang cho tablet & mobile */}
        <div className="mobile-scroll-pills hidden items-center gap-1.5 overflow-x-auto no-scrollbar py-2 border-t border-[#DEC8AC]">
          <button
            type="button"
            onClick={() => setIsSearchDrawerOpen(true)}
            className="nav-craft-tab !py-1 !px-3 !text-xs !border-brand-terracotta !bg-[#FFF7F4] font-bold"
          >
            🔍 Tìm sở thích
          </button>
          {MAIN_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn("nav-craft-tab !py-1 !px-3 !text-xs", isNavActive(pathname, item.match) && "active")}
            >
              {item.emoji} {item.short}
            </Link>
          ))}
        </div>
      </div>

      <SearchDrawer />

      <div className="scroll-progress-track">
        <div className="scroll-progress-bar" style={{ width: `${scrollProgress}%` }} />
      </div>
    </nav>
  );
}
