"use client";

import React from "react";
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

  if (!activeDetailSlug) return null;

  const place = places.find((p) => p.slug === activeDetailSlug);
  if (!place) return null;

  const saved = isPlaceSaved(place.slug) || isPlaceSaved(place.id);
  const inSchedule = isPlaceInUpcomingPlan(place.id);

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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-[#FAF4E8] border-2 border-[#CBB292] rounded-xl max-w-2xl w-full p-5 sm:p-7 relative shadow-2xl my-8 select-none">
        {/* Băng dính Washi trang trí trên đỉnh Modal */}
        <div className="washi-tape washi-cream-top" />

        {/* Nút đóng tròn hoài niệm */}
        <button
          onClick={() => setActiveDetailSlug(null)}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-[#E5D1B8] hover:bg-brand-terracotta hover:text-white text-paper-ink font-bold flex items-center justify-center transition shadow-sm"
          aria-label="Đóng"
        >
          ✕
        </button>

        {/* Phần đầu: Ảnh + Thông tin cơ bản */}
        <div className="flex flex-col sm:flex-row gap-4 items-start">
          <div className="w-full sm:w-48 h-36 relative rounded-lg border-2 border-[#CBB292] overflow-hidden shadow shrink-0 bg-[#E5D1B8]">
            {place.coverUrl ? (
              <Image
                src={place.coverUrl}
                alt={place.name}
                fill
                sizes="(max-width: 640px) 100vw, 192px"
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl">
                {place.emoji || "📸"}
              </div>
            )}
          </div>

          <div>
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
            </div>

            <h3 className="font-serif font-extrabold text-2xl text-paper-ink mt-2 leading-tight">
              {place.name}
            </h3>
            <p className="text-xs text-paper-muted mt-1 leading-relaxed">
              {place.summary}
            </p>
          </div>
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
