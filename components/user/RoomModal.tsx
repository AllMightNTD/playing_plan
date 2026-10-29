"use client";

import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import { useApp } from "@/context/AppContext";
import type { InviteDto } from "@/server/services/user/room.service";
import { NICKNAME_MAX_LENGTH, ROOM_NAME_MAX_LENGTH } from "@/lib/constants/user";

async function readError(res: Response, fallback: string): Promise<string> {
  const json = await res.json().catch(() => null);
  return json?.error?.message || fallback;
}

export function RoomModal() {
  const { isRoomModalOpen, setIsRoomModalOpen, addToast, homeSummary, roomProfile, refetchHomeSummary, refreshRoomProfile } =
    useApp();

  const [invite, setInvite] = useState<InviteDto | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  // Hồ sơ phòng: biệt danh của mình, tên phòng, ngày kỷ niệm
  const [nickname, setNickname] = useState("");
  const [roomName, setRoomName] = useState("");
  const [anniversaryDate, setAnniversaryDate] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Khóa khôi phục chỉ hiện đúng một lần sau khi tạo (DB chỉ lưu bản băm)
  const [recoveryKey, setRecoveryKey] = useState<string | null>(null);
  const [isRotatingKey, setIsRotatingKey] = useState(false);
  const [restoreKeyInput, setRestoreKeyInput] = useState("");
  const [isRestoring, setIsRestoring] = useState(false);
  const [isDissolving, setIsDissolving] = useState(false);

  useEffect(() => {
    if (!isRoomModalOpen || !roomProfile) return;
    setNickname(roomProfile.me.nickname ?? "");
    setRoomName(roomProfile.room.name ?? "");
    setAnniversaryDate(roomProfile.room.anniversaryDate ?? "");
  }, [isRoomModalOpen, roomProfile]);

  const inviteUrl = invite && typeof window !== "undefined" ? `${window.location.origin}${invite.path}` : null;

  useEffect(() => {
    if (!inviteUrl) {
      setQrDataUrl(null);
      return;
    }
    QRCode.toDataURL(inviteUrl, { width: 160, margin: 1, color: { dark: "#362721", light: "#FFFDF9" } })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [inviteUrl]);

  if (!isRoomModalOpen) return null;

  const room = homeSummary?.room ?? null;
  const isPaired = room?.isPaired ?? false;
  const daysLeft = room?.anniversary?.daysLeft ?? null;

  const syncRoom = async () => {
    await Promise.all([refetchHomeSummary(), refreshRoomProfile()]);
  };

  // Lần đầu tạo mã mời sẽ tạo phòng ngầm cho thiết bị này (F01)
  const handleCreateInvite = async () => {
    setIsCreatingInvite(true);
    try {
      const res = await fetch("/api/v1/user/rooms/invite", { method: "POST" });
      if (!res.ok) {
        addToast(await readError(res, "Chưa tạo được mã mời, thử lại nhé."), "error");
        return;
      }
      const json = await res.json();
      setInvite(json.data);
      await syncRoom();
    } catch {
      addToast("Mất kết nối, chưa tạo được mã mời.", "error");
    } finally {
      setIsCreatingInvite(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim() || isJoining) return;
    setIsJoining(true);
    try {
      const res = await fetch("/api/v1/user/rooms/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: joinCode.trim() }),
      });
      if (!res.ok) {
        addToast(await readError(res, "Mã mời không đúng hoặc đã hết hạn."), "error");
        return;
      }
      setJoinCode("");
      setInvite(null);
      addToast("💑 Đã vào phòng đôi! Giờ hai bạn quẹt thẻ và lên lịch chung được rồi.", "success");
      await syncRoom();
    } catch {
      addToast("Mất kết nối, chưa vào được phòng.", "error");
    } finally {
      setIsJoining(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomProfile || isSavingProfile) return;
    const patch: Record<string, string | null> = {};
    if (nickname.trim() && nickname.trim() !== (roomProfile.me.nickname ?? "")) patch.nickname = nickname.trim();
    if (roomName.trim() !== (roomProfile.room.name ?? "")) patch.roomName = roomName.trim() || null;
    if (anniversaryDate !== (roomProfile.room.anniversaryDate ?? "")) patch.anniversaryDate = anniversaryDate || null;
    if (Object.keys(patch).length === 0) return;

    setIsSavingProfile(true);
    try {
      const res = await fetch("/api/v1/user/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        addToast(await readError(res, "Chưa lưu được thông tin phòng."), "error");
        return;
      }
      addToast("✓ Đã lưu thông tin phòng đôi!", "success");
      await syncRoom();
    } catch {
      addToast("Mất kết nối, chưa lưu được thông tin phòng.", "error");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleRotateKey = async () => {
    setIsRotatingKey(true);
    try {
      const res = await fetch("/api/v1/user/rooms/recovery-key", { method: "POST" });
      if (!res.ok) {
        addToast(await readError(res, "Chưa tạo được khóa khôi phục."), "error");
        return;
      }
      const json = await res.json();
      setRecoveryKey(json.data.recoveryKey);
    } catch {
      addToast("Mất kết nối, chưa tạo được khóa khôi phục.", "error");
    } finally {
      setIsRotatingKey(false);
    }
  };

  // Khôi phục phòng trên thiết bị này; server cấp khóa mới và vô hiệu khóa vừa dùng
  const handleRestoreWithKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restoreKeyInput.trim() || isRestoring) return;
    setIsRestoring(true);
    try {
      const res = await fetch("/api/v1/user/rooms/recovery-key/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: restoreKeyInput.trim() }),
      });
      if (!res.ok) {
        addToast(await readError(res, "Khóa khôi phục không đúng."), "error");
        return;
      }
      setRestoreKeyInput("");
      setRecoveryKey(res.headers.get("x-dm-recovery-key"));
      addToast("🔑 Đã khôi phục phòng đôi trên thiết bị này!", "success");
      await syncRoom();
    } catch {
      addToast("Mất kết nối, chưa khôi phục được phòng.", "error");
    } finally {
      setIsRestoring(false);
    }
  };

  const handleDissolve = async () => {
    if (!window.confirm("Giải tán phòng đôi? Phòng và ảnh sẽ bị xóa vĩnh viễn sau 14 ngày, trong thời gian đó vẫn giữ lại được.")) {
      return;
    }
    setIsDissolving(true);
    try {
      const res = await fetch("/api/v1/user/rooms/me", { method: "DELETE" });
      if (!res.ok) {
        addToast(await readError(res, "Chưa gửi được yêu cầu giải tán."), "error");
        return;
      }
      addToast("Đã gửi yêu cầu giải tán phòng. Bạn vẫn có 14 ngày để đổi ý.", "info");
      await syncRoom();
    } catch {
      addToast("Mất kết nối, chưa gửi được yêu cầu.", "error");
    } finally {
      setIsDissolving(false);
    }
  };

  const copyText = (text: string, message: string) => {
    navigator.clipboard?.writeText(text);
    addToast(message, "info");
  };

  const copyInviteLink = () => {
    if (!inviteUrl || !invite) return;
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(inviteUrl);
      addToast("🔗 Đã sao chép link mời vào bộ nhớ tạm!", "info");
    } else {
      addToast(`🔗 Mã mời: ${invite.code}`, "info");
    }
  };

  const inputClass =
    "w-full px-3 py-2 rounded-lg bg-[#FFFDF9] border border-[#CBB292] text-xs focus:outline-none focus:border-brand-terracotta text-paper-ink";

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#FAF4E8] border-2 border-paper-ink rounded-2xl max-w-lg w-full p-5 relative shadow-2xl max-h-[90vh] overflow-y-auto">
        <button
          onClick={() => setIsRoomModalOpen(false)}
          className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-[#E5D1B8] hover:bg-brand-terracotta hover:text-white text-paper-ink font-bold transition flex items-center justify-center shadow-xs"
          aria-label="Đóng"
        >
          ✕
        </button>

        <div className="text-center">
          <span className="bg-brand-peach text-brand-terracottaDark text-xs font-bold px-3 py-1 rounded-full">
            💑 {room ? `Phòng đôi ${room.memberCount}/2` : "Chưa có phòng đôi"}
          </span>
          <h3 className="font-serif font-extrabold text-2xl text-paper-ink mt-2">
            {room?.name ?? "Mời người ấy vào phòng"}
          </h3>
          {daysLeft !== null && (
            <p className="font-hand text-xl text-brand-terracotta mt-1">Kỷ niệm tiếp theo còn {daysLeft} ngày nữa 💕</p>
          )}

          {roomProfile && roomProfile.members.length > 0 && (
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {roomProfile.members.map((m) => (
                <span
                  key={m.id}
                  className="px-2.5 py-1 rounded-full bg-[#FFFDF9] border border-[#CBB292] text-xs font-bold text-paper-ink"
                >
                  {m.nickname || "Thành viên"}
                  {m.isMe ? " (bạn)" : ""}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Mời người ấy: mã 8 ký tự + QR trỏ tới /r/{token}, dùng một lần, hạn 24 giờ */}
        {!isPaired && (
          <div className="mt-5 text-center space-y-3">
            {invite ? (
              <div className="bg-[#FFFDF9] border-2 border-dashed border-[#CBB292] rounded-xl p-4 inline-block shadow-inner">
                {qrDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={qrDataUrl} alt="Mã QR mời vào phòng đôi" width={160} height={160} className="mx-auto rounded" />
                ) : (
                  <div className="w-40 h-40 mx-auto animate-pulse bg-[#EFE5D4] rounded" />
                )}
                <p className="font-mono text-sm font-bold text-paper-ink mt-2">MÃ MỜI: {invite.code}</p>
                <p className="text-[11px] text-paper-muted">
                  Dùng một lần • hết hạn {new Date(invite.expiresAt).toLocaleString("vi-VN")}
                </p>
              </div>
            ) : (
              <p className="text-xs text-paper-muted max-w-sm mx-auto leading-relaxed">
                Tạo mã mời để người ấy quét QR hoặc nhập mã, rồi hai bạn cùng thả tim địa điểm và lên lịch chung.
              </p>
            )}

            <div className="flex justify-center gap-2">
              {invite ? (
                <button
                  onClick={copyInviteLink}
                  className="bg-brand-terracotta hover:bg-brand-terracottaDark text-white px-4 py-2 rounded text-xs font-bold shadow transition active:scale-95"
                >
                  📋 Sao chép link mời
                </button>
              ) : null}
              <button
                onClick={handleCreateInvite}
                disabled={isCreatingInvite}
                className={
                  invite
                    ? "paper-btn px-4 py-2 text-xs font-bold disabled:opacity-50"
                    : "bg-brand-terracotta hover:bg-brand-terracottaDark text-white px-4 py-2 rounded text-xs font-bold shadow transition active:scale-95 disabled:opacity-50"
                }
              >
                {isCreatingInvite ? "Đang tạo..." : invite ? "Tạo mã mới" : "💌 Tạo mã mời người ấy"}
              </button>
            </div>

            <form onSubmit={handleJoin} className="pt-3 border-t border-dashed border-[#CBB292] flex gap-2 max-w-sm mx-auto">
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="Đã có mã? Nhập DM-XXXX-XXXX"
                className={`${inputClass} font-mono uppercase`}
              />
              <button
                type="submit"
                disabled={!joinCode.trim() || isJoining}
                className="shrink-0 bg-paper-ink text-white px-3 py-2 rounded-lg text-xs font-bold disabled:opacity-40"
              >
                {isJoining ? "..." : "Vào phòng"}
              </button>
            </form>
          </div>
        )}

        {/* Biệt danh & ngày kỷ niệm: nguồn của tên phòng hiển thị khắp app */}
        {roomProfile && (
          <form onSubmit={handleSaveProfile} className="mt-5 pt-4 border-t border-[#CBB292] space-y-2.5">
            <div className="grid grid-cols-2 gap-2.5">
              <label className="text-[11px] font-bold text-paper-ink space-y-1">
                <span>Biệt danh của bạn</span>
                <input value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={NICKNAME_MAX_LENGTH} className={inputClass} />
              </label>
              <label className="text-[11px] font-bold text-paper-ink space-y-1">
                <span>Ngày kỷ niệm</span>
                <input
                  type="date"
                  value={anniversaryDate}
                  onChange={(e) => setAnniversaryDate(e.target.value)}
                  className={inputClass}
                />
              </label>
            </div>
            <label className="block text-[11px] font-bold text-paper-ink space-y-1">
              <span>Tên phòng (để trống sẽ ghép biệt danh hai bạn)</span>
              <input value={roomName} onChange={(e) => setRoomName(e.target.value)} maxLength={ROOM_NAME_MAX_LENGTH} className={inputClass} />
            </label>
            <button
              type="submit"
              disabled={isSavingProfile}
              className="w-full paper-btn py-2 text-xs font-bold disabled:opacity-50"
            >
              {isSavingProfile ? "Đang lưu..." : "Lưu thông tin phòng"}
            </button>
          </form>
        )}

        {/* Khóa khôi phục: mở lại phòng khi đổi máy hoặc xóa trình duyệt */}
        <div className="mt-5 bg-[#FFFDF9] border-2 border-brand-coral rounded-xl p-3.5 space-y-2">
          <span className="text-xs font-extrabold text-paper-ink block">🔑 Khóa khôi phục phòng đôi</span>
          <p className="text-[11px] text-paper-muted leading-relaxed">
            Dùng khóa này để mở lại phòng khi đổi điện thoại hoặc lỡ xóa dữ liệu trình duyệt. Mỗi lần dùng hoặc tạo khóa mới, khóa cũ sẽ hết hiệu lực.
          </p>
          {recoveryKey && (
            <div className="space-y-1.5">
              <div className="bg-[#231A16] text-amber-300 font-mono text-xs p-2.5 rounded-lg break-all">{recoveryKey}</div>
              <p className="text-[11px] font-bold text-brand-terracottaDark">
                Lưu khóa này vào Ghi chú ngay, DateMate không hiển thị lại được đâu nhé!
              </p>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            {roomProfile && (
              <button
                type="button"
                onClick={handleRotateKey}
                disabled={isRotatingKey}
                className="flex-1 bg-brand-terracotta hover:bg-brand-terracottaDark text-white font-bold text-xs py-2 px-3 rounded-lg transition disabled:opacity-50"
              >
                {isRotatingKey ? "Đang tạo..." : recoveryKey ? "🔄 Tạo khóa mới" : "🔑 Tạo khóa khôi phục"}
              </button>
            )}
            {recoveryKey && (
              <button
                type="button"
                onClick={() => copyText(recoveryKey, "📋 Đã chép khóa khôi phục!")}
                className="bg-[#EFE5D4] text-paper-ink font-bold text-xs py-2 px-3 rounded-lg"
              >
                📋 Chép khóa
              </button>
            )}
          </div>
          <form onSubmit={handleRestoreWithKey} className="flex gap-2 pt-1 border-t border-dashed border-[#E2D5C1]">
            <input
              value={restoreKeyInput}
              onChange={(e) => setRestoreKeyInput(e.target.value)}
              placeholder="Đã có khóa? Dán vào để khôi phục phòng"
              className={`${inputClass} font-mono`}
            />
            <button
              type="submit"
              disabled={!restoreKeyInput.trim() || isRestoring}
              className="shrink-0 bg-paper-ink text-white px-3 py-2 rounded-lg text-xs font-bold disabled:opacity-40"
            >
              {isRestoring ? "..." : "Khôi phục"}
            </button>
          </form>
        </div>

        {roomProfile && !roomProfile.room.pendingDeletedAt && (
          <div className="mt-4 pt-3 border-t border-dashed border-[#CBB292] flex flex-wrap items-center justify-between gap-2">
            <a
              href="/api/v1/user/rooms/archive"
              download
              className="bg-[#EFE5D4] hover:bg-[#E2D2B8] text-paper-ink font-bold text-xs px-3.5 py-2 rounded-xl"
            >
              📦 Tải toàn bộ Kỷ niệm (.zip)
            </a>
            <button
              type="button"
              onClick={handleDissolve}
              disabled={isDissolving}
              className="bg-red-100 hover:bg-red-200 text-red-800 font-bold text-xs px-3.5 py-2 rounded-xl border border-red-300 disabled:opacity-50"
            >
              🗑️ Yêu cầu giải tán phòng
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
