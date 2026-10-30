"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Calendar,
  Clock,
  Edit3,
  Trash2,
  Navigation,
  GripVertical,
  StickyNote,
  ArrowUp,
  ArrowDown,
  Plus,
  Send,
  AlertTriangle,
  Check,
  Sparkles,
} from "lucide-react";
import type { PlanDetailDto, PlanStopDto } from "@/server/services/user/plan.mapper";
import type { HanoiPlace } from "@/lib/types/catalog";
import {
  computePlanTimeline,
  computeItineraryStats,
  formatVietnameseDate,
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

export interface DatingTemplate {
  id: string;
  title: string;
  tagline: string;
  icon: string;
  estimatedDuration: string;
  badge: string;
  stops: Array<{
    name: string;
    category: "coffee" | "activity" | "sunset" | "food";
    duration: number;
    isLocked?: boolean;
    lockedStartTime?: string | null;
    note?: string;
    address?: string;
  }>;
}

export const DATING_TEMPLATES: DatingTemplate[] = [
  {
    id: "chill-cafe",
    title: "Chill Cafe Cuối Tuần",
    tagline: "Trò chuyện ấm cúng, check-in tranh cổ & cafe chiều phố cổ",
    icon: "☕",
    estimatedDuration: "3h 15p • 3 điểm",
    badge: "Phổ biến nhất",
    stops: [
      {
        name: "420 Lab",
        category: "coffee",
        duration: 60,
        note: "Mở đầu buổi hẹn nhẹ nhàng, thử dòng Coldbrew đặc trưng",
        address: "Ba Đình, Hà Nội",
      },
      {
        name: "Bảo Tàng Mỹ Thuật Việt Nam",
        category: "activity",
        duration: 75,
        isLocked: true,
        lockedStartTime: "16:15",
        note: "Chụp ảnh cầu thang vintage tầng 2 và ngắm tranh chiều",
        address: "Ba Đình, Hà Nội",
      },
      {
        name: "Cà Phê Blackbird",
        category: "coffee",
        duration: 60,
        note: "Ngồi góc nhỏ tâm sự buổi tối ấm cúng",
        address: "Hoàn Kiếm, Hà Nội",
      },
    ],
  },
  {
    id: "hoang-hon-ho-tay",
    title: "Hẹn Hò Hoàng Hôn Hồ Tây",
    tagline: "Săn khung giờ vàng lãng mạn ven hồ & thưởng thức ẩm thực",
    icon: "🌅",
    estimatedDuration: "3h 05p • 3 điểm",
    badge: "Lãng mạn",
    stops: [
      {
        name: "Là Việt Coffee",
        category: "coffee",
        duration: 60,
        note: "Cà phê thơm dịu, trò chuyện chuẩn bị ngắm hoàng hôn",
        address: "Đống Đa, Hà Nội",
      },
      {
        name: "Hồ Tây - Phố Từ Hoa",
        category: "sunset",
        duration: 60,
        isLocked: true,
        lockedStartTime: "16:20",
        note: "Dạo bộ ven hồ đón Giờ Vàng 16:23 - 17:23, nhớ mang máy ảnh film",
        address: "Tây Hồ, Hà Nội",
      },
      {
        name: "Bún Chả Nem Phố Cổ",
        category: "food",
        duration: 60,
        note: "Ăn tối nạp năng lượng sau khi săn hoàng hôn",
        address: "Hoàn Kiếm, Hà Nội",
      },
    ],
  },
  {
    id: "foodtour-pho-co",
    title: "Foodtour Hà Nội & Dạo Phố",
    tagline: "Ăn no nê đặc sản phố cổ, dạo mát hồ Gươm & cà phê chill",
    icon: "🍜",
    estimatedDuration: "3h 00p • 3 điểm",
    badge: "Vui vẻ năng động",
    stops: [
      {
        name: "Bún Chả Nem Phố Cổ",
        category: "food",
        duration: 60,
        note: "Thưởng thức bún chả que tre thơm nức phố cổ",
        address: "Hoàn Kiếm, Hà Nội",
      },
      {
        name: "Phố Đi Bộ & Kem Tràng Tiền",
        category: "activity",
        duration: 60,
        note: "Dạo mát quanh hồ Gươm, thưởng thức kem cốm truyền thống",
        address: "Hoàn Kiếm, Hà Nội",
      },
      {
        name: "Cà Phê Blackbird",
        category: "coffee",
        duration: 60,
        note: "Ngồi ban công ngắm dòng người qua lại về đêm",
        address: "Hoàn Kiếm, Hà Nội",
      },
    ],
  },
];

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
  goldenHourStart,
  partnerContact: _partnerContact,
  className = "",
}: PlanTimelineProps) {
  // Local stops for 0ms optimistic UI
  const [localStops, setLocalStops] = useState<PlanStopDto[]>(plan.stops);
  const [localStartTime, setLocalStartTime] = useState(plan.startTime || "15:00");
  const [localTitle, setLocalTitle] = useState(plan.title);
  const [localPlanDate, setLocalPlanDate] = useState(plan.planDate);

  // Header inline editing state (zero redirect)
  const [isEditingHeader, setIsEditingHeader] = useState(false);
  const [headerForm, setHeaderForm] = useState({
    title: plan.title,
    planDate: plan.planDate,
    startTime: plan.startTime || "15:00",
  });
  const [isSavingHeader, setIsSavingHeader] = useState(false);

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

  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Stop note inline editing state
  const [editingNoteStopId, setEditingNoteStopId] = useState<string | null>(null);
  const [tempNoteText, setTempNoteText] = useState("");

  // Detailed stop editing state (matches Demo Image 2)
  const [editingStopId, setEditingStopId] = useState<string | null>(null);
  const [editStopForm, setEditStopForm] = useState<{
    name: string;
    category: string;
    duration: number;
    isLocked: boolean;
    lockedStartTime: string;
    note: string;
  } | null>(null);

  // Quick actions loading
  const [isApplyingPlanB, setIsApplyingPlanB] = useState(false);

  // Modals state
  const [showAddStopModal, setShowAddStopModal] = useState(false);
  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [showDeletePlanModal, setShowDeletePlanModal] = useState(false);
  const [isDeletingPlan, setIsDeletingPlan] = useState(false);

  // Lookup place information from catalog and enrich stops
  const enrichedStops = useMemo(() => {
    return localStops.map((stop) => {
      const place = stop.placeId ? places.find((p) => p.id === stop.placeId) : undefined;
      const name = stop.customName || place?.name || "Địa điểm hẹn hò";
      const category = (place?.category || "coffee").toLowerCase();
      const icon = CATEGORY_ICONS[category] || "📍";
      const address = place?.address || place?.area || "Hà Nội";
      const isIndoor = place?.indoor ?? true;

      // Extract plan B note if present
      let displayNote = stop.note || "";
      let planBNote = "";
      if (displayNote.includes("[Plan B Mưa]")) {
        const parts = displayNote.split("\n");
        const bPart = parts.find((p) => p.includes("[Plan B Mưa]"));
        if (bPart) {
          planBNote = bPart;
          displayNote = parts.filter((p) => !p.includes("[Plan B Mưa]")).join("\n").trim();
        }
      }

      return {
        ...stop,
        name,
        category,
        icon,
        address,
        isIndoor,
        planBNote,
        note: displayNote,
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

  // Toggle pin
  const handleTogglePin = async (
    stopId: string,
    currentPinned: boolean,
    currentStartTimeStr: string
  ) => {
    const nextPinned = !currentPinned;
    const nextTime = nextPinned ? currentStartTimeStr : null;

    setLocalStops((prev) =>
      prev.map((s) =>
        s.id === stopId
          ? {
              ...s,
              isPinnedTime: nextPinned,
              plannedTime: nextTime,
            }
          : s
      )
    );

    try {
      const res = await fetch(`/api/v1/user/plans/${plan.id}/stops/${stopId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isPinnedTime: nextPinned,
          plannedTime: nextTime,
        }),
      });
      if (!res.ok) throw new Error("Toggle pin failed");
      await onRefresh();
    } catch (err) {
      console.error(err);
      await onRefresh();
    }
  };

  // Save quick note
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

  // Detailed stop editing (Image 2)
  const handleStartDetailedEdit = (
    stop: (typeof enrichedStops)[number],
    startTimeStr: string
  ) => {
    setEditingStopId(stop.id);
    setEditStopForm({
      name: stop.name,
      category: stop.category || "coffee",
      duration: stop.durationMin,
      isLocked: stop.isPinnedTime,
      lockedStartTime: stop.plannedTime || startTimeStr,
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

  // Save header metadata (title, date, start time) inline with zero redirect
  const handleSaveHeader = async () => {
    const nextTitle = headerForm.title.trim() || "Buổi hẹn hò";
    const nextDate = headerForm.planDate;
    const nextStartTime = headerForm.startTime;
    setIsSavingHeader(true);
    setLocalTitle(nextTitle);
    setLocalPlanDate(nextDate);
    setLocalStartTime(nextStartTime);

    try {
      const res = await fetch(`/api/v1/user/plans/${plan.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: nextTitle,
          planDate: nextDate,
          startTime: nextStartTime,
        }),
      });
      if (!res.ok) throw new Error("Update plan header failed");
      setIsEditingHeader(false);
      await onRefresh();
    } catch (err) {
      console.error(err);
      await onRefresh();
    } finally {
      setIsSavingHeader(false);
    }
  };

  // Sunset auto-align (sets stop #2 or sunset stop to golden hour)
  const handleSunsetAlign = async () => {
    if (localStops.length < 2) return;
    const sunsetTarget = goldenHourStart || "16:20";
    const targetStop = localStops[1];
    if (!targetStop) return;

    setLocalStops((prev) =>
      prev.map((s, idx) =>
        idx === 1
          ? {
              ...s,
              isPinnedTime: true,
              plannedTime: sunsetTarget,
            }
          : s
      )
    );

    try {
      await fetch(`/api/v1/user/plans/${plan.id}/stops/${targetStop.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isPinnedTime: true,
          plannedTime: sunsetTarget,
        }),
      });
      await onRefresh();
    } catch (err) {
      console.error(err);
      await onRefresh();
    }
  };

  // Apply quick dating template with 0ms optimistic UI
  const [isApplyingTemplate, setIsApplyingTemplate] = useState(false);
  const handleApplyTemplate = async (template: DatingTemplate) => {
    if (isApplyingTemplate) return;
    setIsApplyingTemplate(true);

    const tempStops: PlanStopDto[] = template.stops.map((ts, idx) => ({
      id: `temp-${Date.now()}-${idx}`,
      placeId: null,
      customName: ts.name,
      sortOrder: idx,
      plannedTime: ts.lockedStartTime || null,
      durationMin: ts.duration,
      dayOffset: 0,
      startMinute: 900 + idx * 60,
      travelMinutes: idx === 0 ? 0 : 15,
      isPinnedTime: Boolean(ts.isLocked),
      note: ts.note || null,
    }));
    setLocalStops(tempStops);

    try {
      for (const stop of template.stops) {
        await fetch(`/api/v1/user/plans/${plan.id}/stops`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customName: stop.name,
            durationMin: stop.duration,
            plannedTime: stop.lockedStartTime || undefined,
            note: stop.note || undefined,
          }),
        });
      }
      await onRefresh();
    } catch (err) {
      console.error("Apply template failed:", err);
      await onRefresh();
    } finally {
      setIsApplyingTemplate(false);
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
      className={`bg-[#fdfbf7] border border-[#e2d6c3] rounded-2xl p-4 sm:p-6 shadow-sm space-y-4 ${className}`.trim()}
    >
      {/* 1. HEADER LỊCH HẸN: CHỌN NGÀY, GIỜ, SỬA TÊN TRỰC TIẾP (KHÔNG REDIRECT) */}
      <div className="border-b border-[#eee5d7] pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 bg-[#e8f4ec] text-[#2b6e44] text-xs font-bold px-2.5 py-1 rounded-full border border-[#bce0c8]">
              📍 Lịch hẹn sắp tới
            </span>

            {/* Nút chọn nhanh Ngày & Giờ bắt đầu */}
            <button
              type="button"
              onClick={() => {
                setHeaderForm({
                  title: localTitle,
                  planDate: localPlanDate,
                  startTime: localStartTime,
                });
                setIsEditingHeader(true);
              }}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#5c4738] bg-[#f5efe6] hover:bg-[#ebe0d0] px-2.5 py-1 rounded-full border border-[#dcd0be] transition cursor-pointer"
              title="Bấm để đổi ngày & giờ bắt đầu"
            >
              <Calendar className="w-3.5 h-3.5 text-[#c84b31]" />
              <span>{formatVietnameseDate(localPlanDate)}</span>
              <span>•</span>
              <Clock className="w-3.5 h-3.5 text-[#c84b31]" />
              <span>{`Bắt đầu ${localStartTime}`}</span>
              <Edit3 className="w-3 h-3 opacity-60" />
            </button>
          </div>

          {/* Cụm nút Tạo ảnh Story / Sửa / Xóa lịch hẹn */}
          <div className="flex items-center gap-2">
            {onShareStory && (
              <button
                type="button"
                onClick={onShareStory}
                className="inline-flex items-center gap-1 text-xs font-bold text-[#c84b31] hover:text-[#a3361f] bg-[#fff5f2] hover:bg-[#ffe8e2] px-2.5 py-1 rounded-lg border border-[#f5c6bc] transition cursor-pointer"
              >
                🖼️ Tạo ảnh Story chia sẻ
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setHeaderForm({
                  title: localTitle,
                  planDate: localPlanDate,
                  startTime: localStartTime,
                });
                setIsEditingHeader(!isEditingHeader);
              }}
              className="p-1.5 rounded-lg text-[#6e5645] hover:bg-[#f2eae0] transition cursor-pointer"
              title="Sửa tiêu đề & ngày giờ lịch hẹn"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setShowDeletePlanModal(true)}
              className="p-1.5 rounded-lg text-[#b93829] hover:bg-[#fdeceb] transition cursor-pointer"
              title="Xóa lịch hẹn này"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Form chỉnh sửa Tiêu đề, Ngày hẹn & Giờ bắt đầu trực tiếp không redirect */}
        {isEditingHeader ? (
          <div className="mt-3 bg-[#f7f2ea] border border-[#dfd2c0] rounded-xl p-3.5 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-[#6e5645] mb-1">
                Tên buổi hẹn hò
              </label>
              <input
                type="text"
                value={headerForm.title}
                onChange={(e) => setHeaderForm({ ...headerForm, title: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg border border-[#d5c5b0] bg-white text-sm font-bold text-[#2d221c] focus:outline-none focus:border-[#c84b31]"
                placeholder="Nhập tên buổi hẹn..."
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#6e5645] mb-1">
                  Chọn ngày hẹn
                </label>
                <input
                  type="date"
                  value={headerForm.planDate}
                  onChange={(e) => setHeaderForm({ ...headerForm, planDate: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-[#d5c5b0] bg-white text-sm text-[#2d221c] focus:outline-none focus:border-[#c84b31]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#6e5645] mb-1">
                  Giờ bắt đầu chặng đầu tiên
                </label>
                <input
                  type="time"
                  value={headerForm.startTime}
                  onChange={(e) =>
                    setHeaderForm({ ...headerForm, startTime: e.target.value })
                  }
                  className="w-full px-3 py-1.5 rounded-lg border border-[#d5c5b0] bg-white text-sm text-[#2d221c] focus:outline-none focus:border-[#c84b31]"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsEditingHeader(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#6e5645] hover:bg-[#e8dfd3] cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={isSavingHeader}
                onClick={handleSaveHeader}
                className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#c84b31] text-white hover:bg-[#b03e26] flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                {isSavingHeader ? "Đang lưu..." : "Lưu lịch hẹn"}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <h1
              onClick={() => {
                setHeaderForm({
                  title: localTitle,
                  planDate: localPlanDate,
                  startTime: localStartTime,
                });
                setIsEditingHeader(true);
              }}
              className="text-xl sm:text-2xl font-extrabold text-[#231915] cursor-pointer hover:text-[#c84b31] transition flex items-center gap-2 group"
              title="Bấm để sửa tên lịch hẹn"
            >
              <span>{localTitle}</span>
              <Edit3 className="w-4 h-4 opacity-0 group-hover:opacity-70 text-[#c84b31] transition" />
            </h1>
          </div>
        )}
      </div>

      {/* 2. CÁC NÚT TÁC VỤ NHANH: HOÀNG HÔN & PHÒNG MƯA */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleSunsetAlign}
          className="inline-flex items-center gap-1.5 text-xs font-bold bg-[#fdf3dc] hover:bg-[#f9e7be] text-[#5c4018] border border-[#e3c383] px-3.5 py-2 rounded-full transition shadow-xs cursor-pointer"
        >
          🌅 Tự xếp giờ khớp Hoàng hôn ({goldenHourStart || "16:23"})
        </button>
        <button
          type="button"
          onClick={handlePlanB}
          disabled={isApplyingPlanB}
          className="inline-flex items-center gap-1.5 text-xs font-bold bg-[#fdfbf7] hover:bg-[#f2ece1] text-[#3d2d24] border border-[#d6c7b2] px-3.5 py-2 rounded-full transition shadow-xs disabled:opacity-50 cursor-pointer"
        >
          🌧️ Đổi sang quán Trong nhà (Phòng mưa)
        </button>
      </div>

      {/* 2. THANH MẸO KÉO THẢ & NÚT THÊM CHẶNG MỚI */}
      <div className="flex items-center justify-between text-xs text-[#7d6856] px-1">
        <span className="flex items-center gap-1.5">
          <GripVertical className="w-3.5 h-3.5 text-[#b09b84]" />
          <span>
            Mẹo: Giữ biểu tượng <b>⋮⋮</b> để kéo thả đổi thứ tự hoặc bấm <b>+15p / -15p</b> để
            chỉnh mốc giờ
          </span>
        </span>
        <button
          type="button"
          onClick={() => setShowAddStopModal(true)}
          className="inline-flex items-center gap-1 font-bold text-[#c84b31] hover:underline"
        >
          <Plus className="w-3.5 h-3.5" /> Thêm chặng mới
        </button>
      </div>

      {/* 3. DANH SÁCH CHẶNG THEO MỐC THỜI GIAN (DRAG & DROP TIMELINE) */}
      {computedTimeline.length === 0 ? (
        <div className="space-y-4">
          {/* Vùng kéo thả (Drop Zone) nét đứt trực quan */}
          <div
            onClick={() => setShowAddStopModal(true)}
            className="group relative border-2 border-dashed border-[#c84b31]/40 hover:border-[#c84b31] bg-[#fbf7f0] hover:bg-[#fff9f5] rounded-2xl p-6 sm:p-7 text-center transition-all cursor-pointer shadow-xs"
          >
            <div className="w-12 h-12 mx-auto rounded-2xl bg-[#f5e8d8] flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
              🎯
            </div>
            <h3 className="font-serif font-extrabold text-base sm:text-lg text-[#231915] mt-2.5">
              Vùng thả địa điểm vào lịch trình
            </h3>
            <p className="text-xs text-[#7d6856] max-w-md mx-auto mt-1 leading-relaxed">
              Kéo thả các quán yêu thích từ trang <strong>Khám phá</strong> vào đây, hoặc bấm nút bên dưới để thêm địa điểm thủ công theo ý hai bạn.
            </p>
            <div className="mt-3.5 flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAddStopModal(true);
                }}
                className="bg-[#c84b31] hover:bg-[#ad3b23] text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Thêm chặng đầu tiên
              </button>
            </div>
          </div>

          {/* Khối kịch bản mẫu nhanh (Timeline Builder) */}
          <div className="bg-[#f7f2ea] border border-[#dfd2c0] rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-[#c84b31] uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Timeline Builder
                </span>
                <h4 className="font-serif font-extrabold text-sm sm:text-base text-[#231915]">
                  Hoặc bắt đầu nhanh với 3 kịch bản hẹn hò được yêu thích nhất:
                </h4>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {DATING_TEMPLATES.map((tpl) => (
                <div
                  key={tpl.id}
                  className="bg-white hover:bg-[#fffdfa] border border-[#e5d8c6] hover:border-[#c84b31]/60 rounded-xl p-3.5 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-lg">{tpl.icon}</span>
                      <span className="font-serif font-extrabold text-sm text-[#231915]">
                        {tpl.title}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#fdf3dc] text-[#785118] border border-[#e3c383]">
                        {tpl.badge}
                      </span>
                      <span className="text-[11px] text-[#7d6856] font-medium hidden sm:inline">
                        • {tpl.estimatedDuration}
                      </span>
                    </div>
                    <p className="text-xs text-[#6e5645]">{tpl.tagline}</p>
                    <div className="flex items-center gap-1.5 text-[11px] text-[#8c7765] pt-0.5 flex-wrap">
                      <span className="font-medium">Lộ trình:</span>
                      {tpl.stops.map((s, sIdx) => (
                        <React.Fragment key={s.name}>
                          <span className="font-semibold text-[#231915]">{s.name}</span>
                          {sIdx < tpl.stops.length - 1 && <span className="text-[#c84b31]">➔</span>}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isApplyingTemplate}
                    onClick={() => handleApplyTemplate(tpl)}
                    className="shrink-0 bg-[#fdf3dc] hover:bg-[#c84b31] text-[#785118] hover:text-white border border-[#e3c383] hover:border-[#c84b31] text-xs font-bold px-3.5 py-2 rounded-xl transition shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <span>{isApplyingTemplate ? "Đang xếp lịch..." : "✨ Chọn kịch bản này"}</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
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
                {/* Node số thứ tự bên trái trục thời gian */}
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

                {/* Khung thẻ chặng dừng */}
                <div
                  className={`bg-[#f9f5ed] hover:bg-[#f7f1e6] border rounded-xl p-3.5 transition shadow-xs ${
                    isDragOver
                      ? "border-2 border-dashed border-[#c84b31] bg-[#fff5f2]"
                      : stop.isLocked
                      ? "border-[#dfc8a8]"
                      : "border-[#e4d9c8]"
                  }`}
                >
                  {/* Dòng 1: Khung giờ + Tên địa điểm + Badge trạng thái + Nút điều khiển */}
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <div
                        className="cursor-grab active:cursor-grabbing text-[#a6927d] hover:text-[#5c4738] p-0.5 -ml-1"
                        title="Kéo thả để sắp xếp lại mốc giờ"
                      >
                        <GripVertical className="w-4 h-4" />
                      </div>

                      {/* Badge mốc giờ đỏ gạch */}
                      <span className="bg-[#c84b31] text-white text-xs font-extrabold px-2.5 py-1 rounded-md tracking-tight shadow-xs">
                        {`${stopItem.startTimeStr} - ${stopItem.endTimeStr}`}
                      </span>

                      {/* Tên địa điểm */}
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

                      {/* Nhãn Cố định giờ */}
                      {stop.isLocked && (
                        <span className="inline-flex items-center gap-1 bg-[#fdf3dc] text-[#785118] border border-[#e3c383] text-[11px] font-bold px-2 py-0.5 rounded-md">
                          📌 Cố định giờ
                        </span>
                      )}

                      {/* Nhãn khớp giờ vàng hoàng hôn */}
                      {stopItem.overlapsGoldenHour && (
                        <span className="inline-flex items-center gap-1 bg-[#fff0db] text-[#b85d19] border border-[#f5cca0] text-[11px] font-semibold px-2 py-0.5 rounded-md">
                          🌅 Đón Hoàng hôn
                        </span>
                      )}
                    </div>

                    {/* Cụm nút bên phải: [↑ ↓], -15p, +15p, 📌, ✎, 🗑️ */}
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
                        onClick={() =>
                          handleTogglePin(stop.id, stop.isLocked, stopItem.startTimeStr)
                        }
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
                        onClick={() => {
                          if (editingStopId === stop.id) {
                            setEditingStopId(null);
                            setEditStopForm(null);
                          } else {
                            handleStartDetailedEdit(stop, stopItem.startTimeStr);
                          }
                        }}
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

                  {/* Dòng 2: Thông tin di chuyển */}
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

                    {stop.planBNote && (
                      <p className="text-[#5c4738] italic flex items-center gap-1.5">
                        <span>🏷️</span> {stop.planBNote}
                      </p>
                    )}

                    {stopItem.timeConflictWarning && (
                      <p className="text-[#b83723] font-semibold flex items-center gap-1 bg-[#fceae6] px-2 py-1 rounded">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        {stopItem.timeConflictWarning}
                      </p>
                    )}
                  </div>

                  {/* Dòng 3: Ghi chú riêng chặng (Click để sửa nhanh) */}
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

                  {/* Form sửa chi tiết chặng hẹn (Khớp hoàn toàn Demo Image 2) */}
                  {isEditingThis && editStopForm && (
                    <div className="mt-3 pt-3 border-t border-[#e2d6c3] bg-white rounded-xl p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-[#c84b31] uppercase">
                          {`CHỈNH SỬA CHI TIẾT CHẶNG #${idx + 1}`}
                        </span>
                        <button
                          type="button"
                          onClick={() => setEditingStopId(null)}
                          className="text-xs text-[#7d6856] hover:text-[#2d221c]"
                        >
                          Đóng ✕
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-semibold text-[#6e5645] mb-1">
                            Tên quán / Địa điểm
                          </label>
                          <input
                            type="text"
                            value={editStopForm.name}
                            onChange={(e) =>
                              setEditStopForm((prev) =>
                                prev ? { ...prev, name: e.target.value } : null
                              )
                            }
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#d5c5b0] text-[#2d221c] focus:outline-none focus:border-[#c84b31]"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-[#6e5645] mb-1">
                            Loại hình
                          </label>
                          <select
                            value={editStopForm.category}
                            onChange={(e) =>
                              setEditStopForm((prev) =>
                                prev ? { ...prev, category: e.target.value } : null
                              )
                            }
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#d5c5b0] bg-white text-[#2d221c] focus:outline-none focus:border-[#c84b31]"
                          >
                            <option value="coffee">☕ Cà phê</option>
                            <option value="activity">📸 Tham quan / Chụp ảnh</option>
                            <option value="sunset">🌅 Ngắm hoàng hôn</option>
                            <option value="food">🍜 Ăn uống</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-end">
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
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#d5c5b0] text-[#2d221c] focus:outline-none focus:border-[#c84b31]"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-[#6e5645] mb-1">
                            Chế độ mốc giờ
                          </label>
                          <label className="flex items-center gap-1.5 text-xs py-1.5 cursor-pointer">
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
                            <span className="text-[#2d221c]">📌 Cố định giờ bắt đầu</span>
                          </label>
                        </div>

                        <div>
                          {editStopForm.isLocked && (
                            <>
                              <label className="block text-[11px] font-semibold text-[#6e5645] mb-1">
                                Giờ bắt đầu cố định
                              </label>
                              <input
                                type="time"
                                value={editStopForm.lockedStartTime}
                                onChange={(e) =>
                                  setEditStopForm((prev) =>
                                    prev ? { ...prev, lockedStartTime: e.target.value } : null
                                  )
                                }
                                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#d5c5b0] text-[#2d221c] focus:outline-none focus:border-[#c84b31]"
                              />
                            </>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-[#6e5645] mb-1">
                          Ghi chú tại chặng này
                        </label>
                        <input
                          type="text"
                          value={editStopForm.note}
                          onChange={(e) =>
                            setEditStopForm((prev) =>
                              prev ? { ...prev, note: e.target.value } : null
                            )
                          }
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#d5c5b0] text-[#2d221c] focus:outline-none focus:border-[#c84b31]"
                          placeholder="Ghi chú chỗ ngồi, món nước, góc chụp ảnh..."
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-1">
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

                  {/* Dòng 4: Chỉ đường Google Maps & Mốc thời gian */}
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
                      {`Chỉ đường (${stop.address})`}
                    </a>
                    <span className="text-[11px] text-[#9c8874]">
                      {`Mốc #${idx + 1}: ${stopItem.startTimeStr} ➔ ${stopItem.endTimeStr}`}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. NÚT THÊM ĐỊA ĐIỂM TIẾP THEO THEO DEMO */}
      <div className="mt-4 pl-11">
        <button
          type="button"
          onClick={() => setShowAddStopModal(true)}
          className="w-full py-2.5 rounded-xl border-2 border-dashed border-[#d5c5b0] hover:border-[#c84b31] bg-[#faf6f0] hover:bg-[#fff5f2] text-xs font-bold text-[#6e5645] hover:text-[#c84b31] transition flex items-center justify-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          {`Thêm địa điểm mới vào mốc tiếp theo (${itineraryStats.endStr})`}
        </button>
      </div>

      {/* 5. THANH HÀNH ĐỘNG CUỐI CỘT TRÁI */}
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
        planTitle={plan.title}
        isDeleting={isDeletingPlan}
      />
    </div>
  );
}
