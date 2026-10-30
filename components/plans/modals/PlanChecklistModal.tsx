"use client";

import React, { useState } from "react";
import { X, CheckSquare, Square, Trash2, Plus } from "lucide-react";
import {
  getModalBackdropClasses,
  getModalShellClasses,
  getModalHeaderClasses,
  getModalBodyClasses,
  getModalFooterClasses,
} from "@/lib/modal-layout";

export interface ChecklistItemData {
  id: string;
  item: string;
  isChecked: boolean;
  assignedTo?: "user1" | "user2" | null;
}

export interface PlanChecklistModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: ChecklistItemData[];
  onToggleItem: (id: string, isChecked: boolean) => Promise<void> | void;
  onAddItem: (text: string) => Promise<void> | void;
  onDeleteItem: (id: string) => Promise<void> | void;
  isSubmitting?: boolean;
}

export function PlanChecklistModal({
  isOpen,
  onClose,
  items,
  onToggleItem,
  onAddItem,
  onDeleteItem,
  isSubmitting = false,
}: PlanChecklistModalProps) {
  const [newText, setNewText] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  if (!isOpen) return null;

  const completedCount = items.filter((i) => i.isChecked).length;
  const totalCount = items.length;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = newText.trim();
    if (!text || isAdding) return;
    setIsAdding(true);
    try {
      await onAddItem(text);
      setNewText("");
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className={getModalBackdropClasses()}>
      <div className={getModalShellClasses("md")}>
        {/* Header */}
        <div className={getModalHeaderClasses()}>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-extrabold text-[#231915]">
              ☑️ Đồ cần chuẩn bị
            </h3>
            <span className="text-xs font-bold text-[#c84b31] bg-[#fceae6] border border-[#df8a79] px-2.5 py-0.5 rounded-full">
              {completedCount}/{totalCount} xong
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#7d6856] hover:bg-[#f3ede2] hover:text-[#231915] transition"
            aria-label="Đóng modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className={getModalBodyClasses()}>
          {/* Progress bar */}
          <div className="w-full bg-[#eee5d7] rounded-full h-2 mb-3 overflow-hidden">
            <div
              className="bg-[#c84b31] h-2 rounded-full transition-all duration-300"
              style={{
                width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%`,
              }}
            />
          </div>

          {/* Checklist items */}
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {items.length === 0 ? (
              <p className="text-xs text-center text-[#8c7765] py-6 bg-[#f8f3eb] rounded-xl border border-dashed border-[#dfd2c0]">
                Chưa có đồ nào cần chuẩn bị. Hãy thêm món đồ đầu tiên bên dưới nhé!
              </p>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-2 bg-[#f8f3eb] hover:bg-[#f5efe5] px-3 py-2.5 rounded-xl border border-[#e3d7c5] transition"
                >
                  <button
                    type="button"
                    onClick={() => onToggleItem(item.id, !item.isChecked)}
                    disabled={isSubmitting}
                    className="flex items-center gap-2.5 text-xs text-left font-medium text-[#2d221c] flex-1 cursor-pointer"
                  >
                    {item.isChecked ? (
                      <CheckSquare className="w-4 h-4 text-[#2b6e44] shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-[#8c7765] shrink-0" />
                    )}
                    <span
                      className={
                        item.isChecked
                          ? "line-through text-[#8c7765]"
                          : "font-semibold text-[#2d221c]"
                      }
                    >
                      {item.item}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteItem(item.id)}
                    disabled={isSubmitting}
                    className="text-[#b93829] hover:bg-[#fdeceb] p-1.5 rounded-lg transition"
                    title="Xóa đồ này"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Form thêm item mới */}
          <form onSubmit={handleAdd} className="mt-3 flex gap-2">
            <input
              type="text"
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder="Thêm đồ cần chuẩn bị (VD: Áo khoác, sạc dự phòng, hoa...)"
              className="flex-1 px-3 py-2 text-xs rounded-lg border border-[#d5c5b0] bg-white text-[#2d221c] focus:outline-none focus:border-[#c84b31]"
            />
            <button
              type="submit"
              disabled={isAdding || !newText.trim()}
              className="px-3.5 py-2 rounded-lg text-xs font-bold bg-[#c84b31] text-white hover:bg-[#ad3b23] disabled:opacity-50 transition flex items-center gap-1 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              Thêm
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className={getModalFooterClasses()}>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 rounded-lg text-xs font-bold bg-[#f3ede2] hover:bg-[#e8dfd1] text-[#3d2d24] transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
