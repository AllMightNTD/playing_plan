"use client";

import React from "react";
import { Zap, AlertTriangle, ShieldCheck } from "lucide-react";

interface QuotaGaugeProps {
  used: number;
  max: number;
  isHalted: boolean;
  quotaDate: string;
}

export function QuotaGaugeCard({ used, max, isHalted, quotaDate }: QuotaGaugeProps) {
  const percentage = Math.min(100, Math.round((used / max) * 100));

  let colorClass = "bg-emerald-500";
  let statusText = "An toàn";
  let badgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200";

  if (used >= 8000 || isHalted) {
    colorClass = "bg-rose-500";
    statusText = "Đã chạm trần an toàn (Phanh khẩn cấp)";
    badgeClass = "bg-rose-50 text-rose-700 border-rose-200";
  } else if (used >= 6000) {
    colorClass = "bg-amber-500";
    statusText = "Cảnh báo vượt 75%";
    badgeClass = "bg-amber-50 text-amber-700 border-amber-200";
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800">YouTube API Quota Hằng Ngày</h3>
            <p className="text-xs text-slate-500">Múi giờ Pacific Time (PT) • Ngày: {quotaDate}</p>
          </div>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full border font-medium flex items-center gap-1.5 ${badgeClass}`}>
          {used >= 8000 ? <AlertTriangle className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
          {statusText}
        </span>
      </div>

      <div className="mt-4">
        <div className="flex justify-between items-baseline mb-1">
          <span className="text-2xl font-bold text-slate-900">
            {used.toLocaleString()} <span className="text-sm font-normal text-slate-500">/ {max.toLocaleString()} units</span>
          </span>
          <span className="text-sm font-semibold text-slate-700">{percentage}%</span>
        </div>

        {/* Thanh tiến trình màu thông minh */}
        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 rounded-full ${colorClass}`}
            style={{ width: `${percentage}%` }}
          />
        </div>

        <div className="flex justify-between text-[11px] text-slate-400 mt-2">
          <span>0 units</span>
          <span>Cảnh báo: 6,000 (Vàng)</span>
          <span>Trần tự ngắt: 8,000 (Đỏ)</span>
        </div>
      </div>
    </div>
  );
}
