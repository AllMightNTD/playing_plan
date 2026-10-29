"use client";

import React, { Suspense, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { NICKNAME_MAX_LENGTH } from "@/lib/constants/user";

/** Link sao lưu `/r/sync?k=...` (từ API xoay khóa): khôi phục phòng bằng khóa, cũng chỉ khi người dùng bấm. */
function RecoverRoomFromLink() {
  const router = useRouter();
  const recoveryKey = useSearchParams().get("k") ?? "";
  const { refetchHomeSummary, refreshRoomProfile, addToast } = useApp();
  const [isRestoring, setIsRestoring] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRecover = async () => {
    setIsRestoring(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/user/rooms/recovery-key/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: recoveryKey }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.error?.message || "Khóa khôi phục không đúng hoặc đã được dùng.");
        return;
      }
      setNewKey(res.headers.get("x-dm-recovery-key"));
      await Promise.all([refetchHomeSummary(), refreshRoomProfile()]);
      addToast("🔑 Đã khôi phục phòng đôi trên thiết bị này!", "success");
    } catch {
      setError("Mất kết nối, thử lại nhé.");
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-10">
      <div className="bg-[#FFFDF9] rounded-3xl p-6 sm:p-8 border border-[#E6D7C3] shadow-xs space-y-4 text-center">
        <div className="text-5xl">🔑</div>
        <h2 className="font-serif font-extrabold text-2xl text-paper-ink">Khôi phục phòng đôi</h2>
        {newKey ? (
          <>
            <p className="text-xs text-paper-muted">Khóa cũ đã hết hiệu lực. Đây là khóa khôi phục mới, lưu lại ngay nhé:</p>
            <div className="bg-[#231A16] text-amber-300 font-mono text-xs p-2.5 rounded-lg break-all">{newKey}</div>
            <button
              type="button"
              onClick={() => router.replace("/")}
              className="w-full py-3 rounded-2xl bg-brand-terracotta text-white font-bold text-sm"
            >
              Về trang chủ
            </button>
          </>
        ) : (
          <>
            <p className="text-xs text-paper-muted">Mở lại phòng đôi của hai bạn trên thiết bị này bằng link sao lưu.</p>
            <button
              type="button"
              onClick={handleRecover}
              disabled={!recoveryKey || isRestoring}
              className="w-full py-3 rounded-2xl bg-brand-terracotta hover:bg-brand-terracottaDark text-white font-bold text-sm disabled:opacity-50"
            >
              {isRestoring ? "Đang khôi phục..." : "🔑 Khôi phục phòng"}
            </button>
          </>
        )}
        {error && <p className="text-xs font-bold text-red-600">{error}</p>}
      </div>
    </div>
  );
}

/**
 * F02: link/QR mời vào phòng. Chỉ vào phòng khi người dùng bấm nút,
 * vì lời mời dùng một lần và trình xem trước link (Zalo, Messenger) sẽ tự mở trang.
 */
export default function RoomLinkPage() {
  const { token } = useParams<{ token: string }>();
  return token === "sync" ? (
    <Suspense>
      <RecoverRoomFromLink />
    </Suspense>
  ) : (
    <JoinRoom token={token} />
  );
}

function JoinRoom({ token }: { token: string }) {
  const router = useRouter();
  const { homeSummary, refetchHomeSummary, refreshRoomProfile, addToast } = useApp();

  const [nickname, setNickname] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isJoining) return;
    setIsJoining(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/user/rooms/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, ...(nickname.trim() ? { nickname: nickname.trim() } : {}) }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.error?.message || "Link mời không đúng hoặc đã hết hạn.");
        return;
      }
      await Promise.all([refetchHomeSummary(), refreshRoomProfile()]);
      addToast("💑 Đã vào phòng đôi! Cùng quẹt thẻ chọn điểm hẹn thôi.", "success");
      router.replace("/match");
    } catch {
      setError("Mất kết nối, thử lại nhé.");
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-10 animate-in fade-in duration-300">
      <div className="bg-[#FFFDF9] rounded-3xl p-6 sm:p-8 border border-[#E6D7C3] shadow-xs space-y-5 relative text-center">
        <div className="washi-tape washi-terracotta -top-3.5 left-10" />
        <div className="text-5xl">💌</div>
        <h2 className="font-serif font-extrabold text-2xl text-paper-ink">Bạn được mời vào phòng đôi</h2>
        <p className="text-xs sm:text-sm text-paper-muted leading-relaxed">
          Vào phòng để cùng người ấy quẹt thẻ chọn điểm hẹn, lên lịch và lưu kỷ niệm chung.
        </p>

        {homeSummary?.room?.isPaired && (
          <p className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
            Thiết bị này đang ở một phòng đôi đã đủ người. Rời phòng hiện tại trước khi vào phòng mới nhé.
          </p>
        )}

        <form onSubmit={handleJoin} className="space-y-3">
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={NICKNAME_MAX_LENGTH}
            placeholder="Biệt danh của bạn (không bắt buộc)"
            className="w-full px-3 py-2.5 rounded-xl bg-[#FAF4E8] border border-[#E6D7C3] text-sm focus:outline-none focus:border-brand-terracotta text-paper-ink"
          />
          <button
            type="submit"
            disabled={isJoining}
            className="w-full py-3 rounded-2xl bg-brand-terracotta hover:bg-brand-terracottaDark text-white font-bold text-sm shadow-xs transition disabled:opacity-50"
          >
            {isJoining ? "Đang vào phòng..." : "💑 Vào phòng đôi"}
          </button>
        </form>

        {error && <p className="text-xs font-bold text-red-600">{error}</p>}
      </div>
    </div>
  );
}
