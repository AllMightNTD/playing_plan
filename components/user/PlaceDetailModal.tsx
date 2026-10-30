"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { calculateHanoiTravelMinutes } from "@/lib/travel-time";
import { resolveDistrictKey } from "@/lib/districts";
import {
  getModalBackdropClasses,
  getModalShellClasses,
  getModalHeaderClasses,
  getModalBodyClasses,
  getModalFooterClasses,
} from "@/lib/modal-layout";
import { DistrictScratchMap } from "./DistrictScratchMap";
import { LocationChip } from "./LocationChip";

/** Mốc trung tâm để ước lượng thời gian di chuyển: Hồ Gươm. */
const CITY_CENTER = { lat: 21.0285, lng: 105.8542, name: "Hồ Gươm" };

type MapMode = "directions" | "google";

/** Cẩm nang địa điểm dạng modal: ảnh nhiều góc, góc chụp, tạo dáng, phối đồ, bản đồ và thêm vào lịch. */
export function PlaceDetailModal() {
  const {
    activeDetailSlug,
    setActiveDetailSlug,
    places,
    toggleSavePlace,
    isPlaceSaved,
    quickAddPlaceToPlan,
    isPlaceInUpcomingPlan,
    addToast,
    distanceToPlace,
  } = useApp();
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [mapMode, setMapMode] = useState<MapMode>("directions");
  const [activeSwatch, setActiveSwatch] = useState<string | null>(null);

  const place = useMemo(
    () => (activeDetailSlug ? places.find((p) => p.slug === activeDetailSlug) ?? null : null),
    [places, activeDetailSlug]
  );

  useEffect(() => {
    setActivePhotoIdx(0);
    setMapMode("directions");
    setActiveSwatch(null);
  }, [activeDetailSlug]);

  useEffect(() => {
    if (!activeDetailSlug) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActiveDetailSlug(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeDetailSlug, setActiveDetailSlug]);

  const gallery = useMemo(() => {
    if (!place) return [];
    const images = (place.media ?? [])
      .filter((m) => m.type === "image" && m.url)
      .map((m) => ({ url: m.url, caption: m.caption ?? null, credit: m.credit ?? null }));
    if (images.length > 0) return images;
    return place.coverUrl ? [{ url: place.coverUrl, caption: null, credit: null }] : [];
  }, [place]);

  if (!place) return null;

  const close = () => setActiveDetailSlug(null);
  const saved = isPlaceSaved(place.slug) || isPlaceSaved(place.id);
  const inSchedule = isPlaceInUpcomingPlan(place.id);
  const photo = gallery[activePhotoIdx] ?? gallery[0];
  const hasCoords = place.lat != null && place.lng != null;
  // Có vị trí người dùng thì tính từ đó, chưa có thì tính từ trung tâm (Hồ Gươm)
  const fromUser = distanceToPlace(place);
  const fromCenter = hasCoords ? calculateHanoiTravelMinutes(CITY_CENTER, { lat: place.lat!, lng: place.lng! }) : null;
  const travel = fromUser
    ? { minutes: fromUser.minutes, km: fromUser.km, from: "vị trí của bạn" }
    : fromCenter
      ? { minutes: fromCenter.travelMinutes, km: fromCenter.distanceKm * 1.35, from: CITY_CENTER.name }
      : null;
  const addressText = place.address || `${place.area}, Hà Nội`;
  const mapQuery = encodeURIComponent(hasCoords ? `${place.lat},${place.lng}` : `${place.name} ${addressText}`);
  const outfit = place.outfit;
  const hasOutfit = Boolean(outfit && (outfit.tonSurTon || outfit.contrast || outfit.avoid || outfit.weatherTip || outfit.palette.length > 0));
  const showPhoto = (idx: number) => setActivePhotoIdx((idx + gallery.length) % gallery.length);

  return (
    <div onClick={close} className={getModalBackdropClasses()}>
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={place.displayName || place.name}
        className={getModalShellClasses("lg")}
      >
        {/* Fixed Header */}
        <div className={getModalHeaderClasses()}>
          <div className="flex flex-col min-w-0 pr-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xl sm:text-2xl shrink-0" aria-hidden="true">{place.emoji}</span>
              <h3 className="font-serif font-extrabold text-base sm:text-xl text-paper-ink leading-tight truncate">
                {place.displayName || place.name}
              </h3>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              <span className="px-2 py-0.5 rounded-full text-[11px] sm:text-xs font-bold bg-[#DCE6D5] text-[#2F4F2F]">
                📍 {place.area}
              </span>
              {place.costText && (
                <span className="px-2 py-0.5 rounded-full text-[11px] sm:text-xs font-extrabold bg-[#FADCD2] text-brand-terracottaDark">
                  💰 {place.costText}
                </span>
              )}
              {place.bestTimeText && (
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[11px] sm:text-xs font-bold bg-[#FFF6EA] border border-brand-coral text-brand-terracotta">
                  ✨ {place.bestTimeText}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={close}
            className="shrink-0 w-11 h-11 sm:w-10 sm:h-10 min-w-[44px] min-h-[44px] rounded-full bg-[#E6D7C3] hover:bg-brand-terracotta hover:text-white text-paper-ink font-extrabold flex items-center justify-center transition"
            aria-label="Đóng"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Body */}
        <div className={getModalBodyClasses()}>
          {/* Phần 1: ảnh nhiều góc + thông tin nhanh */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            <div className="lg:col-span-7 space-y-2.5">
              <div className="relative h-52 sm:h-64 rounded-2xl overflow-hidden border-2 border-[#CBB292] bg-stone-900 shadow-md">
                {photo ? (
                  <Image src={photo.url} alt={photo.caption || place.name} fill sizes="(max-width: 1024px) 100vw, 520px" className="object-cover" unoptimized />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-5xl bg-brand-peach/40">{place.emoji}</div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/20 pointer-events-none" />
                {gallery.length > 0 && (
                  <span className="absolute top-3 left-3 bg-brand-terracotta text-white text-[11px] font-extrabold px-2.5 py-1 rounded-full shadow">
                    📷 Góc {activePhotoIdx + 1}/{gallery.length}
                  </span>
                )}
                {gallery.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => showPhoto(activePhotoIdx - 1)}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/55 hover:bg-brand-terracotta text-white font-bold flex items-center justify-center"
                      aria-label="Ảnh trước"
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      onClick={() => showPhoto(activePhotoIdx + 1)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/55 hover:bg-brand-terracotta text-white font-bold flex items-center justify-center"
                      aria-label="Ảnh sau"
                    >
                      ›
                    </button>
                  </>
                )}
                {(photo?.caption || photo?.credit) && (
                  <div className="absolute bottom-2.5 left-3 right-3 text-white">
                    {photo.caption && <p className="text-xs font-medium leading-snug drop-shadow">{photo.caption}</p>}
                    {photo.credit && <p className="text-[10px] text-white/75">Ảnh: {photo.credit}</p>}
                  </div>
                )}
              </div>
              {gallery.length > 1 && (
                <div className="grid grid-cols-4 gap-2">
                  {gallery.slice(0, 8).map((img, idx) => (
                    <button
                      key={img.url}
                      type="button"
                      onClick={() => setActivePhotoIdx(idx)}
                      className={`relative h-16 rounded-xl overflow-hidden border-2 transition ${
                        idx === activePhotoIdx ? "border-brand-terracotta ring-2 ring-brand-terracotta/40" : "border-[#D5C5B0] opacity-75 hover:opacity-100"
                      }`}
                      aria-label={`Xem góc ảnh ${idx + 1}`}
                    >
                      <Image src={img.url} alt="" fill sizes="120px" className="object-cover" unoptimized />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="lg:col-span-5 space-y-3">
              <p className="text-xs sm:text-sm text-paper-muted leading-relaxed">{place.summary}</p>

              <div className="bg-[#FFFDF9] border border-[#DECBB3] rounded-2xl p-3 space-y-2 text-xs shadow-2xs">
                <div className="flex items-start gap-2">
                  <span className="text-brand-terracotta font-bold shrink-0">🏠 Địa chỉ:</span>
                  <span className="font-semibold text-paper-ink">{addressText}</span>
                </div>
                {travel && (
                  <div className="flex items-start gap-2">
                    <span className="text-brand-olive font-bold shrink-0">🛵 Di chuyển:</span>
                    <span className="text-paper-muted">
                      ~{travel.minutes} phút từ {travel.from} ({travel.km.toFixed(1)} km, đã tính gửi xe)
                    </span>
                  </div>
                )}
                {place.bestTimeText && (
                  <div className="flex items-start gap-2 sm:hidden">
                    <span className="text-brand-terracotta font-bold shrink-0">✨ Giờ đẹp:</span>
                    <span className="text-paper-muted">{place.bestTimeText}</span>
                  </div>
                )}
                {place.tips && (
                  <div className="flex items-start gap-2">
                    <span className="text-brand-airmailBlue font-bold shrink-0">💡 Mẹo:</span>
                    <span className="text-paper-muted">{place.tips}</span>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5">
                {place.moodLabels.map((tag) => (
                  <span key={tag} className="text-[11px] font-semibold bg-[#EFE5D4] text-paper-ink px-2.5 py-1 rounded-full">
                    {tag}
                  </span>
                ))}
                {place.indoor && <span className="text-[11px] font-semibold bg-[#E4EEF5] text-brand-airmailBlue px-2.5 py-1 rounded-full">☔ Trong nhà</span>}
              </div>
            </div>
          </div>

          {/* Phần 2: góc chụp + tạo dáng & phối đồ */}
          {(place.photoSpots.length > 0 || place.poses.length > 0 || hasOutfit) && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-7 bg-[#FFFDF9] border border-[#DECBB3] rounded-2xl p-4 space-y-3 shadow-2xs">
                <h4 className="font-serif font-extrabold text-sm sm:text-base text-brand-terracotta">📸 Góc chụp &quot;thần thánh&quot; tại quán</h4>
                {place.photoSpots.length === 0 ? (
                  <p className="text-xs text-paper-muted">Quán này chưa có hướng dẫn góc chụp.</p>
                ) : (
                  <div className="space-y-2.5">
                    {place.photoSpots.map((spot) => (
                      <div key={spot.name} className="p-2.5 rounded-xl bg-[#FAF5EB] border border-[#E5D8C5] space-y-1">
                        <strong className="text-xs font-extrabold text-paper-ink block">{spot.name}</strong>
                        {spot.howToFind && <p className="text-xs text-paper-muted leading-snug">📍 {spot.howToFind}</p>}
                        {spot.tip && <p className="text-[11px] font-semibold text-brand-terracotta">💡 {spot.tip}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="md:col-span-5 bg-[#FAF2D6]/90 border border-[#E2CF9F] rounded-2xl p-4 flex flex-col space-y-3 shadow-2xs">
                {place.poses.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-serif font-extrabold text-sm sm:text-base text-paper-ink">👩‍❤️‍👨 Cách tạo dáng tự nhiên</h4>
                    <ul className="text-xs text-paper-ink leading-relaxed bg-[#FFFDF9]/80 p-3 rounded-xl border border-[#E5D6B0] space-y-1">
                      {place.poses.map((pose) => (
                        <li key={pose.title}>
                          <strong>{pose.title}:</strong> {pose.desc}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {hasOutfit && (
                  <div className="pt-2.5 border-t border-dashed border-[#D5C08E] space-y-2">
                    <h5 className="font-extrabold text-xs sm:text-sm text-paper-ink">👗 Gợi ý phối đồ đôi (OOTD):</h5>
                    {outfit.tonSurTon && <p className="text-xs text-paper-muted leading-snug">{outfit.tonSurTon}</p>}
                    {outfit.contrast && <p className="text-xs text-paper-muted leading-snug">🎨 {outfit.contrast}</p>}
                    {outfit.avoid && <p className="text-xs text-paper-muted leading-snug">🚫 Tránh: {outfit.avoid}</p>}
                    {outfit.weatherTip && <p className="text-xs text-paper-muted leading-snug">🌤️ {outfit.weatherTip}</p>}
                    {outfit.palette.length > 0 && (
                      <div className="flex items-center gap-2.5 pt-1">
                        <span className="text-xs font-bold text-paper-ink">Tone màu hợp:</span>
                        <div className="flex items-center gap-2">
                          {outfit.palette.map((hex) => (
                            <button
                              key={hex}
                              type="button"
                              onClick={() => setActiveSwatch(hex)}
                              title={hex}
                              aria-label={`Màu ${hex}`}
                              className={`w-7 h-7 rounded-full border-2 hover:scale-110 transition shadow-xs ${
                                activeSwatch === hex ? "border-paper-ink" : "border-paper-ink/30"
                              }`}
                              style={{ backgroundColor: hex }}
                            />
                          ))}
                        </div>
                        {activeSwatch && <code className="text-[11px] font-mono text-paper-muted">{activeSwatch}</code>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Phần 3: bản đồ & chỉ đường */}
          <div className="bg-[#FFFDF9] border-2 border-[#CBB292] rounded-2xl p-4 space-y-3 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="space-y-1">
                <h4 className="font-serif font-extrabold text-sm sm:text-base text-paper-ink">🗺️ Bản Đồ & Chỉ Đường Tới Quán</h4>
                <LocationChip />
              </div>
              {hasCoords && (
                <div className="flex items-center gap-1 bg-[#FAF4E8] p-1 rounded-xl border border-[#D8CBB8]">
                  {(
                    [
                      { key: "directions", label: "🧭 Chỉ đường" },
                      { key: "google", label: "🌍 Bản đồ Google Maps" },
                    ] as const
                  ).map((mode) => (
                    <button
                      key={mode.key}
                      type="button"
                      onClick={() => setMapMode(mode.key)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                        mapMode === mode.key ? "bg-brand-terracotta text-white" : "text-paper-ink hover:bg-[#EFE5D4]"
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-extrabold text-paper-ink">🪙 Bản đồ cào Hà Nội</span>
              <DistrictScratchMap placeDistrictKey={resolveDistrictKey(place.area)} placeName={place.name} />
            </div>

            {mapMode === "google" && hasCoords && (
              <div className="rounded-xl overflow-hidden border border-[#CBB292] h-52 bg-stone-200">
                <iframe
                  title={`Bản đồ ${place.name}`}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                  src={`https://maps.google.com/maps?q=${mapQuery}&z=16&output=embed`}
                />
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex flex-wrap items-center gap-3">
                {hasCoords && (
                  <span className="font-bold text-paper-ink">
                    🧭 Tọa độ GPS:{" "}
                    <code className="font-mono text-brand-terracotta">
                      {place.lat!.toFixed(5)}, {place.lng!.toFixed(5)}
                    </code>
                  </span>
                )}
                <span className="text-paper-muted">📍 {addressText}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(addressText);
                    addToast("📋 Đã sao chép địa chỉ quán!", "info");
                  }}
                  className="bg-[#FFFDF9] hover:bg-[#EFE5D4] border border-[#CBB292] text-paper-ink font-bold text-[11px] px-2.5 py-1.5 min-h-[36px] rounded-lg inline-flex items-center"
                >
                  📋 Copy địa chỉ
                </button>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-brand-airmailBlue hover:bg-slate-700 text-white font-bold text-[11px] px-3 py-1.5 min-h-[36px] rounded-lg inline-flex items-center gap-1"
                >
                  🚀 Mở Google Maps dẫn đường
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Action Footer */}
        <div className={getModalFooterClasses()}>
          <Link
            href={`/places/${place.slug}`}
            onClick={close}
            className="text-xs sm:text-sm font-bold text-brand-terracotta hover:underline"
          >
            📖 Mở cẩm nang chi tiết →
          </Link>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => toggleSavePlace(place.slug)}
              className={`flex-1 sm:flex-initial px-3.5 sm:px-4 py-2 sm:py-2.5 min-h-[44px] rounded-xl text-xs font-bold border transition flex items-center justify-center ${
                saved
                  ? "bg-brand-terracotta text-white border-brand-terracotta"
                  : "bg-[#FFFDF9] text-paper-ink border-[#CBB292] hover:border-brand-terracotta"
              }`}
            >
              {saved ? "♥ Đã lưu vào sổ tay" : "♡ Lưu vào sổ tay"}
            </button>
            <button
              type="button"
              onClick={() => quickAddPlaceToPlan(place)}
              disabled={inSchedule}
              className={`flex-1 sm:flex-initial px-3.5 sm:px-4 py-2 sm:py-2.5 min-h-[44px] rounded-xl text-xs font-bold transition flex items-center justify-center ${
                inSchedule
                  ? "bg-brand-olive text-white cursor-default"
                  : "bg-brand-terracotta hover:bg-brand-terracottaDark text-white shadow"
              }`}
            >
              {inSchedule ? "✓ Đã nằm trong lịch hẹn" : "+ Thêm vào lịch hẹn"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
