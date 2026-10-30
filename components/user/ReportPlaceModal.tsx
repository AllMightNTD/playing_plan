"use client";

import React, { useState } from "react";
import { Flag, X, CheckCircle, AlertCircle } from "lucide-react";

interface ReportPlaceModalProps {
  slug: string;
  placeName: string;
}

const REPORT_REASONS = [
  { value: "closed", label: "Quán đã đóng cửa / chuyển địa điểm" },
  { value: "wrong_hours", label: "Sai giờ mở cửa hoặc ngày hoạt động" },
  { value: "wrong_price", label: "Mức giá thực tế chênh lệch nhiều" },
  { value: "wrong_location", label: "Sai vị trí ghim trên bản đồ" },
  { value: "inappropriate", label: "Địa điểm không phù hợp / nguy hiểm / lừa đảo" },
];

export function ReportPlaceModal({ slug, placeName }: ReportPlaceModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState("closed");
  const [details, setDetails] = useState("");
  const [honeypot, setHoneypot] = useState(""); // Honeypot field để chặn bot
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (honeypot) {
      // Bot rơi vào bẫy honeypot, âm thầm bỏ qua
      setIsOpen(false);
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/v1/user/places/${slug}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason,
          details: details.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          setIsOpen(false);
          setSuccess(false);
          setDetails("");
        }, 2500);
      } else {
        setErrorMsg(json.error?.message || "Không thể gửi báo cáo lúc này.");
      }
    } catch (err) {
      setErrorMsg("Lỗi kết nối máy chủ. Vui lòng thử lại sau.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => {
          setIsOpen(true);
          setErrorMsg(null);
          setSuccess(false);
        }}
        className="inline-flex items-center gap-1.5 text-xs text-brown-muted hover:text-red-600 transition-colors py-1.5 px-3 rounded-full hover:bg-red-50 border border-transparent hover:border-red-100"
      >
        <Flag className="w-3.5 h-3.5" />
        <span>Báo thông tin sai</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-peach-soft animate-in fade-in zoom-in-95 duration-150 max-h-[90dvh] overflow-y-auto overscroll-contain">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-red-50 text-red-600 flex items-center justify-center">
                  <Flag className="w-4 h-4" />
                </span>
                <h3 className="font-display font-bold text-base text-brown">
                  Báo thông tin sai
                </h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-brown-muted hover:text-brown p-1 rounded-full hover:bg-cream"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-brown-muted mb-4">
              Cảm ơn bạn đã hỗ trợ cộng đồng DateMate hoàn thiện thông tin về{" "}
              <span className="font-semibold text-brown">{placeName}</span>.
            </p>

            {success ? (
              <div className="py-8 text-center space-y-2">
                <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto" />
                <h4 className="font-bold text-sm text-brown">Đã tiếp nhận báo cáo!</h4>
                <p className="text-xs text-brown-muted">
                  Đội ngũ DateMate sẽ đối soát và cập nhật thông tin trong thời gian sớm nhất.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Honeypot field (ẩn khỏi mắt người dùng) */}
                <input
                  type="text"
                  name="website_url_check"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                  style={{ display: "none" }}
                  tabIndex={-1}
                  autoComplete="off"
                />

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-brown">
                    Lý do báo cáo:
                  </label>
                  <div className="space-y-1.5">
                    {REPORT_REASONS.map((r) => (
                      <label
                        key={r.value}
                        className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition ${
                          reason === r.value
                            ? "bg-peach-soft/50 border-peach-deep text-brown font-semibold"
                            : "bg-white border-peach-soft/60 text-brown-muted hover:bg-cream"
                        }`}
                      >
                        <input
                          type="radio"
                          name="reason"
                          value={r.value}
                          checked={reason === r.value}
                          onChange={(e) => setReason(e.target.value)}
                          className="text-peach-deep focus:ring-peach-deep"
                        />
                        <span>{r.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-brown">
                    Mô tả bổ sung (tùy chọn):
                  </label>
                  <textarea
                    rows={3}
                    maxLength={500}
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    placeholder="Ví dụ: Quán mới đổi sang số nhà 45 hoặc đã chuyển sang bán online..."
                    className="w-full p-3 rounded-xl border border-peach-soft text-xs text-brown focus:outline-none focus:ring-2 focus:ring-peach-deep/30 focus:border-peach-deep resize-none"
                  />
                  <div className="text-[10px] text-right text-brown-muted">
                    {details.length}/500
                  </div>
                </div>

                {errorMsg && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-2 rounded-xl border border-peach-soft text-xs font-bold text-brown-muted hover:bg-cream transition"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 rounded-xl bg-peach-deep text-white text-xs font-bold hover:bg-peach-deep/90 transition shadow-sm disabled:opacity-50"
                  >
                    {submitting ? "Đang gửi..." : "Gửi báo cáo"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
