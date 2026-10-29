"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ThumbsUp, ThumbsDown, CheckCircle2, RotateCw, MapPin, Video, Sparkles, Inbox } from "lucide-react";
import { adminFetch, type AdminApiFailure } from "../_shared/admin-fetch";
import { AdminErrorNotice } from "../_shared/AdminErrorNotice";

interface SampleCard {
  id: string;
  type: "place" | "video" | "hotspot";
  title: string;
  subtitle: string;
  details: string;
  category?: string;
  datingScore?: number;
  confidenceScore?: number;
  meta: Record<string, unknown>;
}

interface DailySampleGraderProps {
  onGradedComplete?: (newRollingAccuracy: number) => void;
}

export function DailySampleGrader({ onGradedComplete }: DailySampleGraderProps) {
  const [cards, setCards] = useState<SampleCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [finalAccuracy, setFinalAccuracy] = useState<number | null>(null);
  const [loadFailure, setLoadFailure] = useState<AdminApiFailure | null>(null);

  const fetchCards = useCallback(async () => {
    setLoading(true);
    setIsCompleted(false);
    setCurrentIndex(0);
    const result = await adminFetch<SampleCard[]>("/api/v1/admin/pipeline/sample-cards");
    if (result.ok) {
      setCards(Array.isArray(result.data) ? result.data : []);
      setLoadFailure(null);
    } else {
      setCards([]);
      setLoadFailure(result);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  const handleGrade = useCallback(
    async (isCorrect: boolean) => {
      if (submitting || currentIndex >= cards.length) return;
      const currentCard = cards[currentIndex];
      setSubmitting(true);

      try {
        const res = await fetch("/api/v1/admin/pipeline/grade-sample", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            itemId: currentCard.id,
            type: currentCard.type,
            isCorrect,
          }),
        });
        const json = await res.json();

        if (currentIndex + 1 >= cards.length) {
          setIsCompleted(true);
          const acc: unknown = json.data?.newRollingAccuracy;
          setFinalAccuracy(typeof acc === "number" ? acc : null);
          if (onGradedComplete && typeof acc === "number") onGradedComplete(acc);
        } else {
          setCurrentIndex((prev) => prev + 1);
        }
      } catch (err) {
        console.error("Lỗi gửi điểm kiểm toán:", err);
      } finally {
        setSubmitting(false);
      }
    },
    [submitting, currentIndex, cards, onGradedComplete]
  );

  // Lắng nghe phím tắt: ArrowLeft (Sai) / ArrowRight (Đúng)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isCompleted || loading || submitting) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        handleGrade(false);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleGrade(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleGrade, isCompleted, loading, submitting]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
        <RotateCw className="w-6 h-6 animate-spin mx-auto mb-2 text-peach-500" />
        <p className="text-sm">Đang tải thẻ kiểm toán ngẫu nhiên trong ngày...</p>
      </div>
    );
  }

  if (isCompleted) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center shadow-sm">
        <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-1">Xong việc kiểm toán hôm nay!</h3>
        <p className="text-sm text-slate-600 mb-4">
          Bạn đã hoàn thành bài kiểm toán 3 phút. Độ chính xác Rolling 7 ngày hiện tại:{" "}
          <span className="font-bold text-emerald-600">{finalAccuracy === null ? "—" : `${finalAccuracy}%`}</span>.
        </p>
        <button
          onClick={fetchCards}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
        >
          <RotateCw className="w-4 h-4" />
          <span>Chấm thêm đợt khác</span>
        </button>
      </div>
    );
  }

  if (loadFailure) {
    return <AdminErrorNotice failure={loadFailure} onRetry={fetchCards} />;
  }

  const currentCard = cards[currentIndex];
  if (!currentCard) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center shadow-sm">
        <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-3">
          <Inbox className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900 mb-1">Chưa có mẫu nào cần chấm</h3>
        <p className="text-sm text-slate-500 mb-4">
          Không có ứng viên địa điểm (bậc A/B đang chờ) hay video tự khớp nào để kiểm toán lúc này.
        </p>
        <button
          onClick={fetchCards}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
        >
          <RotateCw className="w-4 h-4" />
          <span>Tải lại</span>
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-peach-50 text-peach-600 flex items-center justify-center font-bold">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Bài Chấm Mẫu 3 Phút (Daily Grader)</h3>
            <p className="text-xs text-slate-500">Dùng phím ← (Sai) và → (Chuẩn) để thao tác siêu tốc</p>
          </div>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full">
          Thẻ {currentIndex + 1} / {cards.length}
        </span>
      </div>

      {/* Thẻ hiển thị nội dung kiểm toán */}
      <div className="bg-slate-50 rounded-xl p-5 border border-slate-200/80 mb-6 transition-all duration-200">
        <div className="flex items-center gap-2 mb-2">
          {currentCard.type === "place" ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
              <MapPin className="w-3 h-3" /> Địa điểm tự động
            </span>
          ) : currentCard.type === "hotspot" ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
              <Video className="w-3 h-3" /> Mốc địa điểm trong video
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">
              <Video className="w-3 h-3" /> Khớp Video Review
            </span>
          )}
          {currentCard.datingScore !== undefined && (
            <span className="text-xs text-slate-500 font-medium">Điểm hẹn hò: {currentCard.datingScore}</span>
          )}
          {currentCard.confidenceScore !== undefined && (
            <span className="text-xs text-slate-500 font-medium">Độ khớp: {currentCard.confidenceScore}%</span>
          )}
        </div>

        <h4 className="text-base font-bold text-slate-900 mb-1">{currentCard.title}</h4>
        <p className="text-xs text-peach-700 font-medium mb-2">{currentCard.subtitle}</p>
        <p className="text-xs text-slate-600 bg-white p-3 rounded-lg border border-slate-200">
          {currentCard.details}
        </p>
        {typeof currentCard.meta.watchUrl === "string" && (
          <a
            href={currentCard.meta.watchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-2 text-xs font-semibold text-purple-700 hover:underline"
          >
            ▶ Mở YouTube đúng giây này để kiểm tra
          </a>
        )}
      </div>

      {/* 2 Nút quẹt to */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => handleGrade(false)}
          disabled={submitting}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 border-rose-200 bg-rose-50 text-rose-700 font-semibold hover:bg-rose-100 hover:border-rose-300 transition-all active:scale-95 disabled:opacity-50"
        >
          <ThumbsDown className="w-5 h-5" />
          <span>[←] Sai / Loại Bỏ</span>
        </button>

        <button
          onClick={() => handleGrade(true)}
          disabled={submitting}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 border-emerald-200 bg-emerald-50 text-emerald-700 font-semibold hover:bg-emerald-100 hover:border-emerald-300 transition-all active:scale-95 disabled:opacity-50"
        >
          <ThumbsUp className="w-5 h-5" />
          <span>[→] Chuẩn Xác</span>
        </button>
      </div>
    </div>
  );
}
