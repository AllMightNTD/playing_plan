"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useApp } from "@/context/AppContext";
import type { MemoryBoardDto, MemoryNoteDto } from "@/server/services/user/memory.service";
import type { MemoryNoteColor } from "@/lib/constants/user";

export async function fetchMemoryBoard(): Promise<MemoryBoardDto> {
  const res = await fetch("/api/v1/user/memories");
  const json = await res.json().catch(() => null);
  return res.ok && json?.data ? json.data : { notes: [], memories: [] };
}

const NOTE_COLOR_STYLES: Record<
  MemoryNoteColor,
  { card: string; divider: string; label: string; pin: string; name: string }
> = {
  peach: {
    card: "bg-[#FADCD2] border-[#E2A995]",
    divider: "border-[#E2A995]",
    label: "text-brand-terracottaDark",
    pin: "bg-brand-olive",
    name: "Hồng đào",
  },
  yellow: {
    card: "bg-[#F9EFC7] border-[#DFC98B]",
    divider: "border-[#D5BE7E]",
    label: "text-brand-terracotta",
    pin: "bg-brand-terracotta",
    name: "Vàng mật",
  },
  olive: {
    card: "bg-[#E3EBD9] border-[#AFC29F]",
    divider: "border-[#AFC29F]",
    label: "text-[#2F4225]",
    pin: "bg-brand-mustard",
    name: "Xanh olive",
  },
};
const NOTE_COLORS = Object.keys(NOTE_COLOR_STYLES) as MemoryNoteColor[];

function formatDayMonthYear(value: string | Date, separator = "/"): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return [
    String(d.getDate()).padStart(2, "0"),
    String(d.getMonth() + 1).padStart(2, "0"),
    d.getFullYear(),
  ].join(separator);
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
  const queryClient = useQueryClient();
  const room = homeSummary?.room ?? null;
  const anniversary = room?.anniversary ?? null;
  const daysLeft = anniversary?.daysLeft ?? null;

  const { data: memoryBoard = { notes: [], memories: [] }, isLoading: isLoadingMemories } = useQuery({
    queryKey: ["user", "memories"],
    queryFn: fetchMemoryBoard,
  });

  const [isComposingNote, setIsComposingNote] = useState<boolean>(false);
  const [noteDraft, setNoteDraft] = useState<string>("");
  const [noteColor, setNoteColor] = useState<MemoryNoteColor>("peach");
  const [isSavingNote, setIsSavingNote] = useState<boolean>(false);
  const [flippedIds, setFlippedIds] = useState<Record<string, boolean>>({});

  const togglePolaroidFlip = (id: string) => {
    setFlippedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

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
      queryClient.setQueryData<MemoryBoardDto>(["user", "memories"], (prev) =>
        prev ? { ...prev, notes: [note, ...prev.notes] } : { notes: [note], memories: [] }
      );
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
    queryClient.setQueryData<MemoryBoardDto>(["user", "memories"], (prev) =>
      prev ? { ...prev, notes: prev.notes.filter((n) => n.id !== id) } : { notes: [], memories: [] }
    );
    try {
      const res = await fetch(`/api/v1/user/memories/notes/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`memory note API ${res.status}`);
    } catch (err) {
      console.warn("Lỗi gỡ giấy nhớ:", err);
      queryClient.setQueryData<MemoryBoardDto>(["user", "memories"], (prev) =>
        prev ? { ...prev, notes: previous } : { notes: previous, memories: [] }
      );
      addToast("Chưa gỡ được giấy nhớ, thử lại nhé.", "error");
    }
  };

  return (
    <section id="section-memory" className="scroll-section">
      {/* Header khu vực Bảng Ghim */}
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4 sm:mb-5">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-brand-terracotta uppercase tracking-wider">
            <span>📸 Nhật ký lưu giữ thanh xuân</span>
            {room && (
              <span className="bg-brand-peach/60 text-brand-terracottaDark px-2 py-0.5 rounded-full text-[10px]">
                {`Phòng ${room.memberCount}/2`}
              </span>
            )}
          </div>
          <h2 className="font-serif font-extrabold text-lg sm:text-2xl text-paper-ink mt-0.5">
            Kho Kỷ Niệm Của Hai Bạn
          </h2>
          <p className="text-xs sm:text-sm text-paper-muted">
            Bảng ghim những bức hình Polaroid và lời nhắn viết tay qua từng buổi hẹn hò
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsComposingNote(true)}
            className="paper-btn px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs font-bold flex items-center gap-1.5 active:scale-95 shadow-sm"
          >
            <span>✍️ + Dán giấy nhớ</span>
          </button>
        </div>
      </div>

      {/* Bảng gỗ bần Corkboard ghim ảnh & giấy nhớ */}
      <div className="corkboard-surface p-3.5 sm:p-7 select-none relative">
        <div
          id="memoryBoardGrid"
          className="memory-grid grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6 items-start"
        >
          {/* Giấy nhớ Vàng Đếm Ngược Ngày Kỷ Niệm (Hero Card span-2 trên mobile) */}
          <div className="col-span-2 md:col-span-1 bg-[#F9EFC7] border-2 border-[#DFC98B] rounded-xl p-4 sm:p-5 shadow-md transform sm:rotate-1 hover:rotate-0 transition relative">
            <div className="w-4 h-4 rounded-full bg-brand-terracotta border-2 border-paper-ink shadow mx-auto -mt-6 sm:-mt-7 mb-2.5 sm:mb-3" />
            <span className="text-[10px] sm:text-[11px] font-extrabold text-brand-terracotta uppercase tracking-wider block text-center">
              ⏳ Đếm ngược ngày đặc biệt
            </span>
            {anniversary && daysLeft !== null ? (
              <div className="text-center mt-1 sm:mt-2">
                <h3 className="font-serif font-black text-xl sm:text-2xl text-paper-ink">
                  {daysLeft === 0 ? "Hôm nay là ngày đó! 💖" : `Còn ${daysLeft} Ngày Nữa!`}
                </h3>
                <p className="font-hand text-base sm:text-lg text-paper-ink mt-1 leading-snug">
                  {anniversary.title}
                  {anniversary.date ? ` • ${formatDayMonthYear(anniversary.date)}` : ""}
                </p>
              </div>
            ) : (
              <div className="text-center mt-1 sm:mt-2">
                <h3 className="font-serif font-black text-base sm:text-xl text-paper-ink">
                  Chưa đặt ngày kỷ niệm
                </h3>
                <p className="font-hand text-sm sm:text-lg text-paper-ink mt-1 leading-snug">
                  {room
                    ? "Đặt ngày yêu nhau trong Phòng đôi để DateMate đếm ngược giúp hai bạn nhé!"
                    : "Tạo Phòng đôi và mời người ấy vào để cùng lưu giữ kỷ niệm nhé!"}
                </p>
              </div>
            )}
            <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-dashed border-[#D5BE7E] flex items-center justify-end text-xs">
              <button
                type="button"
                onClick={() => setIsRoomModalOpen(true)}
                className="font-bold text-xs text-brand-terracotta hover:underline"
              >
                Mở QR Phòng đôi →
              </button>
            </div>
          </div>

          {/* Danh sách Giấy nhớ của phòng đôi */}
          {memoryBoard.notes.map((note, idx) => {
            const style = NOTE_COLOR_STYLES[note.color] ?? NOTE_COLOR_STYLES.peach;
            return (
              <div
                key={note.id}
                className={`${style.card} border-2 rounded-xl p-3.5 sm:p-5 shadow-md transform ${
                  idx % 2 === 0 ? "-rotate-1" : "rotate-1"
                } hover:rotate-0 transition relative`}
              >
                <div
                  className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full ${style.pin} border-2 border-paper-ink shadow mx-auto -mt-5.5 sm:-mt-7 mb-2 sm:mb-3`}
                />
                <span
                  className={`text-[10px] sm:text-[11px] font-extrabold ${style.label} uppercase tracking-wider block text-center`}
                >
                  💌 {note.isMine ? "Bạn dán" : `${note.authorName} dán`}
                </span>
                <p className="font-hand text-base sm:text-lg text-center text-paper-ink mt-1.5 leading-snug break-words">
                  &quot;{note.content}&quot;
                </p>
                <div
                  className={`mt-3 pt-2 border-t border-dashed ${style.divider} flex items-center justify-between text-[11px] sm:text-xs`}
                >
                  <span className="font-semibold text-paper-muted">{formatNoteTime(note.createdAt)}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveStickyNote(note.id)}
                    className={`${style.label} font-bold hover:underline`}
                  >
                    Gỡ giấy
                  </button>
                </div>
              </div>
            );
          })}

          {/* Interactive flippable Polaroid memory cards */}
          {memoryBoard.memories.map((memory, idx) => {
            const isFlipped = Boolean(flippedIds[memory.id]);
            return (
              <div
                key={memory.id}
                role="button"
                tabIndex={0}
                onClick={() => togglePolaroidFlip(memory.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    togglePolaroidFlip(memory.id);
                  }
                }}
                aria-label={`Kỷ niệm ${memory.title} - bấm để lật mặt sau`}
                className={`bg-[#FFFDF9] border border-[#CDBB9E] rounded-xl p-2.5 sm:p-3 pb-3 sm:pb-4 shadow-md transform ${
                  idx % 2 === 0 ? "-rotate-1" : "-rotate-2"
                } hover:rotate-0 transition-all duration-300 relative cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-terracotta`}
              >
                <div className={`washi-tape ${idx % 2 === 0 ? "washi-gingham-peach" : "washi-olive"}`} />
                {!isFlipped ? (
                  <>
                    <div className="aspect-[4/3] rounded-lg overflow-hidden bg-[#E8DCCB] relative flex items-center justify-center">
                      {memory.coverUrl ? (
                        <Image
                          src={memory.coverUrl}
                          alt={memory.coverCaption || memory.title}
                          fill
                          unoptimized
                          sizes="(max-width: 768px) 50vw, 320px"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-3xl sm:text-4xl">📷</span>
                      )}
                      <span className="absolute bottom-1.5 right-1.5 bg-black/60 backdrop-blur-xs text-white text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        🔄 Chạm lật
                      </span>
                    </div>
                    <div className="mt-2 sm:mt-3 text-center">
                      <span className="text-[9px] sm:text-[10px] font-bold text-paper-muted uppercase tracking-tight">
                        {formatDayMonthYear(memory.visitedAt)} • {"⭐".repeat(memory.rating)}
                      </span>
                      <p className="font-hand text-sm sm:text-base font-bold text-paper-ink mt-0.5 line-clamp-2">
                        {memory.title}
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="aspect-[4/3] rounded-lg bg-[#FAF4E8] border border-dashed border-[#CBB292] p-2.5 sm:p-4 flex flex-col justify-between text-left relative">
                    <div className="flex items-center justify-between border-b border-[#E6D3B8] pb-1">
                      <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-brand-terracotta">
                        💌 Nhật ký mặt sau
                      </span>
                      <span className="text-[9px] sm:text-[10px] font-mono font-bold text-paper-muted border border-[#CBB292] px-1 py-0.2 rounded">
                        {formatDayMonthYear(memory.visitedAt)}
                      </span>
                    </div>
                    <p className="font-hand text-xs sm:text-base text-paper-ink leading-snug my-auto py-1.5 overflow-y-auto">
                      &ldquo;
                      {memory.journal || `Buổi hẹn đáng nhớ tại ${memory.title} cùng người thương.`}
                      &rdquo;
                    </p>
                    <div className="flex items-center justify-between text-[9px] sm:text-[10px] text-paper-muted pt-1 border-t border-dashed border-[#E6D3B8]">
                      <span>{"⭐".repeat(memory.rating)}</span>
                      <span className="font-bold text-brand-terracotta">🔄 Lật về ảnh</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {!isLoadingMemories && memoryBoard.memories.length === 0 && (
            <div className="col-span-2 md:col-span-2 bg-[#FFFDF9]/90 border-2 border-dashed border-[#CDBB9E] rounded-xl p-4 sm:p-5 text-center flex flex-col items-center justify-center gap-1.5 min-h-[180px]">
              <span className="text-2xl sm:text-3xl">📷</span>
              <p className="font-serif font-bold text-sm sm:text-base text-paper-ink">Chưa có tấm Polaroid nào</p>
              <p className="text-xs text-paper-muted leading-relaxed">
                Sau mỗi buổi hẹn, lưu lại ảnh và vài dòng nhật ký để bảng kỷ niệm đầy dần lên nhé!
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Native Bottom Sheet cho Soạn Giấy Nhớ Kỷ Niệm */}
      {isComposingNote && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
          <div
            className={`w-full max-w-lg ${NOTE_COLOR_STYLES[noteColor].card} border-t-2 sm:border-2 rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 shadow-2xl relative select-text transition-all`}
          >
            {/* Drag Handle Bar trên Mobile */}
            <div className="w-12 h-1.5 bg-paper-ink/20 rounded-full mx-auto mb-3 sm:hidden" />

            <div className="flex items-center justify-between pb-3 border-b border-dashed border-paper-ink/15 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">💌</span>
                <h3 className="font-serif font-extrabold text-base text-paper-ink">
                  Dán Giấy Nhớ Lên Bảng Kỷ Niệm
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsComposingNote(false)}
                className="w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center text-paper-ink font-bold text-sm transition"
                aria-label="Đóng"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddStickyNote} className="space-y-3">
              <div className="relative">
                <textarea
                  autoFocus
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  maxLength={280}
                  rows={4}
                  placeholder="Viết vài lời nhắn gửi người thương (ví dụ: 'Tối nay đi dạo hồ Tây ngắm gió thu nhé anh...')..."
                  className="w-full bg-white/70 border border-paper-ink/15 rounded-xl p-3 font-hand text-lg text-paper-ink leading-snug resize-none focus:outline-none focus:ring-2 focus:ring-brand-terracotta placeholder:text-paper-muted/60"
                />
                <span className="absolute bottom-2.5 right-3 text-[10px] font-mono text-paper-muted">
                  {noteDraft.length}/280
                </span>
              </div>

              {/* Lựa chọn màu giấy */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-paper-ink">Màu giấy:</span>
                  <div className="flex items-center gap-2">
                    {NOTE_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setNoteColor(color)}
                        aria-label={`Màu giấy ${NOTE_COLOR_STYLES[color].name}`}
                        aria-pressed={noteColor === color}
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 ${
                          NOTE_COLOR_STYLES[color].card
                        } ${
                          noteColor === color
                            ? "ring-2 ring-paper-ink scale-110 shadow-sm"
                            : "opacity-75 hover:opacity-100"
                        } transition cursor-pointer`}
                      />
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!noteDraft.trim() || isSavingNote}
                  className="bg-brand-terracotta hover:bg-brand-terracottaDark disabled:opacity-40 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow transition flex items-center gap-1.5 active:scale-95 cursor-pointer"
                >
                  {isSavingNote ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>📌</span>
                  )}
                  <span>{isSavingNote ? "Đang ghim..." : "Ghim Lên Bảng"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
