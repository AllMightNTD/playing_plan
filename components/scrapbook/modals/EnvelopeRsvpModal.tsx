"use client";

import React, { useState } from "react";
import { Mail, CheckCircle2, Clock, X, Heart, AlertCircle } from "lucide-react";
import type { PublicPlanPosterDto } from "@/server/services/user/plan-rsvp.service";

interface EnvelopeRsvpModalProps {
  isOpen: boolean;
  onClose: () => void;
  inviteToken: string;
  plan: PublicPlanPosterDto;
}

export function EnvelopeRsvpModal({
  isOpen,
  onClose,
  inviteToken,
  plan,
}: EnvelopeRsvpModalProps) {
  const [responderName, setResponderName] = useState("");
  const [changeNote, setChangeNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submittedStatus, setSubmittedStatus] = useState<"confirmed" | "change_requested" | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (status: "confirmed" | "change_requested") => {
    if (!responderName.trim()) {
      setErrorMsg("Vui lòng cho biết tên của bạn nhé!");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      const res = await fetch(`/api/v1/user/plans/invite/${inviteToken}/rsvp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          responderName: responderName.trim(),
          status,
          changeNote: changeNote.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error?.message || "Không thể gửi phản hồi, thử lại sau nhé.");
      }

      setSubmittedStatus(status);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Có lỗi xảy ra khi gửi phản hồi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md bg-[#F7F1E5] border-2 border-[#E6D3B8] rounded-3xl p-6 shadow-2xl overflow-hidden font-sans">
        {/* Nút đóng */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-[#362721]/60 hover:text-[#362721] rounded-full hover:bg-black/5 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Nắp phong bì vintage viền Airmail */}
        <div className="w-full h-2.5 bg-gradient-to-r from-red-600 via-blue-700 to-red-600 rounded-t-xl mb-4" />

        {submittedStatus ? (
          /* Màn hình thành công */
          <div className="text-center py-6">
            <div className="w-16 h-16 mx-auto mb-4 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-serif font-bold text-[#362721] mb-2">
              {submittedStatus === "confirmed" ? "Kèo đã chốt thành công!" : "Đã gửi lời nhắn đổi giờ!"}
            </h3>
            <p className="text-sm text-[#362721]/70 mb-6">
              Lời nhắn của bạn đã được gửi thẳng tới bảng tin thông báo phòng của người ấy rồi nhé.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 bg-[#C84B31] text-white font-medium rounded-xl hover:bg-[#9E331E] transition shadow"
            >
              Đóng thiệp
            </button>
          </div>
        ) : (
          /* Form phản hồi thiệp mời */
          <div>
            {/* Dấu sáp niêm phong đỏ mận */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-[#8F2D19] flex items-center justify-center text-white shadow-md">
                <Heart className="w-5 h-5 fill-current" />
              </div>
              <div>
                <span className="text-xs font-serif uppercase tracking-widest text-[#8F2D19] font-bold">
                  Thiệp Mời Hẹn Hò
                </span>
                <h3 className="text-lg font-bold text-[#362721] line-clamp-1">{plan.title}</h3>
              </div>
            </div>

            {/* Chi tiết lịch trình tóm tắt */}
            <div className="bg-[#FFFDF9] border border-[#E6D3B8] rounded-2xl p-4 mb-4 text-xs space-y-1.5 text-[#362721]/80">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-[#C84B31]" />
                <span className="font-medium text-[#362721]">Thời gian:</span>
                <span>{plan.startTime} ngày {plan.planDate}</span>
              </div>
              <div className="flex items-start gap-2">
                <Mail className="w-3.5 h-3.5 text-[#C84B31] mt-0.5" />
                <div>
                  <span className="font-medium text-[#362721]">Các chặng: </span>
                  <span>{plan.stops.map((s) => s.name).join(" ➔ ")}</span>
                </div>
              </div>
            </div>

            {/* Input tên khách */}
            <div className="mb-3">
              <label className="block text-xs font-bold text-[#362721] mb-1">
                Tên hoặc biệt danh của bạn <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={responderName}
                onChange={(e) => setResponderName(e.target.value)}
                placeholder="VD: Em bé, Bé Mèo, Anh yêu..."
                maxLength={60}
                className="w-full px-3.5 py-2.5 bg-[#FFFDF9] border border-[#E6D3B8] rounded-xl text-sm text-[#362721] focus:outline-none focus:ring-2 focus:ring-[#C84B31]"
              />
            </div>

            {/* Input ghi chú xin đổi giờ */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-[#362721] mb-1">
                Lời nhắn gửi gắm thêm (tùy chọn)
              </label>
              <textarea
                value={changeNote}
                onChange={(e) => setChangeNote(e.target.value)}
                placeholder="VD: Em bận chút việc, lùi lại 30 phút được không anh? Hoặc: Nhớ đón em nhé!"
                rows={2}
                maxLength={500}
                className="w-full px-3.5 py-2 bg-[#FFFDF9] border border-[#E6D3B8] rounded-xl text-xs text-[#362721] focus:outline-none focus:ring-2 focus:ring-[#C84B31]"
              />
            </div>

            {errorMsg && (
              <div className="mb-4 p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* 2 Nút hành động */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleSubmit("change_requested")}
                disabled={isSubmitting}
                className="py-2.5 px-3 bg-[#E6D3B8]/60 text-[#362721] border border-[#CBB292] rounded-xl text-xs font-semibold hover:bg-[#E6D3B8] transition disabled:opacity-50"
              >
                {isSubmitting ? "Đang gửi..." : "Xin đổi giờ xíu ⏰"}
              </button>

              <button
                type="button"
                onClick={() => handleSubmit("confirmed")}
                disabled={isSubmitting}
                className="py-2.5 px-3 bg-[#C84B31] text-white rounded-xl text-xs font-semibold hover:bg-[#9E331E] shadow-sm transition disabled:opacity-50"
              >
                {isSubmitting ? "Đang gửi..." : "Chốt luôn! 💌"}
              </button>
            </div>

            <p className="text-[10px] text-center text-[#362721]/50 mt-3">
              🔒 Phản hồi của bạn sẽ chỉ được gửi kín cho người mời, không công khai lên mạng.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
