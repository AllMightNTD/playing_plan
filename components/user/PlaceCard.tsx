"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Heart } from "lucide-react";
import type { HanoiPlace } from "@/lib/types/catalog";
import { useApp } from "@/context/AppContext";

interface PlaceCardProps {
  place: HanoiPlace;
  index?: number;
  weatherBadge?: string;
  compact?: boolean;
}

/** Polaroid place card: supports both full magazine mode and compact 2-column mobile discovery feed mode. */
export const PlaceCard = React.memo(function PlaceCard({ place, weatherBadge, compact = false }: PlaceCardProps) {
  const { isPlaceSaved, toggleSavePlace, setActiveDetailSlug, quickAddPlaceToPlan, isPlaceInUpcomingPlan, distanceToPlace } = useApp();
  const distance = distanceToPlace(place);
  const [imgError, setImgError] = useState(false);
  const [showHeartBurst, setShowHeartBurst] = useState(false);
  const [heartPop, setHeartPop] = useState(false);
  const lastTapRef = React.useRef<number>(0);

  const photoCount = (place.media ?? []).filter((m) => m.type === "image" && m.url).length;
  const coverUrl = place.coverUrl || place.media?.find((m) => m.type === "image" && m.url)?.url;
  const hasMap = place.lat != null && place.lng != null;
  const saved = isPlaceSaved(place.slug) || isPlaceSaved(place.id);
  const inSchedule = isPlaceInUpcomingPlan(place.id);
  const openDetail = () => setActiveDetailSlug(place.slug);

  const triggerLikeCelebration = () => {
    setHeartPop(true);
    setTimeout(() => setHeartPop(false), 380);
  };

  const handleToggleLike = () => {
    triggerLikeCelebration();
    toggleSavePlace(place.slug);
  };

  const handleImageTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      // Double-tap detected: trigger heart burst & save if not already saved
      setShowHeartBurst(true);
      triggerLikeCelebration();
      if (!saved) {
        toggleSavePlace(place.slug);
      }
      setTimeout(() => setShowHeartBurst(false), 750);
      lastTapRef.current = 0;
      return;
    }
    lastTapRef.current = now;
    openDetail();
  };

  if (compact) {
    return (
      <article className="bg-[#FFFDF9] border-2 border-[#E2D6C5] rounded-2xl p-2 pb-2.5 shadow-xs flex flex-col justify-between select-none transition active:scale-[0.99] min-w-0">
        <div>
          <div
            onClick={handleImageTap}
            title="Chạm để xem cẩm nang • Chạm đúp để thả tim"
            className="relative aspect-[4/3] rounded-xl overflow-hidden cursor-pointer bg-stone-200 group"
          >
            {coverUrl && !imgError ? (
              <Image
                src={coverUrl}
                alt={place.name}
                fill
                sizes="(max-width: 640px) 48vw, 240px"
                className="object-cover group-hover:scale-105 transition duration-500"
                onError={() => setImgError(true)}
                unoptimized
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl bg-brand-peach/40">
                {place.emoji || "📍"}
              </div>
            )}

            {showHeartBurst && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-black/15 animate-in fade-in zoom-in-75 duration-200"
              >
                <span className="text-4xl drop-shadow-lg animate-bounce">💖</span>
              </div>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleToggleLike();
              }}
              aria-label={saved ? "Bỏ lưu địa điểm" : "Lưu vào yêu thích"}
              aria-pressed={saved}
              className={`absolute top-2 right-2 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-sm cursor-pointer ${
                saved
                  ? "bg-brand-terracotta text-white"
                  : "bg-[#FFFDF9]/90 backdrop-blur-xs text-paper-ink hover:bg-white"
              } ${heartPop ? "scale-125" : "scale-100"}`}
            >
              <Heart className={`w-3.5 h-3.5 ${saved ? "fill-current" : ""}`} />
            </button>

            {place.area && (
              <span className="absolute bottom-1.5 left-1.5 bg-black/70 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md max-w-[85%] truncate">
                📍 {place.area}
              </span>
            )}
          </div>

          <div className="mt-2 px-0.5 space-y-1">
            <h3
              onClick={openDetail}
              className="font-serif font-extrabold text-xs sm:text-sm text-paper-ink hover:text-brand-terracotta cursor-pointer line-clamp-1"
            >
              {place.emoji} {place.displayName || place.name}
            </h3>

            <div className="flex flex-wrap items-center gap-1 text-[10px]">
              {place.costText && (
                <span className="font-bold bg-[#FADCD2]/70 text-brand-terracottaDark px-1.5 py-0.5 rounded truncate max-w-full">
                  {place.costText}
                </span>
              )}
              {place.bestTimeText && (
                <span className="font-semibold bg-[#FAF4E8] border border-[#E2D5C1] text-paper-ink px-1.5 py-0.5 rounded truncate max-w-full">
                  🌅 {place.bestTimeText}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1.5 mt-2 pt-2 border-t border-dashed border-[#E5D8C5]">
          <button
            type="button"
            onClick={openDetail}
            className="min-h-9 bg-[#EFE5D4] hover:bg-[#E2D2B8] text-paper-ink font-bold text-[11px] py-1.5 px-2 rounded-lg transition cursor-pointer truncate"
          >
            📖 Cẩm nang
          </button>
          <button
            type="button"
            onClick={() => quickAddPlaceToPlan(place)}
            className={`min-h-9 font-bold text-[11px] py-1.5 px-2 rounded-lg transition active:scale-95 cursor-pointer truncate ${
              inSchedule
                ? "bg-brand-olive text-white"
                : "bg-brand-terracotta hover:bg-brand-terracottaDark text-white"
            }`}
          >
            {inSchedule ? "✓ Đã thêm" : "+ Vào lịch"}
          </button>
        </div>
      </article>
    );
  }

  return (
    <article className="polaroid-card flex flex-col justify-between select-none hover:rotate-0 transition-transform duration-300">
      <div>
        <div
          onClick={handleImageTap}
          title="Chạm để xem cẩm nang • Chạm đúp để thả tim"
          className="relative aspect-[16/11] rounded-xl overflow-hidden cursor-pointer bg-stone-200 group"
        >
          {coverUrl && !imgError ? (
            <Image
              src={coverUrl}
              alt={place.name}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 360px"
              className="object-cover group-hover:scale-105 transition duration-500"
              onError={() => setImgError(true)}
              unoptimized
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl bg-brand-peach/40">{place.emoji || "📍"}</div>
          )}

          {showHeartBurst && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-black/15 animate-in fade-in zoom-in-75 duration-200"
            >
              <span className="text-5xl drop-shadow-lg animate-bounce">💖</span>
            </div>
          )}

          {place.bestTimeText && (
            <span className="absolute top-2.5 left-2.5 bg-black/75 backdrop-blur-xs text-amber-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow flex items-center gap-1">
              <span>🌅</span>
              <span>{place.bestTimeText.replace(/^Hợp đi lúc\s*/i, "").replace(/\s*nha$/i, "").trim()}</span>
            </span>
          )}

          {/* Floating Glassmorphism Heart button on top-right */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleToggleLike();
            }}
            aria-label={saved ? "Bỏ lưu địa điểm" : "Lưu vào yêu thích"}
            aria-pressed={saved}
            className={`absolute top-2.5 right-2.5 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-sm cursor-pointer ${
              saved
                ? "bg-brand-terracotta text-white"
                : "bg-white/85 backdrop-blur-md text-paper-ink hover:bg-white"
            } ${heartPop ? "scale-125" : "scale-100"}`}
          >
            <Heart className={`w-3.5 h-3.5 ${saved ? "fill-current" : ""}`} />
          </button>

          {place.area && (
            <span className="absolute bottom-2 left-2 bg-black/75 backdrop-blur-xs text-white text-[10px] font-semibold px-2 py-0.5 rounded-md">
              📍 {place.area}
            </span>
          )}

          {distance && (
            <span className="absolute bottom-2 right-2 bg-black/75 backdrop-blur-xs text-emerald-200 text-[10px] font-semibold px-2 py-0.5 rounded-md">
              🛵 {distance.minutes}p ({distance.km.toFixed(1)}km)
            </span>
          )}
        </div>

        <div className="mt-2.5 cursor-pointer" onClick={openDetail}>
          <div className="flex items-baseline justify-between gap-2">
            <h3
              className="font-serif font-extrabold text-sm sm:text-base text-paper-ink hover:text-brand-terracotta transition leading-snug truncate"
            >
              {place.emoji} {place.displayName || place.name}
            </h3>
            {place.costText && (
              <span className="text-[11px] font-bold bg-[#FADCD2]/70 text-brand-terracottaDark px-2 py-0.5 rounded shrink-0">
                {place.costText}
              </span>
            )}
          </div>

          <p className="text-xs text-paper-muted mt-1 line-clamp-1">{place.summary}</p>

          <div className="flex flex-wrap gap-1.5 mt-2">
            {place.moodLabels?.slice(0, 2).map((tag) => (
              <span key={tag} className="text-[10px] bg-[#EFE6D8] text-paper-ink px-2 py-0.5 rounded-md font-medium">
                {tag}
              </span>
            ))}
            {weatherBadge && (
              <span className="text-[10px] font-bold bg-[#FAF0CA] text-brand-terracottaDark border border-brand-terracotta/30 px-2 py-0.5 rounded-md">
                {weatherBadge}
              </span>
            )}
            {place.indoor && !weatherBadge && (
              <span className="text-[10px] bg-[#E4EEF5] text-brand-airmailBlue px-2 py-0.5 rounded-md font-medium">
                ☔ Trong nhà
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-dashed border-[#E5D8C5]">
        <button
          type="button"
          onClick={openDetail}
          className="min-h-10 bg-[#EFE5D4] hover:bg-[#E2D2B8] text-paper-ink font-bold text-xs py-2 px-2.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-1 active:scale-98"
        >
          <span>📖 Cẩm nang</span>
        </button>
        <button
          type="button"
          onClick={() => quickAddPlaceToPlan(place)}
          className={`min-h-10 font-bold text-xs py-2 px-2.5 rounded-xl transition active:scale-98 flex items-center justify-center gap-1 cursor-pointer shadow-2xs truncate ${
            inSchedule
              ? "bg-brand-olive text-white ring-1 ring-brand-olive/40"
              : "bg-brand-terracotta hover:bg-brand-terracottaDark text-white"
          }`}
        >
          <span>{inSchedule ? "✓ Đã vào lịch" : "+ Vào lịch"}</span>
        </button>
      </div>
    </article>
  );
});
