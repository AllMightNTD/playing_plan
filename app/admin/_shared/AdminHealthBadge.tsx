"use client";

import React, { useCallback, useEffect, useState } from "react";
import { adminFetch, isAdminAuthFailure } from "./admin-fetch";
import type { AdminHealthDto, HealthLevel } from "@/server/services/admin/admin-health.service";

const POLL_MS = 60_000;

const LEVEL_STYLE: Record<HealthLevel | "unknown", { box: string; dot: string; label: string }> = {
  ok: { box: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500", label: "Hệ thống ổn định" },
  degraded: { box: "bg-amber-50 text-amber-800 border-amber-200", dot: "bg-amber-500", label: "Cần chú ý" },
  down: { box: "bg-rose-50 text-rose-700 border-rose-200", dot: "bg-rose-500", label: "Sự cố" },
  unknown: { box: "bg-slate-50 text-slate-600 border-slate-200", dot: "bg-slate-400", label: "Đang kiểm tra..." },
};

/** Badge sức khỏe hệ thống trên header admin, lấy từ /api/v1/admin/health mỗi 60 giây. */
export function AdminHealthBadge() {
  const [health, setHealth] = useState<AdminHealthDto | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const load = useCallback(async () => {
    const result = await adminFetch<AdminHealthDto>("/api/v1/admin/health");
    if (result.ok) {
      setHealth(result.data);
      setFailure(null);
    } else {
      setFailure(isAdminAuthFailure(result) ? "Chưa đăng nhập admin" : `Không kiểm tra được: ${result.message}`);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  const style = LEVEL_STYLE[failure ? "unknown" : (health?.level ?? "unknown")];
  const problems = health?.checks.filter((c) => c.level !== "ok") ?? [];
  const label = failure ?? (problems.length > 0 ? `${style.label}: ${problems[0].message}` : style.label);
  const title = health ? health.checks.map((c) => `• ${c.message}`).join("\n") : undefined;

  return (
    <div
      title={title}
      className={`flex items-center gap-2 text-xs px-3 py-1 rounded-full border font-medium max-w-[60vw] ${style.box}`}
    >
      <span className={`w-2 h-2 rounded-full shrink-0 ${style.dot} ${health?.level === "ok" ? "animate-pulse" : ""}`} />
      <span className="truncate">{label}</span>
    </div>
  );
}
