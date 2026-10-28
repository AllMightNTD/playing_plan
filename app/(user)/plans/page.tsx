"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useApp } from "@/context/AppContext";
import {
  CalendarCheck,
  EyeOff,
  Gift,
  ChevronUp,
  ChevronDown,
  Trash2,
  Navigation,
  CheckSquare,
  Plus,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function PlansPage() {
  const {
    planStops,
    places,
    removeStopFromPlan,
    moveStop,
    checklist,
    toggleChecklistItem,
    secretModeEnabled,
    setSecretModeEnabled,
    exportCalendarIcs,
    setActiveDetailSlug,
  } = useApp();

  const [newChecklistText, setNewChecklistText] = useState("");

  const handleAddCustomChecklist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChecklistText.trim()) return;
    checklist.push({
      id: "c-" + Date.now(),
      text: newChecklistText.trim(),
      assignee: "Cả hai",
      done: false,
    });
    setNewChecklistText("");
  };

  const completedCount = checklist.filter((c) => c.done).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Plan Header & Actions */}
      <div className="bg-[#FFFDF9] rounded-3xl p-5 sm:p-6 border border-[#E6D7C3] shadow-xs flex flex-wrap items-center justify-between gap-4 relative">
        <div className="washi-tape washi-terracotta -top-3.5 left-10" />

        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-brand-olive/15 text-brand-olive text-xs font-bold border border-brand-olive/20">
              Lịch trình sắp tới • CN 01/11/2026
            </span>
            <span className="text-xs text-paper-muted">
              Ngân sách dự kiến: ~350k/2 người
            </span>
          </div>
          <h3 className="font-serif font-extrabold text-xl sm:text-2xl text-paper-ink mt-1.5">
            Ngắm hoàng hôn Hồ Tây & Cà phê Cầu Long Biên
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* F19 Secret Date Preview Toggle */}
          <button
            onClick={() => setSecretModeEnabled(!secretModeEnabled)}
            className={cn(
              "px-3.5 py-2 rounded-2xl text-xs font-bold border transition flex items-center gap-1.5 shadow-2xs",
              secretModeEnabled
                ? "bg-brand-terracotta text-white border-brand-terracotta"
                : "bg-brand-peach text-brand-terracottaDark border-brand-terracotta/30 hover:bg-brand-peach/80"
            )}
          >
            {secretModeEnabled ? (
              <EyeOff className="w-3.5 h-3.5" />
            ) : (
              <Gift className="w-3.5 h-3.5 text-brand-terracotta" />
            )}
            <span>
              {secretModeEnabled
                ? "Đang xem: Góc nhìn Người ấy (Bí mật F19)"
                : "Thử chế độ: Hẹn hò bất ngờ (F19)"}
            </span>
          </button>

          {/* 1-Click .ics Export */}
          <button
            onClick={exportCalendarIcs}
            className="px-4 py-2 rounded-2xl bg-brand-terracotta hover:bg-brand-terracottaDark text-white text-xs font-bold shadow-xs transition flex items-center gap-1.5"
          >
            <CalendarCheck className="w-4 h-4" />
            <span>Đồng bộ Lịch ĐT (.ics)</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Stops Timeline vs Smart Checklist */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Timeline Stops (7 cols) */}
        <div className="lg:col-span-7 bg-[#FFFDF9] rounded-3xl p-5 sm:p-6 border border-[#E6D7C3] shadow-xs space-y-4 relative">
          <div className="washi-tape washi-olive -top-3.5 left-8" />

          <div className="flex items-center justify-between">
            <h4 className="font-serif font-extrabold text-base sm:text-lg text-paper-ink">
              Lộ trình điểm dừng trong ngày (F08)
            </h4>
            <span className="text-[11px] text-paper-muted">
              Đổi thứ tự hoặc mở chỉ đường
            </span>
          </div>

          {secretModeEnabled ? (
            /* F19 SECRET DATE MYSTERY VIEW (Partner view before reveal_at) */
            <div className="p-6 sm:p-8 rounded-3xl bg-[#362721] text-white text-center space-y-4 border-2 border-dashed border-[#E6D7C3] shadow-md animate-in fade-in zoom-in-95 duration-300">
              <div className="text-5xl">🎁🔒</div>
              <span className="inline-block px-3 py-1 rounded-full bg-white/15 text-[11px] font-mono">
                F19 • Địa điểm tự động mở khóa trước giờ hẹn 2 tiếng
              </span>
              <h4 className="font-serif font-extrabold text-xl sm:text-2xl text-brand-peach">
                Dũng đã chuẩn bị một buổi hẹn bất ngờ cho Linh!
              </h4>
              <p className="text-xs sm:text-sm text-white/85 max-w-md mx-auto leading-relaxed">
                Địa điểm cụ thể sẽ tự động mở khóa lúc{" "}
                <strong className="text-brand-peach">14:30 ngày 01/11/2026</strong>. Dưới đây là gợi ý chuẩn bị để Linh
                lên đồ thật xinh nhé:
              </p>

              <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-4 text-left text-xs space-y-2 max-w-md mx-auto border border-white/10">
                <div>
                  👗 <strong>Tông màu trang phục gợi ý:</strong> Trắng kem, Nâu be hoặc Hồng đào nhạt
                </div>
                <div>
                  👟 <strong>Giày dép:</strong> Ưu tiên giày bệt hoặc sneaker êm chân
                </div>
                <div>
                  🌤️ <strong>Thời tiết dự báo:</strong> 26°C nắng dịu, có gió sông mát mẻ
                </div>
              </div>

              <button
                onClick={() => setSecretModeEnabled(false)}
                className="px-4 py-2.5 rounded-xl bg-brand-peach text-paper-ink font-bold text-xs hover:bg-brand-coral/40 transition shadow-xs"
              >
                Quay lại góc nhìn Người tạo
              </button>
            </div>
          ) : (
            /* Normal Timeline View */
            <div className="space-y-3">
              {planStops.map((stop, idx) => {
                const place = places.find((p) => p.id === stop.placeId) || places[0];
                return (
                  <div
                    key={stop.id}
                    className="p-4 rounded-2xl bg-[#FAF4E8] border border-[#E6D7C3] flex items-start justify-between gap-3 shadow-2xs hover:border-brand-terracotta/50 transition"
                  >
                    <div className="flex items-start gap-3">
                      {place.coverUrl ? (
                        <div
                          onClick={() => setActiveDetailSlug(place.slug)}
                          className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-[#E6D7C3] cursor-pointer shadow-2xs hover:scale-105 transition"
                          title={`Xem chi tiết ${place.name}`}
                        >
                          <Image
                            src={place.coverUrl}
                            alt={place.name}
                            fill
                            sizes="48px"
                            className="object-cover"
                          />
                        </div>
                      ) : null}

                      <div className="px-2.5 py-1.5 rounded-xl bg-brand-terracotta text-white font-mono font-bold text-xs text-center shrink-0 shadow-2xs flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{stop.time}</span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-lg">{place.emoji}</span>
                          <h5
                            onClick={() => setActiveDetailSlug(place.slug)}
                            className="font-serif font-bold text-sm sm:text-base text-paper-ink hover:text-brand-terracotta cursor-pointer"
                          >
                            {place.name}
                          </h5>
                        </div>
                        <p className="text-xs text-paper-muted">{stop.note}</p>

                        <div className="flex flex-wrap items-center gap-3 pt-1">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-brand-olive/15 text-brand-olive border border-brand-olive/20">
                            ✨ Khớp giờ vàng
                          </span>
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                              place.name + " Hà Nội"
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] font-bold text-brand-terracotta hover:underline flex items-center gap-1"
                          >
                            <Navigation className="w-3 h-3" />
                            <span>Chỉ đường Maps</span>
                          </a>
                        </div>
                      </div>
                    </div>

                    {/* Reorder and Delete Controls */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => moveStop(idx, -1)}
                        disabled={idx === 0}
                        className="w-7 h-7 rounded-lg bg-[#FFFDF9] hover:bg-brand-peach border border-[#E6D7C3] flex items-center justify-center text-paper-ink disabled:opacity-30 transition"
                        title="Di chuyển lên"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => moveStop(idx, 1)}
                        disabled={idx === planStops.length - 1}
                        className="w-7 h-7 rounded-lg bg-[#FFFDF9] hover:bg-brand-peach border border-[#E6D7C3] flex items-center justify-center text-paper-ink disabled:opacity-30 transition"
                        title="Di chuyển xuống"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => removeStopFromPlan(stop.id)}
                        className="w-7 h-7 rounded-lg bg-[#FFFDF9] hover:bg-red-50 border border-[#E6D7C3] flex items-center justify-center text-red-600 transition ml-1"
                        title="Xóa điểm dừng"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Smart Checklist (F10) (5 cols) */}
        <div className="lg:col-span-5 bg-[#FFFDF9] rounded-3xl p-5 sm:p-6 border border-[#E6D7C3] shadow-xs space-y-4 relative">
          <div className="washi-tape washi-terracotta -top-3.5 right-8" />

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-serif font-extrabold text-base text-paper-ink flex items-center gap-1.5">
                <CheckSquare className="w-4 h-4 text-brand-terracotta" />
                <span>F10. Checklist chuẩn bị</span>
              </h4>
              <p className="text-xs text-paper-muted">
                Gợi ý tự động theo địa điểm chụp ảnh & dạo hồ
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-brand-peach text-brand-terracottaDark font-bold text-xs">
              {completedCount}/{checklist.length}
            </span>
          </div>

          <div className="space-y-2.5">
            {checklist.map((item) => (
              <label
                key={item.id}
                onClick={() => toggleChecklistItem(item.id)}
                className={cn(
                  "p-3 rounded-2xl border flex items-center justify-between gap-3 cursor-pointer transition select-none",
                  item.done
                    ? "bg-brand-olive/10 border-brand-olive/30"
                    : "bg-[#FAF4E8] border-[#E6D7C3] hover:bg-brand-peach/20"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={item.done}
                    readOnly
                    className="w-4 h-4 accent-[#C84B31] rounded pointer-events-none"
                  />
                  <span
                    className={cn(
                      "text-xs font-medium leading-relaxed",
                      item.done ? "line-through text-paper-muted" : "text-paper-ink"
                    )}
                  >
                    {item.text}
                  </span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FFFDF9] border border-[#E6D7C3] text-paper-ink shrink-0">
                  {item.assignee}
                </span>
              </label>
            ))}
          </div>

          {/* Add custom checklist item */}
          <form onSubmit={handleAddCustomChecklist} className="flex gap-2 pt-2">
            <input
              type="text"
              value={newChecklistText}
              onChange={(e) => setNewChecklistText(e.target.value)}
              placeholder="Thêm đồ cần mang (vd: Máy ảnh film)..."
              className="flex-1 px-3 py-2 rounded-xl bg-[#FAF4E8] border border-[#E6D7C3] text-xs focus:outline-none focus:border-brand-terracotta text-paper-ink placeholder:text-paper-muted"
            />
            <button
              type="submit"
              className="px-3.5 py-2 rounded-xl bg-brand-terracotta hover:bg-brand-terracottaDark text-white text-xs font-bold shrink-0 transition flex items-center gap-1 shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
