"use client";

import React, { useCallback, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useApp } from "@/context/AppContext";
import { Compass, Flame, Gift, Plus } from "lucide-react";
import { PlanTimeline } from "@/components/plans/PlanTimeline";
import { PlanAirmailCard } from "@/components/plans/PlanAirmailCard";
import {
  PlanSwitcherBar,
  type PlanFilterTab,
} from "@/components/plans/PlanSwitcherBar";
import {
  CreatePlanModal,
  type CreatePlanFormInput,
} from "@/components/plans/modals/CreatePlanModal";
import { CompletePlanModal } from "@/components/plans/modals/CompletePlanModal";
import { PosterShareModal } from "@/components/scrapbook/modals/PosterShareModal";
import { enrichPlanStops } from "@/lib/plan-enrichment";
import {
  computePlanTimeline,
  computeItineraryStats,
  formatVietnameseDate,
} from "@/lib/plan-optimizer";
import { fetchPlansList, fetchPlanDetail } from "./plans-fetchers";

function nextSaturday(): string {
  const date = new Date();
  date.setDate(date.getDate() + ((6 - date.getDay()) % 7 || 7));
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
    setIsRoomModalOpen,
    addToast,
  } = useApp();
  const queryClient = useQueryClient();

  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<PlanFilterTab>("upcoming");
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [mobilePlanTab, setMobilePlanTab] = useState<"timeline" | "airmail">("timeline");

  const [draftTitle, setDraftTitle] = useState("");
  const [draftDate, setDraftDate] = useState(nextSaturday);
  const [draftTime, setDraftTime] = useState("16:30");
  const [draftBudget, setDraftBudget] = useState("");
  const [draftSecret, setDraftSecret] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const upcomingPlanId = homeSummary?.upcomingPlan?.id ?? null;

  const { data: plans = [], isLoading: isLoadingPlans } = useQuery({
    queryKey: ["user", "plans"],
    queryFn: fetchPlansList,
    enabled: !isLoadingHome,
  });

  useEffect(() => {
    if (plans.length === 0) {
      setSelectedPlanId(null);
      return;
    }

    const tabCandidates = plans.filter((p) =>
      filterTab === "upcoming" ? p.status === "planned" : p.status === "done",
    );

    if (tabCandidates.length > 0) {
      setSelectedPlanId((current) => {
        if (current && tabCandidates.some((p) => p.id === current))
          return current;
        if (
          filterTab === "upcoming" &&
          upcomingPlanId &&
          tabCandidates.some((p) => p.id === upcomingPlanId)
        ) {
          return upcomingPlanId;
        }
        return tabCandidates[0]?.id ?? null;
      });
    } else {
      setSelectedPlanId((current) => {
        if (current && plans.some((p) => p.id === current)) return current;
        return null;
      });
    }
  }, [plans, filterTab, upcomingPlanId]);

  const { data: plan = null, isLoading: isLoadingPlan } = useQuery({
    queryKey: ["user", "plan", selectedPlanId],
    queryFn: () => fetchPlanDetail(selectedPlanId),
    enabled: Boolean(selectedPlanId),
  });

  const isLoading =
    isLoadingPlans || (Boolean(selectedPlanId) && isLoadingPlan && !plan);

  const refreshPlan = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["user", "plan", selectedPlanId],
      }),
      queryClient.invalidateQueries({ queryKey: ["user", "plans"] }),
      refetchHomeSummary(),
    ]);
  }, [queryClient, refetchHomeSummary, selectedPlanId]);

  const submitCreatePlan = async (
    input: CreatePlanFormInput,
  ): Promise<boolean> => {
    try {
      const res = await fetch("/api/v1/user/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        addToast(
          await readError(res, "Chưa tạo được kế hoạch, thử lại nhé."),
          "error",
        );
        return false;
      }
      const json = await res.json();
      setFilterTab("upcoming");
      setSelectedPlanId(json.data.id);
      addToast(`📅 Đã tạo kế hoạch "${input.title}"!`, "success");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["user", "plans"] }),
        refetchHomeSummary(),
      ]);
      return true;
    } catch {
      addToast("Mất kết nối, chưa tạo được kế hoạch.", "error");
      return false;
    }
  };

  const handleEmptyCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = draftTitle.trim();
    if (!title || isCreating) return;
    const budget = Number(draftBudget.replace(/\D/g, ""));
    setIsCreating(true);
    try {
      const ok = await submitCreatePlan({
        title,
        planDate: draftDate,
        startTime: draftTime,
        ...(budget > 0 ? { budget } : {}),
        ...(draftSecret ? { isSecret: true } : {}),
      });
      if (ok) {
        setDraftTitle("");
        setDraftBudget("");
        setDraftSecret(false);
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleSavePlanNote = async (note: string) => {
    if (!selectedPlanId) return;
    try {
      const res = await fetch(`/api/v1/user/plans/${selectedPlanId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: note.trim() || null }),
      });
      if (!res.ok) throw new Error("Save note failed");
      await refreshPlan();
    } catch {
      addToast("Chưa lưu được ghi chú chung, thử lại nhé.", "error");
    }
  };

  const handleCompletePlan = async (payload: {
    rating: number;
    journal: string;
  }): Promise<boolean> => {
    if (!plan) return false;
    try {
      const res = await fetch("/api/v1/user/memories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: plan.id,
          rating: payload.rating,
          ...(payload.journal ? { journal: payload.journal } : {}),
        }),
      });
      if (!res.ok) {
        addToast(
          await readError(res, "Chưa lưu được kỷ niệm, thử lại nhé."),
          "error",
        );
        return false;
      }
      setFilterTab("done");
      addToast("💖 Đã hoàn thành buổi hẹn và lưu vào Kho Kỷ Niệm!", "success");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["user", "plan", plan.id] }),
        queryClient.invalidateQueries({ queryKey: ["user", "plans"] }),
        queryClient.invalidateQueries({ queryKey: ["user", "memories"] }),
        refetchHomeSummary(),
      ]);
      return true;
    } catch {
      addToast("Mất kết nối khi lưu kỷ niệm.", "error");
      return false;
    }
  };

  const partnerMember = roomProfile?.members.find((m) => !m.isMe);
  const isPaired =
    Boolean(partnerMember) ||
    (roomProfile?.room.memberCount ?? 1) >= 2 ||
    roomProfile?.room.status === "paired";

  const handleNotifyPartner = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard?.writeText(window.location.href);
      addToast(
        "💌 Đã sao chép liên kết kế hoạch để gửi cho người thương!",
        "success",
      );
    }
  };

  const enrichedStops = useMemo(() => {
    if (!plan) return [];
    return enrichPlanStops(plan.stops, places);
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

  if (plans.length === 0) {
    return (
      <div className="max-w-xl mx-auto bg-[#FFFDF9] rounded-3xl p-6 sm:p-8 border-2 border-[#D8C7B0] shadow-xs space-y-5 relative animate-in fade-in duration-300">
        <div className="text-center space-y-1.5">
          <div className="text-4xl">🗓️</div>
          <h3 className="font-serif font-extrabold text-xl sm:text-2xl text-paper-ink">
            Chưa có buổi hẹn nào
          </h3>
          <p className="text-xs sm:text-sm text-paper-muted">
            Tạo kế hoạch rồi thêm điểm dừng từ trang Khám phá hoặc các địa điểm
            hai bạn đã Match.
          </p>
        </div>

        <form onSubmit={handleEmptyCreateSubmit} className="space-y-3">
          <input
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            maxLength={150}
            required
            placeholder="Tên buổi hẹn (vd: Ngắm hoàng hôn Hồ Tây)"
            className="w-full px-3 py-2.5 rounded-xl bg-[#FFFDF9] border border-[#CBB292] text-base sm:text-sm focus:outline-none focus:border-brand-terracotta text-paper-ink"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              type="date"
              value={draftDate}
              onChange={(e) => setDraftDate(e.target.value)}
              required
              className="px-3 py-2.5 rounded-xl bg-[#FFFDF9] border border-[#CBB292] text-base sm:text-sm focus:outline-none focus:border-brand-terracotta text-paper-ink"
            />
            <input
              type="time"
              value={draftTime}
              onChange={(e) => setDraftTime(e.target.value)}
              required
              className="px-3 py-2.5 rounded-xl bg-[#FFFDF9] border border-[#CBB292] text-base sm:text-sm focus:outline-none focus:border-brand-terracotta text-paper-ink"
            />
          </div>
          <input
            inputMode="numeric"
            value={draftBudget}
            onChange={(e) => setDraftBudget(e.target.value)}
            placeholder="Ngân sách dự kiến (VND, không bắt buộc)"
            className="w-full px-3 py-2.5 rounded-xl bg-[#FFFDF9] border border-[#CBB292] text-base sm:text-sm focus:outline-none focus:border-brand-terracotta text-paper-ink"
          />
          <label className="flex items-center gap-2 text-xs text-paper-ink bg-amber-50/70 border border-amber-200/80 rounded-xl px-3 py-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={draftSecret}
              onChange={(e) => setDraftSecret(e.target.checked)}
              className="accent-brand-terracotta"
            />
            <Gift className="w-3.5 h-3.5 text-brand-terracotta shrink-0" />
            <span className="font-semibold">
              Bật chế độ Buổi hẹn bất ngờ (giấu điểm dừng đến sát giờ)
            </span>
          </label>
          <button
            type="submit"
            disabled={isCreating || !draftTitle.trim()}
            className="min-h-11 w-full py-3 rounded-2xl bg-brand-terracotta hover:bg-brand-terracottaDark text-white font-bold text-sm shadow-xs transition disabled:opacity-50 cursor-pointer"
          >
            {isCreating ? "Đang tạo..." : "📅 Tạo kế hoạch"}
          </button>
        </form>

        <div className="flex justify-center gap-4 text-xs font-bold pt-1">
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

  const visiblePlansInTab = plans.filter((p) =>
    filterTab === "upcoming" ? p.status === "planned" : p.status === "done",
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PlanSwitcherBar
        plans={plans}
        selectedPlanId={selectedPlanId}
        filterTab={filterTab}
        onChangeFilterTab={setFilterTab}
        onSelectPlan={setSelectedPlanId}
        onOpenCreateModal={() => setIsCreateModalOpen(true)}
      />

      {visiblePlansInTab.length === 0 ? (
        <div className="bg-[#FFFDF9] rounded-3xl p-8 text-center border-2 border-[#D8C7B0] shadow-xs space-y-3">
          <div className="text-3xl">
            {filterTab === "upcoming" ? "🗓️" : "📸"}
          </div>
          <h3 className="font-serif font-extrabold text-lg text-paper-ink">
            {filterTab === "upcoming"
              ? "Không còn buổi hẹn sắp tới nào"
              : "Chưa có buổi hẹn nào hoàn thành"}
          </h3>
          <p className="text-xs text-paper-muted max-w-md mx-auto">
            {filterTab === "upcoming"
              ? "Lên lịch buổi hẹn mới ngay để hai đứa cùng háo hức chờ cuối tuần nhé!"
              : "Khi đi chơi về, bấm nút “Hoàn thành buổi hẹn” để chấm tim và lưu thẳng vào Kho Kỷ Niệm."}
          </p>
          {filterTab === "upcoming" ? (
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="min-h-10 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-brand-terracotta hover:bg-brand-terracottaDark text-white text-xs font-bold shadow-xs transition cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Tạo buổi hẹn mới
            </button>
          ) : (
            <Link
              href="/memories"
              className="min-h-10 inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-brand-olive/15 text-brand-olive border border-brand-olive/30 text-xs font-bold"
            >
              💖 Mở Kho Kỷ Niệm
            </Link>
          )}
        </div>
      ) : !plan ? (
        <div className="p-12 text-center text-sm text-paper-muted animate-pulse">
          Đang tải lịch trình chi tiết...
        </div>
      ) : (
        <div className="space-y-4">
          {/* Native Mobile/Tablet Segmented Control (< 1024px) */}
          <div
            role="tablist"
            aria-label="Chế độ xem kế hoạch trên di động"
            className="flex lg:hidden bg-[#EFE5D4] p-1 rounded-2xl border border-[#CBB292] shadow-inner gap-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mobilePlanTab === "timeline"}
              onClick={() => setMobilePlanTab("timeline")}
              className={`min-h-10 flex-1 py-2 px-3 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                mobilePlanTab === "timeline"
                  ? "bg-brand-terracotta text-white shadow-xs"
                  : "text-paper-ink/80 hover:text-paper-ink"
              }`}
            >
              <span aria-hidden="true">📍</span>
              <span>Lộ trình hẹn ({plan.stops.length})</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mobilePlanTab === "airmail"}
              onClick={() => setMobilePlanTab("airmail")}
              className={`min-h-10 flex-1 py-2 px-3 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                mobilePlanTab === "airmail"
                  ? "bg-brand-terracotta text-white shadow-xs"
                  : "text-paper-ink/80 hover:text-paper-ink"
              }`}
            >
              <span aria-hidden="true">💌</span>
              <span>
                Bưu thiếp &amp; Thời tiết
                {homePublic ? ` (${homePublic.weather.temp}°C)` : ""}
              </span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left column (7/12): Interactive PlanTimeline */}
            <div
              className={`lg:col-span-7 min-w-0 ${
                mobilePlanTab === "timeline" ? "block" : "hidden lg:block"
              }`}
            >
              {plan.isSecretLocked ? (
                <div className="p-6 sm:p-8 rounded-3xl bg-[#362721] text-white text-center space-y-4 border-2 border-dashed border-[#E6D7C3] shadow-md">
                  <div className="text-5xl">🎁🔒</div>
                  <h4 className="font-serif font-extrabold text-xl sm:text-2xl text-brand-peach">
                    Người ấy đã chuẩn bị một buổi hẹn bất ngờ cho bạn!
                  </h4>
                  <p className="text-xs sm:text-sm text-white/85 max-w-md mx-auto leading-relaxed">
                    Hẹn bạn {formatVietnameseDate(plan.planDate)} lúc{" "}
                    <strong className="text-brand-peach">{plan.startTime}</strong>
                    .
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
                  onCompletePlan={
                    plan.status === "planned"
                      ? () => setIsCompleteModalOpen(true)
                      : undefined
                  }
                  onNotifyMessage={addToast}
                  goldenHourStart={homePublic?.sun.goldenHour.start}
                />
              )}
            </div>

            {/* Right column (5/12): Zero-PII Airmail Postcard */}
            <div
              className={`lg:col-span-5 min-w-0 lg:sticky lg:top-6 space-y-4 ${
                mobilePlanTab === "airmail" ? "block" : "hidden lg:block"
              }`}
            >
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
                roomConnection={{
                  isPaired,
                  partnerNickname: partnerMember?.nickname ?? null,
                  partnerLastSeenAt: partnerMember?.lastSeenAt ?? null,
                }}
                onOpenRoomModal={() => setIsRoomModalOpen(true)}
                onShareInvitation={() => setIsShareOpen(true)}
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

            <PosterShareModal
              isOpen={isShareOpen}
              onClose={() => setIsShareOpen(false)}
              plan={plan}
              places={places}
              onRefresh={refreshPlan}
            />
          </div>
        </div>
      )}

      <CreatePlanModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        defaultDate={nextSaturday()}
        onSubmitPlan={submitCreatePlan}
      />

      {plan && (
        <CompletePlanModal
          isOpen={isCompleteModalOpen}
          onClose={() => setIsCompleteModalOpen(false)}
          planTitle={plan.title}
          onConfirmComplete={handleCompletePlan}
        />
      )}
    </div>
  );
}
