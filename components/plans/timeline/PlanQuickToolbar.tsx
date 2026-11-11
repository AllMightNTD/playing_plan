"use client";

import React from "react";
import { GripVertical, Plus, Sparkles } from "lucide-react";
import { DATING_TEMPLATES, type DatingTemplate } from "@/lib/plan-enrichment";

export interface PlanQuickToolbarProps {
  stopsCount: number;
  goldenHourStart?: string;
  isApplyingPlanB: boolean;
  isOptimizing: boolean;
  isApplyingTemplate: boolean;
  optimizerHint: string | null;
  onSunsetAlign: () => void;
  onPlanB: () => void;
  onOptimizeSequence: () => void;
  onOpenAddStop: () => void;
  onApplyTemplate: (template: DatingTemplate) => void;
}

export function PlanQuickToolbar({
  stopsCount,
  goldenHourStart,
  isApplyingPlanB,
  isOptimizing,
  isApplyingTemplate,
  optimizerHint,
  onSunsetAlign,
  onPlanB,
  onOptimizeSequence,
  onOpenAddStop,
  onApplyTemplate,
}: PlanQuickToolbarProps) {
  return (
    <div className="space-y-4 mb-5">
      {/* Smart Assistant Banner */}
      <div className="bg-gradient-to-r from-[#FAF4E8] via-amber-50/70 to-brand-peach/30 p-3.5 rounded-2xl border border-[#E2D6C5] shadow-2xs">
        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-brand-terracotta mb-2.5 px-1">
          <Sparkles className="w-3.5 h-3.5 text-brand-terracotta" />
          <span>Trợ lý tối ưu lịch trình thông minh</span>
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar app-horizontal-carousel pb-0.5">
          {stopsCount >= 2 && (
            <button
              type="button"
              onClick={onOptimizeSequence}
              disabled={isOptimizing}
              className="min-h-9 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#FFFDF9] hover:bg-brand-peach/40 text-brand-terracotta border border-[#D5C5B0] shadow-2xs transition flex items-center gap-1.5 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-terracotta cursor-pointer whitespace-nowrap shrink-0 active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isOptimizing ? "Đang tối ưu..." : "Tối ưu thứ tự"}</span>
            </button>
          )}
          <button
            type="button"
            onClick={onSunsetAlign}
            className="min-h-9 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#FFFDF9] hover:bg-amber-50 text-amber-800 border border-amber-200/80 shadow-2xs transition flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-terracotta cursor-pointer whitespace-nowrap shrink-0 active:scale-95"
          >
            <span>🌅 Tự xếp giờ khớp Hoàng hôn ({goldenHourStart || "16:18"})</span>
          </button>
          <button
            type="button"
            onClick={onPlanB}
            disabled={isApplyingPlanB}
            className="min-h-9 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#FFFDF9] hover:bg-sky-50 text-sky-700 border border-sky-200/80 shadow-2xs transition flex items-center gap-1.5 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-terracotta cursor-pointer whitespace-nowrap shrink-0 active:scale-95"
          >
            <span>🌧️ Đổi sang quán Trong nhà (Phòng mưa)</span>
          </button>
        </div>
      </div>

      {optimizerHint && (
        <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl px-3.5 py-2.5 text-xs text-amber-900 leading-relaxed shadow-2xs">
          <strong className="font-bold text-brand-terracotta">✨ Gợi ý nhịp hẹn: </strong>
          {optimizerHint}
        </div>
      )}

      {/* Drag & drop tip bar + Add Stop button */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-paper-muted px-1 min-w-0">
        <span className="flex items-start sm:items-center gap-1.5 min-w-0 flex-1 leading-snug">
          <GripVertical className="w-3.5 h-3.5 text-paper-muted/60 shrink-0 mt-0.5 sm:mt-0" />
          <span>Chạm ••• trên mỗi chặng để sửa giờ hoặc đổi vị trí</span>
        </span>
        <button
          type="button"
          onClick={onOpenAddStop}
          className="text-brand-terracotta font-semibold hover:underline flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0 ml-auto"
        >
          <Plus className="w-3.5 h-3.5" /> Thêm chặng mới
        </button>
      </div>

      {/* Empty state: Drop zone + Dating Templates */}
      {stopsCount === 0 && (
        <div className="space-y-4 pt-1">
          <div
            onClick={onOpenAddStop}
            className="group relative border-2 border-dashed border-brand-coral hover:border-brand-terracotta bg-[#FAF4E8]/70 hover:bg-brand-peach/25 rounded-2xl p-6 sm:p-7 text-center transition-all cursor-pointer shadow-2xs"
          >
            <div className="w-12 h-12 mx-auto rounded-2xl bg-brand-peach/70 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
              🎯
            </div>
            <h3 className="font-serif font-extrabold text-base sm:text-lg text-paper-ink mt-2.5">
              Vùng thả địa điểm vào lịch trình
            </h3>
            <p className="text-xs text-paper-muted max-w-md mx-auto mt-1 leading-relaxed">
              Kéo thả các quán yêu thích từ trang <strong>Khám phá</strong> vào đây, hoặc bấm nút
              bên dưới để thêm địa điểm thủ công theo ý hai bạn.
            </p>
            <div className="mt-3.5 flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenAddStop();
                }}
                className="min-h-10 bg-brand-terracotta hover:bg-brand-terracottaDark text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Thêm chặng đầu tiên
              </button>
            </div>
          </div>

          <div className="bg-[#FAF4E8] border border-[#E2D6C5] rounded-2xl p-4 sm:p-5 space-y-3">
            <div>
              <span className="text-[11px] font-bold text-brand-terracotta uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-brand-terracotta" /> Timeline Builder
              </span>
              <h4 className="font-serif font-extrabold text-sm sm:text-base text-paper-ink">
                Hoặc bắt đầu nhanh với 3 kịch bản hẹn hò được yêu thích nhất:
              </h4>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {DATING_TEMPLATES.map((tpl) => (
                <div
                  key={tpl.id}
                  className="bg-[#FFFDF9] hover:bg-brand-peach/15 border border-[#E2D6C5] hover:border-brand-coral rounded-xl p-3.5 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-lg">{tpl.icon}</span>
                      <span className="font-serif font-extrabold text-sm text-paper-ink">
                        {tpl.title}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                        {tpl.badge}
                      </span>
                      <span className="text-[11px] text-paper-muted font-medium hidden sm:inline">
                        • {tpl.estimatedDuration}
                      </span>
                    </div>
                    <p className="text-xs text-paper-muted">{tpl.tagline}</p>
                    <div className="flex items-center gap-1.5 text-[11px] text-paper-muted pt-0.5 flex-wrap">
                      <span className="font-medium">Lộ trình:</span>
                      {tpl.stops.map((s, sIdx) => (
                        <React.Fragment key={s.name}>
                          <span className="font-semibold text-paper-ink">{s.name}</span>
                          {sIdx < tpl.stops.length - 1 && (
                            <span className="text-brand-terracotta">➔</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isApplyingTemplate}
                    onClick={() => onApplyTemplate(tpl)}
                    className="min-h-10 shrink-0 bg-amber-50 hover:bg-brand-terracotta text-amber-900 hover:text-white border border-amber-200 hover:border-brand-terracotta text-xs font-bold px-3.5 py-2 rounded-xl transition shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <span>
                      {isApplyingTemplate ? "Đang xếp lịch..." : "✨ Chọn kịch bản này"}
                    </span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

