"use client";

import React, { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useApp } from "@/context/AppContext";
import type { MemoryBoardDto, MemoryNoteDto } from "@/server/services/user/memory.service";
import type { MemoryNoteColor } from "@/lib/constants/user";

const NOTE_COLOR_STYLES: Record<MemoryNoteColor, { card: string; divider: string; label: string; pin: string }> = {
  peach: { card: "bg-[#FADCD2] border-[#E2A995]", divider: "border-[#E2A995]", label: "text-brand-terracottaDark", pin: "bg-brand-olive" },
  yellow: { card: "bg-[#F9EFC7] border-[#DFC98B]", divider: "border-[#D5BE7E]", label: "text-brand-terracotta", pin: "bg-brand-terracotta" },
  olive: { card: "bg-[#E3EBD9] border-[#AFC29F]", divider: "border-[#AFC29F]", label: "text-[#2F4225]", pin: "bg-brand-mustard" },
};
const NOTE_COLORS = Object.keys(NOTE_COLOR_STYLES) as MemoryNoteColor[];

function formatDayMonthYear(value: string | Date, separator = "/"): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return [String(d.getDate()).padStart(2, "0"), String(d.getMonth() + 1).padStart(2, "0"), d.getFullYear()].join(separator);
}

function formatNoteTime(value: string | Date): string {
  const d = new Date(value);
  const minutes = Math.round((Date.now() - d.getTime()) / 60000);
  if (minutes < 1) return "Vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;
  if (minutes < 24 * 60) return `${Math.floor(minutes / 60)} giờ trước`;
  return formatDayMonthYear(d);
}

/** Bảng gỗ bần: giấy nhớ của phòng, đếm ngược ngày kỷ niệm và polaroid các buổi hẹn đã đi. */
export function MemoryCorkboard() {
  const { homeSummary, refetchHomeSummary, addToast, setIsRoomModalOpen } = useApp();
  const room = homeSummary?.room ?? null;
  const anniversary = room?.anniversary ?? null;
  const daysLeft = anniversary?.daysLeft ?? null;

  const [memoryBoard, setMemoryBoard] = useState<MemoryBoardDto>({ notes: [], memories: [] });
  const [isLoadingMemories, setIsLoadingMemories] = useState<boolean>(true);
  const [isComposingNote, setIsComposingNote] = useState<boolean>(false);
  const [noteDraft, setNoteDraft] = useState<string>("");
  const [noteColor, setNoteColor] = useState<MemoryNoteColor>("peach");
  const [isSavingNote, setIsSavingNote] = useState<boolean>(false);

  const loadMemoryBoard = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/user/memories", { cache: "no-store" });
      const json = await res.json();
      if (res.ok && json?.data) setMemoryBoard(json.data);
    } catch (err) {
      console.warn("Lỗi tải kho kỷ niệm:", err);
    } finally {
      setIsLoadingMemories(false);
    }
  }, []);

  useEffect(() => {
    loadMemoryBoard();
  }, [loadMemoryBoard]);

  // Dán giấy nhớ kỷ niệm lên bảng (lưu vào phòng đôi, lần đầu sẽ tự tạo phòng)
  const handleAddStickyNote = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = noteDraft.trim();
    if (!content || isSavingNote) return;
    setIsSavingNote(true);
    try {
      const res = await fetch("/api/v1/user/memories/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, color: noteColor }),
      });
      const json = await res.json();
      if (!res.ok) {
        addToast(json?.error?.message || "Chưa dán được giấy nhớ, thử lại nhé.", "error");
        return;
      }
      const note: MemoryNoteDto = json.data;
      setMemoryBoard((prev) => ({ ...prev, notes: [note, ...prev.notes] }));
      setNoteDraft("");
      setIsComposingNote(false);
      addToast("📌 Đã ghim thêm một tờ giấy nhớ kỷ niệm lên bảng!", "success");
      if (!room) refetchHomeSummary();
    } catch (err) {
      console.warn("Lỗi dán giấy nhớ:", err);
      addToast("Mất kết nối, chưa dán được giấy nhớ.", "error");
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleRemoveStickyNote = async (id: string) => {
    const previous = memoryBoard.notes;
    setMemoryBoard((prev) => ({ ...prev, notes: prev.notes.filter((n) => n.id !== id) }));
    try {
      const res = await fetch(`/api/v1/user/memories/notes/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`memory note API ${res.status}`);
    } catch (err) {
      console.warn("Lỗi gỡ giấy nhớ:", err);
      setMemoryBoard((prev) => ({ ...prev, notes: previous }));
      addToast("Chưa gỡ được giấy nhớ, thử lại nhé.", "error");
    }
  };

  return (
    <section id="section-memory" className="scroll-section">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-brand-terracotta uppercase tracking-wider">
            <span>📸 Nhật ký lưu giữ thanh xuân</span>
          </div>
          <h2 className="font-serif font-extrabold text-xl sm:text-2xl text-paper-ink mt-0.5">
            Kho Kỷ Niệm Của Hai Bạn{room ? ` (Phòng Đôi ${room.memberCount}/2)` : ""}
          </h2>
          <p className="text-xs sm:text-sm text-paper-muted">
            Bảng ghim những bức hình Polaroid và lời nhắn viết tay qua từng buổi hẹn tại Hà Nội
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsComposingNote(!isComposingNote)}
            className="paper-btn px-4 py-2 text-xs font-bold flex items-center gap-1.5 active:scale-95"
          >
            <span>{isComposingNote ? "✕ Thôi, để sau" : "✍️ + Dán thêm giấy nhớ kỷ niệm"}</span>
          </button>
        </div>
      </div>

      {/* Bảng gỗ bần Corkboard ghim ảnh & giấy nhớ */}
      <div className="corkboard-surface p-5 sm:p-7 select-none">
        <div
          id="memoryBoardGrid"
          className="memory-grid grid grid-cols-1 md:grid-cols-3 gap-6 items-start"
        >
          {/* Tờ giấy nhớ đang viết */}
          {isComposingNote && (
            <form
              onSubmit={handleAddStickyNote}
              className={`${NOTE_COLOR_STYLES[noteColor].card} border-2 rounded-md p-5 shadow-lg relative select-text`}
            >
              <div className={`w-4 h-4 rounded-full ${NOTE_COLOR_STYLES[noteColor].pin} border-2 border-paper-ink shadow mx-auto -mt-7 mb-3`} />
              <textarea
                autoFocus
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                maxLength={280}
                rows={4}
                placeholder="Viết lời nhắn cho người ấy..."
                className="w-full bg-transparent font-hand text-lg text-paper-ink leading-snug resize-none focus:outline-none placeholder:text-paper-muted/70"
              />
              <div className={`mt-2 pt-2.5 border-t border-dashed ${NOTE_COLOR_STYLES[noteColor].divider} flex items-center justify-between gap-2`}>
                <div className="flex items-center gap-1.5">
                  {NOTE_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNoteColor(color)}
                      aria-label={`Màu giấy ${color}`}
                      className={`w-5 h-5 rounded-full border-2 ${NOTE_COLOR_STYLES[color].card} ${
                        noteColor === color ? "ring-2 ring-paper-ink" : ""
                      }`}
                    />
                  ))}
                </div>
                <button
                  type="submit"
                  disabled={!noteDraft.trim() || isSavingNote}
                  className="bg-paper-ink disabled:opacity-40 text-white text-xs font-bold px-3 py-1.5 rounded hover:bg-brand-terracotta transition"
                >
                  {isSavingNote ? "Đang ghim..." : "📌 Ghim lên bảng"}
                </button>
              </div>
            </form>
          )}

          {/* Giấy nhớ của phòng đôi */}
          {memoryBoard.notes.map((note, idx) => {
            const style = NOTE_COLOR_STYLES[note.color] ?? NOTE_COLOR_STYLES.peach;
            return (
              <div
                key={note.id}
                className={`${style.card} border-2 rounded-md p-5 shadow-lg transform ${
                  idx % 2 === 0 ? "-rotate-1" : "rotate-1"
                } hover:rotate-0 transition relative`}
              >
                <div className={`w-4 h-4 rounded-full ${style.pin} border-2 border-paper-ink shadow mx-auto -mt-7 mb-3`} />
                <span className={`text-[11px] font-extrabold ${style.label} uppercase tracking-wider block text-center`}>
                  💌 {note.isMine ? "Bạn dán" : `${note.authorName} dán`}
                </span>
                <p className="font-hand text-lg text-center text-paper-ink mt-2 leading-snug break-words">
                  &quot;{note.content}&quot;
                </p>
                <div className={`mt-4 pt-2.5 border-t border-dashed ${style.divider} flex items-center justify-between text-xs`}>
                  <span className="font-semibold text-paper-muted">{formatNoteTime(note.createdAt)}</span>
                  <button
                    onClick={() => handleRemoveStickyNote(note.id)}
                    className={`${style.label} font-bold hover:underline`}
                  >
                    Gỡ giấy
                  </button>
                </div>
              </div>
            );
          })}

          {/* Giấy nhớ Vàng Đếm Ngược Ngày Kỷ Niệm */}
          <div className="bg-[#F9EFC7] border-2 border-[#DFC98B] rounded-md p-5 shadow-lg transform rotate-1 hover:rotate-0 transition relative">
            <div className="w-4 h-4 rounded-full bg-brand-terracotta border-2 border-paper-ink shadow mx-auto -mt-7 mb-3" />
            <span className="text-[11px] font-extrabold text-brand-terracotta uppercase tracking-wider block text-center">
              ⏳ Đếm ngược ngày đặc biệt
            </span>
            {anniversary && daysLeft !== null ? (
              <>
                <h3 className="font-serif font-extrabold text-2xl text-paper-ink text-center mt-1">
                  {daysLeft === 0 ? "Hôm nay là ngày đó!" : `Còn ${daysLeft} Ngày Nữa!`}
                </h3>
                <p className="font-hand text-lg text-center text-paper-ink mt-2 leading-snug">
                  {anniversary.title}
                  {anniversary.date ? ` • ${formatDayMonthYear(anniversary.date)}` : ""}
                </p>
              </>
            ) : (
              <>
                <h3 className="font-serif font-extrabold text-xl text-paper-ink text-center mt-1">
                  Chưa đặt ngày kỷ niệm
                </h3>
                <p className="font-hand text-lg text-center text-paper-ink mt-2 leading-snug">
                  {room
                    ? "Đặt ngày yêu nhau trong Phòng đôi để DateMate đếm ngược giúp hai bạn nhé!"
                    : "Tạo Phòng đôi và mời người ấy vào để cùng lưu giữ kỷ niệm nhé!"}
                </p>
              </>
            )}
            <div className="mt-4 pt-3 border-t border-dashed border-[#D5BE7E] flex items-center justify-end text-xs">
              <button
                onClick={() => setIsRoomModalOpen(true)}
                className="font-bold text-brand-terracotta hover:underline"
              >
                Mở QR Phòng đôi →
              </button>
            </div>
          </div>

          {/* Ảnh Polaroid kỷ niệm sau các buổi hẹn */}
          {memoryBoard.memories.map((memory, idx) => (
            <div
              key={memory.id}
              className={`bg-[#FFFDF9] border border-[#CDBB9E] rounded p-3 pb-4 shadow-lg transform ${
                idx % 2 === 0 ? "-rotate-1" : "-rotate-2"
              } hover:rotate-0 transition relative`}
            >
              <div className={`washi-tape ${idx % 2 === 0 ? "washi-gingham-peach" : "washi-olive"}`} />
              <div className="aspect-[4/3] rounded-xs overflow-hidden bg-[#E8DCCB] relative flex items-center justify-center">
                {memory.coverUrl ? (
                  <Image
                    src={memory.coverUrl}
                    alt={memory.coverCaption || memory.title}
                    fill
                    unoptimized
                    sizes="320px"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-4xl">📷</span>
                )}
              </div>
              <div className="mt-3 text-center">
                <span className="text-[10px] font-bold text-paper-muted uppercase">
                  {formatDayMonthYear(memory.visitedAt)} • {"⭐".repeat(memory.rating)}
                </span>
                <p className="font-hand text-lg font-bold text-paper-ink mt-0.5">
                  {memory.journal ? `"${memory.journal}"` : memory.title}
                </p>
              </div>
            </div>
          ))}

          {!isLoadingMemories && memoryBoard.memories.length === 0 && (
            <div className="bg-[#FFFDF9]/90 border-2 border-dashed border-[#CDBB9E] rounded p-5 text-center flex flex-col items-center justify-center gap-2 min-h-[220px]">
              <span className="text-3xl">📷</span>
              <p className="font-serif font-bold text-base text-paper-ink">Chưa có tấm Polaroid nào</p>
              <p className="text-xs text-paper-muted leading-relaxed">
                Sau mỗi buổi hẹn, lưu lại ảnh và vài dòng nhật ký để bảng kỷ niệm đầy dần lên nhé!
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
