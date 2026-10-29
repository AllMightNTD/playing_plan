"use client";

import React, { useState } from "react";
import { Clock, MapPin, Heart, Mail } from "lucide-react";
import type { PublicPlanPosterDto } from "@/server/services/user/plan-rsvp.service";
import { EnvelopeRsvpModal } from "@/components/scrapbook/modals/EnvelopeRsvpModal";

interface PublicPosterClientProps {
  shareToken: string;
  initialPlan: PublicPlanPosterDto;
}

export function PublicPosterClient({ shareToken, initialPlan }: PublicPosterClientProps) {
  const [isRsvpOpen, setIsRsvpOpen] = useState(false);

  return (
    <div className="max-w-md w-full bg-[#FFFDF9] border border-[#E6D3B8] rounded-3xl p-6 shadow-xl font-sans relative overflow-hidden">
      {/* Viền phong bì Airmail cổ điển */}
      <div className="w-full h-2.5 bg-gradient-to-r from-red-600 via-blue-700 to-red-600 rounded-t-xl mb-5" />

      {/* Dấu sáp niêm phong đỏ mận */}
      <div className="flex items-center justify-between border-b border-[#E6D3B8]/60 pb-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[#8F2D19] flex items-center justify-center text-white shadow-md">
            <Heart className="w-6 h-6 fill-current text-white" />
          </div>
          <div>
            <span className="text-[11px] font-serif uppercase tracking-widest text-[#8F2D19] font-bold block">
              Thiệp Mời Hẹn Hò
            </span>
            <h1 className="text-xl font-serif font-bold text-[#362721] line-clamp-1">
              {initialPlan.title}
            </h1>
          </div>
        </div>
      </div>

      {/* Thời gian */}
      <div className="bg-[#F7F1E5] border border-[#E6D3B8] rounded-2xl p-4 mb-5 flex items-center justify-between text-xs text-[#362721]">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#C84B31]" />
          <div>
            <span className="font-semibold block">{initialPlan.startTime}</span>
            <span className="text-[#362721]/70">{initialPlan.planDate}</span>
          </div>
        </div>
        <span className="bg-[#E6D3B8] text-[#362721] font-medium px-2.5 py-1 rounded-full text-[11px]">
          {initialPlan.stops.length} chặng hẹn hò
        </span>
      </div>

      {/* Danh sách các chặng */}
      <div className="space-y-3 mb-6">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#362721]/60">
          Lộ trình gợi ý
        </h3>
        {initialPlan.stops.map((stop, idx) => (
          <div
            key={stop.id}
            className="flex items-start gap-3 p-3 bg-[#F7F1E5]/40 border border-[#E6D3B8]/60 rounded-xl"
          >
            <div className="w-6 h-6 rounded-full bg-[#C84B31] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
              {idx + 1}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-[#362721]">{stop.name}</h4>
                {stop.plannedTime && (
                  <span className="text-xs font-mono font-bold text-[#C84B31]">
                    {stop.plannedTime}
                  </span>
                )}
              </div>
              <span className="text-[11px] text-[#362721]/60 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-[#C84B31]" />
                Thời lượng: ~{stop.durationMin} phút
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Nút Phản Hồi Thiệp Mời */}
      <button
        type="button"
        onClick={() => setIsRsvpOpen(true)}
        className="w-full py-3.5 px-4 bg-[#C84B31] text-white font-serif font-bold rounded-2xl hover:bg-[#9E331E] transition shadow-md flex items-center justify-center gap-2 text-base"
      >
        <Mail className="w-5 h-5" />
        Phản hồi thiệp mời 💌
      </button>

      <p className="text-[11px] text-center text-[#362721]/50 mt-3">
        Bấm nút trên để chốt giờ hoặc gửi lời nhắn riêng cho người ấy
      </p>

      {/* Modal RSVP phong bì */}
      <EnvelopeRsvpModal
        isOpen={isRsvpOpen}
        onClose={() => setIsRsvpOpen(false)}
        inviteToken={shareToken}
        plan={initialPlan}
      />
    </div>
  );
}
