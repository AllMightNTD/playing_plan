import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { HANOI_PLACES, HIDDEN_SAFETY_PLACE } from "@/lib/mock-data";
import { getAllPublishedPlaces, findPlaceBySlug } from "@/server/services/user/places.service";
import { getBestTimes } from "@/lib/sun";
import { Sun, Sparkles, AlertTriangle, ArrowLeft, Heart, CalendarPlus, MapPin, Camera, Shirt, Compass } from "lucide-react";
import { PlaceDetailActions } from "./PlaceDetailActions";

export const revalidate = 3600; // ISR 1 giờ

export async function generateStaticParams() {
  const places = await getAllPublishedPlaces();
  return places.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  if (slug === HIDDEN_SAFETY_PLACE.slug) {
    return {
      title: `${HIDDEN_SAFETY_PLACE.name} - Cảnh báo an toàn | DateMate`,
      description: HIDDEN_SAFETY_PLACE.warningMessage,
    };
  }

  const place = await findPlaceBySlug(slug);
  if (!place) {
    return {
      title: "Không tìm thấy địa điểm | DateMate",
    };
  }

  return {
    title: `${place.name} - Cẩm nang hẹn hò & giờ vàng chụp ảnh | DateMate`,
    description: `${place.summary} Khám phá giờ vàng chụp ảnh đẹp, gợi ý trang phục đôi và kinh nghiệm đi chơi tại ${place.area}, Hà Nội.`,
    openGraph: {
      title: `${place.name} - Hẹn hò cùng DateMate 💕`,
      description: place.summary,
      type: "article",
    },
  };
}

export default async function PlaceDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Xử lý địa điểm cảnh báo an toàn đường sắt (Mục 14.2)
  if (slug === HIDDEN_SAFETY_PLACE.slug) {
    const alternativePlaces = HANOI_PLACES.filter((p) =>
      HIDDEN_SAFETY_PLACE.alternatives.includes(p.slug)
    );

    return (
      <div className="max-w-3xl mx-auto space-y-6 py-6">
        <Link
          href="/explore"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-brown hover:text-peach-deep transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại Khám phá
        </Link>

        <div className="bg-red-50 border-2 border-red-200 rounded-3xl p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-3 text-red-600">
            <span className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </span>
            <div>
              <span className="px-2.5 py-0.5 rounded-full bg-red-200 text-red-800 text-[11px] font-bold uppercase tracking-wider">
                Cảnh báo an toàn
              </span>
              <h1 className="font-display font-extrabold text-xl sm:text-2xl text-red-900 mt-0.5">
                {HIDDEN_SAFETY_PLACE.name}
              </h1>
            </div>
          </div>

          <p className="text-sm text-red-900/90 leading-relaxed font-medium">
            {HIDDEN_SAFETY_PLACE.warningMessage}
          </p>

          <div className="pt-4 border-t border-red-200 space-y-3">
            <h3 className="font-display font-bold text-sm text-red-900">
              💡 Gợi ý địa điểm thay thế an toàn 100% ngắm tàu & hoàng hôn:
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {alternativePlaces.map((alt) => (
                <Link
                  key={alt.slug}
                  href={`/places/${alt.slug}`}
                  className="p-4 rounded-2xl bg-white border border-red-200 hover:border-peach-deep hover:shadow-md transition group"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{alt.emoji}</span>
                    <div>
                      <h4 className="font-bold text-sm text-brown group-hover:text-peach-deep transition">
                        {alt.name}
                      </h4>
                      <span className="text-xs text-brown-muted">📍 {alt.area}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const place = await findPlaceBySlug(slug);
  if (!place) {
    notFound();
  }

  // Tính giờ vàng chính xác theo tọa độ
  const lat = place.lat ?? 21.0285;
  const lng = place.lng ?? 105.8542;
  const sunTimes = getBestTimes(lat, lng);

  const nearbyPlaces = (place.nearbyIds || [])
    .map((id) => HANOI_PLACES.find((p) => p.id === id || p.slug === id))
    .filter((p): p is typeof HANOI_PLACES[0] => Boolean(p));

  return (
    <div className="max-w-5xl mx-auto space-y-8 py-2 sm:py-6">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/explore"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-brown hover:text-peach-deep transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Khám phá Hà Nội
        </Link>
        <span className="px-3 py-1 rounded-full bg-peach-soft text-peach-deep text-xs font-bold">
          {place.categoryLabel}
        </span>
      </div>

      {/* Hero Section */}
      <div
        className={`rounded-3xl bg-gradient-to-br ${place.coverGradient} p-6 sm:p-10 text-white shadow-xl relative overflow-hidden`}
      >
        <div className="relative z-10 space-y-4 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-black/30 backdrop-blur-md text-xs font-bold">
              📍 {place.area}
            </span>
            <span className="px-3 py-1 rounded-full bg-black/30 backdrop-blur-md text-xs font-bold">
              💰 {place.costText}
            </span>
          </div>
          <h1 className="font-display font-extrabold text-2xl sm:text-4xl leading-tight">
            {place.emoji} {place.name}
          </h1>
          <p className="text-sm sm:text-base text-white/95 leading-relaxed">
            {place.summary}
          </p>

          <PlaceDetailActions place={place} />
        </div>
      </div>

      {/* Main Grid: Cẩm nang chi tiết */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Giờ vàng (F13) & Mẹo */}
        <div className="lg:col-span-5 space-y-6">
          {/* F13. Giờ đẹp SunCalc */}
          <div className="bg-white rounded-3xl p-6 border border-peach-soft shadow-sm space-y-4">
            <div className="flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-2xl bg-peach-soft text-peach-deep flex items-center justify-center">
                <Sun className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-display font-extrabold text-base text-brown">
                  Nên đi khi nào?
                </h3>
                <p className="text-xs text-brown-muted">Tính theo quỹ đạo mặt trời Hà Nội (SunCalc)</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#FFF9F5] border border-peach-soft text-xs text-peach-deep font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>{place.bestTimeText}</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-cream border border-peach-soft">
                <span className="text-[11px] text-brown-muted font-medium">Giờ vàng sáng:</span>
                <p className="font-bold text-brown mt-0.5">{sunTimes.goldenHourMorning.start} - {sunTimes.goldenHourMorning.end}</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-cream border border-peach-soft">
                <span className="text-[11px] text-brown-muted font-medium">Giờ vàng chiều:</span>
                <p className="font-bold text-brown mt-0.5">{sunTimes.goldenHourEvening.start} - {sunTimes.goldenHourEvening.end}</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-cream border border-peach-soft">
                <span className="text-[11px] text-brown-muted font-medium">Giờ xanh (Blue Hour):</span>
                <p className="font-bold text-brown mt-0.5">{sunTimes.blueHour.start} - {sunTimes.blueHour.end}</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-cream border border-peach-soft">
                <span className="text-[11px] text-brown-muted font-medium">Hoàng hôn:</span>
                <p className="font-bold text-brown mt-0.5">{sunTimes.sunset}</p>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-peach-soft text-xs text-brown">
              <div className="flex items-start gap-2">
                <span className="font-bold text-sage-dark shrink-0">✅ Nên đi:</span>
                <span>{place.bestWeekdays}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-peach-deep shrink-0">⚠️ Nên tránh:</span>
                <span>{place.avoidWeekdays}</span>
              </div>
            </div>
          </div>

          {/* Lưu ý & Mẹo bỏ túi */}
          {place.tips && (
            <div className="bg-white rounded-3xl p-6 border border-peach-soft shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-brown font-display font-bold text-sm">
                <Compass className="w-4 h-4 text-peach-deep" />
                <span>Mẹo nhỏ từ cặp đôi đi trước:</span>
              </div>
              <p className="text-xs text-brown/90 leading-relaxed bg-cream p-4 rounded-2xl border border-peach-soft">
                {place.tips}
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Chụp ảnh & Trang phục (F14) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Góc chụp & Dáng pose */}
          <div className="bg-white rounded-3xl p-6 border border-peach-soft shadow-sm space-y-4">
            <div className="flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-2xl bg-peach-soft text-peach-deep flex items-center justify-center">
                <Camera className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-display font-extrabold text-base text-brown">
                  Chụp thế nào cho thơ?
                </h3>
                <p className="text-xs text-brown-muted">Góc chụp đắt giá và tư thế pose đôi tự nhiên</p>
              </div>
            </div>

            {/* Photo Spots */}
            {place.photoSpots && place.photoSpots.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-brown uppercase tracking-wider">
                  📸 Góc chụp đẹp:
                </h4>
                <div className="space-y-2.5">
                  {place.photoSpots.map((spot, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-2xl bg-cream border border-peach-soft space-y-1 text-xs"
                    >
                      <div className="font-bold text-brown">{spot.name}</div>
                      <div className="text-brown-muted">📍 {spot.howToFind}</div>
                      <div className="text-peach-deep font-medium">💡 Mẹo: {spot.tip}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Poses */}
            {place.poses && place.poses.length > 0 && (
              <div className="space-y-3 pt-3 border-t border-peach-soft">
                <h4 className="text-xs font-bold text-brown uppercase tracking-wider">
                  👫 Dáng pose đôi gợi ý:
                </h4>
                <div className="space-y-2.5">
                  {place.poses.map((pose, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-2xl bg-[#FFF9F5] border border-peach-soft space-y-1 text-xs"
                    >
                      <div className="font-bold text-peach-deep">{pose.title}</div>
                      <div className="text-brown/90 leading-relaxed">{pose.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Gợi ý trang phục đôi (F14) */}
          {place.outfit && (
            <div className="bg-white rounded-3xl p-6 border border-peach-soft shadow-sm space-y-4">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-2xl bg-peach-soft text-peach-deep flex items-center justify-center">
                  <Shirt className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-display font-extrabold text-base text-brown">
                    Mặc gì cho đẹp đôi?
                  </h3>
                  <p className="text-xs text-brown-muted">Bảng màu và phong cách hợp với bối cảnh</p>
                </div>
              </div>

              {/* Palette */}
              {place.outfit.palette && place.outfit.palette.length > 0 && (
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-bold text-brown">Bảng màu gợi ý:</span>
                  <div className="flex items-center gap-2">
                    {place.outfit.palette.map((color, idx) => (
                      <span
                        key={idx}
                        className="w-7 h-7 rounded-full border border-black/15 shadow-sm inline-block"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2 text-xs text-brown">
                <div className="p-3.5 rounded-2xl bg-cream border border-peach-soft">
                  <span className="font-bold text-peach-deep">Phối đồng điệu (Ton-sur-ton):</span>
                  <p className="mt-1 leading-relaxed">{place.outfit.tonSurTon}</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-cream border border-peach-soft">
                  <span className="font-bold text-peach-deep">Phối tương phản nhẹ:</span>
                  <p className="mt-1 leading-relaxed">{place.outfit.contrast}</p>
                </div>
                {place.outfit.avoid && (
                  <div className="p-3.5 rounded-2xl bg-cream border border-peach-soft text-brown-muted">
                    <span className="font-bold text-red-500">Nên tránh:</span> {place.outfit.avoid}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Gần đây có gì */}
          {nearbyPlaces.length > 0 && (
            <div className="bg-white rounded-3xl p-6 border border-peach-soft shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-brown font-display font-bold text-base">
                <MapPin className="w-5 h-5 text-peach-deep" />
                <span>Gần đây có gì vui?</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {nearbyPlaces.map((np) => (
                  <Link
                    key={np.slug}
                    href={`/places/${np.slug}`}
                    className="p-3.5 rounded-2xl bg-cream hover:bg-peach-soft/60 border border-peach-soft flex items-center gap-3 transition group"
                  >
                    <span className="text-2xl">{np.emoji}</span>
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-brown group-hover:text-peach-deep truncate transition">
                        {np.name}
                      </div>
                      <div className="text-[11px] text-brown-muted mt-0.5">{np.area}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
