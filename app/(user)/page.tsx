"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { PlaceCard } from "@/components/user/PlaceCard";
import { VideoCard } from "@/components/user/VideoCard";
import { VideoPlayerModal } from "@/components/user/VideoPlayerModal";
import { PosterShareModal } from "@/components/scrapbook/modals/PosterShareModal";
import { OnboardingCard } from "@/components/home/OnboardingCard";
import { UpcomingPlanCard } from "@/components/home/UpcomingPlanCard";
import { WeatherPostcard } from "@/components/home/WeatherPostcard";
import type { VideoCatalogItem } from "@/server/services/user/videos.service";

const PREVIEW_PLACES = 3;

export default function HomePage() {
  const { places, isLoadingPlaces, homePublic, upcomingPlan, refetchHomeSummary, addToast } = useApp();

  const [featuredVideos, setFeaturedVideos] = useState<VideoCatalogItem[]>([]);
  const [isLoadingVideos, setIsLoadingVideos] = useState<boolean>(true);
  const [activeVideo, setActiveVideo] = useState<VideoCatalogItem | null>(null);
  const [isShareOpen, setIsShareOpen] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/v1/user/videos?tab=recommend&limit=3")
      .then((res) => res.json())
      .then((json) => {
        if (active && Array.isArray(json?.data?.items)) setFeaturedVideos(json.data.items);
      })
      .catch((err) => console.warn("Lỗi tải video trang chủ:", err))
      .finally(() => {
        if (active) setIsLoadingVideos(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Trời mưa thì ưu tiên quán trong nhà, trời đẹp ưu tiên ngoài trời
  const isRainy = homePublic?.weather.icon === "rain" || homePublic?.weather.icon === "thunder";
  const previewPlaces = useMemo(
    () => [...places].sort((a, b) => Number(b.indoor === isRainy) - Number(a.indoor === isRainy)).slice(0, PREVIEW_PLACES),
    [places, isRainy]
  );

  const openShare = () => {
    if (!upcomingPlan) {
      addToast("Tạo một buổi hẹn trước rồi gửi thiệp cho người ấy nhé!", "info");
      return;
    }
    if (upcomingPlan.isSecretLocked) {
      addToast("Buổi hẹn bất ngờ đang khóa, chưa gửi thiệp được.", "info");
      return;
    }
    setIsShareOpen(true);
  };

  return (
    <div className="space-y-12">
      <section id="section-home" className="scroll-section space-y-6">
        <OnboardingCard onSendInvite={openShare} />
        <div className="responsive-2col grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <UpcomingPlanCard onOpenShare={openShare} />
          <WeatherPostcard />
        </div>
      </section>

      <section id="section-explore" className="scroll-section">
        <div className="explore-header-row flex flex-wrap items-end justify-between gap-3 mb-6">
          <div>
            <span className="text-xs font-bold text-brand-terracotta uppercase tracking-wider">🧭 Gợi ý hôm nay</span>
            <h2 className="font-serif font-extrabold text-xl sm:text-2xl text-paper-ink mt-0.5">
              {isRainy ? "Trời mưa, trốn vào mấy góc trong nhà này nhé" : "Hợp với thời tiết Hà Nội hôm nay"}
            </h2>
          </div>
          <Link href="/explore" className="text-xs font-bold text-brand-terracotta hover:underline">
            Xem cả {places.length} quán →
          </Link>
        </div>
        <div className="polaroid-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7 pt-2">
          {isLoadingPlaces ? (
            <div className="col-span-full text-center text-sm text-paper-muted py-10">Đang lật sổ tìm tọa độ hẹn hò...</div>
          ) : (
            previewPlaces.map((place, idx) => <PlaceCard key={place.id} place={place} index={idx} />)
          )}
        </div>
      </section>

      <section id="section-video" className="scroll-section relative">
        <svg
          className="hidden xl:block w-14 h-20 text-paper-ink absolute -top-6 right-2 pointer-events-none"
          viewBox="0 0 60 90"
          fill="none"
        >
          <path
            d="M35 5 C 55 20, 45 45, 28 42 C 15 40, 18 25, 32 30 C 48 35, 45 65, 22 78"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d="M26 70 L 20 79 L 31 81"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        <div className="flex flex-wrap items-end justify-between gap-2 mb-5">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-brand-terracotta uppercase tracking-wider">
              <span>🎞️ Thực tế &amp; Trực quan</span>
            </div>
            <h2 className="font-serif font-extrabold text-xl sm:text-2xl text-paper-ink mt-0.5">
              Video Review Hẹn Hò Tuyển Chọn
            </h2>
            <p className="text-xs sm:text-sm text-paper-muted">
              Trải nghiệm không gian quán qua góc nhìn chân thực của các reviewer
            </p>
          </div>

          <Link
            href="/videos"
            className="text-xs font-bold text-brand-terracotta hover:underline flex items-center gap-1"
          >
            <span>Xem tất cả video</span>
            <span>→</span>
          </Link>
        </div>

        <div className="video-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredVideos.length > 0 ? (
            featuredVideos.map((vid, vIdx) => (
              <VideoCard
                key={vid.id}
                video={vid}
                index={vIdx}
                onPlay={(selected) => setActiveVideo(selected)}
              />
            ))
          ) : (
            <div className="col-span-full bg-[#FFFDF9] border-2 border-dashed border-[#CBB292] rounded-xl p-8 text-center">
              <span className="text-3xl">🎞️</span>
              <p className="font-serif font-bold text-lg text-paper-ink mt-2">
                {isLoadingVideos ? "Đang tua cuộn phim..." : "Chưa có video review nào được tuyển chọn"}
              </p>
              {!isLoadingVideos && (
                <Link href="/videos" className="inline-block mt-3 paper-btn px-4 py-1.5 text-xs font-bold">
                  Xem kho video →
                </Link>
              )}
            </div>
          )}
        </div>
      </section>

      <VideoPlayerModal video={activeVideo} onClose={() => setActiveVideo(null)} />
      {upcomingPlan && (
        <PosterShareModal
          isOpen={isShareOpen}
          onClose={() => setIsShareOpen(false)}
          plan={upcomingPlan}
          places={places}
          onRefresh={refetchHomeSummary}
        />
      )}
    </div>
  );
}
