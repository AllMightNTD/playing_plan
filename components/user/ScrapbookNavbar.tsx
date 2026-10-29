"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";

interface ScrapbookNavbarProps {
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
}

export function ScrapbookNavbar({ scrollContainerRef }: ScrapbookNavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { savedPlaceSlugs, setIsRoomModalOpen, homeSummary, places, filterSavedFavorites } = useApp();

  const [activeSection, setActiveSection] = useState<string>("section-home");
  const [scrollProgress, setScrollProgress] = useState<number>(8);
  const [isScrolled, setIsScrolled] = useState<boolean>(false);

  const savedCount = savedPlaceSlugs.length;
  const room = homeSummary?.room ?? null;
  const daysLeft = room?.anniversary?.daysLeft ?? null;
  const totalPlaces = places.length;

  // Khung app chỉ tự cuộn ở chế độ tablet/mobile (overflow-y: auto); desktop cuộn bằng window
  const getFramedScroller = useCallback((): HTMLDivElement | null => {
    const container = scrollContainerRef?.current;
    if (!container) return null;
    const overflowY = window.getComputedStyle(container).overflowY;
    return overflowY === "auto" || overflowY === "scroll" ? container : null;
  }, [scrollContainerRef]);

  const handleScroll = useCallback(() => {
    const container = getFramedScroller();

    const scrollTop = container ? container.scrollTop : window.scrollY;
    const scrollHeight = container
      ? container.scrollHeight - container.clientHeight
      : document.documentElement.scrollHeight - window.innerHeight;

    setIsScrolled(scrollTop > 24);

    if (scrollHeight > 0) {
      const pct = Math.min(100, Math.max(8, (scrollTop / scrollHeight) * 100));
      setScrollProgress(pct);
    }

    if (pathname === "/") {
      const sectionIds = [
        "section-home",
        "section-explore",
        "section-video",
        "section-match",
        "section-memory",
      ];
      let current = "section-home";
      const triggerOffset = 180;

      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (rect.top <= triggerOffset) {
          current = id;
        }
      }

      if (scrollHeight > 20 && scrollTop >= scrollHeight - 40) {
        current = "section-memory";
      }

      setActiveSection(current);
    }
  }, [getFramedScroller, pathname]);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    const container = scrollContainerRef?.current;
    if (container) {
      container.addEventListener("scroll", handleScroll, { passive: true });
    }
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (container) {
        container.removeEventListener("scroll", handleScroll);
      }
    };
  }, [handleScroll, scrollContainerRef]);

  // Khi được điều hướng từ trang khác về "/#section-xxx" thì cuộn tới đúng section
  useEffect(() => {
    if (pathname !== "/") return;
    const sectionId = window.location.hash.slice(1);
    if (!sectionId) return;
    const timer = window.setTimeout(() => {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  const scrollToSection = (e: React.MouseEvent, sectionId: string) => {
    e.preventDefault();
    if (pathname !== "/") {
      router.push(`/#${sectionId}`);
      return;
    }

    const targetEl = document.getElementById(sectionId);
    if (!targetEl) return;

    setActiveSection(sectionId);
    window.history.replaceState(null, "", `#${sectionId}`);

    // scrollIntoView tự cuộn đúng phần tử cha (khung app hoặc window) và tôn trọng scroll-margin-top của .scroll-section
    targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <nav
      id="scrapbookNavbar"
      className={`scrapbook-navbar kraft-texture select-none ${isScrolled ? "is-scrolled" : ""}`}
      aria-label="Điều hướng chính DateMate"
    >
      <div className="max-w-[1180px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-[70px] gap-3">
          {/* BÊN TRÁI: LOGO DATEMATE + 2 TRÁI TIM VẼ TAY */}
          <Link
            href="/"
            onClick={(e) => scrollToSection(e, "section-home")}
            className="flex items-center gap-2.5 group shrink-0"
          >
            <div className="relative transform -rotate-6 group-hover:rotate-0 group-hover:scale-110 transition">
              <svg className="w-10 h-9 sm:w-11 sm:h-10 drop-shadow-xs" viewBox="0 0 64 56" fill="none">
                <path
                  d="M24 46C24 46 6 33 6 19C6 11.5 12 6 19 6C23.5 6 27.5 8.5 29.5 12C31.5 8.5 35.5 6 40 6C47 6 53 11.5 53 19C53 33 35 46 35 46"
                  stroke="#FFFDF9"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M23 44C23 44 7 32 7 19C7 12.5 12 8 18 8C22 8 25.5 10.5 27 13.5C28.5 10.5 32 8 36 8C42 8 47 12.5 47 19C47 32 31 44 27 46L23 44Z"
                  fill="#C84B31"
                  stroke="#362721"
                  strokeWidth="2.2"
                />
                <path
                  d="M41 48C41 48 29 39 29 29.5C29 24.8 32.8 21.5 37 21.5C39.8 21.5 42.3 23.2 43.5 25.5C44.7 23.2 47.2 21.5 50 21.5C54.2 21.5 58 24.8 58 29.5C58 39 46 48 43.5 49.5L41 48Z"
                  fill="#F29B7E"
                  stroke="#362721"
                  strokeWidth="2.2"
                />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-serif font-extrabold text-xl sm:text-2xl text-paper-ink tracking-tight leading-none">
                  DateMate
                </span>
                <span className="hidden xl:inline-block bg-[#FADCD2] text-brand-terracottaDark border border-brand-terracotta/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Hà Nội
                </span>
              </div>
              <p className="navbar-subtitle text-[11px] text-paper-muted font-medium mt-0.5">
                Cẩm nang hẹn hò & Nhật ký cặp đôi
              </p>
            </div>
          </Link>

          {/* Ở GIỮA (DESKTOP): 5 MỤC ĐIỀU HƯỚNG DẠNG NHÃN DÁN GIẤY CÓ SCROLLSPY */}
          <div className="desktop-nav-links hidden lg:flex items-center gap-2">
            <button
              onClick={(e) => scrollToSection(e, "section-home")}
              className={`nav-craft-tab ${activeSection === "section-home" ? "active" : ""}`}
            >
              <span>🏠</span>
              <span>Trang chủ & Lịch hẹn</span>
            </button>
            <button
              onClick={(e) => scrollToSection(e, "section-explore")}
              className={`nav-craft-tab ${activeSection === "section-explore" ? "active" : ""}`}
            >
              <span>🧭</span>
              <span>Khám phá ({totalPlaces})</span>
            </button>
            <button
              onClick={(e) => scrollToSection(e, "section-video")}
              className={`nav-craft-tab ${activeSection === "section-video" ? "active" : ""}`}
            >
              <span>🎞️</span>
              <span>Video Review</span>
            </button>
            <button
              onClick={(e) => scrollToSection(e, "section-match")}
              className={`nav-craft-tab ${activeSection === "section-match" ? "active" : ""}`}
            >
              <span>💞</span>
              <span>Match cặp đôi</span>
            </button>
            <button
              onClick={(e) => scrollToSection(e, "section-memory")}
              className={`nav-craft-tab ${activeSection === "section-memory" ? "active" : ""}`}
            >
              <span>📸</span>
              <span>Kho kỷ niệm</span>
            </button>
          </div>

          {/* BÊN PHẢI: NÚT ĐÃ LƯU YÊU THÍCH + HUY HIỆU PHÒNG ĐÔI 1/2 */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Nút Đã lưu yêu thích */}
            <button
              onClick={(e) => {
                filterSavedFavorites();
                scrollToSection(e, "section-explore");
              }}
              className="relative bg-[#F9EFC7] hover:bg-[#F5E39E] border-2 border-[#D5BE7E] text-paper-ink px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition transform hover:-translate-y-0.5"
              title="Xem các địa điểm đã thả tim lưu lại"
            >
              <span className="text-brand-terracotta text-sm">❤️</span>
              <span className="hidden sm:inline">Đã lưu:</span>
              <span
                id="savedCountBadge"
                className="bg-brand-terracotta text-white text-[11px] font-extrabold px-1.5 py-0.2 rounded-full"
              >
                {savedCount}
              </span>
            </button>

            {/* Huy hiệu Cặp đôi: Phòng đôi 1/2 + Kỷ niệm 12 ngày */}
            <button
              onClick={() => setIsRoomModalOpen(true)}
              className="bg-[#FFFDF9] hover:bg-brand-peach/50 border-2 border-[#CBB292] rounded-lg p-1 pr-2.5 flex items-center gap-2 shadow-2xs transition transform hover:-translate-y-0.5 group"
              title="Mở Mã QR & Đồng bộ Phòng đôi"
            >
              <div className="relative w-8 h-8 rounded-md overflow-hidden border border-[#CBB292] shrink-0 bg-[#E5D1B8]">
                <Image
                  src="https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=200&q=80"
                  alt="Couple Avatar"
                  width={32}
                  height={32}
                  className="w-full h-full object-cover group-hover:scale-110 transition"
                  unoptimized
                />
                <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-green-500 ring-1 ring-white" />
              </div>
              <div className="couple-badge-text text-left leading-tight">
                <div className="flex items-center gap-1">
                  <span className="text-[11px] font-extrabold text-paper-ink">
                    {room ? `Phòng đôi ${room.memberCount}/2` : "Tạo phòng đôi"}
                  </span>
                </div>
                <span className="font-hand text-xs font-bold text-brand-terracotta block">
                  {daysLeft !== null ? `Kỷ niệm: ${daysLeft} ngày 💕` : "Đặt ngày kỷ niệm 💕"}
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* DẢI CUỘN NGANG CÁC TAB CHO TABLET & MOBILE */}
        <div className="mobile-scroll-pills hidden items-center gap-2 overflow-x-auto no-scrollbar py-2 border-t border-[#D8C3A5]/80">
          <button
            onClick={(e) => scrollToSection(e, "section-home")}
            className={`nav-craft-tab !py-1.5 !px-3 !text-xs ${
              activeSection === "section-home" ? "active" : ""
            }`}
          >
            <span>🏠 Trang chủ & Lịch</span>
          </button>
          <button
            onClick={(e) => scrollToSection(e, "section-explore")}
            className={`nav-craft-tab !py-1.5 !px-3 !text-xs ${
              activeSection === "section-explore" ? "active" : ""
            }`}
          >
            <span>🧭 Khám phá ({totalPlaces})</span>
          </button>
          <button
            onClick={(e) => scrollToSection(e, "section-video")}
            className={`nav-craft-tab !py-1.5 !px-3 !text-xs ${
              activeSection === "section-video" ? "active" : ""
            }`}
          >
            <span>🎞️ Video Review</span>
          </button>
          <button
            onClick={(e) => scrollToSection(e, "section-match")}
            className={`nav-craft-tab !py-1.5 !px-3 !text-xs ${
              activeSection === "section-match" ? "active" : ""
            }`}
          >
            <span>💞 Match cặp đôi</span>
          </button>
          <button
            onClick={(e) => scrollToSection(e, "section-memory")}
            className={`nav-craft-tab !py-1.5 !px-3 !text-xs ${
              activeSection === "section-memory" ? "active" : ""
            }`}
          >
            <span>📸 Kho kỷ niệm</span>
          </button>
        </div>
      </div>

      {/* THANH CHỈ BÁO TIẾN TRÌNH CUỘN TRANG (SỢI CHỈ ĐỎ) */}
      <div className="scroll-progress-track">
        <div
          id="scrollProgressBar"
          className="scroll-progress-bar"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>
    </nav>
  );
}
