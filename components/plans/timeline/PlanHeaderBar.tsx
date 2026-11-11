"use client";

import React from "react";
import { Calendar, Clock, Edit3, Trash2, Check, CheckCircle2, Gift } from "lucide-react";
import { formatVietnameseDate } from "@/lib/plan-optimizer";

export interface PlanHeaderFormState {
  title: string;
  planDate: string;
  startTime: string;
}

export interface PlanHeaderBarProps {
  title: string;
  planDate: string;
  startTime: string;
  status: string;
  isSecret: boolean;
  isEditing: boolean;
  isSaving: boolean;
  stopsCount?: number;
  form: PlanHeaderFormState;
  onChangeForm: (next: PlanHeaderFormState) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onShareStory?: () => void;
  onCompletePlan?: () => void;
  onRequestDeletePlan: () => void;
}

export function PlanHeaderBar({
  title,
  planDate,
  startTime,
  status,
  isSecret,
  isEditing,
  isSaving,
  stopsCount,
  form,
  onChangeForm,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onShareStory,
  onCompletePlan,
  onRequestDeletePlan,
}: PlanHeaderBarProps) {
  const isCompleted = status === "done";

  return (
    <div className="border-b border-[#E2D6C5] pb-4 mb-4">
      {/* Top Unified Status & Action Capsule */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 mb-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onStartEdit}
            className="min-h-8 inline-flex items-center gap-1.5 bg-[#FAF4E8] hover:bg-[#EFE5D4] text-paper-ink text-xs font-semibold px-3 py-1 rounded-full border border-[#D5C5B0] transition cursor-pointer"
            title="Bấm để đổi ngày & giờ bắt đầu"
          >
            <span className="relative flex h-2 w-2">
              {isCompleted ? (
                <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-olive" />
              ) : (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-olive opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-olive" />
                </>
              )}
            </span>
            <span className="font-bold text-brand-olive">
              {isCompleted ? "Đã hoàn thành" : "Lịch hẹn sắp tới"}
            </span>
            <span className="text-[#CBB292]">•</span>
            <Calendar className="w-3.5 h-3.5 text-brand-terracotta" />
            <span>{formatVietnameseDate(planDate)}</span>
            <span className="text-[#CBB292]">•</span>
            <Clock className="w-3.5 h-3.5 text-brand-terracotta" />
            <span>{`Bắt đầu ${startTime}`}</span>
            <Edit3 className="w-3 h-3 opacity-60 ml-0.5 text-brand-terracotta" />
          </button>

          {isSecret && (
            <span className="inline-flex items-center gap-1 bg-brand-peach/60 text-brand-terracottaDark text-xs font-bold px-2.5 py-1 rounded-full border border-brand-coral/50">
              <Gift className="w-3.5 h-3.5" />
              <span>Hẹn bất ngờ</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {onShareStory && (
            <button
              type="button"
              onClick={onShareStory}
              className="min-h-8 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-terracottaDark hover:text-white bg-brand-peach/50 hover:bg-brand-terracotta px-3 py-1 rounded-xl border border-brand-coral/50 transition cursor-pointer shadow-2xs"
            >
              <span>🖼️ Tạo Story</span>
            </button>
          )}
          <button
            type="button"
            onClick={onRequestDeletePlan}
            aria-label="Xóa lịch hẹn này"
            className="w-8 h-8 rounded-xl text-paper-muted hover:text-brand-terracotta hover:bg-brand-peach/40 flex items-center justify-center transition cursor-pointer"
            title="Xóa lịch hẹn này"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {isEditing ? (
        <div className="mt-3 bg-[#FAF4E8] border border-[#D5C5B0] rounded-xl p-3.5 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-paper-muted mb-1">
              Tên buổi hẹn hò
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => onChangeForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-[#CBB292] bg-[#FFFDF9] text-base sm:text-sm font-bold text-paper-ink focus:outline-none focus:border-brand-terracotta"
              placeholder="Nhập tên buổi hẹn..."
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-paper-muted mb-1">
                Chọn ngày hẹn
              </label>
              <input
                type="date"
                value={form.planDate}
                onChange={(e) => onChangeForm({ ...form, planDate: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-[#CBB292] bg-[#FFFDF9] text-base sm:text-sm text-paper-ink focus:outline-none focus:border-brand-terracotta"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-paper-muted mb-1">
                Giờ bắt đầu chặng đầu tiên
              </label>
              <input
                type="time"
                value={form.startTime}
                onChange={(e) => onChangeForm({ ...form, startTime: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-[#CBB292] bg-[#FFFDF9] text-base sm:text-sm text-paper-ink focus:outline-none focus:border-brand-terracotta"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onCancelEdit}
              className="min-h-9 px-3 py-1.5 rounded-lg text-xs font-semibold text-paper-muted hover:bg-[#EFE5D4] cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={onSaveEdit}
              className="min-h-9 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-brand-terracotta text-white hover:bg-brand-terracottaDark flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              {isSaving ? "Đang lưu..." : "Lưu lịch hẹn"}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-start justify-between gap-3 pt-1 min-w-0">
          <div className="min-w-0 flex-1">
            <h1
              onClick={onStartEdit}
              className="font-serif text-lg sm:text-2xl font-extrabold tracking-tight text-paper-ink cursor-pointer hover:text-brand-terracotta transition leading-snug break-words group"
              title="Bấm để sửa tên lịch hẹn"
            >
              <span>{title}</span>
              <span className="text-base font-normal text-brand-coral ml-1">✨</span>
              <Edit3 className="w-3.5 h-3.5 inline-block ml-1 opacity-60 sm:opacity-0 sm:group-hover:opacity-70 text-brand-terracotta transition align-baseline" />
            </h1>
            <p className="text-xs text-paper-muted mt-0.5">
              Lên kế hoạch cùng người thương • {stopsCount ? `${stopsCount} điểm đến ấm cúng` : "Lịch trình ấm cúng"}
            </p>
          </div>

          {!isCompleted && onCompletePlan && (
            <button
              type="button"
              onClick={onCompletePlan}
              className="min-h-9 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-brand-olive hover:opacity-90 text-white shadow-2xs transition flex items-center gap-1.5 cursor-pointer shrink-0 active:scale-95"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Hoàn thành</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

