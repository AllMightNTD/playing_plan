"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Calendar,
  Clock,
  Edit3,
  Trash2,
  Sparkles,
  Navigation,
  GripVertical,
  StickyNote,
  ArrowUp,
  ArrowDown,
  Check,
  ChevronRight,
  Plus,
  Send,
  AlertTriangle,
} from "lucide-react";
import type { PlanDetailDto, PlanStopDto } from "@/server/services/user/plan.mapper";
import type { HanoiPlace } from "@/lib/types/catalog";
import {
  computePlanTimeline,
  computeItineraryStats,
  formatVietnameseDate,
  optimizeItinerarySequence,
} from "@/lib/plan-optimizer";
import { reorderStopsOptimistic, deleteStopOptimistic } from "@/lib/optimistic-timeline";
import { AddStopModal, type AddStopPayload } from "./modals/AddStopModal";
import { PlanChecklistModal } from "./modals/PlanChecklistModal";
import { DeletePlanModal } from "./modals/DeletePlanModal";

const CATEGORY_ICONS: Record<string, string> = {
  coffee: "☕",
  food: "🍜",
  activity: "📸",
  sunset: "🌅",
};

export interface PlanTimelineProps {
  plan: PlanDetailDto;
  places?: HanoiPlace[];
  onRefresh: () => Promise<void>;
  onOpenPlaceDetail?: (slug: string) => void;
  onShareStory?: () => void;
  onNotifyPartner?: () => void;
  goldenHourStart?: string;
  partnerContact?: string;
  className?: string;
}

export function PlanTimeline({
  plan,
  places = [],
  onRefresh,
  onOpenPlaceDetail,
  onShareStory,
  onNotifyPartner,
  goldenHourStart = "16:23",
  partnerContact = "Người thương 💕",
  className = "",
}: PlanTimelineProps) {
  // Local stops for 0ms optimistic UI
  const [localStops, setLocalStops] = useState<PlanStopDto[]>(plan.stops);
  const [localTitle, setLocalTitle] = useState(plan.title);
  const [localDate, setLocalDate] = useState(plan.planDate);
  const [localStartTime, setLocalStartTime] = useState(plan.startTime || "15:00");

  useEffect(() => {
    setLocalStops(plan.stops);
    setLocalTitle(plan.title);
    setLocalDate(plan.planDate);
    setLocalStartTime(plan.startTime || "15:00");
  }, [plan]);

  // Header metadata editing state
  const [isEditingHeader, setIsEditingHeader] = useState(false);
  const [headerForm, setHeaderForm] = useState({
    title: plan.title,
    planDate: plan.planDate,
    startTime: plan.startTime || "15:00",
  });
  const [isSavingHeader, setIsSavingHeader] = useState(false);

  // Partner update banner state (shown if version conflict or explicitly triggered)
  const [showPartnerBanner, setShowPartnerBanner] = useState(false);

  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Stop note inline editing state
  const [editingNoteStopId, setEditingNoteStopId] = useState<string | null>(null);
  const [tempNoteText, setTempNoteText] = useState("");

  // Detailed stop editing state
  const [editingStopId, setEditingStopId] = useState<string | null>(null);
  const [editStopForm, setEditStopForm] = useState<{
    name: string;
    duration: number;
    isLocked: boolean;
    lockedStartTime: string;
    note: string;
  } | null>(null);

  // AI Optimizer preview state
  const [aiPreview, setAiPreview] = useState<{
    recommendedStartTime: string;
    reason: string;
    stops: Array<{ id: string; name: string; icon: string }>;
  } | null>(null);
  const [isApplyingAi, setIsApplyingAi] = useState(false);

  // Quick actions loading
  const [isAutoScheduling, setIsAutoScheduling] = useState(false);
  const [isApplyingPlanB, setIsApplyingPlanB] = useState(false);

  // Modals state
  const [showAddStopModal, setShowAddStopModal] = useState(false);
  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [showDeletePlanModal, setShowDeletePlanModal] = useState(false);
  const [isDeletingPlan, setIsDeletingPlan] = useState(false);

  // Lookup place information from catalog
  const enrichedStops = useMemo(() => {
    return localStops.map((stop) => {
      const place = stop.placeId ? places.find((p) => p.id === stop.placeId) : undefined;
      const name = stop.customName || place?.name || "Địa điểm hẹn hò";
      const category = (place?.category || "coffee").toLowerCase();
      const icon = CATEGORY_ICONS[category] || "📍";
      const address = place?.address || place?.area || "Hà Nội";
      const isIndoor = place?.indoor ?? true;

      return {
        ...stop,
        name,
        category,
        icon,
        address,
        isIndoor,
        lat: place?.lat ?? null,
        lng: place?.lng ?? null,
        duration: stop.durationMin,
        isLocked: stop.isPinnedTime,
        lockedStartTime: stop.plannedTime,
      };
    });
  }, [localStops, places]);

  // Compute chained timeline
  const computedTimeline = useMemo(() => {
    return computePlanTimeline(enrichedStops, localStartTime);
  }, [enrichedStops, localStartTime]);

  const itineraryStats = useMemo(() => {
    return computeItineraryStats(computedTimeline);
  }, [computedTimeline]);

  // Save header metadata (title, date, startTime)
  const handleSaveHeader = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingHeader) return;
    setIsSavingHeader(true);
    setLocalTitle(headerForm.title);
    setLocalDate(headerForm.planDate);
    setLocalStartTime(headerForm.startTime);
    setIsEditingHeader(false);

    try {
      const res = await fetch(`/api/v1/user/plans/${plan.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: headerForm.title.trim(),
          planDate: headerForm.planDate,
          startTime: headerForm.startTime,
        }),
      });
      if (res.status === 409) {
        setShowPartnerBanner(true);
      }
      await onRefresh();
    } catch (err) {
      console.error(err);
      await onRefresh();
    } finally {
      setIsSavingHeader(false);
    }
  };

  // Reorder stops (Drag & Drop + Mobile Arrows)
  const handleReorder = async (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= localStops.length || fromIdx === toIdx) return;
    const previous = localStops;
    const optimistic = reorderStopsOptimistic(localStops, fromIdx, toIdx);
    setLocalStops(optimistic);

    try {
      const stopIds = optimistic.map((s) => s.id);
      const res = await fetch(`/api/v1/user/plans/${plan.id}/stops/reorder`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stopIds }),
      });
      if (!res.ok) throw new Error("Reorder failed");
      await onRefresh();
    } catch (err) {
      console.error(err);
      setLocalStops(previous);
    }
  };

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      await handleReorder(draggedIndex, dropIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Ripple shift duration (-15p / +15p)
  const handleRippleShift = async (stopId: string, shiftMinutes: 15 | -15) => {
    // Optimistic UI update
    setLocalStops((prev) =>
      prev.map((s) =>
        s.id === stopId ? { ...s, durationMin: Math.max(15, s.durationMin + shiftMinutes) } : s
      )
    );

    try {
      const res = await fetch(`/api/v1/user/plans/${plan.id}/ripple-shift`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stopId, shiftMinutes }),
      });
      if (!res.ok) throw new Error("Ripple shift failed");
      await onRefresh();
    } catch (err) {
      console.error(err);
      await onRefresh();
    }
  };

  // Toggle pin/locked time
  const handleTogglePin = async (stop: (typeof enrichedStops)[number]) => {
    const nextPinned = !stop.isPinnedTime;
    setLocalStops((prev) =>
      prev.map((s) => (s.id === stop.id ? { ...s, isPinnedTime: nextPinned } : s))
    );

    try {
      const res = await fetch(`/api/v1/user/plans/${plan.id}/stops/${stop.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPinnedTime: nextPinned }),
      });
      if (!res.ok) throw new Error("Toggle pin failed");
      await onRefresh();
    } catch (err) {
      console.error(err);
      await onRefresh();
    }
  };

  // Save quick stop note
  const handleSaveQuickNote = async (stopId: string) => {
    const nextNote = tempNoteText.trim() || null;
    setLocalStops((prev) =>
      prev.map((s) => (s.id === stopId ? { ...s, note: nextNote } : s))
    );
    setEditingNoteStopId(null);

    try {
      const res = await fetch(`/api/v1/user/plans/${plan.id}/stops/${stopId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: nextNote }),
      });
      if (!res.ok) throw new Error("Save note failed");
      await onRefresh();
    } catch (err) {
      console.error(err);
      await onRefresh();
    }
  };

  // Detailed stop editing
  const handleStartDetailedEdit = (stop: (typeof enrichedStops)[number]) => {
    setEditingStopId(stop.id);
    setEditStopForm({
      name: stop.name,
      duration: stop.durationMin,
      isLocked: stop.isPinnedTime,
      lockedStartTime: stop.plannedTime || "16:00",
      note: stop.note || "",
    });
  };

  const handleSaveDetailedEdit = async (stopId: string) => {
    if (!editStopForm) return;
    setLocalStops((prev) =>
      prev.map((s) =>
        s.id === stopId
          ? {
              ...s,
              customName: editStopForm.name,
              durationMin: editStopForm.duration,
              isPinnedTime: editStopForm.isLocked,
              plannedTime: editStopForm.isLocked ? editStopForm.lockedStartTime : null,
              note: editStopForm.note || null,
            }
          : s
      )
    );
    setEditingStopId(null);

    try {
      const res = await fetch(`/api/v1/user/plans/${plan.id}/stops/${stopId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customName: editStopForm.name,
          durationMin: editStopForm.duration,
          isPinnedTime: editStopForm.isLocked,
          plannedTime: editStopForm.isLocked ? editStopForm.lockedStartTime : null,
          note: editStopForm.note || null,
        }),
      });
      if (!res.ok) throw new Error("Save detailed edit failed");
      await onRefresh();
    } catch (err) {
      console.error(err);
      await onRefresh();
    }
  };

  // Delete stop
  const handleDeleteStop = async (stopId: string) => {
    setLocalStops((current) => deleteStopOptimistic(current, stopId));
    try {
      const res = await fetch(`/api/v1/user/plans/${plan.id}/stops/${stopId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete stop failed");
      await onRefresh();
    } catch (err) {
      console.error(err);
      await onRefresh();
    }
  };

  // Add stop modal submit
  const handleAddStopSubmit = async (payload: AddStopPayload) => {
    try {
      const res = await fetch(`/api/v1/user/plans/${plan.id}/stops`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customName: payload.name,
          durationMin: payload.duration,
          note: payload.note || null,
        }),
      });
      if (!res.ok) throw new Error("Add stop failed");
      await onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  // Auto-schedule golden hour
  const handleAutoSchedule = async () => {
    if (isAutoScheduling) return;
    setIsAutoScheduling(true);
    try {
      const res = await fetch(`/api/v1/user/plans/${plan.id}/auto-schedule`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Auto-schedule failed");
      await onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setIsAutoScheduling(false);
    }
  };

  // Indoor Plan B
  const handlePlanB = async () => {
    if (isApplyingPlanB) return;
    setIsApplyingPlanB(true);
    try {
      const res = await fetch(`/api/v1/user/plans/${plan.id}/plan-b`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Plan B failed");
      await onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setIsApplyingPlanB(false);
    }
  };

  // AI Optimizer
  const handleGenerateAiSequence = () => {
    const result = optimizeItinerarySequence(enrichedStops);
    setAiPreview({
      recommendedStartTime: result.recommendedStartTime,
      reason: result.reason,
      stops: result.stops.map((s) => ({
        id: (s as (typeof enrichedStops)[number]).id,
        name: (s as (typeof enrichedStops)[number]).name,
        icon: (s as (typeof enrichedStops)[number]).icon,
      })),
    });
  };

  const handleApplyAiSequence = async () => {
    if (!aiPreview || isApplyingAi) return;
    setIsApplyingAi(true);

    try {
      const stopIds = aiPreview.stops.map((s) => s.id);
      // Reorder stops
      await fetch(`/api/v1/user/plans/${plan.id}/stops/reorder`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stopIds }),
      });
      // Update plan start time
      await fetch(`/api/v1/user/plans/${plan.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startTime: aiPreview.recommendedStartTime }),
      });
      setAiPreview(null);
      await onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setIsApplyingAi(false);
    }
  };

  // Checklist handlers
  const handleToggleChecklistItem = async (itemId: string, isDone: boolean) => {
    try {
      await fetch(`/api/v1/user/plans/${plan.id}/checklist/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDone }),
      });
      await onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddChecklistItem = async (content: string) => {
    try {
      await fetch(`/api/v1/user/plans/${plan.id}/checklist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      await onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteChecklistItem = async (itemId: string) => {
    try {
      await fetch(`/api/v1/user/plans/${plan.id}/checklist/${itemId}`, {
        method: "DELETE",
      });
      await onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  // Delete plan handler
  const handleDeletePlanConfirm = async () => {
    setIsDeletingPlan(true);
    try {
      const res = await fetch(`/api/v1/user/plans/${plan.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete plan failed");
      setShowDeletePlanModal(false);
      await onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeletingPlan(false);
    }
  };

  // Export ics
  const handleExportIcs = () => {
    window.location.href = `/api/v1/user/plans/${plan.id}/export.ics`;
  };

  const completedChecklistCount = plan.checklist.filter((c) => c.isDone).length;
  const totalChecklistCount = plan.checklist.length;

  return (
    <div
      className={`bg-[#fdfbf7] border border-[#e2d6c3] rounded-2xl p-4 sm:p-6 vintage-shadow ${className}`.trim()}
    >
      {/* 1. HEADER LỊCH HẸN */}
      <div className="border-b border-[#eee5d7] pb-4 mb-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 bg-[#e8f4ec] text-[#2b6e44] text-xs font-bold px-2.5 py-1 rounded-full border border-[#bce0c8]">
              📍 Lịch hẹn sắp tới
            </span>

            {/* Quick date & time button */}
            <button
              type="button"
              onClick={() => {
                setHeaderForm({
                  title: localTitle,
                  planDate: localDate,
                  startTime: localStartTime,
                });
                setIsEditingHeader(true);
              }}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#5c4738] bg-[#f5efe6] hover:bg-[#ebe0d0] px-2.5 py-1 rounded-full border border-[#dcd0be] transition"
              title="Bấm để đổi ngày & giờ bắt đầu"
            >
              <Calendar className="w-3.5 h-3.5 text-[#c84b31]" />
              <span>{formatVietnameseDate(localDate)}</span>
              <span>•</span>
              <Clock className="w-3.5 h-3.5 text-[#c84b31]" />
              <span>{`Bắt đầu ${localStartTime}`}</span>
              <Edit3 className="w-3 h-3 opacity-60" />
            </button>
          </div>

          {/* Action buttons: Story / Edit / Delete */}
          <div className="flex items-center gap-2">
            {onShareStory && (
              <button
                type="button"
                onClick={onShareStory}
                className="inline-flex items-center gap-1 text-xs font-bold text-[#c84b31] hover:text-[#a3361f] bg-[#fff5f2] hover:bg-[#ffe8e2] px-2.5 py-1 rounded-lg border border-[#f5c6bc] transition"
              >
                🖼️ Tạo ảnh Story chia sẻ
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setHeaderForm({
                  title: localTitle,
                  planDate: localDate,
                  startTime: localStartTime,
                });
                setIsEditingHeader(!isEditingHeader);
              }}
              className="p-1.5 rounded-lg text-[#6e5645] hover:bg-[#f2eae0] transition"
              title="Sửa tiêu đề & ngày giờ lịch hẹn"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setShowDeletePlanModal(true)}
              className="p-1.5 rounded-lg text-[#b93829] hover:bg-[#fdeceb] transition"
              title="Xóa lịch hẹn này"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Inline form to edit Title, Date & StartTime */}
        {isEditingHeader ? (
          <form
            onSubmit={handleSaveHeader}
            className="mt-3 bg-[#f7f2ea] border border-[#dfd2c0] rounded-xl p-3.5 space-y-3"
          >
            <div>
              <label
                htmlFor="plan-title-input"
                className="block text-xs font-semibold text-[#6e5645] mb-1"
              >
                Tên buổi hẹn hò
              </label>
              <input
                id="plan-title-input"
                type="text"
                required
                value={headerForm.title}
                onChange={(e) =>
                  setHeaderForm((prev) => ({ ...prev, title: e.target.value }))
                }
                className="w-full px-3 py-1.5 rounded-lg border border-[#d5c5b0] bg-white text-sm font-bold text-[#2d221c] focus:outline-none focus:border-[#c84b31]"
                placeholder="Nhập tên buổi hẹn..."
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="plan-date-input"
                  className="block text-xs font-semibold text-[#6e5645] mb-1"
                >
                  Chọn ngày hẹn
                </label>
                <input
                  id="plan-date-input"
                  type="date"
                  required
                  value={headerForm.planDate}
                  onChange={(e) =>
                    setHeaderForm((prev) => ({ ...prev, planDate: e.target.value }))
                  }
                  className="w-full px-3 py-1.5 rounded-lg border border-[#d5c5b0] bg-white text-sm text-[#2d221c] focus:outline-none focus:border-[#c84b31]"
                />
              </div>
              <div>
                <label
                  htmlFor="plan-start-time-input"
                  className="block text-xs font-semibold text-[#6e5645] mb-1"
                >
                  Giờ bắt đầu chặng đầu tiên
                </label>
                <input
                  id="plan-start-time-input"
                  type="time"
                  required
                  value={headerForm.startTime}
                  onChange={(e) =>
                    setHeaderForm((prev) => ({ ...prev, startTime: e.target.value }))
                  }
                  className="w-full px-3 py-1.5 rounded-lg border border-[#d5c5b0] bg-white text-sm text-[#2d221c] focus:outline-none focus:border-[#c84b31]"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsEditingHeader(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#6e5645] hover:bg-[#e8dfd3]"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isSavingHeader}
                className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#c84b31] text-white hover:bg-[#b03e26] flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                {isSavingHeader ? "Đang lưu..." : "Lưu lịch hẹn"}
              </button>
            </div>
          </form>
        ) : (
          <h1
            onClick={() => {
              setHeaderForm({
                title: localTitle,
                planDate: localDate,
                startTime: localStartTime,
              });
              setIsEditingHeader(true);
            }}
            className="text-xl sm:text-2xl font-extrabold text-[#231915] cursor-pointer hover:text-[#c84b31] transition"
            title="Bấm để sửa tên lịch hẹn"
          >
            {localTitle}
          </h1>
        )}
      </div>

      {/* 2. BANNER CẬP NHẬT TỪ NGƯỜI THƯƠNG */}
      {showPartnerBanner && (
        <div className="mb-4 bg-[#fceae6] border border-[#df8a79] rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <p className="text-xs sm:text-sm font-bold text-[#b83723] flex items-center gap-1.5">
              <span>⚠️</span> {partnerContact} vừa cập nhật lịch hẹn!
            </p>
            <p className="text-xs text-[#593a34]">
              Bấm cập nhật để xem mốc giờ mới nhất và lời nhắn mà người ấy vừa chỉnh nhé.
            </p>
          </div>
          <button
            type="button"
            onClick={async () => {
              setShowPartnerBanner(false);
              await onRefresh();
            }}
            className="shrink-0 bg-[#c84b31] hover:bg-[#ad3b23] text-white text-xs font-bold px-4 py-2 rounded-full shadow-xs transition flex items-center justify-center gap-1.5"
          >
            🔄 Cập nhật ngay
          </button>
        </div>
      )}

      {/* 3. THANH CÔNG CỤ AI GỢI Ý & CHIPS THÔNG MINH */}
      <div className="mb-4 space-y-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleGenerateAiSequence}
            className="inline-flex items-center gap-1.5 text-xs font-bold bg-gradient-to-r from-[#c84b31] to-[#d96b38] hover:from-[#b33e25] hover:to-[#c45b2b] text-white px-3.5 py-2 rounded-full shadow-xs transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            ✨ Hệ thống gợi ý lịch trình hợp lý
          </button>

          <button
            type="button"
            onClick={handleAutoSchedule}
            disabled={isAutoScheduling}
            className="inline-flex items-center gap-1.5 text-xs font-bold bg-[#fdf3dc] hover:bg-[#f9e7be] text-[#5c4018] border border-[#e3c383] px-3 py-1.5 rounded-full transition disabled:opacity-50"
          >
            🌅 Tự xếp giờ khớp Hoàng hôn ({goldenHourStart})
          </button>

          <button
            type="button"
            onClick={handlePlanB}
            disabled={isApplyingPlanB}
            className="inline-flex items-center gap-1.5 text-xs font-bold bg-[#fdfbf7] hover:bg-[#f2ece1] text-[#3d2d24] border border-[#d6c7b2] px-3 py-1.5 rounded-full transition disabled:opacity-50"
          >
            🌧️ Đổi sang quán Trong nhà (Phòng mưa)
          </button>
        </div>

        {/* Hộp xem trước Gợi ý lịch trình hợp lý từ Hệ thống */}
        {aiPreview && (
          <div className="bg-[#fffbeb] border-2 border-[#e3b34c] rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#8c5811]">
                <Sparkles className="w-4 h-4 text-[#d98218]" />
                ĐỀ XUẤT LỊCH TRÌNH HỢP LÝ TỪ DATEMATE:
              </div>
              <button
                type="button"
                onClick={() => setAiPreview(null)}
                className="text-xs text-[#8c5811] hover:underline"
              >
                Đóng
              </button>
            </div>
            <p className="text-xs text-[#594224] leading-relaxed">{aiPreview.reason}</p>
            <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-[#3d2d24]">
              {aiPreview.stops.map((s, i) => (
                <React.Fragment key={s.id}>
                  <span className="bg-white border border-[#e6d5b8] px-2 py-1 rounded-md">
                    {i + 1}. {s.icon} {s.name}
                  </span>
                  {i < aiPreview.stops.length - 1 && (
                    <ChevronRight className="w-3.5 h-3.5 text-[#a68a64]" />
                  )}
                </React.Fragment>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setAiPreview(null)}
                className="px-3 py-1 rounded-lg text-xs font-semibold text-[#6e5645] hover:bg-[#f2e5c9]"
              >
                Giữ nguyên lịch cũ
              </button>
              <button
                type="button"
                onClick={handleApplyAiSequence}
                disabled={isApplyingAi}
                className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#c84b31] text-white hover:bg-[#ad3b23] flex items-center gap-1 disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                {isApplyingAi ? "Đang áp dụng..." : "Áp dụng lịch trình này"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* HƯỚNG DẪN KÉO THẢ */}
      <div className="flex items-center justify-between text-xs text-[#7d6856] mb-3 px-1">
        <span className="flex items-center gap-1.5">
          <GripVertical className="w-3.5 h-3.5 text-[#b09b84]" />
          Mẹo: Giữ biểu tượng <b>⋮⋮</b> để kéo thả đổi thứ tự hoặc bấm <b>+15p / -15p</b> để
          chỉnh mốc giờ
        </span>
        <button
          type="button"
          onClick={() => setShowAddStopModal(true)}
          className="inline-flex items-center gap-1 font-bold text-[#c84b31] hover:underline"
        >
          <Plus className="w-3.5 h-3.5" /> Thêm chặng mới
        </button>
      </div>

      {/* 4. DANH SÁCH CHẶNG (DRAG & DROP TIMELINE) */}
      {computedTimeline.length === 0 ? (
        <div className="text-center py-12 bg-[#f8f3eb] rounded-xl border border-dashed border-[#d5c5b0]">
          <p className="text-sm font-semibold text-[#6e5645] mb-2">
            Chưa có địa điểm nào trong lịch hẹn này.
          </p>
          <button
            type="button"
            onClick={() => setShowAddStopModal(true)}
            className="bg-[#c84b31] text-white text-xs font-bold px-4 py-2 rounded-full hover:bg-[#ad3b23] transition"
          >
            + Thêm địa điểm đầu tiên
          </button>
        </div>
      ) : (
        <div className="relative timeline-line space-y-3.5">
          {computedTimeline.map((stopItem, idx) => {
            const stop = stopItem.item;
            const isBeingDragged = draggedIndex === idx;
            const isDragOver = dragOverIndex === idx;
            const isEditingThis = editingStopId === stop.id;
            const isEditingNote = editingNoteStopId === stop.id;

            return (
              <div
                key={stop.id}
                draggable={!isEditingThis && !isEditingNote}
                onDragStart={(e) => handleDragStart(e, idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDrop={(e) => handleDrop(e, idx)}
                onDragEnd={() => {
                  setDraggedIndex(null);
                  setDragOverIndex(null);
                }}
                className={`relative pl-11 transition-all duration-150 ${
                  isBeingDragged ? "opacity-45 scale-[0.98]" : "opacity-100"
                } ${isDragOver ? "translate-y-1" : ""}`}
              >
                {/* Node circle */}
                <div
                  className={`absolute left-2.5 top-4 w-5 h-5 rounded-full border-2 flex items-center justify-center z-10 text-[10px] font-bold shadow-xs ${
                    stop.isLocked
                      ? "bg-[#c84b31] border-[#fdfbf7] text-white"
                      : "bg-[#fdf3dc] border-[#c84b31] text-[#c84b31]"
                  }`}
                  title={`Mốc ${idx + 1}: ${stopItem.startTimeStr}`}
                >
                  {idx + 1}
                </div>

                {/* Stop Card */}
                <div
                  className={`bg-[#f9f5ed] hover:bg-[#f7f1e6] border rounded-xl p-3.5 transition shadow-xs ${
                    isDragOver
                      ? "border-2 border-dashed border-[#c84b31] bg-[#fff5f2]"
                      : stop.isLocked
                      ? "border-[#dfc8a8]"
                      : "border-[#e4d9c8]"
                  }`}
                >
                  {/* Row 1: Time badge, name, badges, controls */}
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <div
                        className="cursor-grab active:cursor-grabbing text-[#a6927d] hover:text-[#5c4738] p-0.5 -ml-1"
                        title="Kéo thả để sắp xếp lại mốc giờ"
                      >
                        <GripVertical className="w-4 h-4" />
                      </div>

                      <span className="bg-[#c84b31] text-white text-xs font-extrabold px-2.5 py-1 rounded-md tracking-tight shadow-xs">
                        {`${stopItem.startTimeStr} - ${stopItem.endTimeStr}`}
                      </span>

                      <h3
                        onClick={() => {
                          const slug = places.find((p) => p.id === stop.placeId)?.slug;
                          if (slug && onOpenPlaceDetail) {
                            onOpenPlaceDetail(slug);
                          }
                        }}
                        className={`text-sm sm:text-base font-extrabold text-[#231915] flex items-center gap-1.5 ${
                          stop.placeId ? "cursor-pointer hover:text-[#c84b31]" : ""
                        }`}
                      >
                        <span>{stop.icon}</span>
                        <span>{stop.name}</span>
                      </h3>

                      {stop.isLocked && (
                        <span className="inline-flex items-center gap-1 bg-[#fdf3dc] text-[#785118] border border-[#e3c383] text-[11px] font-bold px-2 py-0.5 rounded-md">
                          📌 Cố định giờ
                        </span>
                      )}

                      {stopItem.overlapsGoldenHour && (
                        <span className="inline-flex items-center gap-1 bg-[#fff0db] text-[#b85d19] border border-[#f5cca0] text-[11px] font-semibold px-2 py-0.5 rounded-md">
                          🌅 Đón Hoàng hôn
                        </span>
                      )}
                    </div>

                    {/* Controls: Up/Down, -15p, +15p, Pin, Edit, Delete */}
                    <div className="flex items-center gap-1.5 ml-auto">
                      <div className="flex items-center border border-[#dcd0be] rounded-md bg-white overflow-hidden mr-1">
                        <button
                          type="button"
                          onClick={() => handleReorder(idx, idx - 1)}
                          disabled={idx === 0}
                          className="p-1 text-[#6e5645] hover:bg-[#f3ede2] disabled:opacity-30"
                          title="Đẩy lên chặng trước"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReorder(idx, idx + 1)}
                          disabled={idx === computedTimeline.length - 1}
                          className="p-1 text-[#6e5645] hover:bg-[#f3ede2] disabled:opacity-30 border-l border-[#dcd0be]"
                          title="Đẩy xuống chặng sau"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRippleShift(stop.id, -15)}
                        className="bg-white hover:bg-[#f0e8dc] text-[#2d221c] border border-[#cfc1ae] text-xs font-bold px-2 py-1 rounded-md transition"
                        title="Giảm thời lượng 15 phút"
                      >
                        -15p
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRippleShift(stop.id, 15)}
                        className="bg-white hover:bg-[#f0e8dc] text-[#2d221c] border border-[#cfc1ae] text-xs font-bold px-2 py-1 rounded-md transition"
                        title="Tăng thời lượng 15 phút"
                      >
                        +15p
                      </button>

                      <button
                        type="button"
                        onClick={() => handleTogglePin(stop)}
                        className={`px-2 py-1 rounded-md border text-xs font-bold transition ${
                          stop.isLocked
                            ? "bg-[#c84b31] text-white border-[#b03e26]"
                            : "bg-white text-[#c84b31] border-[#cfc1ae] hover:bg-[#fff2ef]"
                        }`}
                        title={
                          stop.isLocked
                            ? "Đang cố định giờ (Bấm để mở khóa)"
                            : "Bấm để cố định mốc giờ này"
                        }
                      >
                        📌
                      </button>

                      <button
                        type="button"
                        onClick={() => handleStartDetailedEdit(stop)}
                        className="p-1.5 rounded-md bg-white hover:bg-[#f0e8dc] text-[#5c4738] border border-[#cfc1ae] transition"
                        title="Sửa chi tiết chặng"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteStop(stop.id)}
                        className="p-1.5 rounded-md bg-white hover:bg-[#fdeceb] text-[#b93829] border border-[#cfc1ae] transition"
                        title="Xóa địa điểm này"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Row 2: Travel info line */}
                  <div className="mt-2 space-y-1 text-xs text-[#6e5645]">
                    {idx === 0 ? (
                      <p className="flex items-center gap-1.5 font-medium">
                        <span>📍</span> Điểm hẹn mở đầu hành trình ({stop.duration} phút tại quán)
                      </p>
                    ) : (
                      <p className="flex items-center gap-1.5">
                        <span>🛵</span>
                        <span>
                          Di chuyển từ <b>{computedTimeline[idx - 1].item.name}</b>:{" "}
                          <strong className="text-[#2d221c]">
                            +{stopItem.travelMins} phút
                          </strong>{" "}
                          ({stopItem.distKm} km, đã tính 8p gửi xe) • Dừng chân {stop.duration} phút
                        </span>
                      </p>
                    )}

                    {stopItem.timeConflictWarning && (
                      <p className="text-[#b83723] font-semibold flex items-center gap-1 bg-[#fceae6] px-2 py-1 rounded">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        {stopItem.timeConflictWarning}
                      </p>
                    )}
                  </div>

                  {/* Row 3: Quick Stop Note (Inline Editable) */}
                  <div className="mt-2.5">
                    {isEditingNote ? (
                      <div className="bg-white border border-[#c84b31] rounded-lg p-2 space-y-2">
                        <textarea
                          rows={2}
                          value={tempNoteText}
                          onChange={(e) => setTempNoteText(e.target.value)}
                          placeholder="Nhập ghi chú cho chặng này (VD: Đặt bàn tầng 2, mua hoa, góc chụp đẹp...)"
                          className="w-full text-xs text-[#2d221c] focus:outline-none resize-none"
                          autoFocus
                        />
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditingNoteStopId(null)}
                            className="px-2.5 py-1 rounded text-xs text-[#6e5645] hover:bg-[#f3ede2]"
                          >
                            Hủy
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveQuickNote(stop.id)}
                            className="px-2.5 py-1 rounded text-xs font-bold bg-[#c84b31] text-white hover:bg-[#a63922]"
                          >
                            Lưu ghi chú
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => {
                          setEditingNoteStopId(stop.id);
                          setTempNoteText(stop.note || "");
                        }}
                        className="group cursor-pointer bg-[#fdfbf7] hover:bg-white border border-[#e6dac8] rounded-lg px-2.5 py-1.5 flex items-start justify-between gap-2 transition"
                        title="Bấm để sửa ghi chú cho mốc thời gian này"
                      >
                        <div className="flex items-start gap-1.5 text-xs text-[#4f3d30]">
                          <StickyNote className="w-3.5 h-3.5 text-[#c84b31] shrink-0 mt-0.5" />
                          <span>
                            <strong className="font-semibold text-[#785118]">Ghi chú: </strong>
                            {stop.note ? (
                              stop.note
                            ) : (
                              <span className="italic text-[#9c8874]">
                                Bấm để thêm ghi chú cho mốc giờ này...
                              </span>
                            )}
                          </span>
                        </div>
                        <span className="text-[11px] text-[#c84b31] opacity-0 group-hover:opacity-100 font-semibold shrink-0">
                          Sửa ghi chú ✎
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Detailed Edit Form */}
                  {isEditingThis && editStopForm && (
                    <div className="mt-3 pt-3 border-t border-[#e2d6c3] bg-white rounded-xl p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-[#c84b31] uppercase">
                          Chỉnh sửa chi tiết chặng #{idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => setEditingStopId(null)}
                          className="text-xs text-[#7d6856] hover:text-[#2d221c]"
                        >
                          Đóng ✕
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-semibold text-[#6e5645] mb-1">
                            Tên chặng
                          </label>
                          <input
                            type="text"
                            value={editStopForm.name}
                            onChange={(e) =>
                              setEditStopForm((prev) =>
                                prev ? { ...prev, name: e.target.value } : null
                              )
                            }
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#d5c5b0] text-[#2d221c]"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-[#6e5645] mb-1">
                            Thời lượng dừng (phút)
                          </label>
                          <input
                            type="number"
                            step="15"
                            min="15"
                            max="240"
                            value={editStopForm.duration}
                            onChange={(e) =>
                              setEditStopForm((prev) =>
                                prev
                                  ? { ...prev, duration: Number(e.target.value) || 60 }
                                  : null
                              )
                            }
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#d5c5b0] text-[#2d221c]"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editStopForm.isLocked}
                            onChange={(e) =>
                              setEditStopForm((prev) =>
                                prev ? { ...prev, isLocked: e.target.checked } : null
                              )
                            }
                            className="accent-[#c84b31]"
                          />
                          <span>📌 Cố định giờ bắt đầu</span>
                        </label>

                        {editStopForm.isLocked && (
                          <input
                            type="time"
                            value={editStopForm.lockedStartTime}
                            onChange={(e) =>
                              setEditStopForm((prev) =>
                                prev ? { ...prev, lockedStartTime: e.target.value } : null
                              )
                            }
                            className="px-2 py-1 text-xs rounded border border-[#d5c5b0] text-[#2d221c]"
                          />
                        )}
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-[#6e5645] mb-1">
                          Ghi chú
                        </label>
                        <input
                          type="text"
                          value={editStopForm.note}
                          onChange={(e) =>
                            setEditStopForm((prev) =>
                              prev ? { ...prev, note: e.target.value } : null
                            )
                          }
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#d5c5b0] text-[#2d221c]"
                          placeholder="Ghi chú chi tiết..."
                        />
                      </div>

                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingStopId(null)}
                          className="px-3 py-1 rounded-lg text-xs font-semibold text-[#6e5645] hover:bg-[#f3ede2]"
                        >
                          Hủy
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveDetailedEdit(stop.id)}
                          className="px-3.5 py-1 rounded-lg text-xs font-bold bg-[#c84b31] text-white hover:bg-[#a63922]"
                        >
                          Lưu thay đổi
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Row 4: Google maps navigation link */}
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <a
                      href={
                        stop.lat && stop.lng
                          ? `https://www.google.com/maps/search/?api=1&query=${stop.lat},${stop.lng}`
                          : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                              `${stop.name} ${stop.address}`
                            )}`
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-bold text-[#c84b31] hover:underline"
                    >
                      <Navigation className="w-3 h-3" />
                      Chỉ đường ({stop.address})
                    </a>
                    <span className="text-[11px] text-[#9c8874]">
                      Mốc #{idx + 1}: {stopItem.startTimeStr} ➔ {stopItem.endTimeStr}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Button to add stop */}
      <div className="mt-4 pl-11">
        <button
          type="button"
          onClick={() => setShowAddStopModal(true)}
          className="w-full py-2.5 rounded-xl border-2 border-dashed border-[#d5c5b0] hover:border-[#c84b31] bg-[#faf6f0] hover:bg-[#fff5f2] text-xs font-bold text-[#6e5645] hover:text-[#c84b31] transition flex items-center justify-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Thêm địa điểm mới vào mốc tiếp theo ({itineraryStats.endStr})
        </button>
      </div>

      {/* 5. FOOTER CARD TRÁI: CHECKLIST & LƯU .ICS */}
      <div className="mt-6 pt-4 border-t border-[#eee5d7] flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setShowChecklistModal(true)}
          className="inline-flex items-center gap-2 bg-[#f3ede2] hover:bg-[#e8dfd1] border border-[#d6c7b2] px-3.5 py-2 rounded-full text-xs font-bold text-[#3d2d24] transition"
        >
          <span>☑️ Đồ cần chuẩn bị:</span>
          <span className="text-[#c84b31]">
            {`${completedChecklistCount}/${totalChecklistCount} xong`}
          </span>
        </button>

        <div className="flex items-center gap-2">
          {onNotifyPartner && (
            <button
              type="button"
              onClick={onNotifyPartner}
              className="inline-flex items-center gap-1.5 bg-[#fdf3dc] hover:bg-[#f7e4b9] text-[#785118] border border-[#e3c383] text-xs font-bold px-4 py-2.5 rounded-full transition"
            >
              <Send className="w-3.5 h-3.5" /> Gửi lịch cho Người thương
            </button>
          )}
          <button
            type="button"
            onClick={handleExportIcs}
            className="inline-flex items-center gap-1.5 bg-[#c84b31] hover:bg-[#ad3b23] text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-xs transition"
          >
            📅 Lưu vào Lịch ĐT (.ics)
          </button>
        </div>
      </div>

      {/* Modals */}
      <AddStopModal
        isOpen={showAddStopModal}
        onClose={() => setShowAddStopModal(false)}
        onAddStop={handleAddStopSubmit}
      />

      <PlanChecklistModal
        isOpen={showChecklistModal}
        onClose={() => setShowChecklistModal(false)}
        items={plan.checklist.map((c) => ({
          id: c.id,
          item: c.content,
          isChecked: c.isDone,
          assignedTo: c.assignedTo as "user1" | "user2" | null,
        }))}
        onToggleItem={handleToggleChecklistItem}
        onAddItem={handleAddChecklistItem}
        onDeleteItem={handleDeleteChecklistItem}
      />

      <DeletePlanModal
        isOpen={showDeletePlanModal}
        onClose={() => setShowDeletePlanModal(false)}
        onConfirm={handleDeletePlanConfirm}
        planTitle={localTitle}
        isDeleting={isDeletingPlan}
      />
    </div>
  );
}
