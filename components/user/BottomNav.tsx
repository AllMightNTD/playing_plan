"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, Compass, Flame, CalendarHeart, Camera } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Trang chủ", href: "/", icon: Sparkles },
  { label: "Khám phá", href: "/explore", icon: Compass },
  { label: "Match", href: "/match", icon: Flame, isMatch: true },
  { label: "Kế hoạch", href: "/plans", icon: CalendarHeart },
  { label: "Kỷ niệm", href: "/memories", icon: Camera },
];

export function BottomNav() {
  const pathname = usePathname();
  const { matchedSlugs } = useApp();

  // Hide BottomNav on admin or desktop
  if (pathname.startsWith("/admin")) {
    return null;
  }

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-peach-soft px-2 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-lg select-none">
      <div className="max-w-md mx-auto flex items-center justify-around">
        {NAV_ITEMS.map((item) => {
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
                "flex flex-col items-center justify-center w-16 py-1 text-xs font-semibold rounded-2xl transition-all relative active:scale-95",
                isActive
                  ? "text-peach-deep font-bold"
                  : "text-brown-muted hover:text-brown"
              )}
            >
              <div
                className={cn(
                  "p-1 rounded-xl transition-colors relative",
                  isActive && "bg-peach-soft/80"
                )}
              >
                <Icon className={cn("w-5 h-5", isActive ? "stroke-[2.5]" : "stroke-2")} />

                {item.isMatch && matchedSlugs.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-peach-deep text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-white">
                    {matchedSlugs.length}
                  </span>
                )}
              </div>
              <span className="mt-0.5 text-[10px] tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
