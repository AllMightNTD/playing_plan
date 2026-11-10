"use client";

import React from "react";
import { Plus, Send } from "lucide-react";

export interface PlanFooterActionsProps {
  nextSlotEndStr: string;
  completedChecklistCount: number;
  totalChecklistCount: number;
  onOpenAddStop: () => void;
  onOpenChecklist: () => void;
  onNotifyPartner?: () => void;
  onExportIcs: () => void;
}

export function PlanFooterActions({
  nextSlotEndStr,
  completedChecklistCount,
  totalChecklistCount,
  onOpenAddStop,
  onOpenChecklist,
  onNotifyPartner,
  onExportIcs,
}: PlanFooterActionsProps) {
  return (
    <>
      <div className="mt-6">
        <button
          type="button"
          onClick={onOpenAddStop}
          className="w-full py-3.5 rounded-2xl border-2 border-dashed border-rose-200 hover:border-rose-500 hover:bg-rose-50/50 text-xs font-bold text-rose-600 transition flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
        >
          <Plus className="w-4 h-4" />
          <span>{`Thêm địa điểm mới vào mốc tiếp theo (${nextSlotEndStr})`}</span>
        </button>
      </div>

      <div className="mt-7 pt-5 border-t border-stone-100 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onOpenChecklist}
          className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200/70 text-xs font-semibold text-stone-700 transition flex items-center gap-2 cursor-pointer"
        >
          <span>☑️ Đồ cần chuẩn bị:</span>
          <span className="text-rose-600 font-bold">
            {`${completedChecklistCount}/${totalChecklistCount} xong`}
          </span>
        </button>

        <div className="flex flex-wrap items-center gap-2.5">
          {onNotifyPartner && (
            <button
              type="button"
              onClick={onNotifyPartner}
              className="px-4 py-2.5 rounded-xl bg-amber-100/80 hover:bg-amber-200/70 text-amber-900 text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-2xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Gửi lịch cho Người thương</span>
            </button>
          )}
          <button
            type="button"
            onClick={onExportIcs}
            className="px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold shadow-xs shadow-rose-200 transition flex items-center gap-2 cursor-pointer"
          >
            <span>📅 Lưu vào Lịch ĐT (.ics)</span>
          </button>
        </div>
      </div>
    </>
  );
}

