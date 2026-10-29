"use client";

import { AlertTriangle, Lock, RefreshCw } from "lucide-react";
import type { AdminApiFailure } from "./admin-fetch";

interface AdminErrorNoticeProps {
  failure: AdminApiFailure;
  onRetry?: () => void;
}

function signInHref(): string {
  const callbackUrl = typeof window === "undefined" ? "/admin" : window.location.pathname;
  return `/api/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`;
}

/** Hiển thị lỗi API admin; 401/403 kèm link đăng nhập Google. */
export function AdminErrorNotice({ failure, onRetry }: AdminErrorNoticeProps) {
  if (failure.status === 401 || failure.status === 403) {
    const isForbidden = failure.status === 403;
    return (
      <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm flex items-start gap-3">
        <Lock className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
        <div className="space-y-2 text-sm">
          <p className="font-semibold text-slate-800">
            {isForbidden ? "Tài khoản này không có quyền quản trị" : "Bạn chưa đăng nhập quản trị"}
          </p>
          <p className="text-slate-500 text-xs">
            {isForbidden
              ? "Email đang đăng nhập không nằm trong ADMIN_EMAILS_ALLOWLIST. Hãy đăng nhập bằng email quản trị khác."
              : "Đăng nhập bằng tài khoản Google đã được cấp quyền để xem dữ liệu CMS."}
          </p>
          <a
            href={signInHref()}
            className="inline-flex px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-lg transition-colors"
          >
            {isForbidden ? "Đăng nhập bằng tài khoản khác" : "Đăng nhập"}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3">
      <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
      <div className="space-y-2 text-sm">
        <p className="font-semibold text-red-800">Không tải được dữ liệu</p>
        <p className="text-xs text-red-700">
          {failure.message} <span className="font-mono text-red-500">({failure.code})</span>
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-red-200 text-red-700 hover:bg-red-100 text-xs font-medium rounded-lg transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Thử lại</span>
          </button>
        )}
      </div>
    </div>
  );
}
