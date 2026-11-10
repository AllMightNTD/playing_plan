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
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div
          className="inline-flex items-center gap-1 bg-stone-100 p-1 rounded-2xl border border-stone-200/80 shadow-2xs"
          role="tablist"
        >
          <button
            type="button"
            role="tab"
            aria-selected={filterTab === "upcoming"}
            onClick={() => onChangeFilterTab("upcoming")}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer",
              filterTab === "upcoming"
                ? "bg-rose-500 text-white shadow-2xs"
                : "text-stone-600 hover:text-stone-900 hover:bg-white/60"
            )}
          >
            📍 Sắp tới ({upcomingPlans.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filterTab === "done"}
            onClick={() => onChangeFilterTab("done")}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer",
              filterTab === "done"
                ? "bg-emerald-600 text-white shadow-2xs"
                : "text-stone-600 hover:text-stone-900 hover:bg-white/60"
            )}
          >
            ✅ Đã đi ({completedPlans.length})
          </button>
        </div>

        <button
          type="button"
          onClick={onOpenCreateModal}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold shadow-xs shadow-rose-200 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tạo buổi hẹn mới</span>
        </button>
      </div>

      {visiblePlans.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {visiblePlans.map((p) => {
            const isSelected = p.id === selectedPlanId;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelectPlan(p.id)}
                className={cn(
                  "px-3.5 py-2 rounded-2xl text-xs font-bold border whitespace-nowrap transition flex items-center gap-1.5 cursor-pointer shrink-0 shadow-2xs",
                  isSelected
                    ? "bg-stone-800 text-white border-stone-800 shadow-xs"
                    : "bg-white text-stone-700 border-[#F2E4DC] hover:border-rose-300 hover:bg-rose-50/30"
                )}
              >
                {p.status === "done" ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : p.isSecret ? (
                  <Gift className="w-3.5 h-3.5 text-rose-400" />
                ) : (
                  <Calendar className="w-3.5 h-3.5 text-stone-400" />
                )}
                <span>{p.title}</span>
                <span className="opacity-50">•</span>
                <span className="opacity-80 font-normal">{formatVietnameseDate(p.planDate)}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

