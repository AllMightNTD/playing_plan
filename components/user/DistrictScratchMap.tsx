"use client";

import React, { useEffect, useState } from "react";
import { useApp } from "@/context/AppContext";
import { HANOI_7_DISTRICTS, OTHER_DISTRICT_KEY } from "@/lib/districts";
import { cn } from "@/lib/utils";
import type { ScratchMapDto } from "@/server/services/user/gamification.service";

interface DistrictScratchMapProps {
  placeDistrictKey: string;
  placeName: string;
}

/**
 * Bản đồ cào 7 quận trong cẩm nang địa điểm: ô xếp theo vị trí địa lý (Bắc ở trên), tô quận của quán,
 * quận bạn đang đứng (IP/GPS) và các quận phòng đôi đã check-in (đã cào lớp nhũ bạc).
 */
export function DistrictScratchMap({ placeDistrictKey, placeName }: DistrictScratchMapProps) {
  const { homeSummary, userLocation } = useApp();
  const hasRoom = Boolean(homeSummary?.room);
  const [scratched, setScratched] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!hasRoom) {
      setScratched({});
      return;
    }
    let active = true;
    fetch("/api/v1/user/gamification/scratch-map", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        const map: ScratchMapDto | undefined = json?.data;
        if (active && map) setScratched(Object.fromEntries(map.districts.filter((d) => d.scratched).map((d) => [d.key, d.count])));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [hasRoom]);

  const userDistrictKey = userLocation?.districtKey ?? null;
  const isOutside = (key: string | null) => key === OTHER_DISTRICT_KEY;

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-3 grid-rows-3 gap-1.5 rounded-xl border border-[#CBB292] bg-[#F3E9D7] p-2">
        {/* Góc Tây Bắc: la bàn */}
        <div className="col-start-1 row-start-1 flex flex-col items-center justify-center text-paper-muted">
          <span className="text-lg leading-none">🧭</span>
          <span className="text-[10px] font-extrabold">N ↑ Hà Nội</span>
        </div>

        {HANOI_7_DISTRICTS.map((d) => {
          const isPlace = d.key === placeDistrictKey;
          const isUser = d.key === userDistrictKey;
          const checkins = scratched[d.key];
          return (
            <div
              key={d.key}
              style={{ gridColumnStart: d.grid[0], gridRowStart: d.grid[1] }}
              className={cn(
                "relative min-h-[58px] rounded-lg border p-1.5 text-[11px] transition",
                checkins
                  ? "bg-[#FAF4E8] border-brand-olive text-paper-ink"
                  : "bg-gradient-to-br from-stone-300 via-stone-400 to-stone-300 border-stone-500 text-stone-800",
                isPlace && "ring-2 ring-brand-terracotta ring-offset-1 ring-offset-[#F3E9D7] !bg-brand-peach !border-brand-terracotta !text-brand-terracottaDark"
              )}
            >
              <span className="font-extrabold block leading-tight">{d.name}</span>
              <span className="text-[10px] block">{checkins ? `✅ Đã đi ${checkins} lần` : "🪙 Chưa cào"}</span>
              <div className="absolute -top-2 -right-1.5 flex gap-0.5">
                {isPlace && (
                  <span className="bg-brand-terracotta text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full shadow animate-pulse">📍 Quán</span>
                )}
                {isUser && <span className="bg-emerald-600 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full shadow">🟢 Bạn</span>}
              </div>
            </div>
          );
        })}

        {/* Góc Đông Bắc: ngoài 7 quận nội thành */}
        <div
          className={cn(
            "col-start-3 row-start-1 relative min-h-[58px] rounded-lg border border-dashed p-1.5 text-[11px]",
            isOutside(placeDistrictKey) || isOutside(userDistrictKey)
              ? "bg-[#FFFDF9] border-brand-terracotta text-paper-ink"
              : "border-[#CBB292] text-paper-muted"
          )}
        >
          <span className="font-extrabold block leading-tight">Khu vực khác</span>
          <span className="text-[10px] block">Ngoài 7 quận</span>
          <div className="absolute -top-2 -right-1.5 flex gap-0.5">
            {isOutside(placeDistrictKey) && (
              <span className="bg-brand-terracotta text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full shadow">📍 Quán</span>
            )}
            {isOutside(userDistrictKey) && (
              <span className="bg-emerald-600 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full shadow">🟢 Bạn</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-paper-muted">
        <span>📍 {placeName}</span>
        {userLocation ? (
          <span>
            🟢 Bạn ở {userLocation.districtName}
            {userLocation.source === "ip" ? " (ước tính theo mạng)" : " (GPS)"}
          </span>
        ) : (
          <span>🟢 Chưa xác định được vị trí của bạn</span>
        )}
        <span>{hasRoom ? "✅ Quận hai bạn đã check-in được cào mở" : "🪙 Check-in để cào mở từng quận"}</span>
      </div>
    </div>
  );
}
