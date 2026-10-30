"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Heart,
  Edit3,
  Phone,
  Mail,
  Clock,
  Send,
  Check,
} from "lucide-react";
import { formatVietnameseDate } from "@/lib/plan-optimizer";

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
  partner?: {
    name?: string;
    phone?: string;
    email?: string;
    lastSync?: string;
  } | null;
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
  onNotifyPartner?: () => void;
  className?: string;
}

export function PlanAirmailCard({
  planDate,
  planNote = "",
  onSaveNote,
  weather,
  sun,
  partner,
  computedTimeline,
  itineraryStats,
  onNotifyPartner,
  className = "",
}: PlanAirmailCardProps) {
  // --- Local note state with debounce save ---
  const [noteText, setNoteText] = useState(
    planNote || "Mặc đồ tone be/nâu vintage cho hợp màu nắng thu Hà Nội nhé!"
  );
  const [isSavingNote, setIsSavingNote] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (planNote) {
      setNoteText(planNote);
    }
  }, [planNote]);

  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNoteText(val);

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

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

  // --- Partner contact editing state ---
  const [isEditingPartner, setIsEditingPartner] = useState(false);
  const [partnerForm, setPartnerForm] = useState({
    name: partner?.name || "Người thương 💕",
    phone: partner?.phone || "",
    email: partner?.email || "",
  });
  const [partnerData, setPartnerData] = useState({
    name: partner?.name || "Người thương 💕",
    phone: partner?.phone || "",
    email: partner?.email || "",
    lastSync: partner?.lastSync || "2 phút trước",
  });

  useEffect(() => {
    if (partner) {
      setPartnerData({
        name: partner.name || "Người thương 💕",
        phone: partner.phone || "",
        email: partner.email || "",
        lastSync: partner.lastSync || "2 phút trước",
      });
      setPartnerForm({
        name: partner.name || "Người thương 💕",
        phone: partner.phone || "",
        email: partner.email || "",
      });
    }
  }, [partner]);

  const handleSavePartner = (e: React.FormEvent) => {
    e.preventDefault();
    setPartnerData((prev) => ({
      ...prev,
      name: partnerForm.name.trim() || "Người thương 💕",
      phone: partnerForm.phone.trim(),
      email: partnerForm.email.trim(),
      lastSync: "Vừa xong",
    }));
    setIsEditingPartner(false);
  };

  const weatherTemp = weather?.temp ?? 28;
  const weatherDesc = weather?.description || "Nắng thu dịu";
  const rainProb = weather?.rainProb ?? 43;
  const weatherStamp = weather?.icon || "🌤️";
  const weatherTip =
    weather?.weatherTip ||
    `Xác suất mưa thấp (${rainProb}%), trời ít mây dịu mát, cực hợp săn hoàng hôn ngoài trời ở Bảo Tàng Mỹ Thuật hoặc Hồ Tây!`;

  const goldenStart = sun?.goldenHour?.start || "16:23";
  const goldenEnd = sun?.goldenHour?.end || "17:23";
  const blueStart = sun?.blueHour?.start || "17:23";
  const blueEnd = sun?.blueHour?.end || "17:53";

  return (
    <div className={`airmail-card ${className}`.trim()}>
      <div className="bg-[#fdfbf7] rounded-[13px] p-5 flex flex-col justify-between space-y-5">
        {/* PHẦN 1: DỰ BÁO HẸN HÒ HÀ NỘI */}
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

            {/* Tem bưu thiếp HÔM NAY */}
            <div className="bg-[#fdf6e4] border border-dashed border-[#d9be8b] rounded-xl px-3 py-2 text-center shrink-0">
              <div className="text-xl leading-none">{weatherStamp}</div>
              <span className="text-[10px] font-extrabold text-[#785118] block mt-1">
                HÔM NAY
              </span>
            </div>
          </div>

          {/* 2 Ô GIỜ VÀNG & GIỜ XANH LÊN ĐÈN */}
          <div className="grid grid-cols-2 gap-3 mt-4">
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

          {/* GỢI Ý THỜI TIẾT */}
          <div className="mt-3.5 bg-[#fdf3d7] border border-[#e6cc8a] rounded-xl p-3 text-xs text-[#4f3d22] leading-relaxed">
            💡 <strong>Gợi ý cho hai bạn:</strong> {weatherTip}
          </div>
        </div>

        {/* PHẦN 2: KẾT NỐI NGƯỜI THƯƠNG QUA SĐT / EMAIL */}
        <div className="border-t border-[#eee5d7] pt-4">
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#5c4738] flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-[#c84b31] fill-[#c84b31]" />
              Kết nối Người thương (SĐT / Email)
            </h3>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#2b6e44] bg-[#e8f4ec] px-2 py-0.5 rounded-full">
              {`● Đã đồng bộ (${partnerData.lastSync})`}
            </span>
          </div>

          {isEditingPartner ? (
            <form
              onSubmit={handleSavePartner}
              className="bg-[#f7f2ea] border border-[#dfd2c0] rounded-xl p-3 space-y-2.5"
            >
              <div>
                <label className="block text-[11px] font-semibold text-[#6e5645] mb-0.5">
                  Tên gọi thân mật
                </label>
                <input
                  type="text"
                  value={partnerForm.name}
                  onChange={(e) =>
                    setPartnerForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#d5c5b0] bg-white text-[#2d221c] focus:outline-none focus:border-[#c84b31]"
                  placeholder="VD: Em yêu, Anh người yêu..."
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-[#6e5645] mb-0.5">
                    Số điện thoại kết nối
                  </label>
                  <input
                    type="tel"
                    value={partnerForm.phone}
                    onChange={(e) =>
                      setPartnerForm((prev) => ({ ...prev, phone: e.target.value }))
                    }
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#d5c5b0] bg-white text-[#2d221c] focus:outline-none focus:border-[#c84b31]"
                    placeholder="09xx xxx xxx"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#6e5645] mb-0.5">
                    Email nhận lịch (.ics)
                  </label>
                  <input
                    type="email"
                    value={partnerForm.email}
                    onChange={(e) =>
                      setPartnerForm((prev) => ({ ...prev, email: e.target.value }))
                    }
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#d5c5b0] bg-white text-[#2d221c] focus:outline-none focus:border-[#c84b31]"
                    placeholder="email@gmail.com"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsEditingPartner(false)}
                  className="px-2.5 py-1 text-xs text-[#6e5645] hover:text-[#2d221c]"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 rounded-lg text-xs font-bold bg-[#c84b31] text-white hover:bg-[#b03d25] transition"
                >
                  Lưu kết nối
                </button>
              </div>
            </form>
          ) : (
            <div className="bg-[#f8f3eb] border border-[#e3d7c5] rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-[#2d221c]">
                  {partnerData.name}
                </span>
                <button
                  type="button"
                  onClick={() => setIsEditingPartner(true)}
                  className="text-[11px] font-bold text-[#c84b31] hover:underline flex items-center gap-1"
                >
                  <Edit3 className="w-3 h-3" /> Sửa SĐT / Email
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#5c4738]">
                <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-[#e6dac8]">
                  <Phone className="w-3.5 h-3.5 text-[#c84b31] shrink-0" />
                  <span className="truncate font-medium">
                    {partnerData.phone || "Chưa thêm SĐT"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-[#e6dac8]">
                  <Mail className="w-3.5 h-3.5 text-[#c84b31] shrink-0" />
                  <span className="truncate font-medium">
                    {partnerData.email || "Chưa thêm Email"}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-[#7d6856]">
                  Tự động báo khi đổi mốc giờ kéo thả
                </span>
                <button
                  type="button"
                  onClick={onNotifyPartner}
                  className="text-[11px] font-bold bg-[#c84b31]/10 hover:bg-[#c84b31]/20 text-[#c84b31] px-2.5 py-1 rounded-md transition flex items-center gap-1"
                >
                  <Send className="w-3 h-3" />
                  Gửi thông báo ngay ➔
                </button>
              </div>
            </div>
          )}
        </div>

        {/* PHẦN 3: GHI CHÚ CHUNG CHO BUỔI HẸN */}
        <div className="border-t border-[#eee5d7] pt-4">
          <div className="flex items-center justify-between mb-2">
            <label
              htmlFor="plan-general-note"
              className="text-xs font-extrabold uppercase tracking-wider text-[#5c4738]"
            >
              📝 Ghi chú chung cho buổi hẹn
            </label>
            {isSavingNote && (
              <span className="text-[10px] text-[#785118] font-semibold flex items-center gap-1">
                <Check className="w-3 h-3 text-[#2b6e44]" /> Đang lưu...
              </span>
            )}
          </div>
          <textarea
            id="plan-general-note"
            rows={2}
            value={noteText}
            onChange={handleNoteChange}
            placeholder="Ghi chú dresscode, quà tặng bí mật, lời nhắn..."
            className="w-full px-3 py-2 text-xs rounded-xl border border-[#dfd2c0] bg-[#faf6f0] focus:bg-white focus:outline-none focus:border-[#c84b31] text-[#2d221c] leading-relaxed"
          />
        </div>

        {/* PHẦN 4: TÓM TẮT LỊCH TRÌNH ĐÃ LƯU THEO TỪNG MỐC THỜI GIAN */}
        <div className="border-t border-[#eee5d7] pt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-[#5c4738] flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#c84b31]" />
              Lịch trình lưu theo mốc thời gian
            </span>
            <span className="text-[11px] font-bold text-[#785118]">
              {`${itineraryStats.totalKm} km • ${itineraryStats.totalDurationStr}`}
            </span>
          </div>

          <div className="bg-[#f8f3eb] border border-[#e3d7c5] rounded-xl p-2.5 space-y-1.5 max-h-44 overflow-y-auto">
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

        {/* CHÂN BƯU THIẾP AIRMAIL */}
        <div className="pt-2 border-t border-[#eee5d7] flex items-center justify-between text-[11px] text-[#8c7765]">
          <span>Cập nhật tự động theo Hà Nội</span>
          <span className="font-semibold text-[#5c4738]">Open-Meteo (CC-BY 4.0)</span>
        </div>
      </div>
    </div>
  );
}
