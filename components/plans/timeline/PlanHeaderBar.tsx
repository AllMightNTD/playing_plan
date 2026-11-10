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
    <div className="border-b border-[#F2E4DC] pb-5 mb-5">
      {/* Top badges & secondary actions */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 mb-3">
        <div className="flex flex-wrap items-center gap-2">
          {isCompleted ? (
            <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-xs font-semibold px-3 py-1 rounded-full border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Đã hoàn thành
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-xs font-semibold px-3 py-1 rounded-full border border-emerald-200">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              Lịch hẹn sắp tới
            </span>
          )}

          {isSecret && (
            <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-600 text-xs font-bold px-2.5 py-1 rounded-full border border-rose-200">
              <Gift className="w-3.5 h-3.5" />
              Hẹn bất ngờ
            </span>
          )}

          <button
            type="button"
            onClick={onStartEdit}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200/70 px-3 py-1 rounded-full border border-stone-200/60 transition cursor-pointer"
            title="Bấm để đổi ngày & giờ bắt đầu"
          >
            <Calendar className="w-3.5 h-3.5 text-rose-500" />
            <span>{formatVietnameseDate(planDate)}</span>
            <span>•</span>
            <Clock className="w-3.5 h-3.5 text-rose-500" />
            <span>{`Bắt đầu ${startTime}`}</span>
            <Edit3 className="w-3 h-3 opacity-60 ml-0.5" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {onShareStory && (
            <button
              type="button"
              onClick={onShareStory}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-xl border border-rose-200/70 transition cursor-pointer shadow-2xs"
            >
              <span>🖼️ Tạo Story</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => (isEditing ? onCancelEdit() : onStartEdit())}
            className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition cursor-pointer"
            title="Sửa tiêu đề & ngày giờ lịch hẹn"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onRequestDeletePlan}
            className="p-1.5 rounded-xl text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
            title="Xóa lịch hẹn này"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isEditing ? (
        <div className="mt-3 bg-[#f7f2ea] border border-[#dfd2c0] rounded-xl p-3.5 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-[#6e5645] mb-1">
              Tên buổi hẹn hò
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => onChangeForm({ ...form, title: e.target.value })}
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
                value={form.planDate}
                onChange={(e) => onChangeForm({ ...form, planDate: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg border border-[#d5c5b0] bg-white text-sm text-[#2d221c] focus:outline-none focus:border-[#c84b31]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#6e5645] mb-1">
                Giờ bắt đầu chặng đầu tiên
              </label>
              <input
                type="time"
                value={form.startTime}
                onChange={(e) => onChangeForm({ ...form, startTime: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg border border-[#d5c5b0] bg-white text-sm text-[#2d221c] focus:outline-none focus:border-[#c84b31]"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onCancelEdit}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#6e5645] hover:bg-[#e8dfd3] cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={onSaveEdit}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#c84b31] text-white hover:bg-[#b03e26] flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              {isSaving ? "Đang lưu..." : "Lưu lịch hẹn"}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-baseline justify-between gap-3 pt-1">
          <div>
            <h1
              onClick={onStartEdit}
              className="text-2xl sm:text-3xl font-extrabold tracking-tight text-stone-800 cursor-pointer hover:text-rose-600 transition flex items-center gap-2 group"
              title="Bấm để sửa tên lịch hẹn"
            >
              <span>{title}</span>
              <span className="text-lg font-normal text-rose-400">✨</span>
              <Edit3 className="w-4 h-4 opacity-0 group-hover:opacity-70 text-rose-500 transition" />
            </h1>
            <p className="text-xs text-stone-400 mt-1">
              Lên kế hoạch cùng người thương • {stopsCount ? `${stopsCount} điểm đến ấm cúng` : "Lịch trình ấm cúng"}
            </p>
          </div>

          {!isCompleted && onCompletePlan && (
            <button
              type="button"
              onClick={onCompletePlan}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white shadow-xs shadow-emerald-200 transition flex items-center gap-1.5 cursor-pointer shrink-0"
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

