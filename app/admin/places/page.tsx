"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Search,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  EyeOff,
  FilePen,
  Filter,
  Loader2,
  MapPinOff,
  Send,
} from "lucide-react";
import { CATEGORY_LABELS } from "@/lib/constants/catalog";
import { PLACE_STATUSES, type PlaceStatus } from "@/lib/validators/admin";
import { adminFetch, isAdminAuthFailure, type AdminApiFailure } from "../_shared/admin-fetch";
import { AdminErrorNotice } from "../_shared/AdminErrorNotice";
import type { AdminPlaceRow } from "@/server/db/queries/admin/places.queries";
import type { AdminPlaceDto } from "@/server/services/admin/place-admin.service";
import type { AdminDashboardStats } from "@/server/services/admin/admin-stats.service";
import type { Page } from "@/lib/catalog-filter";

// Ngày giờ đi qua JSON nên là chuỗi ISO.
type PlaceRow = Omit<AdminPlaceRow, "updatedAt"> & { updatedAt: string };
type StatusFilter = "all" | PlaceStatus;
type RowAction = "publish" | "hide";

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

const STATUS_META: Record<PlaceStatus, { label: string; tabLabel: string; className: string; icon: typeof CheckCircle2 }> = {
  published: {
    label: "Xuất bản",
    tabLabel: "Đã xuất bản",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: CheckCircle2,
  },
  draft: {
    label: "Nháp",
    tabLabel: "Bản nháp",
    className: "bg-slate-100 text-slate-700 border-slate-200",
    icon: FilePen,
  },
  hidden: {
    label: "Đã ẩn",
    tabLabel: "Đã ẩn / Cấm",
    className: "bg-red-50 text-red-700 border-red-200",
    icon: EyeOff,
  },
};

function toRow(place: AdminPlaceDto | PlaceRow): PlaceRow {
  return {
    id: place.id,
    slug: place.slug,
    name: place.name,
    area: place.area,
    category: place.category,
    status: place.status,
    updatedAt: String(place.updatedAt),
  };
}

function buildListUrl(status: StatusFilter, q: string, cursor: string | null): string {
  const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
  if (status !== "all") params.set("status", status);
  if (q) params.set("q", q);
  if (cursor) params.set("cursor", cursor);
  return `/api/v1/admin/places?${params.toString()}`;
}

function formatUpdatedAt(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function describeActionFailure(failure: AdminApiFailure): string {
  const fieldKeys = failure.fields ? Object.keys(failure.fields) : [];
  return fieldKeys.length > 0 ? `${failure.message} Thiếu/sai: ${fieldKeys.join(", ")}` : failure.message;
}

export default function AdminPlacesPage() {
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const [rows, setRows] = useState<PlaceRow[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [failure, setFailure] = useState<AdminApiFailure | null>(null);

  const [statusCounts, setStatusCounts] = useState<Record<PlaceStatus, number> | null>(null);
  const [pendingAction, setPendingAction] = useState<{ id: string; action: RowAction } | null>(null);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});

  // Bỏ qua phản hồi cũ khi người dùng đổi bộ lọc liên tục.
  const requestIdRef = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => setQuery(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchStatusCounts = useCallback(async () => {
    const result = await adminFetch<AdminDashboardStats>("/api/v1/admin/stats");
    if (result.ok) setStatusCounts(result.data.counts?.places.byStatus ?? null);
  }, []);

  const loadFirstPage = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setRowErrors({});
    const result = await adminFetch<Page<PlaceRow>>(buildListUrl(statusFilter, query, null));
    if (requestId !== requestIdRef.current) return;

    if (result.ok) {
      setRows(result.data.items.map(toRow));
      setNextCursor(result.data.nextCursor);
      setFailure(null);
    } else {
      setRows([]);
      setNextCursor(null);
      setFailure(result);
    }
    setLoading(false);
  }, [statusFilter, query]);

  useEffect(() => {
    loadFirstPage();
  }, [loadFirstPage]);

  useEffect(() => {
    fetchStatusCounts();
  }, [fetchStatusCounts]);

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    const requestId = requestIdRef.current;
    setLoadingMore(true);
    const result = await adminFetch<Page<PlaceRow>>(buildListUrl(statusFilter, query, nextCursor));
    if (requestId === requestIdRef.current) {
      if (result.ok) {
        setRows((prev) => {
          const seen = new Set(prev.map((row) => row.id));
          return [...prev, ...result.data.items.map(toRow).filter((row) => !seen.has(row.id))];
        });
        setNextCursor(result.data.nextCursor);
      } else {
        setFailure(result);
      }
    }
    setLoadingMore(false);
  };

  const runRowAction = async (row: PlaceRow, action: RowAction) => {
    if (pendingAction) return;
    setPendingAction({ id: row.id, action });
    setRowErrors(({ [row.id]: _removed, ...rest }) => rest);

    const result =
      action === "publish"
        ? await adminFetch<AdminPlaceDto>(`/api/v1/admin/places/${encodeURIComponent(row.id)}/publish`, { method: "POST" })
        : await adminFetch<AdminPlaceDto>(`/api/v1/admin/places/${encodeURIComponent(row.id)}`, { method: "DELETE" });

    if (result.ok) {
      const updated = toRow(result.data);
      setRows((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      fetchStatusCounts();
    } else if (isAdminAuthFailure(result)) {
      setFailure(result);
    } else {
      setRowErrors((prev) => ({ ...prev, [row.id]: describeActionFailure(result) }));
    }
    setPendingAction(null);
  };

  const totalCount = statusCounts ? PLACE_STATUSES.reduce((sum, status) => sum + statusCounts[status], 0) : null;
  const tabs: Array<{ key: StatusFilter; label: string; count: number | null }> = [
    { key: "all", label: "Tất cả", count: totalCount },
    ...PLACE_STATUSES.map((status) => ({
      key: status,
      label: STATUS_META[status].tabLabel,
      count: statusCounts ? statusCounts[status] : null,
    })),
  ];

  const subtitle =
    totalCount !== null && statusCounts
      ? `${totalCount.toLocaleString("vi-VN")} địa điểm trong CMS · ${statusCounts.published.toLocaleString("vi-VN")} đang xuất bản`
      : "Danh mục địa điểm & cẩm nang trong cơ sở dữ liệu";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-800">Quản lý địa điểm & Cẩm nang</h2>
        <p className="text-sm text-slate-500">{subtitle}</p>
      </div>

      {/* Quy chuẩn an toàn đường sắt (Mục 14.2) */}
      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900 leading-relaxed">
          <span className="font-bold">Quy chuẩn kiểm duyệt an toàn đường sắt (Mục 14.2):</span> Địa điểm kiểu{" "}
          <em>&quot;Phố cà phê đường tàu&quot;</em> phải giữ trạng thái{" "}
          <span className="font-semibold px-1.5 py-0.5 rounded bg-amber-200/80">hidden</span> kèm cảnh báo rào chắn
          an toàn 3/2025. Gợi ý thay thế cho người dùng: <em>Cà phê view cầu Long Biên</em> hoặc{" "}
          <em>Cầu Long Biên</em>.
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo tên địa điểm..."
            value={searchInput}
            maxLength={100}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <div className="flex items-center gap-1 text-xs text-slate-500 font-medium shrink-0">
            <Filter className="w-3.5 h-3.5" />
            <span>Trạng thái:</span>
          </div>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                statusFilter === tab.key ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {tab.label}
              {tab.count !== null && <span className="ml-1 opacity-70">({tab.count.toLocaleString("vi-VN")})</span>}
            </button>
          ))}
        </div>
      </div>

      {failure ? (
        <AdminErrorNotice failure={failure} onRetry={loadFirstPage} />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="py-12 flex flex-col items-center gap-2 text-sm text-slate-500">
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
              <span>Đang tải danh sách địa điểm...</span>
            </div>
          ) : rows.length === 0 ? (
            <div className="py-12 flex flex-col items-center gap-2 text-sm text-slate-500">
              <MapPinOff className="w-6 h-6 text-slate-300" />
              <span>
                {query || statusFilter !== "all"
                  ? "Không có địa điểm nào khớp bộ lọc hiện tại."
                  : "Chưa có địa điểm nào trong cơ sở dữ liệu."}
              </span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm text-slate-600">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Địa điểm</th>
                    <th className="py-3 px-4">Khu vực</th>
                    <th className="py-3 px-4">Danh mục</th>
                    <th className="py-3 px-4">Trạng thái</th>
                    <th className="py-3 px-4">Cập nhật</th>
                    <th className="py-3 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((p) => {
                    const meta = STATUS_META[p.status];
                    const StatusIcon = meta.icon;
                    const isBusy = pendingAction?.id === p.id;
                    const rowError = rowErrors[p.id];

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition-colors align-top">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{p.name}</div>
                          <span className="text-[11px] text-slate-400 font-mono">/{p.slug}</span>
                          {rowError && <p className="mt-1 text-[11px] text-red-600 max-w-xs">{rowError}</p>}
                        </td>

                        <td className="py-3.5 px-4 font-medium text-slate-700">{p.area}</td>

                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-medium">
                            {CATEGORY_LABELS[p.category] ?? p.category}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-xs font-semibold ${meta.className}`}
                          >
                            <StatusIcon className="w-3 h-3" />
                            <span>{meta.label}</span>
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-xs text-slate-500 whitespace-nowrap">
                          {formatUpdatedAt(p.updatedAt)}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {p.status !== "published" && (
                              <button
                                onClick={() => runRowAction(p, "publish")}
                                disabled={pendingAction !== null}
                                className="px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors inline-flex items-center gap-1 disabled:opacity-50"
                              >
                                {isBusy && pendingAction?.action === "publish" ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Send className="w-3 h-3" />
                                )}
                                <span>Xuất bản</span>
                              </button>
                            )}
                            {p.status !== "hidden" && (
                              <button
                                onClick={() => runRowAction(p, "hide")}
                                disabled={pendingAction !== null}
                                className="px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-md transition-colors inline-flex items-center gap-1 disabled:opacity-50"
                              >
                                {isBusy && pendingAction?.action === "hide" ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <EyeOff className="w-3 h-3" />
                                )}
                                <span>Ẩn</span>
                              </button>
                            )}
                            {p.status === "published" && (
                              <Link
                                href={`/places/${p.slug}`}
                                target="_blank"
                                className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors inline-flex items-center gap-1"
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span>Xem trước</span>
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {!loading && rows.length > 0 && (
            <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Đang hiển thị {rows.length.toLocaleString("vi-VN")} địa điểm</span>
              {nextCursor && (
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors inline-flex items-center gap-1.5 disabled:opacity-60"
                >
                  {loadingMore && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Tải thêm</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
