"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  MapPin,
  Users,
  CalendarHeart,
  Heart,
  Radio,
  RefreshCw,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { adminFetch, type AdminApiFailure } from "./_shared/admin-fetch";
import { AdminErrorNotice } from "./_shared/AdminErrorNotice";
import type { AdminDashboardStats } from "@/server/services/admin/admin-stats.service";

const formatCount = (value: number) => value.toLocaleString("vi-VN");

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  iconClassName,
}: {
  label: string;
  value: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
  iconClassName: string;
}) {
  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
      <div className="flex items-center justify-between text-slate-500">
        <span className="text-xs font-semibold uppercase">{label}</span>
        <Icon className={`w-4 h-4 ${iconClassName}`} />
      </div>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      <p className="text-xs text-slate-500 font-medium">{hint}</p>
    </div>
  );
}

function ServiceStatus({ label, configured, detail }: { label: string; configured: boolean; detail: string }) {
  const Icon = configured ? CheckCircle2 : XCircle;
  return (
    <div className="flex items-start gap-2.5">
      <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${configured ? "text-emerald-600" : "text-red-500"}`} />
      <div>
        <p className="text-sm font-semibold text-slate-800">{label}</p>
        <p className={`text-xs ${configured ? "text-emerald-700" : "text-red-600"}`}>{detail}</p>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [failure, setFailure] = useState<AdminApiFailure | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    const result = await adminFetch<AdminDashboardStats>("/api/v1/admin/stats");
    if (result.ok) {
      setStats(result.data);
      setFailure(null);
    } else {
      setFailure(result);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const counts = stats?.counts ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Tổng quan hệ thống</h2>
          <p className="text-sm text-slate-500">
            {stats
              ? `Số liệu thật từ cơ sở dữ liệu, cập nhật lúc ${new Date(stats.generatedAt).toLocaleTimeString("vi-VN")}`
              : "Theo dõi dữ liệu địa điểm, phòng hẹn hò và cấu hình dịch vụ"}
          </p>
        </div>
        <button
          onClick={fetchStats}
          disabled={loading}
          className="self-start sm:self-auto p-2 border border-slate-200 bg-white rounded-lg text-slate-600 hover:bg-slate-50 text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-60"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Làm mới</span>
        </button>
      </div>

      {failure && <AdminErrorNotice failure={failure} onRetry={fetchStats} />}

      {!stats && loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="h-[118px] bg-white rounded-xl border border-slate-200 animate-pulse" />
          ))}
        </div>
      )}

      {stats && (
        <>
          {!counts && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
              Chưa cấu hình <span className="font-mono font-semibold">DATABASE_URL</span> nên chưa có số liệu thống kê.
            </div>
          )}

          {counts && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="Địa điểm"
                value={formatCount(counts.places.total)}
                hint={`${formatCount(counts.places.byStatus.published)} xuất bản · ${formatCount(
                  counts.places.byStatus.draft
                )} nháp · ${formatCount(counts.places.byStatus.hidden)} ẩn`}
                icon={MapPin}
                iconClassName="text-peach-700"
              />
              <StatCard
                label="Phòng hẹn hò"
                value={formatCount(counts.rooms.total)}
                hint={`${formatCount(counts.rooms.paired)} phòng đã ghép đôi`}
                icon={Users}
                iconClassName="text-blue-600"
              />
              <StatCard
                label="Kế hoạch hẹn"
                value={formatCount(counts.plans)}
                hint="Tổng số kế hoạch đã tạo"
                icon={CalendarHeart}
                iconClassName="text-purple-600"
              />
              <StatCard
                label="Lượt match"
                value={formatCount(counts.matches)}
                hint="Địa điểm cả hai cùng quẹt thích"
                icon={Heart}
                iconClassName="text-rose-600"
              />
            </div>
          )}

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-base text-slate-800">Pipeline & dịch vụ</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-start gap-2.5">
                <Radio className="w-4 h-4 mt-0.5 shrink-0 text-peach-600" />
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {counts ? formatCount(counts.pendingCandidates) : "—"} ứng viên chờ duyệt
                  </p>
                  <p className="text-xs text-slate-500">Địa điểm OSM chưa thăng hạng</p>
                </div>
              </div>
              <ServiceStatus
                label="Cơ sở dữ liệu"
                configured={stats.services.databaseConfigured}
                detail={stats.services.databaseConfigured ? "Đã cấu hình DATABASE_URL" : "Chưa cấu hình DATABASE_URL"}
              />
              <ServiceStatus
                label="Gemini AI"
                configured={stats.services.geminiConfigured}
                detail={stats.services.geminiConfigured ? "Đã cấu hình GEMINI_API_KEY" : "Chưa cấu hình GEMINI_API_KEY"}
              />
            </div>
            <p className="text-[11px] text-slate-400">
              Chỉ kiểm tra biến môi trường đã khai báo, không gọi thử dịch vụ.
            </p>
          </div>
        </>
      )}

      {/* Hành động nhanh */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="font-bold text-base text-slate-800">Hành động nhanh</h3>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/places"
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm rounded-lg transition-colors"
          >
            {counts ? `Xem danh sách ${formatCount(counts.places.total)} địa điểm` : "Xem danh sách địa điểm"}
          </Link>
          <Link
            href="/admin/pipeline"
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-sm rounded-lg transition-colors"
          >
            Mở Radar tự động
          </Link>
        </div>
      </div>
    </div>
  );
}
