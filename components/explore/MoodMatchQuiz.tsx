"use client";

import React, { useEffect, useState } from "react";
import { useApp } from "@/context/AppContext";
import type { HanoiPlace } from "@/lib/types/catalog";
import type { MoodKey, TimeSlot } from "@/lib/constants/catalog";

type MatchMood = "sunset" | "active" | "art";
type MatchBudget = "saving" | "moderate" | "luxury";

/** Quy đổi lựa chọn trắc nghiệm sang tiêu chí của POST /recommend (tối đa 2 mood). */
const MATCH_MOOD_CRITERIA: Record<MatchMood, { moods: MoodKey[]; slot: TimeSlot }> = {
  sunset: { moods: ["romantic", "photo"], slot: "sunset" },
  active: { moods: ["fun"], slot: "allday" },
  art: { moods: ["photo", "chill"], slot: "allday" },
};
const MATCH_BUDGET_LEVEL: Record<MatchBudget, number> = { saving: 1, moderate: 2, luxury: 3 };

interface MatchRecommendation {
  place: HanoiPlace;
  score: number;
  reasons: string[];
}

/** Trắc nghiệm 3 bước: mood + ngân sách → địa điểm hợp nhất do server chấm điểm (POST /recommend). */
export function MoodMatchQuiz() {
  const { homePublic, setActiveDetailSlug, setIsWheelOpen } = useApp();
  const isRainy = homePublic?.weather.icon === "rain" || homePublic?.weather.icon === "thunder";

  const [matchMood, setMatchMood] = useState<MatchMood>("sunset");
  const [matchBudget, setMatchBudget] = useState<MatchBudget>("moderate");
  const [matchResult, setMatchResult] = useState<MatchRecommendation | null>(null);
  const [isMatching, setIsMatching] = useState<boolean>(false);

  // Bốc quẻ Match: chấm điểm địa điểm thật qua POST /recommend mỗi khi đổi tiêu chí
  useEffect(() => {
    let active = true;
    setIsMatching(true);
    fetch("/api/v1/user/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...MATCH_MOOD_CRITERIA[matchMood],
        budget: MATCH_BUDGET_LEVEL[matchBudget],
        transport: "motorbike",
        isRainy,
      }),
    })
      .then((res) => res.json())
      .then((json) => {
        if (active) setMatchResult(json?.data?.items?.[0] ?? null);
      })
      .catch((err) => {
        console.warn("Lỗi bốc quẻ match:", err);
        if (active) setMatchResult(null);
      })
      .finally(() => {
        if (active) setIsMatching(false);
      });
    return () => {
      active = false;
    };
  }, [matchMood, matchBudget, isRainy]);

  return (
    <section id="section-match" className="scroll-section">
      <div className="bg-[#FFFDF9] border-2 border-[#CBB292] rounded-2xl p-5 sm:p-7 relative shadow-md">
        <div className="washi-tape washi-cream-top" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-dashed border-[#D8CBB8] pb-4">
          <div>
            <span className="bg-brand-peach text-brand-terracottaDark text-xs font-bold px-3 py-1 rounded-full">
              💞 Trắc nghiệm nhanh đồng điệu
            </span>
            <h2 className="font-serif font-extrabold text-xl sm:text-2xl text-paper-ink mt-2">
              Match Cặp Đôi &amp; Bốc Quẻ Lịch Trình
            </h2>
            <p className="text-xs sm:text-sm text-paper-muted mt-0.5">
              Chọn nhanh 3 tiêu chí bên dưới để DateMate tìm ra kịch bản hẹn hò khớp 100% tâm trạng của cả hai!
            </p>
          </div>

          <button
            onClick={() => setIsWheelOpen(true)}
            className="ticket-btn bg-[#F6B092] text-paper-ink px-5 py-2.5 font-bold text-xs sm:text-sm shrink-0 self-start md:self-center"
          >
            🎲 Mở Vòng Quay Ngẫu Nhiên
          </button>
        </div>

        {/* Bộ chọn 3 bước Match cặp đôi */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 my-5">
          {/* Bước 1: Mood hôm nay */}
          <div className="bg-[#FAF4E8] border border-[#DED2C1] rounded-xl p-4">
            <p className="text-xs font-extrabold uppercase text-brand-terracotta tracking-wider">
              1. Mood của hai bạn hôm nay?
            </p>
            <div className="space-y-2 mt-3">
              <button
                onClick={() => setMatchMood("sunset")}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs transition flex items-center justify-between ${
                  matchMood === "sunset"
                    ? "font-bold bg-brand-terracotta text-white shadow-xs"
                    : "font-semibold bg-white text-paper-ink border border-[#DED2C1] hover:border-brand-terracotta"
                }`}
              >
                <span>🌅 Chill ngắm hoàng hôn &amp; gió mát</span>
                <span>{matchMood === "sunset" ? "✓" : ""}</span>
              </button>
              <button
                onClick={() => setMatchMood("active")}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs transition flex items-center justify-between ${
                  matchMood === "active"
                    ? "font-bold bg-brand-terracotta text-white shadow-xs"
                    : "font-semibold bg-white text-paper-ink border border-[#DED2C1] hover:border-brand-terracotta"
                }`}
              >
                <span>🎳 Năng động, vui nhộn trong nhà</span>
                <span>{matchMood === "active" ? "✓" : ""}</span>
              </button>
              <button
                onClick={() => setMatchMood("art")}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs transition flex items-center justify-between ${
                  matchMood === "art"
                    ? "font-bold bg-brand-terracotta text-white shadow-xs"
                    : "font-semibold bg-white text-paper-ink border border-[#DED2C1] hover:border-brand-terracotta"
                }`}
              >
                <span>🎨 Nghệ thuật, bảo tàng &amp; thủ công</span>
                <span>{matchMood === "art" ? "✓" : ""}</span>
              </button>
            </div>
          </div>

          {/* Bước 2: Ngân sách dự kiến */}
          <div className="bg-[#FAF4E8] border border-[#DED2C1] rounded-xl p-4">
            <p className="text-xs font-extrabold uppercase text-brand-olive tracking-wider">
              2. Ngân sách cho buổi hẹn?
            </p>
            <div className="space-y-2 mt-3">
              <button
                onClick={() => setMatchBudget("saving")}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs transition flex items-center justify-between ${
                  matchBudget === "saving"
                    ? "font-bold bg-brand-olive text-white shadow-xs"
                    : "font-semibold bg-white text-paper-ink border border-[#DED2C1] hover:border-brand-olive"
                }`}
              >
                <span>🌱 Tiết kiệm hạt dẻ (&lt; 150k/đôi)</span>
                <span>{matchBudget === "saving" ? "✓" : ""}</span>
              </button>
              <button
                onClick={() => setMatchBudget("moderate")}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs transition flex items-center justify-between ${
                  matchBudget === "moderate"
                    ? "font-bold bg-brand-olive text-white shadow-xs"
                    : "font-semibold bg-white text-paper-ink border border-[#DED2C1] hover:border-brand-olive"
                }`}
              >
                <span>☕ Vừa vặn thoải mái (150k - 300k)</span>
                <span>{matchBudget === "moderate" ? "✓" : ""}</span>
              </button>
              <button
                onClick={() => setMatchBudget("luxury")}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs transition flex items-center justify-between ${
                  matchBudget === "luxury"
                    ? "font-bold bg-brand-olive text-white shadow-xs"
                    : "font-semibold bg-white text-paper-ink border border-[#DED2C1] hover:border-brand-olive"
                }`}
              >
                <span>🥂 Kỷ niệm đặc biệt (&gt; 350k)</span>
                <span>{matchBudget === "luxury" ? "✓" : ""}</span>
              </button>
            </div>
          </div>

          {/* Bước 3: Kết quả Match tức thì (chấm điểm qua POST /recommend) */}
          <div
            id="matchResultCard"
            className={`bg-[#F9EFC7] border-2 border-dashed border-brand-terracotta rounded-xl p-4 flex flex-col justify-between transition ${
              isMatching ? "opacity-60" : ""
            }`}
          >
            {matchResult ? (
              <>
                <div>
                  <div className="flex items-center justify-between">
                    <span className="bg-brand-terracotta text-white text-[10px] font-extrabold px-2 py-0.5 rounded">
                      ĐỘ HỢP GU: {matchResult.score}%
                    </span>
                    <span className="text-lg">{matchResult.place.emoji || "💘"}</span>
                  </div>
                  <h3
                    id="matchResultTitle"
                    className="font-serif font-extrabold text-lg text-paper-ink mt-2 leading-tight"
                  >
                    {matchResult.place.displayName || matchResult.place.name}
                  </h3>
                  <p id="matchResultDesc" className="text-xs text-paper-muted mt-1 leading-relaxed line-clamp-3">
                    {matchResult.place.summary}
                  </p>
                  {matchResult.reasons.length > 0 && (
                    <ul className="mt-2 space-y-0.5 text-[11px] text-paper-ink">
                      {matchResult.reasons.slice(0, 3).map((reason) => (
                        <li key={reason}>✓ {reason}</li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="mt-3 pt-2.5 border-t border-[#DFC98B] flex items-center justify-between gap-2">
                  <span id="matchResultPrice" className="text-xs font-bold text-brand-terracottaDark">
                    💰 {matchResult.place.costText}
                  </span>
                  <button
                    onClick={() => setActiveDetailSlug(matchResult.place.slug)}
                    className="bg-paper-ink text-white text-xs font-bold px-3 py-1.5 rounded hover:bg-brand-terracotta transition shrink-0"
                  >
                    Xem cẩm nang →
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 py-6">
                <span className="text-3xl">💘</span>
                <p className="text-xs text-paper-muted">
                  {isMatching ? "Đang chấm điểm các địa điểm hợp gu hai bạn..." : "Chưa tìm được nơi hợp tiêu chí, thử đổi mood hoặc ngân sách nhé."}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
