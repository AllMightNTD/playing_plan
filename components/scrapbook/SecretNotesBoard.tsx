"use client";

import React, { useState, useEffect, useCallback } from "react";
import type { SecretNoteDto } from "@/server/services/user/gamification.service";

interface SecretNotesBoardProps {
  onToast?: (message: string, type?: "success" | "error" | "info") => void;
  onCheckInSuccess?: () => void;
}

const PRESET_PLACES = [
  { name: "Serein Café Cầu Long Biên", district: "hoan_kiem" },
  { name: "Bãi đá sông Hồng", district: "tay_ho" },
  { name: "Bảo Tàng Mỹ Thuật", district: "ba_dinh" },
  { name: "Sunset Bar InterContinental", district: "tay_ho" },
  { name: "Café Giảng - 39 Nguyễn Hữu Huân", district: "hoan_kiem" },
];

export function SecretNotesBoard({ onToast, onCheckInSuccess }: SecretNotesBoardProps) {
  const [notes, setNotes] = useState<SecretNoteDto[]>([]);
  const [selectedPlace, setSelectedPlace] = useState(PRESET_PLACES[0].name);
  const [contentInput, setContentInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toast = useCallback(
    (msg: string, type: "success" | "error" | "info" = "info") => {
      if (onToast) onToast(msg, type);
    },
    [onToast]
  );

  const fetchNotes = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/user/gamification/secret-notes");
      if (res.ok) {
        const json = (await res.json()) as { data: SecretNoteDto[] };
        setNotes(json.data);
      }
    } catch {
      // Ignored
    }
  }, []);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const handleCreateNote = async () => {
    const text = contentInput.trim() || "Mãi bên nhau như chiều thu Hà Nội hôm nay nhé! ❤️";
    const foundPlace = PRESET_PLACES.find((p) => p.name === selectedPlace) || PRESET_PLACES[0];

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/v1/user/gamification/secret-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          placeName: foundPlace.name,
          district: foundPlace.district,
          hint: `Check-in tại ${foundPlace.name} để đọc lời nhắn ngọt ngào`,
          content: text,
        }),
      });

      if (res.ok) {
        setContentInput("");
        toast(`🔒 Đã giấu bức thư tình bí mật tại "${foundPlace.name}"!`, "success");
        await fetchNotes();
      } else {
        toast("Không thể gửi thư tình, vui lòng thử lại.", "error");
      }
    } catch {
      toast("Lỗi kết nối khi gửi thư tình.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnlockNote = async (note: SecretNoteDto) => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/v1/user/gamification/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          placeName: note.placeName,
          district: note.district || "hoan_kiem",
          method: "gps_auto",
        }),
      });

      if (res.ok) {
        toast("💌 Đã xác thực Check-in tại quán và mở khóa Hộp thư tình bí mật!", "success");
        await fetchNotes();
        if (onCheckInSuccess) onCheckInSuccess();
      } else {
        toast("Check-in chưa thành công.", "error");
      }
    } catch {
      toast("Lỗi kết nối khi mở thư tình.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-[#FFFDF9] border-2 border-[#CBB292] rounded-2xl p-4 sm:p-5 shadow-md flex flex-col justify-between space-y-4">
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-extrabold uppercase px-2 py-0.5 rounded bg-brand-airmailBlue text-white">
            💌 Secret Notes
          </span>
          <span className="text-xs font-bold text-paper-muted">Mở khi tới quán</span>
        </div>

        <h3 className="font-serif font-extrabold text-base text-paper-ink">
          Gửi Thư Tình Ẩn Tại Tọa Độ Hẹn
        </h3>
        <p className="text-xs text-paper-muted mt-0.5">
          Lời nhắn được khóa tọa độ, chỉ bung mở khi người ấy Check-in tại quán.
        </p>

        {/* Danh sách thư tình */}
        <div id="secretNotesList" className="space-y-2.5 my-3 max-h-52 overflow-y-auto pr-1">
          {notes.length === 0 ? (
            <div className="bg-[#FAF4E8] border border-dashed border-[#D8CBB8] rounded-xl p-3 text-center text-xs text-paper-muted">
              Chưa có bức thư tình nào được giấu. Hãy chọn quán và viết lời nhắn bên dưới nhé!
            </div>
          ) : (
            notes.map((n) => (
              <div
                key={n.id}
                className={`p-2.5 rounded-xl border text-xs space-y-1 transition ${
                  n.isUnlocked
                    ? "bg-[#FFF9F2] border-brand-coral shadow-xs"
                    : "bg-[#EFE5D4] border-[#CBB292]"
                }`}
              >
                <div className="flex items-center justify-between font-bold">
                  <span className="text-paper-ink">📍 {n.placeName}</span>
                  {n.isUnlocked ? (
                    <span className="text-[10px] text-brand-olive font-extrabold bg-emerald-100 px-1.5 py-0.5 rounded">
                      🔓 Đã mở khóa
                    </span>
                  ) : (
                    <button
                      onClick={() => handleUnlockNote(n)}
                      disabled={isSubmitting}
                      className="bg-brand-terracotta hover:bg-brand-terracottaDark text-white text-[10px] px-2 py-0.5 rounded font-bold transition active:scale-95"
                    >
                      📍 Check-in mở thư
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-paper-muted italic">Gợi ý: {n.hint}</p>
                {n.isUnlocked ? (
                  <p className="font-hand text-sm sm:text-base font-bold text-brand-terracotta pt-1 leading-snug">
                    &ldquo;{n.content}&rdquo;
                  </p>
                ) : (
                  <p className="text-[11px] text-stone-500 font-mono">
                    {n.content}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Form tạo nhanh thư tình ẩn */}
      <div className="bg-[#FAF4E8] p-2.5 rounded-xl border border-[#D8CBB8] space-y-2">
        <select
          value={selectedPlace}
          onChange={(e) => setSelectedPlace(e.target.value)}
          className="w-full text-xs font-bold bg-[#FFFDF9] border border-[#CBB292] rounded-lg px-2.5 py-1.5 text-paper-ink focus:outline-none"
        >
          {PRESET_PLACES.map((p) => (
            <option key={p.name} value={p.name}>
              📍 {p.name}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={contentInput}
          onChange={(e) => setContentInput(e.target.value)}
          placeholder="Viết lời nhắn bí mật cho người ấy..."
          className="w-full text-xs bg-[#FFFDF9] border border-[#CBB292] rounded-lg px-2.5 py-1.5 text-paper-ink focus:outline-none placeholder:text-paper-muted/70"
        />
        <button
          onClick={handleCreateNote}
          disabled={isSubmitting}
          className="w-full bg-brand-airmailBlue hover:bg-slate-700 text-white font-bold text-xs py-2 rounded-lg transition active:scale-98 disabled:opacity-50"
        >
          🔒 Giấu thư tình tại quán này
        </button>
      </div>
    </div>
  );
}
