"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import { HanoiPlace } from "@/lib/mock-data";
import { useApp } from "@/context/AppContext";

interface PlaceCardProps {
  place: HanoiPlace;
  compact?: boolean;
  index?: number;
  featured?: boolean;
}

export function PlaceCard({ place, compact = false, index = 0, featured }: PlaceCardProps) {
  const {
    isPlaceSaved,
    toggleSavePlace,
    setActiveDetailSlug,
    quickAddPlaceToPlan,
    isPlaceInUpcomingPlan,
  } = useApp();

  const [imgError, setImgError] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);

  const imageList = useMemo(() => {
    const imgs = (place.media || [])
      .filter((m) => m.type === "image" && m.url)
      .map((m) => ({ url: m.url, caption: m.caption }));
    if (imgs.length > 0) return imgs;
    if (place.coverUrl) return [{ url: place.coverUrl, caption: place.name }];
    return [];
  }, [place.media, place.coverUrl, place.name]);

  const currentPhoto = imageList[photoIndex] || imageList[0];
  const saved = isPlaceSaved(place.slug) || isPlaceSaved(place.id);
  const inSchedule = isPlaceInUpcomingPlan(place.id);

  // Xếp góc nghiêng & băng dính Washi theo mẫu demo
  const isFeatured = featured !== undefined ? featured : index % 3 === 1;
  const tiltClass =
    index % 3 === 0
      ? "polaroid-tilt-left"
      : index % 3 === 1
      ? "polaroid-tilt-center"
      : "polaroid-tilt-right";

  const washiClass =
    index % 3 === 0
      ? "washi-gingham-peach"
      : index % 3 === 2
      ? "washi-olive"
      : "";

  const handleOpenDetail = () => {
    setActiveDetailSlug(place.slug);
  };

  const bestTime = place.bestTimeText
    ? `Hợp đi lúc ${place.bestTimeText} nha`
    : "Hợp đi lúc 16:24 - 17:24 nha";

  const district = place.area?.split("-")[0]?.trim() || "Hà Nội";
  const price = place.costText || "50k - 150k";

  return (
    <article
      className={`polaroid-card ${tiltClass} ${isFeatured ? "featured-glow" : ""} flex flex-col justify-between group select-none`}
    >
      {/* Băng dính Washi dán góc ảnh */}
      {washiClass && <div className={`washi-tape ${washiClass}`} />}

      {/* Hiệu ứng Ngôi sao lấp lánh & Con dấu mộc nếu là thẻ nổi bật (Featured) */}
      {isFeatured && (
        <>
          <svg
            className="w-11 h-11 absolute -top-5 -left-4 z-20 sparkle-anim pointer-events-none"
            viewBox="0 0 48 48"
            fill="none"
          >
            <path
              d="M22 4L25 16L37 19L25 22L22 34L19 22L7 19L19 16L22 4Z"
              fill="#F9DC7E"
              stroke="#362721"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <path
              d="M38 28L39.5 33.5L45 35L39.5 36.5L38 42L36.5 36.5L31 35L36.5 33.5L38 28Z"
              fill="#FFFDF9"
              stroke="#362721"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
          </svg>

          <svg
            className="w-10 h-10 absolute -bottom-4 -right-3 z-20 sparkle-anim-delay pointer-events-none"
            viewBox="0 0 48 48"
            fill="none"
          >
            <path
              d="M24 8L27 19L38 22L27 25L24 36L21 25L10 22L21 19L24 8Z"
              fill="#F29B7E"
              stroke="#362721"
              strokeWidth="2"
              strokeLinejoin="round"
            />
          </svg>

          <div className="rubber-stamp">RECOMMENDED</div>

          <div className="absolute -bottom-3 right-3 z-20 bg-[#D95338] text-white border-2 border-[#362721] px-2.5 py-1 rounded-full font-extrabold text-xs tracking-wider shadow transform -rotate-6">
            HOT 🔥
          </div>
        </>
      )}

      {/* Sticker trái tim vẽ tay cho thẻ không featured */}
      {!isFeatured && (
        <div className="absolute -bottom-3 right-3 z-20 transform rotate-6 pointer-events-none">
          <svg className="w-9 h-9 drop-shadow-xs" viewBox="0 0 40 40" fill="none">
            <path
              d="M20 34C20 34 7 25 7 15C7 10.5 10.5 7 15 7C17.8 7 20 8.5 21 11C22 8.5 24.2 7 27 7C31.5 7 35 10.5 35 15C35 25 22 34 20 34Z"
              fill="#C84B31"
              stroke="#362721"
              strokeWidth="2"
            />
          </svg>
        </div>
      )}

      <div>
        {/* Khung ảnh trong thẻ Polaroid (Hỗ trợ lướt xem 3-5 góc ảnh Unsplash) */}
        <div
          onClick={handleOpenDetail}
          className="relative rounded overflow-hidden aspect-[16/10] bg-[#E5D1B8] cursor-pointer group/photo"
        >
          {currentPhoto?.url && !imgError ? (
            <Image
              key={currentPhoto.url}
              src={currentPhoto.url}
              alt={currentPhoto.caption || place.name}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 360px"
              className="object-cover group-hover:scale-105 transition duration-500"
              onError={() => setImgError(true)}
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl bg-brand-peach/40">
              {place.emoji || "📸"}
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/20 pointer-events-none" />

          {/* Nhãn thời gian gợi ý góc trên trái */}
          <div className="absolute top-2.5 left-2.5 bg-[#5F7355]/90 backdrop-blur-xs text-[#FAF4E8] text-[10.5px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 shadow z-10">
            <span>✨</span>
            <span>{bestTime}</span>
          </div>

          {/* Nút Thả Tim Lưu Yêu Thích góc trên phải */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleSavePlace(place.slug);
            }}
            className={`absolute top-2.5 right-2.5 w-8 h-8 rounded-full z-10 ${
              saved ? "bg-brand-terracotta text-white" : "bg-[#FFFDF9]/90 text-paper-ink"
            } flex items-center justify-center shadow hover:scale-110 transition active:scale-90`}
            title={saved ? "Bỏ lưu địa điểm" : "Lưu vào yêu thích"}
          >
            <svg
              className={`w-4 h-4 ${saved ? "fill-current" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          </button>

          {/* Nút lướt ảnh trái / phải (khi có nhiều hơn 1 ảnh) */}
          {imageList.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setPhotoIndex((prev) => (prev - 1 + imageList.length) % imageList.length);
                }}
                className="absolute left-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/45 hover:bg-black/75 text-white flex items-center justify-center opacity-0 group-hover/photo:opacity-100 transition z-10 text-sm font-bold shadow"
                aria-label="Góc ảnh trước"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setPhotoIndex((prev) => (prev + 1) % imageList.length);
                }}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/45 hover:bg-black/75 text-white flex items-center justify-center opacity-0 group-hover/photo:opacity-100 transition z-10 text-sm font-bold shadow"
                aria-label="Góc ảnh sau"
              >
                ›
              </button>

              {/* Dấu chấm tròn tiến trình ảnh */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 z-10 pointer-events-none">
                {imageList.map((_, dotIdx) => (
                  <span
                    key={dotIdx}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      dotIdx === photoIndex ? "w-3.5 bg-white shadow-xs" : "w-1.5 bg-white/50"
                    }`}
                  />
                ))}
              </div>
            </>
          )}

          {/* Nhãn Quận kèm Ghim Kẹp Giấy góc dưới trái */}
          <div className="absolute bottom-2.5 left-2.5 bg-[#E6D4BC]/95 border border-[#362721] text-paper-ink text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow z-10">
            <span>📎</span>
            <span>{district}</span>
          </div>

          {/* Badge góc ảnh ở góc dưới phải (nếu có từ 2 ảnh trở lên) */}
          {imageList.length > 1 && (
            <div className="absolute bottom-2.5 right-2.5 bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow z-10">
              <span>📷</span>
              <span>{photoIndex + 1}/{imageList.length}</span>
            </div>
          )}
        </div>

        {/* Nội dung chữ bên dưới tấm ảnh Polaroid */}
        <div className="mt-4 px-1">
          <h3
            onClick={handleOpenDetail}
            className="font-serif font-bold text-[18px] text-brand-terracottaDark hover:text-brand-terracotta cursor-pointer leading-snug line-clamp-1"
          >
            {place.name}
          </h3>
          <p className="text-xs text-paper-muted mt-1.5 line-clamp-2 leading-relaxed">
            {place.summary}
          </p>

          {/* Tags chi phí & chủ đề */}
          <div className="flex flex-wrap items-center gap-1.5 mt-3">
            <span className="bg-[#FADCD2] text-brand-terracottaDark text-[11px] font-bold px-2.5 py-0.5 rounded-full">
              {price}
            </span>
            {place.moodLabels?.slice(0, 2).map((tag, tIdx) => (
              <span
                key={tIdx}
                className="bg-[#EFE5D4] text-paper-ink text-[11px] font-medium px-2.5 py-0.5 rounded-full"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 2 Nút hành động: Cẩm nang & + Vào lịch */}
      <div className="grid grid-cols-12 gap-2 mt-4 pt-3 border-t border-dashed border-[#E2D5C1] px-1">
        <button
          onClick={handleOpenDetail}
          className="col-span-7 paper-btn py-2 px-3 text-xs font-bold flex items-center justify-center gap-1.5"
        >
          <span>📖 Cẩm nang</span>
        </button>
        <button
          onClick={() => quickAddPlaceToPlan(place)}
          className={`col-span-5 py-2 px-2.5 rounded text-xs font-bold border transition flex items-center justify-center gap-1 ${
            inSchedule
              ? "bg-brand-olive text-white border-brand-olive shadow-xs"
              : "bg-[#FAF0E1] hover:bg-brand-peach text-brand-terracottaDark border-[#D8C3A8]"
          }`}
        >
          <span>{inSchedule ? "✓ Đã vào lịch" : "+ Vào lịch"}</span>
        </button>
      </div>
    </article>
  );
}

