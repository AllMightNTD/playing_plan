"use client";

import React from "react";
import { useApp } from "@/context/AppContext";
import { X, Copy, QrCode, ShieldCheck, HeartHandshake, Sparkles } from "lucide-react";

export function RoomModal() {
  const { isRoomModalOpen, setIsRoomModalOpen, addToast } = useApp();

  if (!isRoomModalOpen) return null;

  const roomCode = "DM-89K2P4";
  const backupUrl = `https://datemate.vn/r/sync?k=${roomCode}`;

  const copyBackupLink = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(backupUrl);
      addToast(
        "🔗 Đã copy Link Sao Lưu Zalo! Hãy gửi tin nhắn này vào nhóm Zalo/Saved Messages để khôi phục mọi lúc.",
        "success"
      );
    } else {
      addToast(`Đã lưu link sao lưu: ${backupUrl}`, "info");
    }
  };

  const copyRoomCode = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(roomCode);
      addToast(`📋 Đã copy mã phòng: ${roomCode}`, "success");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-cream w-full max-w-lg rounded-3xl shadow-2xl border border-peach-soft overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 bg-[#FFF2EC] border-b border-peach-soft flex items-center justify-between">
          <div>
            <h3 className="font-display font-extrabold text-base text-brown flex items-center gap-1.5">
              <HeartHandshake className="w-4 h-4 text-peach-deep" />
              <span>Phòng Đôi Ẩn Danh & Chống Mất Phòng (F01, F02)</span>
            </h3>
            <p className="text-[11px] text-brown-muted">
              Không thu email/SĐT • Cookie <code className="font-mono text-[10px]">__Host-dm_s</code> + Silent Recovery
            </p>
          </div>
          <button
            onClick={() => setIsRoomModalOpen(false)}
            className="w-8 h-8 rounded-full bg-white hover:bg-peach-soft flex items-center justify-center text-brown transition"
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs">
          {/* Atomic Join Status Card */}
          <div className="bg-white p-3.5 rounded-2xl border border-peach-soft flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-sage-light text-sage-dark flex items-center justify-center font-bold text-sm">
                2/2
              </div>
              <div>
                <div className="font-bold text-sm text-brown">
                  Dũng (Creator) & Linh (Partner) 💕
                </div>
                <div className="text-[11px] text-brown-muted">
                  Atomic Join: <code className="font-mono text-[10px]">member_count = 2 (Đầy phòng)</code>
                </div>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-sage-light text-sage-dark font-bold text-[11px]">
              Đã ghép đôi
            </span>
          </div>

          {/* QR Code + 8-Char Code */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* QR SVG */}
            <div className="bg-white p-4 rounded-2xl border border-peach-soft flex flex-col items-center text-center space-y-2 shadow-sm">
              <span className="font-bold text-brown">Quét QR vào phòng</span>
              <svg
                className="w-28 h-28 p-2 bg-white border border-peach-soft rounded-xl shadow-inner"
                viewBox="0 0 100 100"
              >
                <rect x="8" y="8" width="26" height="26" fill="none" stroke="#3B2A2A" strokeWidth="6" />
                <rect x="16" y="16" width="10" height="10" fill="#C93F52" />
                <rect x="66" y="8" width="26" height="26" fill="none" stroke="#3B2A2A" strokeWidth="6" />
                <rect x="74" y="16" width="10" height="10" fill="#3B2A2A" />
                <rect x="8" y="66" width="26" height="26" fill="none" stroke="#3B2A2A" strokeWidth="6" />
                <rect x="16" y="74" width="10" height="10" fill="#3B2A2A" />
                <rect x="44" y="12" width="8" height="8" fill="#3B2A2A" />
                <rect x="44" y="28" width="12" height="8" fill="#C93F52" />
                <rect x="42" y="44" width="16" height="16" fill="#3B2A2A" />
                <rect x="66" y="46" width="10" height="10" fill="#C93F52" />
                <rect x="82" y="50" width="10" height="18" fill="#3B2A2A" />
                <rect x="44" y="68" width="12" height="12" fill="#3B2A2A" />
                <rect x="64" y="72" width="24" height="10" fill="#3B2A2A" />
                <rect x="72" y="84" width="18" height="8" fill="#C93F52" />
              </svg>
              <span className="text-[10px] text-brown-muted">
                Hết hạn sau 24 giờ • Bảo mật 100%
              </span>
            </div>

            {/* 8-Char Invite Code & Zalo Backup */}
            <div className="bg-white p-4 rounded-2xl border border-peach-soft flex flex-col justify-between space-y-3 shadow-sm">
              <div>
                <span className="font-bold text-brown block">Mã phòng 8 ký tự:</span>
                <div
                  onClick={copyRoomCode}
                  className="mt-1.5 font-mono font-bold text-base tracking-widest text-peach-deep bg-peach-soft/50 hover:bg-peach-soft px-3 py-2 rounded-xl text-center border border-peach cursor-pointer transition"
                  title="Bấm để copy mã"
                >
                  {roomCode}
                </div>
              </div>

              <div>
                <span className="font-bold text-brown block mb-1">
                  Sao lưu 1-chạm (Chống Safari xóa cookie):
                </span>
                <button
                  onClick={copyBackupLink}
                  className="w-full py-2 px-3 rounded-xl bg-peach-deep hover:bg-peach-hover text-white font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Link Sao Lưu Zalo</span>
                </button>
              </div>
            </div>
          </div>

          {/* Security Note */}
          <div className="p-3 rounded-2xl bg-peach-soft/50 text-brown-muted flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-sage-dark shrink-0" />
              <span>Khóa phục hồi trong LocalStorage: <strong>Auto Silent Re-auth</strong></span>
            </span>
            <span className="text-sage-dark font-bold font-mono">ASVS L1</span>
          </div>
        </div>
      </div>
    </div>
  );
}
