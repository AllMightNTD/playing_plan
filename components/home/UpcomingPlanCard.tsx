"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { InteractiveTimeline } from "@/components/scrapbook/InteractiveTimeline";
import { cn } from "@/lib/utils";

interface UpcomingPlanCardProps {
  onOpenShare: () => void;
}

/** Thẻ lịch hẹn sắp tới trên trang chủ: chỉnh giờ trực tiếp, checklist chuẩn bị, tải .ics, tạo ảnh Story. */
export function UpcomingPlanCard({ onOpenShare }: UpcomingPlanCardProps) {
  const {
    upcomingPlan,
    homeSummary,
    homePublic,
    isLoadingHome,
    places,
    refetchHomeSummary,
    setActiveDetailSlug,
    toggleUpcomingChecklistItem,
    addUpcomingChecklistItem,
    addToast,
  } = useApp();
  const [isChecklistOpen, setIsChecklistOpen] = useState(false);
  const [newItem, setNewItem] = useState("");

  const summary = homeSummary?.upcomingPlan ?? null;
  const cardClass = "lg:col-span-7 bg-[#FFFDF9] border-2 border-[#D8C7B0] rounded-2xl p-5 shadow-sm flex flex-col justify-between relative";

  if (!upcomingPlan || !summary) {
    return (
      <div className={cn(cardClass, "items-center justify-center text-center gap-3 min-h-[280px]")}>
        {isLoadingHome ? (
          <p className="text-sm text-paper-muted animate-pulse">Đang mở sổ lịch hẹn...</p>
        ) : (
          <>
            <span className="text-4xl">🗓️</span>
            <h2 className="font-serif font-extrabold text-lg text-paper-ink">Hai bạn chưa có lịch hẹn nào</h2>
            <p className="text-xs text-paper-muted max-w-sm">
              Thêm một quán vào lịch từ trang Khám phá, hoặc tạo kế hoạch rồi xếp các chặng dừng trong ngày.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Link href="/plans" className="bg-brand-terracotta text-white text-xs font-bold px-4 py-2 rounded-xl">
                📅 Tạo kế hoạch
              </Link>
              <Link href="/explore" className="bg-[#FFFDF9] border-2 border-brand-terracotta text-brand-terracottaDark text-xs font-bold px-4 py-2 rounded-xl">
                🧭 Tìm quán đẹp
              </Link>
            </div>
          </>
        )}
      </div>
    );
  }

  const done = upcomingPlan.checklist.filter((c) => c.isDone).length;

  return (
    <div className={cardClass}>
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-brand-olive/15 text-brand-olive">📍 Lịch hẹn sắp tới</span>
            <span className="text-xs font-bold text-paper-muted">{summary.formattedDate}</span>
          </div>
          {!upcomingPlan.isSecretLocked && (
            <button type="button" onClick={onOpenShare} className="text-xs font-bold text-brand-terracotta hover:underline flex items-center gap-1">
              <span>🖼️</span>
              <span>Tạo ảnh Story chia sẻ</span>
            </button>
          )}
        </div>

        <Link href="/plans" className="font-serif font-extrabold text-lg sm:text-xl text-paper-ink hover:text-brand-terracotta block mb-3">
          {upcomingPlan.title}
        </Link>

        {upcomingPlan.isSecretLocked ? (
          <div className="p-5 rounded-xl bg-[#362721] text-white text-center space-y-2 my-4">
            <div className="text-3xl">🎁🔒</div>
            <p className="font-serif font-bold text-brand-peach">Người ấy đang chuẩn bị một buổi hẹn bất ngờ!</p>
            <p className="text-xs text-white/80">Địa điểm sẽ tự mở khóa trước giờ hẹn.</p>
          </div>
        ) : upcomingPlan.stops.length === 0 ? (
          <div className="my-4 p-4 rounded-xl border border-dashed border-[#D8CBB8] text-center text-xs text-paper-muted">
            Kế hoạch chưa có chặng nào. <Link href="/explore" className="font-bold text-brand-terracotta">Thêm quán từ Khám phá →</Link>
          </div>
        ) : (
          <InteractiveTimeline
            plan={upcomingPlan}
            places={places}
            onRefresh={refetchHomeSummary}
            onOpenDetail={setActiveDetailSlug}
            onError={(message) => addToast(message, "error")}
            goldenHourStart={homePublic?.sun.goldenHour.start}
          />
        )}
      </div>

      <div className="pt-3 border-t border-dashed border-[#D8CBB8] flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setIsChecklistOpen((open) => !open)}
          className="text-xs font-bold text-paper-ink bg-[#EFE5D4] hover:bg-[#E2D2B8] px-3 py-1.5 rounded-lg flex items-center gap-1.5"
        >
          <span>☑️ Đồ cần chuẩn bị:</span>
          <span className="text-brand-terracotta font-extrabold">
            {done}/{upcomingPlan.checklist.length} xong
          </span>
        </button>
        <a
          href={summary.icsUrl}
          download
          onClick={() => addToast("📅 Đang tải file lịch .ics, mở bằng Apple / Google Calendar để được nhắc giờ hẹn!", "success")}
          className="bg-brand-terracotta hover:bg-brand-terracottaDark text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-xs flex items-center gap-1.5 transition"
        >
          <span>📅</span>
          <span>Lưu vào Lịch ĐT (.ics)</span>
        </a>
      </div>

      {isChecklistOpen && (
        <div className="mt-3 pt-3 border-t border-[#E5D8C5] space-y-2">
          {upcomingPlan.checklist.length === 0 && <p className="text-xs text-paper-muted">Chưa có món nào cần mang.</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {upcomingPlan.checklist.map((item) => (
              <label
                key={item.id}
                className={cn(
                  "flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer",
                  item.isDone ? "bg-brand-olive/10 border-brand-olive/30" : "bg-[#FAF4E8] border-[#E5D8C5]"
                )}
              >
                <input
                  type="checkbox"
                  checked={item.isDone}
                  onChange={() => toggleUpcomingChecklistItem(item.id)}
                  className="accent-[#C84B31]"
                />
                <span className={item.isDone ? "line-through text-paper-muted" : "text-paper-ink font-medium"}>{item.content}</span>
              </label>
            ))}
          </div>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (await addUpcomingChecklistItem(newItem)) setNewItem("");
            }}
            className="flex gap-2"
          >
            <input
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              maxLength={200}
              placeholder="+ Thêm món cần mang..."
              className="flex-1 min-w-0 bg-white border border-[#D5C5B0] rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-brand-terracotta"
            />
            <button type="submit" disabled={!newItem.trim()} className="bg-brand-terracotta disabled:opacity-40 text-white text-xs font-bold px-3 rounded-lg">
              Thêm
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
