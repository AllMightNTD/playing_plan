"use client";

import React, { useState } from "react";
import Image from "next/image";
import type { HanoiPlace } from "@/lib/types/catalog";
import { useApp } from "@/context/AppContext";

interface PlaceCardProps {
  place: HanoiPlace;
  index?: number;
}

/** Thẻ polaroid địa điểm: ảnh bìa, giờ đẹp, khu vực, tóm tắt, giá & mood, mở cẩm nang hoặc thêm vào lịch. */
export function PlaceCard({ place }: PlaceCardProps) {
  const { isPlaceSaved, toggleSavePlace, setActiveDetailSlug, quickAddPlaceToPlan, isPlaceInUpcomingPlan, distanceToPlace } = useApp();
  const distance = distanceToPlace(place);
  const [imgError, setImgError] = useState(false);

  const photoCount = (place.media ?? []).filter((m) => m.type === "image" && m.url).length;
  const coverUrl = place.coverUrl || place.media?.find((m) => m.type === "image" && m.url)?.url;
  const hasMap = place.lat != null && place.lng != null;
  const saved = isPlaceSaved(place.slug) || isPlaceSaved(place.id);
  const inSchedule = isPlaceInUpcomingPlan(place.id);
  const openDetail = () => setActiveDetailSlug(place.slug);

  return (
    <article className="polaroid-card flex flex-col justify-between select-none">
      <div className="washi-tape" />
      <div>
        <div onClick={openDetail} className="relative h-44 rounded-lg overflow-hidden cursor-pointer bg-stone-200 group">
          {coverUrl && !imgError ? (
            <Image
              src={coverUrl}
              alt={place.name}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 360px"
              className="object-cover group-hover:scale-105 transition duration-500"
              onError={() => setImgError(true)}
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl bg-brand-peach/40">{place.emoji || "📍"}</div>
          )}
          {place.bestTimeText && (
            <span className="absolute top-2.5 left-2.5 bg-brand-olive/95 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow max-w-[60%] truncate">
              ✨ {place.bestTimeText}
            </span>
          )}
          {(photoCount > 0 || hasMap) && (
            <span className="absolute top-2.5 right-2.5 bg-black/75 text-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
              {photoCount > 0 && `📷 ${photoCount} ảnh`}
              {photoCount > 0 && hasMap && " • "}
              {hasMap && "🗺️ Map"}
            </span>
          )}
          {place.area && (
            <span className="absolute bottom-2 left-2 bg-black/70 text-white text-[10px] font-semibold px-2 py-0.5 rounded">📍 {place.area}</span>
          )}
        </div>

        <div className="mt-3">
          <div className="flex items-start justify-between gap-2">
            <h3
              onClick={openDetail}
              className="font-serif font-extrabold text-base text-paper-ink hover:text-brand-terracotta cursor-pointer leading-snug"
            >
              {place.emoji} {place.displayName || place.name}
            </h3>
            <button
              type="button"
              onClick={() => toggleSavePlace(place.slug)}
              className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm transition ${
                saved ? "bg-brand-terracotta text-white" : "bg-[#EFE5D4] text-paper-ink hover:bg-brand-peach"
              }`}
              title={saved ? "Bỏ lưu" : "Lưu vào yêu thích"}
              aria-pressed={saved}
            >
              {saved ? "♥" : "♡"}
            </button>
          </div>
          <p className="text-xs text-paper-muted mt-1 line-clamp-2">{place.summary}</p>
          {distance && (
            <p className="text-[11px] font-semibold text-brand-olive mt-1">
              🛵 ~{distance.minutes} phút • {distance.km.toFixed(1)} km từ bạn
            </p>
          )}
          <div className="flex flex-wrap gap-1 mt-2">
            {place.costText && (
              <span className="text-[11px] font-bold bg-[#FADCD2]/70 text-brand-terracottaDark px-2 py-0.5 rounded">{place.costText}</span>
            )}
            {place.moodLabels?.slice(0, 3).map((tag) => (
              <span key={tag} className="text-[11px] bg-[#EFE6D8] text-paper-ink px-2 py-0.5 rounded">
                {tag}
              </span>
            ))}
            {place.indoor && <span className="text-[11px] bg-[#E4EEF5] text-brand-airmailBlue px-2 py-0.5 rounded">☔ Trong nhà</span>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-2 mt-3 pt-2.5 border-t border-dashed border-[#E5D8C5]">
        <button
          type="button"
          onClick={openDetail}
          className="col-span-3 bg-[#EFE5D4] hover:bg-[#E2D2B8] text-paper-ink font-bold text-xs py-2 rounded-lg"
        >
          📖 Cẩm nang & Bản đồ
        </button>
        <button
          type="button"
          onClick={() => quickAddPlaceToPlan(place)}
          className={`col-span-2 font-bold text-xs py-2 rounded-lg transition ${
            inSchedule ? "bg-brand-olive text-white" : "bg-brand-terracotta hover:bg-brand-terracottaDark text-white"
          }`}
        >
          {inSchedule ? "✓ Đã vào lịch" : "+ Vào lịch"}
        </button>
      </div>
    </article>
  );
}
