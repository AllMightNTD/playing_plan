"use client";

import React, { useState } from "react";
import { PauseCircle, PlayCircle } from "lucide-react";
import { adminFetch } from "../_shared/admin-fetch";

export interface PublishPauseStateData {
  isPaused: boolean;
  source: "env" | "breaker" | "admin" | null;
  reason: string | null;
  updatedBy: string | null;
  updatedAt: string | null;
}

const SOURCE_LABEL: Record<NonNullable<PublishPauseStateData["source"]>, string> = {
  env: "biến môi trường EMERGENCY_HALT_PUBLISH",
  breaker: "circuit breaker (accuracy < 85%)",
  admin: "admin bật tay",
};

interface PublishPauseControlProps {
  pause: PublishPauseStateData | null;
  onChanged: () => void;
}

/** Hiện trạng thái phanh publish lưu trong DB và cho admin bật/gỡ kèm lý do (ghi audit log). */
export function PublishPauseControl({ pause, onChanged }: PublishPauseControlProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [reason, setReason] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!pause) return null;
  const nextPaused = !pause.isPaused;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    const result = await adminFetch<PublishPauseStateData>("/api/v1/admin/pipeline/pause", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPaused: nextPaused, reason: reason.trim() }),
    });
    setIsSaving(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setIsEditing(false);
    setReason("");
    onChanged();
  };

  return (
    <div
      className={`rounded-xl border p-4 text-xs space-y-2 ${
        pause.isPaused ? "bg-rose-50 border-rose-200 text-rose-900" : "bg-emerald-50 border-emerald-200 text-emerald-900"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-0.5">
          <p className="font-bold flex items-center gap-1.5">
            {pause.isPaused ? <PauseCircle className="w-4 h-4" /> : <PlayCircle className="w-4 h-4" />}
            {pause.isPaused ? "Phanh publish đang bật: pipeline không thăng hạng, không tự xuất bản video" : "Pipeline được phép publish"}
          </p>
          {pause.isPaused && pause.source && <p>Nguồn: {SOURCE_LABEL[pause.source]}</p>}
          {pause.reason && <p>Lý do: {pause.reason}</p>}
          {pause.updatedBy && pause.updatedAt && (
            <p className="opacity-70">
              Cập nhật bởi {pause.updatedBy} lúc {new Date(pause.updatedAt).toLocaleString("vi-VN")}
            </p>
          )}
        </div>
        {pause.source !== "env" && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className={`px-3 py-1.5 rounded-lg font-semibold text-white ${
              pause.isPaused ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
            }`}
          >
            {pause.isPaused ? "Gỡ phanh" : "Bật phanh"}
          </button>
        )}
      </div>

      {isEditing && (
        <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 pt-1">
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            minLength={3}
            maxLength={500}
            required
            placeholder={nextPaused ? "Lý do bật phanh..." : "Đã kiểm tra gì trước khi gỡ phanh..."}
            className="flex-1 min-w-[200px] px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800"
          />
          <button
            type="submit"
            disabled={isSaving || reason.trim().length < 3}
            className="px-3 py-1.5 rounded-lg bg-slate-900 text-white font-semibold disabled:opacity-50"
          >
            {isSaving ? "Đang lưu..." : "Xác nhận"}
          </button>
          <button type="button" onClick={() => setIsEditing(false)} className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white">
            Hủy
          </button>
        </form>
      )}
      {error && <p className="font-semibold text-rose-700">{error}</p>}
    </div>
  );
}
