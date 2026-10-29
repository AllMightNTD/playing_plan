"use client";

import React, { useState, useEffect, useCallback } from "react";
import type { ScratchMapDto } from "@/server/services/user/gamification.service";

interface ScratchMapHanoiProps {
  onToast?: (message: string, type?: "success" | "error" | "info") => void;
  refreshTrigger?: number;
}

export function ScratchMapHanoi({ onToast, refreshTrigger = 0 }: ScratchMapHanoiProps) {
  const [scratchMap, setScratchMap] = useState<ScratchMapDto | null>(null);
  const [localScratched, setLocalScratched] = useState<Record<string, boolean>>({});

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

  const handleScratchTile = (districtKey: string, districtName: string) => {
    setLocalScratched((prev) => {
      const nextState = !prev[districtKey];
      if (nextState) {
        toast(`🪙 Đã cào mở khóa ${districtName} trên Bản đồ Hà Nội!`, "success");
      }
      return { ...prev, [districtKey]: nextState };
    });
  };

  const districts = scratchMap?.districts || [
    { key: "tay_ho", name: "Tây Hồ", count: 0, scratched: false },
    { key: "hoan_kiem", name: "Hoàn Kiếm", count: 0, scratched: false },
    { key: "ba_dinh", name: "Ba Đình", count: 0, scratched: false },
    { key: "dong_da", name: "Đống Đa", count: 0, scratched: false },
    { key: "thanh_xuan", name: "Thanh Xuân", count: 0, scratched: false },
    { key: "hai_ba_trung", name: "Hai Bà Trưng", count: 0, scratched: false },
    { key: "cau_giay", name: "Cầu Giấy", count: 0, scratched: false },
  ];

  const effectiveScratchedCount = districts.filter(
    (d) => d.scratched || localScratched[d.key]
  ).length;
  const pct = Math.round((effectiveScratchedCount / districts.length) * 100);

  return (
    <div className="bg-[#FFFDF9] border-2 border-[#CBB292] rounded-2xl p-4 sm:p-5 shadow-md flex flex-col justify-between space-y-4">
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-extrabold uppercase px-2 py-0.5 rounded bg-brand-olive text-white">
            🗺️ Scratch Map Hà Nội
          </span>
          <span id="scratchPercentBadge" className="text-xs font-extrabold text-brand-terracotta">
            Đã mở: {pct}% ({effectiveScratchedCount}/7 quận)
          </span>
        </div>

        <h3 className="font-serif font-extrabold text-base text-paper-ink">
          Cào Nhũ Bạc Mở Khóa 7 Khu Vực
        </h3>
        <p className="text-xs text-paper-muted mt-0.5">
          Chạm vào từng ô nhũ bạc bên dưới để cào mở khóa kỷ niệm tại quận đó:
        </p>

        {/* Lưới 7 quận cào */}
        <div id="scratchDistrictsGrid" className="grid grid-cols-2 gap-2 my-4">
          {districts.map((d) => {
            const isScratched = d.scratched || localScratched[d.key];
            return (
              <button
                key={d.key}
                type="button"
                onClick={() => handleScratchTile(d.key, d.name)}
                className={`p-2.5 rounded-xl border text-left transition ${
                  isScratched
                    ? "bg-[#FAF4E8] border-brand-olive text-paper-ink shadow-xs"
                    : "bg-gradient-to-br from-stone-300 via-stone-400 to-stone-300 border-stone-500 text-stone-800 hover:brightness-105"
                }`}
              >
                <div className="flex items-center justify-between text-xs font-extrabold">
                  <span>{d.name}</span>
                  <span>{isScratched ? "✅" : "🪙 Cào"}</span>
                </div>
                <span className="text-[10px] block mt-0.5">
                  {isScratched
                    ? `Check-in: ${Math.max(1, d.count)}`
                    : "Chạm để cào lớp nhũ bạc"}
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
