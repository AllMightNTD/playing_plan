"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useApp } from "@/context/AppContext";
import type { RoomNoticeDto } from "@/server/services/user/room-notice.service";

const POLL_MS = 60_000;

const NOTICE_ICON: Record<RoomNoticeDto["noticeType"], string> = {
  new_match: "💞",
  plan_rsvp: "💌",
  time_change_request: "⏰",
  secret_note_unlocked: "🔓",
  room_delete_pending: "⚠️",
};

function formatAgo(value: string | Date): string {
  const minutes = Math.round((Date.now() - new Date(value).getTime()) / 60000);
  if (minutes < 1) return "Vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;
  if (minutes < 24 * 60) return `${Math.floor(minutes / 60)} giờ trước`;
  return new Date(value).toLocaleDateString("vi-VN");
}

/** Chuông thông báo hoạt động trong phòng đôi (rooms/notices); chỉ tải khi đã có phòng. */
export function NoticesBell() {
  const { homeSummary } = useApp();
  const hasRoom = Boolean(homeSummary?.room);
  const [notices, setNotices] = useState<RoomNoticeDto[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/user/rooms/notices", { cache: "no-store" });
      if (!res.ok) return;
      const json = await res.json();
      if (Array.isArray(json?.data?.notices)) setNotices(json.data.notices);
    } catch {
      // Lần poll sau thử lại
    }
  }, []);

  useEffect(() => {
    if (!hasRoom) {
      setNotices([]);
      return;
    }
    load();
    const timer = setInterval(load, POLL_MS);
    return () => clearInterval(timer);
  }, [hasRoom, load]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const unread = notices.filter((n) => !n.isRead);

  const markRead = async (ids: string[]) => {
    if (ids.length === 0) return;
    setNotices((prev) => prev.map((n) => (ids.includes(n.id) ? { ...n, isRead: true } : n)));
    await Promise.allSettled(
      ids.map((id) => fetch(`/api/v1/user/rooms/notices/${encodeURIComponent(id)}/read`, { method: "POST" }))
    );
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="relative bg-[#FFFDF9] hover:bg-[#F9EFC7] border border-[#CBB292] text-paper-ink w-9 h-9 rounded-full flex items-center justify-center text-sm transition"
        title="Thông báo của hai bạn"
        aria-label={`Thông báo${unread.length > 0 ? `, ${unread.length} chưa đọc` : ""}`}
      >
        <span>🔔</span>
        {unread.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-brand-terracotta text-white text-[10px] font-extrabold min-w-4 h-4 px-0.5 flex items-center justify-center rounded-full">
            {unread.length > 9 ? "9+" : unread.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 max-w-[calc(100vw-24px)] bg-[#FFFDF9] border-2 border-[#CBB292] rounded-2xl shadow-2xl p-4 z-50">
          <div className="flex items-center justify-between pb-2.5 border-b border-dashed border-[#CBB292]">
            <div>
              <p className="font-serif font-extrabold text-sm text-paper-ink">🔔 Hoạt động của hai bạn</p>
              <p className="text-[11px] text-paper-muted">Cập nhật mới nhất từ người thương</p>
            </div>
            {unread.length > 0 && (
              <button
                type="button"
                onClick={() => markRead(unread.map((n) => n.id))}
                className="text-[11px] font-bold text-brand-terracotta hover:underline"
              >
                ✓ Đánh dấu đã đọc
              </button>
            )}
          </div>
          <div className="divide-y divide-[#EFE5D4] max-h-64 overflow-y-auto my-1">
            {!hasRoom ? (
              <p className="py-6 text-center text-xs text-paper-muted">Tạo phòng đôi để nhận thông báo từ người ấy nhé.</p>
            ) : notices.length === 0 ? (
              <p className="py-6 text-center text-xs text-paper-muted">Chưa có hoạt động nào.</p>
            ) : (
              notices.map((notice) => (
                <button
                  key={notice.id}
                  type="button"
                  onClick={() => markRead(notice.isRead ? [] : [notice.id])}
                  className={`w-full text-left py-2.5 px-1 flex gap-2.5 ${notice.isRead ? "opacity-60" : ""}`}
                >
                  <span className="text-lg shrink-0">{NOTICE_ICON[notice.noticeType] ?? "🔔"}</span>
                  <span className="min-w-0">
                    <span className="block text-xs font-bold text-paper-ink">{notice.title}</span>
                    <span className="block text-[11px] text-paper-muted leading-snug">{notice.content}</span>
                    <span className="block text-[10px] text-paper-muted/80 mt-0.5">{formatAgo(notice.createdAt)}</span>
                  </span>
                  {!notice.isRead && <span className="w-2 h-2 rounded-full bg-brand-terracotta shrink-0 mt-1.5" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
