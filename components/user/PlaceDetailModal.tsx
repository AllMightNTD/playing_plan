"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  X,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Copy,
  Navigation,
  Heart,
  Plus,
  ArrowRight,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import type { HanoiPlace } from "@/lib/types/catalog";
import { calculateHanoiTravelMinutes } from "@/lib/travel-time";
import { getModalBackdropClasses } from "@/lib/modal-layout";

/** Mốc trung tâm để ước lượng thời gian di chuyển: Hồ Gươm. */
const CITY_CENTER = { lat: 21.0285, lng: 105.8542, name: "Hồ Gươm" };

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
  const [remotePlace, setRemotePlace] = useState<HanoiPlace | null>(null);
  const [isLoadingRemote, setIsLoadingRemote] = useState(false);

  const localPlace = useMemo(
    () => (activeDetailSlug ? places.find((p) => p.slug === activeDetailSlug || p.id === activeDetailSlug) ?? null : null),
    [places, activeDetailSlug]
  );

  useEffect(() => {
    setActivePhotoIdx(0);
  }, [activeDetailSlug]);

  useEffect(() => {
    setRemotePlace(null);
    if (!activeDetailSlug || localPlace) {
      setIsLoadingRemote(false);
      return;
    }

    let active = true;
    setIsLoadingRemote(true);
    fetch(`/api/v1/user/places/${encodeURIComponent(activeDetailSlug)}`)
      .then((res) => {
        if (!res.ok) throw new Error("Place not found");
        return res.json();
      })
      .then((json) => {
        if (active && json?.data) {
          setRemotePlace(json.data);
        }
      })
      .catch((err) => {
        console.warn("Lỗi tải chi tiết địa điểm:", err);
      })
      .finally(() => {
        if (active) setIsLoadingRemote(false);
      });

    return () => {
      active = false;
    };
  }, [activeDetailSlug, localPlace]);

  useEffect(() => {
    if (!activeDetailSlug) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActiveDetailSlug(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeDetailSlug, setActiveDetailSlug]);

  const place = localPlace || remotePlace;

  const gallery = useMemo(() => {
    if (!place) return [];
    const images = (place.media ?? [])
      .filter((m) => m.type === "image" && m.url)
      .map((m) => ({ url: m.url, caption: m.caption ?? null, credit: m.credit ?? null }));
    if (images.length > 0) return images;
    return place.coverUrl ? [{ url: place.coverUrl, caption: null, credit: null }] : [];
  }, [place]);

  if (!place) {
    if (isLoadingRemote) {
      return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFDF9] border border-[#E2D6C5] rounded-3xl p-8 max-w-sm w-full text-center space-y-3 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="w-10 h-10 border-3 border-brand-terracotta border-t-transparent rounded-full animate-spin mx-auto" />
            <h4 className="font-serif font-bold text-base text-paper-ink">Đang mở cẩm nang hẹn hò...</h4>
            <p className="text-xs text-paper-muted">Đang nạp bí kíp góc chụp và thực đơn quán</p>
          </div>
        </div>
      );
    }
    return null;
  }

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
  const poiSearchText = `${place.name}, ${addressText}`;
  const mapEmbedQuery = encodeURIComponent(poiSearchText);
  const googleMapsNavUrl =
    place.googleMapsUrl ||
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(poiSearchText)}`;
  const outfit = place.outfit;
  const hasOutfit = Boolean(outfit && (outfit.tonSurTon || outfit.contrast || outfit.avoid || outfit.weatherTip || outfit.palette.length > 0));
  const showPhoto = (idx: number) => setActivePhotoIdx((idx + gallery.length) % gallery.length);

  return (
    <div
      onClick={close}
      className={`${getModalBackdropClasses()} !items-end sm:!items-center !p-0 sm:!p-4 md:!p-6`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={place.displayName || place.name}
        className="w-full max-w-4xl bg-[#FFFDF9] rounded-t-[2rem] sm:rounded-[2rem] border-t-2 sm:border-2 border-[#D8C7B0] shadow-[0_25px_60px_-15px_rgba(54,39,33,0.25)] overflow-hidden flex flex-col max-h-[93dvh] sm:max-h-[92vh] pb-[env(safe-area-inset-bottom,0px)] animate-in fade-in duration-200"
      >
        <div className="bg-[#FAF4E8] pt-2.5 sm:hidden shrink-0">
          <div
            aria-hidden="true"
            className="w-10 h-1.5 rounded-full bg-[#CBB292] mx-auto"
          />
        </div>
        {/* 1. HEADER MODAL */}
        <div className="px-6 pt-6 pb-4 border-b border-[#E2D6C5] flex items-start justify-between gap-4 bg-gradient-to-b from-[#FAF4E8] to-transparent shrink-0">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-2xl bg-brand-peach/80 text-brand-terracotta flex items-center justify-center text-lg shadow-xs">
                {place.emoji || "📸"}
              </span>
              <h2 className="font-serif text-2xl md:text-[26px] font-bold text-paper-ink tracking-tight">
                {place.displayName || place.name}
              </h2>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-brand-olive/10 text-brand-olive border border-brand-olive/25">
                📍 {place.area}
              </span>
              {place.costText && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200/60">
                  💰 {place.costText}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-brand-peach/50 text-brand-terracottaDark border border-brand-coral/40">
                ✨ {place.bestTimeText || "Hợp đi ngắm cảnh cùng người ấy"}
              </span>
            </div>
          </div>

          {/* Nút Đóng */}
          <button
            type="button"
            onClick={close}
            className="w-10 h-10 rounded-full bg-[#EFE5D4] hover:bg-brand-terracotta text-paper-ink hover:text-white flex items-center justify-center transition shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-terracotta cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. SCROLLABLE BODY */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* KHỐI TRÊN: GALLERY ẢNH (TRÁI 7 CỘT) & THÔNG TIN ĐỊA ĐIỂM (PHẢI 5 CỘT) */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            {/* Cột Trái: Carousel Ảnh */}
            <div className="md:col-span-7 space-y-3">
              <div className="relative rounded-2xl overflow-hidden aspect-[16/10] bg-stone-900 group shadow-xs border border-stone-200/60">
                {photo ? (
                  <Image
                    src={photo.url}
                    alt={photo.caption || place.name}
                    fill
                    sizes="(max-width: 1024px) 100vw, 560px"
                    className="object-cover transition duration-500"
                    unoptimized
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-5xl bg-rose-50">
                    {place.emoji || "✨"}
                  </div>
                )}

                {/* Badge Góc 1/N */}
                {gallery.length > 0 && (
                  <div className="absolute top-3.5 left-3.5 px-3 py-1 rounded-full bg-brand-terracotta/95 backdrop-blur-xs text-white text-xs font-bold shadow-xs flex items-center gap-1.5">
                    📸 Góc {activePhotoIdx + 1}/{gallery.length}
                  </div>
                )}

                {/* Nút điều hướng Trái/Phải */}
                {gallery.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => showPhoto(activePhotoIdx - 1)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-xs text-white flex items-center justify-center opacity-90 group-hover:opacity-100 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white cursor-pointer"
                      aria-label="Ảnh trước"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => showPhoto(activePhotoIdx + 1)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-xs text-white flex items-center justify-center opacity-90 group-hover:opacity-100 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white cursor-pointer"
                      aria-label="Ảnh sau"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}

                {/* Chú thích ảnh dưới đáy */}
                {(photo?.caption || photo?.credit || place.name) && (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent p-4 pt-10 text-white pointer-events-none">
                    <p className="text-xs md:text-sm font-semibold leading-snug drop-shadow-xs">
                      {photo?.caption || place.name}
                    </p>
                    {photo?.credit && (
                      <p className="text-[11px] text-stone-300 mt-0.5">Ảnh: {photo.credit}</p>
                    )}
                  </div>
                )}
              </div>

              {/* 4 Thumbnails */}
              {gallery.length > 1 && (
                <div className="grid grid-cols-4 gap-2.5">
                  {gallery.slice(0, 4).map((img, idx) => (
                    <button
                      key={img.url + idx}
                      type="button"
                      onClick={() => setActivePhotoIdx(idx)}
                      className={`rounded-xl overflow-hidden h-14 border-2 transition relative cursor-pointer ${
                        idx === activePhotoIdx
                          ? "border-brand-terracotta ring-2 ring-brand-peach"
                          : "border-transparent opacity-70 hover:opacity-100"
                      }`}
                      aria-label={`Góc ảnh ${idx + 1}`}
                    >
                      <Image
                        src={img.url}
                        alt=""
                        fill
                        sizes="120px"
                        className="object-cover"
                        unoptimized
                        referrerPolicy="no-referrer"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Cột Phải: Mô tả & Thẻ Thông tin */}
            <div className="md:col-span-5 flex flex-col justify-between space-y-4">
              <p className="text-sm text-paper-ink leading-relaxed font-medium bg-[#FAF4E8] p-3.5 rounded-2xl border border-[#E2D6C5] italic">
                &ldquo;{place.summary}&rdquo;
              </p>

              {/* Card Địa chỉ / Di chuyển / Mẹo */}
              <div className="bg-[#FFFDF9] rounded-2xl p-4 border border-[#E2D6C5] shadow-xs space-y-3.5 text-xs">
                <div className="flex items-start gap-3">
                  <span className="w-7 h-7 rounded-xl bg-brand-peach/60 text-brand-terracotta flex items-center justify-center shrink-0 mt-0.5 text-sm">
                    🏠
                  </span>
                  <div>
                    <span className="text-paper-muted font-semibold block text-[11px] uppercase tracking-wider">
                      Địa chỉ
                    </span>
                    <span className="font-bold text-paper-ink text-xs leading-snug">
                      {addressText}
                    </span>
                  </div>
                </div>

                <div className="h-px bg-[#EFE5D4]" />

                {travel && (
                  <>
                    <div className="flex items-start gap-3">
                      <span className="w-7 h-7 rounded-xl bg-brand-olive/15 text-brand-olive flex items-center justify-center shrink-0 mt-0.5 text-sm">
                        🛵
                      </span>
                      <div>
                        <span className="text-paper-muted font-semibold block text-[11px] uppercase tracking-wider">
                          Di chuyển
                        </span>
                        <span className="text-paper-ink leading-snug">
                          ~{travel.minutes} phút từ {travel.from}{" "}
                          <strong className="text-brand-olive">
                            ({travel.km.toFixed(1)} km, đã tính gửi xe)
                          </strong>
                        </span>
                      </div>
                    </div>
                    <div className="h-px bg-[#EFE5D4]" />
                  </>
                )}

                {place.tips && (
                  <div className="flex items-start gap-3">
                    <span className="w-7 h-7 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 mt-0.5 text-sm">
                      💡
                    </span>
                    <div>
                      <span className="text-paper-muted font-semibold block text-[11px] uppercase tracking-wider">
                        Mẹo nhỏ cho hai bạn
                      </span>
                      <span className="text-paper-ink leading-snug">{place.tips}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Tags Vibe */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-[11px] text-paper-muted font-semibold mr-1">Vibe:</span>
                {place.moodLabels.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 rounded-full bg-[#FAF4E8] border border-[#E2D6C5] hover:border-brand-coral hover:text-brand-terracotta text-paper-ink text-xs font-semibold transition cursor-default"
                  >
                    #{tag}
                  </span>
                ))}
                {place.indoor && (
                  <span className="px-3 py-1 rounded-full bg-sky-50 text-sky-700 text-xs font-semibold">
                    ☔ Trong nhà
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* DẢI CARD NGANG Ở GIỮA: TỌA ĐỘ GPS & GOOGLE MAPS DẪƯỜNG */}
          <div className="bg-[#FAF4E8] rounded-2xl p-4 border border-[#E2D6C5] shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              {hasCoords && (
                <span className="font-semibold text-paper-ink flex items-center gap-1.5">
                  <span>🧭</span> Tọa độ GPS:{" "}
                  <code className="font-mono text-brand-terracotta font-bold">
                    {place.lat!.toFixed(5)}, {place.lng!.toFixed(5)}
                  </code>
                </span>
              )}
              <span className="text-paper-muted flex items-center gap-1 truncate max-w-md">
                <MapPin className="w-3.5 h-3.5 text-paper-muted shrink-0" />
                {addressText}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(addressText);
                  addToast("📋 Đã sao chép địa chỉ quán!", "info");
                }}
                className="min-h-10 px-3 py-2 rounded-xl bg-[#FFFDF9] border border-[#D5C5B0] hover:border-brand-terracotta text-paper-ink font-semibold transition flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-terracotta cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy địa chỉ</span>
              </button>
              <a
                href={googleMapsNavUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-10 px-3.5 py-2 rounded-xl bg-brand-terracotta hover:bg-brand-terracottaDark text-white font-bold transition flex items-center gap-1.5 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-terracotta"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Mở Google Maps dẫn đường</span>
              </a>
            </div>
          </div>

          {/* KHỐI DƯỚI: 2 CỘT BENTO CÂN ĐỐI CHIỀU CAO */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
            {/* Cột Trái: Góc chụp thần thánh & Thời điểm đẹp */}
            <div className="bg-[#FFFDF9] rounded-2xl p-5 border border-[#E2D6C5] shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <h3 className="text-sm font-extrabold text-brand-terracottaDark flex items-center gap-2">
                    <span className="w-7 h-7 rounded-xl bg-brand-peach/60 flex items-center justify-center text-sm">
                      📸
                    </span>
                    Góc chụp &quot;thần thánh&quot; tại quán
                  </h3>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-brand-peach/60 text-brand-terracottaDark">
                    Must-try
                  </span>
                </div>

                {place.photoSpots.length === 0 ? (
                  <p className="text-xs text-paper-muted italic">
                    Quán này chưa có hướng dẫn góc chụp chi tiết.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {place.photoSpots.map((spot) => (
                      <div
                        key={spot.name}
                        className="bg-[#FAF4E8] rounded-xl p-3.5 border border-[#E2D6C5] space-y-1.5"
                      >
                        <div className="font-bold text-paper-ink text-xs md:text-sm">{spot.name}</div>
                        {spot.howToFind && (
                          <div className="flex items-center gap-1.5 text-xs text-paper-muted">
                            <span className="text-brand-terracotta">📍</span>
                            <span>{spot.howToFind}</span>
                          </div>
                        )}
                        {spot.tip && (
                          <div className="flex items-center gap-1.5 text-xs text-amber-800 bg-amber-50/80 px-2.5 py-1.5 rounded-lg border border-amber-200/50">
                            <span>☀️</span>
                            <span>{spot.tip}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Gợi ý tư thế & tạo dáng */}
              <div className="mt-4 pt-3.5 border-t border-[#EFE5D4]">
                <div className="text-xs font-bold text-paper-ink mb-2 flex items-center gap-1.5">
                  <span>💑</span> Cách tạo dáng tự nhiên cho hai bạn:
                </div>
                {place.poses.length > 0 ? (
                  <div className="space-y-1.5">
                    {place.poses.map((pose) => (
                      <p
                        key={pose.title}
                        className="text-xs text-paper-ink bg-brand-peach/25 border border-brand-coral/35 rounded-xl p-3 leading-relaxed"
                      >
                        <strong className="text-brand-terracottaDark">{pose.title}:</strong> {pose.desc}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-paper-ink bg-brand-peach/25 border border-brand-coral/35 rounded-xl p-3 leading-relaxed">
                    <strong className="text-brand-terracottaDark">Nắm tay đi dạo tự nhiên:</strong> Hai người vừa đi
                    vừa trò chuyện tự nhiên, chụp bắt khoảnh khắc cười rạng rỡ.
                  </p>
                )}
              </div>
            </div>

            {/* Cột Phải: Gợi ý phối đồ đôi (OOTD) & Lưu ý */}
            <div className="bg-gradient-to-br from-amber-50/70 via-[#FFFDF9] to-brand-peach/25 rounded-2xl p-5 border border-[#E2D6C5] shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <h3 className="text-sm font-extrabold text-amber-900 flex items-center gap-2">
                    <span className="w-7 h-7 rounded-xl bg-amber-100/80 flex items-center justify-center text-sm">
                      👗
                    </span>
                    Gợi ý phối đồ đôi (OOTD)
                  </h3>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100/80 text-amber-800">
                    Tone Hợp Cảnh
                  </span>
                </div>

                <div className="bg-[#FFFDF9] rounded-xl p-3.5 border border-[#E2D6C5] mb-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-paper-ink leading-snug">
                      {outfit?.tonSurTon || "Áo dài truyền thống, váy tiểu thư hoặc sơ mi kem"}
                    </span>
                    {outfit?.palette && outfit.palette.length > 0 && (
                      <div className="flex -space-x-1.5 shrink-0">
                        {outfit.palette.map((hex) => (
                          <span
                            key={hex}
                            className="w-4 h-4 rounded-full border border-stone-300 shadow-2xs"
                            style={{ backgroundColor: hex }}
                            title={hex}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  {outfit?.contrast ? (
                    <p className="text-xs text-paper-muted flex items-start gap-1.5">
                      <span>🎨</span>
                      <span>{outfit.contrast}</span>
                    </p>
                  ) : (
                    <p className="text-xs text-paper-muted flex items-start gap-1.5">
                      <span>🎨</span>
                      <span>
                        Tone trắng tinh khôi hoặc kem/be sẽ cực kỳ nổi bật trên nền ảnh hẹn hò.
                      </span>
                    </p>
                  )}
                </div>
              </div>

              {/* Checklist Lưu ý thời tiết & an toàn */}
              <div className="space-y-2 text-xs">
                <div className="flex items-start gap-2.5 bg-[#FFFDF9] px-3.5 py-2.5 rounded-xl border border-brand-coral/35 text-paper-ink">
                  <span className="text-brand-terracotta mt-0.5 shrink-0">🚫</span>
                  <span>
                    <strong className="text-brand-terracottaDark">Lưu ý nhỏ:</strong>{" "}
                    {outfit?.avoid || "Tránh trang phục cồng kềnh hoặc giày cao gót khó di chuyển."}
                  </span>
                </div>

                <div className="flex items-start gap-2.5 bg-[#FFFDF9] px-3.5 py-2.5 rounded-xl border border-amber-200/70 text-paper-ink">
                  <span className="text-amber-500 mt-0.5 shrink-0">🌤️</span>
                  <span>
                    <strong className="text-amber-900">Thời tiết lý tưởng:</strong>{" "}
                    {outfit?.weatherTip ||
                      "Buổi chiều hoàng hôn hoặc sáng sớm mát mẻ, nắng thu trong trẻo."}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. FOOTER ACTION BAR */}
        <div className="px-6 py-4 bg-[#FAF4E8] border-t border-[#E2D6C5] flex flex-wrap items-center justify-between gap-4 shrink-0">
          <Link
            href={`/places/${place.slug}`}
            onClick={close}
            className="text-xs md:text-sm font-bold text-brand-terracotta hover:text-brand-terracottaDark flex items-center gap-1.5 group transition"
          >
            <span>📖 Mở cẩm nang chi tiết</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => toggleSavePlace(place.slug)}
              aria-pressed={saved}
              className="min-h-11 px-4 py-2.5 rounded-xl bg-[#FFFDF9] border border-[#D5C5B0] hover:border-brand-terracotta hover:bg-brand-peach/30 text-xs font-bold text-paper-ink hover:text-brand-terracotta transition flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-terracotta cursor-pointer"
            >
              <Heart
                className={`w-4 h-4 ${saved ? "fill-brand-terracotta text-brand-terracotta" : "text-brand-terracotta"}`}
              />
              <span>{saved ? "Đã lưu vào sổ tay" : "Lưu vào sổ tay"}</span>
            </button>
            <button
              type="button"
              onClick={() => quickAddPlaceToPlan(place)}
              disabled={inSchedule}
              className={`min-h-11 px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-terracotta ${
                inSchedule
                  ? "bg-brand-olive text-white cursor-default"
                  : "bg-brand-terracotta hover:bg-brand-terracottaDark text-white shadow-xs cursor-pointer"
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>{inSchedule ? "Đã nằm trong lịch hẹn" : "Thêm vào lịch hẹn"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
