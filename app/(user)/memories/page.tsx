"use client";

import React, { useState } from "react";
import { useApp } from "@/context/AppContext";
import {
  Camera,
  UploadCloud,
  Calendar,
  ShieldCheck,
  Star,
} from "lucide-react";

interface MemoryItem {
  id: string;
  title: string;
  date: string;
  rating: number;
  journal: string;
  compressedInfo: string;
  emojis: string[];
}

const INITIAL_MEMORIES: MemoryItem[] = [
  {
    id: "m1",
    title: "Buổi chiều thu Phố Phan Đình Phùng & Hồ Gươm",
    date: "18/10/2026",
    rating: 5,
    journal:
      "Nắng xuyên qua hàng sấu đẹp mê hồn, mua được bó cúc họa mi đầu mùa và ăn kem Thủy Tạ.",
    compressedInfo: "3 ảnh • Đã nén Client WebP: 11.4 MB → 480 KB (-95%)",
    emojis: ["🍂", "💐", "🍦"],
  },
  {
    id: "m2",
    title: "Nặn gốm đôi tại Làng gốm Bát Tràng",
    date: "04/10/2026",
    rating: 5,
    journal:
      "Hai đứa làm được đôi cốc méo xẹo nhưng vui hết nấc. Góc xoắn ốc Bảo tàng Gốm lên ảnh siêu chất!",
    compressedInfo: "4 ảnh • Đã nén Client WebP: 14.2 MB → 610 KB (-95%)",
    emojis: ["🏺", "🎨", "💑"],
  },
];

export default function MemoriesPage() {
  const { addToast } = useApp();
  const [memories, setMemories] = useState<MemoryItem[]>(INITIAL_MEMORIES);

  const handleSimulateUpload = () => {
    const newMem: MemoryItem = {
      id: "m-" + Date.now(),
      title: "Hoàng hôn Cầu Long Biên & Cà phê trứng",
      date: "27/10/2026",
      rating: 5,
      journal:
        "Đi đúng khung giờ vàng 17:15 app gợi ý, nắng chiếu qua nhịp cầu sắt đẹp không góc chết!",
      compressedInfo: "5 ảnh • Đã nén Client WebP: 18.6 MB → 720 KB (-96%)",
      emojis: ["🌉", "☕", "🌇"],
    };

    setMemories([newMem, ...memories]);
    addToast(
      "📸 Đã nén ảnh sang WebP (<300KB/ảnh), xóa EXIF GPS và dán vào Nhật ký kỷ niệm!",
      "success"
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Year in Review Banner (F11 Scrapbook Album) */}
      <div className="relative overflow-hidden rounded-3xl bg-[#FFFDF9] border border-[#E6D7C3] p-5 sm:p-7 flex flex-wrap items-center justify-between gap-4 shadow-xs">
        <div className="washi-tape washi-terracotta -top-3.5 left-10" />

        <div className="space-y-1.5 max-w-xl">
          <span className="text-[11px] font-bold uppercase tracking-wider text-brand-terracotta flex items-center gap-1.5">
            <Camera className="w-3.5 h-3.5" />
            <span>F11 • Kho kỷ niệm riêng tư (Nén WebP & Xóa EXIF GPS)</span>
          </span>
          <h3 className="font-serif font-extrabold text-2xl sm:text-3xl text-paper-ink">
            Nhật Ký Năm 2026 của Dũng & Linh 💕
          </h3>
          <p className="text-xs sm:text-sm text-paper-muted leading-relaxed">
            Đã đồng hành qua <strong>14 buổi hẹn hò Hà Nội</strong> • Góc yêu thích nhất:{" "}
            <strong className="text-paper-ink">Hoàn Kiếm & Tây Hồ</strong>
          </p>
        </div>

        <button
          onClick={handleSimulateUpload}
          className="px-5 py-3 rounded-2xl bg-brand-terracotta hover:bg-brand-terracottaDark text-white font-bold text-xs sm:text-sm shadow-sm transition flex items-center gap-2 active:scale-95"
        >
          <UploadCloud className="w-4 h-4" />
          <span>+ Dán kỷ niệm mới (WebP Free)</span>
        </button>
      </div>

      {/* Memory Cards Grid - Corkboard style */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {memories.map((m, idx) => (
          <div
            key={m.id}
            className="bg-[#FFFDF9] rounded-3xl p-5 sm:p-6 border border-[#E6D7C3] shadow-xs space-y-4 hover:shadow-md transition flex flex-col justify-between relative group"
          >
            {/* Washi tape on alternating corners */}
            <div
              className={`washi-tape ${
                idx % 2 === 0 ? "washi-olive -top-3.5 left-6" : "washi-terracotta -top-3.5 right-6"
              }`}
            />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-brand-terracottaDark bg-brand-peach px-3 py-1 rounded-full flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{m.date}</span>
                </span>
                <div className="flex items-center text-amber-500">
                  {Array.from({ length: m.rating }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current" />
                  ))}
                </div>
              </div>

              <h4 className="font-serif font-extrabold text-base sm:text-lg text-paper-ink">
                {m.title}
              </h4>

              <p className="text-xs sm:text-sm text-paper-ink font-hand text-base leading-relaxed italic">
                &ldquo;{m.journal}&rdquo;
              </p>

              {/* Emoji stickers */}
              <div className="flex items-center gap-2 pt-1">
                {m.emojis.map((e, eIdx) => (
                  <div
                    key={eIdx}
                    className="w-14 h-14 rounded-2xl bg-[#FAF4E8] border border-[#E6D7C3] flex items-center justify-center text-2xl shadow-inner group-hover:scale-105 transition"
                  >
                    {e}
                  </div>
                ))}
              </div>
            </div>

            {/* Footer with WebP compression and EXIF wipe */}
            <div className="pt-3 border-t border-[#E6D7C3] flex flex-wrap items-center justify-between gap-2 text-[11px] text-brand-olive font-mono">
              <span className="font-semibold">✅ {m.compressedInfo}</span>
              <span className="flex items-center gap-1 text-paper-muted">
                <ShieldCheck className="w-3.5 h-3.5 text-brand-olive" />
                <span>Đã xóa EXIF GPS</span>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
