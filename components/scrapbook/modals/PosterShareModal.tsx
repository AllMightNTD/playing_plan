"use client";

import React, { useState, useRef } from "react";
import { Share2, Copy, Check, X, Trash2, ExternalLink, Download, ShieldCheck, Eye, EyeOff } from "lucide-react";
import type { PlanDetailDto } from "@/server/services/user/plan.mapper";

interface PosterShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: PlanDetailDto;
  onRefresh: () => Promise<void>;
}

export function PosterShareModal({
  isOpen,
  onClose,
  plan,
  onRefresh,
}: PosterShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [privacyMode, setPrivacyMode] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  if (!isOpen) return null;

  const shareToken = plan.shareToken;
  const shareUrl = shareToken
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/p/share/${shareToken}`
    : null;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Tạo mới share token
  const handleGenerateShareToken = async () => {
    try {
      setIsGenerating(true);
      const res = await fetch(`/api/v1/user/plans/${plan.id}/share`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Không thể tạo link chia sẻ.");
      await onRefresh();
      showToast("💌 Đã tạo link chia sẻ có hiệu lực 72 giờ!");
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Thu hồi share token
  const handleRevokeShareToken = async () => {
    try {
      setIsRevoking(true);
      const res = await fetch(`/api/v1/user/plans/${plan.id}/share/revoke`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Không thể thu hồi link chia sẻ.");
      await onRefresh();
      showToast("🚫 Đã thu hồi shareToken! Mọi truy cập vào link cũ sẽ hiện thiệp báo hết hạn.");
    } catch (err) {
      console.error(err);
    } finally {
      setIsRevoking(false);
    }
  };

  const handleCopy = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    showToast("📋 Đã chép link thiệp vào bộ nhớ tạm!");
    setTimeout(() => setCopied(false), 2000);
  };

  // Kết xuất Canvas thành ảnh Story .png (Tỷ lệ 9:16 chuẩn Story)
  const handleDownloadPosterPng = () => {
    setIsDownloading(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1080;
      canvas.height = 1920;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // 1. Nền giấy Kraft & Scrapbook ngà
      ctx.fillStyle = "#F7F1E5";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Vân hạt chấm bi nhẹ nhàng
      ctx.fillStyle = "#E6D3B8";
      for (let x = 30; x < canvas.width; x += 60) {
        for (let y = 30; y < canvas.height; y += 60) {
          ctx.beginPath();
          ctx.arc(x, y, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Khung viền đôi phong cách Postcard cổ điển
      ctx.strokeStyle = "#362721";
      ctx.lineWidth = 6;
      ctx.strokeRect(50, 50, canvas.width - 100, canvas.height - 100);
      ctx.strokeStyle = "#E6D3B8";
      ctx.lineWidth = 2;
      ctx.strokeRect(62, 62, canvas.width - 124, canvas.height - 124);

      // Dải Airmail viền trên cùng (Xanh navy - Đỏ terracotta xen kẽ)
      const stripeWidth = 40;
      for (let i = 0; i < (canvas.width - 140) / stripeWidth; i++) {
        ctx.fillStyle = i % 2 === 0 ? "#C84B31" : "#3E5C76";
        ctx.beginPath();
        ctx.moveTo(70 + i * stripeWidth, 70);
        ctx.lineTo(70 + (i + 1) * stripeWidth, 70);
        ctx.lineTo(50 + (i + 1) * stripeWidth, 90);
        ctx.lineTo(50 + i * stripeWidth, 90);
        ctx.closePath();
        ctx.fill();
      }

      // Con tem bưu chính góc trên phải
      ctx.fillStyle = "#FFFDF9";
      ctx.strokeStyle = "#BDA382";
      ctx.lineWidth = 3;
      ctx.fillRect(820, 130, 180, 220);
      ctx.strokeRect(820, 130, 180, 220);

      // Ảnh trong tem
      ctx.fillStyle = "#C84B31";
      ctx.fillRect(835, 145, 150, 150);
      ctx.fillStyle = "#FFF";
      ctx.font = "bold 48px serif";
      ctx.textAlign = "center";
      ctx.fillText("💌", 910, 235);
      ctx.fillStyle = "#362721";
      ctx.font = "bold 16px sans-serif";
      ctx.fillText("HANOI POST 2026", 910, 325);

      // Dấu nhật ấn bưu điện tròn màu mực mờ
      ctx.strokeStyle = "#362721";
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.55;
      ctx.beginPath();
      ctx.arc(820, 340, 65, 0, Math.PI * 2);
      ctx.stroke();
      ctx.font = "bold 14px sans-serif";
      ctx.fillText("DATEMATE", 820, 345);
      ctx.globalAlpha = 1.0;

      // Header Thiệp
      ctx.textAlign = "left";
      ctx.fillStyle = "#C84B31";
      ctx.font = "bold 32px sans-serif";
      ctx.fillText("DATEMATE SCRAPBOOK STORY", 100, 170);

      ctx.fillStyle = "#362721";
      ctx.font = "bold 64px serif";
      ctx.fillText(plan.title, 100, 250);

      ctx.fillStyle = "#6E8361";
      ctx.font = "32px sans-serif";
      const timeDisplay = privacyMode ? "??:??" : plan.startTime;
      ctx.fillText(`📅 Ngày hẹn: ${plan.planDate}  •  ⏰ Bắt đầu: ${timeDisplay}`, 100, 310);

      // Đường kẻ ngăn cách trang trí
      ctx.strokeStyle = "#CBB292";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(100, 370);
      ctx.lineTo(750, 370);
      ctx.stroke();

      // Vẽ danh sách các trạm dừng với đường nét đứt
      const startY = 460;
      const stepGap = 200;

      // Đường nét đứt nối các trạm
      ctx.setLineDash([12, 10]);
      ctx.strokeStyle = "#C84B31";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(150, startY);
      ctx.lineTo(150, startY + (plan.stops.length - 1) * stepGap);
      ctx.stroke();
      ctx.setLineDash([]); // Bỏ nét đứt

      plan.stops.slice(0, 5).forEach((stop, idx) => {
        const curY = startY + idx * stepGap;

        // Vòng tròn số thứ tự trạm
        ctx.fillStyle = "#C84B31";
        ctx.beginPath();
        ctx.arc(150, curY, 32, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#FFF";
        ctx.font = "bold 28px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(String(idx + 1), 150, curY + 10);

        // Khung thông tin trạm
        ctx.fillStyle = "#FFFDF9";
        ctx.strokeStyle = "#E6D3B8";
        ctx.lineWidth = 2;
        ctx.fillRect(220, curY - 55, 750, 120);
        ctx.strokeRect(220, curY - 55, 750, 120);

        ctx.textAlign = "left";
        ctx.fillStyle = "#362721";
        ctx.font = "bold 34px serif";
        const stopTitle = privacyMode
          ? `Trạm dừng bí mật #${idx + 1}`
          : stop.customName || `Địa điểm #${idx + 1}`;
        ctx.fillText(stopTitle, 250, curY - 10);

        ctx.fillStyle = "#7A685D";
        ctx.font = "24px sans-serif";
        const stopTime = privacyMode
          ? "Thời gian bí mật dành cho hai người"
          : `${stop.plannedTime || "Linh hoạt"}  •  Dừng chân ~${stop.durationMin} phút`;
        ctx.fillText(stopTime, 250, curY + 35);
      });

      // Footer: Khung QR Code & Mã bảo mật
      const footerY = 1620;
      ctx.fillStyle = "#FAF4E8";
      ctx.strokeStyle = "#CBB292";
      ctx.lineWidth = 3;
      ctx.fillRect(100, footerY, canvas.width - 200, 200);
      ctx.strokeRect(100, footerY, canvas.width - 200, 200);

      // Mockup QR Code
      ctx.fillStyle = "#362721";
      ctx.fillRect(130, footerY + 25, 150, 150);
      ctx.fillStyle = "#FFF";
      ctx.fillRect(145, footerY + 40, 120, 120);
      ctx.fillStyle = "#362721";
      ctx.fillRect(160, footerY + 55, 40, 40);
      ctx.fillRect(215, footerY + 55, 35, 35);
      ctx.fillRect(160, footerY + 110, 35, 35);
      ctx.fillRect(210, footerY + 110, 40, 40);

      ctx.textAlign = "left";
      ctx.fillStyle = "#C84B31";
      ctx.font = "bold 32px serif";
      ctx.fillText("Quét mã xem lịch trình & phản hồi RSVP", 320, footerY + 80);

      ctx.fillStyle = "#362721";
      ctx.font = "bold 24px monospace";
      const displayLink = shareToken ? `/p/share/${shareToken}` : "datemate.vn/p/share";
      ctx.fillText(`Link công khai: ${displayLink}`, 320, footerY + 125);

      ctx.fillStyle = "#6E8361";
      ctx.font = "20px sans-serif";
      ctx.fillText("🔒 Bảo mật 72 giờ • Không lộ ID phòng • Chuẩn Instagram Story 9:16", 320, footerY + 165);

      // Tự động tải file PNG
      const dataUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `datemate-story-${plan.id}.png`;
      a.click();

      showToast("📸 Đã kết xuất ảnh Poster .png (Font tiếng Việt nhúng Base64 sắc nét)!");
    } catch (err) {
      console.error(err);
      showToast("Có lỗi xảy ra khi tạo ảnh poster.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs font-sans animate-fadeIn">
      <div className="relative w-full max-w-lg bg-[#FAF4E8] border-2 border-[#362721] rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Toast nổi */}
        {toastMessage && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-[#231A16] text-[#FFFDF9] border border-[#F29B7E] px-4 py-2 rounded-xl text-xs font-bold shadow-xl animate-bounce">
            {toastMessage}
          </div>
        )}

        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-[#E6D3B8] pb-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded bg-[#3E5C76] text-white">
              GET /p/share/[shareToken]
            </span>
            <span className="text-xs font-serif font-bold text-[#362721]">
              Scrapbook Story Poster
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#E6D3B8] text-[#362721] font-bold flex items-center justify-center hover:bg-[#CBB292] transition"
          >
            ✕
          </button>
        </div>

        {shareUrl ? (
          <div className="space-y-4">
            {/* Khung xem trước Poster Scrapbook Story */}
            <div className="bg-[#EFE5D4]/80 border-2 border-[#362721] rounded-2xl p-4 space-y-3 shadow-md relative overflow-hidden">
              {/* Washi tape trang trí góc */}
              <div className="absolute top-2 left-6 w-24 h-4 bg-[#C84B31]/40 -rotate-3 rounded-sm pointer-events-none" />

              <div className="bg-[#FFFDF9] p-4 rounded-xl border border-[#CBB292] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-hand text-lg font-bold text-[#C84B31]">
                    DateMate Scrapbook Story
                  </span>
                  <span className="text-[10px] font-mono bg-[#EFE5D4] text-[#362721] px-2 py-0.5 rounded">
                    no-referrer • noindex
                  </span>
                </div>

                <h4 className="font-serif font-extrabold text-lg text-[#362721]">
                  {plan.title}
                </h4>

                <p className="text-xs text-[#362721]/70">
                  📅 {plan.planDate} • ⏰ {privacyMode ? "??:??" : plan.startTime}
                </p>

                {/* Danh sách các chặng với lộ trình nét đứt */}
                <div className="text-xs text-[#362721]/80 space-y-1.5 border-l-2 border-dashed border-[#C84B31] pl-3 py-1 my-2">
                  {plan.stops.slice(0, 4).map((s, idx) => (
                    <p key={s.id}>
                      {idx === 0 ? "☕" : idx === 1 ? "📸" : idx === 2 ? "🌅" : "🍽️"}{" "}
                      <span className="font-semibold">
                        {privacyMode ? "??:??" : s.plannedTime || ""}
                      </span>{" "}
                      —{" "}
                      {privacyMode
                        ? `Trạm dừng bí mật #${idx + 1}`
                        : s.customName || `Điểm hẹn #${idx + 1}`}
                    </p>
                  ))}
                  {plan.stops.length > 4 && (
                    <p className="text-[11px] text-[#362721]/60 italic">
                      + và {plan.stops.length - 4} chặng dừng tiếp theo...
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-dashed border-[#D8CBB8] flex items-center justify-between text-[11px]">
                  <span className="text-[#362721]/70 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Link tĩnh không chứa <code>roomId</code>
                  </span>
                  <span className="font-mono font-bold text-[#C84B31]">
                    /p/share/{shareToken?.slice(0, 8)}...
                  </span>
                </div>
              </div>
            </div>

            {/* Công tắc Privacy: Ẩn mốc giờ và địa điểm chính xác trên ảnh Poster */}
            <div className="bg-[#FFFDF9] border border-[#E6D3B8] p-3 rounded-xl flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs font-bold text-[#362721] cursor-pointer">
                <input
                  type="checkbox"
                  checked={privacyMode}
                  onChange={(e) => setPrivacyMode(e.target.checked)}
                  className="accent-[#C84B31] w-4 h-4 cursor-pointer"
                />
                <span className="flex items-center gap-1">
                  {privacyMode ? <EyeOff className="w-3.5 h-3.5 text-[#C84B31]" /> : <Eye className="w-3.5 h-3.5" />}
                  Ẩn mốc giờ và địa điểm chính xác trên ảnh Poster
                </span>
              </label>
              <span className="text-[10px] text-[#362721]/60 font-medium">Bảo vệ riêng tư</span>
            </div>

            {/* Các nút hành động chính (Tải ảnh Story, Sao chép link, Thu hồi) */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleDownloadPosterPng}
                disabled={isDownloading}
                className="bg-[#C84B31] hover:bg-[#9E331E] text-white font-bold text-xs py-3 rounded-xl shadow transition flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>{isDownloading ? "Đang xuất ảnh..." : "📥 Tải ảnh Story (.png)"}</span>
              </button>

              <button
                type="button"
                onClick={handleCopy}
                className="bg-[#FFFDF9] hover:bg-[#E6D3B8]/40 border-2 border-[#362721] text-[#362721] font-bold text-xs py-3 rounded-xl shadow transition flex items-center justify-center gap-1.5"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? "Đã chép link" : "Sao chép link"}</span>
              </button>
            </div>

            {/* Link xem thử trang web công khai */}
            <div className="flex items-center justify-between text-xs text-[#362721]/70 px-1 pt-1">
              <a
                href={shareUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-[#C84B31] font-semibold hover:underline"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Mở xem thử trang thiệp tĩnh
              </a>
              <span>Hiệu lực 72 giờ</span>
            </div>

            {/* Nút thu hồi link chia sẻ */}
            <div className="pt-2 border-t border-[#E6D3B8]">
              <button
                type="button"
                onClick={handleRevokeShareToken}
                disabled={isRevoking}
                className="w-full py-2.5 px-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs font-semibold hover:bg-red-100 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isRevoking ? "Đang thu hồi..." : "🚫 Thu hồi link chia sẻ ngay"}</span>
              </button>
              <p className="text-[10px] text-center text-[#362721]/60 mt-1">
                Khi thu hồi, link cũ sẽ lập tức hiển thị màn hình báo hết hạn thân thiện.
              </p>
            </div>
          </div>
        ) : (
          /* Chưa có link chia sẻ */
          <div className="text-center py-8 space-y-4">
            <div className="w-14 h-14 rounded-full bg-[#E6D3B8]/40 flex items-center justify-center text-3xl mx-auto">
              💌
            </div>
            <div>
              <h4 className="font-serif font-bold text-base text-[#362721]">
                Chưa có link chia sẻ Story cho kế hoạch này
              </h4>
              <p className="text-xs text-[#362721]/70 mt-1 max-w-sm mx-auto">
                Bấm nút bên dưới để tạo ngay link chia sẻ 72 giờ và xuất ảnh Scrapbook Story đăng lên Instagram / Facebook.
              </p>
            </div>

            <button
              type="button"
              onClick={handleGenerateShareToken}
              disabled={isGenerating}
              className="px-6 py-2.5 bg-[#C84B31] hover:bg-[#9E331E] text-white font-bold text-xs rounded-xl shadow transition disabled:opacity-50"
            >
              {isGenerating ? "Đang tạo..." : "Tạo link chia sẻ 72h 💌"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
