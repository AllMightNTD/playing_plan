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
  const mapsUrl =
    stop.lat && stop.lng
      ? `https://www.google.com/maps/search/?api=1&query=${stop.lat},${stop.lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          `${stop.name} ${stop.address}`
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

  return (
    <div
      draggable={!isEditingDetails && !isEditingNote}
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDrop={(e) => onDrop(e, index)}
      onDragEnd={onDragEnd}
      className={`relative pl-10 sm:pl-11 transition-all duration-150 ${
        isBeingDragged ? "opacity-45 scale-[0.98]" : "opacity-100"
      } ${isDragOver ? "translate-y-1" : ""}`}
    >
      {/* Left timeline index node */}
      <div
        className={`absolute left-2 sm:left-2.5 top-4 w-5 h-5 rounded-full border-2 flex items-center justify-center z-10 text-[10px] font-bold shadow-xs ${
          stop.isLocked
            ? "bg-[#c84b31] border-[#fdfbf7] text-white"
            : "bg-[#fdf3dc] border-[#c84b31] text-[#c84b31]"
        }`}
        title={`Mốc ${index + 1}: ${stopItem.startTimeStr}`}
      >
        {index + 1}
      </div>

      <div
        className={`bg-[#f9f5ed] hover:bg-[#f7f1e6] border rounded-xl p-3 sm:p-3.5 transition shadow-xs ${
          isDragOver
            ? "border-2 border-dashed border-[#c84b31] bg-[#fff5f2]"
            : stop.isLocked
            ? "border-[#dfc8a8]"
            : "border-[#e4d9c8]"
        }`}
      >
        {/* Row 1: Time badge + Place title + Status chips */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
          <div className="flex items-start gap-2 min-w-0">
            <div
              className="cursor-grab active:cursor-grabbing text-[#a6927d] hover:text-[#5c4738] p-0.5 -ml-1 mt-0.5 shrink-0"
              title="Kéo thả để sắp xếp lại mốc giờ"
            >
              <GripVertical className="w-4 h-4" />
            </div>

            {stop.coverUrl && (
              <button
                type="button"
                onClick={() => stop.placeSlug && onOpenPlaceDetail?.(stop.placeSlug)}
                className="relative w-10 h-10 rounded-lg overflow-hidden border border-[#dcd0be] shrink-0 bg-[#efe6d8] cursor-pointer"
                title={stop.name}
              >
                <Image
                  src={stop.coverUrl}
                  alt={stop.name}
                  fill
                  sizes="40px"
                  className="object-cover"
                  unoptimized
                />
              </button>
            )}

            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="bg-[#c84b31] text-white text-xs font-extrabold px-2 py-0.5 rounded-md tracking-tight shadow-xs">
                  {`${stopItem.startTimeStr} - ${stopItem.endTimeStr}`}
                </span>

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

              <div className="flex flex-wrap items-center gap-2">
                <h3
                  onClick={() => stop.placeSlug && onOpenPlaceDetail?.(stop.placeSlug)}
                  className={`text-sm sm:text-base font-extrabold text-[#231915] flex items-center gap-1.5 ${
                    canOpenDetail ? "cursor-pointer hover:text-[#c84b31]" : ""
                  }`}
                >
                  <span>{stop.icon}</span>
                  <span className="break-words">{stop.name}</span>
                </h3>

                {canOpenDetail && (
                  <button
                    type="button"
                    onClick={() => stop.placeSlug && onOpenPlaceDetail?.(stop.placeSlug)}
                    className="inline-flex items-center gap-0.5 text-[11px] font-bold text-[#c84b31] bg-[#fff5f2] hover:bg-[#ffe8e2] border border-[#f5c6bc] px-2 py-0.5 rounded-full transition cursor-pointer"
                  >
                    <span>Xem quán</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Compact mobile-safe action toolbar */}
          <div className="flex flex-wrap items-center gap-1 sm:ml-auto pt-0.5 sm:pt-0">
            <div className="flex items-center border border-[#dcd0be] rounded-md bg-white overflow-hidden mr-0.5">
              <button
                type="button"
                onClick={() => onReorder(index, index - 1)}
                disabled={index === 0}
                className="p-1 text-[#6e5645] hover:bg-[#f3ede2] disabled:opacity-30 cursor-pointer"
                title="Đẩy lên chặng trước"
              >
                <ArrowUp className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => onReorder(index, index + 1)}
                disabled={index === totalStops - 1}
                className="p-1 text-[#6e5645] hover:bg-[#f3ede2] disabled:opacity-30 border-l border-[#dcd0be] cursor-pointer"
                title="Đẩy xuống chặng sau"
              >
                <ArrowDown className="w-3 h-3" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => onRippleShift(stop.id, -15)}
              className="bg-white hover:bg-[#f0e8dc] text-[#2d221c] border border-[#cfc1ae] text-xs font-bold px-2 py-1 rounded-md transition cursor-pointer"
              title="Giảm thời lượng 15 phút"
            >
              -15p
            </button>
            <button
              type="button"
              onClick={() => onRippleShift(stop.id, 15)}
              className="bg-white hover:bg-[#f0e8dc] text-[#2d221c] border border-[#cfc1ae] text-xs font-bold px-2 py-1 rounded-md transition cursor-pointer"
              title="Tăng thời lượng 15 phút"
            >
              +15p
            </button>

            <button
              type="button"
              onClick={() => onTogglePin(stop.id, stop.isLocked, stopItem.startTimeStr)}
              className={`px-2 py-1 rounded-md border text-xs font-bold transition cursor-pointer ${
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
              onClick={openDetailedEditor}
              className="p-1.5 rounded-md bg-white hover:bg-[#f0e8dc] text-[#5c4738] border border-[#cfc1ae] transition cursor-pointer"
              title="Sửa chi tiết chặng"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => onDeleteStop(stop.id)}
              className="p-1.5 rounded-md bg-white hover:bg-[#fdeceb] text-[#b93829] border border-[#cfc1ae] transition cursor-pointer"
              title="Xóa địa điểm này"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Row 2: Travel leg & warnings */}
        <div className="mt-2 space-y-1 text-xs text-[#6e5645]">
          {index === 0 ? (
            <p className="flex items-center gap-1.5 font-medium">
              <span>📍</span> Điểm hẹn mở đầu hành trình ({stop.duration} phút tại quán)
            </p>
          ) : (
            <p className="flex items-center gap-1.5">
              <span>🛵</span>
              <span>
                Di chuyển từ <b>{previousStopName}</b>:{" "}
                <strong className="text-[#2d221c]">+{stopItem.travelMins} phút</strong> (
                {stopItem.distKm} km, đã tính 8p gửi xe) • Dừng chân {stop.duration} phút
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

        {/* Row 3: Quick inline stop note */}
        <div className="mt-2.5">
          {isEditingNote ? (
            <div className="bg-white border border-[#c84b31] rounded-lg p-2 space-y-2">
              <textarea
                rows={2}
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                placeholder="Nhập ghi chú cho chặng này (VD: Đặt bàn tầng 2, mua hoa, góc chụp đẹp...)"
                className="w-full text-xs text-[#2d221c] focus:outline-none resize-none"
                autoFocus
              />
              <div className="flex justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsEditingNote(false)}
                  className="px-2.5 py-1 rounded text-xs text-[#6e5645] hover:bg-[#f3ede2] cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onSaveQuickNote(stop.id, noteDraft);
                    setIsEditingNote(false);
                  }}
                  className="px-2.5 py-1 rounded text-xs font-bold bg-[#c84b31] text-white hover:bg-[#a63922] cursor-pointer"
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

        {/* Optional detailed stop editor */}
        {isEditingDetails && (
          <div className="mt-3 pt-3 border-t border-[#e2d6c3] bg-white rounded-xl p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-[#c84b31] uppercase">
                {`CHỈNH SỬA CHI TIẾT CHẶNG #${index + 1}`}
              </span>
              <button
                type="button"
                onClick={() => setIsEditingDetails(false)}
                className="text-xs text-[#7d6856] hover:text-[#2d221c] cursor-pointer"
              >
                Đóng ✕
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#6e5645] mb-1">
                Tên hiển thị tại chặng
              </label>
              <input
                type="text"
                value={detailForm.name}
                onChange={(e) => setDetailForm({ ...detailForm, name: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#d5c5b0] text-[#2d221c] focus:outline-none focus:border-[#c84b31]"
              />
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
                  value={detailForm.duration}
                  onChange={(e) =>
                    setDetailForm({
                      ...detailForm,
                      duration: Number(e.target.value) || 60,
                    })
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
                    checked={detailForm.isLocked}
                    onChange={(e) =>
                      setDetailForm({ ...detailForm, isLocked: e.target.checked })
                    }
                    className="accent-[#c84b31]"
                  />
                  <span className="text-[#2d221c]">📌 Cố định giờ bắt đầu</span>
                </label>
              </div>

              <div>
                {detailForm.isLocked && (
                  <>
                    <label className="block text-[11px] font-semibold text-[#6e5645] mb-1">
                      Giờ bắt đầu cố định
                    </label>
                    <input
                      type="time"
                      value={detailForm.lockedStartTime}
                      onChange={(e) =>
                        setDetailForm({ ...detailForm, lockedStartTime: e.target.value })
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
                value={detailForm.note}
                onChange={(e) => setDetailForm({ ...detailForm, note: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#d5c5b0] text-[#2d221c] focus:outline-none focus:border-[#c84b31]"
                placeholder="Ghi chú chỗ ngồi, món nước, góc chụp ảnh..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsEditingDetails(false)}
                className="px-3 py-1 rounded-lg text-xs font-semibold text-[#6e5645] hover:bg-[#f3ede2] cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  onSaveDetailedEdit(stop.id, detailForm);
                  setIsEditingDetails(false);
                }}
                className="px-3.5 py-1 rounded-lg text-xs font-bold bg-[#c84b31] text-white hover:bg-[#a63922] cursor-pointer"
              >
                Lưu thay đổi
              </button>
            </div>
          </div>
        )}

        {/* Row 4: Google Maps link & stop span */}
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
          <a
            href={mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-bold text-[#c84b31] hover:underline"
          >
            <Navigation className="w-3 h-3" />
            {`Chỉ đường (${stop.address})`}
          </a>
          <span className="text-[11px] text-[#9c8874]">
            {`Mốc #${index + 1}: ${stopItem.startTimeStr} ➔ ${stopItem.endTimeStr}`}
          </span>
        </div>
      </div>
    </div>
  );
}

