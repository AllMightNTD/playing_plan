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
    <div className="border-b border-[#eee5d7] pb-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
        <div className="flex flex-wrap items-center gap-2">
          {isCompleted ? (
            <span className="inline-flex items-center gap-1 bg-[#e8f4ec] text-[#2b6e44] text-xs font-bold px-2.5 py-1 rounded-full border border-[#bce0c8]">
              ✅ Đã hoàn thành
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 bg-[#e8f4ec] text-[#2b6e44] text-xs font-bold px-2.5 py-1 rounded-full border border-[#bce0c8]">
              📍 Lịch hẹn sắp tới
            </span>
          )}

          {isSecret && (
            <span className="inline-flex items-center gap-1 bg-[#fff0ec] text-[#c84b31] text-xs font-bold px-2.5 py-1 rounded-full border border-[#f5c6bc]">
              <Gift className="w-3.5 h-3.5" />
              Hẹn bất ngờ
            </span>
          )}

          <button
            type="button"
            onClick={onStartEdit}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#5c4738] bg-[#f5efe6] hover:bg-[#ebe0d0] px-2.5 py-1 rounded-full border border-[#dcd0be] transition cursor-pointer"
            title="Bấm để đổi ngày & giờ bắt đầu"
          >
            <Calendar className="w-3.5 h-3.5 text-[#c84b31]" />
            <span>{formatVietnameseDate(planDate)}</span>
            <span>•</span>
            <Clock className="w-3.5 h-3.5 text-[#c84b31]" />
            <span>{`Bắt đầu ${startTime}`}</span>
            <Edit3 className="w-3 h-3 opacity-60" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {!isCompleted && onCompletePlan && (
            <button
              type="button"
              onClick={onCompletePlan}
              className="inline-flex items-center gap-1 text-xs font-bold text-[#2b6e44] hover:text-white bg-[#e8f4ec] hover:bg-[#2b6e44] px-2.5 py-1 rounded-lg border border-[#bce0c8] transition cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Hoàn thành buổi hẹn</span>
            </button>
          )}
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
            onClick={() => (isEditing ? onCancelEdit() : onStartEdit())}
            className="p-1.5 rounded-lg text-[#6e5645] hover:bg-[#f2eae0] transition cursor-pointer"
            title="Sửa tiêu đề & ngày giờ lịch hẹn"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onRequestDeletePlan}
            className="p-1.5 rounded-lg text-[#b93829] hover:bg-[#fdeceb] transition cursor-pointer"
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
        <div className="flex items-center justify-between gap-2">
          <h1
            onClick={onStartEdit}
            className="text-xl sm:text-2xl font-extrabold text-[#231915] cursor-pointer hover:text-[#c84b31] transition flex items-center gap-2 group"
            title="Bấm để sửa tên lịch hẹn"
          >
            <span>{title}</span>
            <Edit3 className="w-4 h-4 opacity-0 group-hover:opacity-70 text-[#c84b31] transition" />
          </h1>
        </div>
      )}
    </div>
  );
}

