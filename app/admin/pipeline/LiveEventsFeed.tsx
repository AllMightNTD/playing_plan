"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Radio, RefreshCw, CheckCircle, Clock, AlertCircle } from "lucide-react";

interface PipelineEvent {
  id: string;
  type: string;
  title: string;
  status: string;
  createdAt: string;
  details?: Record<string, unknown>;
}

export function LiveEventsFeed() {
  const [events, setEvents] = useState<PipelineEvent[]>([]);
  const [isLivePolling, setIsLivePolling] = useState(true);
  const [isDormant, setIsDormant] = useState(false);
  const [loading, setLoading] = useState(true);

  const lastActivityRef = useRef<number>(Date.now());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/admin/pipeline/events");
      if (res.ok) {
        const json = await res.json();
        if (json.data && Array.isArray(json.data)) {
          setEvents(json.data);
        }
      }
    } catch (err) {
      console.error("Lỗi lấy sự kiện pipeline:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Lắng nghe tương tác người dùng để phát hiện nhàn rỗi (idle > 5 phút)
  useEffect(() => {
    const handleUserActivity = () => {
      lastActivityRef.current = Date.now();
      if (isDormant) {
        setIsDormant(false);
      }
    };

    window.addEventListener("mousemove", handleUserActivity);
    window.addEventListener("keydown", handleUserActivity);
    window.addEventListener("click", handleUserActivity);

    return () => {
      window.removeEventListener("mousemove", handleUserActivity);
      window.removeEventListener("keydown", handleUserActivity);
      window.removeEventListener("click", handleUserActivity);
    };
  }, [isDormant]);

  // Vòng lặp Polling 10s có cơ chế ngủ đông (Dormancy)
  useEffect(() => {
    fetchEvents();

    const interval = setInterval(() => {
      if (!isLivePolling) return;

      // 1. Kiểm tra tab bị ẩn
      if (document.visibilityState === "hidden") {
        setIsDormant(true);
        return;
      }

      // 2. Kiểm tra không tương tác > 5 phút (300.000 ms)
      if (Date.now() - lastActivityRef.current > 300000) {
        setIsDormant(true);
        return;
      }

      setIsDormant(false);
      fetchEvents();
    }, 10000);

    timerRef.current = interval;
    return () => clearInterval(interval);
  }, [isLivePolling, fetchEvents]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Radio className="w-5 h-5 text-peach-600" />
            {isLivePolling && !isDormant && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
            )}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Dòng Sự Kiện Tự Động (Live Feed)</h3>
            <p className="text-xs text-slate-500">
              {isDormant
                ? "Tạm dừng (ngủ đông tiết kiệm tài nguyên khi không thao tác)"
                : "Polling 10s thông minh"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-slate-600">
            <input
              type="checkbox"
              checked={isLivePolling}
              onChange={(e) => setIsLivePolling(e.target.checked)}
              className="rounded text-peach-600 focus:ring-peach-500 w-3.5 h-3.5"
            />
            <span>Tự động cập nhật</span>
          </label>

          <button
            onClick={fetchEvents}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
            title="Làm mới ngay"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
        {events.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400">Chưa có sự kiện nào trong hệ thống</div>
        ) : (
          events.map((ev) => {
            let statusBadge = "bg-slate-100 text-slate-600";
            let StatusIcon = Clock;

            if (ev.status === "success") {
              statusBadge = "bg-emerald-50 text-emerald-700 border-emerald-200";
              StatusIcon = CheckCircle;
            } else if (ev.status === "failed") {
              statusBadge = "bg-rose-50 text-rose-700 border-rose-200";
              StatusIcon = AlertCircle;
            } else if (ev.status === "paused") {
              statusBadge = "bg-amber-50 text-amber-700 border-amber-200";
              StatusIcon = AlertCircle;
            }

            return (
              <div
                key={ev.id}
                className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-lg border border-slate-200/60 transition-colors flex items-start justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-slate-200/70 text-slate-700 font-semibold uppercase">
                      {ev.type}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {new Date(ev.createdAt).toLocaleTimeString("vi-VN")}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-slate-800 truncate">{ev.title}</p>
                </div>

                <span
                  className={`text-[10px] px-2 py-0.5 rounded border font-medium flex items-center gap-1 shrink-0 ${statusBadge}`}
                >
                  <StatusIcon className="w-3 h-3" />
                  {ev.status}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
