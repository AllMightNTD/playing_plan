"use client";

import React, { useEffect } from "react";
import { Trash2 } from "lucide-react";
import {
  getModalBackdropClasses,
  getModalShellClasses,
  getModalHeaderClasses,
  getModalBodyClasses,
  getModalFooterClasses,
} from "@/lib/modal-layout";

export interface DeletePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  planTitle: string;
  isDeleting?: boolean;
}

export function DeletePlanModal({
  isOpen,
  onClose,
  onConfirm,
  planTitle,
  isDeleting = false,
}: DeletePlanModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div onClick={onClose} className={getModalBackdropClasses()}>
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Xóa toàn bộ lịch hẹn này"
        className={getModalShellClasses("sm")}
      >
        <div className={getModalHeaderClasses()}>
          <div className="w-10 h-10 rounded-full bg-[#fceae6] text-[#c84b31] flex items-center justify-center mx-auto">
            <Trash2 className="w-5 h-5" />
          </div>
        </div>

        <div className={`${getModalBodyClasses()} text-center`}>
          <h3 className="text-base font-extrabold text-[#231915]">
            Xóa toàn bộ lịch hẹn này?
          </h3>
          <p className="text-xs text-[#6e5645] leading-relaxed mt-1.5">
            Tất cả các chặng trong <strong>&quot;{planTitle}&quot;</strong> sẽ được xóa để bạn lên
            lịch hẹn mới. Thao tác này không thể hoàn tác.
          </p>
        </div>

        <div className={`${getModalFooterClasses()} justify-center gap-2.5`}>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="min-h-10 px-4 py-2 rounded-lg text-xs font-semibold text-[#6e5645] bg-[#f3ede2] hover:bg-[#e8dfd1] transition cursor-pointer"
          >
            Giữ lại
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="min-h-10 px-4 py-2 rounded-lg text-xs font-bold bg-[#b93829] text-white hover:bg-[#96291c] disabled:opacity-50 transition cursor-pointer"
          >
            {isDeleting ? "Đang xóa..." : "Đồng ý xóa"}
          </button>
        </div>
      </div>
    </div>
  );
}
