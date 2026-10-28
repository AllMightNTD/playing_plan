"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useApp } from "@/context/AppContext";
import {
  X,
  Sun,
  Camera,
  Shirt,
  MapPin,
  Calendar,
  Heart,
  Navigation,
  Info,
  Check,
  AlertTriangle,
  ExternalLink,
  Images,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { PlaceMediaGallery } from "@/components/user/PlaceMediaGallery";

export function PlaceDetailModal() {
  const {
    activeDetailSlug,
    setActiveDetailSlug,
    places,
    toggleSavePlace,
    isPlaceSaved,
    addStopToPlan,
  } = useApp();

  const [activeTab, setActiveTab] = useState<"time" | "media" | "outfit" | "nearby">("time");
  const [outfitMode, setOutfitMode] = useState<"tonSurTon" | "contrast">("tonSurTon");

  if (!activeDetailSlug) return null;

  const place = places.find((p) => p.slug === activeDetailSlug);
  if (!place) return null;

  const saved = isPlaceSaved(place.slug);
  const nearbyPlaces = (place.nearbyIds || [])
    .map((id) => places.find((p) => p.id === id))
    .filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-cream w-full max-w-5xl max-h-[92dvh] rounded-t-3xl sm:rounded-3xl shadow-2xl border border-peach-soft overflow-hidden flex flex-col">
        {/* Top Header */}
        <div className="px-5 py-3.5 bg-white/90 border-b border-peach-soft flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-1 rounded-full bg-sage-light text-sage-dark text-xs font-bold flex items-center gap-1">
              <Sun className="w-3.5 h-3.5 text-sage-dark" />
              <span>{place.bestTimeText}</span>
            </span>
            <span className="text-xs font-semibold text-brown-muted">
              {place.area} • {place.costText}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Link
              href={`/places/${place.slug}`}
              target="_blank"
              className="w-8 h-8 rounded-full bg-peach-soft/70 hover:bg-peach-soft flex items-center justify-center text-brown transition"
              title="Mở trang đầy đủ (chia sẻ / SEO)"
            >
              <ExternalLink className="w-4 h-4" />
            </Link>

            <button
              onClick={() => setActiveDetailSlug(null)}
              className="w-8 h-8 rounded-full bg-peach-soft/70 hover:bg-peach-soft flex items-center justify-center text-brown transition"
              aria-label="Đóng"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal 2-column body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Hero media, SunCalc summary, quick actions */}
          <div className="lg:col-span-5 space-y-4">
            <div
              className={cn(
                "h-52 sm:h-56 rounded-3xl p-5 flex flex-col justify-between text-white shadow-peach relative overflow-hidden",
                place.coverGradient || "from-[#C93F52] via-[#FF9E8D] to-cream"
              )}
            >
              {place.coverUrl && (
                <Image
                  src={place.coverUrl}
                  alt={place.name}
                  fill
                  sizes="(max-width: 1024px) 100vw, 420px"
                  className="object-cover"
                  priority
                />
              )}

              {/* Multi-layer dark overlay */}
              <div
                className={cn(
                  "absolute inset-0 pointer-events-none",
                  place.coverUrl
                    ? "bg-gradient-to-t from-black/85 via-black/40 to-black/30"
                    : "bg-black/10 mix-blend-overlay"
                )}
              />

              <div className="flex items-center justify-between z-10">
                <span className="px-3 py-1 rounded-full bg-black/40 backdrop-blur-sm text-xs font-bold">
                  {place.categoryLabel}
                </span>
                <span className="text-4xl drop-shadow-md">{place.emoji}</span>
              </div>

              <div className="z-10">
                <h2 className="font-display font-extrabold text-2xl drop-shadow-sm">
                  {place.name}
                </h2>
                <p className="text-xs text-white/90 mt-1 line-clamp-2 leading-relaxed">
                  {place.summary}
                </p>
              </div>
            </div>

            {/* SunCalc Offline Box (F13) */}
            <div className="bg-white rounded-2xl p-4 border border-peach-soft space-y-2.5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-brown flex items-center gap-1.5">
                  <Sun className="w-4 h-4 text-peach-deep" />
                  <span>F13. Giờ đẹp tự tính (SunCalc Offline)</span>
                </span>
                <span className="text-[10px] font-mono text-sage-dark bg-sage-light px-2 py-0.5 rounded">
                  Asia/Ho_Chi_Minh
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2 rounded-xl bg-cream border border-peach-soft">
                  <div className="text-[10px] text-brown-muted">Giờ vàng sáng</div>
                  <div className="font-bold text-brown mt-0.5">{place.goldenMorning}</div>
                </div>
                <div className="p-2 rounded-xl bg-peach-soft/70 border border-peach">
                  <div className="text-[10px] text-peach-deep font-bold">Giờ vàng chiều</div>
                  <div className="font-bold text-peach-deep mt-0.5">{place.goldenAfternoon}</div>
                </div>
                <div className="p-2 rounded-xl bg-cream border border-peach-soft">
                  <div className="text-[10px] text-brown-muted">Giờ xanh</div>
                  <div className="font-bold text-brown mt-0.5">{place.blueHour}</div>
                </div>
              </div>
            </div>

            {/* Actions: Add to plan & Bookmark */}
            <div className="flex gap-2.5">
              <button
                onClick={() => {
                  addStopToPlan(place);
                  setActiveDetailSlug(null);
                }}
                className="flex-1 py-3 px-4 rounded-2xl bg-peach-deep hover:bg-peach-hover text-white font-display font-extrabold text-xs shadow-peach transition flex items-center justify-center gap-1.5"
              >
                <Calendar className="w-4 h-4" />
                <span>Thêm vào lịch hẹn ngay</span>
              </button>
              <button
                onClick={() => toggleSavePlace(place.slug)}
                className={cn(
                  "py-3 px-4 rounded-2xl font-bold text-xs transition flex items-center justify-center gap-1.5",
                  saved
                    ? "bg-peach-deep text-white"
                    : "bg-peach-soft hover:bg-peach text-brown"
                )}
              >
                <Heart className={cn("w-4 h-4", saved && "fill-current")} />
                <span>{saved ? "Đã lưu" : "Lưu lại"}</span>
              </button>
            </div>
          </div>

          {/* Right Column: Tabs (Chụp & Pose / Ảnh & Video / Phối đồ / Lưu ý & Gần đây) */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-4 sm:p-5 border border-peach-soft space-y-4 shadow-sm flex flex-col justify-between">
            {/* Tabs Header */}
            <div className="flex items-center gap-1.5 bg-cream p-1.5 rounded-2xl border border-peach-soft overflow-x-auto no-scrollbar">
              <button
                onClick={() => setActiveTab("time")}
                className={cn(
                  "flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 shrink-0",
                  activeTab === "time"
                    ? "bg-peach-deep text-white shadow-sm"
                    : "text-brown hover:bg-peach-soft/50"
                )}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Góc chụp & Pose</span>
              </button>

              <button
                onClick={() => setActiveTab("media")}
                className={cn(
                  "flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 shrink-0",
                  activeTab === "media"
                    ? "bg-peach-deep text-white shadow-sm"
                    : "text-brown hover:bg-peach-soft/50"
                )}
              >
                <Images className="w-3.5 h-3.5" />
                <span>Ảnh & Video ({place.media?.length || 0})</span>
              </button>

              <button
                onClick={() => setActiveTab("outfit")}
                className={cn(
                  "flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 shrink-0",
                  activeTab === "outfit"
                    ? "bg-peach-deep text-white shadow-sm"
                    : "text-brown hover:bg-peach-soft/50"
                )}
              >
                <Shirt className="w-3.5 h-3.5" />
                <span>Phối đồ đôi</span>
              </button>

              <button
                onClick={() => setActiveTab("nearby")}
                className={cn(
                  "flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 shrink-0",
                  activeTab === "nearby"
                    ? "bg-peach-deep text-white shadow-sm"
                    : "text-brown hover:bg-peach-soft/50"
                )}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Lưu ý & Gần đây</span>
              </button>
            </div>

            {/* Tab: Media Gallery */}
            {activeTab === "media" && (
              <div className="py-1">
                <PlaceMediaGallery
                  media={place.media || []}
                  placeName={place.name}
                  coverUrl={place.coverUrl}
                />
              </div>
            )}

            {/* Tab 1: Photo & Poses */}
            {activeTab === "time" && (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="p-3 rounded-2xl bg-sage-light/70 border border-sage/30">
                    <div className="font-bold text-sage-dark flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      <span>Ngày nên đi:</span>
                    </div>
                    <div className="text-brown mt-0.5">{place.bestWeekdays}</div>
                  </div>
                  <div className="p-3 rounded-2xl bg-peach-soft/50 border border-peach">
                    <div className="font-bold text-peach-deep flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Nên tránh:</span>
                    </div>
                    <div className="text-brown mt-0.5">{place.avoidWeekdays}</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-display font-extrabold text-sm text-brown">
                    Góc chụp đẹp nhất (Photo Spots):
                  </h4>
                  {place.photoSpots?.map((s, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-2xl bg-cream border border-peach-soft space-y-1"
                    >
                      <div className="font-bold text-brown">📍 {s.name}</div>
                      <div className="text-brown-muted">
                        <strong>Cách tìm:</strong> {s.howToFind}
                      </div>
                      <div className="text-peach-deep font-semibold">
                        💡 Mẹo ánh sáng: {s.tip}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <h4 className="font-display font-extrabold text-sm text-brown">
                    Gợi ý tạo dáng cặp đôi (Poses):
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {place.poses?.map((pose, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-2xl bg-[#FFF2EC] border border-peach-soft space-y-1"
                      >
                        <div className="font-bold text-brown">💑 {pose.title}</div>
                        <p className="text-brown-muted leading-relaxed">{pose.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Outfits */}
            {activeTab === "outfit" && (
              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="font-bold text-sm text-brown">
                    Bảng màu trang phục ăn ảnh nhất tại đây:
                  </span>
                  <div className="flex items-center gap-1.5">
                    {place.outfit?.palette.map((hex, idx) => (
                      <div
                        key={idx}
                        className="w-7 h-7 rounded-full border-2 border-white shadow-sm"
                        style={{ backgroundColor: hex }}
                        title={hex}
                      />
                    ))}
                  </div>
                </div>

                {/* Toggle Ton-sur-ton vs Contrast (F14) */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setOutfitMode("tonSurTon")}
                    className={cn(
                      "flex-1 py-2 px-3 rounded-xl font-bold border transition",
                      outfitMode === "tonSurTon"
                        ? "bg-peach-soft border-peach-deep text-peach-deep"
                        : "bg-cream border-peach-soft text-brown hover:bg-peach-soft/40"
                    )}
                  >
                    Chế độ 1: Đồng điệu (Ton-sur-ton)
                  </button>
                  <button
                    onClick={() => setOutfitMode("contrast")}
                    className={cn(
                      "flex-1 py-2 px-3 rounded-xl font-bold border transition",
                      outfitMode === "contrast"
                        ? "bg-peach-soft border-peach-deep text-peach-deep"
                        : "bg-cream border-peach-soft text-brown hover:bg-peach-soft/40"
                    )}
                  >
                    Chế độ 2: Tương phản nhẹ
                  </button>
                </div>

                <div className="p-4 rounded-2xl bg-cream border border-peach-soft space-y-2">
                  <div className="font-bold text-brown text-sm">
                    {outfitMode === "tonSurTon"
                      ? "✨ Gợi ý phối Đồng điệu:"
                      : "🎨 Gợi ý phối Tương phản nhẹ:"}
                  </div>
                  <p className="text-brown leading-relaxed">
                    {outfitMode === "tonSurTon"
                      ? place.outfit?.tonSurTon
                      : place.outfit?.contrast}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-1">
                  <div>
                    <strong>🚫 Nên tránh:</strong> {place.outfit?.avoid}
                  </div>
                  <div>
                    <strong>🌤️ Theo thời tiết hôm nay:</strong> {place.outfit?.weatherTip}
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Nearby & Tips */}
            {activeTab === "nearby" && (
              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-2xl bg-cream border border-peach-soft space-y-1.5">
                  <div className="font-bold text-sm text-brown">📌 Lưu ý gửi xe & vé:</div>
                  <p className="text-brown-muted leading-relaxed">{place.tips}</p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-display font-extrabold text-sm text-brown">
                    Gần đây có gì (Bán kính 1.5km - Tiện ghép chung lịch):
                  </h4>
                  <div className="space-y-2">
                    {nearbyPlaces.length > 0 ? (
                      nearbyPlaces.map((np) => (
                        <div
                          key={np?.id}
                          className="p-3 rounded-2xl bg-cream border border-peach-soft flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-2xl">{np?.emoji}</span>
                            <div>
                              <div className="font-bold text-brown">{np?.name}</div>
                              <div className="text-[11px] text-brown-muted">
                                {np?.area} • {np?.costText}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              if (np) addStopToPlan(np);
                              setActiveDetailSlug(null);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-peach-deep text-white font-bold text-xs"
                          >
                            + Ghép lịch
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-brown-muted">Không có địa điểm lân cận.</p>
                    )}
                  </div>
                </div>

                <div className="pt-2">
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      place.name + " Hà Nội"
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-peach-deep font-bold hover:underline"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>Mở chỉ đường trên Google Maps</span>
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
