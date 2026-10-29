"use client";

import React from "react";
import { useApp } from "@/context/AppContext";

/** Vị trí hiện tại dùng để tính khoảng cách tới quán + nút chuyển sang GPS cho chính xác hơn. */
export function LocationChip() {
  const { userLocation, isLocating, locateWithGps } = useApp();

  return (
    <div className="flex flex-wrap items-center gap-2 text-[11px]">
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#E4EFE0] border border-brand-olive/30 text-paper-ink font-semibold">
        {isLocating
          ? "📍 Đang xác định vị trí..."
          : userLocation
            ? `📍 Bạn ở ${userLocation.districtName}${userLocation.source === "ip" ? " (ước tính theo mạng)" : " (GPS)"}`
            : "📍 Chưa xác định được vị trí"}
      </span>
      {userLocation?.source !== "gps" && (
        <button
          type="button"
          onClick={locateWithGps}
          disabled={isLocating}
          className="font-bold text-brand-terracotta hover:underline disabled:opacity-50"
        >
          🎯 Dùng GPS chính xác hơn
        </button>
      )}
    </div>
  );
}
