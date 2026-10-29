"use client";

import React, { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import { useApp } from "@/context/AppContext";

export function PlaceDetailModal() {
  const {
    activeDetailSlug,
    setActiveDetailSlug,
    places,
    toggleSavePlace,
    isPlaceSaved,
    quickAddPlaceToPlan,
    isPlaceInUpcomingPlan,
  } = useApp();

  const [activePhotoIdx, setActivePhotoIdx] = useState(0);

  const place = useMemo(() => {
    if (!activeDetailSlug) return null;
    return places.find((p) => p.slug === activeDetailSlug) || null;
  }, [places, activeDetailSlug]);

  useEffect(() => {
    setActivePhotoIdx(0);
  }, [activeDetailSlug]);

  const imageList = useMemo(() => {
    if (!place) return [];
    const imgs = (place.media || [])
      .filter((m) => m.type === "image" && m.url)
      .map((m) => ({
        url: m.url,
        caption: m.caption || "Góc chụp hẹn hò lãng mạn",
        credit: m.credit || "Unsplash",
      }));
    if (imgs.length > 0) return imgs;
    if (place.coverUrl) return [{ url: place.coverUrl, caption: place.name, credit: "Unsplash" }];
    return [];
  }, [place]);

  if (!activeDetailSlug || !place) return null;

  const saved = isPlaceSaved(place.slug) || isPlaceSaved(place.id);
  const inSchedule = isPlaceInUpcomingPlan(place.id);
  const activePhoto = imageList[activePhotoIdx] || imageList[0];

  const photoSpots =
    place.photoSpots && place.photoSpots.length > 0
      ? place.photoSpots.map((s) => (typeof s === "string" ? s : `${s.name}${s.tip ? ` (${s.tip})` : ""}`))
      : [
          "Góc chụp ngược nắng tự nhiên lúc chiều tà",
          "Khoảnh khắc nắm tay nhau cùng nhìn về một hướng",
          "Góc chụp phản chiếu qua khung cửa hoặc mặt nước",
        ];

  const posesText =
    place.poses && place.poses.length > 0
      ? place.poses.map((p) => (typeof p === "string" ? p : `${p.title}: ${p.desc}`)).join(". ")
      : "Đứng cạnh nhau cùng nhìn về một góc phố, hoặc tựa đầu vào vai nhau cười tự nhiên không nhìn ống kính.";

  const outfitDesc =
    place.outfit?.tonSurTon ||
    place.outfit?.weatherTip ||
    "Phong cách Vintage nhẹ nhàng: Váy tone be/kem cho nữ, sơ mi linen nâu nhạt cho nam.";

  const outfitColors: string[] = place.outfit?.palette || ["#FAF4E8", "#D9B99B", "#C84B31"];

  const district = place.area?.split("-")[0]?.trim() || "Hà Nội";
  const price = place.costText || "50k - 150k";

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-[#FAF4E8] border-2 border-[#CBB292] rounded-xl max-w-2xl w-full p-4 sm:p-6 relative shadow-2xl my-6 select-none max-h-[92vh] overflow-y-auto">
        {/* Băng dính Washi trang trí trên đỉnh Modal */}
        <div className="washi-tape washi-cream-top" />

        {/* Nút đóng tròn hoài niệm */}
        <button
          onClick={() => setActiveDetailSlug(null)}
          className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 w-9 h-9 rounded-full bg-[#E5D1B8] hover:bg-brand-terracotta hover:text-white text-paper-ink font-bold flex items-center justify-center transition shadow-sm z-30"
          aria-label="Đóng"
        >
          ✕
        </button>

        {/* BỘ SƯU TẬP ẢNH UNSPLASH ĐA GÓC NHÌN (Scrapbook Multi-Photo Gallery) */}
        <div className="space-y-2.5">
          {/* Khung ảnh chính góc chụp lớn */}
          <div className="relative w-full aspect-[16/10] sm:aspect-[16/9] max-h-72 sm:max-h-80 rounded-lg border-2 border-[#CBB292] overflow-hidden shadow-md bg-[#E5D1B8] group/gallery">
            {activePhoto?.url ? (
              <Image
                key={activePhoto.url}
                src={activePhoto.url}
                alt={activePhoto.caption || place.name}
                fill
                sizes="(max-width: 640px) 100vw, 680px"
                className="object-cover transition duration-300"
                unoptimized
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl">
                {place.emoji || "📸"}
              </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/30 pointer-events-none" />

            {/* Badge tiêu đề góc chụp */}
            <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-xs text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 shadow">
              <span>📷</span>
              <span className="truncate max-w-[220px] sm:max-w-xs">{activePhoto?.caption || "Góc chụp hẹn hò"}</span>
            </div>

            {/* Counter góc ảnh & nguồn Unsplash */}
            <div className="absolute top-3 right-14 bg-black/60 backdrop-blur-xs text-white text-[11px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow">
              <span>{activePhotoIdx + 1}/{imageList.length}</span>
              <span className="text-white/60">·</span>
              <span className="text-[#F9DC7E]">Unsplash HD</span>
            </div>

            {/* Nút lướt ảnh trái / phải */}
            {imageList.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setActivePhotoIdx((prev) => (prev - 1 + imageList.length) % imageList.length)}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center transition text-lg font-bold shadow-md active:scale-95 z-20"
                  aria-label="Góc ảnh trước"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={() => setActivePhotoIdx((prev) => (prev + 1) % imageList.length)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center transition text-lg font-bold shadow-md active:scale-95 z-20"
                  aria-label="Góc ảnh sau"
                >
                  ›
                </button>
              </>
            )}

            {/* Tác giả ảnh Unsplash */}
            {activePhoto?.credit && (
              <div className="absolute bottom-2.5 right-3 text-[10.5px] text-white/80 bg-black/40 px-2 py-0.5 rounded-full pointer-events-none">
                Ảnh: {activePhoto.credit}
              </div>
            )}
          </div>

          {/* Dải thumbnail xem nhanh 3-5 góc ảnh */}
          {imageList.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 scrollbar-thin">
              {imageList.map((photo, pIdx) => {
                const isSelected = pIdx === activePhotoIdx;
                return (
                  <button
                    key={pIdx}
                    type="button"
                    onClick={() => setActivePhotoIdx(pIdx)}
                    className={`relative shrink-0 w-20 sm:w-24 h-13 sm:h-15 rounded-md overflow-hidden border-2 transition ${
                      isSelected
                        ? "border-brand-terracotta ring-2 ring-brand-terracotta/40 scale-102 shadow"
                        : "border-[#CBB292] opacity-70 hover:opacity-100"
                    }`}
                  >
                    <Image
                      src={photo.url}
                      alt={photo.caption}
                      fill
                      sizes="96px"
                      className="object-cover"
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-black/10" />
                    <span className="absolute bottom-0.5 right-1 text-[9.5px] font-bold text-white bg-black/60 px-1 rounded">
                      Góc {pIdx + 1}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Thông tin cơ bản: Tên + Quận + Giá + Giờ đẹp */}
        <div className="mt-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="bg-brand-oliveLight text-brand-olive text-xs font-bold px-2.5 py-0.5 rounded-full">
              📍 {district}
            </span>
            <span className="bg-brand-peach text-brand-terracottaDark text-xs font-bold px-2.5 py-0.5 rounded-full">
              💰 {price}
            </span>
            {place.bestTimeText && (
              <span className="bg-[#FAF0E1] text-brand-terracotta text-xs font-bold px-2.5 py-0.5 rounded-full border border-brand-terracotta/30">
                ✨ {place.bestTimeText}
              </span>
            )}
            <span className="bg-[#EAE4D9] text-paper-ink text-[11px] font-semibold px-2 py-0.5 rounded-full">
              {imageList.length} góc ảnh Unsplash
            </span>
          </div>

          <h3 className="font-serif font-extrabold text-2xl text-paper-ink mt-2 leading-tight">
            {place.name}
          </h3>
          <p className="text-xs text-paper-muted mt-1 leading-relaxed">
            {place.summary}
          </p>
        </div>

        {/* Lưới 2 cột Scrapbook: Góc chụp & Bí kíp tạo dáng/OOTD */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
          {/* Cột 1: Góc chụp thần thánh */}
          <div className="bg-[#FFFDF9] border border-[#D8CBB8] rounded-lg p-4 shadow-2xs">
            <h4 className="font-bold text-sm text-brand-terracotta flex items-center gap-1.5">
              <span>📸</span>
              <span>Góc chụp &quot;thần thánh&quot;</span>
            </h4>
            <ul className="mt-2 space-y-1.5 text-xs text-paper-ink list-disc list-inside">
              {photoSpots.map((spot, idx) => (
                <li key={idx}>{spot}</li>
              ))}
            </ul>
          </div>

          {/* Cột 2: Bí kíp tạo dáng & Phối đồ đôi */}
          <div className="bg-[#F9EFC7]/70 border border-[#DFC98B] rounded-lg p-4 shadow-2xs flex flex-col justify-between">
            <div>
              <h4 className="font-bold text-sm text-paper-ink flex items-center gap-1.5">
                <span>👩❤️👨</span>
                <span>Cách tạo dáng tự nhiên</span>
              </h4>
              <p className="text-xs text-paper-ink mt-1.5 leading-relaxed">{posesText}</p>
            </div>

            <div className="mt-3 pt-2.5 border-t border-dashed border-[#D5BE7E]">
              <h4 className="font-bold text-xs text-paper-ink">👗 Gợi ý phối đồ đôi (OOTD):</h4>
              <p className="text-[11.5px] text-paper-muted mt-0.5">{outfitDesc}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[11px] font-semibold text-paper-ink">Tone màu hợp:</span>
                {outfitColors.map((color: string, cIdx: number) => (
                  <span
                    key={cIdx}
                    className="w-5 h-5 rounded-full border border-black/30 shadow-2xs inline-block"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Nút hành động chân modal */}
        <div className="mt-5 flex flex-wrap items-center justify-end gap-3 pt-3 border-t border-[#DED2C1]">
          <button
            onClick={() => toggleSavePlace(place.slug)}
            className="paper-btn px-4 py-2 text-xs font-bold"
          >
            {saved ? "♥ Đã lưu yêu thích" : "♡ Lưu vào sổ tay"}
          </button>
          <button
            onClick={() => quickAddPlaceToPlan(place)}
            className="bg-brand-terracotta hover:bg-brand-terracottaDark text-white px-5 py-2 rounded-md text-xs font-bold shadow transition active:scale-95"
          >
            {inSchedule ? "✓ Đã nằm trong lịch hẹn" : "+ Thêm vào lịch hẹn Chủ Nhật"}
          </button>
        </div>
      </div>
    </div>
  );
}
