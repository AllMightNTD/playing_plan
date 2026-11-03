"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { LogIn, LogOut, Shield, User } from "lucide-react";

interface AdminMeData {
  email: string;
  authenticated: boolean;
}

export function AdminUserMenu() {
  const [admin, setAdmin] = useState<AdminMeData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/admin/auth/me", { cache: "no-store", credentials: "include" });
      if (res.ok) {
        const json = await res.json();
        if (json?.data?.authenticated) {
          setAdmin(json.data);
        } else {
          setAdmin(null);
        }
      } else {
        setAdmin(null);
      }
    } catch {
      setAdmin(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  const handleLogout = async () => {
    try {
      await fetch("/api/v1/admin/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } finally {
      window.location.href = "/admin/login";
    }
  };

  if (loading) {
    return <div className="w-20 h-7 bg-slate-100 rounded-lg animate-pulse" />;
  }

  if (!admin) {
    return (
      <Link
        href="/admin/login"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors shadow-2xs"
      >
        <LogIn className="w-3.5 h-3.5" />
        <span>Đăng nhập</span>
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 bg-slate-100 rounded-lg border border-slate-200 text-xs">
        <Shield className="w-3.5 h-3.5 text-peach-600" />
        <span className="font-medium text-slate-700 max-w-[180px] truncate" title={admin.email}>
          {admin.email}
        </span>
      </div>

      <button
        onClick={handleLogout}
        title="Đăng xuất khỏi CMS"
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-transparent hover:border-rose-200 transition-colors"
      >
        <LogOut className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Đăng xuất</span>
      </button>
    </div>
  );
}
