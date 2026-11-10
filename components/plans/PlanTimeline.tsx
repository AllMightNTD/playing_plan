"use client";

import React, { useState, useEffect, useMemo } from "react";
import type { PlanDetailDto, PlanStopDto } from "@/server/services/user/plan.mapper";
import type { HanoiPlace } from "@/lib/types/catalog";
import {
  computePlanTimeline,
  computeItineraryStats,
  optimizeItinerarySequence,
} from "@/lib/plan-optimizer";
import {
  DATING_TEMPLATES,
  enrichPlanStops,
  matchCatalogPlaceByName,
  type DatingTemplate,
} from "@/lib/plan-enrichment";
import { reorderStopsOptimistic, deleteStopOptimistic } from "@/lib/optimistic-timeline";
import { AddStopModal, type AddStopPayload } from "./modals/AddStopModal";
import { PlanChecklistModal } from "./modals/PlanChecklistModal";
import { DeletePlanModal } from "./modals/DeletePlanModal";
import { PlanHeaderBar, type PlanHeaderFormState } from "./timeline/PlanHeaderBar";
import { PlanQuickToolbar } from "./timeline/PlanQuickToolbar";
import { TimelineStopCard, type DetailedStopEditPayload } from "./timeline/TimelineStopCard";
import { PlanFooterActions } from "./timeline/PlanFooterActions";

export { DATING_TEMPLATES, type DatingTemplate };

export interface PlanTimelineProps {
  plan: PlanDetailDto;
  places?: HanoiPlace[];
  onRefresh: () => Promise<void>;
  onOpenPlaceDetail?: (slug: string) => void;
  onShareStory?: () => void;
  onNotifyPartner?: () => void;
  onCompletePlan?: () => void;
  onNotifyMessage?: (message: string, type?: "info" | "success" | "error") => void;
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
  onCompletePlan,
  onNotifyMessage,
  goldenHourStart,
  partnerContact: _partnerContact,
  className = "",
}: PlanTimelineProps) {
  const [localStops, setLocalStops] = useState<PlanStopDto[]>(plan.stops);
  const [localStartTime, setLocalStartTime] = useState(plan.startTime || "15:00");
  const [localTitle, setLocalTitle] = useState(plan.title);
  const [localPlanDate, setLocalPlanDate] = useState(plan.planDate);

  const [isEditingHeader, setIsEditingHeader] = useState(false);
  const [headerForm, setHeaderForm] = useState<PlanHeaderFormState>({
    title: plan.title,
    planDate: plan.planDate,
    startTime: plan.startTime || "15:00",
  });
  const [isSavingHeader, setIsSavingHeader] = useState(false);

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const [isApplyingPlanB, setIsApplyingPlanB] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isApplyingTemplate, setIsApplyingTemplate] = useState(false);
  const [optimizerHint, setOptimizerHint] = useState<string | null>(null);

  const [showAddStopModal, setShowAddStopModal] = useState(false);
  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [showDeletePlanModal, setShowDeletePlanModal] = useState(false);
  const [isDeletingPlan, setIsDeletingPlan] = useState(false);

  useEffect(() => {
    setLocalStops(plan.stops);
  }, [plan.stops]);

  useEffect(() => {
    setLocalTitle(plan.title);
    setLocalPlanDate(plan.planDate);
    setLocalStartTime(plan.startTime || "15:00");
    setHeaderForm({
      title: plan.title,
      planDate: plan.planDate,
      startTime: plan.startTime || "15:00",
    });
  }, [plan.title, plan.planDate, plan.startTime]);

  const enrichedStops = useMemo(
    () => enrichPlanStops(localStops, places),
    [localStops, places]
  );

  const computedTimeline = useMemo(
    () => computePlanTimeline(enrichedStops, localStartTime),
    [enrichedStops, localStartTime]
  );

  const itineraryStats = useMemo(
    () => computeItineraryStats(computedTimeline),
    [computedTimeline]
  );

  const reportError = (fallbackMsg: string) => {
    onNotifyMessage?.(fallbackMsg, "error");
  };

  const handleReorder = async (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= localStops.length || fromIdx === toIdx) return;
    const previous = localStops;
    const optimistic = reorderStopsOptimistic(localStops, fromIdx, toIdx);
    setLocalStops(optimistic);

    try {
      const res = await fetch(`/api/v1/user/plans/${plan.id}/stops/reorder`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stopIds: optimistic.map((s) => s.id) }),
      });
      if (!res.ok) throw new Error("Reorder failed");
      await onRefresh();
    } catch {
      setLocalStops(previous);
      reportError("Chưa lưu được thứ tự chặng mới, thử lại nhé.");
    }
  };

  const handleRippleShift = async (stopId: string, shiftMinutes: 15 | -15) => {
    const previous = localStops;
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
    } catch {
      setLocalStops(previous);
      reportError("Chưa cập nhật được thời lượng chặng.");
    }
  };

  const handleTogglePin = async (
    stopId: string,
    currentPinned: boolean,
    currentStartTimeStr: string
  ) => {
    const previous = localStops;
    const nextPinned = !currentPinned;
    const nextTime = nextPinned ? currentStartTimeStr : null;
    setLocalStops((prev) =>
      prev.map((s) =>
        s.id === stopId ? { ...s, isPinnedTime: nextPinned, plannedTime: nextTime } : s
      )
    );
    try {
      const res = await fetch(`/api/v1/user/plans/${plan.id}/stops/${stopId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPinnedTime: nextPinned, plannedTime: nextTime }),
      });
      if (!res.ok) throw new Error("Toggle pin failed");
      await onRefresh();
    } catch {
      setLocalStops(previous);
      reportError("Chưa cập nhật được mốc giờ cố định.");
    }
  };

  const handleSaveQuickNote = async (stopId: string, rawNote: string) => {
    const previous = localStops;
    const nextNote = rawNote.trim() || null;
    setLocalStops((prev) => prev.map((s) => (s.id === stopId ? { ...s, note: nextNote } : s)));
    try {
      const res = await fetch(`/api/v1/user/plans/${plan.id}/stops/${stopId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: nextNote }),
      });
      if (!res.ok) throw new Error("Save note failed");
      await onRefresh();
    } catch {
      setLocalStops(previous);
      reportError("Chưa lưu được ghi chú chặng.");
    }
  };

  const handleSaveDetailedEdit = async (stopId: string, payload: DetailedStopEditPayload) => {
    const previous = localStops;
    const trimmedName = payload.name.trim();
    const nextNote = payload.note.trim() || null;
    setLocalStops((prev) =>
      prev.map((s) =>
        s.id === stopId
          ? {
              ...s,
              ...(trimmedName ? { customName: trimmedName } : {}),
              durationMin: payload.duration,
              isPinnedTime: payload.isLocked,
              plannedTime: payload.isLocked ? payload.lockedStartTime : null,
              note: nextNote,
            }
          : s
      )
    );
    try {
      const res = await fetch(`/api/v1/user/plans/${plan.id}/stops/${stopId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(trimmedName ? { customName: trimmedName } : {}),
          durationMin: payload.duration,
          isPinnedTime: payload.isLocked,
          plannedTime: payload.isLocked ? payload.lockedStartTime : null,
          note: nextNote,
        }),
      });
      if (!res.ok) throw new Error("Save detailed edit failed");
      await onRefresh();
    } catch {
      setLocalStops(previous);
      reportError("Chưa lưu được chi tiết chặng hẹn.");
    }
  };

  const handleDeleteStop = async (stopId: string) => {
    const previous = localStops;
    setLocalStops((current) => deleteStopOptimistic(current, stopId));
    try {
      const res = await fetch(`/api/v1/user/plans/${plan.id}/stops/${stopId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete stop failed");
      await onRefresh();
    } catch {
      setLocalStops(previous);
      reportError("Chưa xóa được địa điểm này.");
    }
  };

  const handleAddStopSubmit = async (payload: AddStopPayload) => {
    const fallbackMatch = payload.placeId ? null : matchCatalogPlaceByName(payload.name, places);
    const resolvedPlaceId = payload.placeId ?? fallbackMatch?.id ?? null;
    const cleanNote = payload.note.trim();
    const requestBody = resolvedPlaceId
      ? {
          placeId: resolvedPlaceId,
          durationMin: payload.duration,
          ...(cleanNote ? { note: cleanNote } : {}),
        }
      : {
          customName: payload.name.trim(),
          durationMin: payload.duration,
          ...(cleanNote ? { note: cleanNote } : {}),
        };

    try {
      const res = await fetch(`/api/v1/user/plans/${plan.id}/stops`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      if (!res.ok) throw new Error("Add stop failed");
      onNotifyMessage?.(`📍 Đã thêm "${payload.name}" vào lịch hẹn!`, "success");
      await onRefresh();
    } catch {
      reportError("Chưa thêm được chặng mới, thử lại nhé.");
    }
  };

  const handleSaveHeader = async () => {
    const nextTitle = headerForm.title.trim() || "Buổi hẹn hò";
    setIsSavingHeader(true);
    setLocalTitle(nextTitle);
    setLocalPlanDate(headerForm.planDate);
    setLocalStartTime(headerForm.startTime);
    try {
      const res = await fetch(`/api/v1/user/plans/${plan.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: nextTitle,
          planDate: headerForm.planDate,
          startTime: headerForm.startTime,
        }),
      });
      if (!res.ok) throw new Error("Update header failed");
      setIsEditingHeader(false);
      await onRefresh();
    } catch {
      await onRefresh();
      reportError("Chưa cập nhật được thông tin lịch hẹn.");
    } finally {
      setIsSavingHeader(false);
    }
  };

  const handleSunsetAlign = async () => {
    if (localStops.length < 2) return;
    const sunsetTarget = goldenHourStart || "16:20";
    const targetStop = localStops[1];
    if (!targetStop) return;
    const previous = localStops;
    setLocalStops((prev) =>
      prev.map((s, idx) =>
        idx === 1 ? { ...s, isPinnedTime: true, plannedTime: sunsetTarget } : s
      )
    );
    try {
      const res = await fetch(`/api/v1/user/plans/${plan.id}/stops/${targetStop.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPinnedTime: true, plannedTime: sunsetTarget }),
      });
      if (!res.ok) throw new Error("Sunset align failed");
      onNotifyMessage?.(`🌅 Đã ghim chặng #2 vào Giờ Vàng (${sunsetTarget})!`, "success");
      await onRefresh();
    } catch {
      setLocalStops(previous);
      reportError("Chưa căn chỉnh được giờ hoàng hôn.");
    }
  };

  const handleOptimizeSequence = async () => {
    if (isOptimizing || enrichedStops.length < 2) return;
    setIsOptimizing(true);
    const previousStops = localStops;
    const previousStart = localStartTime;

    const optimized = optimizeItinerarySequence(enrichedStops);
    const nextStops: PlanStopDto[] = optimized.stops.map((opt, idx) => ({
      id: opt.id,
      placeId: opt.placeId,
      customName: opt.customName,
      sortOrder: idx,
      plannedTime: opt.lockedStartTime ?? null,
      durationMin: opt.duration ?? opt.durationMin,
      dayOffset: opt.dayOffset,
      startMinute: opt.startMinute,
      travelMinutes: opt.travelMinutes,
      isPinnedTime: Boolean(opt.isLocked),
      note: opt.note || null,
    }));

    setLocalStartTime(optimized.recommendedStartTime);
    setLocalStops(nextStops);
    setOptimizerHint(optimized.reason);

    try {
      const reorderRes = await fetch(`/api/v1/user/plans/${plan.id}/stops/reorder`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stopIds: nextStops.map((s) => s.id) }),
      });
      if (!reorderRes.ok) throw new Error("Optimize reorder failed");

      const sunsetCandidate = nextStops[1];
      if (sunsetCandidate) {
        await fetch(`/api/v1/user/plans/${plan.id}/stops/${sunsetCandidate.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            isPinnedTime: true,
            plannedTime: goldenHourStart || sunsetCandidate.plannedTime || "16:15",
          }),
        });
      }
      onNotifyMessage?.("✨ Đã tối ưu thứ tự các chặng theo nhịp hẹn hò!", "success");
      await onRefresh();
    } catch {
      setLocalStops(previousStops);
      setLocalStartTime(previousStart);
      reportError("Chưa tối ưu được lộ trình, thử lại nhé.");
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleApplyTemplate = async (template: DatingTemplate) => {
    if (isApplyingTemplate) return;
    setIsApplyingTemplate(true);

    const tempStops: PlanStopDto[] = template.stops.map((ts, idx) => {
      const matched = matchCatalogPlaceByName(ts.name, places);
      return {
        id: `temp-${Date.now()}-${idx}`,
        placeId: matched?.id ?? null,
        customName: matched ? null : ts.name,
        sortOrder: idx,
        plannedTime: ts.lockedStartTime || null,
        durationMin: ts.duration,
        dayOffset: 0,
        startMinute: 900 + idx * 60,
        travelMinutes: idx === 0 ? 0 : 15,
        isPinnedTime: Boolean(ts.isLocked),
        note: ts.note || null,
      };
    });
    setLocalStops(tempStops);

    try {
      for (const stop of template.stops) {
        const matched = matchCatalogPlaceByName(stop.name, places);
        const body = matched
          ? {
              placeId: matched.id,
              durationMin: stop.duration,
              ...(stop.lockedStartTime ? { plannedTime: stop.lockedStartTime } : {}),
              ...(stop.note ? { note: stop.note } : {}),
            }
          : {
              customName: stop.name,
              durationMin: stop.duration,
              ...(stop.lockedStartTime ? { plannedTime: stop.lockedStartTime } : {}),
              ...(stop.note ? { note: stop.note } : {}),
            };
        const res = await fetch(`/api/v1/user/plans/${plan.id}/stops`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error("Template stop failed");
      }
      onNotifyMessage?.(`✨ Đã áp dụng kịch bản "${template.title}"!`, "success");
      await onRefresh();
    } catch {
      await onRefresh();
      reportError("Chưa áp dụng được kịch bản mẫu.");
    } finally {
      setIsApplyingTemplate(false);
    }
  };

  const handlePlanB = async () => {
    if (isApplyingPlanB) return;
    setIsApplyingPlanB(true);
    try {
      const res = await fetch(`/api/v1/user/plans/${plan.id}/plan-b`, { method: "POST" });
      if (!res.ok) throw new Error("Plan B failed");
      onNotifyMessage?.("🌧️ Đã cập nhật phương án trong nhà phòng mưa!", "success");
      await onRefresh();
    } catch {
      reportError("Chưa chuyển đổi được phương án phòng mưa.");
    } finally {
      setIsApplyingPlanB(false);
    }
  };

  const handleDeletePlanConfirm = async () => {
    setIsDeletingPlan(true);
    try {
      const res = await fetch(`/api/v1/user/plans/${plan.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete plan failed");
      setShowDeletePlanModal(false);
      onNotifyMessage?.("🗑️ Đã xóa lịch hẹn.", "info");
      await onRefresh();
    } catch {
      reportError("Chưa xóa được lịch hẹn.");
    } finally {
      setIsDeletingPlan(false);
    }
  };

  const completedChecklistCount = plan.checklist.filter((c) => c.isDone).length;

  return (
    <div
      className={`bg-[#FFFDF9]/95 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-[#F2E4DC] shadow-xs space-y-5 relative ${className}`.trim()}
    >
      <PlanHeaderBar
        title={localTitle}
        planDate={localPlanDate}
        startTime={localStartTime}
        status={plan.status}
        isSecret={plan.isSecret}
        isEditing={isEditingHeader}
        isSaving={isSavingHeader}
        stopsCount={computedTimeline.length}
        form={headerForm}
        onChangeForm={setHeaderForm}
        onStartEdit={() => {
          setHeaderForm({
            title: localTitle,
            planDate: localPlanDate,
            startTime: localStartTime,
          });
          setIsEditingHeader(true);
        }}
        onCancelEdit={() => setIsEditingHeader(false)}
        onSaveEdit={handleSaveHeader}
        onShareStory={onShareStory}
        onCompletePlan={onCompletePlan}
        onRequestDeletePlan={() => setShowDeletePlanModal(true)}
      />

      <PlanQuickToolbar
        stopsCount={computedTimeline.length}
        goldenHourStart={goldenHourStart}
        isApplyingPlanB={isApplyingPlanB}
        isOptimizing={isOptimizing}
        isApplyingTemplate={isApplyingTemplate}
        optimizerHint={optimizerHint}
        onSunsetAlign={handleSunsetAlign}
        onPlanB={handlePlanB}
        onOptimizeSequence={handleOptimizeSequence}
        onOpenAddStop={() => setShowAddStopModal(true)}
        onApplyTemplate={handleApplyTemplate}
      />

      {computedTimeline.length > 0 && (
        <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-[11px] before:top-5 before:bottom-5 before:w-0.5 before:bg-gradient-to-b before:from-rose-300 before:via-amber-200 before:to-rose-200">
          {computedTimeline.map((stopItem, idx) => (
            <TimelineStopCard
              key={stopItem.item.id}
              stopItem={stopItem}
              index={idx}
              totalStops={computedTimeline.length}
              previousStopName={idx > 0 ? computedTimeline[idx - 1].item.name : null}
              isBeingDragged={draggedIndex === idx}
              isDragOver={dragOverIndex === idx}
              onDragStart={(e, index) => {
                setDraggedIndex(index);
                e.dataTransfer.effectAllowed = "move";
              }}
              onDragOver={(e, index) => {
                e.preventDefault();
                if (draggedIndex !== null && draggedIndex !== index) setDragOverIndex(index);
              }}
              onDrop={async (e, dropIndex) => {
                e.preventDefault();
                if (draggedIndex !== null && draggedIndex !== dropIndex) {
                  await handleReorder(draggedIndex, dropIndex);
                }
                setDraggedIndex(null);
                setDragOverIndex(null);
              }}
              onDragEnd={() => {
                setDraggedIndex(null);
                setDragOverIndex(null);
              }}
              onReorder={handleReorder}
              onRippleShift={handleRippleShift}
              onTogglePin={handleTogglePin}
              onSaveQuickNote={handleSaveQuickNote}
              onSaveDetailedEdit={handleSaveDetailedEdit}
              onDeleteStop={handleDeleteStop}
              onOpenPlaceDetail={onOpenPlaceDetail}
            />
          ))}
        </div>
      )}

      <PlanFooterActions
        nextSlotEndStr={itineraryStats.endStr}
        completedChecklistCount={completedChecklistCount}
        totalChecklistCount={plan.checklist.length}
        onOpenAddStop={() => setShowAddStopModal(true)}
        onOpenChecklist={() => setShowChecklistModal(true)}
        onNotifyPartner={onNotifyPartner}
        onExportIcs={() => {
          window.location.href = `/api/v1/user/plans/${plan.id}/export.ics`;
        }}
      />

      <AddStopModal
        isOpen={showAddStopModal}
        onClose={() => setShowAddStopModal(false)}
        onAddStop={handleAddStopSubmit}
        places={places}
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
        onToggleItem={async (itemId, isDone) => {
          await fetch(`/api/v1/user/plans/${plan.id}/checklist/${itemId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isDone }),
          });
          await onRefresh();
        }}
        onAddItem={async (content) => {
          await fetch(`/api/v1/user/plans/${plan.id}/checklist`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content }),
          });
          await onRefresh();
        }}
        onDeleteItem={async (itemId) => {
          await fetch(`/api/v1/user/plans/${plan.id}/checklist/${itemId}`, {
            method: "DELETE",
          });
          await onRefresh();
        }}
      />

      <DeletePlanModal
        isOpen={showDeletePlanModal}
        onClose={() => setShowDeletePlanModal(false)}
        onConfirm={handleDeletePlanConfirm}
        planTitle={plan.title}
        isDeleting={isDeletingPlan}
      />
    </div>
  );
}
