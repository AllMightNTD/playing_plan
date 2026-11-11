"use client";

import React, { useEffect, useState } from "react";
import { X, Heart, Sparkles } from "lucide-react";
import {
  getModalBackdropClasses,
  getModalShellClasses,
  getModalHeaderClasses,
  getModalBodyClasses,
  getModalFooterClasses,
} from "@/lib/modal-layout";

export interface CompletePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  planTitle: string;
  onConfirmComplete: (payload: {
    rating: number;
    journal: string;
  }) => Promise<boolean>;
}

const RATING_LABELS: Record<number, string> = {
  1: "Hơi tiếc một chút",
  2: "Tạm ổn",
  3: "Vui vẻ ấm áp",
  4: "Rất đáng nhớ",
  5: "Tuyệt vời trọn vẹn!",
};

export function CompletePlanModal({
  isOpen,
  onClose,
  planTitle,
  onConfirmComplete,
}: CompletePlanModalProps) {
  const [rating, setRating] = useState(5);
  const [journal, setJournal] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const ok = await onConfirmComplete({ rating, journal: journal.trim() });
      if (ok) {
        setJournal("");
        setRating(5);
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div onClick={onClose} className={getModalBackdropClasses()}>
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Lưu buổi hẹn vào Kho Kỷ Niệm"
        className={getModalShellClasses("md")}
      >
        <div className={getModalHeaderClasses()}>
          <h3 className="text-base font-extrabold text-[#231915] flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#c84b31]" />
            Lưu buổi hẹn vào Kho Kỷ Niệm
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center text-[#7d6856] hover:bg-[#f3ede2] hover:text-[#231915] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-terracotta cursor-pointer"
            aria-label="Đóng modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className={getModalBodyClasses()}>
          <form
            id="complete-plan-form"
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            <div className="bg-[#f8f3eb] border border-[#e3d7c5] rounded-2xl p-3.5 text-center space-y-2">
              <p className="text-xs text-[#6e5645]">
                Cảm xúc của hai bạn về buổi hẹn
              </p>
              <p className="font-serif font-extrabold text-base text-[#231915]">
                “{planTitle}”
              </p>

              <div className="flex items-center justify-center gap-2 pt-1">
                {[1, 2, 3, 4, 5].map((value) => {
                  const active = value <= rating;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRating(value)}
                      className="w-11 h-11 rounded-full flex items-center justify-center hover:scale-110 transition cursor-pointer"
                      aria-label={`Chấm ${value} tim`}
                    >
                      <Heart
                        className={`w-7 h-7 transition ${
                          active
                            ? "text-[#c84b31] fill-[#c84b31]"
                            : "text-[#cbbba0] fill-transparent"
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
              <p className="text-xs font-bold text-[#c84b31]">
                {RATING_LABELS[rating]}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#6e5645] mb-1">
                Đôi dòng nhật ký lưu lại cho hai đứa (không bắt buộc)
              </label>
              <textarea
                rows={3}
                maxLength={1000}
                value={journal}
                onChange={(e) => setJournal(e.target.value)}
                placeholder="VD: Hoàng hôn Hồ Tây hôm nay tím lịm, hai đứa ăn hết sạch mẹt bún chả..."
                className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#d5c5b0] text-base sm:text-xs text-[#2d221c] focus:outline-none focus:border-[#c84b31] resize-none leading-relaxed"
              />
            </div>
          </form>
        </div>

        <div className={getModalFooterClasses()}>
          <button
            type="button"
            onClick={onClose}
            className="min-h-10 px-4 py-2 rounded-xl text-xs font-semibold text-[#6e5645] hover:bg-[#eee5d7] transition cursor-pointer"
          >
            Để sau
          </button>
          <button
            type="submit"
            form="complete-plan-form"
            disabled={isSubmitting}
            className="min-h-10 px-5 py-2.5 rounded-xl text-xs font-bold bg-[#2b6e44] hover:bg-[#225836] text-white shadow-xs transition disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? "Đang lưu..." : "💖 Hoàn thành & Lưu Kỷ Niệm"}
          </button>
        </div>
      </div>
    </div>
  );
}
