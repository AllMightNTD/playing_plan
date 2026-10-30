"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import type { SecretNoteDto } from "@/server/services/user/gamification.service";
import { useApp } from "@/context/AppContext";

interface SecretNotesBoardProps {
  onToast?: (message: string, type?: "success" | "error" | "info") => void;
  onCheckInSuccess?: () => void;
}

export function SecretNotesBoard({ onToast, onCheckInSuccess }: SecretNotesBoardProps) {
  const [notes, setNotes] = useState<SecretNoteDto[]>([]);
  const { places, upcomingPlan, isPlaceSaved } = useApp();
  const [selectedPlaceId, setSelectedPlaceId] = useState("");

  // Quán giấu thư: ưu tiên các trạm của buổi hẹn sắp tới, rồi địa điểm đã lưu, rồi phần còn lại
  const placeOptions = useMemo(() => {
    const planPlaceIds = new Set((upcomingPlan?.stops ?? []).map((s) => s.placeId));
    const rank = (id: string, slug: string) => (planPlaceIds.has(id) ? 0 : isPlaceSaved(slug) ? 1 : 2);
    return [...places].sort((a, b) => rank(a.id, a.slug) - rank(b.id, b.slug));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [places, upcomingPlan]);
  const selectedPlace = places.find((p) => p.id === selectedPlaceId) ?? placeOptions[0];
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
    const text = contentInput.trim();
    if (!text || !selectedPlace) return;

    // 1. Cập nhật lạc quan (0ms feedback)
    const previousNotes = notes;
    const tempNote: SecretNoteDto = {
      id: "temp-" + Date.now(),
      placeId: selectedPlace.id,
      placeName: selectedPlace.name,
      district: selectedPlace.area,
      hint: `Check-in tại ${selectedPlace.name} để đọc lời nhắn ngọt ngào`,
      content: text,
      isUnlocked: true,
      isMine: true,
      createdAt: new Date(),
      unlockedAt: null,
    };
    setNotes([tempNote, ...notes]);
    setContentInput("");
    toast(`🔒 Đã giấu bức thư tình bí mật tại "${selectedPlace.name}"!`, "success");

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/v1/user/gamification/secret-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          placeId: selectedPlace.id,
          hint: `Check-in tại ${selectedPlace.name} để đọc lời nhắn ngọt ngào`,
          content: text,
        }),
      });

      if (res.ok) {
        fetchNotes();
      } else {
        setNotes(previousNotes);
        toast("Không thể gửi thư tình, vui lòng thử lại.", "error");
      }
    } catch {
      setNotes(previousNotes);
      toast("Lỗi kết nối khi gửi thư tình.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnlockNote = async (note: SecretNoteDto) => {
    // 1. Cập nhật lạc quan (0ms feedback)
    const previousNotes = notes;
    setNotes(notes.map((n) => (n.id === note.id ? { ...n, isUnlocked: true, unlockedAt: new Date() } : n)));
    toast(`💌 Đã check-in tại "${note.placeName}" và mở khóa thư tình bí mật!`, "success");
    if (onCheckInSuccess) onCheckInSuccess();

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/v1/user/gamification/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          placeId: note.placeId,
          method: "manual_confirm",
        }),
      });

      if (res.ok) {
        fetchNotes();
      } else {
        setNotes(previousNotes);
        toast("Check-in chưa thành công.", "error");
      }
    } catch {
      setNotes(previousNotes);
      toast("Lỗi kết nối khi mở thư tình.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-[#FFFDF9] border-2 border-[#D8C7B0] rounded-2xl p-5 shadow-sm flex flex-col justify-between space-y-4">
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-brand-airmailBlue text-white">
            💌 Thư Tình Ẩn Giấu
          </span>
          <span className="text-xs font-bold text-paper-muted">Bất ngờ tại quán</span>
        </div>

        <h3 className="font-serif font-extrabold text-base text-paper-ink">
          Nhắn Lời Yêu Thương Tại Điểm Hẹn
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
          value={selectedPlace?.id ?? ""}
          onChange={(e) => setSelectedPlaceId(e.target.value)}
          className="w-full text-xs font-bold bg-[#FFFDF9] border border-[#CBB292] rounded-lg px-2.5 py-1.5 text-paper-ink focus:outline-none"
        >
          {placeOptions.length === 0 && <option value="">Đang tải địa điểm...</option>}
          {placeOptions.map((p) => (
            <option key={p.id} value={p.id}>
              📍 {p.name} • {p.area}
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
          disabled={isSubmitting || !contentInput.trim() || !selectedPlace}
          className="w-full bg-brand-airmailBlue hover:bg-slate-700 text-white font-bold text-xs py-2 rounded-lg transition active:scale-98 disabled:opacity-50"
        >
          🔒 Giấu thư tình tại quán này
        </button>
      </div>
    </div>
  );
}
