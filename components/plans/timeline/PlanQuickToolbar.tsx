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
      <div className="bg-gradient-to-r from-rose-50/80 via-amber-50/60 to-sky-50/60 p-3.5 rounded-2xl border border-rose-100/80 shadow-2xs">
        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-rose-600 mb-2.5 px-1">
          <Sparkles className="w-3.5 h-3.5 text-rose-500" />
          <span>Trợ lý tối ưu lịch trình thông minh</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {stopsCount >= 2 && (
            <button
              type="button"
              onClick={onOptimizeSequence}
              disabled={isOptimizing}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-rose-50 text-rose-600 border border-rose-200/70 shadow-2xs transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isOptimizing ? "Đang tối ưu..." : "✨ Tối ưu thứ tự"}</span>
            </button>
          )}
          <button
            type="button"
            onClick={onSunsetAlign}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-amber-50 text-amber-700 border border-amber-200/70 shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <span>🌅 Tự xếp giờ khớp Hoàng hôn ({goldenHourStart || "16:18"})</span>
          </button>
          <button
            type="button"
            onClick={onPlanB}
            disabled={isApplyingPlanB}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-sky-50 text-sky-700 border border-sky-200/70 shadow-2xs transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            <span>🌧️ Đổi sang quán Trong nhà (Phòng mưa)</span>
          </button>
        </div>
      </div>

      {optimizerHint && (
        <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl px-3.5 py-2.5 text-xs text-amber-900 leading-relaxed shadow-2xs">
          <strong className="font-bold text-rose-600">✨ Gợi ý nhịp hẹn: </strong>
          {optimizerHint}
        </div>
      )}

      {/* Drag & drop tip bar + Add Stop button */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-stone-400 px-1">
        <span className="flex items-center gap-1.5">
          <GripVertical className="w-3.5 h-3.5 text-stone-300 shrink-0" />
          <span>Kéo thả để đổi thứ tự hoặc di chuột vào thẻ để chỉnh mốc giờ</span>
        </span>
        <button
          type="button"
          onClick={onOpenAddStop}
          className="text-rose-600 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" /> Thêm chặng mới
        </button>
      </div>

      {/* Empty state: Drop zone + Dating Templates */}
      {stopsCount === 0 && (
        <div className="space-y-4 pt-1">
          <div
            onClick={onOpenAddStop}
            className="group relative border-2 border-dashed border-rose-200 hover:border-rose-400 bg-rose-50/20 hover:bg-rose-50/40 rounded-2xl p-6 sm:p-7 text-center transition-all cursor-pointer shadow-2xs"
          >
            <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-100/60 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
              🎯
            </div>
            <h3 className="font-serif font-extrabold text-base sm:text-lg text-stone-800 mt-2.5">
              Vùng thả địa điểm vào lịch trình
            </h3>
            <p className="text-xs text-stone-500 max-w-md mx-auto mt-1 leading-relaxed">
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
                className="bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Thêm chặng đầu tiên
              </button>
            </div>
          </div>

          <div className="bg-stone-50/80 border border-stone-200/80 rounded-2xl p-4 sm:p-5 space-y-3">
            <div>
              <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-rose-500" /> Timeline Builder
              </span>
              <h4 className="font-serif font-extrabold text-sm sm:text-base text-stone-800">
                Hoặc bắt đầu nhanh với 3 kịch bản hẹn hò được yêu thích nhất:
              </h4>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {DATING_TEMPLATES.map((tpl) => (
                <div
                  key={tpl.id}
                  className="bg-white hover:bg-rose-50/20 border border-stone-200/70 hover:border-rose-300 rounded-xl p-3.5 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-lg">{tpl.icon}</span>
                      <span className="font-serif font-extrabold text-sm text-stone-800">
                        {tpl.title}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                        {tpl.badge}
                      </span>
                      <span className="text-[11px] text-stone-400 font-medium hidden sm:inline">
                        • {tpl.estimatedDuration}
                      </span>
                    </div>
                    <p className="text-xs text-stone-600">{tpl.tagline}</p>
                    <div className="flex items-center gap-1.5 text-[11px] text-stone-400 pt-0.5 flex-wrap">
                      <span className="font-medium">Lộ trình:</span>
                      {tpl.stops.map((s, sIdx) => (
                        <React.Fragment key={s.name}>
                          <span className="font-semibold text-stone-700">{s.name}</span>
                          {sIdx < tpl.stops.length - 1 && (
                            <span className="text-rose-400">➔</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isApplyingTemplate}
                    onClick={() => onApplyTemplate(tpl)}
                    className="shrink-0 bg-amber-50 hover:bg-rose-500 text-amber-800 hover:text-white border border-amber-200 hover:border-rose-500 text-xs font-bold px-3.5 py-2 rounded-xl transition shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
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

