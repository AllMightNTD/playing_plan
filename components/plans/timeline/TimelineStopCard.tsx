"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Clock,
  ExternalLink,
  GripVertical,
  MoreHorizontal,
  Navigation,
  Trash2,
  X,
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

export const TimelineStopCard = React.memo(function TimelineStopCard({
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
  onDeleteStop,
  onOpenPlaceDetail,
}: TimelineStopCardProps) {
  const stop = stopItem.item;
  const [isActionSheetOpen, setIsActionSheetOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState(stop.note || "");
  const [isEditingNoteInline, setIsEditingNoteInline] = useState(false);

  const targetDetailSlug = stop.placeSlug || stop.placeId;
  const canOpenDetail = Boolean(targetDetailSlug && onOpenPlaceDetail);
  const destinationQuery =
    stop.address && !stop.name.toLowerCase().includes(stop.address.toLowerCase())
      ? `${stop.name}, ${stop.address}`
      : stop.name;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    destinationQuery.toLowerCase().includes("hà nội")
      ? destinationQuery
      : `${destinationQuery}, Hà Nội`
  )}`;

  const nodeBgClass =
    index === 0
      ? "bg-brand-terracotta text-white"
      : index === 1
      ? "bg-amber-600 text-white"
      : "bg-brand-coral text-white";

  return (
    <div
      draggable={!isActionSheetOpen}
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDrop={(e) => onDrop(e, index)}
      onDragEnd={onDragEnd}
      className={`relative transition-all duration-150 group ${
        isBeingDragged ? "opacity-45 scale-[0.98]" : "opacity-100"
      } ${isDragOver ? "translate-y-1" : ""}`}
    >
      {/* Mốc chỉ mục bên trái timeline */}
      <div
        className={`absolute -left-5 sm:-left-6 top-4 sm:top-5 w-5 h-5 sm:w-6 sm:h-6 rounded-full text-[11px] sm:text-xs font-bold flex items-center justify-center ring-4 ring-[#FFFDF9] shadow-2xs z-10 ${nodeBgClass}`}
        title={`Mốc ${index + 1}: ${stopItem.startTimeStr}`}
      >
        {index + 1}
      </div>

      {/* Transit pill tinh gọn giữa 2 chặng */}
      {index > 0 && (
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#FAF4E8] border border-[#E2D5C1] text-paper-muted text-[11px] font-medium mb-2.5 shadow-2xs">
          <span>🛵</span>
          <span className="text-brand-terracotta font-bold whitespace-nowrap">
            +{stopItem.travelMins} phút
          </span>
          <span>•</span>
          <span>{stopItem.distKm} km</span>
          {previousStopName && (
            <span className="text-paper-muted/80 hidden sm:inline truncate max-w-[150px]">
              từ {previousStopName}
            </span>
          )}
        </div>
      )}

      {/* Thẻ chặng chính - Tinh gọn, thoáng đãng */}
      <div
        className={`rounded-2xl p-3.5 sm:p-4 transition-all min-w-0 ${
          stopItem.overlapsGoldenHour
            ? "border-2 border-amber-400 bg-gradient-to-br from-[#FFFDF9] via-[#FFFDF9] to-amber-50/60 shadow-md hover:shadow-lg"
            : "bg-[#FFFDF9] border border-[#E2D6C5] shadow-2xs hover:shadow-md hover:border-brand-coral"
        } ${
          isDragOver ? "border-2 border-dashed border-brand-terracotta bg-brand-peach/20" : ""
        }`}
      >
        <div className="flex items-start gap-2.5 sm:gap-3.5 min-w-0">
          {/* Grip drag thả trên desktop */}
          <div
            className="cursor-grab active:cursor-grabbing text-paper-muted/50 hover:text-paper-ink p-0.5 -ml-1 mt-1 shrink-0 hidden sm:block"
            title="Kéo thả để sắp xếp lại mốc giờ"
          >
            <GripVertical className="w-4 h-4" />
          </div>

          {/* Ảnh quán */}
          {stop.coverUrl && (
            <button
              type="button"
              onClick={() => targetDetailSlug && onOpenPlaceDetail?.(targetDetailSlug)}
              className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden border border-[#E2D6C5] shrink-0 bg-[#FAF4E8] cursor-pointer shadow-2xs"
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

          {/* Thông tin chặng */}
          <div className="flex-1 min-w-0 space-y-1.5">
            {/* Hàng 1: Khung giờ + Badges + Menu ba chấm (•••) */}
            <div className="flex items-center justify-between gap-1.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="px-2.5 py-0.5 rounded-lg bg-brand-terracotta text-white text-xs font-bold tracking-wide shadow-2xs whitespace-nowrap">
                  {`${stopItem.startTimeStr} - ${stopItem.endTimeStr}`}
                </span>

                {stop.isLocked && (
                  <span
                    className="px-2 py-0.5 rounded-lg bg-[#FAF4E8] text-paper-ink border border-[#E2D6C5] text-[11px] font-semibold whitespace-nowrap"
                    title="Đã cố định giờ bắt đầu"
                  >
                    📌 Cố định giờ
                  </span>
                )}

                {stopItem.overlapsGoldenHour && (
                  <span className="px-2.5 py-0.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white border border-amber-400 text-[10px] font-extrabold uppercase tracking-wide shadow-2xs whitespace-nowrap flex items-center gap-1">
                    <span>🌅</span>
                    <span>Giờ Vàng (SunCalc)</span>
                  </span>
                )}
              </div>

              {/* Nút menu 3 chấm (More Actions) */}
              <button
                type="button"
                onClick={() => setIsActionSheetOpen(true)}
                className="w-8 h-8 rounded-full hover:bg-black/5 active:bg-black/10 flex items-center justify-center text-paper-muted hover:text-paper-ink transition shrink-0 cursor-pointer"
                title="Tùy chỉnh chặng này"
                aria-label={`Tùy chỉnh chặng ${stop.name}`}
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>

            {/* Hàng 2: Tên quán + Các nút hành động chính (Bản đồ / Xem quán) */}
            <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1 pt-0.5">
              <h3
                onClick={() => targetDetailSlug && onOpenPlaceDetail?.(targetDetailSlug)}
                className={`text-sm sm:text-base font-bold text-paper-ink leading-snug min-w-0 ${
                  canOpenDetail ? "cursor-pointer hover:text-brand-terracotta" : ""
                }`}
              >
                <span className="mr-1.5">{stop.icon}</span>
                <span className="break-words">{stop.name}</span>
              </h3>

              <div className="flex items-center gap-1.5 shrink-0">
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-semibold text-paper-ink bg-white/80 border border-[#E2D6C5] hover:border-brand-terracotta px-2 py-0.5 rounded-md transition inline-flex items-center gap-1 cursor-pointer whitespace-nowrap shadow-2xs"
                  title="Chỉ đường trên Google Maps"
                >
                  <Navigation className="w-2.5 h-2.5 text-brand-terracotta" />
                  <span>Bản đồ</span>
                </a>
                {canOpenDetail && (
                  <button
                    type="button"
                    onClick={() => targetDetailSlug && onOpenPlaceDetail?.(targetDetailSlug)}
                    className="text-[11px] font-semibold text-brand-terracotta bg-brand-peach/40 px-2 py-0.5 rounded-md hover:bg-brand-peach/70 transition inline-flex items-center gap-0.5 cursor-pointer whitespace-nowrap"
                  >
                    <span>Xem quán</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Plan B note nếu có */}
            {stop.planBNote && (
              <p className="text-paper-muted italic flex items-center gap-1.5 text-xs">
                <span>🏷️</span> {stop.planBNote}
              </p>
            )}

            {/* Cảnh báo xung đột thời gian (nếu có) */}
            {stopItem.timeConflictWarning && (
              <p className="text-brand-terracottaDark font-semibold flex items-center gap-1 bg-brand-peach/40 px-2 py-1 rounded-lg text-xs mt-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                {stopItem.timeConflictWarning}
              </p>
            )}
          </div>
        </div>

        {/* Hộp ghi chú: CHỈ HIỂN THỊ KHI ĐÃ CÓ NỘI DUNG (Triệt tiêu rác thị giác) */}
        {stop.note && stop.note.trim() && !isEditingNoteInline && (
          <div
            onClick={() => {
              setNoteDraft(stop.note || "");
              setIsEditingNoteInline(true);
            }}
            className="mt-2.5 group/note cursor-pointer bg-[#FAF4E8] hover:bg-brand-peach/25 border border-[#E2D6C5] rounded-xl px-3 py-1.5 flex items-center justify-between gap-2 transition min-w-0"
            title="Bấm để sửa ghi chú"
          >
            <div className="flex items-center gap-1.5 text-xs text-paper-ink flex-1 min-w-0">
              <span className="text-brand-terracotta shrink-0">💌</span>
              <span className="truncate">
                <strong className="font-semibold text-brand-terracottaDark">Ghi chú: </strong>
                {stop.note}
              </span>
            </div>
            <span className="text-[11px] text-brand-terracotta sm:opacity-0 sm:group-hover/note:opacity-100 font-semibold shrink-0">
              Sửa ✎
            </span>
          </div>
        )}

        {/* Khi đang sửa ghi chú inline */}
        {isEditingNoteInline && (
          <div className="mt-2.5 bg-[#FFFDF9] border border-brand-coral rounded-xl p-2.5 space-y-2 shadow-2xs">
            <textarea
              rows={2}
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              placeholder="Nhập ghi chú cho chặng này (VD: Đặt bàn tầng 2, góc chụp vintage...)"
              className="w-full text-base sm:text-xs text-paper-ink bg-transparent focus:outline-none resize-none"
              autoFocus
            />
            <div className="flex justify-end gap-1.5">
              <button
                type="button"
                onClick={() => setIsEditingNoteInline(false)}
                className="px-2.5 py-1 rounded-lg text-xs text-paper-muted hover:bg-[#FAF4E8] cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  onSaveQuickNote(stop.id, noteDraft);
                  setIsEditingNoteInline(false);
                }}
                className="px-3 py-1 rounded-lg text-xs font-bold bg-brand-terracotta text-white hover:bg-brand-terracottaDark cursor-pointer shadow-2xs"
              >
                Lưu ghi chú
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ==============================================================
          NATIVE BOTTOM SHEET: TÙY CHỈNH CHẶNG HẸN HÒ
          (Giấu sạch 7 nút điều khiển cơ khí khỏi mặt thẻ chính)
          ============================================================== */}
      {isActionSheetOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#FFFDF9] border-t-2 sm:border-2 border-[#D8C7B0] rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 shadow-2xl relative space-y-4 select-text">
            {/* Drag Handle Bar trên mobile */}
            <div className="w-12 h-1.5 bg-paper-ink/20 rounded-full mx-auto mb-2 sm:hidden" />

            {/* Header Sheet */}
            <div className="flex items-center justify-between pb-3 border-b border-[#E2D6C5]">
              <div className="min-w-0 pr-2">
                <span className="text-[10px] font-extrabold text-brand-terracotta uppercase tracking-wider block">
                  ⚙️ TÙY CHỈNH CHẶNG #{index + 1}
                </span>
                <h4 className="font-serif font-black text-base text-paper-ink truncate">
                  {stop.icon} {stop.name}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsActionSheetOpen(false)}
                className="w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center text-paper-ink font-bold text-sm transition shrink-0"
                aria-label="Đóng"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Khối 1: Điều chỉnh thời lượng */}
            <div className="bg-[#FAF4E8] p-3 rounded-2xl border border-[#E2D6C5] space-y-1.5">
              <span className="text-xs font-bold text-paper-ink flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-brand-terracotta" />
                Thời lượng dừng chân tại quán
              </span>
              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => onRippleShift(stop.id, -15)}
                  className="flex-1 min-h-10 px-3 py-2 text-xs font-bold text-paper-ink bg-[#FFFDF9] border border-[#E2D6C5] hover:border-brand-coral rounded-xl transition flex items-center justify-center gap-1 cursor-pointer active:scale-95"
                >
                  -15 phút
                </button>
                <span className="font-mono font-bold text-sm text-paper-ink px-2 shrink-0">
                  {stop.durationMin || stop.duration} phút
                </span>
                <button
                  type="button"
                  onClick={() => onRippleShift(stop.id, 15)}
                  className="flex-1 min-h-10 px-3 py-2 text-xs font-bold text-paper-ink bg-[#FFFDF9] border border-[#E2D6C5] hover:border-brand-coral rounded-xl transition flex items-center justify-center gap-1 cursor-pointer active:scale-95"
                >
                  +15 phút
                </button>
              </div>
            </div>

            {/* Khối 2: Thay đổi thứ tự chặng */}
            <div className="bg-[#FAF4E8] p-3 rounded-2xl border border-[#E2D6C5] space-y-1.5">
              <span className="text-xs font-bold text-paper-ink flex items-center gap-1.5">
                ↕️ Thứ tự trong ngày hẹn
              </span>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    onReorder(index, index - 1);
                    setIsActionSheetOpen(false);
                  }}
                  disabled={index === 0}
                  className="min-h-10 px-3 py-2 text-xs font-bold text-paper-ink bg-[#FFFDF9] border border-[#E2D6C5] rounded-xl transition flex items-center justify-center gap-1.5 disabled:opacity-35 cursor-pointer active:scale-95"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                  <span>Đẩy lên trước</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onReorder(index, index + 1);
                    setIsActionSheetOpen(false);
                  }}
                  disabled={index === totalStops - 1}
                  className="min-h-10 px-3 py-2 text-xs font-bold text-paper-ink bg-[#FFFDF9] border border-[#E2D6C5] rounded-xl transition flex items-center justify-center gap-1.5 disabled:opacity-35 cursor-pointer active:scale-95"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                  <span>Đẩy xuống sau</span>
                </button>
              </div>
            </div>

            {/* Khối 3: Cố định giờ bắt đầu */}
            <div className="bg-[#FAF4E8] p-3 rounded-2xl border border-[#E2D6C5] flex items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-paper-ink block">
                  📌 Cố định giờ chặng này
                </span>
                <span className="text-[11px] text-paper-muted">
                  {stop.isLocked
                    ? `Đang khóa tại ${stopItem.startTimeStr}`
                    : "Giờ tự động linh hoạt theo lộ trình"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onTogglePin(stop.id, stop.isLocked, stopItem.startTimeStr)}
                className={`min-h-9 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  stop.isLocked
                    ? "bg-brand-terracotta text-white shadow-2xs"
                    : "bg-[#FFFDF9] text-paper-ink border border-[#E2D6C5] hover:border-brand-coral"
                }`}
              >
                {stop.isLocked ? "Đang khóa 🔒" : "Khóa giờ"}
              </button>
            </div>

            {/* Khối 4: Soạn ghi chú */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-paper-ink">💌 Lời nhắn / Ghi chú chặng</span>
              <textarea
                rows={2}
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                placeholder="Ghi chú chỗ ngồi view đẹp, món nhất định phải gọi..."
                className="w-full px-3 py-2 text-base sm:text-xs rounded-xl border border-[#CBB292] bg-[#FAF4E8] text-paper-ink focus:outline-none focus:border-brand-terracotta resize-none"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    onSaveQuickNote(stop.id, noteDraft);
                    setIsActionSheetOpen(false);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-brand-terracotta text-white text-xs font-bold hover:bg-brand-terracottaDark transition cursor-pointer shadow-2xs"
                >
                  Lưu ghi chú
                </button>
              </div>
            </div>

            {/* Khối 5: Xóa chặng */}
            <div className="pt-2 border-t border-[#E2D6C5]">
              <button
                type="button"
                onClick={() => {
                  onDeleteStop(stop.id);
                  setIsActionSheetOpen(false);
                }}
                className="w-full min-h-10 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 border border-red-200 transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa chặng này khỏi kế hoạch</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
