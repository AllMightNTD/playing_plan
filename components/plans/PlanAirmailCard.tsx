"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Heart,
  Clock,
  Send,
  Check,
  ChevronDown,
  ShieldCheck,
  QrCode,
} from "lucide-react";
import { formatVietnameseDate } from "@/lib/plan-optimizer";

export interface RoomConnectionStatus {
  isPaired: boolean;
  partnerNickname: string | null;
  partnerLastSeenAt?: Date | string | null;
}

export interface PlanAirmailCardProps {
  planId: string;
  planDate: string;
  planNote?: string | null;
  onSaveNote?: (note: string) => Promise<void>;
  weather?: {
    temp?: number;
    description?: string;
    rainProb?: number;
    icon?: string;
    weatherTip?: string;
  } | null;
  sun?: {
    goldenHour?: { start: string; end: string };
    blueHour?: { start: string; end: string };
  } | null;
  roomConnection?: RoomConnectionStatus | null;
  onOpenRoomModal?: () => void;
  onShareInvitation?: () => void;
  onNotifyPartner?: () => void;
  computedTimeline: Array<{
    id: string;
    name: string;
    startTimeStr: string;
    endTimeStr: string;
    distKm: number;
    travelMins: number;
    icon?: string;
  }>;
  itineraryStats: {
    totalKm: string;
    totalDurationStr: string;
    startStr: string;
    endStr: string;
  };
  className?: string;
}

function formatPartnerSeenStatus(lastSeenAt?: Date | string | null): string {
  if (!lastSeenAt) return "Đã đồng bộ trực tiếp";
  const parsed = lastSeenAt instanceof Date ? lastSeenAt : new Date(lastSeenAt);
  if (Number.isNaN(parsed.getTime())) return "Đã đồng bộ trực tiếp";
  const diffMin = Math.max(0, Math.floor((Date.now() - parsed.getTime()) / 60000));
  if (diffMin < 2) return "Vừa mới hoạt động";
  if (diffMin < 60) return `Hoạt động ${diffMin} phút trước`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `Hoạt động ${diffHours} giờ trước`;
  return `Cập nhật ${parsed.toLocaleDateString("vi-VN")}`;
}

export function PlanAirmailCard({
  planId,
  planDate,
  planNote = "",
  onSaveNote,
  weather,
  sun,
  roomConnection,
  onOpenRoomModal,
  onShareInvitation,
  onNotifyPartner,
  computedTimeline,
  itineraryStats,
  className = "",
}: PlanAirmailCardProps) {
  const [noteText, setNoteText] = useState(
    planNote || "Mặc đồ tone be/nâu vintage cho hợp màu nắng thu Hà Nội nhé!"
  );
  const [isSavingNote, setIsSavingNote] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (planNote !== undefined && planNote !== null) {
      setNoteText(planNote);
    }
  }, [planNote]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNoteText(val);

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    if (onSaveNote) {
      saveTimeoutRef.current = setTimeout(async () => {
        setIsSavingNote(true);
        try {
          await onSaveNote(val);
        } finally {
          setIsSavingNote(false);
        }
      }, 800);
    }
  };

  const [isPartnerExpanded, setIsPartnerExpanded] = useState(false);
  const [isNoteExpanded, setIsNoteExpanded] = useState(false);

  const weatherTemp = weather?.temp ?? 28;
  const rawWeatherDesc = weather?.description || "Nắng thu dịu";
  const weatherDesc = rawWeatherDesc.split(" • ")[0];
  const rainProb = weather?.rainProb ?? 25;
  const weatherStamp = weather?.icon || "🌤️";
  const weatherTip =
    weather?.weatherTip ||
    `Xác suất mưa thấp (${rainProb}%), trời dịu mát, rất hợp dạo phố và săn hoàng hôn ngoài trời!`;

  const goldenStart = sun?.goldenHour?.start || "16:23";
  const goldenEnd = sun?.goldenHour?.end || "17:23";
  const blueStart = sun?.blueHour?.start || "17:23";
  const blueEnd = sun?.blueHour?.end || "17:53";

  const isRainExpected = rainProb >= 40 || weather?.icon === "rain" || weather?.icon === "thunder";
  const isPaired = Boolean(roomConnection?.isPaired);
  const partnerName = roomConnection?.partnerNickname?.trim() || "Người thương 💕";
  const shareAction = onShareInvitation ?? onNotifyPartner;

  return (
    <div className={`airmail-card min-w-0 overflow-hidden ${className}`.trim()}>
      <div className="bg-[#FFFDF9] rounded-[1.25rem] p-4 sm:p-6 flex flex-col justify-between space-y-5 min-w-0">
        {/* Weather & Golden Hour Forecast */}
        <div className="min-w-0">
          {/* Header Thời tiết */}
          <div className="flex items-start justify-between gap-3 mb-4 min-w-0">
            <div className="min-w-0 flex-1">
              <span className="text-[11px] font-bold uppercase tracking-widest text-paper-muted block">
                {`DỰ BÁO HẸN HÒ HÀ NỘI • ${formatVietnameseDate(planDate)}`}
              </span>
              <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 mt-1">
                <span className="font-serif text-3xl sm:text-4xl font-extrabold text-paper-ink shrink-0">{`${weatherTemp}°C`}</span>
                <span className="text-xs font-medium text-paper-muted leading-snug">
                  {`${weatherDesc} • Khả năng mưa `}
                  <strong className="text-brand-terracotta font-bold">{`${rainProb}%`}</strong>
                </span>
              </div>
            </div>

            {/* Tem Bưu Thiếp */}
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-amber-50 border-2 border-dashed border-amber-300 flex flex-col items-center justify-center text-center shadow-xs shrink-0">
              <span className="text-xl leading-none">{weatherStamp}</span>
              <span className="text-[10px] font-extrabold text-amber-800 tracking-tighter mt-1">
                HÀ NỘI
              </span>
            </div>
          </div>

          {/* Tags Khuyên dùng & OOTD */}
          <div className="flex flex-wrap gap-2 mb-4">
            {isRainExpected ? (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200/60">
                🌧️ Khuyên ưu tiên điểm trong nhà
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200/60">
                ☀️ Nắng đẹp • Săn hoàng hôn cực nét
              </span>
            )}
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200/60">
              👗 OOTD: Tone be / pastel ấm
            </span>
          </div>

          {/* Giờ vàng & Giờ xanh */}
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3 mb-3">
            <div className="p-3 sm:p-3.5 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50/70 border border-amber-200/70 min-w-0">
              <div className="text-[11px] sm:text-xs font-bold text-amber-900 flex items-center gap-1">
                🌅 Giờ vàng chụp ảnh
              </div>
              <div className="text-sm sm:text-lg font-extrabold text-paper-ink my-0.5 whitespace-nowrap">
                {`${goldenStart} - ${goldenEnd}`}
              </div>
              <div className="text-[11px] text-amber-800/80">Nắng chiều ấm áp nhất</div>
            </div>

            <div className="p-3 sm:p-3.5 rounded-2xl bg-gradient-to-br from-sky-50 to-indigo-50/70 border border-sky-200/70 min-w-0">
              <div className="text-[11px] sm:text-xs font-bold text-sky-900 flex items-center gap-1">
                🌌 Giờ xanh lên đèn
              </div>
              <div className="text-sm sm:text-lg font-extrabold text-paper-ink my-0.5 whitespace-nowrap">
                {`${blueStart} - ${blueEnd}`}
              </div>
              <div className="text-[11px] text-sky-800/80">Bầu trời xanh thẫm lãng mạn</div>
            </div>
          </div>

          {/* Visual SunCalc Sunset Gradient Bar */}
          <div className="bg-[#FAF4E8] rounded-2xl p-3 border border-[#E2D5C1] space-y-2 mb-4">
            <div className="flex justify-between items-center text-[10px] font-bold">
              <span className="text-amber-800 flex items-center gap-1">🌅 Hoàng Hôn: {goldenStart} - {goldenEnd}</span>
              <span className="text-indigo-800 flex items-center gap-1">🌌 Giờ Xanh: {blueStart} - {blueEnd}</span>
            </div>
            <div className="h-3 rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-indigo-600 relative shadow-inner overflow-hidden">
              <div className="absolute top-1/2 left-[48%] -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-amber-500 shadow-xs flex items-center justify-center text-[8px]">
                ☀️
              </div>
            </div>
            <p className="text-[10px] text-paper-muted text-center italic">
              Khung giờ vàng hoàng hôn lãng mạn nhất trong ngày để chụp ảnh cùng nhau 💖
            </p>
          </div>

          {/* Box Gợi ý */}
          <div className="p-3.5 rounded-2xl bg-[#FAF4E8] border border-[#E2D6C5] text-xs text-paper-ink leading-relaxed">
            💡 <strong className="text-paper-ink">Gợi ý cho hai bạn:</strong> {weatherTip}
          </div>
        </div>

        {/* Trạng thái cặp đôi & Ghi chú chung */}
        <div className="space-y-2.5 pt-1 min-w-0">
          {/* Trạng thái phòng đôi */}
          <div
            onClick={onOpenRoomModal}
            className="min-h-11 px-3.5 py-2.5 rounded-2xl bg-[#FAF4E8] border border-[#E2D6C5] flex items-center justify-between gap-2 cursor-pointer hover:border-brand-coral transition min-w-0"
          >
            <div className="flex items-center gap-2 text-xs font-semibold text-paper-ink flex-1 min-w-0">
              <span className="w-6 h-6 rounded-full bg-brand-peach/70 text-brand-terracotta flex items-center justify-center shrink-0">
                {isPaired ? "❤️" : "✨"}
              </span>
              <span className="truncate">
                {isPaired ? (
                  <>
                    {partnerName} •{" "}
                    <span className="text-paper-muted font-normal">
                      {formatPartnerSeenStatus(roomConnection?.partnerLastSeenAt)}
                    </span>
                  </>
                ) : (
                  <>
                    Chưa ghép đôi •{" "}
                    <span className="text-paper-muted font-medium">
                      Ghép phòng đôi bằng QR / Mã 8 ký tự
                    </span>
                  </>
                )}
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {isPaired ? (
                <>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-brand-olive/15 text-brand-olive whitespace-nowrap">
                    Đã ghép phòng đôi
                  </span>
                  <span className="text-[10px] text-paper-muted font-medium hidden sm:inline">
                    (Zero-PII)
                  </span>
                </>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 whitespace-nowrap">
                  Chưa ghép đôi
                </span>
              )}
            </div>
          </div>

          {/* Ghi chú chung */}
          <div className="rounded-2xl bg-[#FAF4E8] border border-[#E2D6C5] overflow-hidden transition min-w-0">
            <button
              type="button"
              onClick={() => setIsNoteExpanded(!isNoteExpanded)}
              className="min-h-11 w-full px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs text-paper-ink hover:bg-[#EFE5D4]/50 transition cursor-pointer min-w-0"
            >
              <div className="truncate text-paper-muted flex-1 min-w-0 text-left">
                📝 <strong className="text-paper-ink">Ghi chú chung:</strong>{" "}
                <span className="italic">{noteText || "Bấm để thêm ghi chú cho buổi hẹn..."}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {isSavingNote && (
                  <span className="text-[10px] text-brand-olive font-semibold flex items-center gap-1">
                    <Check className="w-3 h-3" /> Đang lưu...
                  </span>
                )}
                <ChevronDown
                  className={`w-4 h-4 text-paper-muted transition-transform duration-200 ${
                    isNoteExpanded ? "rotate-180" : ""
                  }`}
                />
              </div>
            </button>
            {isNoteExpanded && (
              <div className="p-3 border-t border-[#E2D6C5] bg-[#FFFDF9]">
                <textarea
                  id="plan-general-note"
                  rows={2}
                  value={noteText}
                  onChange={handleNoteChange}
                  placeholder="Ghi chú dresscode, quà tặng bí mật, lời nhắn..."
                  className="w-full px-3 py-2 text-base sm:text-xs rounded-xl border border-[#CBB292] bg-[#FFFDF9] focus:outline-none focus:border-brand-terracotta text-paper-ink leading-relaxed"
                />
              </div>
            )}
          </div>
        </div>

        {/* Tóm tắt Lịch trình theo mốc thời gian */}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-1.5 text-xs font-bold text-paper-ink mb-2.5">
            <span className="flex items-center gap-1.5 text-brand-terracotta">
              <Clock className="w-3.5 h-3.5 shrink-0" /> LỊCH TRÌNH LƯU THEO MỐC THỜI GIAN
            </span>
            <span className="text-paper-muted font-semibold whitespace-nowrap">
              {`${itineraryStats.totalKm} km • ${itineraryStats.totalDurationStr}`}
            </span>
          </div>

          <div className="space-y-2 bg-[#FAF4E8] p-3 rounded-2xl border border-[#E2D6C5] max-h-56 overflow-y-auto min-w-0">
            {computedTimeline.length === 0 ? (
              <p className="text-xs text-center text-paper-muted py-3">
                Chưa có chặng dừng nào trong kế hoạch.
              </p>
            ) : (
              computedTimeline.map((s, i) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-2 bg-[#FFFDF9] px-3 py-2 rounded-xl border border-[#E2D6C5] text-xs shadow-2xs min-w-0"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="font-bold text-brand-terracotta shrink-0 font-mono text-[11px]">
                      {`${s.startTimeStr}-${s.endTimeStr}`}
                    </span>
                    <span className="font-semibold text-paper-ink truncate">
                      {s.icon || "☕"} {s.name}
                    </span>
                  </div>
                  <span className="text-[11px] text-paper-muted font-medium shrink-0">
                    {i === 0 ? "Bắt đầu" : `+${s.travelMins}p xe`}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer Bưu thiếp */}
        <div className="pt-4 border-t border-[#E2D6C5] flex flex-wrap items-center justify-between gap-2.5">
          <span className="text-[11px] text-paper-muted">
            Cập nhật tự động theo Hà Nội •{" "}
            <span className="font-semibold text-paper-ink">Open-Meteo (CC-BY 4.0)</span>
          </span>
          <div className="flex items-center gap-2 ml-auto">
            {shareAction && (
              <button
                type="button"
                onClick={shareAction}
                className="min-h-10 px-3.5 py-1.5 rounded-xl bg-amber-100/80 hover:bg-amber-200/70 text-amber-900 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
                title="Tạo thiệp mời & gửi lịch cho người thương"
              >
                <span>💌</span> Gửi thiệp
              </button>
            )}
            <a
              href={`/api/v1/user/plans/${planId}/export.ics`}
              download
              className="min-h-10 px-3.5 py-1.5 rounded-xl bg-brand-terracotta hover:bg-brand-terracottaDark text-white text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-2xs whitespace-nowrap"
              title="Lưu vào Lịch ĐT (.ics)"
            >
              <span>📅</span> Lưu .ics
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
