"use client";

import React, { useState } from "react";
import { Navigation, ChevronUp, ChevronDown, Trash2 } from "lucide-react";
import type { PlanDetailDto, PlanStopDto } from "@/server/services/user/plan.mapper";
import type { HanoiPlace } from "@/lib/types/catalog";
import { calculateHaversineDistanceKm } from "@/lib/travel-time";

/** Hệ số uốn lượn đường phố Hà Nội, cùng hệ số với lib/travel-time khi tính phút di chuyển. */
const ROAD_FACTOR = 1.35;

interface InteractiveTimelineProps {
  plan: PlanDetailDto;
  onRefresh: () => Promise<void>;
  /** Catalog để hiện tên/emoji/khoảng cách cho các trạm chỉ lưu placeId */
  places?: HanoiPlace[];
  onOpenDetail?: (slug: string) => void;
  onError?: (message: string) => void;
  /** Giờ bắt đầu giờ vàng hôm nay, hiện trên nút tự xếp lịch (vd "16:24") */
  goldenHourStart?: string;
  /** Hiện nút đổi thứ tự / xóa chặng (trang Kế hoạch); trang chủ chỉ chỉnh giờ */
  allowEditStops?: boolean;
}

function toMinutes(time: string | null): number | null {
  if (!time) return null;
  const [h, m] = time.split(":").map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
}

function formatMinutes(total: number): string {
  const normalized = ((total % 1440) + 1440) % 1440;
  return `${String(Math.floor(normalized / 60)).padStart(2, "0")}:${String(normalized % 60).padStart(2, "0")}`;
}

/** Lộ trình các chặng của một kế hoạch: tự xếp giờ, Plan B trời mưa, dời giờ dây chuyền ±15p, ghim giờ. */
export function InteractiveTimeline({
  plan,
  onRefresh,
  places = [],
  onOpenDetail,
  onError,
  goldenHourStart,
  allowEditStops = false,
}: InteractiveTimelineProps) {
  const [loadingStopId, setLoadingStopId] = useState<string | null>(null);
  const [isAutoScheduling, setIsAutoScheduling] = useState(false);
  const [isApplyingPlanB, setIsApplyingPlanB] = useState(false);
  const [conflictError, setConflictError] = useState<{ message: string; version: number } | null>(null);

  const findPlace = (stop: PlanStopDto) =>
    stop.placeId ? places.find((place) => place.id === stop.placeId) : undefined;

  // Đổi thứ tự trạm: gửi toàn bộ danh sách id theo thứ tự mới
  const handleMoveStop = async (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= plan.stops.length) return;
    const stopIds = plan.stops.map((s) => s.id);
    [stopIds[idx], stopIds[target]] = [stopIds[target], stopIds[idx]];
    try {
      setLoadingStopId(plan.stops[idx].id);
      const res = await fetch(`/api/v1/user/plans/${plan.id}/stops/reorder`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stopIds }),
      });
      if (!res.ok) throw new Error("Không thể đổi thứ tự chặng.");
      await onRefresh();
    } catch (err) {
      console.error(err);
      onError?.("Chưa đổi được thứ tự chặng, thử lại nhé.");
    } finally {
      setLoadingStopId(null);
    }
  };

  const handleDeleteStop = async (stopId: string) => {
    try {
      setLoadingStopId(stopId);
      const res = await fetch(`/api/v1/user/plans/${plan.id}/stops/${stopId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Không thể xóa chặng.");
      await onRefresh();
    } catch (err) {
      console.error(err);
      onError?.("Chưa xóa được chặng, thử lại nhé.");
    } finally {
      setLoadingStopId(null);
    }
  };

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
    <div className="font-sans">
      {/* Người ấy vừa sửa lịch trên máy khác (409) */}
      {conflictError && (
        <div className="mb-4 bg-[#FADCD2] border-2 border-brand-terracotta rounded-xl p-3 flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs text-paper-ink">
            <strong className="text-brand-terracottaDark block">🔔 Người thương vừa cập nhật lịch hẹn!</strong>
            <span>Bấm cập nhật để xem mốc giờ mới nhất mà người ấy vừa chỉnh nhé.</span>
          </div>
          <button
            type="button"
            onClick={async () => {
              setConflictError(null);
              await onRefresh();
            }}
            className="bg-brand-terracotta text-white text-xs font-bold px-3 py-1.5 rounded-lg shrink-0"
          >
            🔄 Cập nhật ngay
          </button>
        </div>
      )}

      {/* Thanh công cụ */}
      <div className="flex flex-wrap items-center gap-2 p-2 bg-[#FAF4E8] rounded-xl border border-[#E5D8C5] text-xs">
        <button
          type="button"
          onClick={handleAutoSchedule}
          disabled={isAutoScheduling}
          className="px-2.5 py-1.5 rounded-lg font-bold bg-[#F9EFC7] border border-[#D5BE7E] text-paper-ink hover:bg-[#F5E39E] transition disabled:opacity-50"
        >
          {isAutoScheduling
            ? "Đang xếp giờ..."
            : `🌅 Tự xếp giờ khớp Hoàng hôn${goldenHourStart ? ` (${goldenHourStart})` : ""}`}
        </button>
        <button
          type="button"
          onClick={handleApplyPlanB}
          disabled={isApplyingPlanB}
          className="px-2.5 py-1.5 rounded-lg font-bold bg-[#FFFDF9] border border-[#CBB292] text-paper-ink hover:border-brand-terracotta transition disabled:opacity-50"
        >
          {isApplyingPlanB ? "Đang đổi quán..." : "☔ Đổi sang quán Trong nhà (Phòng mưa)"}
        </button>
      </div>

      {/* Các chặng */}
      <div className="space-y-2.5 my-4">
        {plan.stops.map((stop, idx) => {
          const isLoading = loadingStopId === stop.id;
          const place = findPlace(stop);
          const stopName = stop.customName || place?.name || "Địa điểm hẹn hò";
          const start = toMinutes(stop.plannedTime);
          const prevPlace = idx > 0 ? findPlace(plan.stops[idx - 1]) : undefined;
          const roadKm =
            prevPlace?.lat != null && prevPlace?.lng != null && place?.lat != null && place?.lng != null
              ? calculateHaversineDistanceKm({ lat: prevPlace.lat, lng: prevPlace.lng }, { lat: place.lat, lng: place.lng }) *
                ROAD_FACTOR
              : null;

          return (
            <div
              key={stop.id}
              className="bg-[#FAF4E8] border border-[#D8CBB8] rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
            >
              <div className="space-y-0.5 min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="bg-brand-terracotta text-white text-[11px] font-extrabold px-2 py-0.5 rounded">
                    {start !== null ? `${formatMinutes(start)} - ${formatMinutes(start + stop.durationMin)}` : "Chưa xếp giờ"}
                  </span>
                  <strong
                    onClick={() => place && onOpenDetail?.(place.slug)}
                    className={`text-xs sm:text-sm font-bold text-paper-ink ${place && onOpenDetail ? "cursor-pointer hover:text-brand-terracotta" : ""}`}
                  >
                    {place?.emoji ? `${place.emoji} ` : ""}
                    {stopName}
                  </strong>
                  {stop.isPinnedTime && (
                    <span className="text-[10px] font-bold bg-[#F9EFC7] border border-[#D5BE7E] px-1.5 py-0.5 rounded">
                      📌 Cố định giờ
                    </span>
                  )}
                </div>
                {idx > 0 ? (
                  <p className="text-[11px] text-paper-muted">
                    🛵 Di chuyển từ chặng trước: <strong>~{stop.travelMinutes} phút</strong>
                    {roadKm !== null ? ` (${roadKm.toFixed(1)} km, đã tính 10p gửi xe)` : ""}
                  </p>
                ) : (
                  <p className="text-[11px] text-paper-muted">📍 Điểm hẹn mở đầu hành trình</p>
                )}
                {stop.note && <p className="text-[11px] text-paper-ink/80 italic">✍️ {stop.note}</p>}
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    place?.lat != null && place?.lng != null ? `${place.lat},${place.lng}` : `${stopName} Hà Nội`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-terracotta hover:underline"
                >
                  <Navigation className="w-3 h-3" />
                  Chỉ đường
                </a>
              </div>

              <div className="flex items-center gap-1 self-end sm:self-center shrink-0">
                <button
                  type="button"
                  onClick={() => handleRippleShift(stop.id, -15)}
                  disabled={isLoading}
                  className="px-2 py-1 rounded bg-[#FFFDF9] hover:bg-[#EFE5D4] border border-[#CBB292] text-[11px] font-bold disabled:opacity-40"
                  title="Lùi 15 phút và đẩy các chặng sau"
                >
                  -15p
                </button>
                <button
                  type="button"
                  onClick={() => handleRippleShift(stop.id, 15)}
                  disabled={isLoading}
                  className="px-2 py-1 rounded bg-[#FFFDF9] hover:bg-[#EFE5D4] border border-[#CBB292] text-[11px] font-bold disabled:opacity-40"
                  title="Tăng 15 phút và đẩy các chặng sau"
                >
                  +15p
                </button>
                <button
                  type="button"
                  onClick={() => handleTogglePin(stop)}
                  disabled={isLoading}
                  className={`px-2 py-1 rounded border border-[#CBB292] text-[11px] font-bold disabled:opacity-40 ${
                    stop.isPinnedTime ? "bg-brand-terracotta text-white" : "bg-[#FFFDF9] text-paper-muted"
                  }`}
                  title={stop.isPinnedTime ? "Bỏ ghim giờ" : "Ghim cố định mốc giờ"}
                >
                  📌
                </button>
                {allowEditStops && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleMoveStop(idx, -1)}
                      disabled={isLoading || idx === 0}
                      className="p-1 rounded bg-[#FFFDF9] border border-[#CBB292] disabled:opacity-30"
                      title="Đưa chặng lên trước"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveStop(idx, 1)}
                      disabled={isLoading || idx === plan.stops.length - 1}
                      className="p-1 rounded bg-[#FFFDF9] border border-[#CBB292] disabled:opacity-30"
                      title="Đưa chặng xuống sau"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteStop(stop.id)}
                      disabled={isLoading}
                      className="p-1 rounded bg-[#FFFDF9] border border-[#CBB292] text-red-600 disabled:opacity-30"
                      title="Xóa chặng"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
