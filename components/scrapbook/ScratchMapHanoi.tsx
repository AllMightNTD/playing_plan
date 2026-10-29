"use client";

import React, { useState, useEffect, useCallback } from "react";
import type { ScratchMapDto } from "@/server/services/user/gamification.service";
import { HANOI_7_DISTRICTS } from "@/lib/districts";

interface ScratchMapHanoiProps {
  onToast?: (message: string, type?: "success" | "error" | "info") => void;
  refreshTrigger?: number;
}

export function ScratchMapHanoi({ onToast, refreshTrigger = 0 }: ScratchMapHanoiProps) {
  const [scratchMap, setScratchMap] = useState<ScratchMapDto | null>(null);

  const toast = useCallback(
    (msg: string, type: "success" | "error" | "info" = "info") => {
      if (onToast) onToast(msg, type);
    },
    [onToast]
  );

  const fetchScratchMap = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/user/gamification/scratch-map");
      if (res.ok) {
        const json = (await res.json()) as { data: ScratchMapDto };
        setScratchMap(json.data);
      }
    } catch {
      // Ignored
    }
  }, []);

  useEffect(() => {
    fetchScratchMap();
  }, [fetchScratchMap, refreshTrigger]);

  // Ô chỉ được cào khi phòng đã check-in tại quận đó; trạng thái lấy từ server (place_checkins)
  const handleScratchTile = (districtName: string, scratched: boolean) => {
    if (!scratched) {
      toast(`🪙 Check-in tại một địa điểm ở ${districtName} để cào mở ô này nhé!`, "info");
    }
  };

  const districts =
    scratchMap?.districts ?? HANOI_7_DISTRICTS.map((d) => ({ key: d.key, name: d.name, count: 0, scratched: false }));
  const scratchedCount = districts.filter((d) => d.scratched).length;
  const pct = Math.round((scratchedCount / districts.length) * 100);

  return (
    <div className="bg-[#FFFDF9] border-2 border-[#D8C7B0] rounded-2xl p-5 shadow-sm flex flex-col justify-between space-y-4">
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-brand-olive text-white">
            🗺️ Bản Đồ Kỷ Niệm
          </span>
          <span id="scratchPercentBadge" className="text-xs font-extrabold text-brand-terracotta">
            Đã mở: {pct}% ({scratchedCount}/{districts.length} quận)
          </span>
        </div>

        <h3 className="font-serif font-extrabold text-base text-paper-ink">
          Chinh Phục 7 Quận Hà Nội
        </h3>
        <p className="text-xs text-paper-muted mt-0.5">
          Mỗi lần hai bạn check-in tại một quận, ô nhũ bạc của quận đó sẽ được cào mở:
        </p>

        {/* Lưới 7 quận cào */}
        <div id="scratchDistrictsGrid" className="grid grid-cols-2 gap-2 my-4">
          {districts.map((d) => {
            const isScratched = d.scratched;
            return (
              <button
                key={d.key}
                type="button"
                onClick={() => handleScratchTile(d.name, isScratched)}
                className={`p-2.5 rounded-xl border text-left transition ${
                  isScratched
                    ? "bg-[#FAF4E8] border-brand-olive text-paper-ink shadow-xs"
                    : "bg-gradient-to-br from-stone-300 via-stone-400 to-stone-300 border-stone-500 text-stone-800 hover:brightness-105"
                }`}
              >
                <div className="flex items-center justify-between text-xs font-extrabold">
                  <span>{d.name}</span>
                  <span>{isScratched ? "✅" : "🪙"}</span>
                </div>
                <span className="text-[10px] block mt-0.5">
                  {isScratched
                    ? `Check-in: ${d.count}`
                    : "Check-in để cào lớp nhũ bạc"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Thanh tiến độ cào 7 quận */}
      <div className="pt-2">
        <div className="w-full bg-[#EFE5D4] h-2.5 rounded-full overflow-hidden">
          <div
            id="scratchProgressBar"
            className="bg-brand-olive h-full transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
