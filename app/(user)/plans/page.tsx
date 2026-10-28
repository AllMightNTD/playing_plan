"use client";

import React, { useState } from "react";
import { useApp } from "@/context/AppContext";
import {
  CalendarCheck,
  Eye,
  EyeOff,
  Gift,
  ChevronUp,
  ChevronDown,
  Trash2,
  Navigation,
  CheckSquare,
  Plus,
  Clock,
  Sparkles,
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
    // We can directly toggle or extend the checklist in state
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
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-peach-soft shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-sage-light text-sage-dark text-xs font-bold">
              Sắp tới • CN 01/11/2026
            </span>
            <span className="text-xs text-brown-muted">
              Ngân sách dự kiến: ~350k/2 người
            </span>
          </div>
          <h3 className="font-display font-extrabold text-xl sm:text-2xl text-brown mt-1.5">
            Ngắm hoàng hôn Hồ Tây & Cà phê Cầu Long Biên
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* F19 Secret Date Preview Toggle */}
          <button
            onClick={() => setSecretModeEnabled(!secretModeEnabled)}
            className={cn(
              "px-3.5 py-2 rounded-2xl text-xs font-bold border transition flex items-center gap-1.5 shadow-sm",
              secretModeEnabled
                ? "bg-brown text-white border-brown"
                : "bg-peach-soft/70 text-brown border-peach hover:bg-peach-soft"
            )}
          >
            {secretModeEnabled ? (
              <EyeOff className="w-3.5 h-3.5" />
            ) : (
              <Gift className="w-3.5 h-3.5 text-peach-deep" />
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
            className="px-4 py-2 rounded-2xl bg-peach-deep hover:bg-peach-hover text-white text-xs font-bold shadow-peach transition flex items-center gap-1.5"
          >
            <CalendarCheck className="w-4 h-4" />
            <span>Đồng bộ Lịch ĐT (.ics)</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Stops Timeline vs Smart Checklist */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Timeline Stops (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-5 sm:p-6 border border-peach-soft shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-display font-extrabold text-base sm:text-lg text-brown">
              Lộ trình điểm dừng trong ngày (F08)
            </h4>
            <span className="text-[11px] text-brown-muted">
              Đổi thứ tự hoặc mở chỉ đường
            </span>
          </div>

          {secretModeEnabled ? (
            /* F19 SECRET DATE MYSTERY VIEW (Partner view before reveal_at) */
            <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#3B2A2A] to-[#593E3E] text-white text-center space-y-4 shadow-peach-lg animate-in fade-in zoom-in-95 duration-300">
              <div className="text-5xl">🎁🔒</div>
              <span className="inline-block px-3 py-1 rounded-full bg-white/15 text-[11px] font-mono">
                F19 • API đã ẩn plan_stops tới trước giờ hẹn 2 tiếng
              </span>
              <h4 className="font-display font-extrabold text-xl sm:text-2xl">
                Dũng đã chuẩn bị một buổi hẹn bất ngờ cho Linh!
              </h4>
              <p className="text-xs sm:text-sm text-white/85 max-w-md mx-auto leading-relaxed">
                Địa điểm cụ thể sẽ tự động mở khóa lúc{" "}
                <strong>14:30 ngày 01/11/2026</strong>. Dưới đây là gợi ý chuẩn bị để Linh
                lên đồ thật xinh nhé:
              </p>

              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-left text-xs space-y-2 max-w-md mx-auto border border-white/10">
                <div>
                  👗 <strong>Tông màu trang phục gợi ý:</strong> Trắng kem, Nâu be hoặc
                  Hồng đào nhạt
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
                className="px-4 py-2.5 rounded-xl bg-peach text-brown font-bold text-xs hover:bg-peach/90 transition shadow"
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
                    className="p-4 rounded-2xl bg-cream border border-peach-soft flex items-start justify-between gap-3 shadow-xs hover:border-peach transition"
                  >
                    <div className="flex items-start gap-3">
                      <div className="px-2.5 py-1.5 rounded-xl bg-peach-deep text-white font-mono font-bold text-xs text-center shrink-0 shadow-xs flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{stop.time}</span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-lg">{place.emoji}</span>
                          <h5
                            onClick={() => setActiveDetailSlug(place.slug)}
                            className="font-display font-extrabold text-sm sm:text-base text-brown hover:text-peach-deep cursor-pointer"
                          >
                            {place.name}
                          </h5>
                        </div>
                        <p className="text-xs text-brown-muted">{stop.note}</p>

                        <div className="flex flex-wrap items-center gap-3 pt-1">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sage-light text-sage-dark">
                            ✨ Khớp giờ vàng
                          </span>
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                              place.name + " Hà Nội"
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] font-bold text-peach-deep hover:underline flex items-center gap-1"
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
                        className="w-7 h-7 rounded-lg bg-white hover:bg-peach-soft border border-peach-soft flex items-center justify-center text-brown disabled:opacity-30 transition"
                        title="Di chuyển lên"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => moveStop(idx, 1)}
                        disabled={idx === planStops.length - 1}
                        className="w-7 h-7 rounded-lg bg-white hover:bg-peach-soft border border-peach-soft flex items-center justify-center text-brown disabled:opacity-30 transition"
                        title="Di chuyển xuống"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => removeStopFromPlan(stop.id)}
                        className="w-7 h-7 rounded-lg bg-white hover:bg-red-50 border border-peach-soft flex items-center justify-center text-red-500 transition ml-1"
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
        <div className="lg:col-span-5 bg-white rounded-3xl p-5 sm:p-6 border border-peach-soft shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-display font-extrabold text-base text-brown flex items-center gap-1.5">
                <CheckSquare className="w-4 h-4 text-peach-deep" />
                <span>F10. Checklist chuẩn bị</span>
              </h4>
              <p className="text-xs text-brown-muted">
                Gợi ý tự động theo địa điểm chụp ảnh & dạo hồ
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-peach-soft text-peach-deep font-bold text-xs">
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
                    ? "bg-sage-light/40 border-sage/40"
                    : "bg-cream border-peach-soft hover:bg-peach-soft/30"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={item.done}
                    readOnly
                    className="w-4 h-4 accent-[#C93F52] rounded pointer-events-none"
                  />
                  <span
                    className={cn(
                      "text-xs font-medium leading-relaxed",
                      item.done ? "line-through text-brown-muted" : "text-brown"
                    )}
                  >
                    {item.text}
                  </span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-peach-soft text-brown shrink-0">
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
              className="flex-1 px-3 py-2 rounded-xl bg-cream border border-peach-soft text-xs focus:outline-none focus:border-peach-deep text-brown placeholder:text-brown-muted"
            />
            <button
              type="submit"
              className="px-3.5 py-2 rounded-xl bg-peach-deep hover:bg-peach-hover text-white text-xs font-bold shrink-0 transition flex items-center gap-1 shadow-sm"
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
