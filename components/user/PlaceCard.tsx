"use client";

import React from "react";
import { HanoiPlace } from "@/lib/mock-data";
import { useApp } from "@/context/AppContext";
import { Heart, BookOpen, Plus, Sun, MapPin, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlaceCardProps {
  place: HanoiPlace;
  compact?: boolean;
}

export function PlaceCard({ place, compact = false }: PlaceCardProps) {
  const { isPlaceSaved, toggleSavePlace, setActiveDetailSlug, addStopToPlan } = useApp();
  const saved = isPlaceSaved(place.slug);

  return (
    <div className="group bg-white rounded-3xl border border-peach-soft hover:border-peach/60 shadow-sm hover:shadow-peach transition-all duration-300 flex flex-col overflow-hidden relative">
      {/* Cover / Gradient Banner */}
      <div
        onClick={() => setActiveDetailSlug(place.slug)}
        className={cn(
          "w-full bg-gradient-to-br p-3.5 flex flex-col justify-between relative transition-transform duration-500 cursor-pointer overflow-hidden",
          place.coverGradient || "from-[#FF9E8D] to-[#C93F52]",
          compact ? "h-28" : "h-36 sm:h-40"
        )}
      >
        {/* Overlay subtle texture */}
        <div className="absolute inset-0 bg-black/10 mix-blend-overlay pointer-events-none" />

        {/* Top bar inside cover: Best Time Badge & Heart Action */}
        <div className="flex items-center justify-between z-10">
          <span className="px-2.5 py-1 rounded-full bg-sage text-white text-[11px] font-bold shadow-sm flex items-center gap-1">
            <span>✨ {place.bestTimeText}</span>
          </span>

          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleSavePlace(place.slug);
            }}
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 shadow-sm",
              saved
                ? "bg-peach-deep text-white scale-105"
                : "bg-white/90 text-brown hover:text-peach-deep hover:bg-white"
            )}
            title={saved ? "Bỏ lưu địa điểm" : "Lưu vào yêu thích"}
            aria-label="Yêu thích"
          >
            <Heart className={cn("w-4 h-4", saved ? "fill-current" : "")} />
          </button>
        </div>

        {/* Bottom banner: Area tag & Large Emoji */}
        <div className="flex items-end justify-between z-10">
          <span className="px-2.5 py-0.5 rounded-lg bg-black/45 backdrop-blur-sm text-white text-[11px] font-medium flex items-center gap-1">
            <MapPin className="w-3 h-3 text-peach" />
            <span>{place.area}</span>
          </span>
          <span className="text-3xl sm:text-4xl transform group-hover:scale-110 transition drop-shadow-sm select-none">
            {place.emoji}
          </span>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 flex-1 flex flex-col justify-between gap-3">
        <div>
          {/* Title & Area */}
          <div className="flex items-start justify-between gap-2">
            <h3
              onClick={() => setActiveDetailSlug(place.slug)}
              className="font-display font-extrabold text-base text-brown group-hover:text-peach-deep transition cursor-pointer line-clamp-1"
            >
              {place.name}
            </h3>
            <span className="text-[11px] text-brown-muted font-medium shrink-0 flex items-center gap-0.5 mt-0.5">
              <MapPin className="w-3 h-3 text-peach" />
              {place.area.split("-")[0].trim()}
            </span>
          </div>

          {/* Short summary */}
          <p className="text-xs text-brown-muted line-clamp-2 mt-1 leading-relaxed">
            {place.summary}
          </p>

          {/* Tags & Price */}
          <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
            <span className="text-[10px] px-2 py-0.5 rounded-lg bg-peach-soft text-peach-deep font-bold">
              {place.costText}
            </span>
            {place.moodLabels?.slice(0, 2).map((mood, idx) => (
              <span
                key={idx}
                className="text-[10px] px-2 py-0.5 rounded-lg bg-cream border border-peach-soft text-brown-muted font-medium"
              >
                #{mood}
              </span>
            ))}
          </div>
        </div>

        {/* Card Footer Actions */}
        <div className="pt-2 border-t border-peach-soft/70 flex items-center gap-2">
          <button
            onClick={() => setActiveDetailSlug(place.slug)}
            className="flex-1 py-2 px-3 rounded-xl bg-peach-soft/70 hover:bg-peach-soft text-brown font-bold text-xs transition flex items-center justify-center gap-1.5"
          >
            <BookOpen className="w-3.5 h-3.5 text-peach-deep" />
            <span>Cẩm nang</span>
          </button>

          <button
            onClick={() => addStopToPlan(place)}
            className="py-2 px-3 rounded-xl bg-cream hover:bg-peach-soft/50 border border-peach-soft text-peach-deep font-bold text-xs transition flex items-center justify-center gap-1"
            title="Thêm vào lịch trình"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Vào lịch</span>
          </button>
        </div>
      </div>
    </div>
  );
}
