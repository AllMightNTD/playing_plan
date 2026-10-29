"use client";

import React from "react";
import { useApp } from "@/context/AppContext";
import type { WeatherData } from "@/lib/weather";

const WEATHER_EMOJI: Record<WeatherData["icon"], string> = {
  sun: "☀️",
  sun_cloud: "🌤️",
  cloud: "☁️",
  rain: "🌧️",
  thunder: "⛈️",
};

/** Bưu thiếp thời tiết Hà Nội hôm nay + giờ vàng / giờ xanh để săn ảnh (Open-Meteo + SunCalc). */
export function WeatherPostcard() {
  const { homePublic } = useApp();
  const weather = homePublic?.weather;
  const sun = homePublic?.sun;
  // condition dạng "Nắng thu dịu • Mưa 4%", phần mưa hiển thị riêng
  const conditionLabel = weather?.condition.split(" • ")[0] ?? "";

  return (
    <div className="lg:col-span-5 airmail-postcard">
      <div className="airmail-inner p-4 sm:p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[10px] font-extrabold tracking-widest uppercase text-brand-airmailBlue block">
                DỰ BÁO HẸN HÒ HÀ NỘI
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-serif font-extrabold text-3xl text-paper-ink">{weather ? `${weather.temp}°C` : "--°C"}</span>
                {weather && (
                  <span className="text-xs font-semibold text-paper-muted">
                    {conditionLabel} • Khả năng mưa <strong className="text-brand-terracotta">{weather.rainProbability}%</strong>
                  </span>
                )}
              </div>
            </div>
            <div className="border border-dashed border-[#CBB292] bg-[#FAF3E6] p-2 rounded-xl text-center">
              <span className="text-2xl block">{weather ? WEATHER_EMOJI[weather.icon] : "⏳"}</span>
              <span className="text-[9px] font-extrabold text-paper-muted">HÔM NAY</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 my-4">
            <div className="bg-[#FFF9F2] border border-brand-coral rounded-xl p-3">
              <span className="text-[11px] font-bold text-paper-muted block">🌅 Giờ vàng chụp ảnh</span>
              <span className="font-serif font-extrabold text-base text-brand-terracotta mt-0.5 block">
                {sun ? `${sun.goldenHour.start} - ${sun.goldenHour.end}` : "--:--"}
              </span>
              <span className="text-[10px] text-paper-muted">Nắng chiều ấm áp nhất</span>
            </div>
            <div className="bg-[#F4F7FA] border border-[#B8C7D6] rounded-xl p-3">
              <span className="text-[11px] font-bold text-paper-muted block">🌌 Giờ xanh lên đèn</span>
              <span className="font-serif font-extrabold text-base text-brand-airmailBlue mt-0.5 block">
                {sun ? `${sun.blueHour.start} - ${sun.blueHour.end}` : "--:--"}
              </span>
              <span className="text-[10px] text-paper-muted">Bầu trời xanh thẫm lãng mạn</span>
            </div>
          </div>

          {homePublic?.weatherTip && (
            <div className="bg-[#F9EFC7]/85 border border-[#DFC98A] rounded-xl p-3 text-xs text-paper-ink leading-relaxed">
              💡 <strong>Gợi ý cho hai bạn:</strong> {homePublic.weatherTip}
            </div>
          )}
        </div>

        <div className="pt-3 mt-3 border-t border-dashed border-[#E2D5C1] flex items-center justify-between text-[11px] text-paper-muted">
          <span>Cập nhật tự động theo Hà Nội</span>
          <span className="font-semibold">Open-Meteo (CC-BY 4.0)</span>
        </div>
      </div>
    </div>
  );
}
