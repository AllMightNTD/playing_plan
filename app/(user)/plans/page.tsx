"use client";

import React, { useCallback, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useApp } from "@/context/AppContext";
import {
  Compass,
  Flame,
  CheckCircle2,
  Calendar,
  Clock,
  Heart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PlanTimeline } from "@/components/plans/PlanTimeline";
import { PlanAirmailCard } from "@/components/plans/PlanAirmailCard";
import { PosterShareModal } from "@/components/scrapbook/modals/PosterShareModal";
import {
  computePlanTimeline,
  computeItineraryStats,
  formatVietnameseDate,
} from "@/lib/plan-optimizer";
import { fetchPlansList, fetchPlanDetail } from "./plans-fetchers";

const CATEGORY_ICONS: Record<string, string> = {
  coffee: "☕",
  food: "🍜",
  activity: "📸",
  sunset: "🌅",
};

function nextSaturday(): string {
  const date = new Date();
  date.setDate(date.getDate() + (((6 - date.getDay()) % 7) || 7));
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

async function readError(res: Response, fallback: string): Promise<string> {
  const json = await res.json().catch(() => null);
  return json?.error?.message || fallback;
}

export default function PlansPage() {
  const {
    places,
    homeSummary,
    homePublic,
    isLoadingHome,
    refetchHomeSummary,
    roomProfile,
    setActiveDetailSlug,
    addToast,
  } = useApp();
  const queryClient = useQueryClient();

  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [isShareOpen, setIsShareOpen] = useState(false);

  // Form tạo kế hoạch mới khi chưa có buổi hẹn nào
  const [draftTitle, setDraftTitle] = useState("");
  const [draftDate, setDraftDate] = useState(nextSaturday);
  const [draftTime, setDraftTime] = useState("16:30");
  const [draftBudget, setDraftBudget] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const upcomingPlanId = homeSummary?.upcomingPlan?.id ?? null;

  const { data: plans = [], isLoading: isLoadingPlans } = useQuery({
    queryKey: ["user", "plans"],
    queryFn: fetchPlansList,
    enabled: !isLoadingHome,
  });

  useEffect(() => {
    if (plans.length > 0) {
      setSelectedPlanId((current) =>
        current && plans.some((p) => p.id === current)
          ? current
          : upcomingPlanId && plans.some((p) => p.id === upcomingPlanId)
          ? upcomingPlanId
          : plans[0]?.id ?? null
      );
    } else {
      setSelectedPlanId(null);
    }
  }, [plans, upcomingPlanId]);

  const { data: plan = null, isLoading: isLoadingPlan } = useQuery({
    queryKey: ["user", "plan", selectedPlanId],
    queryFn: () => fetchPlanDetail(selectedPlanId),
    enabled: Boolean(selectedPlanId),
  });

  const isLoading = isLoadingPlans || (Boolean(selectedPlanId) && isLoadingPlan && !plan);

  // Đồng bộ lại dữ liệu sau khi sửa chặng hoặc thông tin buổi hẹn
  const refreshPlan = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["user", "plan", selectedPlanId] }),
      queryClient.invalidateQueries({ queryKey: ["user", "plans"] }),
      refetchHomeSummary(),
    ]);
  }, [queryClient, refetchHomeSummary, selectedPlanId]);

  // Lưu ghi chú chung vào backend qua PATCH API
  const handleSavePlanNote = async (note: string) => {
    if (!selectedPlanId) return;
    try {
      await fetch(`/api/v1/user/plans/${selectedPlanId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: note.trim() || null }),
      });
      await refreshPlan();
    } catch (err) {
      console.error(err);
      addToast("Chưa lưu được ghi chú chung, thử lại nhé.", "error");
    }
  };

  // Tạo kế hoạch mới
  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = draftTitle.trim();
    if (!title || isCreating) return;
    const budget = Number(draftBudget.replace(/\D/g, ""));
    setIsCreating(true);
    try {
      const res = await fetch("/api/v1/user/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          planDate: draftDate,
          startTime: draftTime,
          ...(budget > 0 ? { budget } : {}),
        }),
      });
      if (!res.ok) {
        addToast(await readError(res, "Chưa tạo được kế hoạch, thử lại nhé."), "error");
        return;
      }
      const json = await res.json();
      setSelectedPlanId(json.data.id);
      setDraftTitle("");
      addToast(`📅 Đã tạo kế hoạch "${title}"!`, "success");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["user", "plans"] }),
        refetchHomeSummary(),
      ]);
    } catch (err) {
      console.warn("Lỗi tạo kế hoạch:", err);
      addToast("Mất kết nối, chưa tạo được kế hoạch.", "error");
    } finally {
      setIsCreating(false);
    }
  };

  // Thành viên đối phương (người thương)
  const partnerMember = roomProfile?.members.find((m) => !m.isMe);
  const handleNotifyPartner = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard?.writeText(window.location.href);
      addToast("💌 Đã sao chép liên kết kế hoạch để gửi cho người thương!", "success");
    }
  };

  // Tính toán timeline cho Bưu thiếp Airmail
  const enrichedStops = useMemo(() => {
    if (!plan) return [];
    return plan.stops.map((stop) => {
      const place = stop.placeId ? places.find((p) => p.id === stop.placeId) : undefined;
      const name = stop.customName || place?.name || "Địa điểm hẹn hò";
      const category = (place?.category || "coffee").toLowerCase();
      const icon = CATEGORY_ICONS[category] || "📍";
      return {
        ...stop,
        name,
        category,
        icon,
        lat: place?.lat ?? null,
        lng: place?.lng ?? null,
        duration: stop.durationMin,
        isLocked: stop.isPinnedTime,
        lockedStartTime: stop.plannedTime,
      };
    });
  }, [plan, places]);

  const computedTimeline = useMemo(() => {
    return computePlanTimeline(enrichedStops, plan?.startTime || "15:00");
  }, [enrichedStops, plan?.startTime]);

  const itineraryStats = useMemo(() => {
    return computeItineraryStats(computedTimeline);
  }, [computedTimeline]);

  if (isLoading || isLoadingHome) {
    return (
      <div className="p-12 text-center text-sm text-[#7d6856] animate-pulse">
        Đang tải kế hoạch của hai bạn...
      </div>
    );
  }

  // Chưa có kế hoạch nào: form tạo mới thân thiện
  if (plans.length === 0) {
    return (
      <div className="max-w-xl mx-auto bg-[#FFFDF9] rounded-3xl p-6 sm:p-8 border border-[#E6D7C3] shadow-xs space-y-5 relative animate-in fade-in duration-300">
        <div className="washi-tape washi-terracotta -top-3.5 left-10" />
        <div className="text-center space-y-1.5">
          <div className="text-4xl">🗓️</div>
          <h3 className="font-serif font-extrabold text-xl sm:text-2xl text-paper-ink">
            Chưa có buổi hẹn nào
          </h3>
          <p className="text-xs sm:text-sm text-paper-muted">
            Tạo kế hoạch rồi thêm điểm dừng từ trang Khám phá hoặc các địa điểm hai bạn đã Match.
          </p>
        </div>

        <form onSubmit={handleCreatePlan} className="space-y-3">
          <input
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            maxLength={150}
            required
            placeholder="Tên buổi hẹn (vd: Ngắm hoàng hôn Hồ Tây)"
            className="w-full px-3 py-2.5 rounded-xl bg-[#FAF4E8] border border-[#E6D7C3] text-sm focus:outline-none focus:border-brand-terracotta text-paper-ink"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              type="date"
              value={draftDate}
              onChange={(e) => setDraftDate(e.target.value)}
              required
              className="px-3 py-2.5 rounded-xl bg-[#FAF4E8] border border-[#E6D7C3] text-sm focus:outline-none focus:border-brand-terracotta text-paper-ink"
            />
            <input
              type="time"
              value={draftTime}
              onChange={(e) => setDraftTime(e.target.value)}
              required
              className="px-3 py-2.5 rounded-xl bg-[#FAF4E8] border border-[#E6D7C3] text-sm focus:outline-none focus:border-brand-terracotta text-paper-ink"
            />
          </div>
          <input
            inputMode="numeric"
            value={draftBudget}
            onChange={(e) => setDraftBudget(e.target.value)}
            placeholder="Ngân sách dự kiến (VND, không bắt buộc)"
            className="w-full px-3 py-2.5 rounded-xl bg-[#FAF4E8] border border-[#E6D7C3] text-sm focus:outline-none focus:border-brand-terracotta text-paper-ink"
          />
          <button
            type="submit"
            disabled={isCreating || !draftTitle.trim()}
            className="w-full py-3 rounded-2xl bg-brand-terracotta hover:bg-brand-terracottaDark text-white font-bold text-sm shadow-xs transition disabled:opacity-50"
          >
            {isCreating ? "Đang tạo..." : "📅 Tạo kế hoạch"}
          </button>
        </form>

        <div className="flex justify-center gap-3 text-xs font-bold">
          <Link
            href="/explore"
            className="text-brand-terracotta hover:underline flex items-center gap-1"
          >
            <Compass className="w-3.5 h-3.5" /> Khám phá địa điểm
          </Link>
          <Link
            href="/match"
            className="text-brand-terracotta hover:underline flex items-center gap-1"
          >
            <Flame className="w-3.5 h-3.5" /> Quẹt thẻ cùng người ấy
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen py-4 px-2 sm:px-6 lg:px-8 space-y-5"
      style={{
        backgroundColor: "#f3ede2",
        backgroundImage: "radial-gradient(#cbbba0 1.35px, transparent 1.35px)",
        backgroundSize: "18px 18px",
      }}
    >
      {/* BANNER ĐẦU TRANG THEO DEMO */}
      {plan && (
        <div className="max-w-6xl mx-auto">
          <div className="bg-[#fdfbf7]/95 backdrop-blur border border-[#e2d6c3] rounded-2xl px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 vintage-shadow">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-full bg-[#c84b31]/15 text-[#c84b31] flex items-center justify-center font-bold">
                💌
              </span>
              <span className="text-xs sm:text-sm text-[#4a3423] font-medium">
                <b>DateMate</b> gợi ý lịch trình hợp thời tiết nhất cho hai đứa nhé • Kéo thả địa
                điểm để đổi thứ tự
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs bg-[#eef6f0] text-[#2b6e44] border border-[#b8dfc6] px-3 py-1.5 rounded-full font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {`Đã lưu tự động ${plan.stops.length} mốc giờ`}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* CHUYỂN ĐỔI NHIỀU BUỔI HẸN */}
      {plans.length > 1 && (
        <div className="max-w-6xl mx-auto flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {plans.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelectedPlanId(p.id)}
              className={cn(
                "px-3.5 py-2 rounded-2xl text-xs font-bold border whitespace-nowrap transition flex items-center gap-1.5",
                p.id === selectedPlanId
                  ? "bg-[#c84b31] text-white border-[#c84b31] shadow-xs"
                  : "bg-[#FFFDF9] text-[#4a3423] border-[#E6D7C3] hover:bg-[#fff5f2]"
              )}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>{p.title}</span>
              <span>•</span>
              <span className="opacity-80">{formatVietnameseDate(p.planDate)}</span>
            </button>
          ))}
        </div>
      )}

      {/* NỘI DUNG CHÍNH: BỐ CỤC 2 CỘT */}
      {!plan ? (
        <div className="p-12 text-center text-sm text-[#7d6856] animate-pulse">
          Đang tải lịch trình chi tiết...
        </div>
      ) : (
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* CỘT TRÁI (7/12): LỊCH HẸN & TIMELINE DRAG & DROP */}
          <div className="lg:col-span-7">
            {plan.isSecretLocked ? (
              <div className="p-6 sm:p-8 rounded-3xl bg-[#362721] text-white text-center space-y-4 border-2 border-dashed border-[#E6D7C3] shadow-md">
                <div className="text-5xl">🎁🔒</div>
                <h4 className="font-serif font-extrabold text-xl sm:text-2xl text-brand-peach">
                  Người ấy đã chuẩn bị một buổi hẹn bất ngờ cho bạn!
                </h4>
                <p className="text-xs sm:text-sm text-white/85 max-w-md mx-auto leading-relaxed">
                  Hẹn bạn {formatVietnameseDate(plan.planDate)} lúc{" "}
                  <strong className="text-brand-peach">{plan.startTime}</strong>.
                </p>
              </div>
            ) : (
              <PlanTimeline
                plan={plan}
                places={places}
                onRefresh={refreshPlan}
                onOpenPlaceDetail={setActiveDetailSlug}
                onShareStory={() => setIsShareOpen(true)}
                onNotifyPartner={handleNotifyPartner}
                goldenHourStart={homePublic?.sun.goldenHour.start}
                partnerContact={partnerMember?.nickname || "Người thương 💕"}
              />
            )}
          </div>

          {/* CỘT PHẢI (5/12): BƯU THIẾP AIRMAIL */}
          <div className="lg:col-span-5 lg:sticky lg:top-6 space-y-4">
            <PlanAirmailCard
              planId={plan.id}
              planDate={plan.planDate}
              planNote={plan.note}
              onSaveNote={handleSavePlanNote}
              weather={
                homePublic
                  ? {
                      temp: homePublic.weather.temp,
                      description: homePublic.weather.condition,
                      rainProb: homePublic.weather.rainProbability,
                      icon: homePublic.weather.icon === "sun" ? "☀️" : "🌤️",
                      weatherTip: homePublic.weatherTip,
                    }
                  : null
              }
              sun={homePublic?.sun}
              partner={{
                name: partnerMember?.nickname || "Người thương 💕",
                lastSync: "Vừa xong",
              }}
              computedTimeline={computedTimeline.map((s) => ({
                id: s.item.id,
                name: s.item.name,
                startTimeStr: s.startTimeStr,
                endTimeStr: s.endTimeStr,
                distKm: s.distKm,
                travelMins: s.travelMins,
                icon: s.item.icon,
              }))}
              itineraryStats={itineraryStats}
              onNotifyPartner={handleNotifyPartner}
            />
          </div>

          {/* Modal chia sẻ Poster / Story */}
          <PosterShareModal
            isOpen={isShareOpen}
            onClose={() => setIsShareOpen(false)}
            plan={plan}
            places={places}
            onRefresh={refreshPlan}
          />
        </div>
      )}
    </div>
  );
}
