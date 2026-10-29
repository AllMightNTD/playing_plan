"use client";

import React, { useState, useEffect, useCallback } from "react";
import { QuotaGaugeCard } from "./QuotaGaugeCard";
import { DailySampleGrader } from "./DailySampleGrader";
import { LiveEventsFeed } from "./LiveEventsFeed";
import { BatchRollbackDialog } from "./BatchRollbackDialog";
import { PublishPauseControl, type PublishPauseStateData } from "./PublishPauseControl";
import {
  Radio,
  MapPin,
  Video,
  CheckCircle2,
  AlertOctagon,
  RefreshCw,
  Sparkles,
} from "lucide-react";

interface PipelineStatsData {
  quota: {
    used: number;
    max: number;
    isHalted: boolean;
    quotaDate: string;
  };
  places: {
    totalPublished: number;
    tierACount: number;
    tierBCount: number;
    autoPromotedCount: number;
  };
  videos: {
    autoLinkedCount: number;
    pendingReviewCount: number;
  };
  rolling7DayAccuracy: number | null;
  gradedSampleCount: number;
  autoPause: boolean;
  pause: PublishPauseStateData;
}

export default function PipelineRadarPage() {
  const [stats, setStats] = useState<PipelineStatsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/admin/pipeline/stats");
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setStats(json.data);
        }
      }
    } catch (err) {
      console.error("Lỗi lấy stats radar:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-peach-50 text-peach-600 flex items-center justify-center font-bold">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900">Radar Tự Động (Pipeline Ingestion)</h1>
              {stats?.autoPause ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                  <AlertOctagon className="w-3.5 h-3.5" /> Phanh Khẩn Cấp Đang Bật
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Tự động hóa sẵn sàng
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Chấm mẫu hằng ngày; accuracy 7 ngày dưới 85% (tối thiểu 10 mẫu) sẽ tự bật phanh publish
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchStats}
            className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Làm mới</span>
          </button>
          <BatchRollbackDialog onRollbackSuccess={fetchStats} />
        </div>
      </div>

      <PublishPauseControl pause={stats?.pause ?? null} onChanged={fetchStats} />

      {/* Grid thống kê KPI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: YouTube API Quota Gauge */}
        <QuotaGaugeCard
          used={stats?.quota.used ?? 0}
          max={stats?.quota.max ?? 8000}
          isHalted={stats?.quota.isHalted ?? false}
          quotaDate={stats?.quota.quotaDate ?? ""}
        />

        {/* Card 2: Rolling 7-day Accuracy */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Độ Chính Xác Rolling 7 Ngày
              </span>
              <Sparkles className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900">
                {stats?.rolling7DayAccuracy != null ? `${stats.rolling7DayAccuracy}%` : "—"}
              </span>
              <span className="text-xs font-medium text-slate-500">
                {stats ? `${stats.gradedSampleCount} mẫu • ` : ""}Mục tiêu: ≥ 85%
              </span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Tự ngắt nếu rớt dưới:</span>
            <span className="font-semibold text-rose-600">85.0%</span>
          </div>
        </div>

        {/* Card 3: Thống kê địa điểm & video */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
              Dòng Dữ Liệu Tự Động
            </span>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 bg-blue-50/60 rounded-lg border border-blue-100">
                <div className="flex items-center gap-1.5 text-xs text-blue-700 font-medium mb-1">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Quán đã xuất bản</span>
                </div>
                <span className="text-lg font-bold text-blue-900">
                  {stats?.places.totalPublished ?? 0}
                </span>
                <span className="text-[10px] text-blue-600 block">
                  ({stats?.places.tierACount ?? 0} Bậc A, {stats?.places.tierBCount ?? 0} Bậc B)
                </span>
              </div>

              <div className="p-2.5 bg-rose-50/60 rounded-lg border border-rose-100">
                <div className="flex items-center gap-1.5 text-xs text-rose-700 font-medium mb-1">
                  <Video className="w-3.5 h-3.5" />
                  <span>Video tự khớp</span>
                </div>
                <span className="text-lg font-bold text-rose-900">
                  {stats?.videos.autoLinkedCount ?? 0}
                </span>
                <span className="text-[10px] text-rose-600 block">
                  ({stats?.videos.pendingReviewCount ?? 0} chờ duyệt)
                </span>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2 text-[11px] text-slate-400">
            Tự động đồng bộ từ OpenStreetMap & YouTube API
          </div>
        </div>
      </div>

      {/* Hàng 2: Daily Sample Grader (3-minute swipe) và Live Events Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <DailySampleGrader onGradedComplete={() => fetchStats()} />
        </div>
        <div>
          <LiveEventsFeed />
        </div>
      </div>
    </div>
  );
}
