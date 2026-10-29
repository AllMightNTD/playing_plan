"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Search, Pin, Check, X, Trash2, Play, Loader2 } from "lucide-react";
import { adminFetch, type AdminApiFailure } from "../_shared/admin-fetch";
import { AdminErrorNotice } from "../_shared/AdminErrorNotice";
import { formatTimestamp } from "@/lib/video-chapters";
import type { AdminVideoRow, HotspotWithPlace } from "@/server/db/queries/videos/video-hotspots.queries";
import type { AdminVideoDetailDto } from "@/server/services/admin/video-hotspot-admin.service";
import type { AdminPlaceRow } from "@/server/db/queries/admin/places.queries";

type VideoFilter = "all" | "pending" | "verified" | "none";

const FILTERS: { key: VideoFilter; label: string }[] = [
  { key: "pending", label: "Chờ duyệt" },
  { key: "none", label: "Chưa có mốc" },
  { key: "verified", label: "Đã có mốc" },
  { key: "all", label: "Tất cả" },
];

const STATUS_STYLE: Record<HotspotWithPlace["status"], string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  verified: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-slate-100 text-slate-500 border-slate-200",
};

// Kiểu tối thiểu của YouTube IFrame API mà trang này dùng
interface YtPlayer {
  getCurrentTime(): number;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  destroy(): void;
}
interface YtNamespace {
  Player: new (el: HTMLElement, opts: { videoId: string; playerVars?: Record<string, number> }) => YtPlayer;
}
declare global {
  interface Window {
    YT?: YtNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let ytApiPromise: Promise<YtNamespace> | null = null;
function loadYouTubeApi(): Promise<YtNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  ytApiPromise ??= new Promise((resolve) => {
    window.onYouTubeIframeAPIReady = () => resolve(window.YT!);
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(script);
  });
  return ytApiPromise;
}

export default function AdminVideosPage() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [filter, setFilter] = useState<VideoFilter>("pending");
  const [videos, setVideos] = useState<AdminVideoRow[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [listFailure, setListFailure] = useState<AdminApiFailure | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminVideoDetailDto | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Ghim mới
  const [placeQuery, setPlaceQuery] = useState("");
  const [placeResults, setPlaceResults] = useState<AdminPlaceRow[]>([]);
  const [pickedPlace, setPickedPlace] = useState<AdminPlaceRow | null>(null);
  const [pinLabel, setPinLabel] = useState("");
  const [currentSec, setCurrentSec] = useState(0);

  const playerHostRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YtPlayer | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const loadVideos = useCallback(
    async (cursor: string | null) => {
      setIsLoadingList(true);
      const params = new URLSearchParams({ filter, limit: "20" });
      if (debouncedQuery) params.set("q", debouncedQuery);
      if (cursor) params.set("cursor", cursor);
      const result = await adminFetch<{ items: AdminVideoRow[]; nextCursor: string | null }>(`/api/v1/admin/videos?${params}`);
      setIsLoadingList(false);
      if (!result.ok) {
        setListFailure(result);
        return;
      }
      setListFailure(null);
      setVideos((prev) => (cursor ? [...prev, ...result.data.items] : result.data.items));
      setNextCursor(result.data.nextCursor);
    },
    [filter, debouncedQuery]
  );

  useEffect(() => {
    loadVideos(null);
  }, [loadVideos]);

  const loadDetail = useCallback(async (videoId: string) => {
    const result = await adminFetch<AdminVideoDetailDto>(`/api/v1/admin/videos/${encodeURIComponent(videoId)}`);
    if (result.ok) setDetail(result.data);
    else setActionError(result.message);
  }, []);

  useEffect(() => {
    setDetail(null);
    setActionError(null);
    setPickedPlace(null);
    if (selectedId) loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  // Gắn trình phát YouTube để đọc giây hiện tại khi ghim
  useEffect(() => {
    if (!selectedId || !playerHostRef.current) return;
    let cancelled = false;
    const host = document.createElement("div");
    playerHostRef.current.replaceChildren(host);
    loadYouTubeApi().then((YT) => {
      if (cancelled) return;
      playerRef.current = new YT.Player(host, { videoId: selectedId, playerVars: { rel: 0 } });
    });
    const timer = setInterval(() => {
      const time = playerRef.current?.getCurrentTime?.();
      if (typeof time === "number") setCurrentSec(Math.floor(time));
    }, 500);
    return () => {
      cancelled = true;
      clearInterval(timer);
      playerRef.current?.destroy?.();
      playerRef.current = null;
    };
  }, [selectedId]);

  // Tìm địa điểm đã xuất bản để ghim
  useEffect(() => {
    const q = placeQuery.trim();
    if (q.length < 2) {
      setPlaceResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      const params = new URLSearchParams({ q, status: "published", limit: "8" });
      const result = await adminFetch<{ items: AdminPlaceRow[] }>(`/api/v1/admin/places?${params}`);
      if (result.ok) setPlaceResults(result.data.items);
    }, 250);
    return () => clearTimeout(timer);
  }, [placeQuery]);

  const mutate = async (key: string, url: string, init: RequestInit) => {
    setBusyId(key);
    setActionError(null);
    const result = await adminFetch<AdminVideoDetailDto>(url, {
      ...init,
      headers: { "Content-Type": "application/json" },
    });
    setBusyId(null);
    if (!result.ok) {
      setActionError(result.message);
      return false;
    }
    setDetail(result.data);
    loadVideos(null);
    return true;
  };

  const hotspotUrl = (hotspotId?: string) =>
    `/api/v1/admin/videos/${encodeURIComponent(selectedId ?? "")}/hotspots${hotspotId ? `/${hotspotId}` : ""}`;

  const handlePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pickedPlace) return;
    const ok = await mutate("pin", hotspotUrl(), {
      method: "POST",
      body: JSON.stringify({ placeId: pickedPlace.id, timestampSec: currentSec, ...(pinLabel.trim() ? { label: pinLabel.trim() } : {}) }),
    });
    if (ok) {
      setPickedPlace(null);
      setPlaceQuery("");
      setPinLabel("");
    }
  };

  const seek = (seconds: number) => playerRef.current?.seekTo(seconds, true);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Mốc địa điểm trong video</h2>
        <p className="text-sm text-slate-500">
          Mốc được tạo tự động từ chapter và AI xem video (<code>pnpm video:ai-hotspots</code>, chạy kèm daily pipeline). Mốc chắc chắn được
          tự duyệt và kiểm toán qua mẫu chấm hằng ngày; ở đây chỉ cần xử lý mốc AI chưa chắc (chờ duyệt) hoặc sửa tay khi cần.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* Danh sách video */}
        <div className="xl:col-span-5 bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm theo tiêu đề, kênh hoặc video ID..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                  filter === f.key ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {listFailure ? (
            <AdminErrorNotice failure={listFailure} onRetry={() => loadVideos(null)} />
          ) : (
            <div className="divide-y divide-slate-100 max-h-[70vh] overflow-y-auto">
              {videos.length === 0 && !isLoadingList && (
                <p className="py-8 text-center text-sm text-slate-500">
                  Không có video nào. Nạp catalog bằng <code>pnpm video:import</code> nếu bảng còn trống.
                </p>
              )}
              {videos.map((v) => (
                <button
                  key={v.videoId}
                  onClick={() => setSelectedId(v.videoId)}
                  className={`w-full text-left py-2.5 px-2 rounded-lg hover:bg-slate-50 ${selectedId === v.videoId ? "bg-slate-100" : ""}`}
                >
                  <div className="text-sm font-semibold text-slate-800 line-clamp-2">{v.title}</div>
                  <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-slate-500">
                    <span>{v.channelTitle}</span>
                    <span>• {v.viewCount.toLocaleString("vi-VN")} lượt xem</span>
                    {v.pendingCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-semibold">{v.pendingCount} chờ duyệt</span>
                    )}
                    {v.verifiedCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold">{v.verifiedCount} đã duyệt</span>
                    )}
                  </div>
                </button>
              ))}
              {isLoadingList && <p className="py-4 text-center text-xs text-slate-400">Đang tải...</p>}
            </div>
          )}
          {nextCursor && !isLoadingList && (
            <button onClick={() => loadVideos(nextCursor)} className="w-full py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200">
              Tải thêm
            </button>
          )}
        </div>

        {/* Chi tiết video & mốc */}
        <div className="xl:col-span-7 bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-4">
          {!selectedId ? (
            <p className="py-16 text-center text-sm text-slate-500">Chọn một video bên trái để duyệt hoặc ghim mốc.</p>
          ) : (
            <>
              <div className="aspect-video w-full bg-black rounded-lg overflow-hidden [&_iframe]:w-full [&_iframe]:h-full" ref={playerHostRef} />
              {detail && <h3 className="font-bold text-slate-800">{detail.video.title}</h3>}
              {actionError && <p className="text-xs font-semibold text-rose-600">{actionError}</p>}

              {/* Ghim tại giây đang phát */}
              <form onSubmit={handlePin} className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                  <Pin className="w-3.5 h-3.5" />
                  Ghim tại <span className="font-mono px-1.5 py-0.5 rounded bg-slate-900 text-white">{formatTimestamp(currentSec)}</span>
                </div>
                {pickedPlace ? (
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="font-semibold text-slate-800">
                      {pickedPlace.name} <span className="text-xs text-slate-500">• {pickedPlace.area}</span>
                    </span>
                    <button type="button" onClick={() => setPickedPlace(null)} className="text-xs text-slate-500 hover:text-slate-800">
                      Đổi
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      value={placeQuery}
                      onChange={(e) => setPlaceQuery(e.target.value)}
                      placeholder="Tìm địa điểm đã xuất bản..."
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200"
                    />
                    {placeResults.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                        {placeResults.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              setPickedPlace(p);
                              setPlaceResults([]);
                            }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                          >
                            {p.name} <span className="text-xs text-slate-500">• {p.area}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    value={pinLabel}
                    onChange={(e) => setPinLabel(e.target.value)}
                    maxLength={200}
                    placeholder="Nhãn hiển thị (không bắt buộc)"
                    className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200"
                  />
                  <button
                    type="submit"
                    disabled={!pickedPlace || busyId === "pin"}
                    className="px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold disabled:opacity-40"
                  >
                    {busyId === "pin" ? "Đang ghim..." : "Ghim"}
                  </button>
                </div>
              </form>

              {/* Danh sách mốc */}
              {!detail ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                </div>
              ) : detail.hotspots.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">Video chưa có mốc nào.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {detail.hotspots.map((h) => (
                    <div key={h.id} className="py-2.5 flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => seek(h.timestampSec)}
                        className="flex items-center gap-1 px-2 py-1 rounded bg-slate-900 text-white font-mono text-[11px]"
                        title="Tua tới mốc này"
                      >
                        <Play className="w-3 h-3" />
                        {formatTimestamp(h.timestampSec)}
                      </button>
                      <div className="flex-1 min-w-[160px]">
                        <div className="text-sm font-semibold text-slate-800">
                          {h.placeName ?? "Địa điểm đã bị xóa"}
                          {h.placeStatus && h.placeStatus !== "published" && (
                            <span className="ml-1 text-[11px] text-rose-600">({h.placeStatus}, người dùng không thấy)</span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {h.source === "chapter"
                            ? `Chapter: "${h.label}"`
                            : h.source === "ai"
                              ? `AI (tin cậy ${h.confidence ?? "?"}) • ${h.evidence ?? h.label}`
                              : `Ghim tay bởi ${h.createdBy}`}
                        </div>
                      </div>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${STATUS_STYLE[h.status]}`}>{h.status}</span>
                      {h.status !== "verified" && (
                        <button
                          disabled={busyId === h.id}
                          onClick={() => mutate(h.id, hotspotUrl(h.id), { method: "PATCH", body: JSON.stringify({ status: "verified" }) })}
                          className="p-1.5 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          title="Duyệt"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {h.status === "pending" && (
                        <button
                          disabled={busyId === h.id}
                          onClick={() => mutate(h.id, hotspotUrl(h.id), { method: "PATCH", body: JSON.stringify({ status: "rejected" }) })}
                          className="p-1.5 rounded bg-slate-100 text-slate-600 hover:bg-slate-200"
                          title="Loại"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {h.status === "pending" && (
                        <button
                          disabled={busyId === h.id}
                          onClick={() =>
                            mutate(h.id, hotspotUrl(h.id), { method: "PATCH", body: JSON.stringify({ timestampSec: currentSec }) })
                          }
                          className="px-2 py-1 rounded text-[11px] bg-slate-100 text-slate-600 hover:bg-slate-200"
                          title="Chỉnh mốc thành giây đang phát"
                        >
                          → {formatTimestamp(currentSec)}
                        </button>
                      )}
                      <button
                        disabled={busyId === h.id}
                        onClick={() => mutate(h.id, hotspotUrl(h.id), { method: "DELETE" })}
                        className="p-1.5 rounded text-rose-600 hover:bg-rose-50"
                        title="Xóa"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
