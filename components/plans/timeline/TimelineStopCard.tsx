"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Edit3,
  ExternalLink,
  GripVertical,
  Navigation,
  StickyNote,
  Trash2,
} from "lucide-react";
import type { ComputedTimelineItem } from "@/lib/plan-optimizer";
import type { EnrichedPlanStop } from "@/lib/plan-enrichment";

export interface DetailedStopEditPayload {
  name: string;
  duration: number;
  isLocked: boolean;
  lockedStartTime: string;
  note: string;
}

export interface TimelineStopCardProps {
  stopItem: ComputedTimelineItem<EnrichedPlanStop>;
  index: number;
  totalStops: number;
  previousStopName: string | null;
  isBeingDragged: boolean;
  isDragOver: boolean;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
  onDragEnd: () => void;
  onReorder: (fromIdx: number, toIdx: number) => void;
  onRippleShift: (stopId: string, shiftMinutes: 15 | -15) => void;
  onTogglePin: (stopId: string, currentPinned: boolean, currentStartTimeStr: string) => void;
  onSaveQuickNote: (stopId: string, note: string) => void;
  onSaveDetailedEdit: (stopId: string, payload: DetailedStopEditPayload) => void;
  onDeleteStop: (stopId: string) => void;
  onOpenPlaceDetail?: (slug: string) => void;
}

export function TimelineStopCard({
  stopItem,
  index,
  totalStops,
  previousStopName,
  isBeingDragged,
  isDragOver,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onReorder,
  onRippleShift,
  onTogglePin,
  onSaveQuickNote,
  onSaveDetailedEdit,
  onDeleteStop,
  onOpenPlaceDetail,
}: TimelineStopCardProps) {
  const stop = stopItem.item;
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState(stop.note || "");
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [detailForm, setDetailForm] = useState<DetailedStopEditPayload>({
    name: stop.name,
    duration: stop.durationMin,
    isLocked: stop.isPinnedTime,
    lockedStartTime: stop.plannedTime || stopItem.startTimeStr,
    note: stop.note || "",
  });

  const canOpenDetail = Boolean(stop.placeSlug && onOpenPlaceDetail);
  const destinationQuery =
    stop.address && !stop.name.toLowerCase().includes(stop.address.toLowerCase())
      ? `${stop.name}, ${stop.address}`
      : stop.name;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    destinationQuery.toLowerCase().includes("hà nội")
      ? destinationQuery
      : `${destinationQuery}, Hà Nội`
  )}`;

  const openDetailedEditor = () => {
    if (isEditingDetails) {
      setIsEditingDetails(false);
      return;
    }
    setDetailForm({
      name: stop.name,
      duration: stop.durationMin,
      isLocked: stop.isPinnedTime,
      lockedStartTime: stop.plannedTime || stopItem.startTimeStr,
      note: stop.note || "",
    });
    setIsEditingDetails(true);
  };

  const nodeBgClass =
    index === 0
      ? "bg-rose-500 text-white"
      : index === 1
      ? "bg-amber-500 text-white"
      : "bg-rose-400 text-white";

  return (
    <div
      draggable={!isEditingDetails && !isEditingNote}
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDrop={(e) => onDrop(e, index)}
      onDragEnd={onDragEnd}
      className={`relative transition-all duration-150 group ${
        isBeingDragged ? "opacity-45 scale-[0.98]" : "opacity-100"
      } ${isDragOver ? "translate-y-1" : ""}`}
    >
      {/* Left timeline index node */}
      <div
        className={`absolute -left-6 top-5 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ring-4 ring-[#FFFDF9] shadow-2xs z-10 ${nodeBgClass}`}
        title={`Mốc ${index + 1}: ${stopItem.startTimeStr}`}
      >
        {index + 1}
      </div>

      <div
        className={`bg-white rounded-2xl p-4 border border-[#F2E4DC] shadow-2xs hover:shadow-md hover:border-rose-200 transition-all ${
          isDragOver ? "border-2 border-dashed border-rose-400 bg-rose-50/20" : ""
        }`}
      >
        {/* Transit pill above destination content for index > 0 */}
        {index > 0 && previousStopName && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-100 text-stone-600 text-[11px] font-medium mb-3">
            <span>🛵 Di chuyển từ <strong>{previousStopName}</strong>:</span>
            <span className="text-rose-600 font-bold">+{stopItem.travelMins} phút</span>
            <span>({stopItem.distKm} km, đã tính 8p gửi xe) • Dừng chân {stop.duration} phút</span>
          </div>
        )}

        {/* Row 1: Image + Info + Action Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="flex items-start gap-3.5 min-w-0">
            <div
              className="cursor-grab active:cursor-grabbing text-stone-300 hover:text-stone-500 p-0.5 -ml-1 mt-1 shrink-0"
              title="Kéo thả để sắp xếp lại mốc giờ"
            >
              <GripVertical className="w-4 h-4" />
            </div>

            {stop.coverUrl && (
              <button
                type="button"
                onClick={() => stop.placeSlug && onOpenPlaceDetail?.(stop.placeSlug)}
                className="relative w-16 h-16 rounded-2xl overflow-hidden border border-stone-100 shrink-0 bg-stone-100 cursor-pointer shadow-2xs"
                title={stop.name}
              >
                <Image
                  src={stop.coverUrl}
                  alt={stop.name}
                  fill
                  sizes="64px"
                  className="object-cover"
                  unoptimized
                  referrerPolicy="no-referrer"
                />
              </button>
            )}

            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="px-2.5 py-0.5 rounded-lg bg-rose-500 text-white text-xs font-bold tracking-wide shadow-2xs">
                  {`${stopItem.startTimeStr} - ${stopItem.endTimeStr}`}
                </span>

                {stop.isLocked && (
                  <span className="px-2 py-0.5 rounded-lg bg-stone-100 text-stone-700 border border-stone-200 text-[11px] font-semibold">
                    📌 Cố định giờ
                  </span>
                )}

                {stopItem.overlapsGoldenHour && (
                  <span className="px-2.5 py-0.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200/60 text-[11px] font-semibold">
                    🌅 Đón Hoàng hôn
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                <h3
                  onClick={() => stop.placeSlug && onOpenPlaceDetail?.(stop.placeSlug)}
                  className={`text-base font-bold text-stone-800 flex items-center gap-1.5 ${
                    canOpenDetail ? "cursor-pointer hover:text-rose-600" : ""
                  }`}
                >
                  <span>{stop.icon}</span>
                  <span className="break-words">{stop.name}</span>
                </h3>

                {canOpenDetail && (
                  <button
                    type="button"
                    onClick={() => stop.placeSlug && onOpenPlaceDetail?.(stop.placeSlug)}
                    className="text-[11px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md hover:bg-rose-100 transition inline-flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>Xem quán</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>

              <p className="text-xs text-stone-500 mt-0.5">
                {index === 0
                  ? `📍 Điểm hẹn mở đầu hành trình (${stop.duration} phút tại quán)`
                  : `📍 Điểm hẹn thứ ${index + 1} (${stop.duration} phút tại quán)`}
              </p>

              {stop.planBNote && (
                <p className="text-stone-500 italic flex items-center gap-1.5 text-xs">
                  <span>🏷️</span> {stop.planBNote}
                </p>
              )}

              {stopItem.timeConflictWarning && (
                <p className="text-rose-600 font-semibold flex items-center gap-1 bg-rose-50 px-2 py-1 rounded-lg text-xs mt-1">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  {stopItem.timeConflictWarning}
                </p>
              )}
            </div>
          </div>

          {/* Action toolbar */}
          <div className="flex items-center gap-1 opacity-85 group-hover:opacity-100 transition bg-stone-50 p-1 rounded-xl border border-stone-200/60 shadow-2xs self-start sm:ml-auto shrink-0">
            <div className="flex items-center border border-stone-200/80 rounded-lg bg-white overflow-hidden mr-0.5">
              <button
                type="button"
                onClick={() => onReorder(index, index - 1)}
                disabled={index === 0}
                className="p-1 text-stone-500 hover:bg-stone-100 disabled:opacity-30 cursor-pointer"
                title="Đẩy lên chặng trước"
              >
                <ArrowUp className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => onReorder(index, index + 1)}
                disabled={index === totalStops - 1}
                className="p-1 text-stone-500 hover:bg-stone-100 disabled:opacity-30 border-l border-stone-200/80 cursor-pointer"
                title="Đẩy xuống chặng sau"
              >
                <ArrowDown className="w-3 h-3" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => onRippleShift(stop.id, -15)}
              className="px-2 py-1 text-[11px] font-semibold text-stone-600 hover:bg-white hover:shadow-2xs rounded-lg transition cursor-pointer"
              title="Giảm thời lượng 15 phút"
            >
              -15p
            </button>
            <button
              type="button"
              onClick={() => onRippleShift(stop.id, 15)}
              className="px-2 py-1 text-[11px] font-semibold text-stone-600 hover:bg-white hover:shadow-2xs rounded-lg transition cursor-pointer"
              title="Tăng thời lượng 15 phút"
            >
              +15p
            </button>
            <div className="w-px h-3.5 bg-stone-200 mx-0.5" />
            <button
              type="button"
              onClick={() => onTogglePin(stop.id, stop.isLocked, stopItem.startTimeStr)}
              className={`p-1 rounded-lg transition cursor-pointer ${
                stop.isLocked
                  ? "bg-rose-500 text-white"
                  : "text-stone-400 hover:text-rose-600 hover:bg-white"
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
              onClick={openDetailedEditor}
              className="p-1 text-stone-400 hover:text-stone-700 hover:bg-white rounded-lg transition cursor-pointer"
              title="Sửa chi tiết chặng"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onDeleteStop(stop.id)}
              className="p-1 text-stone-400 hover:text-rose-600 hover:bg-white rounded-lg transition cursor-pointer"
              title="Xóa địa điểm này"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Row 2: Note */}
        <div className="mt-3">
          {isEditingNote ? (
            <div className="bg-white border border-rose-300 rounded-xl p-2.5 space-y-2 shadow-2xs">
              <textarea
                rows={2}
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                placeholder="Nhập ghi chú cho chặng này (VD: Đặt bàn tầng 2, góc chụp vintage, thử món signature...)"
                className="w-full text-xs text-stone-800 focus:outline-none resize-none"
                autoFocus
              />
              <div className="flex justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsEditingNote(false)}
                  className="px-2.5 py-1 rounded-lg text-xs text-stone-600 hover:bg-stone-100 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onSaveQuickNote(stop.id, noteDraft);
                    setIsEditingNote(false);
                  }}
                  className="px-3 py-1 rounded-lg text-xs font-bold bg-rose-500 text-white hover:bg-rose-600 cursor-pointer shadow-2xs"
                >
                  Lưu ghi chú
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => {
                setNoteDraft(stop.note || "");
                setIsEditingNote(true);
              }}
              className="group/note cursor-pointer bg-[#FFF0F3]/60 hover:bg-[#FFF0F3] border border-rose-100/80 rounded-xl px-3.5 py-2 flex items-center justify-between gap-2 transition"
              title="Bấm để sửa ghi chú cho mốc thời gian này"
            >
              <div className="flex items-center gap-2 text-xs text-stone-700 min-w-0">
                <span className="text-rose-500 shrink-0">💌</span>
                <span className="truncate">
                  <strong className="font-semibold text-[#C84650]">Ghi chú: </strong>
                  {stop.note ? (
                    stop.note
                  ) : (
                    <span className="italic text-stone-400">
                      Bấm để thêm ghi chú cho mốc giờ này...
                    </span>
                  )}
                </span>
              </div>
              <span className="text-[11px] text-rose-500 opacity-0 group-hover/note:opacity-100 font-semibold shrink-0">
                Sửa ✎
              </span>
            </div>
          )}
        </div>

        {/* Optional detailed stop editor */}
        {isEditingDetails && (
          <div className="mt-3 pt-3 border-t border-rose-100 bg-rose-50/30 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-rose-600 uppercase tracking-wide">
                {`CHỈNH SỬA CHI TIẾT CHẶNG #${index + 1}`}
              </span>
              <button
                type="button"
                onClick={() => setIsEditingDetails(false)}
                className="text-xs text-stone-500 hover:text-stone-800 cursor-pointer"
              >
                Đóng ✕
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                Tên hiển thị tại chặng
              </label>
              <input
                type="text"
                value={detailForm.name}
                onChange={(e) => setDetailForm({ ...detailForm, name: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-stone-200 bg-white text-stone-800 focus:outline-none focus:border-rose-400"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-end">
              <div>
                <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                  Thời lượng dừng (phút)
                </label>
                <input
                  type="number"
                  step="15"
                  min="15"
                  max="240"
                  value={detailForm.duration}
                  onChange={(e) =>
                    setDetailForm({
                      ...detailForm,
                      duration: Number(e.target.value) || 60,
                    })
                  }
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-stone-200 bg-white text-stone-800 focus:outline-none focus:border-rose-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                  Chế độ mốc giờ
                </label>
                <label className="flex items-center gap-1.5 text-xs py-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={detailForm.isLocked}
                    onChange={(e) =>
                      setDetailForm({ ...detailForm, isLocked: e.target.checked })
                    }
                    className="accent-rose-500"
                  />
                  <span className="text-stone-700">📌 Cố định giờ bắt đầu</span>
                </label>
              </div>

              <div>
                {detailForm.isLocked && (
                  <>
                    <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                      Giờ bắt đầu cố định
                    </label>
                    <input
                      type="time"
                      value={detailForm.lockedStartTime}
                      onChange={(e) =>
                        setDetailForm({ ...detailForm, lockedStartTime: e.target.value })
                      }
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-stone-200 bg-white text-stone-800 focus:outline-none focus:border-rose-400"
                    />
                  </>
                )}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                Ghi chú tại chặng này
              </label>
              <input
                type="text"
                value={detailForm.note}
                onChange={(e) => setDetailForm({ ...detailForm, note: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-stone-200 bg-white text-stone-800 focus:outline-none focus:border-rose-400"
                placeholder="Ghi chú chỗ ngồi, món nước, góc chụp ảnh..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsEditingDetails(false)}
                className="px-3 py-1 rounded-lg text-xs font-semibold text-stone-600 hover:bg-stone-100 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  onSaveDetailedEdit(stop.id, detailForm);
                  setIsEditingDetails(false);
                }}
                className="px-3.5 py-1 rounded-lg text-xs font-bold bg-rose-500 text-white hover:bg-rose-600 cursor-pointer shadow-2xs"
              >
                Lưu thay đổi
              </button>
            </div>
          </div>
        )}

        {/* Row 4: Google Maps link & stop span */}
        <div className="mt-3 pt-2.5 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2 text-xs">
          <a
            href={mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-rose-600 hover:underline flex items-center gap-1"
          >
            <Navigation className="w-3 h-3" />
            <span>{`Chỉ đường (${stop.address})`}</span>
          </a>
          <span className="text-stone-400 text-[11px]">
            {`Mốc #${index + 1}: ${stopItem.startTimeStr} → ${stopItem.endTimeStr}`}
          </span>
        </div>
      </div>
    </div>
  );
}

