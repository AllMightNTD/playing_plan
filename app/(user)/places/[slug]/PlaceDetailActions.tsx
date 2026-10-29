"use client";

import React from "react";
import { useApp } from "@/context/AppContext";
import type { HanoiPlace } from "@/lib/types/catalog";
import { Heart, CalendarPlus, Navigation, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function PlaceDetailActions({ place }: { place: HanoiPlace }) {
  const { toggleSavePlace, isPlaceSaved, quickAddPlaceToPlan, addToast } = useApp();
  const saved = isPlaceSaved(place.slug);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `${place.name} - DateMate`,
        text: `Điểm hẹn hò siêu thơ cho hai đứa mình: ${place.name} 💕`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      addToast("🔗 Đã sao chép link địa điểm!", "success");
    }
  };

  const handleOpenMap = () => {
    const lat = place.lat ?? 21.0285;
    const lng = place.lng ?? 105.8542;
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="flex flex-wrap items-center gap-2.5 pt-2">
      <button
        onClick={() => quickAddPlaceToPlan(place)}
        className="px-5 py-2.5 rounded-2xl bg-white text-brown hover:bg-peach-soft font-bold text-xs shadow-md transition flex items-center gap-1.5"
      >
        <CalendarPlus className="w-4 h-4 text-peach-deep" />
        <span>+ Thêm vào lịch</span>
      </button>

      <button
        onClick={() => toggleSavePlace(place.slug)}
        className={cn(
          "px-4 py-2.5 rounded-2xl backdrop-blur-md font-bold text-xs border transition flex items-center gap-1.5",
          saved
            ? "bg-white text-red-500 border-white shadow-sm"
            : "bg-black/25 text-white hover:bg-black/40 border-white/30"
        )}
      >
        <Heart className={cn("w-4 h-4", saved && "fill-current")} />
        <span>{saved ? "Đã lưu" : "Lưu"}</span>
      </button>

      <button
        onClick={handleOpenMap}
        className="px-4 py-2.5 rounded-2xl bg-black/25 hover:bg-black/40 text-white backdrop-blur-md font-bold text-xs border border-white/30 transition flex items-center gap-1.5"
        title="Chỉ đường Google Maps"
      >
        <Navigation className="w-4 h-4" />
        <span>Chỉ đường</span>
      </button>

      <button
        onClick={handleShare}
        className="w-10 h-10 rounded-2xl bg-black/25 hover:bg-black/40 text-white backdrop-blur-md flex items-center justify-center border border-white/30 transition"
        title="Chia sẻ link cho người ấy"
      >
        <Share2 className="w-4 h-4" />
      </button>
    </div>
  );
}
