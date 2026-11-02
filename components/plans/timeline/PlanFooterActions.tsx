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
      <div className="mt-4 pl-10 sm:pl-11">
        <button
          type="button"
          onClick={onOpenAddStop}
          className="w-full py-2.5 rounded-xl border-2 border-dashed border-[#d5c5b0] hover:border-[#c84b31] bg-[#faf6f0] hover:bg-[#fff5f2] text-xs font-bold text-[#6e5645] hover:text-[#c84b31] transition flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          {`Thêm địa điểm mới vào mốc tiếp theo (${nextSlotEndStr})`}
        </button>
      </div>

      <div className="mt-6 pt-4 border-t border-[#eee5d7] flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onOpenChecklist}
          className="inline-flex items-center gap-2 bg-[#f3ede2] hover:bg-[#e8dfd1] border border-[#d6c7b2] px-3.5 py-2 rounded-full text-xs font-bold text-[#3d2d24] transition cursor-pointer"
        >
          <span>☑️ Đồ cần chuẩn bị:</span>
          <span className="text-[#c84b31]">
            {`${completedChecklistCount}/${totalChecklistCount} xong`}
          </span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          {onNotifyPartner && (
            <button
              type="button"
              onClick={onNotifyPartner}
              className="inline-flex items-center gap-1.5 bg-[#fdf3dc] hover:bg-[#f7e4b9] text-[#785118] border border-[#e3c383] text-xs font-bold px-4 py-2.5 rounded-full transition cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" /> Gửi lịch cho Người thương
            </button>
          )}
          <button
            type="button"
            onClick={onExportIcs}
            className="inline-flex items-center gap-1.5 bg-[#c84b31] hover:bg-[#ad3b23] text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-xs transition cursor-pointer"
          >
            📅 Lưu vào Lịch ĐT (.ics)
          </button>
        </div>
      </div>
    </>
  );
}

