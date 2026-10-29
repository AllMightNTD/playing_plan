"use client";

import React, { useState } from "react";
import {
  Clock,
  Pin,
  PinOff,
  Plus,
  Minus,
  Sparkles,
  CloudRain,
  Share2,
  ListChecks,
  AlertTriangle,
  RotateCw,
  Navigation,
} from "lucide-react";
import type { PlanDetailDto, PlanStopDto } from "@/server/services/user/plan.mapper";

interface InteractiveTimelineProps {
  plan: PlanDetailDto;
  onRefresh: () => Promise<void>;
  onOpenChecklist?: () => void;
  onOpenShareModal?: () => void;
}

export function InteractiveTimeline({
  plan,
  onRefresh,
  onOpenChecklist,
  onOpenShareModal,
}: InteractiveTimelineProps) {
  const [loadingStopId, setLoadingStopId] = useState<string | null>(null);
  const [isAutoScheduling, setIsAutoScheduling] = useState(false);
  const [isApplyingPlanB, setIsApplyingPlanB] = useState(false);
  const [conflictError, setConflictError] = useState<{ message: string; version: number } | null>(null);
  const [isRushHourSpeed, setIsRushHourSpeed] = useState(false);

  // Kéo giờ dây chuyền (Auto-Ripple ±15p)
  const handleRippleShift = async (stopId: string, shiftMinutes: number) => {
    try {
      setLoadingStopId(stopId);
      setConflictError(null);

      const res = await fetch(`/api/v1/user/plans/${plan.id}/ripple-shift`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stopId,
          shiftMinutes,
          expectedVersion: plan.version ?? 1,
        }),
      });

      if (res.status === 409) {
        setConflictError({
          message: "Người ấy vừa cập nhật lịch trình trên thiết bị khác!",
          version: (plan.version ?? 1) + 1,
        });
        return;
      }

      if (!res.ok) {
        throw new Error("Không thể dịch chuyển thời gian chặng.");
      }

      await onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStopId(null);
    }
  };

  // Ghim / Thả giờ chặng (Pin toggle)
  const handleTogglePin = async (stop: PlanStopDto) => {
    try {
      setLoadingStopId(stop.id);
      const res = await fetch(`/api/v1/user/plans/${plan.id}/stops/${stop.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isPinnedTime: !stop.isPinnedTime,
        }),
      });

      if (!res.ok) throw new Error("Không thể cập nhật trạng thái ghim giờ.");
      await onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStopId(null);
    }
  };

  // Xếp lịch SunCalc tự động
  const handleAutoSchedule = async () => {
    try {
      setIsAutoScheduling(true);
      setConflictError(null);
      const res = await fetch(`/api/v1/user/plans/${plan.id}/auto-schedule`, {
        method: "POST",
      });
      if (res.status === 409) {
        setConflictError({
          message: "Kế hoạch vừa có thay đổi từ thiết bị khác!",
          version: (plan.version ?? 1) + 1,
        });
        return;
      }
      await onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setIsAutoScheduling(false);
    }
  };

  // Hoán đổi Plan B trong nhà
  const handleApplyPlanB = async () => {
    try {
      setIsApplyingPlanB(true);
      setConflictError(null);
      const res = await fetch(`/api/v1/user/plans/${plan.id}/plan-b`, {
        method: "POST",
      });
      if (res.status === 409) {
        setConflictError({
          message: "Kế hoạch vừa có thay đổi từ thiết bị khác!",
          version: (plan.version ?? 1) + 1,
        });
        return;
      }
      await onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setIsApplyingPlanB(false);
    }
  };

  return (
    <div className="w-full bg-[#FFFDF9] border border-[#E6D3B8] rounded-2xl p-5 shadow-sm font-sans">
      {/* Banner cảnh báo xung đột 409 CONFLICT */}
      {conflictError && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-300 rounded-xl flex items-center justify-between text-amber-900 text-sm animate-pulse">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{conflictError.message}</span>
          </div>
          <button
            onClick={async () => {
              setConflictError(null);
              await onRefresh();
            }}
            className="flex items-center gap-1 px-3 py-1 bg-amber-600 text-white text-xs font-semibold rounded-lg hover:bg-amber-700 transition"
          >
            <RotateCw className="w-3 h-3" />
            Tải bản mới nhất
          </button>
        </div>
      )}

      {/* Header lịch trình */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E6D3B8]/60 pb-4 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-serif font-bold text-[#362721]">{plan.title}</h3>
            <span className="text-xs bg-[#E6D3B8]/50 text-[#362721] font-mono px-2 py-0.5 rounded-full">
              v{plan.version ?? 1}
            </span>
          </div>
          <p className="text-xs text-[#362721]/70 mt-1">
            Ngày {plan.planDate} • Bắt đầu {plan.startTime} • Tổng {(plan.stops.reduce((acc, s) => acc + s.durationMin + (s.travelMinutes ?? 0), 0) / 60).toFixed(1)}h
          </p>
        </div>

        {/* Nút hành động nhanh */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Nút chuyển đổi vận tốc */}
          <button
            type="button"
            onClick={() => setIsRushHourSpeed(!isRushHourSpeed)}
            title="Chuyển đổi vận tốc tính thời gian di chuyển nội đô Hà Nội"
            className={`flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-xl font-medium border transition ${
              isRushHourSpeed
                ? "bg-red-50 text-red-700 border-red-300"
                : "bg-emerald-50 text-emerald-700 border-emerald-300"
            }`}
          >
            <Navigation className="w-3 h-3" />
            {isRushHourSpeed ? "Cao điểm (15km/h)" : "Giờ thường (25km/h)"}
          </button>

          {/* Nút Xếp lịch SunCalc */}
          <button
            type="button"
            onClick={handleAutoSchedule}
            disabled={isAutoScheduling}
            className="flex items-center gap-1 px-3 py-1.5 bg-[#C84B31]/10 text-[#C84B31] border border-[#C84B31]/30 rounded-xl text-xs font-semibold hover:bg-[#C84B31] hover:text-white transition disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {isAutoScheduling ? "Đang tính..." : "SunCalc Hoàng Hôn"}
          </button>

          {/* Nút Plan B Trời Mưa */}
          <button
            type="button"
            onClick={handleApplyPlanB}
            disabled={isApplyingPlanB}
            className="flex items-center gap-1 px-3 py-1.5 bg-sky-50 text-sky-700 border border-sky-300 rounded-xl text-xs font-semibold hover:bg-sky-600 hover:text-white transition disabled:opacity-50"
          >
            <CloudRain className="w-3.5 h-3.5" />
            {isApplyingPlanB ? "Đang đổi..." : "Plan B (Mưa)"}
          </button>

          {/* Nút Checklist */}
          {onOpenChecklist && (
            <button
              type="button"
              onClick={onOpenChecklist}
              className="flex items-center gap-1 px-3 py-1.5 bg-[#F7F1E5] text-[#362721] border border-[#E6D3B8] rounded-xl text-xs font-semibold hover:bg-[#E6D3B8] transition"
            >
              <ListChecks className="w-3.5 h-3.5" />
              Chuẩn bị ({plan.checklist.filter((i) => i.isDone).length}/{plan.checklist.length})
            </button>
          )}

          {/* Nút Xuất Thiệp / Poster */}
          {onOpenShareModal && (
            <button
              type="button"
              onClick={onOpenShareModal}
              className="flex items-center gap-1 px-3 py-1.5 bg-[#C84B31] text-white rounded-xl text-xs font-semibold hover:bg-[#9E331E] shadow-sm transition"
            >
              <Share2 className="w-3.5 h-3.5" />
              Thiệp & Poster
            </button>
          )}
        </div>
      </div>

      {/* Danh sách chặng Timeline dạng Scrapbook */}
      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-[#E6D3B8]">
        {plan.stops.map((stop, idx) => {
          const isLoading = loadingStopId === stop.id;

          return (
            <div key={stop.id} className="relative group">
              {/* Vòng tròn mốc số chặng */}
              <div
                className={`absolute -left-6 top-1.5 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 transition ${
                  stop.isPinnedTime
                    ? "bg-[#C84B31] text-white border-[#C84B31]"
                    : "bg-[#FFFDF9] text-[#362721] border-[#C84B31]"
                }`}
              >
                {idx + 1}
              </div>

              {/* Thẻ chặng */}
              <div className="bg-[#F7F1E5]/50 border border-[#E6D3B8] rounded-xl p-3.5 hover:bg-[#F7F1E5] transition">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-[#C84B31] flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-[#C84B31]" />
                      {stop.plannedTime || "Chưa set"}
                    </span>
                    <span className="text-xs text-[#362721]/50">({stop.durationMin} phút)</span>

                    {/* Huy hiệu đã ghim */}
                    {stop.isPinnedTime && (
                      <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-medium flex items-center gap-0.5">
                        <Pin className="w-2.5 h-2.5" /> Giờ cố định
                      </span>
                    )}
                  </div>

                  {/* Nút điều khiển Auto-Ripple (±15p) & Ghim giờ */}
                  <div className="flex items-center gap-1.5">
                    {/* Nút lùi 15 phút */}
                    <button
                      type="button"
                      onClick={() => handleRippleShift(stop.id, -15)}
                      disabled={isLoading}
                      title="Lùi 15 phút và đẩy các chặng sau"
                      className="p-1 rounded bg-[#FFFDF9] border border-[#E6D3B8] text-[#362721] hover:bg-[#E6D3B8] text-xs transition disabled:opacity-50"
                    >
                      <Minus className="w-3 h-3" />
                    </button>

                    <span className="text-[11px] font-mono font-medium text-[#362721]/70 px-1">
                      ±15p
                    </span>

                    {/* Nút tăng 15 phút */}
                    <button
                      type="button"
                      onClick={() => handleRippleShift(stop.id, 15)}
                      disabled={isLoading}
                      title="Tiến 15 phút và đẩy các chặng sau"
                      className="p-1 rounded bg-[#FFFDF9] border border-[#E6D3B8] text-[#362721] hover:bg-[#E6D3B8] text-xs transition disabled:opacity-50"
                    >
                      <Plus className="w-3 h-3" />
                    </button>

                    {/* Nút Ghim/Thả giờ */}
                    <button
                      type="button"
                      onClick={() => handleTogglePin(stop)}
                      disabled={isLoading}
                      title={stop.isPinnedTime ? "Thả trôi giờ dây chuyền" : "Ghim giờ cố định không bị đẩy"}
                      className={`p-1 rounded border text-xs transition ${
                        stop.isPinnedTime
                          ? "bg-[#C84B31] text-white border-[#C84B31]"
                          : "bg-[#FFFDF9] text-[#362721]/70 border-[#E6D3B8] hover:bg-[#E6D3B8]"
                      }`}
                    >
                      {stop.isPinnedTime ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
                    </button>
                  </div>
                </div>

                {/* Tên địa điểm & ghi chú */}
                <h4 className="text-base font-semibold text-[#362721] mt-1.5">
                  {stop.customName || "Địa điểm hẹn hò"}
                </h4>

                {stop.note && (
                  <p className="text-xs text-[#362721]/80 mt-1 italic font-hand text-sm bg-white/60 p-1.5 rounded border border-[#E6D3B8]/40">
                    ✍️ {stop.note}
                  </p>
                )}

                {/* Thông tin di chuyển tới chặng sau */}
                {idx < plan.stops.length - 1 && (
                  <div className="mt-2 pt-1.5 border-t border-dashed border-[#E6D3B8]/60 flex items-center gap-1.5 text-[11px] text-[#362721]/60">
                    <Navigation className="w-3 h-3 text-[#C84B31]" />
                    <span>
                      Di chuyển tới chặng {idx + 2}: ~{stop.travelMinutes ?? 15} phút ({isRushHourSpeed ? "15 km/h + 10p gửi xe" : "25 km/h + 10p gửi xe"})
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
