"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Play, MapPin, CalendarPlus, X, Sparkles, Navigation, Clock } from "lucide-react";
import {
  CURATED_FEATURED_VIDEOS,
  type VideoHotspotsDetail,
  type VideoHotspot,
} from "@/server/services/user/video-hotspots.service";

interface VideoHotspotsPlayerProps {
  onAddToPlan?: (placeId: string, placeName: string) => void;
}

export function VideoHotspotsPlayer({ onAddToPlan }: VideoHotspotsPlayerProps) {
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [videoDetail, setVideoDetail] = useState<VideoHotspotsDetail | null>(null);
  const [activeSpotIndex, setActiveSpotIndex] = useState(0);
  const [isLoadingHotspots, setIsLoadingHotspots] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Mở modal xem video và nạp Pin Tags
  const handleOpenVideo = async (videoId: string) => {
    setSelectedVideoId(videoId);
    setIsLoadingHotspots(true);
    setActiveSpotIndex(0);

    try {
      const res = await fetch(`/api/v1/user/videos/${videoId}/hotspots`);
      if (res.ok) {
        const json = await res.json();
        setVideoDetail(json.data);
      } else {
        // Fallback local
        const curated = CURATED_FEATURED_VIDEOS.find((v) => v.id === videoId);
        if (curated) {
          setVideoDetail({
            videoId: curated.id,
            videoTitle: curated.title,
            embedId: curated.embedId,
            thumbnailUrl: curated.thumbnailUrl,
            hotspots: curated.timestamps.map((ts, idx) => ({
              id: `spot-${idx + 1}`,
              placeId: curated.primaryPlaceId,
              placeName: idx === 0 ? "Serein Café Cầu Long Biên" : "Bãi đá sông Hồng",
              area: "Hoàn Kiếm",
              timestampSeconds: ts.sec,
              timeFormatted: ts.label,
              category: "cafe",
              categoryLabel: "Cà phê & Trà",
              position: { x: ts.x, y: ts.y },
            })),
            nearbyPlaces: [
              {
                id: "p-nb1",
                name: "Hẻm Từ Hoa Hồ Tây",
                area: "Tây Hồ",
                categoryLabel: "Sống ảo",
                costText: "Miễn phí",
              },
              {
                id: "p-nb2",
                name: "Phố bích họa Phùng Hưng",
                area: "Hoàn Kiếm",
                categoryLabel: "Đi dạo",
                costText: "Miễn phí",
              },
            ],
          });
        }
      }
    } catch {
      // Fallback
    } finally {
      setIsLoadingHotspots(false);
    }
  };

  const handleCloseModal = () => {
    setSelectedVideoId(null);
    setVideoDetail(null);
  };

  const currentHotspot: VideoHotspot | undefined = videoDetail?.hotspots[activeSpotIndex];

  return (
    <section className="w-full max-w-6xl mx-auto py-8 px-4 sm:px-6 font-sans">
      {/* Toast thông báo */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#231A16] text-[#FFFDF9] border-2 border-[#F29B7E] px-4 py-2.5 rounded-2xl text-xs font-bold shadow-2xl animate-bounce">
          {toastMessage}
        </div>
      )}

      {/* Header phân khu */}
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#E6D3B8]/60 pb-4 mb-6">
        <div>
          <span className="text-xs font-extrabold uppercase tracking-wider text-[#C84B31]">
            🎞️ Phase 3 • Video Hotspots & Pin Tags
          </span>
          <h2 className="font-serif font-extrabold text-2xl sm:text-3xl text-[#362721] mt-1">
            Video Review Tuyển Chọn (Chạm Mở Pin Tags Tọa Độ)
          </h2>
        </div>
        <p className="text-xs text-[#362721]/70 font-medium">
          Xem video và ghim ngay địa điểm vào lịch hẹn hò với 1 chạm
        </p>
      </div>

      {/* Lưới 3 Video Review tuyển chọn */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {CURATED_FEATURED_VIDEOS.map((video) => (
          <div
            key={video.id}
            onClick={() => handleOpenVideo(video.id)}
            className="bg-[#1F1916] rounded-3xl p-3.5 text-white cursor-pointer group shadow-lg hover:-translate-y-1 transition duration-300 border-2 border-[#CBB292]/50 hover:border-[#C84B31]"
          >
            {/* Thumbnail với nút Play ở giữa */}
            <div className="relative h-48 rounded-2xl overflow-hidden bg-stone-900">
              <Image
                src={video.thumbnailUrl}
                alt={video.title}
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-cover group-hover:scale-105 transition duration-500 opacity-90"
              />

              {/* Badge số Pin Tags */}
              <span className="absolute top-2.5 left-2.5 bg-black/75 backdrop-blur-xs text-[11px] font-semibold px-3 py-1 rounded-full flex items-center gap-1 shadow">
                <MapPin className="w-3 h-3 text-[#F29B7E]" />
                <span>📍 {video.timestamps.length} Pin Tags ghim trên video</span>
              </span>

              {/* Nút Play tròn giữa thumbnail */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-13 h-13 rounded-full bg-[#C84B31]/90 group-hover:bg-[#C84B31] flex items-center justify-center text-white shadow-xl transition transform group-hover:scale-110">
                  <Play className="w-6 h-6 fill-white translate-x-0.5" />
                </div>
              </div>
            </div>

            {/* Tiêu đề & mô tả video */}
            <h3 className="font-serif font-bold text-base mt-3 text-stone-100 group-hover:text-[#F29B7E] transition line-clamp-2">
              {video.title}
            </h3>
            <p className="text-[11px] text-stone-400 mt-1 line-clamp-2 leading-relaxed">
              {video.description}
            </p>
          </div>
        ))}
      </div>

      {/* Modal Video Player & Pin Tags nổi */}
      {selectedVideoId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fadeIn">
          <div className="bg-[#1F1916] border-2 border-[#CBB292] rounded-3xl max-w-2xl w-full p-5 text-white space-y-4 shadow-2xl overflow-hidden relative">
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div className="flex items-center gap-2 min-w-0 pr-3">
                <span className="text-xs font-serif font-bold text-[#F29B7E] truncate">
                  {videoDetail?.videoTitle || "Video Review & Pin Tags"}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-stone-300 font-bold flex items-center justify-center shrink-0 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Khung Player Video kèm Pin Tag lơ lửng */}
            <div className="relative h-72 sm:h-80 rounded-2xl overflow-hidden bg-black flex flex-col justify-between p-4 shadow-inner">
              {/* Nền ảnh video / preview */}
              {videoDetail?.thumbnailUrl && (
                <Image
                  src={videoDetail.thumbnailUrl}
                  alt="Video frame"
                  fill
                  className="object-cover opacity-85"
                />
              )}

              {/* Pin Tag lơ lửng trên Video */}
              {currentHotspot && (
                <div
                  className="relative z-10 bg-[#FFFDF9]/95 text-[#362721] p-3 rounded-2xl shadow-2xl flex items-center justify-between gap-3 max-w-xs border-2 border-[#C84B31] transition-all duration-300 animate-fadeIn"
                  style={{
                    alignSelf: currentHotspot.position.x > 50 ? "flex-end" : "flex-start",
                    marginTop: `${Math.min(currentHotspot.position.y, 40)}%`,
                  }}
                >
                  <div className="text-xs min-w-0">
                    <span className="text-[10px] font-extrabold text-[#C84B31] flex items-center gap-1 uppercase tracking-wider">
                      <Clock className="w-3 h-3" /> PIN TAG @ {currentHotspot.timeFormatted}
                    </span>
                    <strong className="block text-sm font-serif font-bold text-[#362721] truncate mt-0.5">
                      {currentHotspot.placeName}
                    </strong>
                    <span className="text-[10px] text-[#362721]/70 block truncate">
                      📍 {currentHotspot.area} • {currentHotspot.categoryLabel}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onAddToPlan?.(currentHotspot.placeId, currentHotspot.placeName);
                      showToast(`✅ Đã thêm "${currentHotspot.placeName}" vào lịch trình!`);
                    }}
                    className="bg-[#C84B31] hover:bg-[#9E331E] text-white text-[11px] font-bold px-3 py-2 rounded-xl shrink-0 shadow transition flex items-center gap-1"
                  >
                    <CalendarPlus className="w-3.5 h-3.5" />
                    <span>+ Vào lịch</span>
                  </button>
                </div>
              )}

              {/* Dải gợi ý các điểm tương tự cùng quận */}
              <div className="relative z-10 bg-black/75 backdrop-blur-sm px-3.5 py-2 rounded-xl text-xs text-amber-200 border border-white/10 flex items-center justify-between flex-wrap gap-2">
                <span className="flex items-center gap-1 text-[11px] font-medium">
                  <Sparkles className="w-3.5 h-3.5 text-[#F29B7E]" />
                  <span>
                    Gợi ý cùng quận {currentHotspot?.area || "Hà Nội"}:
                  </span>
                  <span className="text-stone-300 font-normal">
                    {videoDetail?.nearbyPlaces.map((nb) => nb.name).join(" • ") || "Hồ Tây • Cầu Long Biên"}
                  </span>
                </span>
              </div>
            </div>

            {/* Thanh chọn chuyển mốc Pin Tag */}
            {videoDetail && videoDetail.hotspots.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pt-1">
                <span className="text-xs text-stone-400 font-medium shrink-0">
                  Mốc tọa độ:
                </span>
                {videoDetail.hotspots.map((spot, idx) => (
                  <button
                    key={spot.id}
                    type="button"
                    onClick={() => setActiveSpotIndex(idx)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 shrink-0 ${
                      activeSpotIndex === idx
                        ? "bg-[#C84B31] text-white"
                        : "bg-white/10 text-stone-300 hover:bg-white/20"
                    }`}
                  >
                    <span>📍 {spot.timeFormatted}</span>
                    <span>—</span>
                    <span>{spot.placeName}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
