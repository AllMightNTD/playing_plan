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
    <div className="space-y-3">
      {/* Quick action pills */}
      <div className="flex flex-wrap items-center gap-2">
        {stopsCount >= 2 && (
          <button
            type="button"
            onClick={onOptimizeSequence}
            disabled={isOptimizing}
            className="inline-flex items-center gap-1.5 text-xs font-bold bg-[#fff5f2] hover:bg-[#ffe8e2] text-[#c84b31] border border-[#f5c6bc] px-3.5 py-2 rounded-full transition shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isOptimizing ? "Đang tối ưu..." : "✨ Tối ưu thứ tự"}</span>
          </button>
        )}
        <button
          type="button"
          onClick={onSunsetAlign}
          className="inline-flex items-center gap-1.5 text-xs font-bold bg-[#fdf3dc] hover:bg-[#f9e7be] text-[#5c4018] border border-[#e3c383] px-3.5 py-2 rounded-full transition shadow-xs cursor-pointer"
        >
          🌅 Tự xếp giờ khớp Hoàng hôn ({goldenHourStart || "16:23"})
        </button>
        <button
          type="button"
          onClick={onPlanB}
          disabled={isApplyingPlanB}
          className="inline-flex items-center gap-1.5 text-xs font-bold bg-[#fdfbf7] hover:bg-[#f2ece1] text-[#3d2d24] border border-[#d6c7b2] px-3.5 py-2 rounded-full transition shadow-xs disabled:opacity-50 cursor-pointer"
        >
          🌧️ Đổi sang quán Trong nhà (Phòng mưa)
        </button>
      </div>

      {optimizerHint && (
        <div className="bg-[#fff8ee] border border-[#ebd3ad] rounded-xl px-3.5 py-2.5 text-xs text-[#61451d] leading-relaxed">
          <strong className="font-bold text-[#c84b31]">✨ Gợi ý nhịp hẹn: </strong>
          {optimizerHint}
        </div>
      )}

      {/* Drag & drop tip bar + Add Stop button */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#7d6856] px-1">
        <span className="flex items-center gap-1.5">
          <GripVertical className="w-3.5 h-3.5 text-[#b09b84] shrink-0" />
          <span>
            Mẹo: Giữ biểu tượng <b>⋮⋮</b> để kéo thả đổi thứ tự hoặc bấm <b>+15p / -15p</b> để
            chỉnh mốc giờ
          </span>
        </span>
        <button
          type="button"
          onClick={onOpenAddStop}
          className="inline-flex items-center gap-1 font-bold text-[#c84b31] hover:underline cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" /> Thêm chặng mới
        </button>
      </div>

      {/* Empty state: Drop zone + Dating Templates */}
      {stopsCount === 0 && (
        <div className="space-y-4 pt-1">
          <div
            onClick={onOpenAddStop}
            className="group relative border-2 border-dashed border-[#c84b31]/40 hover:border-[#c84b31] bg-[#fbf7f0] hover:bg-[#fff9f5] rounded-2xl p-6 sm:p-7 text-center transition-all cursor-pointer shadow-xs"
          >
            <div className="w-12 h-12 mx-auto rounded-2xl bg-[#f5e8d8] flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
              🎯
            </div>
            <h3 className="font-serif font-extrabold text-base sm:text-lg text-[#231915] mt-2.5">
              Vùng thả địa điểm vào lịch trình
            </h3>
            <p className="text-xs text-[#7d6856] max-w-md mx-auto mt-1 leading-relaxed">
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
                className="bg-[#c84b31] hover:bg-[#ad3b23] text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Thêm chặng đầu tiên
              </button>
            </div>
          </div>

          <div className="bg-[#f7f2ea] border border-[#dfd2c0] rounded-2xl p-4 sm:p-5 space-y-3">
            <div>
              <span className="text-[11px] font-bold text-[#c84b31] uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Timeline Builder
              </span>
              <h4 className="font-serif font-extrabold text-sm sm:text-base text-[#231915]">
                Hoặc bắt đầu nhanh với 3 kịch bản hẹn hò được yêu thích nhất:
              </h4>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {DATING_TEMPLATES.map((tpl) => (
                <div
                  key={tpl.id}
                  className="bg-white hover:bg-[#fffdfa] border border-[#e5d8c6] hover:border-[#c84b31]/60 rounded-xl p-3.5 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-lg">{tpl.icon}</span>
                      <span className="font-serif font-extrabold text-sm text-[#231915]">
                        {tpl.title}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#fdf3dc] text-[#785118] border border-[#e3c383]">
                        {tpl.badge}
                      </span>
                      <span className="text-[11px] text-[#7d6856] font-medium hidden sm:inline">
                        • {tpl.estimatedDuration}
                      </span>
                    </div>
                    <p className="text-xs text-[#6e5645]">{tpl.tagline}</p>
                    <div className="flex items-center gap-1.5 text-[11px] text-[#8c7765] pt-0.5 flex-wrap">
                      <span className="font-medium">Lộ trình:</span>
                      {tpl.stops.map((s, sIdx) => (
                        <React.Fragment key={s.name}>
                          <span className="font-semibold text-[#231915]">{s.name}</span>
                          {sIdx < tpl.stops.length - 1 && (
                            <span className="text-[#c84b31]">➔</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isApplyingTemplate}
                    onClick={() => onApplyTemplate(tpl)}
                    className="shrink-0 bg-[#fdf3dc] hover:bg-[#c84b31] text-[#785118] hover:text-white border border-[#e3c383] hover:border-[#c84b31] text-xs font-bold px-3.5 py-2 rounded-xl transition shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
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

