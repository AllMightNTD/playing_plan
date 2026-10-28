"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/context/AppContext";
import {
  Sparkles,
  Compass,
  Flame,
  CalendarHeart,
  Camera,
  QrCode,
  Bookmark,
} from "lucide-react";
import { cn } from "@/lib/utils";

const DESK_NAV_ITEMS = [
  { label: "Trang chủ", href: "/", icon: Sparkles },
  { label: "Khám phá 36 địa điểm", href: "/explore", icon: Compass },
  { label: "Match cặp đôi", href: "/match", icon: Flame, isMatch: true },
  { label: "Kế hoạch & Lịch", href: "/plans", icon: CalendarHeart, isPlan: true },
  { label: "Kho kỷ niệm", href: "/memories", icon: Camera },
];

export function DesktopSidebar() {
  const pathname = usePathname();
  const { savedPlaceSlugs, matchedSlugs, setIsRoomModalOpen } = useApp();

  return (
    <aside className="w-64 bg-[#FFF2EC] border-r border-peach-soft p-4 flex flex-col justify-between shrink-0 select-none sticky top-0 h-screen overflow-y-auto">
      <div className="space-y-5">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 px-2 group">
          <div className="w-10 h-10 rounded-2xl bg-peach-deep text-white flex items-center justify-center font-display font-extrabold text-lg shadow-peach group-hover:scale-105 transition">
            Đ
          </div>
          <div>
            <h1 className="font-display font-extrabold text-lg text-brown leading-tight">
              DateMate
            </h1>
            <p className="text-[11px] text-brown-muted">Cẩm nang hẹn hò Hà Nội</p>
          </div>
        </Link>

        {/* Navigation Menu */}
        <nav className="space-y-1">
          {DESK_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition",
                  isActive
                    ? "bg-peach-deep text-white shadow-sm"
                    : "text-brown hover:bg-peach-soft/60"
                )}
              >
                <span className="flex items-center gap-3">
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </span>

                {item.isMatch && matchedSlugs.length > 0 && (
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded-full text-[11px] font-extrabold",
                      isActive
                        ? "bg-white text-peach-deep"
                        : "bg-peach-soft text-peach-deep"
                    )}
                  >
                    {matchedSlugs.length}
                  </span>
                )}

                {item.isPlan && (
                  <span className="w-2 h-2 rounded-full bg-sage" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Saved Places Counter Card */}
        <div className="bg-white/80 rounded-2xl p-3 border border-peach-soft space-y-1.5 shadow-sm">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-brown flex items-center gap-1.5">
              <Bookmark className="w-3.5 h-3.5 text-peach-deep" />
              <span>Đã lưu yêu thích</span>
            </span>
            <span className="px-2 py-0.5 rounded-full bg-peach-soft text-peach-deep font-bold text-[11px]">
              {savedPlaceSlugs.length} nơi
            </span>
          </div>
          <p className="text-[11px] text-brown-muted leading-relaxed">
            Đồng bộ thời gian thực qua phiên ẩn danh & LocalStorage.
          </p>
        </div>
      </div>

      {/* Bottom Couple Room Status Card (F01, F02) */}
      <div className="bg-white rounded-2xl p-3.5 border border-peach-soft shadow-sm space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-sage-dark flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-sage animate-ping" />
            <span>Phòng Đôi 2/2</span>
          </span>
          <span className="text-[10px] font-mono text-brown-muted">Atomic Join</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            <div className="w-7 h-7 rounded-full bg-peach-deep text-white text-xs font-bold flex items-center justify-center ring-2 ring-white">
              D
            </div>
            <div className="w-7 h-7 rounded-full bg-peach text-brown text-xs font-bold flex items-center justify-center ring-2 ring-white">
              L
            </div>
          </div>
          <div className="text-xs">
            <div className="font-bold text-brown">Dũng & Linh 💕</div>
            <div className="text-[10px] text-peach-deep font-semibold">
              Kỷ niệm: còn 12 ngày
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsRoomModalOpen(true)}
          className="w-full py-1.5 px-2.5 rounded-xl bg-peach-soft hover:bg-peach/40 text-brown text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
        >
          <QrCode className="w-3.5 h-3.5 text-peach-deep" />
          <span>Mã QR & Link Sao lưu</span>
        </button>
      </div>
    </aside>
  );
}
