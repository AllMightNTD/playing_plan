"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Play, Eye, MapPin, Sparkles, Youtube } from "lucide-react";
import type { VideoCatalogItem } from "@/server/services/user/videos.service";
import { cn } from "@/lib/utils";

interface VideoCardProps {
  video: VideoCatalogItem;
  onPlay: (video: VideoCatalogItem) => void;
}

export function formatViews(count: number): string {
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1)}M lượt xem`;
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(0)}k lượt xem`;
  }
  return `${count} lượt xem`;
}

export function VideoCard({ video, onPlay }: VideoCardProps) {
  return (
    <div className="group bg-white rounded-3xl overflow-hidden border border-peach-soft shadow-sm hover:shadow-peach transition-all duration-300 flex flex-col justify-between">
      {/* Thumbnail Container */}
      <div
        onClick={() => onPlay(video)}
        className="relative aspect-video w-full overflow-hidden bg-black/5 cursor-pointer"
      >
        <Image
          src={video.thumbnailUrl}
          alt={video.title}
          fill
          unoptimized
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 360px"
          className="object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-60 group-hover:opacity-40 transition-opacity duration-300" />

        {/* Play Button Icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-peach-deep/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:bg-peach-deep transition-all duration-300 backdrop-blur-sm">
            <Play className="w-5 h-5 fill-current ml-0.5" />
          </div>
        </div>

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
          <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[11px] font-bold flex items-center gap-1 shadow-sm">
            <span>{video.categoryLabel}</span>
            {video.location && <span className="text-white/70 font-medium">• {video.location}</span>}
          </span>

          {video.isRecommend && (
            <span className="px-2.5 py-1 rounded-full bg-peach-deep/90 text-white text-[10px] font-bold flex items-center gap-1 shadow-sm backdrop-blur-md">
              <Sparkles className="w-3 h-3" />
              <span>Đề xuất</span>
            </span>
          )}
        </div>

        {/* Bottom Metadata: Views */}
        <div className="absolute bottom-2.5 right-2.5 pointer-events-none">
          <span className="px-2 py-0.5 rounded-lg bg-black/70 backdrop-blur-sm text-white/90 text-[11px] font-medium flex items-center gap-1">
            <Eye className="w-3.5 h-3.5 text-white/80" />
            <span>{formatViews(video.viewCount)}</span>
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div className="space-y-1.5">
          {/* Creator Info */}
          <div className="flex items-center gap-1.5 text-xs text-brown-muted font-semibold">
            <span className="w-4 h-4 rounded-full bg-red-600 text-white flex items-center justify-center shrink-0">
              <Youtube className="w-2.5 h-2.5 fill-current" />
            </span>
            <span className="truncate">{video.channelTitle}</span>
          </div>

          {/* Title */}
          <h4
            onClick={() => onPlay(video)}
            className="font-display font-bold text-sm sm:text-base text-brown group-hover:text-peach-deep transition-colors line-clamp-2 cursor-pointer leading-snug"
            title={video.title}
          >
            {video.title}
          </h4>
        </div>

        {/* Linked Place Badge (if matched) */}
        {video.place ? (
          <Link
            href={`/places/${video.place.slug}`}
            className="mt-2 pt-2.5 border-t border-peach-soft/60 flex items-center justify-between text-xs group/place text-brown hover:text-peach-deep transition"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <MapPin className="w-3.5 h-3.5 text-peach-deep shrink-0" />
              <span className="font-bold truncate text-[12px]">{video.place.name}</span>
              <span className="text-brown-muted text-[11px] shrink-0">({video.place.area})</span>
            </div>
            <span className="text-[11px] font-bold text-peach-deep underline shrink-0 ml-1">
              Xem quán
            </span>
          </Link>
        ) : (
          <div className="mt-2 pt-2.5 border-t border-peach-soft/40 flex items-center justify-between text-[11px] text-brown-muted">
            <span className="truncate">{video.recommendReason || "Review ẩm thực & du lịch Hà Nội"}</span>
            <button
              onClick={() => onPlay(video)}
              className="font-bold text-peach-deep hover:underline shrink-0"
            >
              Xem video
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
