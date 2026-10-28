"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { X, MapPin, Youtube, ExternalLink, Calendar, Eye, ThumbsUp } from "lucide-react";
import type { VideoCatalogItem } from "@/server/services/user/videos.service";
import { formatViews } from "./VideoCard";

interface VideoPlayerModalProps {
  video: VideoCatalogItem | null;
  onClose: () => void;
}

export function VideoPlayerModal({ video, onClose }: VideoPlayerModalProps) {
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
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-3xl rounded-3xl overflow-hidden shadow-2xl border border-peach-soft flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-peach-soft bg-[#FFF8F5]">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center shrink-0">
              <Youtube className="w-3 h-3 fill-current" />
            </span>
            <span className="font-bold text-xs text-brown truncate">
              {video.channelTitle}
            </span>
            <span className="text-[11px] text-brown-muted">• {video.categoryLabel}</span>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-peach-soft/60 hover:bg-peach-soft text-brown flex items-center justify-center transition"
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Video Player */}
        <div className="relative aspect-video w-full bg-black">
          <iframe
            src={`https://www.youtube.com/embed/${video.embedId}?autoplay=1&rel=0`}
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
            <h3 className="font-display font-extrabold text-base sm:text-lg text-brown leading-snug">
              {video.title}
            </h3>

            <div className="flex flex-wrap items-center gap-3 text-xs text-brown-muted">
              <span className="flex items-center gap-1">
                <Eye className="w-3.5 h-3.5 text-peach-deep" />
                <span className="font-semibold">{formatViews(video.viewCount)}</span>
              </span>

              {video.likeCount > 0 && (
                <span className="flex items-center gap-1">
                  <ThumbsUp className="w-3.5 h-3.5 text-peach-deep" />
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
                className="text-peach-deep hover:underline flex items-center gap-1 font-semibold ml-auto"
              >
                <span>Xem trên YouTube</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Linked Place CTA Box (if matched with an official place) */}
          {video.place && (
            <div className="bg-[#FFF2EC] border border-peach-deep/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-peach-deep font-bold text-xs uppercase tracking-wide">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Địa điểm xuất hiện trong video</span>
                </div>
                <div className="font-display font-extrabold text-brown text-base">
                  {video.place.name}
                </div>
                <div className="text-xs text-brown-muted line-clamp-1">
                  {video.place.address}
                </div>
              </div>

              <Link
                href={`/places/${video.place.slug}`}
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-peach-deep text-white font-bold text-xs hover:bg-peach-deep/90 transition shadow-sm shrink-0 text-center"
              >
                Khám phá quán này →
              </Link>
            </div>
          )}

          {/* Description Snippet */}
          {video.description && (
            <div className="bg-peach-soft/20 rounded-2xl p-3 text-xs text-brown-muted leading-relaxed max-h-32 overflow-y-auto whitespace-pre-line">
              {video.description}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
