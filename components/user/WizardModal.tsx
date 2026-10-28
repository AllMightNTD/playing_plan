"use client";

import React, { useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { Wand2, X, ChevronRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";

import { recommendPlaces, type RecommendCriteria } from "@/lib/scoring";
import type { MoodKey } from "@/lib/constants/catalog";

const MOOD_OPTIONS = [
  { key: "photo", label: "📸 Chụp ảnh cháy máy" },
  { key: "romantic", label: "💕 Lãng mạn bên nhau" },
  { key: "chill", label: "🍃 Chill nhẹ nhàng" },
  { key: "fun", label: "🏺 Vui chơi trải nghiệm" },
  { key: "food", label: "🍜 Ăn uống thưởng thức" },
];

export function WizardModal() {
  const {
    isWizardOpen,
    setIsWizardOpen,
    wizardStep,
    setWizardStep,
    wizardAnswers,
    setWizardAnswers,
    places,
    setActiveDetailSlug,
    addStopToPlan,
  } = useApp();

  // Scored places for step 5 qua scoring engine chuẩn F05
  const scoredPlaces = useMemo(() => {
    const criteria: RecommendCriteria = {
      budget: wizardAnswers.budget,
      moods: wizardAnswers.moods as MoodKey[],
      slot: wizardAnswers.slot,
      transport: wizardAnswers.transport,
    };
    return recommendPlaces(places, criteria, { limit: 3 });
  }, [places, wizardAnswers]);

  if (!isWizardOpen) return null;

  const toggleMood = (moodKey: string) => {
    const current = [...wizardAnswers.moods];
    const idx = current.indexOf(moodKey);
    if (idx >= 0) {
      if (current.length > 1) current.splice(idx, 1);
    } else {
      if (current.length >= 2) current.shift();
      current.push(moodKey);
    }
    setWizardAnswers({ ...wizardAnswers, moods: current });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-cream w-full max-w-lg rounded-3xl shadow-2xl border border-peach-soft overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 bg-[#FFF2EC] border-b border-peach-soft flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-2xl bg-peach-deep text-white flex items-center justify-center shadow-sm">
              <Wand2 className="w-4 h-4" />
            </span>
            <div>
              <h3 className="font-display font-extrabold text-base text-brown">
                Hôm nay đi đâu? (Wizard 4 bước)
              </h3>
              <p className="text-[11px] text-brown-muted">
                Chấm điểm Mood (35đ) + Ngân sách (20đ) + Giờ vàng (15đ)
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsWizardOpen(false)}
            className="w-8 h-8 rounded-full bg-white hover:bg-peach-soft flex items-center justify-center text-brown transition"
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          {/* Step 1: Budget */}
          {wizardStep === 1 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-brown-muted">
                <span className="font-bold text-peach-deep">Bước 1 / 4</span>
                <span>Chạm là qua bước tiếp</span>
              </div>
              <h4 className="font-display font-extrabold text-lg text-brown">
                1. Ngân sách hôm nay cho 2 người khoảng bao nhiêu?
              </h4>
              <div className="space-y-2.5">
                {[
                  {
                    level: 1,
                    title: "🌱 Dưới 200k (Tiết kiệm, lãng mạn)",
                    desc: "Dạo hồ, ngắm hoàng hôn, cà phê trứng, phố cổ",
                  },
                  {
                    level: 2,
                    title: "☕ 200k – 500k (Vừa vặn, thoải mái)",
                    desc: "Cà phê rooftop view đẹp, làm gốm đôi, chụp ảnh thảo nguyên",
                  },
                  {
                    level: 3,
                    title: "🥂 Trên 500k (Kỷ niệm đặc biệt)",
                    desc: "Sky Walk tầng 65, ăn tối ngắm toàn cảnh Hà Nội",
                  },
                ].map((item) => (
                  <button
                    key={item.level}
                    onClick={() => {
                      setWizardAnswers({ ...wizardAnswers, budget: item.level });
                      setWizardStep(2);
                    }}
                    className={cn(
                      "w-full p-4 rounded-2xl bg-white hover:bg-peach-soft/60 border text-left flex items-center justify-between transition group",
                      wizardAnswers.budget === item.level
                        ? "border-peach-deep bg-peach-soft/30"
                        : "border-peach-soft"
                    )}
                  >
                    <div>
                      <div className="font-bold text-sm text-brown group-hover:text-peach-deep transition">
                        {item.title}
                      </div>
                      <div className="text-xs text-brown-muted mt-0.5">{item.desc}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-peach-deep group-hover:translate-x-1 transition" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Mood */}
          {wizardStep === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-brown-muted">
                <button
                  onClick={() => setWizardStep(1)}
                  className="font-bold text-brown hover:underline"
                >
                  ← Quay lại
                </button>
                <span className="font-bold text-peach-deep">Bước 2 / 4 (Chọn tối đa 2)</span>
              </div>
              <h4 className="font-display font-extrabold text-lg text-brown">
                2. Mood của hai bạn hôm nay là gì?
              </h4>
              <div className="grid grid-cols-1 gap-2">
                {MOOD_OPTIONS.map((m) => {
                  const active = wizardAnswers.moods.includes(m.key);
                  return (
                    <button
                      key={m.key}
                      onClick={() => toggleMood(m.key)}
                      className={cn(
                        "p-3.5 rounded-2xl border text-left font-bold text-xs flex items-center justify-between transition",
                        active
                          ? "bg-peach-soft border-peach-deep text-peach-deep"
                          : "bg-white border-peach-soft text-brown hover:bg-peach-soft/40"
                      )}
                    >
                      <span>{m.label}</span>
                      {active && (
                        <span className="px-2 py-0.5 rounded-full bg-peach-deep text-white text-[10px] flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          Đã chọn
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setWizardStep(3)}
                className="w-full py-3 rounded-2xl bg-peach-deep text-white font-bold text-xs shadow hover:bg-peach-hover transition"
              >
                Tiếp tục →
              </button>
            </div>
          )}

          {/* Step 3: Time Slot */}
          {wizardStep === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-brown-muted">
                <button
                  onClick={() => setWizardStep(2)}
                  className="font-bold text-brown hover:underline"
                >
                  ← Quay lại
                </button>
                <span className="font-bold text-peach-deep">Bước 3 / 4</span>
              </div>
              <h4 className="font-display font-extrabold text-lg text-brown">
                3. Hai bạn định đi vào khung giờ nào?
              </h4>
              <div className="space-y-2.5 text-xs">
                {[
                  {
                    slot: "morning",
                    title: "🌤️ Buổi sáng (07:00 – 11:00)",
                    desc: "Nắng trong, vắng người, thảnh thơi đi dạo",
                  },
                  {
                    slot: "sunset",
                    title: "🌅 Chiều & Hoàng hôn (15:30 – 18:30)",
                    desc: "Trúng Giờ Vàng SunCalc, chụp ảnh siêu thơ",
                    featured: true,
                  },
                  {
                    slot: "night",
                    title: "🌙 Buổi tối (18:30 – 22:00)",
                    desc: "Lên đèn lung linh, lãng mạn bên hồ",
                  },
                ].map((item) => (
                  <button
                    key={item.slot}
                    onClick={() => {
                      setWizardAnswers({
                        ...wizardAnswers,
                        slot: item.slot as "morning" | "sunset" | "night",
                      });
                      setWizardStep(4);
                    }}
                    className={cn(
                      "w-full p-4 rounded-2xl border text-left font-bold transition flex items-center justify-between",
                      item.featured
                        ? "bg-peach-soft/50 hover:bg-peach-soft border-peach text-peach-deep"
                        : "bg-white hover:bg-peach-soft/60 border-peach-soft text-brown"
                    )}
                  >
                    <div>
                      <div className="text-sm">{item.title}</div>
                      <div className="text-xs font-normal text-brown-muted mt-0.5">
                        {item.desc}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-peach-deep" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Transport */}
          {wizardStep === 4 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-brown-muted">
                <button
                  onClick={() => setWizardStep(3)}
                  className="font-bold text-brown hover:underline"
                >
                  ← Quay lại
                </button>
                <span className="font-bold text-peach-deep">Bước 4 / 4</span>
              </div>
              <h4 className="font-display font-extrabold text-lg text-brown">
                4. Hai bạn di chuyển bằng phương tiện gì?
              </h4>
              <div className="space-y-2.5 text-xs">
                {[
                  {
                    mode: "motorbike",
                    title: "🛵 Xe máy đèo nhau",
                    desc: "Linh hoạt, hóng gió sông Hồng",
                  },
                  {
                    mode: "car",
                    title: "🚕 Ô tô / Taxi",
                    desc: "Không ngại nắng mưa, giữ nếp tóc và trang phục",
                  },
                  {
                    mode: "walk",
                    title: "👟 Đi bộ quanh trung tâm Hoàn Kiếm",
                    desc: "Nắm tay dạo phố cổ, ăn kem Tràng Tiền",
                  },
                ].map((item) => (
                  <button
                    key={item.mode}
                    onClick={() => {
                      setWizardAnswers({
                        ...wizardAnswers,
                        transport: item.mode as "motorbike" | "car" | "walk",
                      });
                      setWizardStep(5);
                    }}
                    className="w-full p-4 rounded-2xl bg-white hover:bg-peach-soft/60 border border-peach-soft text-left font-bold text-brown transition flex items-center justify-between"
                  >
                    <div>
                      <div className="text-sm">{item.title}</div>
                      <div className="text-xs font-normal text-brown-muted mt-0.5">
                        {item.desc}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-peach-deep" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 5: Scoring Results */}
          {wizardStep === 5 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full bg-sage-light text-sage-dark text-xs font-bold">
                  ✅ Đã chọn lọc đa dạng danh mục
                </span>
                <button
                  onClick={() => setWizardStep(1)}
                  className="text-xs font-bold text-peach-deep hover:underline"
                >
                  Chọn lại
                </button>
              </div>

              <h4 className="font-display font-extrabold text-base text-brown">
                3 Gợi ý hợp gu nhất cho hai bạn hôm nay:
              </h4>

              <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
                {scoredPlaces.map((item) => (
                  <div
                    key={item.place.id}
                    className="p-3.5 rounded-2xl bg-white border border-peach-soft space-y-2 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{item.place.emoji}</span>
                        <div>
                          <h5 className="font-display font-extrabold text-sm text-brown">
                            {item.place.name}
                          </h5>
                          <span className="text-[11px] text-brown-muted">
                            📍 {item.place.area}
                          </span>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-peach-deep text-white font-bold text-xs shrink-0">
                        {item.score}% Hợp gu
                      </span>
                    </div>

                    <p className="text-xs text-sage-dark font-semibold">
                      💡 Hợp vì: {item.reasons.join(" • ")}
                    </p>

                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => {
                          setIsWizardOpen(false);
                          setActiveDetailSlug(item.place.slug);
                        }}
                        className="flex-1 py-2 rounded-xl bg-peach-soft hover:bg-peach text-brown font-bold text-xs transition"
                      >
                        Xem cẩm nang
                      </button>
                      <button
                        onClick={() => {
                          setIsWizardOpen(false);
                          addStopToPlan(item.place);
                        }}
                        className="flex-1 py-2 rounded-xl bg-peach-deep hover:bg-peach-hover text-white font-bold text-xs shadow-sm transition"
                      >
                        + Thêm vào lịch
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
