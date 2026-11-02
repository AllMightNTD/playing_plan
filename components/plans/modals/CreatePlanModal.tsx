"use client";

import React, { useState } from "react";
import { X, CalendarPlus, Gift } from "lucide-react";
import {
  getModalBackdropClasses,
  getModalShellClasses,
  getModalHeaderClasses,
  getModalBodyClasses,
  getModalFooterClasses,
} from "@/lib/modal-layout";

export interface CreatePlanFormInput {
  title: string;
  planDate: string;
  startTime: string;
  budget?: number;
  note?: string;
  isSecret?: boolean;
}

export interface CreatePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDate: string;
  onSubmitPlan: (input: CreatePlanFormInput) => Promise<boolean>;
}

export function CreatePlanModal({
  isOpen,
  onClose,
  defaultDate,
  onSubmitPlan,
}: CreatePlanModalProps) {
  const [title, setTitle] = useState("");
  const [planDate, setPlanDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState("16:00");
  const [budgetText, setBudgetText] = useState("");
  const [note, setNote] = useState("");
  const [isSecret, setIsSecret] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || isSubmitting) return;

    const numericBudget = Number(budgetText.replace(/\D/g, ""));
    setIsSubmitting(true);
    try {
      const ok = await onSubmitPlan({
        title: trimmed,
        planDate,
        startTime,
        ...(numericBudget > 0 ? { budget: numericBudget } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
        ...(isSecret ? { isSecret: true } : {}),
      });
      if (ok) {
        setTitle("");
        setBudgetText("");
        setNote("");
        setIsSecret(false);
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={getModalBackdropClasses()}>
      <div className={getModalShellClasses("md")}>
        <div className={getModalHeaderClasses()}>
          <h3 className="text-base font-extrabold text-[#231915] flex items-center gap-2">
            <CalendarPlus className="w-4 h-4 text-[#c84b31]" />
            Tạo buổi hẹn mới
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#7d6856] hover:bg-[#f3ede2] hover:text-[#231915] transition cursor-pointer"
            aria-label="Đóng modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className={getModalBodyClasses()}>
          <form id="create-plan-modal-form" onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-[#6e5645] mb-1">
                Tên buổi hẹn *
              </label>
              <input
                type="text"
                required
                maxLength={150}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="VD: Chiều thu Hồ Tây, Kỷ niệm 1 năm..."
                className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#d5c5b0] text-xs text-[#2d221c] focus:outline-none focus:border-[#c84b31]"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#6e5645] mb-1">
                  Ngày hẹn *
                </label>
                <input
                  type="date"
                  required
                  value={planDate}
                  onChange={(e) => setPlanDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#d5c5b0] text-xs text-[#2d221c] focus:outline-none focus:border-[#c84b31]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#6e5645] mb-1">
                  Giờ bắt đầu *
                </label>
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#d5c5b0] text-xs text-[#2d221c] focus:outline-none focus:border-[#c84b31]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#6e5645] mb-1">
                Ngân sách dự kiến (VND, không bắt buộc)
              </label>
              <input
                inputMode="numeric"
                value={budgetText}
                onChange={(e) => setBudgetText(e.target.value)}
                placeholder="VD: 500000"
                className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#d5c5b0] text-xs text-[#2d221c] focus:outline-none focus:border-[#c84b31]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#6e5645] mb-1">
                Lời nhắn / Dresscode chung
              </label>
              <textarea
                rows={2}
                maxLength={1000}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="VD: Mặc tone kem/nâu nhé, anh qua đón lúc 15:45!"
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#d5c5b0] text-xs text-[#2d221c] focus:outline-none focus:border-[#c84b31] resize-none"
              />
            </div>

            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-[#fdf3dc] border border-[#e3c383] cursor-pointer">
              <input
                type="checkbox"
                checked={isSecret}
                onChange={(e) => setIsSecret(e.target.checked)}
                className="mt-0.5 accent-[#c84b31]"
              />
              <span className="text-xs text-[#4f3d22] leading-relaxed">
                <strong className="flex items-center gap-1 font-extrabold text-[#785118]">
                  <Gift className="w-3.5 h-3.5 text-[#c84b31]" />
                  Chế độ Buổi hẹn bất ngờ
                </strong>
                Giấu toàn bộ điểm dừng với người thương cho tới sát giờ xuất phát!
              </span>
            </label>
          </form>
        </div>

        <div className={getModalFooterClasses()}>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-[#6e5645] hover:bg-[#eee5d7] transition cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="submit"
            form="create-plan-modal-form"
            disabled={isSubmitting || !title.trim()}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#c84b31] hover:bg-[#ad3b23] text-white shadow-xs transition disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? "Đang tạo..." : "📅 Tạo lịch hẹn"}
          </button>
        </div>
      </div>
    </div>
  );
}
