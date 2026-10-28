"use client";

import React from "react";
import { useApp } from "@/context/AppContext";

export function RoomModal() {
  const { isRoomModalOpen, setIsRoomModalOpen, addToast, homeSummary } = useApp();

  if (!isRoomModalOpen) return null;

  const roomName = homeSummary?.room?.name || "Phòng Đôi Của Hai Bạn (1/2)";
  const daysLeft = homeSummary?.room?.anniversary?.daysLeft ?? 12;
  const roomCode = "HANOI-LOVE-26";
  const shareLink = `https://datemate.vn/room/${roomCode}`;

  const copyRoomLink = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(shareLink);
      addToast("🔗 Đã sao chép Link Phòng Đôi vào bộ nhớ tạm!", "info");
    } else {
      addToast(`🔗 Mã phòng đôi: ${shareLink}`, "info");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#FAF4E8] border-2 border-[#CBB292] rounded-xl max-w-lg w-full p-6 relative shadow-2xl select-none">
        <button
          onClick={() => setIsRoomModalOpen(false)}
          className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-[#E5D1B8] hover:bg-brand-terracotta hover:text-white text-paper-ink font-bold transition flex items-center justify-center shadow-xs"
          aria-label="Đóng"
        >
          ✕
        </button>

        <div className="text-center">
          <span className="bg-brand-peach text-brand-terracottaDark text-xs font-bold px-3 py-1 rounded-full">
            💑 Phòng Đôi Đồng Bộ Thời Gian Thực
          </span>
          <h3 className="font-serif font-extrabold text-2xl text-paper-ink mt-2">
            {roomName}
          </h3>
          <p className="font-hand text-xl text-brand-terracotta mt-1">
            Kỷ niệm tiếp theo còn {daysLeft} ngày nữa 💕
          </p>

          {/* Khung Mã Phòng Giả Lập QR */}
          <div className="my-4 bg-[#FFFDF9] border-2 border-dashed border-[#CBB292] rounded-xl p-4 inline-block shadow-inner">
            <div className="w-36 h-36 mx-auto bg-[#FAF4E8] border border-[#CBB292] rounded p-3 flex flex-col items-center justify-center">
              <div className="grid grid-cols-4 gap-1.5 w-full h-full">
                <div className="bg-paper-ink rounded-xs col-span-2 row-span-2" />
                <div className="bg-brand-terracotta rounded-xs" />
                <div className="bg-paper-ink rounded-xs" />
                <div className="bg-paper-ink rounded-xs" />
                <div className="bg-brand-olive rounded-xs" />
                <div className="bg-brand-terracotta rounded-xs" />
                <div className="bg-paper-ink rounded-xs col-span-2" />
                <div className="bg-paper-ink rounded-xs" />
                <div className="bg-brand-terracotta rounded-xs col-span-2" />
              </div>
            </div>
            <p className="font-mono text-xs font-bold text-paper-ink mt-2">
              MÃ PHÒNG: {roomCode}
            </p>
          </div>

          <p className="text-xs text-paper-muted max-w-sm mx-auto leading-relaxed">
            Gửi mã phòng này cho người ấy để cùng thả tim địa điểm và lên lịch hẹn hò chung theo thời gian thực!
          </p>

          <div className="mt-5 flex justify-center gap-2">
            <button
              onClick={copyRoomLink}
              className="bg-brand-terracotta hover:bg-brand-terracottaDark text-white px-4 py-2 rounded text-xs font-bold shadow transition active:scale-95"
            >
              📋 Sao chép Link mời người ấy
            </button>
            <button
              onClick={() => setIsRoomModalOpen(false)}
              className="paper-btn px-4 py-2 text-xs font-bold"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
