"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { X, MapPin, Youtube, ExternalLink, Calendar, Eye, ThumbsUp, Play, CalendarPlus } from "lucide-react";
import type { VideoCatalogItem } from "@/server/services/user/videos.service";
import type { VideoHotspot } from "@/server/services/user/video-hotspots.service";
import { useApp } from "@/context/AppContext";
import { formatViews } from "./VideoCard";

interface VideoPlayerModalProps {
  video: VideoCatalogItem | null;
  onClose: () => void;
}

export function VideoPlayerModal({ video, onClose }: VideoPlayerModalProps) {
  const { quickAddPlaceToPlan } = useApp();
  // Mốc địa điểm đã được admin duyệt; bấm mốc thì tua video tới đúng giây
  const [hotspots, setHotspots] = useState<VideoHotspot[]>([]);
  const [startSec, setStartSec] = useState(0);
  const [seekKey, setSeekKey] = useState(0);

  useEffect(() => {
    setHotspots([]);
    setStartSec(0);
    if (!video) return;
    let active = true;
    fetch(`/api/v1/user/videos/${encodeURIComponent(video.embedId)}/hotspots`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (active && Array.isArray(json?.data?.hotspots)) setHotspots(json.data.hotspots);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [video]);

  const seekTo = (seconds: number) => {
    setStartSec(seconds);
    setSeekKey((key) => key + 1);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (video) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [video, onClose]);

  if (!video) return null;

  const formattedDate = new Date(video.publishedAt).toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200 select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#FFFDF9] w-full max-w-3xl rounded-3xl overflow-hidden shadow-2xl border border-[#E6D7C3] flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 relative"
      >
        <div className="washi-tape washi-terracotta -top-3.5 left-10" />

        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E6D7C3] bg-[#FAF4E8]">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Youtube className="w-3 h-3 fill-current" />
            </span>
            <span className="font-bold text-xs text-paper-ink truncate">
              {video.channelTitle}
            </span>
            <span className="text-[11px] text-paper-muted">• {video.categoryLabel}</span>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#E6D7C3] hover:bg-brand-peach text-paper-ink flex items-center justify-center transition"
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Video Player */}
        <div className="relative aspect-video w-full bg-black">
          <iframe
            key={seekKey}
            src={`https://www.youtube.com/embed/${video.embedId}?autoplay=1&rel=0${startSec > 0 ? `&start=${startSec}` : ""}`}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            loading="lazy"
            className="w-full h-full border-0"
          />
        </div>

        {/* Details Section */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
          {/* Title & Stats */}
          <div className="space-y-2">
            <h3 className="font-serif font-extrabold text-base sm:text-lg text-paper-ink leading-snug">
              {video.title}
            </h3>

            <div className="flex flex-wrap items-center gap-3 text-xs text-paper-muted">
              <span className="flex items-center gap-1">
                <Eye className="w-3.5 h-3.5 text-brand-terracotta" />
                <span className="font-semibold text-paper-ink">{formatViews(video.viewCount)}</span>
              </span>

              {video.likeCount > 0 && (
                <span className="flex items-center gap-1">
                  <ThumbsUp className="w-3.5 h-3.5 text-brand-terracotta" />
                  <span>{video.likeCount.toLocaleString()} lượt thích</span>
                </span>
              )}

              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>{formattedDate}</span>
              </span>

              <a
                href={`https://www.youtube.com/watch?v=${video.embedId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-terracotta hover:underline flex items-center gap-1 font-semibold ml-auto"
              >
                <span>Xem trên YouTube</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Mốc địa điểm trong video (đã duyệt) */}
          {hotspots.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-brand-terracotta font-bold text-xs uppercase tracking-wide">
                <MapPin className="w-3.5 h-3.5" />
                <span>{hotspots.length} địa điểm trong video</span>
              </div>
              <div className="space-y-1.5">
                {hotspots.map((spot) => (
                  <div
                    key={spot.id}
                    className="flex items-center gap-2 p-2 rounded-xl bg-[#FAF4E8] border border-[#E6D7C3]"
                  >
                    <button
                      onClick={() => seekTo(spot.timestampSeconds)}
                      className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg bg-paper-ink text-white font-mono text-[11px] font-bold hover:bg-brand-terracotta transition"
                      title="Tua tới đoạn này"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      {spot.timeFormatted}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-xs text-paper-ink truncate">
                        {spot.emoji} {spot.placeName}
                      </div>
                      <div className="text-[11px] text-paper-muted truncate">
                        📍 {spot.area} • {spot.categoryLabel}
                      </div>
                    </div>
                    <Link
                      href={`/places/${spot.placeSlug}`}
                      onClick={onClose}
                      className="shrink-0 px-2 py-1 rounded-lg border border-brand-terracotta/40 text-brand-terracotta text-[11px] font-bold hover:bg-brand-peach/40"
                    >
                      Xem
                    </Link>
                    <button
                      onClick={() => quickAddPlaceToPlan(spot.placeId)}
                      className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg bg-brand-terracotta hover:bg-brand-terracottaDark text-white text-[11px] font-bold"
                      title="Thêm vào kế hoạch"
                    >
                      <CalendarPlus className="w-3 h-3" />
                      Lịch
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Linked Place CTA Box (if matched with an official place) */}
          {video.place && (
            <div className="bg-[#FAF4E8] border border-[#E6D7C3] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-brand-terracotta font-bold text-xs uppercase tracking-wide">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Địa điểm xuất hiện trong video</span>
                </div>
                <div className="font-serif font-extrabold text-paper-ink text-base">
                  {video.place.name}
                </div>
                <div className="text-xs text-paper-muted line-clamp-1">
                  {video.place.address}
                </div>
              </div>

              <Link
                href={`/places/${video.place.slug}`}
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-brand-terracotta hover:bg-brand-terracottaDark text-white font-bold text-xs transition shadow-2xs shrink-0 text-center"
              >
                Khám phá quán này →
              </Link>
            </div>
          )}

          {/* Description Snippet */}
          {video.description && (
            <div className="bg-[#FAF4E8]/60 border border-[#E6D7C3]/60 rounded-2xl p-3 text-xs text-paper-muted leading-relaxed max-h-32 overflow-y-auto whitespace-pre-line font-medium">
              {video.description}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
