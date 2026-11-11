"use client";

import React from "react";
import { Calendar, Plus, CheckCircle2, Gift } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatVietnameseDate } from "@/lib/plan-optimizer";
import type { PlanSummaryDto } from "@/server/services/user/plan.mapper";

export type PlanFilterTab = "upcoming" | "done";

export interface PlanSwitcherBarProps {
  plans: PlanSummaryDto[];
  selectedPlanId: string | null;
  filterTab: PlanFilterTab;
  onChangeFilterTab: (tab: PlanFilterTab) => void;
  onSelectPlan: (planId: string) => void;
  onOpenCreateModal: () => void;
}

export function PlanSwitcherBar({
  plans,
  selectedPlanId,
  filterTab,
  onChangeFilterTab,
  onSelectPlan,
  onOpenCreateModal,
}: PlanSwitcherBarProps) {
  const upcomingPlans = plans.filter((p) => p.status === "planned");
  const completedPlans = plans.filter((p) => p.status === "done");
  const visiblePlans = filterTab === "upcoming" ? upcomingPlans : completedPlans;

  return (
    <div className="space-y-2.5 sm:space-y-3">
      {/* Tầng 1: Bộ lọc trạng thái + Nút tạo hẹn */}
      <div className="flex items-center justify-between gap-2">
        <div
          className="inline-flex items-center gap-1 bg-[#EFE5D4] p-1 rounded-2xl border border-[#CBB292] shadow-2xs"
          role="tablist"
          aria-label="Lọc kế hoạch theo trạng thái"
        >
          <button
            type="button"
            role="tab"
            aria-selected={filterTab === "upcoming"}
            onClick={() => onChangeFilterTab("upcoming")}
            className={cn(
              "min-h-9 px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1",
              filterTab === "upcoming"
                ? "bg-brand-terracotta text-white shadow-2xs"
                : "text-paper-ink hover:bg-[#FFFDF9]"
            )}
          >
            <span>📍 Sắp tới</span>
            <span
              className={cn(
                "text-[10px] px-1.5 py-0.2 rounded-full font-mono",
                filterTab === "upcoming" ? "bg-white/20 text-white" : "bg-[#DFCDB9] text-paper-ink"
              )}
            >
              {upcomingPlans.length}
            </span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filterTab === "done"}
            onClick={() => onChangeFilterTab("done")}
            className={cn(
              "min-h-9 px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1",
              filterTab === "done"
                ? "bg-brand-olive text-white shadow-2xs"
                : "text-paper-ink hover:bg-[#FFFDF9]"
            )}
          >
            <span>✅ Đã đi</span>
            <span
              className={cn(
                "text-[10px] px-1.5 py-0.2 rounded-full font-mono",
                filterTab === "done" ? "bg-white/20 text-white" : "bg-[#DFCDB9] text-paper-ink"
              )}
            >
              {completedPlans.length}
            </span>
          </button>
        </div>

        <button
          type="button"
          onClick={onOpenCreateModal}
          className="min-h-9 sm:min-h-10 inline-flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-2xl bg-brand-terracotta hover:bg-brand-terracottaDark text-white text-xs font-bold shadow-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-terracotta cursor-pointer shrink-0 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Tạo buổi hẹn mới</span>
          <span className="sm:hidden">Tạo hẹn</span>
        </button>
      </div>

      {/* Tầng 2: Hàng chip buổi hẹn trượt ngang Date Scroller Carousel */}
      {visiblePlans.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar app-horizontal-carousel">
          {visiblePlans.map((p) => {
            const isSelected = p.id === selectedPlanId;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelectPlan(p.id)}
                className={cn(
                  "min-h-10 px-3.5 py-2 rounded-2xl text-xs font-bold border whitespace-nowrap transition flex items-center gap-1.5 cursor-pointer shrink-0 shadow-2xs active:scale-[0.98]",
                  isSelected
                    ? "bg-paper-ink text-[#FFFDF9] border-paper-ink shadow-xs"
                    : "bg-[#FFFDF9] text-paper-ink border-[#D5C5B0] hover:border-brand-terracotta hover:bg-[#FAF4E8]"
                )}
              >
                {p.status === "done" ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-brand-olive shrink-0" />
                ) : p.isSecret ? (
                  <Gift className="w-3.5 h-3.5 text-brand-coral shrink-0" />
                ) : (
                  <Calendar className="w-3.5 h-3.5 text-paper-muted shrink-0" />
                )}
                <span className="max-w-[160px] sm:max-w-none truncate">{p.title}</span>
                <span className="opacity-40">•</span>
                <span className="opacity-75 font-normal text-[11px]">{formatVietnameseDate(p.planDate)}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
