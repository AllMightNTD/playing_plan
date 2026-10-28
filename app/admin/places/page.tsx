"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { HANOI_PLACES, HIDDEN_SAFETY_PLACE, type HanoiPlace } from "@/lib/mock-data";
import {
  MapPin,
  Search,
  Plus,
  Sparkles,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  EyeOff,
  Filter,
} from "lucide-react";
import { normalizeVietnamese } from "@/lib/search";

export default function AdminPlacesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "hidden">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Gồm cả 10 địa điểm catalog + 1 địa điểm cố ý ẩn cảnh báo đường sắt (Mục 14.2)
  const allPlaces = useMemo(() => {
    const list: Array<HanoiPlace | typeof HIDDEN_SAFETY_PLACE> = [
      ...HANOI_PLACES,
      HIDDEN_SAFETY_PLACE,
    ];
    return list;
  }, []);

  const filteredPlaces = useMemo(() => {
    const q = normalizeVietnamese(searchQuery);
    return allPlaces.filter((item) => {
      // Status filter
      if (statusFilter !== "all" && item.status !== statusFilter) return false;

      // Category filter
      if (categoryFilter !== "all" && item.category !== categoryFilter) return false;

      // Search query
      if (q) {
        const text = normalizeVietnamese(`${item.name} ${item.area} ${item.category}`);
        return text.includes(q);
      }

      return true;
    });
  }, [allPlaces, searchQuery, statusFilter, categoryFilter]);

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Quản lý địa điểm & Cẩm nang</h2>
          <p className="text-sm text-slate-500">
            Danh mục 36 địa điểm khởi đầu tại Hà Nội (Mục 14 Spec)
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/admin/places/new"
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs sm:text-sm rounded-lg transition-colors inline-flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm địa điểm</span>
          </Link>
          <button
            onClick={() => {
              alert("Dán transcript TikTok/YouTube vào form thêm mới để Gemini Flash tự động trích xuất!");
            }}
            className="px-4 py-2 bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 font-medium text-xs sm:text-sm rounded-lg transition-colors inline-flex items-center gap-1.5"
          >
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span>AI Trích xuất (Gemini)</span>
          </button>
        </div>
      </div>

      {/* Railway Safety Banner (Mục 14.2) */}
      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900 leading-relaxed">
          <span className="font-bold">Quy chuẩn kiểm duyệt an toàn đường sắt (Mục 14.2):</span>{" "}
          Địa điểm <em>&quot;Phố cà phê đường tàu&quot;</em> được gắn trạng thái{" "}
          <span className="font-semibold px-1.5 py-0.5 rounded bg-amber-200/80">hidden</span> kèm
          cảnh báo rào chắn an toàn 3/2025. Nếu người dùng tìm kiếm, hệ thống tự động gợi ý thay
          thế bằng <em>Cà phê view cầu Long Biên</em> hoặc <em>Cầu Long Biên</em>.
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo tên địa điểm, quận huyện..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <div className="flex items-center gap-1 text-xs text-slate-500 font-medium shrink-0">
            <Filter className="w-3.5 h-3.5" />
            <span>Trạng thái:</span>
          </div>
          {(
            [
              { key: "all", label: "Tất cả" },
              { key: "published", label: "Đã xuất bản" },
              { key: "hidden", label: "Đã ẩn / Cấm" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                statusFilter === tab.key
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm text-slate-600">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Địa điểm</th>
                <th className="py-3 px-4">Khu vực</th>
                <th className="py-3 px-4">Danh mục</th>
                <th className="py-3 px-4">Trạng thái</th>
                <th className="py-3 px-4">Giờ đẹp / Cảnh báo</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPlaces.map((p) => {
                const isHidden = p.status === "hidden";
                const isTrain = p.slug === "pho-ca-phe-duong-tau";

                return (
                  <tr key={p.slug} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 flex items-center gap-2">
                        <span>{"emoji" in p ? p.emoji : "📍"}</span>
                        <span>{p.name}</span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">/{p.slug}</span>
                    </td>

                    <td className="py-3.5 px-4 font-medium text-slate-700">{p.area}</td>

                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-medium">
                        {"categoryLabel" in p ? p.categoryLabel : p.category}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      {isHidden ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 text-xs font-semibold">
                          <EyeOff className="w-3 h-3" />
                          <span>Đã ẩn</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Xuất bản</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      {isTrain ? (
                        <span className="text-xs font-semibold text-red-600 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Rào chắn an toàn 3/2025</span>
                        </span>
                      ) : (
                        <span className="text-xs text-slate-600 font-medium">
                          {"bestTimeText" in p ? p.bestTimeText : "Hợp đi hôm nay"}
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/places/${p.slug}`}
                          target="_blank"
                          className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors inline-flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Xem trước</span>
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
