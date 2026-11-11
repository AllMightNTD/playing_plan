"use client";

import React, { useState, useRef } from "react";
import { Share2, Copy, Check, X, Trash2, ExternalLink, Download, ShieldCheck, Eye, EyeOff } from "lucide-react";
import QRCode from "qrcode";
import type { PlanDetailDto, PlanStopDto } from "@/server/services/user/plan.mapper";
import type { HanoiPlace } from "@/lib/types/catalog";

interface PosterShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: PlanDetailDto;
  onRefresh: () => Promise<void>;
  /** Catalog để lấy tên địa điểm cho các trạm chỉ lưu placeId */
  places?: HanoiPlace[];
}

type PosterThemeKey = "kraft" | "rose" | "midnight";

const POSTER_THEMES: Record<
  PosterThemeKey,
  {
    label: string;
    emoji: string;
    bg: string;
    dot: string;
    cardBg: string;
    border: string;
    accent: string;
    textMain: string;
    textSub: string;
    previewOuter: string;
    previewInner: string;
  }
> = {
  kraft: {
    label: "Giấy Kraft Cổ Điển",
    emoji: "📜",
    bg: "#F7F1E5",
    dot: "#E6D3B8",
    cardBg: "#FFFDF9",
    border: "#362721",
    accent: "#C84B31",
    textMain: "#362721",
    textSub: "#6E8361",
    previewOuter: "bg-[#EFE5D4]/80 border-[#362721]",
    previewInner: "bg-[#FFFDF9] border-[#CBB292] text-[#362721]",
  },
  rose: {
    label: "Hồng Thơ Mộng",
    emoji: "🌸",
    bg: "#FFF0F3",
    dot: "#FBCFE8",
    cardBg: "#FFFDF9",
    border: "#881337",
    accent: "#E11D48",
    textMain: "#4C0519",
    textSub: "#9F1239",
    previewOuter: "bg-rose-100/80 border-rose-900",
    previewInner: "bg-[#FFFDF9] border-rose-300 text-rose-950",
  },
  midnight: {
    label: "Đêm Hà Nội",
    emoji: "🌙",
    bg: "#1E293B",
    dot: "#334155",
    cardBg: "#0F172A",
    border: "#F59E0B",
    accent: "#F59E0B",
    textMain: "#F8FAFC",
    textSub: "#CBD5E1",
    previewOuter: "bg-slate-900 border-amber-400",
    previewInner: "bg-slate-800 border-slate-700 text-amber-50",
  },
};

export function PosterShareModal({
  isOpen,
  onClose,
  plan,
  onRefresh,
  places = [],
}: PosterShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [privacyMode, setPrivacyMode] = useState(false);
  const [posterTheme, setPosterTheme] = useState<PosterThemeKey>("kraft");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const activeTheme = POSTER_THEMES[posterTheme];

  if (!isOpen) return null;

  const shareToken = plan.shareToken;
  const shareUrl = shareToken
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/p/share/${shareToken}`
    : null;

  const stopName = (stop: PlanStopDto, idx: number) =>
    stop.customName ||
    (stop.placeId && places.find((place) => place.id === stop.placeId)?.name) ||
    `Điểm hẹn #${idx + 1}`;

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
      showToast("🚫 Đã thu hồi link! Ai mở link cũ sẽ thấy thiệp đã hết hạn.");
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

  const handleNativeShare = async () => {
    if (!shareUrl) return;
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: `Thiệp hẹn DateMate: ${plan.title}`,
          text: `💌 Mời người thương xem lịch trình hẹn hò "${plan.title}" ngày ${plan.planDate}!`,
          url: shareUrl,
        });
        showToast("📲 Đã mở bảng chia sẻ nhanh!");
        return;
      } catch {
        // User cancelled or share failed; fall back to copy
      }
    }
    handleCopy();
  };

  // Render 1080x1920 9:16 Story Canvas PNG with active theme
  const handleDownloadPosterPng = async () => {
    setIsDownloading(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1080;
      canvas.height = 1920;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // 1. Theme background and subtle dot grid
      ctx.fillStyle = activeTheme.bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = activeTheme.dot;
      for (let x = 30; x < canvas.width; x += 60) {
        for (let y = 30; y < canvas.height; y += 60) {
          ctx.beginPath();
          ctx.arc(x, y, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Classic double postcard border
      ctx.strokeStyle = activeTheme.border;
      ctx.lineWidth = 6;
      ctx.strokeRect(50, 50, canvas.width - 100, canvas.height - 100);
      ctx.strokeStyle = activeTheme.dot;
      ctx.lineWidth = 2;
      ctx.strokeRect(62, 62, canvas.width - 124, canvas.height - 124);

      // Top airmail stripe
      const stripeWidth = 40;
      for (let i = 0; i < (canvas.width - 140) / stripeWidth; i++) {
        ctx.fillStyle = i % 2 === 0 ? activeTheme.accent : "#3E5C76";
        ctx.beginPath();
        ctx.moveTo(70 + i * stripeWidth, 70);
        ctx.lineTo(70 + (i + 1) * stripeWidth, 70);
        ctx.lineTo(50 + (i + 1) * stripeWidth, 90);
        ctx.lineTo(50 + i * stripeWidth, 90);
        ctx.closePath();
        ctx.fill();
      }

      // Top-right postage stamp
      ctx.fillStyle = activeTheme.cardBg;
      ctx.strokeStyle = activeTheme.border;
      ctx.lineWidth = 3;
      ctx.fillRect(820, 130, 180, 220);
      ctx.strokeRect(820, 130, 180, 220);

      ctx.fillStyle = activeTheme.accent;
      ctx.fillRect(835, 145, 150, 150);
      ctx.fillStyle = "#FFF";
      ctx.font = "bold 48px serif";
      ctx.textAlign = "center";
      ctx.fillText(activeTheme.emoji, 910, 235);
      ctx.fillStyle = activeTheme.textMain;
      ctx.font = "bold 16px sans-serif";
      ctx.fillText("HANOI POST 2026", 910, 325);

      // Circular postmark stamp
      ctx.strokeStyle = activeTheme.textMain;
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.55;
      ctx.beginPath();
      ctx.arc(820, 340, 65, 0, Math.PI * 2);
      ctx.stroke();
      ctx.font = "bold 14px sans-serif";
      ctx.fillText("DATEMATE", 820, 345);
      ctx.globalAlpha = 1.0;

      // Poster header
      ctx.textAlign = "left";
      ctx.fillStyle = activeTheme.accent;
      ctx.font = "bold 32px sans-serif";
      ctx.fillText("DATEMATE SCRAPBOOK STORY", 100, 170);

      ctx.fillStyle = activeTheme.textMain;
      ctx.font = "bold 64px serif";
      ctx.fillText(plan.title, 100, 250);

      ctx.fillStyle = activeTheme.textSub;
      ctx.font = "32px sans-serif";
      const timeDisplay = privacyMode ? "??:??" : plan.startTime;
      ctx.fillText(`📅 Ngày hẹn: ${plan.planDate}  •  ⏰ Bắt đầu: ${timeDisplay}`, 100, 310);

      // Divider line
      ctx.strokeStyle = activeTheme.dot;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(100, 370);
      ctx.lineTo(750, 370);
      ctx.stroke();

      // Stops with dashed route line
      const startY = 460;
      const stepGap = 200;

      ctx.setLineDash([12, 10]);
      ctx.strokeStyle = activeTheme.accent;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(150, startY);
      ctx.lineTo(150, startY + (plan.stops.length - 1) * stepGap);
      ctx.stroke();
      ctx.setLineDash([]);

      plan.stops.slice(0, 5).forEach((stop, idx) => {
        const curY = startY + idx * stepGap;

        ctx.fillStyle = activeTheme.accent;
        ctx.beginPath();
        ctx.arc(150, curY, 32, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#FFF";
        ctx.font = "bold 28px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(String(idx + 1), 150, curY + 10);

        ctx.fillStyle = activeTheme.cardBg;
        ctx.strokeStyle = activeTheme.dot;
        ctx.lineWidth = 2;
        ctx.fillRect(220, curY - 55, 750, 120);
        ctx.strokeRect(220, curY - 55, 750, 120);

        ctx.textAlign = "left";
        ctx.fillStyle = activeTheme.textMain;
        ctx.font = "bold 34px serif";
        const stopTitle = privacyMode
          ? `Trạm dừng bí mật #${idx + 1}`
          : stopName(stop, idx);
        ctx.fillText(stopTitle, 250, curY - 10);

        ctx.fillStyle = activeTheme.textSub;
        ctx.font = "24px sans-serif";
        const stopTime = privacyMode
          ? "Thời gian bí mật dành cho hai người"
          : `${stop.plannedTime || "Linh hoạt"}  •  Dừng chân ~${stop.durationMin} phút`;
        ctx.fillText(stopTime, 250, curY + 35);
      });

      // Footer QR box
      const footerY = 1620;
      ctx.fillStyle = activeTheme.cardBg;
      ctx.strokeStyle = activeTheme.dot;
      ctx.lineWidth = 3;
      ctx.fillRect(100, footerY, canvas.width - 200, 200);
      ctx.strokeRect(100, footerY, canvas.width - 200, 200);

      if (shareUrl) {
        const qrCanvas = document.createElement("canvas");
        await QRCode.toCanvas(qrCanvas, shareUrl, {
          width: 150,
          margin: 1,
          color: { dark: "#362721", light: "#FFFFFF" },
        });
        ctx.drawImage(qrCanvas, 130, footerY + 25, 150, 150);
      }

      ctx.textAlign = "left";
      ctx.fillStyle = activeTheme.accent;
      ctx.font = "bold 32px serif";
      ctx.fillText("Quét mã xem lịch trình & phản hồi RSVP", 320, footerY + 80);

      ctx.fillStyle = activeTheme.textMain;
      ctx.font = "bold 24px monospace";
      const displayLink = shareUrl ? shareUrl.replace(/^https?:\/\//, "") : "";
      ctx.fillText(`Link: ${displayLink}`, 320, footerY + 125, 640);

      ctx.fillStyle = activeTheme.textSub;
      ctx.font = "20px sans-serif";
      ctx.fillText("🔒 Bảo mật 72 giờ • Không lộ ID phòng • Chuẩn Instagram Story 9:16", 320, footerY + 165);

      // Tự động tải file PNG
      const dataUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `datemate-story-${plan.id}.png`;
      a.click();

      showToast("📸 Đã xuất ảnh Poster .png kèm mã QR!");
    } catch (err) {
      console.error(err);
      showToast("Có lỗi xảy ra khi tạo ảnh poster.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/65 backdrop-blur-xs font-sans animate-fadeIn"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Thiệp hẹn Scrapbook Story"
        className="relative w-full sm:max-w-lg bg-[#FAF4E8] border-t-2 sm:border-2 border-[#362721] rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] sm:pb-6 shadow-2xl space-y-4 max-h-[92dvh] sm:max-h-[90vh] overflow-y-auto overscroll-contain"
      >
        <div
          aria-hidden="true"
          className="w-10 h-1.5 rounded-full bg-[#CBB292] mx-auto -mt-1 mb-1 sm:hidden"
        />
        {/* Floating toast */}
        {toastMessage && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-[#231A16] text-[#FFFDF9] border border-[#F29B7E] px-4 py-2 rounded-xl text-xs font-bold shadow-xl animate-bounce">
            {toastMessage}
          </div>
        )}

        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-[#E6D3B8] pb-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-[#3E5C76] text-white">
              💌 Thiệp hẹn
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
            {/* 3-Theme selector for Poster Story */}
            <div className="flex items-center justify-between gap-2 bg-[#FFFDF9] border border-[#E6D3B8] p-2 rounded-xl">
              {(Object.keys(POSTER_THEMES) as PosterThemeKey[]).map((key) => {
                const t = POSTER_THEMES[key];
                const isSelected = posterTheme === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setPosterTheme(key)}
                    aria-pressed={isSelected}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                      isSelected
                        ? "bg-[#362721] text-white shadow-xs"
                        : "text-[#362721] hover:bg-[#FAF4E8]"
                    }`}
                  >
                    <span>{t.emoji}</span>
                    <span className="truncate">{t.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Live Scrapbook Story Poster Preview */}
            <div className={`${activeTheme.previewOuter} border-2 rounded-2xl p-4 space-y-3 shadow-md relative overflow-hidden transition-colors`}>
              {/* Decorative corner washi tape */}
              <div className="absolute top-2 left-6 w-24 h-4 bg-[#C84B31]/40 -rotate-3 rounded-sm pointer-events-none" />

              <div className={`${activeTheme.previewInner} p-4 rounded-xl border space-y-2.5 transition-colors`}>
                <div className="flex items-center justify-between">
                  <span className="font-hand text-lg font-bold text-[#C84B31]">
                    {activeTheme.emoji} DateMate Scrapbook Story
                  </span>
                  <span className="text-[10px] font-bold bg-[#EFE5D4] text-[#362721] px-2 py-0.5 rounded">
                    🔒 Riêng tư
                  </span>
                </div>

                <h4 className="font-serif font-extrabold text-lg">
                  {plan.title}
                </h4>

                <p className="text-xs opacity-75">
                  📅 {plan.planDate} • ⏰ {privacyMode ? "??:??" : plan.startTime}
                </p>

                {/* Stops with dashed route line */}
                <div className="text-xs opacity-90 space-y-1.5 border-l-2 border-dashed border-[#C84B31] pl-3 py-1 my-2">
                  {plan.stops.slice(0, 4).map((s, idx) => (
                    <p key={s.id}>
                      {idx === 0 ? "☕" : idx === 1 ? "📸" : idx === 2 ? "🌅" : "🍽️"}{" "}
                      <span className="font-semibold">
                        {privacyMode ? "??:??" : s.plannedTime || ""}
                      </span>{" "}
                      —{" "}
                      {privacyMode
                        ? `Trạm dừng bí mật #${idx + 1}`
                        : stopName(s, idx)}
                    </p>
                  ))}
                  {plan.stops.length > 4 && (
                    <p className="text-[11px] opacity-60 italic">
                      + và {plan.stops.length - 4} chặng dừng tiếp theo...
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-dashed border-[#D8CBB8]/60 flex items-center justify-between text-[11px]">
                  <span className="opacity-75 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    Link không lộ thông tin phòng đôi
                  </span>
                  <span className="font-mono font-bold text-[#C84B31]">
                    Hiệu lực 72 giờ
                  </span>
                </div>
              </div>
            </div>

            {/* Privacy toggle switch */}
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

            {/* Primary actions: Download Story PNG, Native Share, Copy Link */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={handleDownloadPosterPng}
                disabled={isDownloading}
                className="min-h-11 bg-[#C84B31] hover:bg-[#9E331E] text-white font-bold text-xs py-2.5 px-3 rounded-xl shadow transition flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <Download className="w-4 h-4 shrink-0" />
                <span>{isDownloading ? "Đang xuất..." : "📥 Tải Story (.png)"}</span>
              </button>

              <button
                type="button"
                onClick={handleNativeShare}
                className="min-h-11 bg-[#3E5C76] hover:bg-slate-700 text-white font-bold text-xs py-2.5 px-3 rounded-xl shadow transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Share2 className="w-4 h-4 shrink-0" />
                <span>📲 Chia sẻ nhanh</span>
              </button>

              <button
                type="button"
                onClick={handleCopy}
                className="min-h-11 bg-[#FFFDF9] hover:bg-[#E6D3B8]/40 border-2 border-[#362721] text-[#362721] font-bold text-xs py-2.5 px-3 rounded-xl shadow transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600 shrink-0" /> : <Copy className="w-4 h-4 shrink-0" />}
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
