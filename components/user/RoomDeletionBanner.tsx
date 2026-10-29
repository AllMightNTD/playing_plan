"use client";

import React, { useState } from "react";
import { useApp } from "@/context/AppContext";
import { SOFT_DELETE_RETENTION_MS } from "@/lib/constants/user";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Banner khi phòng đang chờ giải tán: tải kỷ niệm (.zip) hoặc giữ lại phòng trong 14 ngày. */
export function RoomDeletionBanner() {
  const { roomProfile, refreshRoomProfile, refetchHomeSummary, addToast } = useApp();
  const [isRestoring, setIsRestoring] = useState(false);

  const pendingDeletedAt = roomProfile?.room.pendingDeletedAt;
  if (!pendingDeletedAt) return null;

  const purgeAt = new Date(pendingDeletedAt).getTime() + SOFT_DELETE_RETENTION_MS;
  const daysLeft = Math.max(0, Math.ceil((purgeAt - Date.now()) / DAY_MS));

  const handleRestore = async () => {
    setIsRestoring(true);
    try {
      const res = await fetch("/api/v1/user/rooms/restore", { method: "POST" });
      if (!res.ok) throw new Error(`restore ${res.status}`);
      addToast("↺ Đã giữ lại phòng đôi, mọi kỷ niệm vẫn còn nguyên!", "success");
      await Promise.all([refreshRoomProfile(), refetchHomeSummary()]);
    } catch {
      addToast("Chưa giữ lại được phòng, thử lại nhé.", "error");
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="bg-[#8F2D19] text-white px-4 py-2.5 text-xs">
      <div className="max-w-[1140px] mx-auto flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-base">⚠️</span>
          <span>
            <strong>Phòng đang chờ giải tán (Còn {daysLeft} ngày):</strong> Bạn có thể tải kỷ niệm về máy hoặc hủy yêu cầu
            bất cứ lúc nào.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <a href="/api/v1/user/rooms/archive" download className="bg-white/20 hover:bg-white/30 px-2.5 py-1 rounded font-bold">
            📦 Tải kỷ niệm (.zip)
          </a>
          <button
            type="button"
            onClick={handleRestore}
            disabled={isRestoring}
            className="bg-[#F9EFC7] text-paper-ink px-3 py-1 rounded font-extrabold disabled:opacity-50"
          >
            {isRestoring ? "Đang giữ lại..." : "↺ Giữ lại phòng"}
          </button>
        </div>
      </div>
    </div>
  );
}
