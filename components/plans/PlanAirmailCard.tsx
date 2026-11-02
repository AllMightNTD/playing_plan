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
  const weatherDesc = weather?.description || "Nắng thu dịu";
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
    <div className={`airmail-card ${className}`.trim()}>
      <div className="bg-[#fdfbf7] rounded-[13px] p-4 sm:p-5 flex flex-col justify-between space-y-4">
        {/* Weather & Golden Hour Forecast */}
        <div>
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[11px] font-extrabold tracking-wider text-[#7d6856] uppercase">
                {`DỰ BÁO HẸN HÒ HÀ NỘI • ${formatVietnameseDate(planDate)}`}
              </p>
              <div className="mt-1 flex items-baseline gap-2 flex-wrap">
                <span className="text-3xl font-black text-[#231915]">
                  {`${weatherTemp}°C`}
                </span>
                <span className="text-xs font-semibold text-[#5c4738]">
                  {`${weatherDesc} • Khả năng mưa `}
                  <strong className="text-[#c84b31]">{`${rainProb}%`}</strong>
                </span>
              </div>
            </div>

            <div className="bg-[#fdf6e4] border border-dashed border-[#d9be8b] rounded-xl px-3 py-2 text-center shrink-0">
              <div className="text-xl leading-none">{weatherStamp}</div>
              <span className="text-[10px] font-extrabold text-[#785118] block mt-1">
                HÀ NỘI
              </span>
            </div>
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            {isRainExpected ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#eaf2f8] text-[#1c5585] border border-[#b5d3eb]">
                🌧️ Khuyên ưu tiên điểm trong nhà
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#fdf3dc] text-[#785118] border border-[#e3c383]">
                ☀️ Nắng đẹp • Săn hoàng hôn cực nét
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#fcf0ea] text-[#8c3d23] border border-[#edd1c2]">
              👗 OOTD: Tone be / pastel
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-3.5">
            <div className="bg-[#fff9f5] border border-[#e8a48f] rounded-xl p-3">
              <p className="text-[11px] font-bold text-[#b84a27] flex items-center gap-1">
                🌅 Giờ vàng chụp ảnh
              </p>
              <p className="text-base font-black text-[#231915] mt-0.5">
                {`${goldenStart} - ${goldenEnd}`}
              </p>
              <p className="text-[11px] text-[#7d6856] mt-0.5">Nắng chiều ấm áp nhất</p>
            </div>

            <div className="bg-[#f4f8fc] border border-[#9ec1de] rounded-xl p-3">
              <p className="text-[11px] font-bold text-[#2b5b84] flex items-center gap-1">
                🌌 Giờ xanh lên đèn
              </p>
              <p className="text-base font-black text-[#1d2d3d] mt-0.5">
                {`${blueStart} - ${blueEnd}`}
              </p>
              <p className="text-[11px] text-[#5c738a] mt-0.5">Bầu trời xanh thẫm lãng mạn</p>
            </div>
          </div>

          <div className="mt-3 bg-[#fdf3d7] border border-[#e6cc8a] rounded-xl p-3 text-xs text-[#4f3d22] leading-relaxed">
            💡 <strong>Gợi ý cho hai bạn:</strong> {weatherTip}
          </div>
        </div>

        {/* Zero-PII Room Pairing & General Note Accordions */}
        <div className="border-t border-[#eee5d7] pt-3.5 space-y-2">
          <div className="bg-[#f8f4ec] border border-[#dfd3c0] rounded-xl overflow-hidden transition-all">
            <button
              type="button"
              onClick={() => setIsPartnerExpanded(!isPartnerExpanded)}
              className="w-full px-3 py-2.5 flex items-center justify-between text-left hover:bg-[#f3ece0] transition cursor-pointer"
            >
              <div className="flex items-center gap-2 truncate">
                <Heart className="w-3.5 h-3.5 text-[#c84b31] fill-[#c84b31] shrink-0" />
                <span className="text-xs font-extrabold text-[#4a3423] truncate">
                  {isPaired
                    ? `${partnerName} • ${formatPartnerSeenStatus(roomConnection?.partnerLastSeenAt)}`
                    : "Đang lên lịch một mình • Ghép phòng để cùng sửa"}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {isPaired ? (
                  <span className="text-[10px] font-bold text-[#2b6e44] bg-[#e8f4ec] px-2 py-0.5 rounded-full">
                    Đã ghép phòng đôi
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-[#785118] bg-[#fdf3dc] px-2 py-0.5 rounded-full">
                    Chưa ghép đôi
                  </span>
                )}
                <ChevronDown
                  className={`w-3.5 h-3.5 text-[#7d6856] transition-transform duration-200 ${
                    isPartnerExpanded ? "rotate-180" : ""
                  }`}
                />
              </div>
            </button>

            <div
              className={
                isPartnerExpanded
                  ? "p-3 border-t border-[#dfd3c0] bg-white space-y-2.5 block"
                  : "hidden"
              }
            >
              {isPaired ? (
                <div className="bg-[#f8f3eb] border border-[#e3d7c5] rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-extrabold text-[#2d221c]">
                      💞 {partnerName}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#2b6e44] bg-[#e8f4ec] px-2 py-0.5 rounded-full">
                      <ShieldCheck className="w-3 h-3" /> Zero-PII ẩn danh
                    </span>
                  </div>
                  <p className="text-[11px] text-[#6e5645] leading-relaxed">
                    Mọi thay đổi mốc giờ và ghi chú được đồng bộ trực tiếp trong phòng đôi mà không thu thập SĐT hay Email cá nhân.
                  </p>
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    {onOpenRoomModal && (
                      <button
                        type="button"
                        onClick={onOpenRoomModal}
                        className="text-[11px] font-bold text-[#6e5645] hover:text-[#2d221c] underline cursor-pointer"
                      >
                        Quản lý phòng đôi
                      </button>
                    )}
                    {shareAction && (
                      <button
                        type="button"
                        onClick={shareAction}
                        className="text-[11px] font-bold bg-[#c84b31]/10 hover:bg-[#c84b31]/20 text-[#c84b31] px-2.5 py-1 rounded-md transition flex items-center gap-1 cursor-pointer ml-auto"
                      >
                        <Send className="w-3 h-3" />
                        Gửi thiệp mời / Story ➔
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-[#fdf8ee] border border-[#e6cc8a] rounded-xl p-3 space-y-2">
                  <p className="text-xs font-bold text-[#3d2d24]">
                    Ghép phòng đôi bằng QR / Mã 8 ký tự (Zero-PII)
                  </p>
                  <p className="text-[11px] text-[#6e5645] leading-relaxed">
                    Không cần đăng ký SĐT hay Email. Mời người thương vào phòng để cả hai cùng kéo thả lịch trình và nhận thông báo ngay!
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {onOpenRoomModal && (
                      <button
                        type="button"
                        onClick={onOpenRoomModal}
                        className="inline-flex items-center gap-1.5 text-xs font-bold bg-[#c84b31] hover:bg-[#ad3b23] text-white px-3 py-1.5 rounded-lg transition cursor-pointer"
                      >
                        <QrCode className="w-3.5 h-3.5" /> Mở mã ghép đôi
                      </button>
                    )}
                    {shareAction && (
                      <button
                        type="button"
                        onClick={shareAction}
                        className="inline-flex items-center gap-1 text-xs font-bold text-[#785118] bg-[#fdf3dc] hover:bg-[#fae6bb] border border-[#e3c383] px-3 py-1.5 rounded-lg transition cursor-pointer"
                      >
                        <Send className="w-3 h-3" /> Gửi link thiệp hẹn
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-[#f8f4ec] border border-[#dfd3c0] rounded-xl overflow-hidden transition-all">
            <button
              type="button"
              onClick={() => setIsNoteExpanded(!isNoteExpanded)}
              className="w-full px-3 py-2.5 flex items-center justify-between text-left hover:bg-[#f3ece0] transition cursor-pointer"
            >
              <div className="flex items-center gap-2 truncate">
                <span className="text-xs">📝</span>
                <span className="text-xs font-extrabold text-[#4a3423] truncate">
                  Ghi chú chung:{" "}
                  <span className="font-normal text-[#6e5645] italic truncate">
                    {noteText || "Chưa thêm ghi chú..."}
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {isSavingNote && (
                  <span className="text-[10px] text-[#785118] font-semibold flex items-center gap-1">
                    <Check className="w-3 h-3 text-[#2b6e44]" /> Đang lưu...
                  </span>
                )}
                <ChevronDown
                  className={`w-3.5 h-3.5 text-[#7d6856] transition-transform duration-200 ${
                    isNoteExpanded ? "rotate-180" : ""
                  }`}
                />
              </div>
            </button>

            <div
              className={
                isNoteExpanded
                  ? "p-3 border-t border-[#dfd3c0] bg-white space-y-2 block"
                  : "hidden"
              }
            >
              <textarea
                id="plan-general-note"
                rows={2}
                value={noteText}
                onChange={handleNoteChange}
                placeholder="Ghi chú dresscode, quà tặng bí mật, lời nhắn..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#dfd2c0] bg-[#faf6f0] focus:bg-white focus:outline-none focus:border-[#c84b31] text-[#2d221c] leading-relaxed"
              />
            </div>
          </div>
        </div>

        {/* Saved Timeline Summary */}
        <div className="border-t border-[#eee5d7] pt-3.5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-[#5c4738] flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#c84b31]" />
              Lịch trình lưu theo mốc thời gian
            </span>
            <span className="text-[11px] font-bold text-[#785118]">
              {`${itineraryStats.totalKm} km • ${itineraryStats.totalDurationStr}`}
            </span>
          </div>

          <div className="bg-[#f8f3eb] border border-[#e3d7c5] rounded-xl p-2.5 space-y-1.5 max-h-40 overflow-y-auto">
            {computedTimeline.length === 0 ? (
              <p className="text-xs text-center text-[#8c7765] py-2">
                Chưa có chặng dừng nào trong kế hoạch.
              </p>
            ) : (
              computedTimeline.map((s, i) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-white border border-[#ede3d4]"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-mono font-bold text-[#c84b31] text-[11px]">
                      {`${s.startTimeStr}-${s.endTimeStr}`}
                    </span>
                    <span className="truncate font-semibold text-[#2d221c]">
                      {s.icon || "📍"} {s.name}
                    </span>
                  </div>
                  <span className="text-[10px] text-[#7d6856] shrink-0 ml-2">
                    {i === 0 ? "Bắt đầu" : `+${s.travelMins}p xe`}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-[#eee5d7] flex flex-wrap items-center justify-between gap-2">
          <div className="text-[11px] text-[#8c7765]">
            <span>Cập nhật tự động theo Hà Nội</span> •{" "}
            <span className="font-semibold text-[#5c4738]">Open-Meteo (CC-BY 4.0)</span>
          </div>

          <div className="flex items-center gap-2">
            {shareAction && (
              <button
                type="button"
                onClick={shareAction}
                className="inline-flex items-center gap-1 text-xs font-bold text-[#785118] bg-[#fdf3dc] hover:bg-[#fae6bb] border border-[#e3c383] px-3 py-1.5 rounded-xl transition cursor-pointer shadow-2xs"
                title="Tạo thiệp mời & gửi lịch cho người thương"
              >
                <Send className="w-3 h-3" />
                <span>Gửi thiệp</span>
              </button>
            )}
            <a
              href={`/api/v1/user/plans/${planId}/export.ics`}
              download
              className="inline-flex items-center gap-1 text-xs font-bold text-white bg-[#c84b31] hover:bg-[#ad3b23] px-3 py-1.5 rounded-xl transition shadow-2xs cursor-pointer"
              title="Lưu vào Lịch ĐT (.ics)"
            >
              <span>📅</span>
              <span>Lưu .ics</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
