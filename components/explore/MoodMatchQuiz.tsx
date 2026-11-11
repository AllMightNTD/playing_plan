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
  const { homePublic, setActiveDetailSlug, setIsWheelOpen, quickAddPlaceToPlan } = useApp();
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
      <div className="bg-[#FFFDF9] border-2 border-[#CBB292] rounded-2xl p-4 sm:p-7 relative shadow-md">
        <div className="hidden sm:block washi-tape washi-cream-top" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-dashed border-[#D8CBB8] pb-3 sm:pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-brand-peach text-brand-terracottaDark text-[11px] sm:text-xs font-bold px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full">
                💞 Trắc nghiệm nhanh đồng điệu
              </span>
            </div>
            <h2 className="font-serif font-extrabold text-lg sm:text-2xl text-paper-ink mt-1.5 sm:mt-2">
              Match Cặp Đôi &amp; Bốc Quẻ Lịch Trình
            </h2>
            <p className="text-xs sm:text-sm text-paper-muted mt-0.5">
              Chọn nhanh tiêu chí bên dưới để DateMate tìm ra kịch bản hẹn hò khớp 100% tâm trạng của cả hai!
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsWheelOpen(true)}
            className="min-h-10 bg-[#F6B092] hover:bg-[#F39A75] text-paper-ink px-4 py-2 rounded-xl font-bold text-xs sm:text-sm shrink-0 self-start md:self-center transition shadow-2xs cursor-pointer flex items-center gap-1.5"
          >
            <span aria-hidden="true">🎲</span>
            <span>Mở Vòng Quay Ngẫu Nhiên</span>
          </button>
        </div>

        {/* Giao diện Mobile Tinh Gọn Kiểu App (< 768px) */}
        <div className="md:hidden space-y-3.5 my-3.5">
          {/* Lựa chọn 1: Mood */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-extrabold uppercase text-brand-terracotta tracking-wider block">
              1. Mood của hai bạn hôm nay?
            </span>
            <div className="flex flex-wrap gap-1.5">
              {[
                { key: "sunset" as MatchMood, label: "🌅 Chill hoàng hôn & gió mát" },
                { key: "active" as MatchMood, label: "🎳 Năng động vui nhộn" },
                { key: "art" as MatchMood, label: "🎨 Nghệ thuật & thủ công" },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setMatchMood(item.key)}
                  className={`px-3 py-1.5 rounded-full text-xs transition cursor-pointer flex items-center gap-1 ${
                    matchMood === item.key
                      ? "bg-brand-terracotta text-white font-extrabold shadow-xs"
                      : "bg-[#FAF4E8] text-paper-ink border border-[#DED2C1] font-semibold"
                  }`}
                >
                  <span>{item.label}</span>
                  {matchMood === item.key && <span>✓</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Lựa chọn 2: Ngân sách */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-extrabold uppercase text-brand-olive tracking-wider block">
              2. Ngân sách cho buổi hẹn?
            </span>
            <div className="flex flex-wrap gap-1.5">
              {[
                { key: "saving" as MatchBudget, label: "🌱 Tiết kiệm (<150k)" },
                { key: "moderate" as MatchBudget, label: "☕ Vừa vặn (150-300k)" },
                { key: "luxury" as MatchBudget, label: "🥂 Kỷ niệm (>350k)" },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setMatchBudget(item.key)}
                  className={`px-3 py-1.5 rounded-full text-xs transition cursor-pointer flex items-center gap-1 ${
                    matchBudget === item.key
                      ? "bg-brand-olive text-white font-extrabold shadow-xs"
                      : "bg-[#FAF4E8] text-paper-ink border border-[#DED2C1] font-semibold"
                  }`}
                >
                  <span>{item.label}</span>
                  {matchBudget === item.key && <span>✓</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Khối kết quả mini kiểu Thẻ Cào Ghép Đôi trên Mobile */}
          <div
            className={`bg-[#F9EFC7] border-2 border-dashed border-brand-terracotta rounded-xl p-3.5 space-y-2 transition shadow-xs ${
              isMatching ? "opacity-60" : ""
            }`}
          >
            {matchResult ? (
              <>
                <div className="flex items-center justify-between gap-2">
                  <span className="bg-brand-terracotta text-white text-[10px] font-extrabold px-2 py-0.5 rounded">
                    ĐỘ HỢP GU: {matchResult.score}%
                  </span>
                  <span className="text-base">{matchResult.place.emoji || "💘"}</span>
                </div>
                <div>
                  <h3 className="font-serif font-extrabold text-base text-paper-ink leading-tight">
                    {matchResult.place.displayName || matchResult.place.name}
                  </h3>
                  <p className="text-xs text-paper-muted mt-0.5 line-clamp-2 leading-relaxed">
                    {matchResult.place.summary}
                  </p>
                </div>
                <div className="pt-2 border-t border-[#DFC98B] flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-brand-terracottaDark">
                    💰 {matchResult.place.costText}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setActiveDetailSlug(matchResult.place.slug)}
                      className="min-h-9 bg-paper-ink text-white text-[11px] font-bold px-3 py-1.5 rounded-lg hover:bg-brand-terracotta transition cursor-pointer"
                    >
                      Cẩm nang
                    </button>
                    <button
                      type="button"
                      onClick={() => quickAddPlaceToPlan(matchResult.place)}
                      className="min-h-9 bg-brand-terracotta hover:bg-brand-terracottaDark text-white text-[11px] font-bold px-3 py-1.5 rounded-lg shadow-2xs transition cursor-pointer"
                    >
                      + Vào lịch
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="py-4 text-center text-xs text-paper-muted">
                {isMatching ? "Đang chấm điểm địa điểm..." : "Chưa tìm thấy quán phù hợp, thử đổi tiêu chí nhé."}
              </div>
            )}
          </div>
        </div>

        {/* Giao diện Desktop 3 Cột (>= 768px) */}
        <div className="hidden md:grid md:grid-cols-3 gap-5 my-5">
          {/* Bước 1: Mood hôm nay */}
          <div className="bg-[#FAF4E8] border border-[#DED2C1] rounded-xl p-4">
            <p className="text-xs font-extrabold uppercase text-brand-terracotta tracking-wider">
              1. Mood của hai bạn hôm nay?
            </p>
            <div className="space-y-2 mt-3">
              <button
                type="button"
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
                type="button"
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
                type="button"
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
                type="button"
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
                type="button"
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
                type="button"
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
                <div className="mt-3 pt-2.5 border-t border-[#DFC98B] flex flex-wrap items-center justify-between gap-2">
                  <span id="matchResultPrice" className="text-xs font-bold text-brand-terracottaDark">
                    💰 {matchResult.place.costText}
                  </span>
                  <div className="flex items-center gap-1.5 ml-auto">
                    <button
                      type="button"
                      onClick={() => setActiveDetailSlug(matchResult.place.slug)}
                      className="bg-paper-ink text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-brand-terracotta transition shrink-0 cursor-pointer"
                    >
                      Xem cẩm nang
                    </button>
                    <button
                      type="button"
                      onClick={() => quickAddPlaceToPlan(matchResult.place)}
                      className="bg-brand-terracotta hover:bg-brand-terracottaDark text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-2xs transition shrink-0 cursor-pointer"
                    >
                      + Vào lịch
                    </button>
                  </div>
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
