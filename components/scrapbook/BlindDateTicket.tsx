"use client";

import React, { useState, useEffect, useCallback } from "react";
import type { BlindDateTicketDto } from "@/server/services/user/gamification.service";
import { useApp } from "@/context/AppContext";
import { calculateHaversineDistanceKm } from "@/lib/travel-time";

const GPS_CHECKIN_RADIUS_KM = 0.3;

function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 })
  );
}

interface BlindDateTicketProps {
  onCheckInSuccess?: () => void;
  onToast?: (message: string, type?: "success" | "error" | "info") => void;
}

export function BlindDateTicket({ onCheckInSuccess, onToast }: BlindDateTicketProps) {
  const [ticket, setTicket] = useState<BlindDateTicketDto | null>(null);
  const [budgetTier, setBudgetTier] = useState<"budget" | "medium" | "luxury">("medium");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { places } = useApp();

  const toast = useCallback(
    (msg: string, type: "success" | "error" | "info" = "info") => {
      if (onToast) onToast(msg, type);
    },
    [onToast]
  );

  const fetchTicket = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/user/gamification/blind-date");
      if (res.ok) {
        const json = (await res.json()) as { data: BlindDateTicketDto };
        setTicket(json.data);
        if (json.data.budgetTier) setBudgetTier(json.data.budgetTier);
      }
    } catch {
      // Ignored
    }
  }, []);

  useEffect(() => {
    fetchTicket();
  }, [fetchTicket]);

  const handleBudgetChange = async (tier: "budget" | "medium" | "luxury") => {
    setBudgetTier(tier);
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/v1/user/gamification/blind-date", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ budgetTier: tier }),
      });
      if (res.ok) {
        const json = (await res.json()) as { data: BlindDateTicketDto };
        setTicket(json.data);
        toast(`🎫 Đã tạo Vé Mù Hẹn Hò mới (${tier}) các chặng sau được giữ kín tới lúc hai bạn tới nơi!`, "success");
      }
    } catch {
      toast("Không thể đổi mức ngân sách vé mù.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCheckIn = async (method: "gps_auto" | "manual_confirm") => {
    if (!ticket) return;

    if (ticket.currentStep >= ticket.totalSteps && ticket.status === "completed") {
      toast("🎉 Hai bạn đã hoàn thành trọn vẹn cả 3 chặng trên Vé Mù Hẹn Hò!", "success");
      return;
    }

    const currentStepData = ticket.steps.find((s) => s.step === ticket.currentStep);
    if (!currentStepData?.placeId) return;

    // GPS check-in: measure real Haversine distance from device position to step coordinates
    if (method === "gps_auto") {
      const place = places.find((p) => p.id === currentStepData.placeId);
      if (place?.lat == null || place?.lng == null || !navigator.geolocation) {
        toast("Không xác định được tọa độ để check-in GPS, hãy dùng xác nhận thủ công nhé.", "info");
        return;
      }
      try {
        const { coords } = await getCurrentPosition();
        const km = calculateHaversineDistanceKm(
          { lat: coords.latitude, lng: coords.longitude },
          { lat: place.lat, lng: place.lng }
        );
        if (km > GPS_CHECKIN_RADIUS_KM) {
          toast(`📍 Bạn đang cách "${place.name}" khoảng ${km.toFixed(1)} km, lại gần hơn để check-in nhé!`, "info");
          return;
        }
      } catch {
        toast("Chưa lấy được vị trí. Hãy cho phép truy cập vị trí hoặc dùng xác nhận thủ công.", "error");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/v1/user/gamification/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          placeId: currentStepData.placeId,
          method,
        }),
      });

      if (res.ok) {
        toast(`🔓 Check-in tại "${currentStepData.placeName}" thành công! Đã mở khóa chặng tiếp theo.`, "success");
        await fetchTicket();
        if (onCheckInSuccess) onCheckInSuccess();
      } else {
        toast("Check-in chưa thành công, vui lòng thử lại.", "error");
      }
    } catch {
      toast("Lỗi kết nối khi check-in.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const unlockedCount = ticket?.steps.filter((s) => s.isUnlocked).length ?? 1;

  return (
    <div className="relative bg-[#FFFDF9] border-2 border-[#D8C7B0] rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col justify-between space-y-4 min-w-0 overflow-hidden">
      {/* Perforated vintage ticket notches on left and right edges */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-3 bottom-[106px] w-6 h-6 rounded-full bg-[#F4ECE1] border-2 border-[#D8C7B0]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-3 bottom-[106px] w-6 h-6 rounded-full bg-[#F4ECE1] border-2 border-[#D8C7B0]"
      />

      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <span className="text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-brand-terracotta text-white flex items-center gap-1">
            <span>🎫 Vé Mù Hẹn Hò</span>
            <span className="text-[10px] bg-white/20 px-1.5 rounded-full">
              {unlockedCount}/3
            </span>
          </span>
          <select
            value={budgetTier}
            onChange={(e) => handleBudgetChange(e.target.value as "budget" | "medium" | "luxury")}
            disabled={isSubmitting}
            aria-label="Chọn mức ngân sách vé mù"
            className="text-base sm:text-xs font-bold bg-[#FAF4E8] border border-[#CBB292] rounded-lg px-2 py-1 text-paper-ink focus:outline-none"
          >
            <option value="medium">Vừa vặn (150-300k)</option>
            <option value="budget">Tiết kiệm (&lt;150k)</option>
            <option value="luxury">Kỷ niệm sang (&gt;350k)</option>
          </select>
        </div>

        <h3 className="font-serif font-extrabold text-base text-paper-ink">Hành Trình Bí Mật 3 Chặng</h3>
        <p className="text-xs text-paper-muted mt-0.5">
          Các điểm đến tiếp theo sẽ được giữ bí mật cho tới khi hai bạn đặt chân tới điểm hẹn hiện tại!
        </p>

        {/* 3-step visual progress bar */}
        <div className="flex items-center gap-1.5 mt-3 mb-1">
          {[1, 2, 3].map((stepNum) => {
            const stepItem = ticket?.steps.find((st) => st.step === stepNum);
            const isStepUnlocked = stepItem?.isUnlocked ?? stepNum === 1;
            return (
              <div
                key={stepNum}
                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                  isStepUnlocked ? "bg-brand-terracotta" : "bg-[#E6D8C5]"
                }`}
              />
            );
          })}
        </div>

        {/* 3-step mystery itinerary list */}
        <div className="space-y-2.5 my-3">
          {ticket?.steps.map((s) => {
            const unlocked = s.isUnlocked;
            return (
              <div
                key={s.step}
                className={`p-3 rounded-xl border text-xs transition-all relative overflow-hidden ${
                  unlocked
                    ? "bg-[#FAF4E8] border-brand-terracotta shadow-xs"
                    : "bg-[#EFE6D8]/80 border-dashed border-[#CBB292]"
                }`}
              >
                <div className="flex items-center justify-between font-bold gap-2">
                  <span className="text-paper-ink flex items-center gap-1.5">
                    <span
                      className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-extrabold ${
                        unlocked
                          ? "bg-brand-terracotta text-white"
                          : "bg-stone-300 text-stone-700"
                      }`}
                    >
                      {s.step}
                    </span>
                    <span>{s.title}</span>
                  </span>
                  <span
                    className={
                      unlocked
                        ? "text-emerald-700 font-extrabold text-[10px] bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full shrink-0"
                        : "text-amber-900 font-bold text-[10px] bg-amber-100/90 border border-amber-300 px-2 py-0.5 rounded-full shrink-0"
                    }
                  >
                    {unlocked ? "🔓 Đã mở khóa" : "🪙 Lớp phủ bí mật"}
                  </span>
                </div>
                <p className="text-[11px] text-paper-muted mt-1 leading-snug">{s.hint}</p>
                {unlocked ? (
                  <p className="text-[11px] font-extrabold text-brand-terracotta mt-1.5 flex items-center gap-1">
                    <span>📍 Điểm đến: {s.placeName}</span>
                  </p>
                ) : (
                  <p className="text-[10px] font-semibold text-stone-500 italic mt-1">
                    ✨ Check-in chặng trước để cào mở tọa độ này
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Perforated tear-off divider and action buttons */}
      <div className="space-y-2 pt-3 border-t-2 border-dashed border-[#CBB292]">
        <button
          type="button"
          onClick={() => handleCheckIn("gps_auto")}
          disabled={isSubmitting || ticket?.status === "completed"}
          className="min-h-10 w-full bg-brand-terracotta hover:bg-brand-terracottaDark text-white font-bold text-xs py-2.5 rounded-xl shadow transition active:scale-98 disabled:opacity-50 cursor-pointer"
        >
          📍 Tụi mình đã tới nơi! Mở chặng tiếp theo
        </button>
        <button
          type="button"
          onClick={() => handleCheckIn("manual_confirm")}
          disabled={isSubmitting || ticket?.status === "completed"}
          className="min-h-9 w-full bg-[#EFE5D4] hover:bg-[#E2D2B8] text-paper-ink font-bold text-xs py-2 rounded-xl transition active:scale-98 disabled:opacity-50 cursor-pointer"
        >
          ✍️ Xác nhận thủ công (đã tới nơi)
        </button>
      </div>
    </div>
  );
}
