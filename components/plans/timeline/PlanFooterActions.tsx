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
      <div className="mt-5 sm:mt-6">
        <button
          type="button"
          onClick={onOpenAddStop}
          className="min-h-11 w-full px-3 py-3 sm:py-3.5 rounded-2xl border-2 border-dashed border-brand-coral hover:border-brand-terracotta bg-[#FAF4E8]/60 hover:bg-brand-peach/25 text-xs font-bold text-brand-terracotta transition flex items-center justify-center gap-2 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-terracotta cursor-pointer shadow-2xs"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span>{`Thêm địa điểm mới vào mốc tiếp theo (${nextSlotEndStr})`}</span>
        </button>
      </div>

      <div className="mt-4 pt-4 border-t border-[#E2D6C5] space-y-2.5">
        {/* Balanced 2-column grid for mobile/tablet */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onOpenChecklist}
            className="min-h-11 w-full px-4 py-2.5 rounded-xl bg-[#FAF4E8] hover:bg-[#EFE5D4] border border-[#D5C5B0] text-xs font-semibold text-paper-ink transition flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-terracotta cursor-pointer"
          >
            <span>☑️ Đồ cần chuẩn bị:</span>
            <span className="text-brand-terracotta font-bold">
              {`${completedChecklistCount}/${totalChecklistCount} xong`}
            </span>
          </button>

          {onNotifyPartner && (
            <button
              type="button"
              onClick={onNotifyPartner}
              className="min-h-11 w-full px-4 py-2.5 rounded-xl bg-amber-100/80 hover:bg-amber-200/70 text-amber-900 text-xs font-bold transition flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-terracotta cursor-pointer shadow-2xs active:scale-98"
            >
              <Send className="w-3.5 h-3.5 shrink-0" />
              <span>Gửi lịch cho Người thương</span>
            </button>
          )}
        </div>

        {/* Secondary Compact ICS Export Link */}
        <div className="text-center pt-0.5">
          <button
            type="button"
            onClick={onExportIcs}
            className="text-xs font-semibold text-paper-muted hover:text-brand-terracotta transition underline inline-flex items-center gap-1.5 cursor-pointer py-1"
          >
            <span>📅 Lưu vào Lịch ĐT (.ics)</span>
          </button>
        </div>
      </div>
    </>
  );
}

