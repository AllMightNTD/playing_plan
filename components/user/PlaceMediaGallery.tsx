"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Camera, Video, ExternalLink, X, ChevronLeft, ChevronRight, Play, ShieldCheck } from "lucide-react";
import type { PlaceMediaItem } from "@/lib/types/catalog";
import { cn } from "@/lib/utils";

interface PlaceMediaGalleryProps {
  media: PlaceMediaItem[];
  placeName: string;
  coverUrl?: string;
}

export function PlaceMediaGallery({ media, placeName, coverUrl }: PlaceMediaGalleryProps) {
  // Chuẩn bị danh sách ảnh & video
  const images = media.filter((m) => m.type === "image");
  const videos = media.filter((m) => m.type === "video");

  // Nếu không có ảnh nào trong media nhưng có coverUrl, tạo 1 item ảnh bìa
  const effectiveImages: PlaceMediaItem[] =
    images.length > 0
      ? images
      : coverUrl
      ? [
          {
            id: "cover-img",
            type: "image",
            platform: "unsplash",
            url: coverUrl,
            caption: `Ảnh bìa ${placeName}`,
            credit: "DateMate Collection",
            license: "licensed",
            sortOrder: 0,
          },
        ]
      : [];

  const [activeTab, setActiveTab] = useState<"images" | "videos">(
    effectiveImages.length > 0 ? "images" : "videos"
  );
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);

  const activePhoto = selectedPhotoIndex !== null ? effectiveImages[selectedPhotoIndex] : null;

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedPhotoIndex === null) return;
    setSelectedPhotoIndex((selectedPhotoIndex - 1 + effectiveImages.length) % effectiveImages.length);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedPhotoIndex === null) return;
    setSelectedPhotoIndex((selectedPhotoIndex + 1) % effectiveImages.length);
  };

  const getAttributionUrl = (item: PlaceMediaItem) => {
    if (!item.sourceUrl) return null;
    if (item.platform === "unsplash") {
      const url = new URL(item.sourceUrl);
      url.searchParams.set("utm_source", "datemate");
      url.searchParams.set("utm_medium", "referral");
      return url.toString();
    }
    return item.sourceUrl;
  };

  if (effectiveImages.length === 0 && videos.length === 0) {
    return (
      <div className="p-6 rounded-2xl bg-white border border-peach-soft text-center text-brown-muted text-sm">
        <Camera className="w-8 h-8 mx-auto text-peach mb-2 opacity-60" />
        <p>Đang cập nhật thêm ảnh và video thực tế cho {placeName}.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header & Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {effectiveImages.length > 0 && (
            <button
              onClick={() => setActiveTab("images")}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5",
                activeTab === "images"
                  ? "bg-peach-deep text-white shadow-sm"
                  : "bg-white text-brown hover:bg-peach-soft/60 border border-peach-soft"
              )}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Ảnh minh họa ({effectiveImages.length})</span>
            </button>
          )}

          {videos.length > 0 && (
            <button
              onClick={() => setActiveTab("videos")}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5",
                activeTab === "videos"
                  ? "bg-peach-deep text-white shadow-sm"
                  : "bg-white text-brown hover:bg-peach-soft/60 border border-peach-soft"
              )}
            >
              <Video className="w-3.5 h-3.5" />
              <span>Video review ({videos.length})</span>
            </button>
          )}
        </div>

        <span className="text-[11px] text-brown-muted font-medium flex items-center gap-1 bg-cream px-2.5 py-1 rounded-full border border-peach-soft/60">
          <ShieldCheck className="w-3.5 h-3.5 text-sage-dark" />
          <span>🎨 Ảnh minh họa phong cách • Nguồn mở Unsplash & Wikimedia</span>
        </span>
      </div>

      {/* Tab 1: Danh sách ảnh dạng lưới */}
      {activeTab === "images" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {effectiveImages.map((img, idx) => (
            <div
              key={img.id || idx}
              onClick={() => setSelectedPhotoIndex(idx)}
              className="group relative aspect-[4/3] rounded-2xl overflow-hidden bg-peach-soft/40 border border-peach-soft cursor-pointer shadow-sm hover:shadow-md transition-all duration-300"
            >
              <Image
                src={img.url}
                alt={img.caption || `${placeName} - Ảnh ${idx + 1}`}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 280px"
                className="object-cover group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-2.5">
                <p className="text-white text-[11px] font-medium line-clamp-1">
                  {img.caption || placeName}
                </p>
                {img.credit && (
                  <p className="text-white/80 text-[10px] truncate">
                    📷 {img.credit}
                  </p>
                )}
              </div>
              <div className="absolute top-2 right-2 flex items-center gap-1">
                <span className="px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-white text-[9px] font-medium">
                  Minh họa
                </span>
                <span className="px-1.5 py-0.5 rounded-md bg-black/50 backdrop-blur-sm text-white text-[10px] font-medium opacity-90">
                  {idx + 1}/{effectiveImages.length}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 2: Video embeds */}
      {activeTab === "videos" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {videos.map((vid, idx) => (
            <div
              key={vid.id || idx}
              className="bg-white rounded-2xl overflow-hidden border border-peach-soft shadow-sm space-y-2 p-3"
            >
              {vid.platform === "youtube" && vid.embedId ? (
                <div className="relative aspect-video rounded-xl overflow-hidden bg-black">
                  <iframe
                    src={`https://www.youtube.com/embed/${vid.embedId}`}
                    title={vid.caption || `Video ${placeName}`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    loading="lazy"
                    className="w-full h-full border-0"
                  />
                </div>
              ) : vid.platform === "tiktok" ? (
                <div className="relative aspect-[9/16] max-h-80 mx-auto rounded-xl overflow-hidden bg-black flex flex-col items-center justify-center text-white p-4 text-center">
                  <Play className="w-12 h-12 text-peach mb-2" />
                  <p className="text-xs font-bold">{vid.caption || `Video review trên TikTok`}</p>
                  {vid.sourceUrl && (
                    <a
                      href={vid.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 px-3 py-1.5 rounded-full bg-white text-brown text-xs font-bold flex items-center gap-1 hover:bg-peach-soft transition"
                    >
                      <span>Xem trên TikTok</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              ) : (
                <div className="relative aspect-video rounded-xl overflow-hidden bg-peach-soft/50 flex items-center justify-center">
                  <a
                    href={vid.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-xl bg-peach-deep text-white text-xs font-bold flex items-center gap-2"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Xem video review</span>
                  </a>
                </div>
              )}

              <div className="text-xs space-y-0.5">
                <p className="font-bold text-brown line-clamp-1">{vid.caption || `Video review ${placeName}`}</p>
                {vid.credit && <p className="text-[11px] text-brown-muted">Tác giả: {vid.credit}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Attribution Bar (Điều khoản Unsplash & Wikimedia) */}
      <div className="p-3 rounded-2xl bg-cream border border-peach-soft/80 flex items-center justify-between text-[11px] text-brown-muted">
        <span>
          Ảnh/video phục vụ cẩm nang trải nghiệm cặp đôi.
        </span>
        <div className="flex items-center gap-2">
          {effectiveImages[0]?.platform === "unsplash" && (
            <a
              href="https://unsplash.com/?utm_source=datemate&utm_medium=referral"
              target="_blank"
              rel="noopener noreferrer"
              className="text-peach-deep font-bold hover:underline inline-flex items-center gap-0.5"
            >
              Unsplash Photos
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
          {effectiveImages.some((i) => i.platform === "wikimedia") && (
            <a
              href="https://commons.wikimedia.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-peach-deep font-bold hover:underline inline-flex items-center gap-0.5"
            >
              Wikimedia Commons
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>

      {/* Lightbox Modal phóng to ảnh */}
      {activePhoto && selectedPhotoIndex !== null && (
        <div
          onClick={() => setSelectedPhotoIndex(null)}
          className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl w-full max-h-[92vh] flex flex-col items-center"
          >
            {/* Top Bar inside Lightbox */}
            <div className="w-full flex items-center justify-between text-white pb-3 px-1">
              <span className="text-xs font-medium">
                {selectedPhotoIndex + 1} / {effectiveImages.length}
              </span>
              <button
                onClick={() => setSelectedPhotoIndex(null)}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
                aria-label="Đóng xem ảnh"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Photo Container */}
            <div className="relative w-full h-[62vh] sm:h-[72vh] flex items-center justify-center">
              <Image
                src={activePhoto.url}
                alt={activePhoto.caption || placeName}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 1024px"
                className="object-contain"
              />

              {/* Prev / Next controls */}
              {effectiveImages.length > 1 && (
                <>
                  <button
                    onClick={handlePrev}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/75 text-white flex items-center justify-center transition"
                    aria-label="Ảnh trước"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={handleNext}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/75 text-white flex items-center justify-center transition"
                    aria-label="Ảnh kế tiếp"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}
            </div>

            {/* Bottom Caption & Credit */}
            <div className="w-full pt-3 px-2 flex flex-col sm:flex-row sm:items-center justify-between text-white/90 gap-1 text-xs">
              <div className="space-y-0.5 max-w-xl">
                <p className="font-semibold text-white">
                  {activePhoto.caption || placeName}
                </p>
                {activePhoto.credit && (
                  <p className="text-white/70 text-[11px]">
                    Tác giả: {activePhoto.credit}
                    {activePhoto.licenseNote ? ` • ${activePhoto.licenseNote}` : ""}
                  </p>
                )}
              </div>

              {getAttributionUrl(activePhoto) && (
                <a
                  href={getAttributionUrl(activePhoto)!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-peach hover:underline text-[11px] font-bold shrink-0 mt-1 sm:mt-0"
                >
                  <span>Xem ảnh gốc</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
