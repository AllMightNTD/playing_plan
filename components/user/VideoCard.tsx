"use client";

import React, { useState } from "react";
import Image from "next/image";
import type { VideoCatalogItem } from "@/server/services/user/videos.service";

interface VideoCardProps {
  video: VideoCatalogItem;
  onPlay: (video: VideoCatalogItem) => void;
  index?: number;
}

export function VideoCard({ video, onPlay, index = 0 }: VideoCardProps) {
  const [imgError, setImgError] = useState(false);

  // Thẻ thứ 2 có tem vé LIVE nghiêng theo demo
  const hasLiveTicket = index % 3 === 1;
  // Thẻ thứ 3 có sticker máy quay phim vẽ tay theo demo
  const hasCamSticker = index % 3 === 2;

  const fallbackThumb =
    "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=700&q=80";

  return (
    <div
      onClick={() => onPlay(video)}
      className="film-strip-card cursor-pointer group select-none"
    >
      <div className="film-sprockets-top" />
      <div className="film-sprockets-bottom" />

      {/* Tem vé LIVE nghiêng -12° */}
      {hasLiveTicket && (
        <div className="absolute -top-3.5 left-3 z-20 bg-[#D95338] text-white border-2 border-[#362721] px-2.5 py-0.5 rounded text-[11px] font-extrabold transform -rotate-12 shadow-md">
          🎟️ LIVE
        </div>
      )}

      {/* Sticker máy quay phim vẽ tay */}
      {hasCamSticker && (
        <div className="absolute -top-5 -left-2 z-20 transform -rotate-6 pointer-events-none">
          <svg className="w-12 h-12 drop-shadow" viewBox="0 0 48 48" fill="none">
            <circle cx="14" cy="14" r="7" fill="#D95338" stroke="#362721" strokeWidth="2.2" />
            <circle cx="28" cy="12" r="8" fill="#D95338" stroke="#362721" strokeWidth="2.2" />
            <rect
              x="10"
              y="20"
              width="24"
              height="16"
              rx="3"
              fill="#6E8361"
              stroke="#362721"
              strokeWidth="2.2"
            />
            <path
              d="M34 24L43 19V33L34 28V24Z"
              fill="#F29B7E"
              stroke="#362721"
              strokeWidth="2.2"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}

      <div className="relative rounded-md overflow-hidden aspect-[16/10] bg-[#362721]">
        <Image
          src={!imgError && video.thumbnailUrl ? video.thumbnailUrl : fallbackThumb}
          alt={video.title}
          fill
          unoptimized
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 360px"
          className="w-full h-full object-cover group-hover:scale-105 transition duration-500 opacity-90"
          onError={() => setImgError(true)}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        <span className="absolute top-2.5 right-2.5 bg-brand-terracotta text-white text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 shadow">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
          • LIVE
        </span>

        {/* Nút Play tròn giữa ảnh */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-white/90 text-brand-terracotta flex items-center justify-center shadow-lg group-hover:scale-110 transition">
            <svg className="w-5 h-5 ml-0.5 fill-current" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>

        {/* Thông tin mô tả bên dưới video */}
        <div className="absolute bottom-2.5 left-3 right-3 text-white">
          <span className="text-[10px] bg-white/20 backdrop-blur-xs px-2 py-0.5 rounded">
            {video.categoryLabel || "☕ Review"} • {video.location || "Hà Nội"}
          </span>
          <h3 className="font-bold text-sm mt-1 line-clamp-1">{video.title}</h3>
        </div>
      </div>
    </div>
  );
}

export function formatViews(views: number): string {
  if (views >= 1000000) {
    return (views / 1000000).toFixed(1) + "M";
  }
  if (views >= 1000) {
    return (views / 1000).toFixed(1) + "k";
  }
  return views.toString();
}

