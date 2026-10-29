"use client";

import React, { useState, useEffect, useCallback } from "react";
import type { BlindDateTicketDto } from "@/server/services/user/gamification.service";

interface BlindDateTicketProps {
  onCheckInSuccess?: () => void;
  onToast?: (message: string, type?: "success" | "error" | "info") => void;
}

export function BlindDateTicket({ onCheckInSuccess, onToast }: BlindDateTicketProps) {
  const [ticket, setTicket] = useState<BlindDateTicketDto | null>(null);
  const [budgetTier, setBudgetTier] = useState<"budget" | "medium" | "luxury">("medium");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        toast(`🎫 Đã tạo Vé Mù Hẹn Hò mới (${tier}) và mã hóa các trạm tiếp theo trên Server!`, "success");
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
    const placeName = currentStepData?.placeName && currentStepData.placeName !== "🔒 Server Locked"
      ? currentStepData.placeName
      : "Điểm hẹn bí mật";
    const district = currentStepData?.district || "hoan_kiem";

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/v1/user/gamification/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          placeName,
          district,
          method,
        }),
      });

      if (res.ok) {
        toast(`🔓 Check-in (${method === "gps_auto" ? "GPS <300m" : "Xác nhận thủ công"}) thành công! Server đã mở khóa chặng tiếp theo.`, "success");
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

  return (
    <div className="bg-[#FFFDF9] border-2 border-[#CBB292] rounded-2xl p-4 sm:p-5 shadow-md flex flex-col justify-between space-y-4">
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-extrabold uppercase px-2 py-0.5 rounded bg-brand-terracotta text-white">
            🎫 Blind Date Ticket
          </span>
          <select
            value={budgetTier}
            onChange={(e) => handleBudgetChange(e.target.value as "budget" | "medium" | "luxury")}
            disabled={isSubmitting}
            className="text-xs font-bold bg-[#FAF4E8] border border-[#CBB292] rounded px-2 py-1 text-paper-ink focus:outline-none"
          >
            <option value="medium">Vừa vặn (150-300k)</option>
            <option value="budget">Tiết kiệm (&lt;150k)</option>
            <option value="luxury">Kỷ niệm sang (&gt;350k)</option>
          </select>
        </div>

        <h3 className="font-serif font-extrabold text-base text-paper-ink">Hành trình Bí Mật 3 Chặng</h3>
        <p className="text-xs text-paper-muted mt-0.5">
          Server ẩn hoàn toàn các trạm sau. Phải Check-in trạm hiện tại mới mở khóa trạm kế tiếp!
        </p>

        {/* Danh sách 3 chặng */}
        <div className="space-y-2.5 my-4">
          {ticket?.steps.map((s) => {
            const unlocked = s.isUnlocked;
            return (
              <div
                key={s.step}
                className={`p-2.5 rounded-xl border text-xs transition-all ${
                  unlocked
                    ? "bg-[#FAF4E8] border-brand-terracotta shadow-xs"
                    : "bg-stone-200/70 border-stone-300 opacity-75"
                }`}
              >
                <div className="flex items-center justify-between font-bold">
                  <span className="text-paper-ink">{s.title}</span>
                  <span
                    className={
                      unlocked
                        ? "text-emerald-700 font-extrabold text-[11px] bg-emerald-100 px-1.5 py-0.5 rounded"
                        : "text-stone-600 font-bold text-[11px] bg-stone-300/80 px-1.5 py-0.5 rounded"
                    }
                  >
                    {unlocked ? "🔓 Đã mở" : "🔒 Server Locked"}
                  </span>
                </div>
                <p className="text-[11px] text-paper-muted mt-0.5 leading-snug">{s.hint}</p>
                {unlocked && (
                  <p className="text-[11px] font-extrabold text-brand-terracotta mt-1">
                    📍 Tọa độ: {s.placeName}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Nút hành động */}
      <div className="space-y-2 pt-2 border-t border-dashed border-[#D8CBB8]">
        <button
          onClick={() => handleCheckIn("gps_auto")}
          disabled={isSubmitting || ticket?.status === "completed"}
          className="w-full bg-brand-terracotta hover:bg-brand-terracottaDark text-white font-bold text-xs py-2.5 rounded-xl shadow transition active:scale-98 disabled:opacity-50"
        >
          📍 Check-in GPS (&lt;300m) Mở Chặng Tiếp
        </button>
        <button
          onClick={() => handleCheckIn("manual_confirm")}
          disabled={isSubmitting || ticket?.status === "completed"}
          className="w-full bg-[#EFE5D4] hover:bg-[#E2D2B8] text-paper-ink font-bold text-xs py-2 rounded-xl transition active:scale-98 disabled:opacity-50"
        >
          ✍️ Xác nhận thủ công (Manual Confirm)
        </button>
      </div>
    </div>
  );
}
